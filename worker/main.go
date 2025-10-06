package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"image"
	"image/color"
	"image/jpeg"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
	"github.com/gorilla/websocket"
	"gocv.io/x/gocv"
	"gopkg.in/yaml.v3"
)

// Config holds the worker configuration
type Config struct {
	BackendURL    string `yaml:"backend_url"`
	MediaMTXURL   string `yaml:"mediamtx_url"`
	WorkerPort    int    `yaml:"worker_port"`
	MaxStreams    int    `yaml:"max_streams"`
	FaceCascade   string `yaml:"face_cascade"`
	StoragePath   string `yaml:"storage_path"`
}

// Camera represents a camera configuration
type Camera struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	RTSPURL  string `json:"rtsp_url"`
	Location string `json:"location"`
	Enabled  bool   `json:"enabled"`
}

// Alert represents a face detection alert
type Alert struct {
	CameraID     string    `json:"cameraId"`
	DetectedAt   time.Time `json:"detectedAt"`
	Description  string    `json:"description"`
	SnapshotURL  string    `json:"snapshotUrl"`
	Metadata     map[string]interface{} `json:"metadata"`
}

// StreamManager manages multiple camera streams
type StreamManager struct {
	config      Config
	client      *resty.Client
	streams     map[string]*CameraStream
	streamMutex sync.RWMutex
	faceCascade gocv.CascadeClassifier
	upgrader    websocket.Upgrader
}

// CameraStream represents an active camera stream
type CameraStream struct {
	Camera      Camera
	Capture     *gocv.VideoCapture
	Context     context.Context
	Cancel      context.CancelFunc
	IsRunning   bool
	FrameCount  int64
	StartTime   time.Time
	LastAlert   time.Time
	Mutex       sync.RWMutex
	// Publisher fields
	ffmpegCmd   *exec.Cmd
	ffmpegIn    io.WriteCloser
	publishURL  string
	published   bool
}

// NewStreamManager creates a new stream manager
func NewStreamManager(config Config) (*StreamManager, error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in NewStreamManager: %v", r)
		}
	}()

	client := resty.New()
	client.SetBaseURL(config.BackendURL)
	client.SetTimeout(30 * time.Second)

	// Load face cascade classifier with error handling
	faceCascade := gocv.NewCascadeClassifier()
	if !faceCascade.Load(config.FaceCascade) {
		return nil, fmt.Errorf("failed to load face cascade classifier from %s", config.FaceCascade)
	}

	return &StreamManager{
		config:      config,
		client:      client,
		streams:     make(map[string]*CameraStream),
		faceCascade: faceCascade,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}, nil
}
func hasQuery(u string) bool {
    parsed, err := url.Parse(u)
    if err != nil { return false }
    return parsed.RawQuery != ""
}

func containsTransportParam(u string) bool {
    parsed, err := url.Parse(u)
    if err != nil { return false }
    q := parsed.Query()
    _, ok := q["rtsp_transport"]
    return ok
}


// StartStream starts processing a camera stream
func (sm *StreamManager) StartStream(camera Camera) error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in StartStream for camera %s: %v", camera.ID, r)
		}
	}()

	sm.streamMutex.Lock()
	defer sm.streamMutex.Unlock()

	if len(sm.streams) >= sm.config.MaxStreams {
		return fmt.Errorf("maximum number of streams reached (%d)", sm.config.MaxStreams)
	}

	if _, exists := sm.streams[camera.ID]; exists {
		return fmt.Errorf("stream for camera %s already exists", camera.ID)
	}

	// Validate camera configuration
	if camera.RTSPURL == "" {
		return fmt.Errorf("RTSP URL is required for camera %s", camera.ID)
	}

	// Create context for this stream
	ctx, cancel := context.WithCancel(context.Background())

    // Open RTSP stream with retry logic - prefer TCP transport
    var capture *gocv.VideoCapture
	
	for i := 0; i < 3; i++ {
		var err error
		rtspURL := camera.RTSPURL
	
		// Try opening the RTSP stream directly
		capture, err = gocv.OpenVideoCapture(rtspURL)
		if err != nil {
			if i < 2 {
				log.Printf("Failed to open RTSP stream for camera %s: %v, retrying... (attempt %d/3)", camera.ID, err, i+1)
				time.Sleep(time.Duration(i+1) * time.Second)
				continue
			}
			cancel()
			return fmt.Errorf("failed to open RTSP stream for camera %s after 3 attempts: %v", camera.ID, err)
		}
	
		if capture.IsOpened() {
			break
		}
	
		if i < 2 {
			log.Printf("RTSP stream not opened for camera %s, retrying... (attempt %d/3)", camera.ID, i+1)
			capture.Close()
			time.Sleep(time.Duration(i+1) * time.Second)
		}
	}
	
	if capture == nil || !capture.IsOpened() {
		cancel()
		if capture != nil {
			capture.Close()
		}
		return fmt.Errorf("failed to open RTSP stream for camera %s after 3 attempts", camera.ID)
	}

	stream := &CameraStream{
		Camera:    camera,
		Capture:   capture,
		Context:   ctx,
		Cancel:    cancel,
		IsRunning: true,
		StartTime: time.Now(),
	}

	sm.streams[camera.ID] = stream

	// Initialize RTSP publisher to MediaMTX
	if err := sm.startPublisher(stream); err != nil {
		log.Printf("Failed to start publisher for camera %s: %v", camera.ID, err)
	}

	// Start processing in goroutine with panic recovery
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("Panic in processStream for camera %s: %v", camera.ID, r)
				// Clean up the stream on panic
				sm.streamMutex.Lock()
				if stream, exists := sm.streams[camera.ID]; exists {
					stream.Cancel()
					if stream.Capture != nil {
						stream.Capture.Close()
					}
					delete(sm.streams, camera.ID)
				}
				sm.streamMutex.Unlock()
			}
		}()
		sm.processStream(stream)
	}()

	log.Printf("Started stream for camera %s (%s)", camera.ID, camera.Name)
	return nil
}

// StopStream stops processing a camera stream
func (sm *StreamManager) StopStream(cameraID string) error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in StopStream for camera %s: %v", cameraID, r)
		}
	}()

	sm.streamMutex.Lock()
	defer sm.streamMutex.Unlock()

	stream, exists := sm.streams[cameraID]
	if !exists {
		return fmt.Errorf("stream for camera %s not found", cameraID)
	}

	// Safely stop the stream
	stream.Cancel()
	if stream.Capture != nil {
		stream.Capture.Close() // FIXED: Proper indentation
	}
	// Stop publisher if running
	sm.stopPublisher(stream)
	delete(sm.streams, cameraID)

	log.Printf("Stopped stream for camera %s", cameraID)
	return nil
}

// processStream processes frames from a camera stream
func (sm *StreamManager) processStream(stream *CameraStream) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in processStream for camera %s: %v", stream.Camera.ID, r)
		}
		if stream.Capture != nil {
			stream.Capture.Close()
		}
	}()

	img := gocv.NewMat()
	defer img.Close()

	frame := gocv.NewMat()
	defer frame.Close()

	consecutiveErrors := 0
	maxConsecutiveErrors := 10

	for {
		select {
		case <-stream.Context.Done():
			log.Printf("Stream context cancelled for camera %s", stream.Camera.ID)
			return
		default:
			if stream.Capture == nil {
				log.Printf("Capture is nil for camera %s", stream.Camera.ID)
				return
			}

			ok := stream.Capture.Read(&img)
			if !ok {
				consecutiveErrors++
				log.Printf("Failed to read frame from camera %s (error %d/%d)", stream.Camera.ID, consecutiveErrors, maxConsecutiveErrors)
				
				if consecutiveErrors >= maxConsecutiveErrors {
					log.Printf("Too many consecutive errors for camera %s, stopping stream", stream.Camera.ID)
					return
				}
				
				time.Sleep(100 * time.Millisecond)
				continue
			}

			// Reset error counter on successful read
			consecutiveErrors = 0

			if img.Empty() {
				continue
			}

			stream.Mutex.Lock()
			stream.FrameCount++
			stream.Mutex.Unlock()

			// Process frame for face detection with error handling
			if err := sm.processFrame(stream, &img, &frame); err != nil {
				log.Printf("Error processing frame for camera %s: %v", stream.Camera.ID, err)
			}

			// Push frame to MediaMTX via ffmpeg stdin (MJPEG pipe)
			if stream.published && stream.ffmpegIn != nil {
				buf, encErr := gocv.IMEncode(".jpg", img)
				if encErr == nil {
					_, wErr := stream.ffmpegIn.Write(buf.GetBytes())
					buf.Close()
					if wErr != nil {
						if !errors.Is(wErr, io.ErrClosedPipe) {
							log.Printf("ffmpeg write error for camera %s: %v", stream.Camera.ID, wErr)
						} else {
							// ffmpeg has exited, stop publishing
							stream.Mutex.Lock()
							stream.published = false
							stream.ffmpegIn.Close()
							stream.ffmpegIn = nil
							stream.Mutex.Unlock()
						}
					}
				} else {
					log.Printf("JPEG encode error for camera %s: %v", stream.Camera.ID, encErr)
				}
			}
			
		}
	}
}

// processFrame processes a single frame for face detection
func (sm *StreamManager) processFrame(stream *CameraStream, img *gocv.Mat, frame *gocv.Mat) error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in processFrame for camera %s: %v", stream.Camera.ID, r)
		}
	}()

	if img == nil || img.Empty() {
		return fmt.Errorf("input image is nil or empty")
	}

	if frame == nil {
		return fmt.Errorf("frame buffer is nil")
	}

	// Convert to grayscale for face detection
	gocv.CvtColor(*img, frame, gocv.ColorBGRToGray)

	// Detect faces - this returns []image.Rectangle directly
	faces := sm.faceCascade.DetectMultiScale(*frame)
	
	// Draw bounding boxes on the original image
	for _, face := range faces {
		gocv.Rectangle(img, face, color.RGBA{0, 255, 0, 255}, 2)
	}
	
	// Draw overlays with error handling
	if err := sm.drawOverlays(img, stream, len(faces)); err != nil {
		log.Printf("Error drawing overlays for camera %s: %v", stream.Camera.ID, err)
	}

	// If faces detected, create alert
	if len(faces) > 0 {
		if err := sm.handleFaceDetection(stream, faces, img); err != nil {
			log.Printf("Error handling face detection for camera %s: %v", stream.Camera.ID, err)
		}
	}

	return nil
}

// drawOverlays draws camera info overlays on the frame
func (sm *StreamManager) drawOverlays(img *gocv.Mat, stream *CameraStream, faceCount int) error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in drawOverlays for camera %s: %v", stream.Camera.ID, r)
		}
	}()

	if img == nil || img.Empty() {
		return fmt.Errorf("image is nil or empty")
	}

	stream.Mutex.RLock()
	frameCount := stream.FrameCount
	stream.Mutex.RUnlock()

	// Calculate FPS
	elapsed := time.Since(stream.StartTime).Seconds()
	fps := float64(frameCount) / elapsed

	// Draw camera info
	info := fmt.Sprintf("Camera: %s | FPS: %.1f | Faces: %d", 
		stream.Camera.Name, fps, faceCount)
	
	// Draw text overlay
	gocv.PutText(img, info, image.Pt(10, 30), gocv.FontHersheySimplex, 0.7, 
		color.RGBA{0, 255, 0, 255}, 2)

	// Draw timestamp
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	gocv.PutText(img, timestamp, image.Pt(10, 60), gocv.FontHersheySimplex, 0.5,
		color.RGBA{255, 255, 255, 255}, 1)

	return nil
}

// handleFaceDetection handles face detection events
func (sm *StreamManager) handleFaceDetection(stream *CameraStream, faces []image.Rectangle, img *gocv.Mat) error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in handleFaceDetection for camera %s: %v", stream.Camera.ID, r)
		}
	}()

	// Throttle alerts (max one per 5 seconds per camera)
	if time.Since(stream.LastAlert) < 5*time.Second {
		return nil
	}

	stream.LastAlert = time.Now()

	// Create snapshot with error handling
	snapshotURL, err := sm.createSnapshot(stream.Camera.ID, img)
	if err != nil {
		return fmt.Errorf("failed to create snapshot: %v", err)
	}

	// Create alert
	alert := Alert{
		CameraID:    stream.Camera.ID,
		DetectedAt:  time.Now(),
		Description: fmt.Sprintf("Face detected on camera %s", stream.Camera.Name),
		SnapshotURL: snapshotURL,
		Metadata: map[string]interface{}{
			"face_count": len(faces),
			"camera_name": stream.Camera.Name,
			"location":    stream.Camera.Location,
		},
	}

	// Send alert to backend with error handling
	go func() {
		if err := sm.sendAlert(alert); err != nil {
			log.Printf("Failed to send alert for camera %s: %v", stream.Camera.ID, err)
		}
	}()

	return nil
}

// createSnapshot creates a snapshot image and saves it
func (sm *StreamManager) createSnapshot(cameraID string, img *gocv.Mat) (string, error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in createSnapshot for camera %s: %v", cameraID, r)
		}
	}()

	if img == nil || img.Empty() {
		return "", fmt.Errorf("image is nil or empty")
	}

	// Convert Mat to image
	buf, err := gocv.IMEncode(".jpg", *img)
	if err != nil {
		return "", fmt.Errorf("failed to encode image: %v", err)
	}
	defer buf.Close()

	// Decode to Go image
	goImg, err := jpeg.Decode(bytes.NewReader(buf.GetBytes()))
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %v", err)
	}

	// Create filename
	filename := fmt.Sprintf("%s_%d.jpg", cameraID, time.Now().Unix())
	filepath := fmt.Sprintf("%s/%s", sm.config.StoragePath, filename)

	// Save image with error handling
	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to create file %s: %v", filepath, err)
	}
	defer file.Close()

	err = jpeg.Encode(file, goImg, &jpeg.Options{Quality: 80})
	if err != nil {
		return "", fmt.Errorf("failed to encode JPEG: %v", err)
	}

	// Return URL (assuming static file serving)
	return fmt.Sprintf("/snapshots/%s", filename), nil
}

// sendAlert sends an alert to the backend API
func (sm *StreamManager) sendAlert(alert Alert) error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in sendAlert for camera %s: %v", alert.CameraID, r)
		}
	}()

	resp, err := sm.client.R().
		SetHeader("Content-Type", "application/json").
		SetBody(alert).
		Post("/api/alerts")

	if err != nil {
		return fmt.Errorf("failed to send HTTP request: %v", err)
	}

	if resp.StatusCode() != http.StatusOK {
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode(), resp.String())
	}

	log.Printf("Alert sent successfully for camera %s", alert.CameraID)
	return nil
}

// GetStreamStatus returns the status of all streams
func (sm *StreamManager) GetStreamStatus() map[string]interface{} {
	sm.streamMutex.RLock()
	defer sm.streamMutex.RUnlock()

	status := make(map[string]interface{})
	for id, stream := range sm.streams {
		stream.Mutex.RLock()
		elapsed := time.Since(stream.StartTime).Seconds()
		fps := float64(stream.FrameCount) / elapsed
		
		status[id] = map[string]interface{}{
			"camera_id":   id,
			"camera_name": stream.Camera.Name,
			"is_running":  stream.IsRunning,
			"frame_count": stream.FrameCount,
			"fps":         fps,
			"uptime":      elapsed,
		}
		stream.Mutex.RUnlock()
	}

	return status
}

// panicRecoveryMiddleware recovers from panics in HTTP handlers
func panicRecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("Panic in HTTP handler: %v", r)
				
				// Log stack trace
				buf := make([]byte, 1024)
				n := runtime.Stack(buf, false)
				log.Printf("Stack trace: %s", string(buf[:n]))
				
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Internal server error",
					"message": "An unexpected error occurred",
				})
				c.Abort()
			}
		}()
		c.Next()
	}
}

// API handlers
func (sm *StreamManager) handleStartStream(c *gin.Context) {
	var camera Camera
	if err := c.ShouldBindJSON(&camera); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := sm.StartStream(camera)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stream started successfully"})
}

func (sm *StreamManager) handleStopStream(c *gin.Context) {
	cameraID := c.Param("id")
	
	err := sm.StopStream(cameraID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stream stopped successfully"})
}

func (sm *StreamManager) handleStreamStatus(c *gin.Context) {
	status := sm.GetStreamStatus()
	c.JSON(http.StatusOK, status)
}

// startPublisher starts an ffmpeg process that reads MJPEG frames from stdin and publishes H.264 to MediaMTX via RTSP
func (sm *StreamManager) startPublisher(stream *CameraStream) error {
	// Build RTSP publish URL
	publishURL, err := sm.buildRTSPPublishURL(stream.Camera.ID)
	if err != nil {
		return err
	}
	stream.publishURL = publishURL

	// FFmpeg command
	args := []string{
		"-y",               // overwrite
		"-f", "mjpeg",      // input format
		"-i", "-",          // read MJPEG from stdin
		"-r", "25",         // frame rate
		"-c:v", "libx264",  // H.264 encoding
		"-preset", "veryfast",
		"-tune", "zerolatency",
		"-pix_fmt", "yuv420p",
		"-f", "rtsp",
		"-rtsp_transport", "tcp",
		publishURL,
	}

	cmd := exec.Command("ffmpeg", args...)

	// Capture stderr for debugging
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get ffmpeg stderr: %w", err)
	}
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stderrPipe.Read(buf)
			if n > 0 {
				log.Printf("[FFMPEG %s]: %s", stream.Camera.ID, string(buf[:n]))
			}
			if err != nil {
				break
			}
		}
	}()

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to get ffmpeg stdin: %w", err)
	}

	// Start ffmpeg process
	if err := cmd.Start(); err != nil {
		stdin.Close()
		return fmt.Errorf("failed to start ffmpeg: %w", err)
	}

	stream.ffmpegCmd = cmd
	stream.ffmpegIn = stdin
	stream.published = true

	log.Printf("Started publisher for camera %s -> %s", stream.Camera.ID, publishURL)

	// Monitor ffmpeg process in goroutine
	go func() {
		err := cmd.Wait()
		if err != nil {
			log.Printf("FFmpeg exited for camera %s: %v", stream.Camera.ID, err)
		} else {
			log.Printf("FFmpeg finished for camera %s", stream.Camera.ID)
		}
		stream.Mutex.Lock()
		stream.published = false
		if stream.ffmpegIn != nil {
			stream.ffmpegIn.Close()
			stream.ffmpegIn = nil
		}
		stream.Mutex.Unlock()
	}()

	return nil
}


// stopPublisher stops the ffmpeg publisher for a stream if running
func (sm *StreamManager) stopPublisher(stream *CameraStream) {
	if stream == nil { return }
	if stream.ffmpegIn != nil {
		_ = stream.ffmpegIn.Close()
		stream.ffmpegIn = nil
	}
	if stream.ffmpegCmd != nil {
		// Try graceful stop
		_ = stream.ffmpegCmd.Process.Signal(syscall.SIGINT)
		_ = stream.ffmpegCmd.Wait()
		stream.ffmpegCmd = nil
	}
	stream.published = false
}

// buildRTSPPublishURL builds an rtsp publish URL from MediaMTXURL and camera ID
func (sm *StreamManager) buildRTSPPublishURL(cameraID string) (string, error) {
	u, err := url.Parse(sm.config.MediaMTXURL)
	if err != nil {
		return "", fmt.Errorf("invalid MediaMTXURL: %w", err)
	}
	host := u.Hostname()
	port := 8554
	if host == "" {
		host = "localhost"
	}
	return fmt.Sprintf("rtsp://%s:%d/%s", host, port, cameraID), nil
}

func main() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in main: %v", r)
			buf := make([]byte, 1024)
			n := runtime.Stack(buf, false)
			log.Printf("Stack trace: %s", string(buf[:n]))
		}
	}()

	// Load configuration with error handling
	config := Config{
		BackendURL:  "http://localhost:3000",
		MediaMTXURL: "http://localhost:8888",
		WorkerPort:  8080,
		MaxStreams: 4,
		FaceCascade: "haarcascade_frontalface_default.xml",
		StoragePath: "./snapshots",
	}

	// Load config from environment variables first
	if backendURL := os.Getenv("BACKEND_URL"); backendURL != "" {
		config.BackendURL = backendURL
	}
	if mediamtxURL := os.Getenv("MEDIAMTX_URL"); mediamtxURL != "" {
		config.MediaMTXURL = mediamtxURL
	}
	if workerPort := os.Getenv("WORKER_PORT"); workerPort != "" {
		if port, err := strconv.Atoi(workerPort); err == nil {
			config.WorkerPort = port
		}
	}
	if maxStreams := os.Getenv("MAX_STREAMS"); maxStreams != "" {
		if streams, err := strconv.Atoi(maxStreams); err == nil {
			config.MaxStreams = streams
		}
	}
	if faceCascade := os.Getenv("FACE_CASCADE"); faceCascade != "" {
		config.FaceCascade = faceCascade
	}
	if storagePath := os.Getenv("STORAGE_PATH"); storagePath != "" {
		config.StoragePath = storagePath
	}

	// Load config from file if exists
	if data, err := os.ReadFile("config.yaml"); err == nil {
		if err := yaml.Unmarshal(data, &config); err != nil {
			log.Printf("Failed to load config file: %v", err)
		}
	}

	log.Printf("Configuration loaded: BackendURL=%s, WorkerPort=%d, MaxStreams=%d", 
		config.BackendURL, config.WorkerPort, config.MaxStreams)

	// Create storage directory with error handling
	if err := os.MkdirAll(config.StoragePath, 0755); err != nil {
		log.Fatal("Failed to create storage directory:", err)
	}

	// Create stream manager with error handling
	sm, err := NewStreamManager(config)
	if err != nil {
		log.Fatal("Failed to create stream manager:", err)
	}

	// Setup Gin router with panic recovery
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(panicRecoveryMiddleware())

	// API routes
	r.POST("/stream/start", sm.handleStartStream)
	r.POST("/stream/stop/:id", sm.handleStopStream)
	r.GET("/stream/status", sm.handleStreamStatus)

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	// Serve snapshots statically
	r.Static("/snapshots", config.StoragePath)

	// Start server
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", config.WorkerPort),
		Handler: r,
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("Panic in server goroutine: %v", r)
			}
		}()
		
		log.Printf("Worker service starting on port %d", config.WorkerPort)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Confirm server has started by polling the health endpoint
	readyCtx, cancelReady := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelReady()
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-readyCtx.Done():
			log.Printf("Worker service start confirmation timed out on port %d", config.WorkerPort)
			goto AfterReady
		case <-ticker.C:
			resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/health", config.WorkerPort))
			if err == nil && resp.StatusCode == http.StatusOK {
				log.Printf("Worker service started on port %d", config.WorkerPort)
				resp.Body.Close()
				goto AfterReady
			}
			if resp != nil && resp.Body != nil {
				resp.Body.Close()
			}
		}
	}

AfterReady:

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down worker service...")

	// Stop all streams with error handling
	sm.streamMutex.Lock()
	for id, stream := range sm.streams {
		stream.Cancel()
		if stream.Capture != nil {
			stream.Capture.Close() // FIXED: Proper indentation
		}
		log.Printf("Stopped stream for camera %s", id)
	}
	sm.streamMutex.Unlock()

	// Shutdown server with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Worker service exited")
}
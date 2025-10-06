# Face Detection Worker Service

A Go-based worker service that handles real-time face detection from multiple RTSP camera streams.

## Features

- **Multi-camera Support**: Handles up to 4 concurrent RTSP streams
- **Real-time Face Detection**: Uses OpenCV for face detection
- **Frame Processing**: Draws bounding boxes and overlays camera info
- **Alert Generation**: Creates alerts when faces are detected
- **MediaMTX Integration**: Streams processed frames to MediaMTX
- **RESTful API**: Provides endpoints for stream management

## Prerequisites

- Go 1.21 or later
- OpenCV 4.x
- FFmpeg (for RTSP stream handling)
- MediaMTX server running

## Installation

1. **Install OpenCV**:

   **Ubuntu/Debian**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y libopencv-dev pkg-config
   ```

   **macOS**:
   ```bash
   brew install opencv pkg-config
   ```

   **Windows**:
   Download OpenCV from https://opencv.org/releases/

2. **Install Go dependencies**:
   ```bash
   go mod tidy
   ```

3. **Download face cascade classifier**:
   ```bash
   wget -O haarcascade_frontalface_default.xml \
       https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml
   ```

## Configuration

Edit `config.yaml` to configure the worker:

```yaml
backend_url: "http://localhost:3000"    # Backend API URL
mediamtx_url: "http://localhost:8888"   # MediaMTX server URL
worker_port: 8080                       # Worker service port
max_streams: 4                          # Maximum concurrent streams
face_cascade: "haarcascade_frontalface_default.xml"  # Face detection model
storage_path: "./snapshots"             # Snapshot storage directory
```

## Usage

### Start the worker service:

```bash
# Using the startup script
chmod +x start.sh
./start.sh

# Or manually
go run main.go
```

### API Endpoints

- **POST /stream/start**: Start processing a camera stream
  ```json
  {
    "id": "camera-1",
    "name": "Front Door",
    "rtsp_url": "rtsp://192.168.1.100:554/stream1",
    "location": "Entrance",
    "enabled": true
  }
  ```

- **POST /stream/stop/:id**: Stop processing a camera stream

- **GET /stream/status**: Get status of all streams

- **GET /health**: Health check endpoint

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   Worker        │
│   (React)       │◄──►│   (Node.js)      │◄──►│   (Go)          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │   MediaMTX      │
                       │   Database       │    │   Streaming     │
                       └──────────────────┘    └─────────────────┘
```

## Stream Processing Flow

1. **RTSP Input**: Worker receives RTSP stream URL from backend
2. **Frame Capture**: Uses OpenCV to capture frames from RTSP stream
3. **Face Detection**: Processes each frame for face detection
4. **Frame Enhancement**: Draws bounding boxes and camera info overlays
5. **Alert Generation**: Creates alerts when faces are detected
6. **Streaming Output**: Sends processed frames to MediaMTX
7. **API Communication**: Posts alerts to backend API

## Performance

- **Concurrent Streams**: Supports up to 4 simultaneous camera streams
- **Frame Rate**: Processes frames at camera's native FPS
- **Face Detection**: Real-time face detection using OpenCV Haar cascades
- **Memory Usage**: Optimized for minimal memory footprint
- **CPU Usage**: Efficient processing with Go's concurrency model

## Troubleshooting

### Common Issues

1. **OpenCV not found**:
   ```bash
   export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH
   ```

2. **RTSP connection failed**:
   - Check RTSP URL format
   - Verify network connectivity
   - Ensure camera credentials are correct

3. **Face detection not working**:
   - Verify face cascade file exists
   - Check camera resolution and lighting
   - Ensure faces are clearly visible

### Logs

The worker service logs important events:
- Stream start/stop events
- Face detection alerts
- Error conditions
- Performance metrics

## Development

### Building

```bash
go build -o face-detection-worker main.go
```

### Testing

```bash
go test ./...
```

### Adding New Features

1. Extend the `StreamManager` struct for new functionality
2. Add new API endpoints in the Gin router
3. Update configuration as needed
4. Add appropriate error handling

## License

MIT License

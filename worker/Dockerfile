# Use Go 1.21 Alpine
FROM golang:1.21-alpine

# Install OpenCV + build tools
RUN apk add --no-cache \
    opencv-dev \
    pkgconfig \
    build-base \
    cmake \
    wget \
    ca-certificates \
    ffmpeg \
    gstreamer \
    gst-plugins-base \
    gst-plugins-good \
    gst-plugins-bad \
    gst-plugins-ugly \
    gst-libav \
    bash \
    tzdata \
    libstdc++ \
    libgcc \
    openssl \
    curl

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p snapshots cascades

# Download face cascade classifier to the correct location
RUN wget -O cascades/haarcascade_frontalface_default.xml \
    https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml

# Verify the file was downloaded correctly
RUN ls -la cascades/

# Set environment variables to use the correct paths
ENV FACE_CASCADE=/app/cascades/haarcascade_frontalface_default.xml
ENV STORAGE_PATH=/app/snapshots
ENV OPENCV_FFMPEG_CAPTURE_OPTIONS=rtsp_transport;tcp

# Build the application (optional - for faster container startup)
RUN go build -o worker main.go

# Expose port
EXPOSE 8080

ENV DEBUG=true
ENV LOG_LEVEL=debug

# Start the application using the compiled binary
CMD ["./worker"]

# Alternative: If you prefer to use go run
# CMD ["go", "run", "main.go"]
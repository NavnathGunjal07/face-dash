#!/bin/bash

# Face Detection Worker Service Startup Script

echo "Starting Face Detection Worker Service..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed. Please install Go 1.21 or later."
    exit 1
fi

# Check if OpenCV is installed
if ! pkg-config --exists opencv4; then
    echo "Warning: OpenCV4 not found. Installing dependencies..."
    
    # Install OpenCV dependencies (Ubuntu/Debian)
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y libopencv-dev pkg-config
    # Install OpenCV dependencies (macOS)
    elif command -v brew &> /dev/null; then
        brew install opencv pkg-config
    else
        echo "Please install OpenCV4 manually for your system"
        exit 1
    fi
fi

# Create snapshots directory
mkdir -p snapshots

# Download face cascade file if not exists
if [ ! -f "haarcascade_frontalface_default.xml" ]; then
    echo "Downloading face cascade classifier..."
    wget -O haarcascade_frontalface_default.xml \
        https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml
fi

# Install Go dependencies
echo "Installing Go dependencies..."
go mod tidy

# Build the worker service
echo "Building worker service..."
go build -o face-detection-worker main.go

# Start the worker service
echo "Starting worker service..."
./face-detection-worker

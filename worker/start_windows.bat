@echo off
REM Face Detection Worker Service Startup Script for Windows

echo Starting Face Detection Worker Service...

REM Check if Go is installed
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Go is not installed. Please install Go 1.21 or later.
    echo Download from: https://golang.org/dl/
    pause
    exit /b 1
)

REM Check if FFmpeg is available
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: FFmpeg not found. Face detection will be simulated.
    echo Download FFmpeg from: https://ffmpeg.org/download.html
    echo Add FFmpeg to your PATH environment variable.
)

REM Create snapshots directory
if not exist "snapshots" mkdir snapshots

REM Install Go dependencies
echo Installing Go dependencies...
go mod tidy

REM Start the worker service
echo Starting worker service...
go run main_simple.go

pause

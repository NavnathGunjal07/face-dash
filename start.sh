#!/bin/bash

# Face Detection Dashboard Startup Script

echo "🚀 Starting Face Detection Dashboard..."

# Check if required services are running
check_service() {
    local service_name=$1
    local port=$2
    local url=$3
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo "✅ $service_name is running on port $port"
        return 0
    else
        echo "❌ $service_name is not running on port $port"
        return 1
    fi
}

# Check PostgreSQL
echo "🔍 Checking PostgreSQL..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On Ubuntu/Debian: sudo systemctl start postgresql"
    echo "   On macOS: brew services start postgresql"
    exit 1
fi
echo "✅ PostgreSQL is running"

# Create database if it doesn't exist
echo "🗄️  Setting up database..."
createdb face_detection_db 2>/dev/null || echo "Database already exists"

# Install dependencies
echo "📦 Installing dependencies..."

# Backend dependencies
echo "   Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    pnpm install
fi

# Frontend dependencies
echo "   Installing frontend dependencies..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    pnpm install
fi

# Worker dependencies
echo "   Installing worker dependencies..."
cd ../worker
if [ ! -f "go.mod" ]; then
    echo "❌ Worker directory not found. Please ensure the worker service is properly set up."
    exit 1
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21 or later."
    echo "   Download from: https://golang.org/dl/"
    exit 1
fi

go mod tidy

# Download face cascade if not exists
if [ ! -f "haarcascade_frontalface_default.xml" ]; then
    echo "📥 Downloading face cascade classifier..."
    wget -O haarcascade_frontalface_default.xml \
        https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml
fi

cd ..

# Run database migrations
echo "🔄 Running database migrations..."
cd backend
pnpm prisma migrate deploy
pnpm prisma generate
cd ..

# Create snapshots directory
mkdir -p worker/snapshots

# Start services
echo "🎬 Starting services..."

# Start MediaMTX (if available)
if command -v mediamtx &> /dev/null; then
    echo "📺 Starting MediaMTX..."
    mediamtx &
    MEDIAMTX_PID=$!
    sleep 2
else
    echo "⚠️  MediaMTX not found. Install it from: https://github.com/bluenviron/mediamtx"
    echo "   Or use Docker: docker run --rm -it --network=host bluenviron/mediamtx"
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend
pnpm dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Start worker service
echo "🤖 Starting worker service..."
cd worker
go run main.go &
WORKER_PID=$!
cd ..

# Wait for worker to start
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
pnpm dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:3000"
echo "🤖 Worker Service: http://localhost:8080"
echo "📺 MediaMTX: http://localhost:8888"
echo "🔌 WebSocket: ws://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    
    kill $FRONTEND_PID 2>/dev/null
    kill $WORKER_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    kill $MEDIAMTX_PID 2>/dev/null
    
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for any process to exit
wait

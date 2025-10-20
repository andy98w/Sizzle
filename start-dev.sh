#!/bin/bash
# Development startup script for Sizzle app
# This script starts both the frontend and backend in development mode with hot reloading

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Stop any existing instances
echo "Stopping any existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 1

# Setup and start backend
echo "Setting up backend..."
cd "$SCRIPT_DIR/backend"

# Create/update virtualenv if not exists
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install requirements quietly
echo "Checking backend dependencies..."
pip install -q -r requirements.txt

# Start backend server with reload flag
echo "Starting backend server in development mode (with reload)..."
echo "API will be available at http://localhost:8000"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload > "$SCRIPT_DIR/backend/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 3

# Setup and start frontend in development mode
echo "Starting frontend in development mode..."
cd "$SCRIPT_DIR/frontend"
npm run dev > "$SCRIPT_DIR/frontend/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "════════════════════════════════════════════════════"
echo "🔥 Sizzle development server started!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:8000"
echo ""
echo "✨ Hot reload enabled for both frontend and backend"
echo ""
echo "📊 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📋 View logs:"
echo "   Backend:  tail -f $SCRIPT_DIR/backend/backend.log"
echo "   Frontend: tail -f $SCRIPT_DIR/frontend/frontend.log"
echo ""
echo "⏹️  Press Ctrl+C to stop all servers"
echo "════════════════════════════════════════════════════"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "⏹️  Shutting down development servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  # Wait a moment for graceful shutdown
  sleep 1
  # Force kill if still running
  kill -9 $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  echo "✅ Servers stopped."
  exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Wait for processes to finish (keeps script running)
wait
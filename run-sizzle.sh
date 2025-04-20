#!/bin/bash

# Function to show help
show_help() {
  echo "Sizzle Recipe Assistant Runner"
  echo ""
  echo "Usage: ./run-sizzle.sh [command]"
  echo ""
  echo "Commands:"
  echo "  backend       - Run the backend API server only"
  echo "  frontend      - Run the frontend Next.js app only"
  echo "  install       - Install all dependencies for both backend and frontend"
  echo "  cleanup       - Run database cleanup to remove placeholder ingredients"
  echo "  help          - Show this help message"
  echo ""
  echo "If no command is provided, both backend and frontend will be started"
  echo ""
}

# Install dependencies
install_dependencies() {
  echo "🔄 Installing backend dependencies..."
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  cd ..

  echo "🔄 Installing frontend dependencies..."
  cd frontend
  npm install
  cd ..

  echo "✅ All dependencies installed!"
}

# Run backend
run_backend() {
  echo "🚀 Starting backend server..."
  cd backend
  source venv/bin/activate
  mkdir -p static/animations/actions static/animations/ingredients static/animations/generated
  mkdir -p static/images/actions static/images/ingredients static/images/equipment static/images/steps static/images/tests
  uvicorn app:app --reload
}

# Run frontend
run_frontend() {
  echo "🚀 Starting frontend server..."
  cd frontend
  npm run dev
}

# Check for .env file and create if it doesn't exist
if [ ! -f backend/.env ]; then
  echo "⚠️ No .env file found in backend directory!"
  echo "📝 Creating a template .env file. Please edit it with your API keys."
  cat > backend/.env << EOF
OPENAI_API_KEY=your_api_key_here
STABILITY_API_KEY=your_stability_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
EOF
  echo "⚠️ Please edit backend/.env with your API keys before continuing."
  echo ""
  echo "🔄 For Supabase setup:"
  echo "1. Go to https://app.supabase.io/ and create a project"
  echo "2. Get your project URL and API key from Settings > API"
  echo "3. Add them to your .env file"
  echo "4. Copy the contents of backend/supabase_schema.sql and run it in the SQL Editor"
fi

# Run database cleanup
run_cleanup() {
  echo "🧹 Running database cleanup..."
  cd backend
  source venv/bin/activate
  python -c "
import traceback
try:
    import supabase
    from db_manager import db
    if db.is_connected():
        count = db.cleanup_placeholder_ingredients()
        print(f'Cleaned up {count} placeholder ingredients')
    else:
        print('Database connection failed. Check your .env file.')
except Exception as e:
    print(f'Error during cleanup: {e}')
    traceback.print_exc()
"
}

# Process command
case "$1" in
  backend)
    run_backend
    ;;
  frontend)
    run_frontend
    ;;
  install)
    install_dependencies
    ;;
  cleanup)
    run_cleanup
    ;;
  help)
    show_help
    ;;
  *)
    if [ -n "$1" ]; then
      echo "❌ Unknown command: $1"
      show_help
      exit 1
    else
      echo "🔄 Starting both backend and frontend servers..."
      echo "⚠️ This requires two terminal windows. Please run each server separately in production."
      echo "📝 Run './run-sizzle.sh backend' in one terminal and './run-sizzle.sh frontend' in another."
      read -p "Press Enter to continue or Ctrl+C to cancel..."
      
      # Start backend in background
      (run_backend &)
      sleep 5
      # Start frontend
      run_frontend
    fi
    ;;
esac
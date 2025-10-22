#!/bin/bash

# Sizzle Backend Deployment Script

set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy-backend.sh <server-ip>"
    echo "Example: ./deploy-backend.sh 123.456.789.0"
    exit 1
fi

SERVER_IP=$1
SERVER_USER="opc"
BACKEND_DIR="/opt/sizzle-backend"

echo "🚀 Deploying Sizzle Backend to $SERVER_IP"

# Navigate to backend directory
cd "$(dirname "$0")/../backend"

echo "📦 Packaging backend files..."
# Create temp directory for packaging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy files to temp directory
cp *.py requirements.txt $TEMP_DIR/ 2>/dev/null || true
cp -r scripts $TEMP_DIR/ 2>/dev/null || true

echo "📤 Uploading to server..."
scp -r $TEMP_DIR/* $SERVER_USER@$SERVER_IP:$BACKEND_DIR/

echo "🔧 Installing dependencies and restarting..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/sizzle-backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart sizzle-backend || pm2 start /home/opc/ecosystem.config.js --only sizzle-backend
pm2 save
EOF

echo "✅ Backend deployed successfully!"
echo "📊 Viewing logs (Ctrl+C to exit):"
ssh $SERVER_USER@$SERVER_IP "pm2 logs sizzle-backend --lines 20"

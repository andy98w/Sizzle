#!/bin/bash

# Sizzle Frontend Deployment Script

set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy-frontend.sh <server-ip>"
    echo "Example: ./deploy-frontend.sh 123.456.789.0"
    exit 1
fi

SERVER_IP=$1
SERVER_USER="opc"
FRONTEND_DIR="/opt/sizzle-frontend"

echo "🚀 Deploying Sizzle Frontend to $SERVER_IP"

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

echo "📦 Building frontend..."
npm run build

echo "📤 Uploading to server..."
# Create temp directory on server
ssh $SERVER_USER@$SERVER_IP "mkdir -p /tmp/sizzle-frontend-deploy"

# Upload built files
scp -r .next package.json package-lock.json next.config.js public/ $SERVER_USER@$SERVER_IP:/tmp/sizzle-frontend-deploy/

echo "🔧 Installing dependencies and restarting..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
# Backup current version
if [ -d /opt/sizzle-frontend/.next ]; then
    mv /opt/sizzle-frontend/.next /opt/sizzle-frontend/.next.backup
fi

# Move new version
cp -r /tmp/sizzle-frontend-deploy/* /opt/sizzle-frontend/
rm -rf /tmp/sizzle-frontend-deploy

# Install dependencies
cd /opt/sizzle-frontend
npm install --production

# Restart
pm2 restart sizzle-frontend || pm2 start /home/opc/ecosystem.config.js --only sizzle-frontend
pm2 save

# Cleanup backup on success
rm -rf /opt/sizzle-frontend/.next.backup
EOF

echo "✅ Frontend deployed successfully!"
echo "📊 Viewing logs (Ctrl+C to exit):"
ssh $SERVER_USER@$SERVER_IP "pm2 logs sizzle-frontend --lines 20"

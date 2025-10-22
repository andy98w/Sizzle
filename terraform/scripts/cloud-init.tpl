#!/bin/bash

# Sizzle - Recipe Assistant App Setup
# Optimized for E2.1.Micro (1GB RAM)

set -e
exec > >(tee /var/log/cloud-init-sizzle.log)
exec 2>&1

echo "=== Sizzle Setup Started at $(date) ==="

# Update system
echo "Updating system..."
dnf update -y

# Install Node.js 18 for Next.js
echo "Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
dnf install -y nodejs nginx

# Install Python 3.11
echo "Installing Python..."
dnf install -y python3.11 python3.11-pip python3.11-devel gcc

# Create symlinks for python and pip
alternatives --set python3 /usr/bin/python3.11
ln -sf /usr/bin/python3.11 /usr/bin/python
ln -sf /usr/bin/pip3.11 /usr/bin/pip

# Install PM2 globally for process management
npm install -g pm2

# Create directories
mkdir -p /opt/sizzle-backend
mkdir -p /opt/sizzle-frontend
mkdir -p /var/log/sizzle

chown -R opc:opc /opt/sizzle-backend
chown -R opc:opc /opt/sizzle-frontend
chown -R opc:opc /var/log/sizzle

# Create Python virtual environment for backend
echo "Setting up Python virtual environment..."
python3.11 -m venv /opt/sizzle-backend/venv
chown -R opc:opc /opt/sizzle-backend/venv

# Create backend environment file
cat > /opt/sizzle-backend/.env <<EOF
# Supabase
SUPABASE_URL=${supabase_url}
SUPABASE_KEY=${supabase_key}

# OpenAI
OPENAI_API_KEY=${openai_api_key}

# OCI Object Storage
OCI_NAMESPACE=${oci_namespace}
OCI_BUCKET_NAME=${oci_bucket_name}
OCI_PAR_URL=${oci_par_url}
OCI_REGION=ca-toronto-1

# Application
PORT=8000
ENVIRONMENT=production
EOF

chmod 600 /opt/sizzle-backend/.env
chown opc:opc /opt/sizzle-backend/.env

# Create frontend environment file
cat > /opt/sizzle-frontend/.env.production.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

chmod 600 /opt/sizzle-frontend/.env.production.local
chown opc:opc /opt/sizzle-frontend/.env.production.local

# Configure Nginx
cat > /etc/nginx/nginx.conf <<'NGINXCONF'
user nginx;
worker_processes 1;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 512;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;  # Allow larger image uploads

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    include /etc/nginx/conf.d/*.conf;
}
NGINXCONF

# Site configuration
cat > /etc/nginx/conf.d/sizzle.conf <<'SITECONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${domain_name};

    # API Backend (FastAPI)
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeouts for AI generation
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # Next.js Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
SITECONF

# Configure firewalld
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

# Start Nginx
nginx -t && systemctl enable --now nginx

# PM2 ecosystem file for backend and frontend
cat > /home/opc/ecosystem.config.js <<'PMCONF'
module.exports = {
  apps: [
    {
      name: "sizzle-backend",
      script: "/opt/sizzle-backend/venv/bin/uvicorn",
      args: "app:app --host 0.0.0.0 --port 8000",
      cwd: "/opt/sizzle-backend",
      interpreter: "/opt/sizzle-backend/venv/bin/python",
      env: {
        PYTHONPATH: "/opt/sizzle-backend"
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "400M",
      error_file: "/var/log/sizzle/backend-error.log",
      out_file: "/var/log/sizzle/backend-out.log"
    },
    {
      name: "sizzle-frontend",
      script: "npm",
      args: "start",
      cwd: "/opt/sizzle-frontend",
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      error_file: "/var/log/sizzle/frontend-error.log",
      out_file: "/var/log/sizzle/frontend-out.log"
    }
  ]
};
PMCONF

chown opc:opc /home/opc/ecosystem.config.js

# Setup PM2 startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u opc --hp /home/opc

# Create placeholder page
cat > /usr/share/nginx/html/index.html <<'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sizzle - Recipe Assistant</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      text-align: center;
    }
    .container {
      max-width: 600px;
      padding: 40px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
    .badge {
      display: inline-block;
      background: #10b981;
      padding: 8px 16px;
      border-radius: 50px;
      margin: 10px;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🍳 Sizzle</h1>
    <p style="font-size: 1.2rem;">AI-Powered Recipe Assistant</p>
    <div class="badge">✅ Server Ready</div>
    <div class="badge">🤖 AI Enabled</div>
    <div class="badge">🔒 Secure</div>
    <p style="margin-top: 30px; font-size: 0.9rem;">
      Deploy your application to get started!
    </p>
  </div>
</body>
</html>
HTMLEOF

# Create deployment guide
cat > /home/opc/DEPLOY.md <<'README'
# Sizzle - Quick Deployment Guide

## Backend Deployment (FastAPI)
```bash
# From your local machine
cd backend
scp -r *.py requirements.txt scripts/ opc@<server-ip>:/opt/sizzle-backend/

# On the server
ssh opc@<server-ip>
cd /opt/sizzle-backend
source venv/bin/activate
pip install -r requirements.txt
pm2 start /home/opc/ecosystem.config.js --only sizzle-backend
pm2 save
```

## Frontend Deployment (Next.js)
```bash
# Build locally first
cd frontend
npm run build

# Deploy to server
scp -r .next package.json package-lock.json public/ next.config.js opc@<server-ip>:/opt/sizzle-frontend/

# On the server
ssh opc@<server-ip>
cd /opt/sizzle-frontend
npm install --production
pm2 start /home/opc/ecosystem.config.js --only sizzle-frontend
pm2 save
```

## Quick Commands
- **View logs:** `pm2 logs`
- **Restart:** `pm2 restart all`
- **Status:** `pm2 status`
- **Monitor:** `pm2 monit`

## Access
- **Frontend:** http://<server-ip>
- **Backend API:** http://<server-ip>/api
- **Health Check:** http://<server-ip>/health

## Environment
Backend .env is at: /opt/sizzle-backend/.env
Frontend .env is at: /opt/sizzle-frontend/.env.production.local
README

chown opc:opc /home/opc/DEPLOY.md

# Welcome message
cat > /etc/motd <<EOF
╔══════════════════════════════════════════════════╗
║        🍳 Sizzle Recipe Assistant 🍳             ║
╚══════════════════════════════════════════════════╝

Status: ✅ READY
Resources: E2.1.Micro (1GB RAM)
Database: Supabase (PostgreSQL)
Access: http://$(hostname -I | awk '{print $1}')

📖 Deployment: ~/DEPLOY.md
📊 Monitor: pm2 status
EOF

echo "=== Sizzle Setup Complete at $(date) ==="
echo "Server is ready for deployment!"
echo "See /home/opc/DEPLOY.md for deployment instructions"

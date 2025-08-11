#!/bin/bash

echo "🔄 Updating Samanin Backend Server..."

# Stop the running server
echo "📴 Stopping server..."
pkill -f "node dist/main" || true

# Pull latest changes
echo "⬇️  Pulling latest changes..."
git pull origin main

# Check if package.json was modified
if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Rebuild the application
echo "🔨 Building application..."
npm run build

# Start the server
echo "🚀 Starting server..."
nohup npm run start:prod > server.log 2>&1 &

echo "✅ Server updated and started!"
echo "📋 Check logs with: tail -f server.log"
echo "🌐 API available at: http://localhost:3000"

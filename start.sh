#!/bin/bash

# 🚀 GeoLedger Startup Script
# This script starts both backend and frontend servers

echo "🔍 Checking for running processes..."

# Kill existing processes
pkill -f "ts-node-dev" 2>/dev/null
pkill -f "next dev" 2>/dev/null

echo "⏳ Waiting for processes to stop..."
sleep 2

echo "🚀 Starting backend server on port 4000..."
cd "$(dirname "$0")/backend"
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

echo "🚀 Starting frontend server on port 3000..."
cd "$(dirname "$0")/frontend"
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "⏳ Waiting for servers to start..."
sleep 5

echo ""
echo "✅ GeoLedger is starting!"
echo ""
echo "📊 Server Status:"
echo "   Backend PID: $BACKEND_PID (port 4000)"
echo "   Frontend PID: $FRONTEND_PID (port 3000)"
echo ""
echo "🌐 Open in browser:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:4000"
echo "   Chatbot API: http://localhost:4000/api/chat/message"
echo ""
echo "💬 Look for the chat button (💬) in the bottom-right corner!"
echo ""
echo "📋 Logs:"
echo "   Backend: logs/backend.log"
echo "   Frontend: logs/frontend.log"
echo ""
echo "🛑 To stop servers: pkill -f 'ts-node-dev' && pkill -f 'next dev'"
echo ""

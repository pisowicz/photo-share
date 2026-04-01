#!/bin/bash

echo "🚀 Starting Photo Share App..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Please copy .env.example to .env and add your Cloudinary credentials:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    echo ""
    echo "Get your credentials from: https://cloudinary.com/console"
    exit 1
fi

# Start backend
echo "📡 Starting backend server..."
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Photo Share App is running!"
echo ""
echo "📍 Open: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

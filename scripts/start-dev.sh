#!/bin/bash

echo "🚀 Starting Rental Shop Development Servers..."
echo ""

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use. Please stop the service using port $1 first."
        return 1
    fi
    return 0
}

# Check ports
echo "🔍 Checking ports..."
check_port 3000 || exit 1
check_port 3001 || exit 1
check_port 3002 || exit 1
echo "✅ All ports are available"
echo ""

# Start API server
echo "🌐 Starting API server on port 3002..."
cd apps/api
npm run dev &
API_PID=$!
cd ../..

# Wait a moment for API to start
sleep 3

# Start client app
echo "💻 Starting client app on port 3000..."
cd apps/client
npm run dev &
CLIENT_PID=$!
cd ../..

# Start admin app
echo "⚙️ Starting admin app on port 3001..."
cd apps/admin
npm run dev &
ADMIN_PID=$!
cd ../..

# Wait for all servers to start
sleep 5

echo ""
echo "🎉 All servers started successfully!"
echo ""
echo "📱 Client App: http://localhost:3000"
echo "   - Login: client@rentalshop.com / client123"
echo "   - Test page: http://localhost:3000/test"
echo ""
echo "⚙️ Admin App: http://localhost:3001"
echo "   - Login: manager@rentalshop.com / manager123"
echo ""
echo "🌐 API Server: http://localhost:3002"
echo "   - Health check: http://localhost:3002/api/health/database"
echo ""
echo "📊 Prisma Studio: http://localhost:5555"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all servers..."
    kill $API_PID 2>/dev/null
    kill $CLIENT_PID 2>/dev/null
    kill $ADMIN_PID 2>/dev/null
    echo "✅ All servers stopped"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT

# Keep script running
wait 
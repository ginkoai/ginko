#!/bin/bash

echo "🔧 Quick Remote MCP Test"
echo "======================="

# Start server in background
npm run dev:remote > /tmp/remote-test.log 2>&1 &
SERVER_PID=$!

echo "Started server (PID: $SERVER_PID)"
sleep 2

# Test health endpoint
echo "Testing health endpoint..."
if curl -s http://localhost:3031/health; then
    echo "✅ Server is responding"
else
    echo "❌ Server not responding"
fi

# Clean up
kill $SERVER_PID 2>/dev/null
echo "Server stopped"

echo ""
echo "🎯 Ready to test! Run:"
echo "1. Terminal 1: npm run dev:remote"
echo "2. Terminal 2: cp .mcp-remote.json .mcp.json && claude"
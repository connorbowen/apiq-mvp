#!/bin/bash

# Kill any process running on port 3000
echo "🔍 Checking for processes on port 3000..."

# Find and kill processes on port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Found process(es) running on port 3000. Killing them..."
    lsof -ti:3000 | xargs kill -9
    echo "✅ Killed process(es) on port 3000"
else
    echo "✅ Port 3000 is free"
fi

# Wait a moment for the port to be fully released
sleep 1

# Double-check that port 3000 is free
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "❌ Port 3000 is still in use after kill attempt"
    exit 1
else
    echo "✅ Port 3000 is confirmed free"
fi 
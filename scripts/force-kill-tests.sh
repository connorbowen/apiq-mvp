#!/bin/bash

# Force kill all test-related processes
# This script ensures clean shutdown of e2e tests

echo "🛑 Force killing all test processes..."

# Kill playwright processes
pkill -f "playwright" 2>/dev/null || true
pkill -f "chromium" 2>/dev/null || true
pkill -f "chrome" 2>/dev/null || true

# Kill node processes related to testing
pkill -f "next start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Kill concurrently processes
pkill -f "concurrently" 2>/dev/null || true

# Kill wait-on processes
pkill -f "wait-on" 2>/dev/null || true

# Force kill any remaining processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to die
sleep 2

# Double-check and force kill any remaining test processes
pkill -9 -f "playwright" 2>/dev/null || true
pkill -9 -f "chromium" 2>/dev/null || true
pkill -9 -f "chrome" 2>/dev/null || true
pkill -9 -f "concurrently" 2>/dev/null || true

echo "✅ All test processes killed"

#!/bin/bash

# Force kill all test-related processes
echo "🛑 Force killing all test processes..."

# Kill processes on port 3000
echo "🔍 Killing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill Playwright processes
echo "🎭 Killing Playwright processes..."
pkill -f playwright 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
pkill -f chrome 2>/dev/null || true

# Kill Next.js processes
echo "⚡ Killing Next.js processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true

# Kill concurrently processes
echo "🔄 Killing concurrently processes..."
pkill -f concurrently 2>/dev/null || true

# Kill wait-on processes
echo "⏳ Killing wait-on processes..."
pkill -f wait-on 2>/dev/null || true

# Kill any remaining Node processes from this project
echo "🟢 Killing project Node processes..."
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ps aux | grep -E "node.*$PROJECT_ROOT" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

echo "✅ All test processes killed"
echo "🔍 Checking for remaining processes on port 3000..."
sleep 2
lsof -ti:3000 && echo "⚠️  Some processes still running on port 3000" || echo "✅ Port 3000 is free"
#!/bin/bash

# Smart dev script that intelligently handles port 3000
# - If Next.js dev server is already running, use it
# - If something else is running on port 3000, kill it
# - If nothing is running, start the dev server

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3000

echo "🚀 Smart dev script starting..."

# Check if anything is running on port 3000
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -n "$PIDS" ]; then
  echo "🔍 Found processes on port $PORT..."
  
  # Check each process
  NEXTJS_SERVER_FOUND=false
  OTHER_PROCESSES_FOUND=false
  
  for PID in $PIDS; do
    # Get the full command line for the process
    CMDLINE=$(ps -p $PID -o args= 2>/dev/null)
    
    # Check if it's a Next.js dev server from this project
    if [[ "$CMDLINE" == *"next dev"* ]] && [[ "$CMDLINE" == *"$PROJECT_ROOT"* ]]; then
      echo "✅ Found Next.js dev server already running (PID $PID)"
      echo "   Command: $CMDLINE"
      NEXTJS_SERVER_FOUND=true
    elif [[ "$CMDLINE" == *"node"* ]] && [[ "$CMDLINE" == *"$PROJECT_ROOT"* ]] && [[ "$CMDLINE" == *"next"* ]]; then
      echo "✅ Found Next.js server already running (PID $PID)"
      echo "   Command: $CMDLINE"
      NEXTJS_SERVER_FOUND=true
    elif [[ "$CMDLINE" == *"next-server"* ]]; then
      echo "✅ Found Next.js server already running (PID $PID)"
      echo "   Command: $CMDLINE"
      NEXTJS_SERVER_FOUND=true
    else
      echo "⚠️  Found other process on port $PORT (PID $PID)"
      echo "   Command: $CMDLINE"
      OTHER_PROCESSES_FOUND=true
    fi
  done
  
  if [ "$NEXTJS_SERVER_FOUND" = true ]; then
    echo "🎉 Using existing Next.js dev server!"
    echo "   Server is available at: http://localhost:$PORT"
    echo "   Press Ctrl+C to stop the server"
    
    # Keep the script running so the user can see the server logs
    # The server will continue running in the background
    echo "📝 Server logs will appear below:"
    echo "   (If you don't see logs, the server might be running in another terminal)"
    echo ""
    
    # Wait for user to stop the script
    echo "Press Ctrl+C to exit this script (server will continue running)"
    while true; do
      sleep 1
    done
  elif [ "$OTHER_PROCESSES_FOUND" = true ]; then
    echo "🧹 Killing other processes on port $PORT..."
    for PID in $PIDS; do
      CMDLINE=$(ps -p $PID -o args= 2>/dev/null)
      # Only kill if it's NOT a Next.js server
      if [[ "$CMDLINE" != *"next dev"* ]] && [[ "$CMDLINE" != *"next-server"* ]] && [[ "$CMDLINE" != *"$PROJECT_ROOT"* ]]; then
        echo "   Killing process $PID: $CMDLINE"
        kill -9 $PID 2>/dev/null
      else
        echo "   Skipping Next.js server (PID $PID): $CMDLINE"
      fi
    done
    
    # Wait a moment for processes to be killed
    sleep 2
    
    echo "✅ Port $PORT cleared, starting Next.js dev server..."
    cd "$PROJECT_ROOT"
    npx next dev
  fi
else
  echo "✅ Port $PORT is free, starting Next.js dev server..."
  cd "$PROJECT_ROOT"
  npx next dev
fi 
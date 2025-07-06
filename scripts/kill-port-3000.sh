#!/bin/bash

# Kill any process running on port 3000, unless it's the intended dev/test server
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔍 Checking for processes on port 3000..."

PIDS=$(lsof -ti:3000)
if [ -n "$PIDS" ]; then
  for PID in $PIDS; do
    # Get the full command line for the process
    CMDLINE=$(ps -p $PID -o args=)
    # Check for Next.js dev server or node running from project root
    if [[ "$CMDLINE" == *"next dev"* ]] && [[ "$CMDLINE" == *"$PROJECT_ROOT"* ]]; then
      echo "⚠️  Port 3000 is in use by Next.js dev server (PID $PID). Not killing."
      continue
    elif [[ "$CMDLINE" == *"node"* ]] && [[ "$CMDLINE" == *"$PROJECT_ROOT"* ]]; then
      echo "⚠️  Port 3000 is in use by node process from project root (PID $PID). Not killing."
      continue
    else
      echo "⚠️  Found process $PID ($CMDLINE) running on port 3000. Killing it..."
      kill -9 $PID
      echo "✅ Killed process $PID on port 3000"
    fi
  done
else
  echo "✅ Port 3000 is free"
fi

# Wait a moment for the port to be fully released
sleep 1

# Double-check that port 3000 is free or only used by allowed processes
PIDS=$(lsof -ti:3000)
if [ -n "$PIDS" ]; then
  ALL_ALLOWED=true
  for PID in $PIDS; do
    CMDLINE=$(ps -p $PID -o args=)
    if [[ "$CMDLINE" == *"next dev"* ]] && [[ "$CMDLINE" == *"$PROJECT_ROOT"* ]]; then
      continue
    elif [[ "$CMDLINE" == *"node"* ]] && [[ "$CMDLINE" == *"$PROJECT_ROOT"* ]]; then
      continue
    else
      ALL_ALLOWED=false
      break
    fi
  done
  if [ "$ALL_ALLOWED" = true ]; then
    echo "✅ Port 3000 is only used by allowed server process(es)"
    exit 0
  else
    echo "❌ Port 3000 is still in use by unknown process after kill attempt"
    exit 1
  fi
else
  echo "✅ Port 3000 is confirmed free"
fi 
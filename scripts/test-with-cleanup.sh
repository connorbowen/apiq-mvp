#!/bin/bash

# Global test runner with comprehensive cleanup
# This script can be used with any test command to ensure proper cleanup

# Function to cleanup all test processes
cleanup_all() {
    echo "🧹 Cleaning up all test processes..."
    
    # Kill all test-related processes
    ./scripts/force-kill-tests.sh
    
    # Additional cleanup
    pkill -f "playwright" 2>/dev/null || true
    pkill -f "chromium" 2>/dev/null || true
    pkill -f "chrome" 2>/dev/null || true
    pkill -f "concurrently" 2>/dev/null || true
    pkill -f "wait-on" 2>/dev/null || true
    
    # Force kill any processes on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    echo "✅ Cleanup completed"
}

# Set up signal handlers
trap cleanup_all SIGINT SIGTERM SIGHUP

# Run the provided command
eval "$@"

# Capture exit code
EXIT_CODE=$?

# Cleanup after completion
cleanup_all

exit $EXIT_CODE

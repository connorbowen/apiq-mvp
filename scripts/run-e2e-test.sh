#!/bin/bash

# Global E2E test runner with comprehensive cleanup
# Usage: ./scripts/run-e2e-test.sh "test command"

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[E2E-TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[E2E-TEST]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[E2E-TEST]${NC} $1"
}

print_error() {
    echo -e "${RED}[E2E-TEST]${NC} $1"
}

# Comprehensive cleanup function
cleanup_all() {
    print_warning "🧹 Performing comprehensive cleanup..."
    
    # Kill all test-related processes
    ./scripts/force-kill-tests.sh
    
    # Additional cleanup for any remaining processes
    pkill -f "playwright" 2>/dev/null || true
    pkill -f "chromium" 2>/dev/null || true
    pkill -f "chrome" 2>/dev/null || true
    pkill -f "concurrently" 2>/dev/null || true
    pkill -f "wait-on" 2>/dev/null || true
    
    # Force kill any processes on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Wait for processes to die
    sleep 2
    
    print_success "✅ Cleanup completed"
}

# Signal handlers for cleanup
cleanup_on_exit() {
    print_warning "🛑 Test interrupted, performing cleanup..."
    cleanup_all
    exit 1
}

cleanup_on_error() {
    print_error "❌ Test failed, performing cleanup..."
    cleanup_all
    exit 1
}

# Set up signal handlers
trap cleanup_on_exit SIGINT SIGTERM SIGHUP
trap cleanup_on_error ERR

# Check if test command was provided
if [ -z "$1" ]; then
    print_error "❌ No test command provided"
    print_status "Usage: ./scripts/run-e2e-test.sh \"test command\""
    exit 1
fi

TEST_COMMAND="$1"

print_status "🚀 Starting E2E test: $TEST_COMMAND"

# Initial cleanup before starting
cleanup_all

# Run the test command
print_status "🧪 Executing test command..."
eval "$TEST_COMMAND"

# Capture exit code
EXIT_CODE=$?

# Cleanup after test completion
if [ $EXIT_CODE -eq 0 ]; then
    print_success "✅ Test completed successfully"
else
    print_error "❌ Test failed with exit code $EXIT_CODE"
fi

# Always cleanup
cleanup_all

exit $EXIT_CODE

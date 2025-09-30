#!/bin/bash

# Run tests with proper cleanup
# This script ensures tests are properly killed when interrupted

echo "🧪 Starting tests with cleanup..."

# Set up signal handlers for cleanup
cleanup() {
    echo "🛑 Test interrupted, cleaning up..."
    ./scripts/force-kill-tests.sh
    exit 1
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Run the tests
echo "🚀 Running core workflow generation tests..."
npm run test:e2e:workflow-engine:core-generation

# Capture exit code
EXIT_CODE=$?

# Clean up on completion
echo "🧹 Cleaning up after tests..."
./scripts/force-kill-tests.sh

exit $EXIT_CODE

#!/bin/bash

# Run Confidence Confirmation E2E Tests
# This script runs the confidence confirmation tests with proper setup and cleanup

set -e

echo "🧪 Running Confidence Confirmation E2E Tests..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    echo "❌ Error: Playwright is not installed. Please run 'npm install' first"
    exit 1
fi

# Set environment variables
export BASE_URL=${BASE_URL:-"http://localhost:3000"}
export NODE_ENV=test

echo "🔧 Environment:"
echo "  BASE_URL: $BASE_URL"
echo "  NODE_ENV: $NODE_ENV"

# Check if the server is running
echo "🔍 Checking if server is running..."
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "❌ Error: Server is not running at $BASE_URL"
    echo "   Please start the server with 'npm run dev' first"
    exit 1
fi

echo "✅ Server is running"

# Run the confidence confirmation tests
echo "🚀 Running confidence confirmation tests..."

# Run specific test file
npx playwright test tests/e2e/chat/confidence-confirmation.test.ts \
    --reporter=list \
    --timeout=60000 \
    --retries=2

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ All confidence confirmation tests passed!"
else
    echo "❌ Some confidence confirmation tests failed"
    exit 1
fi

echo "🎉 Confidence confirmation test run completed!"

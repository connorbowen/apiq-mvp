#!/bin/bash

# Run optimized UI tests with Chromium only
echo "🚀 Running optimized UI tests with Chromium only..."

# Check if the dev server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "⚠️  Dev server not running. Starting it..."
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to start
    echo "⏳ Waiting for dev server to start..."
    npx wait-on http://localhost:3000 --timeout 60000
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to start dev server"
        exit 1
    fi
    echo "✅ Dev server started"
else
    echo "✅ Dev server already running"
    DEV_PID=""
fi

# Run the optimized UI tests
echo "🧪 Running UI tests..."
npx playwright test --config=playwright.ui.config.ts

# Capture exit code
EXIT_CODE=$?

# Clean up dev server if we started it
if [ ! -z "$DEV_PID" ]; then
    echo "🛑 Stopping dev server..."
    kill $DEV_PID 2>/dev/null
fi

# Exit with test result
exit $EXIT_CODE 
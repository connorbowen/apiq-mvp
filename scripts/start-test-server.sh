#!/bin/bash

# Start Next.js server with test environment variables
export NODE_ENV=test
export ENABLE_TEST_OAUTH2=true
export TEST_MODE=true
export PLAYWRIGHT_TEST=true
export DISABLE_RATE_LIMITING=true
export E2E=true

echo "🚀 Starting Next.js server with test environment variables:"
echo "   NODE_ENV: $NODE_ENV"
echo "   ENABLE_TEST_OAUTH2: $ENABLE_TEST_OAUTH2"
echo "   TEST_MODE: $TEST_MODE"
echo "   PLAYWRIGHT_TEST: $PLAYWRIGHT_TEST"
echo "   E2E: $E2E"

# Check if build already exists and is recent (within 5 minutes)
BUILD_EXISTS=false
if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
    BUILD_TIME=$(stat -f "%m" .next/BUILD_ID 2>/dev/null || echo "0")
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - BUILD_TIME))
    
    if [ $TIME_DIFF -lt 300 ]; then
        echo "✅ Recent build found, skipping build step"
        BUILD_EXISTS=true
    else
        echo "⏰ Build is older than 5 minutes, rebuilding..."
    fi
else
    echo "🔨 No build found, building Next.js application..."
fi

# Only build if needed
if [ "$BUILD_EXISTS" = false ]; then
    echo "🔨 Building Next.js application for production..."
    if ! npx next build; then
        echo "❌ Build failed, exiting"
        exit 1
    fi
    echo "✅ Build completed successfully"
fi

echo "🚀 Starting production server..."
echo "📝 Server will run on http://localhost:3000"
echo "🔄 Use Ctrl+C to stop the server"

# Start server with better error handling
echo "🚀 Starting Next.js server..."
# Use node directly instead of exec to allow proper process management
# Add signal handling for clean shutdown
trap 'echo "🛑 Received shutdown signal, stopping server..."; exit 0' SIGINT SIGTERM
node -r ./scripts/server-error-handler.js ./node_modules/.bin/next start -p 3000

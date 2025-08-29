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

echo "🔨 Building Next.js application for production..."
npx next build

echo "🚀 Starting production server..."
exec npx next start -p 3000

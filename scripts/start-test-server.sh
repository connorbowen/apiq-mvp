#!/bin/bash

# Start Next.js server with test environment variables
export NODE_ENV=test
export ENABLE_TEST_OAUTH2=true
export TEST_MODE=true
export PLAYWRIGHT_TEST=true
export DISABLE_RATE_LIMITING=true

echo "🚀 Starting Next.js server with test environment variables:"
echo "   NODE_ENV: $NODE_ENV"
echo "   ENABLE_TEST_OAUTH2: $ENABLE_TEST_OAUTH2"
echo "   TEST_MODE: $TEST_MODE"
echo "   PLAYWRIGHT_TEST: $PLAYWRIGHT_TEST"

# Start the Next.js server
exec npx next dev

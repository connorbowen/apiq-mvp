#!/bin/bash

# Connection Guidance System Validation Script
# Run this to validate the centralized connection guidance system works correctly

echo "🔍 Validating Connection Guidance System..."
echo "=============================================="

# Test 1: Connection Guidance Core Functionality
echo "📋 Test 1: Connection Guidance Core Functionality"
npm run test:e2e tests/e2e/chat/connection-guidance.test.ts
if [ $? -eq 0 ]; then
    echo "✅ Connection guidance tests passed"
else
    echo "❌ Connection guidance tests failed"
    exit 1
fi

# Test 2: Direct API Calls (should trigger guidance)
echo "📋 Test 2: Direct API Calls"
npm run test:e2e tests/e2e/api-operations/direct-api-calls-chat.test.ts
if [ $? -eq 0 ]; then
    echo "✅ Direct API call tests passed"
else
    echo "❌ Direct API call tests failed"
    exit 1
fi

# Test 3: Workflow Generation
echo "📋 Test 3: Workflow Generation"
npm run test:e2e tests/e2e/workflow-engine/core-workflow-generation.test.ts
if [ $? -eq 0 ]; then
    echo "✅ Workflow generation tests passed"
else
    echo "❌ Workflow generation tests failed"
    exit 1
fi

# Test 4: Natural Language Processing
echo "📋 Test 4: Natural Language Processing"
npm run test:e2e tests/e2e/workflow-engine/natural-language-workflow.test.ts
if [ $? -eq 0 ]; then
    echo "✅ Natural language workflow tests passed"
else
    echo "❌ Natural language workflow tests failed"
    exit 1
fi

echo "=============================================="
echo "🎉 All critical connection guidance tests passed!"
echo "The centralized system is working correctly."

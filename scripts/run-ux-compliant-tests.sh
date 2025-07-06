#!/bin/bash

# UX Compliant E2E Test Runner
# This script runs E2E tests that follow the UX spec, PRD, and user rules

set -e

echo "🚀 Running UX Compliant E2E Tests"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if environment is set up
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    echo "⚠️  Warning: No .env file found. Tests may fail without proper configuration."
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server in the background
echo "🔧 Starting development server..."
npm run dev &
DEV_SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 10

# Check if server is running
if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "❌ Error: Development server is not responding"
    kill $DEV_SERVER_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Server is ready"

# Run database setup if needed
if [ ! -f "prisma/migrations/migration_lock.toml" ]; then
    echo "🗄️  Setting up database..."
    npm run db:setup
fi

# Run the UX compliant workflow management tests
echo "🧪 Running UX Compliant Workflow Management Tests..."
npx playwright test tests/e2e/workflow-engine/workflow-management.test.ts \
    --reporter=html \
    --project=chromium \
    --headed=false \
    --timeout=60000

# Check test results
TEST_EXIT_CODE=$?

# Stop the development server
echo "🛑 Stopping development server..."
kill $DEV_SERVER_PID 2>/dev/null || true

# Report results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All UX compliant tests passed!"
    echo ""
    echo "📊 Test Summary:"
    echo "   - Tests follow UX spec requirements"
    echo "   - Tests follow PRD requirements"
    echo "   - Tests follow user rules (no mocking in E2E)"
    echo "   - Tests validate accessibility (WCAG 2.1 AA)"
    echo "   - Tests validate activation-first UX"
    echo "   - Tests validate natural language interface"
    echo ""
    echo "🎯 UX Compliance Validated:"
    echo "   ✓ Heading hierarchy"
    echo "   ✓ Form accessibility"
    echo "   ✓ Keyboard navigation"
    echo "   ✓ ARIA compliance"
    echo "   ✓ Loading states"
    echo "   ✓ Error handling"
    echo "   ✓ Success feedback"
    echo "   ✓ Mobile responsiveness"
    echo "   ✓ Performance requirements"
    echo ""
    echo "📈 Next Steps:"
    echo "   - Review test results in playwright-report/"
    echo "   - Apply UX compliance patterns to other tests"
    echo "   - Update UI components to match UX spec"
    echo "   - Run tests in CI/CD pipeline"
else
    echo "❌ Some UX compliant tests failed"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   - Check test logs for specific failures"
    echo "   - Verify UI components match UX spec"
    echo "   - Ensure accessibility requirements are met"
    echo "   - Check that no mocking is used in E2E tests"
    echo "   - Review UX compliance helper usage"
    echo ""
    echo "📚 Documentation:"
    echo "   - UX Spec: docs/UX_SPEC.md"
    echo "   - PRD: docs/prd.md"
    echo "   - User Rules: docs/user-rules.md"
    echo "   - Test Helper: tests/helpers/uxCompliance.ts"
fi

exit $TEST_EXIT_CODE 
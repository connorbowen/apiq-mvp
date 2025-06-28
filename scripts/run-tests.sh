#!/bin/bash

# APIQ Test Runner Script
# Runs all tests with proper setup and reporting

set -e

echo "🚀 Starting APIQ Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env from .env.example"
    else
        print_error ".env.example not found. Please create a .env file with required environment variables."
        exit 1
    fi
fi

# Set test environment
export NODE_ENV=test
export DATABASE_URL="postgresql://test:test@localhost:5432/apiq_test"

print_status "Environment set to: $NODE_ENV"

# Run database setup if needed
if [ "$1" = "--setup-db" ] || [ "$1" = "-s" ]; then
    print_status "Setting up test database..."
    npm run db:generate
    npm run db:migrate
fi

# Function to run tests with timeout
run_test_with_timeout() {
    local test_name="$1"
    local test_command="$2"
    local timeout_seconds="${3:-300}"  # Default 5 minutes
    
    print_status "Running $test_name tests..."
    
    if timeout $timeout_seconds bash -c "$test_command"; then
        print_success "$test_name tests passed!"
        return 0
    else
        print_error "$test_name tests failed!"
        return 1
    fi
}

# Track overall success
overall_success=true

# Run unit tests
print_status "Starting Unit Tests..."
if run_test_with_timeout "Unit" "npm run test:unit"; then
    print_success "Unit tests completed successfully"
else
    print_error "Unit tests failed"
    overall_success=false
fi

# Run integration tests
print_status "Starting Integration Tests..."
if run_test_with_timeout "Integration" "npm run test:integration"; then
    print_success "Integration tests completed successfully"
else
    print_error "Integration tests failed"
    overall_success=false
fi

# Check if Playwright is installed
if command -v npx playwright &> /dev/null; then
    # Install Playwright browsers if not already installed
    if [ ! -d "node_modules/.cache/playwright" ]; then
        print_status "Installing Playwright browsers..."
        npx playwright install
    fi
    
    # Run E2E tests
    print_status "Starting E2E Tests..."
    if run_test_with_timeout "E2E" "npm run test:e2e" 600; then
        print_success "E2E tests completed successfully"
    else
        print_error "E2E tests failed"
        overall_success=false
    fi
else
    print_warning "Playwright not found. Skipping E2E tests."
fi

# Generate coverage report
print_status "Generating coverage report..."
if npm run test:coverage; then
    print_success "Coverage report generated"
else
    print_warning "Coverage report generation failed"
fi

# Print summary
echo ""
echo "=========================================="
echo "           TEST SUITE SUMMARY"
echo "=========================================="

if [ "$overall_success" = true ]; then
    print_success "All tests passed! 🎉"
    echo ""
    print_status "Test coverage report available in coverage/"
    print_status "E2E test report available in playwright-report/"
    exit 0
else
    print_error "Some tests failed! ❌"
    echo ""
    print_status "Check the output above for details"
    print_status "Run individual test suites with:"
    echo "  npm run test:unit"
    echo "  npm run test:integration"
    echo "  npm run test:e2e"
    exit 1
fi 
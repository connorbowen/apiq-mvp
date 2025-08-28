#!/bin/bash

# Authentication E2E Test Runner
# 
# This script runs comprehensive E2E tests for authentication flows
# following user-rules.md testing requirements and UX compliance standards.
#
# Usage: ./run-authentication-tests.sh [options]
#
# Options:
#   --headed          Run tests in headed mode (visible browser)
#   --debug          Enable debug logging
#   --parallel       Run tests in parallel (default: sequential for stability)
#   --report         Generate detailed HTML report
#   --video          Record video of test runs
#   --screenshot     Capture screenshots on failure
#   --help           Show this help message

set -e

# Default configuration
HEADED=false
DEBUG=false
PARALLEL=false
REPORT=false
VIDEO=false
SCREENSHOT=false
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADED=true
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --parallel)
      PARALLEL=true
      shift
      ;;
    --report)
      REPORT=true
      shift
      ;;
    --video)
      VIDEO=true
      shift
      ;;
    --screenshot)
      SCREENSHOT=true
      shift
      ;;
    --help)
      echo "Authentication E2E Test Runner"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --headed          Run tests in headed mode (visible browser)"
      echo "  --debug          Enable debug logging"
      echo "  --parallel       Run tests in parallel (default: sequential for stability)"
      echo "  --report         Generate detailed HTML report"
      echo "  --video          Record video of test runs"
      echo "  --screenshot     Capture screenshots on failure"
      echo "  --help           Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  BASE_URL         Base URL for testing (default: http://localhost:3000)"
      echo "  NODE_ENV         Node environment (default: test)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Set environment variables
export NODE_ENV="${NODE_ENV:-test}"
export BASE_URL="$BASE_URL"

# Log function
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✅ $1"
}

log_warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ⚠️  $1"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ❌ $1"
}

# Check prerequisites
check_prerequisites() {
  log "Checking prerequisites..."
  
  # Check if Node.js is installed
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
  fi
  
  # Check if npm is installed
  if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
  fi
  
  # Check if Playwright is installed
  if ! npx playwright --version &> /dev/null; then
    log_warning "Playwright not found, installing..."
    npm install -D @playwright/test
    npx playwright install
  fi
  
  # Check if dependencies are installed
  if [ ! -d "node_modules" ]; then
    log_warning "Dependencies not installed, installing..."
    npm install
  fi
  
  log_success "Prerequisites check passed"
}

# Check if application is running
check_application() {
  log "Checking if application is running at $BASE_URL..."
  
  if ! curl -s "$BASE_URL" > /dev/null; then
    log_error "Application is not running at $BASE_URL"
    log "Please start your application first:"
    log "  npm run dev"
    log "  # or"
    log "  npm start"
    exit 1
  fi
  
  log_success "Application is running"
}

# Build Playwright configuration
build_config() {
  log "Building Playwright configuration..."
  
  # Create temporary config for authentication tests
  cat > playwright.auth.config.ts << EOF
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/auth',
  fullyParallel: $PARALLEL,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: $PARALLEL ? '50%' : 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report-auth' }],
    ['json', { outputFile: 'test-results-auth/results.json' }],
    ['junit', { outputFile: 'test-results-auth/results.xml' }]
  ],
  use: {
    baseURL: '$BASE_URL',
    trace: 'on-first-retry',
    video: '$VIDEO' ? 'on-first-retry' : 'off',
    screenshot: '$SCREENSHOT' ? 'only-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'echo "Using external server at $BASE_URL"',
    url: '$BASE_URL',
    reuseExistingServer: true,
  },
});
EOF
  
  log_success "Playwright configuration created"
}

# Run authentication tests
run_tests() {
  log "Running authentication E2E tests..."
  
  # Set test timeout and other options
  export PLAYWRIGHT_TEST_TIMEOUT=60000
  export PLAYWRIGHT_TEST_HEADLESS=$([ "$HEADED" = true ] && echo "false" || echo "true")
  
  # Run tests with proper configuration
  if [ "$DEBUG" = true ]; then
    export DEBUG=pw:api
    export PLAYWRIGHT_TEST_DEBUG=1
  fi
  
  # Run the tests
  npx playwright test --config=playwright.auth.config.ts
  
  if [ $? -eq 0 ]; then
    log_success "All authentication tests passed!"
  else
    log_error "Some authentication tests failed"
    exit 1
  fi
}

# Generate reports
generate_reports() {
  if [ "$REPORT" = true ]; then
    log "Generating test reports..."
    
    # Generate HTML report
    npx playwright show-report playwright-report-auth
    
    # Show summary
    echo ""
    log "Test Results Summary:"
    echo "===================="
    
    if [ -f "test-results-auth/results.json" ]; then
      echo "Detailed results: test-results-auth/results.json"
    fi
    
    if [ -f "test-results-auth/results.xml" ]; then
      echo "JUnit results: test-results-auth/results.xml"
    fi
    
    echo "HTML report: playwright-report-auth/index.html"
  fi
}

# Cleanup
cleanup() {
  log "Cleaning up..."
  
  # Remove temporary config
  rm -f playwright.auth.config.ts
  
  log_success "Cleanup completed"
}

# Main execution
main() {
  echo ""
  echo "🚀 APIQ Authentication E2E Test Runner"
  echo "======================================"
  echo ""
  
  log "Configuration:"
  echo "  Base URL: $BASE_URL"
  echo "  Environment: $NODE_ENV"
  echo "  Headed: $HEADED"
  echo "  Debug: $DEBUG"
  echo "  Parallel: $PARALLEL"
  echo "  Report: $REPORT"
  echo "  Video: $VIDEO"
  echo "  Screenshot: $SCREENSHOT"
  echo ""
  
  check_prerequisites
  check_application
  build_config
  
  # Set trap for cleanup
  trap cleanup EXIT
  
  run_tests
  generate_reports
  
  echo ""
  log_success "Authentication E2E test run completed successfully!"
  echo ""
}

# Run main function
main "$@"

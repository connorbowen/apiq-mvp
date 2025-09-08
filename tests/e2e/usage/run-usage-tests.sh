#!/bin/bash

# Usage Tracking E2E Test Runner
# 
# This script runs comprehensive E2E tests for usage tracking, billing, and analytics functionality.
# Follows user-rules.md requirements for real data testing and UX compliance.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
DEBUG=false
HEADED=false
REPORT=false
VIDEO=false
SCREENSHOT=false
PARALLEL=false
SPECIFIC_TEST=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --debug)
      DEBUG=true
      shift
      ;;
    --headed)
      HEADED=true
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
    --parallel)
      PARALLEL=true
      shift
      ;;
    --test)
      SPECIFIC_TEST="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --debug          Run in debug mode with detailed output"
      echo "  --headed         Run with visible browser (headed mode)"
      echo "  --report         Generate detailed test report"
      echo "  --video          Record video of test execution"
      echo "  --screenshot     Take screenshots on failure"
      echo "  --parallel       Run tests in parallel"
      echo "  --test TEST_NAME Run specific test file"
      echo "  --help           Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                    # Run all usage tests"
      echo "  $0 --debug --headed                  # Run with debug and visible browser"
      echo "  $0 --test usage-dashboard.test.ts    # Run specific test file"
      echo "  $0 --report --video --screenshot     # Run with full reporting"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Build Playwright command
PLAYWRIGHT_CMD="npx playwright test tests/e2e/usage/"

# Add specific test if provided
if [ -n "$SPECIFIC_TEST" ]; then
  PLAYWRIGHT_CMD+="$SPECIFIC_TEST"
else
  PLAYWRIGHT_CMD+="*.test.ts"
fi

# Add options
if [ "$DEBUG" = true ]; then
  PLAYWRIGHT_CMD+=" --debug"
fi

if [ "$HEADED" = true ]; then
  PLAYWRIGHT_CMD+=" --headed"
fi

if [ "$REPORT" = true ]; then
  PLAYWRIGHT_CMD+=" --reporter=html"
fi

if [ "$VIDEO" = true ]; then
  PLAYWRIGHT_CMD+=" --video=on"
fi

if [ "$SCREENSHOT" = true ]; then
  PLAYWRIGHT_CMD+=" --screenshot=only-on-failure"
fi

if [ "$PARALLEL" = true ]; then
  PLAYWRIGHT_CMD+=" --workers=4"
else
  PLAYWRIGHT_CMD+=" --workers=1"
fi

# Print configuration
echo -e "${BLUE}🚀 Running Usage Tracking E2E Tests${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Debug Mode: $DEBUG"
echo -e "Headed Mode: $HEADED"
echo -e "Generate Report: $REPORT"
echo -e "Record Video: $VIDEO"
echo -e "Take Screenshots: $SCREENSHOT"
echo -e "Parallel Execution: $PARALLEL"
if [ -n "$SPECIFIC_TEST" ]; then
  echo -e "Specific Test: $SPECIFIC_TEST"
fi
echo ""

# Check if tests exist
if [ -n "$SPECIFIC_TEST" ]; then
  TEST_FILE="tests/e2e/usage/$SPECIFIC_TEST"
  if [ ! -f "$TEST_FILE" ]; then
    echo -e "${RED}❌ Test file not found: $TEST_FILE${NC}"
    exit 1
  fi
fi

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ npx not found. Please install Node.js and npm.${NC}"
  exit 1
fi

# Check if Playwright is installed
if ! npx playwright --version &> /dev/null; then
  echo -e "${YELLOW}⚠️  Playwright not found. Installing...${NC}"
  npm install @playwright/test
  npx playwright install
fi

# Run pre-test checks
echo -e "${BLUE}🔍 Running pre-test checks...${NC}"

# Check if database is running
if ! pg_isready -q; then
  echo -e "${RED}❌ Database is not running. Please start your database.${NC}"
  exit 1
fi

# Check if application is running
if ! curl -s http://localhost:3000/api/health > /dev/null; then
  echo -e "${RED}❌ Application is not running. Please start your application.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Pre-test checks passed${NC}"
echo ""

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"
echo -e "Command: $PLAYWRIGHT_CMD"
echo ""

# Execute the command
if eval $PLAYWRIGHT_CMD; then
  echo ""
  echo -e "${GREEN}✅ All tests passed!${NC}"
  
  if [ "$REPORT" = true ]; then
    echo -e "${BLUE}📊 Test report generated: playwright-report/index.html${NC}"
  fi
  
  exit 0
else
  echo ""
  echo -e "${RED}❌ Some tests failed${NC}"
  
  if [ "$REPORT" = true ]; then
    echo -e "${BLUE}📊 Test report generated: playwright-report/index.html${NC}"
  fi
  
  exit 1
fi

#!/bin/bash

# Auth E2E Test Consolidation Migration Script
# This script helps migrate from separate auth test files to a consolidated approach

set -e

echo "🔧 Auth E2E Test Consolidation Migration"
echo "========================================"

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
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if the new consolidated test file exists
if [ ! -f "tests/e2e/auth/auth-comprehensive.test.ts" ]; then
    print_error "Consolidated test file not found. Please create it first."
    exit 1
fi

print_status "Starting auth test consolidation migration..."

# Step 1: Backup original test files
print_status "Creating backups of original test files..."
mkdir -p tests/e2e/auth/backup-$(date +%Y%m%d-%H%M%S)
cp tests/e2e/auth/authentication-session.test.ts tests/e2e/auth/backup-$(date +%Y%m%d-%H%M%S)/
cp tests/e2e/auth/oauth2.test.ts tests/e2e/auth/backup-$(date +%Y%m%d-%H%M%S)/
cp tests/e2e/auth/password-reset.test.ts tests/e2e/auth/backup-$(date +%Y%m%d-%H%M%S)/
cp tests/e2e/auth/registration-verification.test.ts tests/e2e/auth/backup-$(date +%Y%m%d-%H%M%S)/
print_success "Backups created in tests/e2e/auth/backup-$(date +%Y%m%d-%H%M%S)/"

# Step 2: Update package.json scripts
print_status "Updating package.json scripts..."

# Create a temporary file for the updated package.json
cp package.json package.json.backup

# Update the auth-specific test scripts to use the new consolidated file
sed -i.bak 's|tests/e2e/auth/authentication-session.test.ts tests/e2e/auth/registration-verification.test.ts tests/e2e/auth/password-reset.test.ts tests/e2e/auth/oauth2.test.ts|tests/e2e/auth/auth-comprehensive.test.ts|g' package.json

# Update individual auth test scripts
sed -i.bak 's|tests/e2e/auth/authentication-session.test.ts|tests/e2e/auth/auth-comprehensive.test.ts|g' package.json
sed -i.bak 's|tests/e2e/auth/registration-verification.test.ts|tests/e2e/auth/auth-comprehensive.test.ts|g' package.json
sed -i.bak 's|tests/e2e/auth/password-reset.test.ts|tests/e2e/auth/auth-comprehensive.test.ts|g' package.json
sed -i.bak 's|tests/e2e/auth/oauth2.test.ts|tests/e2e/auth/auth-comprehensive.test.ts|g' package.json

print_success "Package.json scripts updated"

# Step 3: Test the consolidated file
print_status "Testing the consolidated auth test file..."
if npm run test:e2e:auth:authentication-session; then
    print_success "Consolidated auth tests pass!"
else
    print_warning "Consolidated auth tests failed. You may need to fix some issues."
    print_status "You can restore from backup if needed:"
    echo "  cp tests/e2e/auth/backup-$(date +%Y%m%d-%H%M%S)/* tests/e2e/auth/"
    echo "  cp package.json.backup package.json"
fi

# Step 4: Remove old test files (optional)
echo ""
print_warning "Migration completed! Next steps:"
echo ""
echo "1. Verify the consolidated tests work correctly:"
echo "   npm run test:e2e:auth:authentication-session"
echo ""
echo "2. If everything works, you can remove the old test files:"
echo "   rm tests/e2e/auth/authentication-session.test.ts"
echo "   rm tests/e2e/auth/oauth2.test.ts"
echo "   rm tests/e2e/auth/password-reset.test.ts"
echo "   rm tests/e2e/auth/registration-verification.test.ts"
echo ""
echo "3. If you need to rollback:"
echo "   cp tests/e2e/auth/backup-$(date +%Y%m%d-%H%M%S)/* tests/e2e/auth/"
echo "   cp package.json.backup package.json"
echo ""
echo "4. Update your CI/CD pipelines to use the new consolidated test file"
echo ""
print_success "Migration script completed!"
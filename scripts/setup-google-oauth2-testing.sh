#!/bin/bash

# Google OAuth2 E2E Testing Setup Script
# This script helps set up Google OAuth2 for end-to-end testing

set -e

echo "🔧 Setting up Google OAuth2 for E2E Testing"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
    print_warning ".env.test file not found. Creating from env.example..."
    cp env.example .env.test
    print_success "Created .env.test from env.example"
fi

print_step "Step 1: Google Cloud Console Setup"
echo "1. Go to https://console.cloud.google.com/"
echo "2. Create a new project or select an existing one"
echo "3. Enable the Google+ API and Google People API"
echo "4. Go to 'APIs & Services' > 'Credentials'"
echo "5. Click 'Create Credentials' > 'OAuth client ID'"
echo "6. Choose 'Web application'"
echo "7. Set authorized redirect URIs:"
echo "   - http://localhost:3000/api/auth/sso/callback"
echo "   - http://localhost:3000/oauth/callback"
echo "8. Save and copy the Client ID and Client Secret"
echo ""

print_step "Step 2: OAuth Consent Screen Configuration"
echo "1. Go to 'APIs & Services' > 'OAuth consent screen'"
echo "2. Set app to 'Testing' mode"
echo "3. Add your test Google account(s) as 'Test Users'"
echo "4. Set app name: 'APIQ E2E Testing'"
echo "5. Set user support email"
echo "6. Set developer contact information"
echo ""

print_step "Step 3: Environment Configuration"
echo "Add the following to your .env.test file:"
echo ""
echo "# Google OAuth2 Configuration for E2E Testing"
echo "GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com"
echo "GOOGLE_CLIENT_SECRET=your-client-secret"
echo "OAUTH2_REDIRECT_URI=http://localhost:3000/api/auth/sso/callback"
echo ""
echo "# Test Google Account (for automated E2E testing)"
echo "TEST_GOOGLE_EMAIL=your-test-email@gmail.com"
echo "TEST_GOOGLE_PASSWORD=your-test-password"
echo ""

print_step "Step 4: Test Account Setup"
echo "1. Create a dedicated Google account for testing"
echo "2. Disable 2FA for this account (for automated testing)"
echo "3. Enable 'Less secure app access' if needed"
echo "4. Add this account as a test user in OAuth consent screen"
echo ""

print_step "Step 5: Validation"
echo "To test your setup:"
echo "1. Start your development server: npm run dev"
echo "2. Go to http://localhost:3000/login"
echo "3. Click 'Continue with Google'"
echo "4. Complete the OAuth2 flow with your test account"
echo "5. Verify you're redirected to the dashboard"
echo ""

print_warning "Security Notes:"
echo "- Never commit real OAuth2 credentials to version control"
echo "- Use different credentials for development, testing, and production"
echo "- Regularly rotate test account passwords"
echo "- Consider using Google's OAuth2 testing tools for production"
echo ""

print_step "Step 6: E2E Test Automation (Optional)"
echo "For automated E2E testing, you can:"
echo "1. Use Playwright's browser automation to handle Google login"
echo "2. Store test credentials securely in environment variables"
echo "3. Use headless mode for CI/CD pipelines"
echo "4. Implement proper error handling for OAuth2 failures"
echo ""

print_success "Setup complete! Follow the steps above to configure Google OAuth2 for E2E testing."
echo ""
echo "Next steps:"
echo "1. Complete the Google Cloud Console setup"
echo "2. Update your .env.test file with the credentials"
echo "3. Test the OAuth2 flow manually"
echo "4. Run the E2E tests: npm run test:e2e:auth"
echo ""

# Check if we can help with environment setup
if command -v node &> /dev/null; then
    print_step "Environment Validation"
    echo "Checking current environment configuration..."
    
    if [ -f ".env.test" ]; then
        echo "✅ .env.test file exists"
        
        # Check for Google OAuth2 variables
        if grep -q "GOOGLE_CLIENT_ID" .env.test; then
            print_success "Google OAuth2 variables found in .env.test"
        else
            print_warning "Google OAuth2 variables not found in .env.test"
            echo "Please add them following the instructions above"
        fi
    else
        print_error ".env.test file not found"
    fi
else
    print_warning "Node.js not found. Please install Node.js to run the tests."
fi

echo ""
print_success "Setup script completed! 🎉" 
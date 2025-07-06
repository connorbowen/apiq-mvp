#!/bin/bash

# E2E Test SMTP Setup Script
# This script helps set up SMTP configuration for E2E tests
# E2E tests require real email services according to the "No Mock Data Policy"

echo "🚀 Setting up SMTP configuration for E2E tests..."
echo ""
echo "📧 E2E tests require real email services (no mocking allowed)"
echo "   You have several options for SMTP configuration:"
echo ""

echo "Option 1: Gmail SMTP (Recommended for testing)"
echo "   - Create a Gmail account for testing"
echo "   - Enable 2-factor authentication"
echo "   - Generate an App Password"
echo "   - Set environment variables:"
echo "     export SMTP_HOST=smtp.gmail.com"
echo "     export SMTP_PORT=587"
echo "     export SMTP_SECURE=false"
echo "     export SMTP_USER=your-test-email@gmail.com"
echo "     export SMTP_PASS=your-gmail-app-password"
echo "     export SMTP_FROM=noreply@apiq.com"
echo ""

echo "Option 2: Mailtrap (Fake SMTP for testing)"
echo "   - Sign up at https://mailtrap.io"
echo "   - Get SMTP credentials from your inbox"
echo "   - Set environment variables:"
echo "     export SMTP_HOST=sandbox.smtp.mailtrap.io"
echo "     export SMTP_PORT=2525"
echo "     export SMTP_SECURE=false"
echo "     export SMTP_USER=your-mailtrap-username"
echo "     export SMTP_PASS=your-mailtrap-password"
echo "     export SMTP_FROM=noreply@apiq.com"
echo ""

echo "Option 3: Your own SMTP server"
echo "   - Use your existing SMTP server"
echo "   - Set the appropriate environment variables"
echo ""

echo "🔧 To set up Gmail SMTP (Option 1):"
echo "1. Go to https://myaccount.google.com/apppasswords"
echo "2. Generate an app password for 'Mail'"
echo "3. Use that password as SMTP_PASS"
echo ""

echo "📝 Example .env.local configuration:"
echo "SMTP_HOST=smtp.gmail.com"
echo "SMTP_PORT=587"
echo "SMTP_SECURE=false"
echo "SMTP_USER=your-test-email@gmail.com"
echo "SMTP_PASS=your-gmail-app-password"
echo "SMTP_FROM=noreply@apiq.com"
echo ""

echo "✅ Once configured, run: npm run test:e2e"
echo ""

# Check if SMTP environment variables are set
if [ -z "$SMTP_HOST" ] || [ -z "$SMTP_USER" ] || [ -z "$SMTP_PASS" ]; then
    echo "⚠️  SMTP environment variables not set"
    echo "   Please configure SMTP before running E2E tests"
    exit 1
else
    echo "✅ SMTP environment variables are configured"
    echo "   SMTP_HOST: $SMTP_HOST"
    echo "   SMTP_USER: $SMTP_USER"
    echo "   SMTP_FROM: $SMTP_FROM"
fi 
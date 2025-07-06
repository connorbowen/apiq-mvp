# E2E Test SMTP Setup Guide

## Overview

This guide explains how to set up SMTP configuration for E2E tests in APIQ, following the **"No Mock Data Policy"** that requires all tests to use real services.

## The Issue

The registration-verification E2E tests were failing because:

1. **Email Service Mocking Violated User Rules**: The initial approach tried to mock the email service, which violates the user rules requiring real services in E2E tests.

2. **Missing SMTP Configuration**: E2E tests need real SMTP credentials to send verification emails during registration.

## The Fix

### ✅ **Removed Email Service Mocking**
- Removed test environment bypasses from `emailService.ts`
- Removed test environment variables from `playwright.config.ts`
- Deleted the email mock helper file
- E2E tests now use real email services as required

### ✅ **Added SMTP Configuration Support**
- Added SMTP configuration variables to `env.example`
- Created `scripts/setup-e2e-smtp.sh` to help configure SMTP
- Added `npm run test:e2e:setup-smtp` script

## SMTP Configuration Options

### Option 1: Gmail SMTP (Recommended)
```bash
# Set environment variables
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_SECURE=false
export SMTP_USER=your-test-email@gmail.com
export SMTP_PASS=your-gmail-app-password
export SMTP_FROM=noreply@apiq.com
```

**Setup Steps:**
1. Create a Gmail account for testing
2. Enable 2-factor authentication
3. Generate an App Password at https://myaccount.google.com/apppasswords
4. Use the app password as `SMTP_PASS`

### Option 2: Mailtrap (Fake SMTP for Testing)
```bash
# Set environment variables
export SMTP_HOST=sandbox.smtp.mailtrap.io
export SMTP_PORT=2525
export SMTP_SECURE=false
export SMTP_USER=your-mailtrap-username
export SMTP_PASS=your-mailtrap-password
export SMTP_FROM=noreply@apiq.com
```

**Setup Steps:**
1. Sign up at https://mailtrap.io
2. Get SMTP credentials from your inbox
3. Use those credentials in environment variables

### Option 3: Your Own SMTP Server
Use your existing SMTP server with appropriate environment variables.

## Quick Setup

### 1. Run the Setup Script
```bash
npm run test:e2e:setup-smtp
```

### 2. Configure SMTP
Choose one of the options above and set the environment variables.

### 3. Test the Configuration
```bash
# Test registration-verification specifically
npm run test:e2e -- tests/e2e/auth/registration-verification.test.ts

# Test all E2E tests
npm run test:e2e
```

## Environment File Configuration

Add SMTP configuration to your `.env.local` file:

```bash
# Email Configuration for E2E Tests
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-test-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=noreply@apiq.com
```

## Why This Approach is Correct

### ✅ **Respects User Rules**
- **No Mock Data Policy**: E2E tests use real email services
- **Real Database**: Tests use real PostgreSQL connections
- **Real Authentication**: Tests use real JWT tokens and bcrypt passwords
- **Real API Endpoints**: Tests use real API endpoints with proper authentication

### ✅ **Maintains Test Integrity**
- Tests validate the complete user journey including email sending
- Catches real integration issues with email services
- Ensures email templates and content are correct
- Validates email delivery and verification flows

### ✅ **Follows Best Practices**
- E2E tests should test the complete system
- No mocking of core business logic
- Real external service integration
- Proper error handling and edge cases

## Troubleshooting

### Email Service Fails
If you see `EMAIL_SEND_FAILED` errors:

1. **Check SMTP Configuration**: Verify all environment variables are set
2. **Test SMTP Connection**: Use a simple SMTP test script
3. **Check Firewall**: Ensure port 587/465 is not blocked
4. **Verify Credentials**: Double-check username/password

### Gmail App Password Issues
- Ensure 2-factor authentication is enabled
- Generate a new app password specifically for "Mail"
- Use the 16-character app password (not your regular password)

### Mailtrap Issues
- Check that your Mailtrap inbox is active
- Verify SMTP credentials are current
- Check that emails are being received in Mailtrap

## Next Steps

1. **Configure SMTP**: Set up one of the SMTP options above
2. **Run Tests**: Execute E2E tests to verify email functionality
3. **Monitor Results**: Check that registration flows work end-to-end
4. **Update CI/CD**: Configure SMTP for automated testing

## Conclusion

This approach correctly follows the user rules by:
- Using real email services in E2E tests
- Not mocking core business logic
- Maintaining test integrity and coverage
- Providing clear setup instructions

The registration-verification tests will now properly validate the complete user journey including email verification, which is essential for a production-ready application. 
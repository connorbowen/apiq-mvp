# Google OAuth2 E2E Testing Setup Guide

This guide provides comprehensive instructions for setting up Google OAuth2 for end-to-end testing in the APIQ MVP project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Console Setup](#google-cloud-console-setup)
3. [OAuth2 Consent Screen Configuration](#oauth2-consent-screen-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Test Account Setup](#test-account-setup)
6. [Automated E2E Testing](#automated-e2e-testing)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

## Prerequisites

- Google account with access to Google Cloud Console
- Node.js and npm installed
- APIQ MVP project cloned and dependencies installed
- Basic understanding of OAuth2 flow

## Google Cloud Console Setup

### Step 1: Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note the Project ID for later use

### Step 2: Enable Required APIs

1. Navigate to **APIs & Services > Library**
2. Search for and enable the following APIs:
   - **Google+ API** (for legacy support)
   - **Google People API** (for profile/email scopes)
   - **OAuth2 API** (should be enabled by default)

### Step 3: Create OAuth2 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials" > "OAuth client ID"**
3. Choose **"Web application"** as the application type
4. Set a descriptive name (e.g., "APIQ E2E Testing")
5. Add the following **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/sso/callback
   http://localhost:3000/oauth/callback
   ```
6. Click **"Create"**
7. **Save the Client ID and Client Secret** - you'll need these for environment configuration

## OAuth2 Consent Screen Configuration

### Step 1: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **"External"** user type (unless you have a Google Workspace domain)
3. Fill in the required information:
   - **App name**: "APIQ E2E Testing"
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **"Save and Continue"**

### Step 2: Add Scopes

1. Click **"Add or Remove Scopes"**
2. Add the following scopes:
   - `openid`
   - `email`
   - `profile`
3. Click **"Save and Continue"**

### Step 3: Add Test Users

1. Set the app to **"Testing"** mode
2. Add your test Google account(s) as **"Test Users"**
3. Click **"Save and Continue"**
4. Review and click **"Back to Dashboard"**

## Environment Configuration

### Step 1: Create Environment File

If you don't have a `.env.test` file, create one from the example:

```bash
cp env.example .env.test
```

### Step 2: Add Google OAuth2 Configuration

Add the following variables to your `.env.test` file:

```bash
# Google OAuth2 Configuration for E2E Testing
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
OAUTH2_REDIRECT_URI=http://localhost:3000/api/auth/sso/callback

# Test Google Account (for automated E2E testing)
TEST_GOOGLE_EMAIL=your-test-email@gmail.com
TEST_GOOGLE_PASSWORD=your-test-password
```

### Step 3: Verify Configuration

Run the setup script to validate your configuration:

```bash
./scripts/setup-google-oauth2-testing.sh
```

## Test Account Setup

### Step 1: Create Test Google Account

1. Create a dedicated Google account for testing
2. Use a strong, unique password
3. **Important**: This account should be separate from your personal Google account

### Step 2: Configure Test Account Security

For automated E2E testing, you may need to:

1. **Disable 2FA** for this account (temporarily)
2. **Enable "Less secure app access"** if needed
3. **Add the account as a test user** in the OAuth consent screen

### Step 3: Test Manual OAuth2 Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000/login`

3. Click "Continue with Google"

4. Complete the OAuth2 flow with your test account

5. Verify you're redirected to the dashboard

## Automated E2E Testing

### Step 1: Run Basic OAuth2 Tests

```bash
# Run the basic OAuth2 tests (without automation)
npm run test:e2e:auth

# Run specific OAuth2 tests
npm run test:e2e:headed -- tests/e2e/auth/oauth2.test.ts
```

### Step 2: Run Automated OAuth2 Tests

```bash
# Run automated OAuth2 tests (requires test credentials)
npm run test:e2e:headed -- tests/e2e/auth/oauth2.test.ts
```

### Step 3: CI/CD Configuration

For CI/CD pipelines, add the following environment variables:

```yaml
# Example GitHub Actions configuration
env:
  GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
  GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
  TEST_GOOGLE_EMAIL: ${{ secrets.TEST_GOOGLE_EMAIL }}
  TEST_GOOGLE_PASSWORD: ${{ secrets.TEST_GOOGLE_PASSWORD }}
```

## Troubleshooting

### Common Issues

#### 1. "redirect_uri_mismatch" Error

**Problem**: The redirect URI doesn't match what's configured in Google Cloud Console.

**Solution**: 
- Verify the redirect URI in your `.env.test` file matches exactly
- Check that the URI is added to the OAuth2 client configuration
- Ensure no trailing slashes or protocol mismatches

#### 2. "invalid_client" Error

**Problem**: The client ID or secret is incorrect.

**Solution**:
- Verify the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your environment
- Check that the credentials are for the correct project
- Ensure the OAuth2 client is configured for web applications

#### 3. "access_denied" Error

**Problem**: The test user is not authorized to access the app.

**Solution**:
- Add the test Google account as a test user in the OAuth consent screen
- Ensure the app is in "Testing" mode
- Check that the test account is not blocked

#### 4. Automated Login Fails

**Problem**: Playwright can't complete the Google login form.

**Solution**:
- Verify `TEST_GOOGLE_EMAIL` and `TEST_GOOGLE_PASSWORD` are set correctly
- Check that 2FA is disabled for the test account
- Ensure "Less secure app access" is enabled if needed
- Consider using a different test account

### Debug Mode

Run tests in debug mode to see what's happening:

```bash
# Run with debug output
DEBUG=pw:api npm run test:e2e:headed -- tests/e2e/auth/oauth2.test.ts

# Run with browser visible
npm run test:e2e:headed -- tests/e2e/auth/oauth2.test.ts --headed
```

## Security Best Practices

### 1. Credential Management

- **Never commit OAuth2 credentials** to version control
- Use different credentials for development, testing, and production
- Store credentials securely in environment variables or secret management systems
- Regularly rotate test account passwords

### 2. Test Account Security

- Use dedicated test accounts, not personal accounts
- Disable 2FA only temporarily for automated testing
- Use strong, unique passwords for test accounts
- Monitor test account activity regularly

### 3. OAuth2 Configuration

- Use the minimum required scopes
- Set appropriate redirect URIs
- Use "Testing" mode for development
- Regularly review and update OAuth2 settings

### 4. Environment Separation

- Use different OAuth2 clients for different environments
- Separate test data from production data
- Use environment-specific redirect URIs
- Implement proper error handling for OAuth2 failures

## Advanced Configuration

### Custom Scopes

If you need additional scopes, add them to the OAuth2 configuration:

```typescript
// In pages/api/auth/sso/google.ts
authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/userinfo.profile');
```

### Custom Redirect URIs

For different environments, configure multiple redirect URIs:

```
http://localhost:3000/api/auth/sso/callback
http://localhost:3001/api/auth/sso/callback
https://your-test-domain.com/api/auth/sso/callback
```

### Error Handling

The application includes comprehensive error handling for OAuth2 flows:

- Invalid credentials
- Network failures
- User consent denied
- Security challenges
- Token exchange failures

## Support

If you encounter issues not covered in this guide:

1. Check the [Google OAuth2 documentation](https://developers.google.com/identity/protocols/oauth2)
2. Review the [Playwright documentation](https://playwright.dev/) for browser automation
3. Check the project's issue tracker for known problems
4. Contact the development team for assistance

## Quick Setup Checklist

- [ ] Google Cloud project created
- [ ] Required APIs enabled
- [ ] OAuth2 credentials created
- [ ] OAuth consent screen configured
- [ ] Test users added
- [ ] Environment variables configured
- [ ] Test account created and configured
- [ ] Manual OAuth2 flow tested
- [ ] Automated E2E tests passing
- [ ] Security measures implemented 
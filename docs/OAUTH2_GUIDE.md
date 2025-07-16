# OAuth2 Setup & Integration Guide

## Overview

This comprehensive guide covers all aspects of OAuth2 integration in the APIQ platform, including setup, testing, frontend integration, and troubleshooting. The platform supports both user authentication OAuth2 (SSO) and API connection OAuth2 flows.

## Table of Contents

1. [OAuth2 Architecture](#oauth2-architecture)
2. [User Authentication OAuth2 (SSO)](#user-authentication-oauth2-sso)
3. [API Connection OAuth2](#api-connection-oauth2)
4. [Provider Setup](#provider-setup)
5. [Testing & E2E Testing](#testing--e2e-testing)
6. [Frontend Integration](#frontend-integration)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

## OAuth2 Architecture

### Two Distinct OAuth2 Flows

APIQ implements two separate OAuth2 flows to avoid confusion and provide clear separation of concerns:

#### 1. User Authentication OAuth2 (SSO)
- **Purpose**: User login and authentication
- **Path**: `/api/auth/sso/`
- **Use Case**: Google sign-in for user accounts
- **Files**: 
  - `pages/api/auth/sso/google.ts` - Google SSO OAuth2 handler
  - `pages/api/auth/sso/callback.ts` - Google SSO OAuth2 callback

#### 2. API Connection OAuth2
- **Purpose**: Third-party API connections
- **Path**: `/api/connections/oauth2/`
- **Use Case**: Connecting to GitHub, Slack, Google APIs for workflow automation
- **Files**:
  - `pages/api/connections/oauth2/authorize.ts` - API connection OAuth2 authorization
  - `pages/api/connections/oauth2/callback.ts` - API connection OAuth2 callback
  - `pages/api/connections/oauth2/token.ts` - API connection OAuth2 token retrieval
  - `pages/api/connections/oauth2/refresh.ts` - API connection OAuth2 token refresh
  - `pages/api/connections/oauth2/providers.ts` - API connection OAuth2 providers

### Benefits of This Architecture

1. **Clear Separation**: No confusion between user login and API connections
2. **Intuitive Naming**: Developers immediately understand the purpose of each endpoint
3. **Scalable Structure**: Easy to add more SSO providers or API connections
4. **Maintained Functionality**: All existing OAuth2 functionality preserved

## User Authentication OAuth2 (SSO)

### Google SSO Setup

#### 1. Google Cloud Console Setup

1. **Create or Select a Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Note the Project ID for later use

2. **Enable Required APIs**
   - Navigate to **APIs & Services > Library**
   - Search for and enable the following APIs:
     - **Google+ API** (for legacy support)
     - **Google People API** (for profile/email scopes)
     - **OAuth2 API** (should be enabled by default)

3. **Create OAuth2 Credentials**
   - Go to **APIs & Services > Credentials**
   - Click **"Create Credentials" > "OAuth client ID"**
   - Choose **"Web application"** as the application type
   - Set a descriptive name (e.g., "APIQ SSO")
   - Add the following **Authorized redirect URIs**:
     ```
     http://localhost:3000/api/auth/sso/callback
     ```
   - Click **"Create"**
   - **Save the Client ID and Client Secret**

#### 2. OAuth Consent Screen Configuration

1. **Configure OAuth Consent Screen**
   - Go to **APIs & Services > OAuth consent screen**
   - Choose **"External"** user type (unless you have a Google Workspace domain)
   - Fill in the required information:
     - **App name**: "APIQ SSO"
     - **User support email**: Your email address
     - **Developer contact information**: Your email address
   - Click **"Save and Continue"**

2. **Add Scopes**
   - Click **"Add or Remove Scopes"**
   - Add the following scopes:
     - `openid`
     - `email`
     - `profile`
   - Click **"Save and Continue"**

3. **Add Test Users**
   - Set the app to **"Testing"** mode
   - Add your test Google account(s) as **"Test Users"**
   - Click **"Save and Continue"**
   - Review and click **"Back to Dashboard"**

#### 3. Environment Configuration

Add the following variables to your `.env` file:

```bash
# Google SSO Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## API Connection OAuth2

### Supported Providers

Currently supported OAuth2 providers for API connections:
- **Google** - Gmail, Google Calendar, Google Drive
- **GitHub** - Repository access, issue management
- **Slack** - Team communication, webhooks

### Provider Setup

#### Google API Connection Setup

1. **Create Google Cloud Project** (if not already created for SSO)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing project
   - Enable the Google+ API and Google Calendar API

2. **Create OAuth2 Credentials for API Connections**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Configure OAuth consent screen:
     - **User Type**: External
     - **App name**: `APIQ API Connections`
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Create OAuth 2.0 Client ID:
     - **Application type**: Web application
     - **Name**: `APIQ API Connections`
     - **Authorized redirect URIs**: `http://localhost:3000/api/connections/oauth2/callback`
   - Note your **Client ID** and **Client Secret**

#### GitHub OAuth2 Setup

1. **Create GitHub OAuth App**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Configure the OAuth App:
     - **Application name**: `APIQ API Connections`
     - **Homepage URL**: `http://localhost:3000`
     - **Authorization callback URL**: `http://localhost:3000/api/connections/oauth2/callback`
   - Note your **Client ID** and **Client Secret**

#### Slack OAuth2 Setup

1. **Create Slack App**
   - Go to [Slack API Apps](https://api.slack.com/apps)
   - Click "Create New App"
   - Choose "From scratch"
   - Configure the app:
     - **App Name**: `APIQ API Connections`
     - **Workspace**: Select your workspace
   - Go to "OAuth & Permissions"
   - Add redirect URL: `http://localhost:3000/api/connections/oauth2/callback`
   - Note your **Client ID** and **Client Secret**

### Environment Configuration

Add to your `.env` file:

```bash
# OAuth2 Configuration for API Connections
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"

# OAuth2 Redirect URLs
OAUTH2_REDIRECT_URI="http://localhost:3000/api/connections/oauth2/callback"
```

## Testing & E2E Testing

### Manual OAuth2 Flow Testing

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test SSO Flow**:
   - Go to `http://localhost:3000/login`
   - Click "Continue with Google"
   - Complete the OAuth2 flow with your test account
   - Verify you're redirected to the dashboard

3. **Test API Connection Flow**:
   - Go to `http://localhost:3000/connections`
   - Click "Add Connection" > "Google"
   - Complete the OAuth2 flow
   - Verify the connection is established

### Automated E2E Testing

#### Test Account Setup

1. **Create Test Google Account**
   - Create a dedicated Google account for testing
   - Use a strong, unique password
   - **Important**: This account should be separate from your personal Google account

2. **Configure Test Account Security**
   - **Disable 2FA** for this account (temporarily)
   - **Enable "Less secure app access"** if needed
   - **Add the account as a test user** in the OAuth consent screen

3. **Environment Configuration for E2E**
   ```bash
   # Add to .env.test
   TEST_GOOGLE_EMAIL=your-test-email@gmail.com
   TEST_GOOGLE_PASSWORD=your-test-password
   ```

#### Running E2E Tests

```bash
# Run basic OAuth2 tests (without automation)
npm run test:e2e:auth

# Run specific OAuth2 tests
npm run test:e2e:headed -- tests/e2e/auth/oauth2.test.ts

# Run automated OAuth2 tests (requires test credentials)
npm run test:e2e:headed -- tests/e2e/auth/oauth2.test.ts
```

### Integration Testing

```bash
# Test all OAuth2 providers
npm test -- tests/integration/api/oauth2-*.test.ts

# Test Google OAuth2 specifically
npm test -- tests/integration/api/oauth2-google.test.ts

# Test GitHub OAuth2 specifically
npm test -- tests/integration/api/oauth2-github.test.ts

# Test Slack OAuth2 specifically
npm test -- tests/integration/api/oauth2-slack.test.ts
```

## Frontend Integration

### SSO Integration

The login page integrates with Google SSO:

```typescript
// src/app/login/page.tsx
const handleGoogleLogin = () => {
  window.location.href = '/api/auth/sso/google?provider=google';
};
```

### API Connection Integration

The OAuth2Manager component handles API connection OAuth2 flows:

```typescript
// src/components/OAuth2Manager.tsx
const initiateOAuth2Flow = async (provider: string, connectionId: string) => {
  const response = await fetch(`/api/connections/oauth2/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, connectionId })
  });
  
  const { authorizationUrl } = await response.json();
  window.location.href = authorizationUrl;
};
```

### API Client Integration

The API client has been updated to use the new OAuth2 endpoints:

```typescript
// src/lib/api/client.ts
export const oauth2Api = {
  // API Connection OAuth2
  getProviders: () => api.get('/connections/oauth2/providers'),
  authorize: (data: OAuth2AuthorizeRequest) => 
    api.post('/connections/oauth2/authorize', data),
  callback: (params: URLSearchParams) => 
    api.get(`/connections/oauth2/callback?${params.toString()}`),
  
  // SSO OAuth2
  ssoGoogle: () => api.get('/auth/sso/google?provider=google')
};
```

## Troubleshooting

### Common Issues

#### 1. "redirect_uri_mismatch" Error

**Problem**: The redirect URI doesn't match what's configured in the OAuth2 provider.

**Solution**: 
- Verify the redirect URI in your environment variables matches exactly
- Check that the URI is added to the OAuth2 client configuration
- Ensure no trailing slashes or protocol mismatches

#### 2. "invalid_client" Error

**Problem**: The client ID or secret is incorrect.

**Solution**:
- Verify the client credentials in your environment variables
- Check that the credentials are for the correct project
- Ensure the OAuth2 client is configured for web applications

#### 3. "access_denied" Error

**Problem**: The test user is not authorized to access the app.

**Solution**:
- Add the test account as a test user in the OAuth consent screen
- Ensure the app is in "Testing" mode
- Check that the test account is not blocked

#### 4. Automated Login Fails

**Problem**: Playwright can't complete the Google login form.

**Solution**:
- Verify test credentials are set correctly
- Check that 2FA is disabled for the test account
- Ensure "Less secure app access" is enabled if needed
- Consider using a different test account

### Debug Mode

Enable debug logging for OAuth2 flows:

```bash
# Add to .env
LOG_LEVEL=debug
OAUTH2_DEBUG=true
```

Run tests in debug mode:

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
- Implement proper error handling for rate limit responses

### 4. Scope Limitations

- Request minimal scopes needed for testing
- Use read-only scopes when possible
- Document all required permissions

### 5. Rate Limiting

- Be aware of API rate limits for each provider
- Implement proper error handling for rate limit responses
- Use test environments when available

## Implementation Status

### ✅ Completed

- **Clear separation** between SSO and API connection OAuth2
- **Intuitive naming** that developers understand immediately
- **Scalable structure** for future OAuth2 providers
- **No breaking changes** to existing functionality
- **All endpoints working** correctly
- **Tests passing** (except one unrelated scope issue)
- **Documentation complete** and accurate

### 📁 Archived Files

The following OAuth2 renaming files have been archived for historical reference:
- `docs/archive/oauth2-renaming/oauth2-naming-clarification.md`
- `docs/archive/oauth2-renaming/oauth2-renaming-implementation.md`
- `docs/archive/oauth2-renaming/oauth2-renaming-complete.md`
- `docs/archive/oauth2-renaming/oauth2-renaming-files-updated.md`
- `docs/archive/oauth2-renaming/oauth2-cleanup-summary.md`

## Next Steps

1. Set up real OAuth2 credentials for all supported providers
2. Update environment variables with production credentials
3. Test OAuth2 flows in staging environment
4. Monitor OAuth2 usage and performance in production
5. Add additional OAuth2 providers as needed

## References

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth2 Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Slack OAuth2 Documentation](https://api.slack.com/authentication/oauth-v2)
- [NextAuth.js Documentation](https://next-auth.js.org/) 
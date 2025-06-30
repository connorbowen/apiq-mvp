# OAuth2 Setup Guide for Testing

This guide provides step-by-step instructions for setting up real OAuth2 credentials for GitHub, Google, and Slack to enable end-to-end testing of OAuth2 flows.

## Prerequisites

- GitHub account
- Google Cloud Console access
- Slack workspace with admin permissions
- Local development environment running

## GitHub OAuth2 Setup

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: `APIQ MVP Test`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/oauth/callback`
4. Click "Register application"
5. Note your **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Add to your `.env` file:
```bash
# GitHub OAuth2 Configuration
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### 3. Test GitHub OAuth2 Flow

```bash
# Run GitHub OAuth2 tests with real credentials
npm test -- tests/integration/api/oauth2-github.test.ts
```

## Google OAuth2 Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google+ API and Google Calendar API

### 2. Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure OAuth consent screen:
   - **User Type**: External
   - **App name**: `APIQ MVP Test`
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Create OAuth 2.0 Client ID:
   - **Application type**: Web application
   - **Name**: `APIQ MVP Test`
   - **Authorized redirect URIs**: `http://localhost:3000/api/oauth/callback`
5. Note your **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add to your `.env` file:
```bash
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 4. Test Google OAuth2 Flow

```bash
# Run Google OAuth2 tests with real credentials
npm test -- tests/integration/api/oauth2-google.test.ts
```

## Slack OAuth2 Setup

### 1. Create Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" > "From scratch"
3. Fill in app details:
   - **App Name**: `APIQ MVP Test`
   - **Workspace**: Select your workspace
4. Click "Create App"

### 2. Configure OAuth2 Settings

1. Go to "OAuth & Permissions" in the sidebar
2. Add redirect URL: `http://localhost:3000/api/oauth/callback`
3. Add required scopes:
   - `channels:read`
   - `chat:write`
   - `users:read`
4. Note your **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add to your `.env` file:
```bash
# Slack OAuth2 Configuration
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
```

### 4. Test Slack OAuth2 Flow

```bash
# Run Slack OAuth2 tests with real credentials
npm test -- tests/integration/api/oauth2-slack.test.ts
```

## Environment Configuration

### Complete OAuth2 Environment Setup

Add these variables to your `.env` file:

```bash
# OAuth2 Configuration for Testing
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"

# OAuth2 Redirect URLs
OAUTH2_REDIRECT_URI="http://localhost:3000/api/oauth/callback"
```

## Testing with Real Credentials

### 1. Update Test Configuration

The test utilities will automatically use real credentials when available:

```typescript
// tests/helpers/oauth2TestUtils.ts
export function createTestOAuth2Config(provider: string = 'github') {
  // Use real credentials if available, fallback to test values
  const configs = {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || 'test-github-client-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test-github-client-secret',
      redirectUri: process.env.OAUTH2_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
      scope: 'repo user'
    },
    // ... other providers
  };
}
```

### 2. Run Full OAuth2 Test Suite

```bash
# Test all OAuth2 providers
npm test -- tests/integration/api/oauth2-*.test.ts

# Test individual providers
npm test -- tests/integration/api/oauth2-github.test.ts
npm test -- tests/integration/api/oauth2-google.test.ts
npm test -- tests/integration/api/oauth2-slack.test.ts
```

### 3. Manual OAuth2 Flow Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to OAuth2 authorization endpoints:
   - GitHub: `http://localhost:3000/api/oauth/authorize?provider=github&apiConnectionId=test`
   - Google: `http://localhost:3000/api/oauth/authorize?provider=google&apiConnectionId=test`
   - Slack: `http://localhost:3000/api/oauth/authorize?provider=slack&apiConnectionId=test`

## Security Considerations

### 1. Credential Management

- Never commit real OAuth2 credentials to version control
- Use environment variables for all sensitive data
- Rotate credentials regularly
- Use test accounts when possible

### 2. Scope Limitations

- Request minimal scopes needed for testing
- Use read-only scopes when possible
- Document all required permissions

### 3. Rate Limiting

- Be aware of API rate limits for each provider
- Implement proper error handling for rate limit responses
- Use test environments when available

## Troubleshooting

### Common Issues

1. **Invalid redirect URI**: Ensure callback URL matches exactly
2. **Scope errors**: Verify requested scopes are approved for your app
3. **Rate limiting**: Implement exponential backoff for retries
4. **Token expiration**: Handle refresh token flows properly

### Debug Mode

Enable debug logging for OAuth2 flows:

```bash
# Add to .env
LOG_LEVEL=debug
OAUTH2_DEBUG=true
```

## Next Steps

1. Set up real OAuth2 credentials for each provider
2. Update environment variables
3. Run comprehensive OAuth2 test suite
4. Implement real OAuth2 flow testing
5. Document any provider-specific requirements

## References

- [GitHub OAuth2 Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Slack OAuth2 Documentation](https://api.slack.com/authentication/oauth-v2) 
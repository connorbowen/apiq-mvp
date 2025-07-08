# OAuth2 Setup Guide for Testing

This guide provides step-by-step instructions for setting up real OAuth2 credentials for Google, GitHub, and Slack to enable end-to-end testing of OAuth2 flows.

> **Note**: Currently, Google, GitHub, and Slack OAuth2 providers are supported. Additional providers can be added as needed.

## Prerequisites

- Google Cloud Console access
- GitHub Developer Settings access
- Slack API Apps access
- Local development environment running

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

## GitHub OAuth2 Setup

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Configure the OAuth App:
   - **Application name**: `APIQ MVP Test`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/oauth/callback`
4. Note your **Client ID** and **Client Secret**

## Slack OAuth2 Setup

### 1. Create Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Configure the app:
   - **App Name**: `APIQ MVP Test`
   - **Workspace**: Select your workspace
5. Go to "OAuth & Permissions"
6. Add redirect URL: `http://localhost:3000/api/oauth/callback`
7. Note your **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add to your `.env` file:
```bash
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth2 Configuration
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Slack OAuth2 Configuration
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
```

### 4. Test OAuth2 Flows

```bash
# Run Google OAuth2 tests with real credentials
npm test -- tests/integration/api/oauth2-google.test.ts

# Run GitHub OAuth2 tests with real credentials
npm test -- tests/integration/api/oauth2-github.test.ts

# Run Slack OAuth2 tests with real credentials
npm test -- tests/integration/api/oauth2-slack.test.ts
```

## Environment Configuration

### Complete OAuth2 Environment Setup

Add these variables to your `.env` file:

```bash
# OAuth2 Configuration for Testing
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
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
export function createTestOAuth2Config(provider: string = 'google') {
  // Use real credentials if available, fallback to test values
  const configs = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'test-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret',
      redirectUri: process.env.OAUTH2_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly'
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || 'test-github-client-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test-github-client-secret',
      redirectUri: process.env.OAUTH2_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
      scope: 'repo user'
    },
    slack: {
      clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
      clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
      redirectUri: process.env.OAUTH2_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
      scope: 'chat:write channels:read users:read'
    }
  };
}
```

### 2. Run Full OAuth2 Test Suite

```bash
# Test all OAuth2 providers
npm test -- tests/integration/api/oauth2-*.test.ts
```

### 3. Manual OAuth2 Flow Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to OAuth2 authorization endpoints:
   - Google: `http://localhost:3000/api/oauth/authorize?provider=google&apiConnectionId=test`
   - GitHub: `http://localhost:3000/api/oauth/authorize?provider=github&apiConnectionId=test`
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

1. Set up real Google OAuth2 credentials
2. Update environment variables
3. Run Google OAuth2 test suite
4. Implement real OAuth2 flow testing
5. Document any provider-specific requirements

## References

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2) 
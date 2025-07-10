# OAuth2 Renaming Testing Plan

## Overview

This document outlines the testing strategy to verify that the OAuth2 renaming changes work correctly and maintain all existing functionality.

## Test Categories

### 1. User Authentication OAuth2 (SSO) Tests

#### 1.1 Google SSO Flow
- **Test**: Verify Google OAuth2 sign-in works with new `/api/auth/sso/` endpoints
- **Steps**:
  1. Navigate to `/login`
  2. Click "Continue with Google" button
  3. Verify redirect to `/api/auth/sso/google?provider=google`
  4. Verify Google OAuth2 authorization URL is generated correctly
  5. Verify callback redirects to `/api/auth/sso/callback`
  6. Verify successful authentication and redirect to dashboard

#### 1.2 SSO Error Handling
- **Test**: Verify error handling for SSO flow
- **Steps**:
  1. Test with invalid Google credentials
  2. Test with missing OAuth2 configuration
  3. Verify appropriate error messages and redirects

### 2. API Connection OAuth2 Tests

#### 2.1 OAuth2 Provider List
- **Test**: Verify OAuth2 providers endpoint works with new path
- **Steps**:
  1. Call `/api/connections/oauth2/providers`
  2. Verify response includes supported providers (GitHub, Google, Slack, etc.)
  3. Verify provider configuration is correct

#### 2.2 OAuth2 Authorization Flow
- **Test**: Verify API connection OAuth2 authorization works
- **Steps**:
  1. Create an API connection with OAuth2 auth type
  2. Configure OAuth2 settings (client ID, secret, etc.)
  3. Initiate OAuth2 flow via `/api/connections/oauth2/authorize`
  4. Verify authorization URL is generated correctly
  5. Verify redirect to OAuth2 provider

#### 2.3 OAuth2 Callback Processing
- **Test**: Verify OAuth2 callback processing works
- **Steps**:
  1. Complete OAuth2 authorization with provider
  2. Verify callback to `/api/connections/oauth2/callback`
  3. Verify token exchange and storage
  4. Verify connection status is updated to "connected"

#### 2.4 Token Management
- **Test**: Verify OAuth2 token operations work
- **Steps**:
  1. Test token retrieval via `/api/connections/oauth2/token`
  2. Test token refresh via `/api/connections/oauth2/refresh`
  3. Verify tokens are properly encrypted and stored

### 3. Frontend Integration Tests

#### 3.1 API Client Methods
- **Test**: Verify all API client OAuth2 methods work with new endpoints
- **Methods to test**:
  - `getOAuth2Providers()`
  - `initiateOAuth2Flow()`
  - `refreshOAuth2Token()`
  - `getOAuth2Token()`

#### 3.2 OAuth2Manager Component
- **Test**: Verify OAuth2Manager component works with new endpoints
- **Steps**:
  1. Load OAuth2Manager on connection page
  2. Verify provider list loads correctly
  3. Test OAuth2 authorization flow
  4. Verify success/error handling

### 4. Backward Compatibility Tests

#### 4.1 Old Endpoint Fallback
- **Test**: Verify old OAuth2 endpoints still work (if needed)
- **Note**: Old files still exist as backups

#### 4.2 Environment Variables
- **Test**: Verify environment variables work with new structure
- **Variables to check**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `OAUTH2_REDIRECT_URI`

## Test Execution Plan

### Phase 1: Unit Tests
1. Run existing OAuth2 unit tests
2. Update test files to use new endpoints
3. Add new tests for SSO-specific functionality

### Phase 2: Integration Tests
1. Test complete OAuth2 flows end-to-end
2. Test error scenarios
3. Test token management

### Phase 3: E2E Tests
1. Test user authentication flow
2. Test API connection OAuth2 flow
3. Test both flows together

## Test Data Requirements

### SSO Test Data
- Valid Google OAuth2 credentials
- Test user accounts
- Invalid credentials for error testing

### API Connection Test Data
- OAuth2-enabled API connections
- Valid OAuth2 provider configurations
- Test OAuth2 providers (GitHub, Google, etc.)

## Success Criteria

### SSO Flow
- ✅ User can sign in with Google OAuth2
- ✅ Proper error handling for failed authentication
- ✅ Correct redirects and token management
- ✅ User session is established correctly

### API Connection OAuth2 Flow
- ✅ OAuth2 providers list loads correctly
- ✅ Authorization flow works for all supported providers
- ✅ Callback processing stores tokens correctly
- ✅ Token refresh works as expected
- ✅ Connection status updates correctly

### General
- ✅ No breaking changes to existing functionality
- ✅ Clear separation between SSO and API connection OAuth2
- ✅ Proper error messages and logging
- ✅ Security measures maintained

## Rollback Plan

If issues are discovered:
1. Keep old OAuth2 files as backups
2. Update API client to use old endpoints
3. Revert frontend changes
4. Test to ensure functionality is restored

## Testing Checklist

- [ ] Google SSO sign-in works
- [ ] SSO error handling works
- [ ] OAuth2 providers endpoint works
- [ ] API connection OAuth2 authorization works
- [ ] OAuth2 callback processing works
- [ ] Token management works
- [ ] Frontend components work with new endpoints
- [ ] No console errors or warnings
- [ ] All existing tests pass
- [ ] Documentation is accurate 
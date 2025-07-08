# APIQ Troubleshooting Guide

This guide covers common issues and their solutions when working with the APIQ project.

## �� Common Issues

### Password Reset Issues

#### Issue: Users can't log in after password reset
**Error**: Login fails after successful password reset completion

**Solution**: This issue has been resolved in the latest version. The password reset flow now properly handles:
- Database transaction management to prevent partial updates
- Proper error handling and logging for debugging
- Token cleanup to prevent database bloat
- Enhanced audit logging for security monitoring

**If you encounter this issue**:
```bash
# Check the latest logs for password reset operations
grep "password_reset" logs/app.log

# Verify the user exists in the database
psql -d apiq -c "SELECT id, email, isActive FROM users WHERE email = 'user@example.com';"

# Check for expired tokens that might be causing issues
psql -d apiq -c "SELECT email, expiresAt FROM password_reset_tokens WHERE expiresAt < NOW();"
```

#### Issue: Password reset tokens not being cleaned up
**Error**: Expired tokens remain in database after use

**Solution**: This has been fixed. Expired tokens are now immediately deleted when accessed:
- Token deletion moved outside transaction to ensure cleanup
- Automatic cleanup prevents database bloat
- Enhanced logging for monitoring token lifecycle

**Verification**:
```bash
# Check for any remaining expired tokens
psql -d apiq -c "SELECT COUNT(*) FROM password_reset_tokens WHERE expiresAt < NOW();"

# Should return 0 if cleanup is working properly
```

#### Issue: Password reset email not received
**Error**: User requests password reset but doesn't receive email

**Solution**:
```bash
# Check email service configuration
grep "SMTP" .env

# Verify email service is running
npm run test:email

# Check email logs for delivery status
grep "Email sent" logs/app.log
```

#### Issue: Password reset form shows "token expired" immediately
**Error**: Form displays expired token error right after clicking reset link

**Solution**: This indicates the token has actually expired. The system now:
- Provides clear error messages about token expiration
- Offers navigation to request a new password reset
- Disables form fields when token is expired
- Maintains security by not allowing expired token usage

**User Action**: Click "Request new password reset" link to get a fresh token.

### Prisma Client Issues

#### Issue: "Unknown argument" errors after schema changes
**Error**: `Unknown argument 'ingestionStatus'. Available options are marked with ?.`

**Solution**:
```bash
# Regenerate Prisma client after schema changes
npx prisma generate

# Clear Next.js cache (if needed)
rm -rf .next

# Restart the development server
npm run dev
```

**Note**: This issue has been resolved. The Prisma client now properly recognizes all schema fields including `ingestionStatus`, `rawSpec`, and `specHash`.

#### Issue: Database connection errors
**Error**: `P1001: Can't reach database server`

**Solution**:
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if not running
brew services start postgresql@15

# Verify database exists
psql -l | grep apiq

# Create database if it doesn't exist
createdb apiq
```

### API Connection Issues

#### Issue: Foreign key constraint error when creating API connections
**Error**: `Foreign key constraint failed on the field: `userId``

**Solution**:
```bash
# Verify database connection
npx tsx scripts/test-db.ts

# Check if users exist
psql -d apiq -c "SELECT id, email, role FROM users LIMIT 5;"
```

#### Issue: OpenAPI parsing fails
**Error**: Network timeout or parsing errors

**Solution**:
- Check if the OpenAPI spec URL is accessible
- Verify the spec is valid JSON/YAML
- Check network connectivity
- Try with a different OpenAPI spec (e.g., Petstore)

#### Issue: Endpoint extraction fails for large OpenAPI specs
**Error**: Large specs like GitHub API may not extract endpoints

**Solution**:
- Large OpenAPI specs may timeout during endpoint extraction
- The spec parsing will still succeed, but endpoint extraction may be limited
- Try with smaller specs first (e.g., Petstore API)
- Check logs for specific error messages

### Development Server Issues

#### Issue: Next.js server not picking up changes
**Solution**:
```bash
# Stop the server (Ctrl+C)
# Clear Next.js cache
rm -rf .next

# Restart the server
npm run dev
```

#### Issue: Port 3000 already in use
**Solution**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Restart the development server
npm run dev
```

**Note**: The application is configured to use port 3000 consistently across all environments. If you need to use a different port, update your `.env` file:
```bash
PORT=3001
API_BASE_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
```

## 🔧 Quick Fixes

### Complete Reset (Nuclear Option)
If everything is broken and you want to start fresh:

```bash
# Stop all services
brew services stop postgresql@15

# Remove database
dropdb apiq

# Clear caches
rm -rf .next
rm -rf node_modules/.cache

# Reinstall dependencies
npm install

# Start fresh
npm run startup
```

### Database Reset
```bash
# Reset database and run migrations
npx prisma migrate reset

# Generate client
npx prisma generate

# Verify database connection
npx tsx scripts/test-db.ts
```

### Environment Issues
```bash
# Check if .env exists
ls -la .env

# Create from template if missing
cp env.example .env

# Verify required variables
grep -E "DATABASE_URL|JWT_SECRET|OPENAI_API_KEY" .env
```

## 🧪 Testing & Verification

### Password Reset Testing

#### Verify Password Reset Flow
```bash
# Run password reset E2E tests
npm run test:e2e -- tests/e2e/auth/password-reset.test.ts

# Run password reset integration tests
npm run test:integration -- tests/integration/api/auth/reset-password.integration.test.ts

# Expected results: All tests should pass
# - 23/23 E2E tests passing
# - 13/13 integration tests passing
```

#### Test Password Reset Manually
```bash
# Start the development server
npm run dev

# Navigate to forgot password page
open http://localhost:3000/forgot-password

# Follow the password reset flow
# 1. Enter email address
# 2. Check email for reset link
# 3. Click reset link
# 4. Enter new password
# 5. Verify login works with new password
```

### Jest Configuration Issues

#### Issue: TextEncoder is not defined
**Solution**: The project includes comprehensive polyfills in `jest.polyfill.js`. If you encounter this error:
```bash
# Ensure Jest is using the polyfill configuration
npm test -- --config=jest.config.js

# If issues persist, run with increased memory
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

#### Issue: Jest memory issues or heap out of memory
**Solution**: The project is configured with memory optimization:
```bash
# Run tests with increased memory allocation
NODE_OPTIONS="--max-old-space-size=4096" npm test

# Run with limited workers to reduce memory usage
npm test -- --maxWorkers=2

# Run specific test categories to reduce load
npm test -- --testPathPattern="unit"
npm test -- --testPathPattern="integration"
```

#### Issue: ES module import errors in tests
**Solution**: The Jest configuration includes transform patterns for ES modules:
```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests with verbose output to debug import issues
npm test -- --verbose
```

### Test Reliability Issues

#### Issue: Component tests failing with text matching errors
**Error**: `Unable to find an element with the text: Test API Key. This could be because the text is broken up by multiple elements.`

**Solution**:
```typescript
// Use robust text matching for split elements
expect(screen.getAllByText(/Test API Key/i, { exact: false }).length).toBeGreaterThan(0);

// Or use card-based assertions for filtering tests
const cards = screen.getAllByTestId('secret-card');
expect(cards.some(card => within(card).getByTestId('secret-name-secret-1'))).toBe(true);
```

#### Issue: Type comparison failures in component tests
**Error**: Tests expecting uppercase types but receiving lowercase

**Solution**:
```typescript
// Use case-insensitive type comparison
expect(secret.type?.toUpperCase() === 'API_KEY').toBe(true);

// Update mock data to use uppercase types
const mockSecrets = [
  {
    id: 'secret-1',
    name: 'Test API Key',
    type: 'API_KEY', // Uppercase to match UI expectations
    description: 'A test API key'
  }
];
```

#### Issue: Named export mocking failures
**Error**: `Cannot read property 'default' of undefined` when mocking components

**Solution**:
```typescript
// Use named export mocking for named exports
jest.mock('../../../src/components/ui/SecretTypeSelect', () => ({
  SecretTypeSelect: jest.fn(({ selected, onChange, disabled }) => (
    <select 
      data-testid="secret-type-select"
      value={selected} 
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="API_KEY">API Key</option>
      <option value="BEARER_TOKEN">Bearer Token</option>
    </select>
  ))
}));
```

### Health Check Commands
```bash
# Test database connection
npm run db:test

# Test API health endpoint
curl http://localhost:3000/api/health

# Test rate limiting reset (test environment only)
curl -X POST http://localhost:3000/api/test/reset-rate-limits
```

### Rate Limiting Issues

#### Issue: E2E tests failing due to rate limiting
**Error**: Tests fail with 429 status codes or rate limit exceeded errors

**Root Cause**: The rate limiting middleware uses an in-memory store with a limit of 10 requests per 15 minutes. When running multiple E2E tests that create secrets, the rate limit accumulates across tests, causing later tests to fail.

**Solution**: 
1. **Test-only reset endpoint**: Use `/api/test/reset-rate-limits` to clear rate limits before tests
2. **Test isolation**: Reset rate limits in `beforeEach` hooks
3. **Proper retry logic**: Instead of skipping tests, retry requests after rate limit reset

**Implementation**:
```typescript
// In test setup
test.beforeEach(async ({ page, request }) => {
  if (process.env.NODE_ENV === 'test') {
    await request.post('/api/test/reset-rate-limits');
  }
  // ... rest of setup
});

// In individual tests that might hit rate limits
if (response.status() === 429 || secret.error?.includes('Rate limit exceeded')) {
  await page.request.post('/api/test/reset-rate-limits');
  // Retry the request after reset
  const retryResponse = await page.request.post('/api/secrets', {
    // ... retry logic
  });
}
```

**Note**: This approach maintains the rate limiting functionality while ensuring test reliability. The reset endpoint is only available in the test environment.
curl http://localhost:3000/api/health

# Test API connections endpoint
curl http://localhost:3000/api/connections
```

### Endpoint Testing Commands
```bash
# Create a test API connection with OpenAPI spec
curl -X POST http://localhost:3000/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API",
    "baseUrl": "https://api.example.com",
    "documentationUrl": "https://petstore.swagger.io/v2/swagger.json",
    "authType": "NONE"
  }'

# List all endpoints for a connection (replace CONNECTION_ID)
curl http://localhost:3000/api/connections/CONNECTION_ID/endpoints

# Filter endpoints by method
curl "http://localhost:3000/api/connections/CONNECTION_ID/endpoints?method=GET"

# Filter endpoints by path
curl "http://localhost:3000/api/connections/CONNECTION_ID/endpoints?path=/pet"

# Filter endpoints by summary
curl "http://localhost:3000/api/connections/CONNECTION_ID/endpoints?summary=pet"

# Combine multiple filters
curl "http://localhost:3000/api/connections/CONNECTION_ID/endpoints?method=GET&path=/pet"
```

### Verification Checklist
- [ ] PostgreSQL is running (`brew services list | grep postgresql`)
- [ ] Database exists (`psql -l | grep apiq`)
- [ ] .env file exists and has required variables
- [ ] Prisma client is generated (`npx prisma generate`)
- [ ] Database connection test passes (`npx tsx scripts/test-db.ts`)
- [ ] Development server starts without errors (`npm run dev`)
- [ ] Health endpoint responds (`curl http://localhost:3000/api/health`)
- [ ] API connections can be created (`curl -X POST http://localhost:3000/api/connections`)
- [ ] Endpoints can be listed and filtered (see endpoint testing commands above)

## 📊 Debugging Tools

### Prisma Studio
```bash
# Open database GUI
npx prisma studio
```

### Database Queries
```bash
# Connect to database
psql apiq

# List tables
\dt

# Check users
SELECT * FROM users;

# Check API connections
SELECT * FROM api_connections;

# Check endpoints
SELECT * FROM endpoints;

# Check connection with endpoint count
SELECT 
  ac.id, 
  ac.name, 
  ac.ingestion_status,
  COUNT(e.id) as endpoint_count
FROM api_connections ac
LEFT JOIN endpoints e ON ac.id = e."apiConnectionId"
GROUP BY ac.id, ac.name, ac.ingestion_status;
```

### Logs
```bash
# View Next.js logs
npm run dev 2>&1 | tee logs.txt

# View PostgreSQL logs
tail -f /opt/homebrew/var/log/postgresql@15.log
```

## 🚀 Startup Sequence

### Manual Startup
```bash
# 1. Start PostgreSQL
brew services start postgresql@15

# 2. Create database (if needed)
createdb apiq

# 3. Run migrations
npx prisma migrate deploy

# 4. Generate Prisma client
npx prisma generate

# 5. Test database connection
npx tsx scripts/test-db.ts

# 6. Start development server
npm run dev
```

### Debugging & Troubleshooting

- Use `clear-cache.js`, `debug-openapi.js`, and `debug-parser.js` for troubleshooting OpenAPI cache and parsing issues.
- Use `/api/oauth/test.ts` for testing OAuth2 endpoints and flows.
- Improved error handling in endpoint extraction and OAuth2 callback flows. Check logs for detailed error messages.

### E2E Test Issues

#### Issue: "Target page, context or browser has been closed" error
**Error**: `Error: locator.isDisabled: Target page, context or browser has been closed`

**Cause**: Test timeout exceeded, causing Playwright to close the browser context before error handling code can execute

**Solution**: Use context-aware error handling pattern:
```typescript
// Before (problematic):
} catch (error) {
  const isStillLoading = await generateButton.isDisabled(); // ❌ Fails if context closed
  if (isStillLoading) {
    throw new Error('Operation stuck in loading state');
  }
  throw error;
}

// After (fixed):
} catch (error) {
  try {
    const isStillLoading = await generateButton.isDisabled();
    if (isStillLoading) {
      throw new Error('Operation stuck in loading state');
    }
  } catch (contextError) {
    console.log('Page context unavailable during error handling:', contextError.message);
  }
  throw error;
}
```

**Additional fixes**:
1. Increase test timeout for API-heavy tests: `test.setTimeout(60000);`
2. Add form readiness checks: `await expect(chatInput).not.toBeDisabled({ timeout: 5000 });`
3. Clear existing content: `await chatInput.clear();`

#### Issue: E2E tests timing out on API calls
**Error**: `Test timeout of 15000ms exceeded`

**Cause**: API calls taking longer than default test timeout

**Solution**:
```typescript
// Increase timeout for API-heavy tests
test('should complete API operation', async ({ page }) => {
  test.setTimeout(60000); // Increase from default 15s
  
  // Use appropriate timeouts for API responses
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/workflows/generate'),
    { timeout: 30000 }
  );
  
  // ... test implementation
});
```

#### Issue: Tests stuck in loading state
**Error**: Tests fail because forms remain disabled or in loading state

**Cause**: Form validation or API call never completes, leaving UI in loading state

**Solution**:
```typescript
// Ensure form is ready before proceeding
await expect(chatInput).not.toBeDisabled({ timeout: 5000 });

// Clear any existing content that might cause issues
await chatInput.clear();
await chatInput.fill('New test content');

// Wait for loading state to be set after submission
await expect(generateButton).toBeDisabled({ timeout: 10000 });
await expect(generateButton).toHaveText(/Generating/);
```

### E2E Test Best Practices

#### 1. **Timeout Management**
- Use `test.setTimeout(60000)` for API-heavy tests
- Set appropriate timeouts for element interactions: `{ timeout: 10000 }`
- Use longer timeouts for API responses: `{ timeout: 30000 }`

#### 2. **Form Readiness**
- Always check if forms are ready before interaction
- Clear existing content to prevent stale data issues
- Wait for loading states to be set after submission

#### 3. **Error Handling**
- Use context-aware error handling for robust tests
- Check if page context is available before accessing elements
- Provide meaningful error messages for debugging

#### 4. **Test Isolation**
- Use unique test data to prevent conflicts
- Clean up test data after each test
- Use proper test setup and teardown
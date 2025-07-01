# APIQ Troubleshooting Guide

This guide covers common issues and their solutions when working with the APIQ project.

## 🚨 Common Issues

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

### Health Check Commands
```bash
# Test database connection
npm run db:test

# Test API health endpoint
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
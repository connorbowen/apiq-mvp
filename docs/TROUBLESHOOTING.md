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
# Create test user
node scripts/create-test-user.js

# Verify user exists
psql -d apiq -c "SELECT * FROM users WHERE id = 'test-user-123';"
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

# Or use a different port
npm run dev -- -p 3001
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

# Create test user
node scripts/create-test-user.js
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
- [ ] Test user exists (`node scripts/create-test-user.js`)
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

# 5. Create test user
node scripts/create-test-user.js

# 6. Start development server
npm run dev
```

### Automated Startup
```bash
# Use the startup script
npm run startup
```

## ✅ Working Features

The following features are confirmed working:

- ✅ **API Connection Creation**: Create connections with or without OpenAPI specs
- ✅ **OpenAPI Spec Parsing**: Successfully parses and stores OpenAPI specifications
- ✅ **Endpoint Extraction**: Extracts endpoints from OpenAPI specs (tested with Petstore API - 20 endpoints)
- ✅ **Endpoint Listing**: Lists all endpoints for a connection
- ✅ **Endpoint Filtering**: Filter by method, path, and summary
- ✅ **Combined Filtering**: Use multiple filters simultaneously
- ✅ **Error Handling**: Proper error responses and logging
- ✅ **Database Operations**: All CRUD operations working correctly

## 🔄 Known Limitations

- **Large OpenAPI Specs**: Very large specs (like GitHub API) may timeout during endpoint extraction
- **Authentication**: Currently using hardcoded test user until authentication is implemented
- **Rate Limiting**: No rate limiting implemented yet
- **RBAC**: Role-based access control not yet implemented

## 📞 Getting Help

### Before Asking for Help
1. Check this troubleshooting guide
2. Run the verification checklist
3. Check the logs for specific error messages
4. Try the quick fixes above

### Useful Information to Include
- Error message (full text)
- Steps that led to the error
- Environment (OS, Node.js version)
- Database status
- Output of verification commands

### Common Debug Commands
```bash
# System info
node --version
npm --version
psql --version

# Project status
npm list
npx prisma --version

# Database status
psql -d apiq -c "SELECT version();"
``` 
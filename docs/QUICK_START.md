# APIQ Quick Start Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Git

## Current Setup Status

### ✅ Completed Features
- [x] Project scaffolding (Next.js + TypeScript)
- [x] Database schema (PostgreSQL + Prisma)
- [x] Environment configuration and validation
- [x] Database connection testing
- [x] API connection management endpoints (CRUD operations)
- [x] OpenAPI specification parsing and validation
- [x] Endpoint extraction and storage
- [x] Endpoint listing with filtering capabilities
- [x] Error handling and logging system
- [x] Health check endpoints
- [x] Test user creation script
- [x] Automated startup script

### 🔄 In Progress
- [ ] NextAuth.js authentication setup
- [ ] User management system
- [ ] RBAC (Role-Based Access Control)
- [ ] Frontend UI components

### 📋 Planned Features
- [ ] AI-powered workflow orchestration
- [ ] Multi-step API workflow execution
- [ ] Background job queuing
- [ ] Audit logging system
- [ ] E2E testing suite

## Quick Setup Commands

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd apiq-mvp
npm install
```

### 2. Database Setup
```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Create database
createdb apiq
```

### 3. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Update database URL (replace with your username)
sed -i '' 's|DATABASE_URL=./data/apiq.db|DATABASE_URL="postgresql://connorbowen@localhost:5432/apiq"|' .env
```

### 4. Database Migration
```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Create test user
node scripts/create-test-user.js

# Test database connection
npx tsx scripts/test-db.ts
```

### 5. Start Development Server
```bash
npm run dev
```

## 🔄 Development Workflow

### When Making Schema Changes

1. **Update Prisma schema** (`prisma/schema.prisma`)
2. **Create and run migration**
   ```bash
   npx prisma migrate dev --name <migration-name>
   ```
3. **Regenerate Prisma client**
   ```bash
   npx prisma generate
   ```
4. **Clear Next.js cache (if needed)**
   ```bash
   rm -rf .next
   ```
5. **Restart development server**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### Testing API Endpoints

Test API connection creation:
```bash
curl -X POST http://localhost:3000/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Petstore API",
    "baseUrl": "https://petstore.swagger.io/v2",
    "documentationUrl": "https://petstore.swagger.io/v2/swagger.json",
    "authType": "NONE"
  }'
```

List API connections:
```bash
curl http://localhost:3000/api/connections
```

List endpoints for a connection:
```bash
curl http://localhost:3000/api/connections/<connection-id>/endpoints
```

Filter endpoints by method:
```bash
curl "http://localhost:3000/api/connections/<connection-id>/endpoints?method=GET"
```

Filter endpoints by path:
```bash
curl "http://localhost:3000/api/connections/<connection-id>/endpoints?path=/pet"
```

Filter endpoints by summary:
```bash
curl "http://localhost:3000/api/connections/<connection-id>/endpoints?summary=pet"
```

Combine multiple filters:
```bash
curl "http://localhost:3000/api/connections/<connection-id>/endpoints?method=GET&path=/pet"
```

## Current Database Schema

### Tables Created
- `users` - User accounts and authentication
- `api_connections` - External API integrations (with ingestion status tracking)
- `endpoints` - OpenAPI endpoint definitions
- `workflows` - Multi-step workflow definitions
- `workflow_steps` - Individual workflow steps
- `workflow_executions` - Runtime execution tracking
- `execution_logs` - Detailed execution logging
- `audit_logs` - Security and compliance logging
- `api_credentials` - Encrypted credential storage

### Key Relationships
```
users → api_connections (1:many)
users → workflows (1:many)
workflows → workflow_steps (1:many)
api_connections → endpoints (1:many)
```

### New Fields Added
- `api_connections.ingestionStatus` - Tracks OpenAPI spec ingestion progress (PENDING, SUCCEEDED, FAILED)
- `api_connections.rawSpec` - Stores the raw OpenAPI specification
- `api_connections.specHash` - SHA-256 hash for change detection

## Environment Variables

### Required Variables
```bash
DATABASE_URL="postgresql://connorbowen@localhost:5432/apiq"
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=your-openai-api-key
ENCRYPTION_KEY=your-32-character-encryption-key
NEXTAUTH_SECRET=your-nextauth-secret
```

### Generate Secure Keys
```bash
# JWT Secret
openssl rand -base64 32

# Encryption Key  
openssl rand -hex 16

# NextAuth Secret
openssl rand -base64 32
```

## Development Commands

### Database Operations
```bash
# Run migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Test database
npx tsx scripts/test-db.ts

# Create test user
node scripts/create-test-user.js
```

### Application Development
```bash
# Start development server
npm run dev

# Build application
npm run build

# Use automated startup script
npm run startup
```

### Testing
```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run all tests
npm run test:all
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

## 🚨 Troubleshooting

If you encounter issues:

1. **Check the troubleshooting guide**: `docs/TROUBLESHOOTING.md`
2. **Verify database connection**: `npm run db:test`
3. **Check logs**: Look for error messages in the terminal
4. **Reset if needed**: `npm run startup` (automated reset script)

Common issues and solutions are documented in the troubleshooting guide.

## Next Steps

1. **Set up NextAuth.js** for authentication
2. **Create user management** system
3. **Implement RBAC** implementation
4. **Build workflow engine**

## Support

- **Database Issues**: Check `docs/DATABASE_SETUP.md`
- **Project Structure**: Check `docs/ARCHITECTURE.md`
- **Development Guide**: Check `docs/DEVELOPMENT_GUIDE.md`
- **API Reference**: Check `docs/API_REFERENCE.md`

## Running Authentication & Integration Tests

### 1. Authentication Demo Script

You can test the authentication and RBAC system using the provided script:

```bash
# Start the dev server in one terminal
npm run dev

# In another terminal, run the demo script
node scripts/test-auth.js
```

- This script logs in as different users, tests API endpoints, and demonstrates role-based access control.
- Requires Node.js 18+ (for built-in fetch).

### 2. Integration Tests

To run all integration and auth tests:

```bash
npm test
```

To run only the authentication integration tests:

```bash
npm test -- --testPathPattern=auth.test.ts
```

Test users:
- `admin@example.com` / `admin123`
- `user@example.com` / `user123`
- `super@example.com` / `super123`

See `docs/TESTING.md` for more details.

---

**Last Updated**: December 2024
**Current Step**: Database Schema Setup ✅
**Next Step**: NextAuth Configuration 🔄 
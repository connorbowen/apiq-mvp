# APIQ Quick Start Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Git
- OpenAI API key (for natural language workflow generation)

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
- [x] Automated startup script
- [x] NextAuth.js authentication setup
- [x] User management system
- [x] RBAC (Role-Based Access Control)
- [x] Frontend UI components
- [x] Natural language workflow generation (OpenAI GPT-4)
- [x] Workflow execution engine with state management
- [x] Secrets vault with AES-256 encryption
- [x] Audit logging system
- [x] E2E testing suite
- [x] Background job queuing (PgBoss)
- [x] Workflow execution control (pause/resume/cancel)

### 🔄 In Progress
- [ ] Advanced workflow templates
- [ ] Multi-tenant support
- [ ] Advanced analytics and reporting

### 📋 Planned Features
- [ ] Workflow versioning and rollback
- [ ] Advanced AI features (function calling, context awareness)
- [ ] Enterprise SSO integration
- [ ] Advanced monitoring and alerting

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

# Configure OpenAI API (required for natural language workflow generation)
echo 'OPENAI_API_KEY=your-openai-api-key-here' >> .env

# Configure email service (optional - for password reset and verification)
# For Gmail, you'll need to:
# 1. Enable 2-Factor Authentication on your Google account
# 2. Generate an App Password: Google Account → Security → 2-Step Verification → App passwords
# 3. Add these to your .env file:
echo 'SMTP_HOST=smtp.gmail.com' >> .env
echo 'SMTP_PORT=587' >> .env
echo 'SMTP_SECURE=false' >> .env
echo 'SMTP_USER=your-email@gmail.com' >> .env
echo 'SMTP_PASS=your-app-password' >> .env
echo 'SMTP_FROM=your-email@gmail.com' >> .env

# Configure secrets vault (required for secure credential storage)
echo 'ENCRYPTION_MASTER_KEY=your-32-character-master-key-here' >> .env
```

### 4. Database Migration
```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Test database connection
npx tsx scripts/test-db.ts
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test categories
npm test -- --testPathPattern="unit"
npm test -- --testPathPattern="integration"
npm test -- --testPathPattern="e2e"

# Run with increased memory (if needed)
NODE_OPTIONS="--max-old-space-size=4096" npm test

# Run specific test files
npm test -- tests/unit/lib/queue/queueService.test.ts
```

**Note**: The project uses a comprehensive Jest setup with polyfills for Node.js APIs (TextEncoder, TextDecoder, crypto, fetch) and separate configurations for unit and integration tests. See `docs/TESTING.md` for detailed configuration information.

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

### Testing Natural Language Workflow Generation

Create a workflow using natural language:
```bash
curl -X POST http://localhost:3000/api/workflows/generate \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a workflow that gets all pets from the petstore API and then creates a new pet"
  }'
```

### Testing Secrets Management

Store a secret:
```bash
curl -X POST http://localhost:3000/api/secrets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-api-key",
    "type": "api_key",
    "value": "your-secret-value-here"
  }'
```

List secrets:
```bash
curl http://localhost:3000/api/secrets
```

### Testing Connections Management

Test the search and filter functionality:
```bash
# Navigate to dashboard and test search
# 1. Go to http://localhost:3000/dashboard
# 2. Click on "Connections" tab
# 3. Use the search box to filter connections by name
# 4. Use the filter dropdown to filter by auth type
# 5. Test keyboard navigation (Tab, Enter, Escape)
```

### Testing OAuth2 Providers

Test OAuth2 flows for all supported providers:
```bash
# Test Google OAuth2
curl -X POST http://localhost:3000/api/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "apiConnectionId": "test-connection-id",
    "clientId": "your-google-client-id",
    "clientSecret": "your-google-client-secret",
    "redirectUri": "http://localhost:3000/api/oauth/callback"
  }'

# Test GitHub OAuth2
curl -X POST http://localhost:3000/api/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "github",
    "apiConnectionId": "test-connection-id",
    "clientId": "your-github-client-id",
    "clientSecret": "your-github-client-secret",
    "redirectUri": "http://localhost:3000/api/oauth/callback"
  }'

# Test Slack OAuth2
curl -X POST http://localhost:3000/api/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "slack",
    "apiConnectionId": "test-connection-id",
    "clientId": "your-slack-client-id",
    "clientSecret": "your-slack-client-secret",
    "redirectUri": "http://localhost:3000/api/oauth/callback"
  }'
```

## Current Database Schema

### Tables Created
- `users` - User accounts and authentication
- `api_connections` - External API integrations (with ingestion status tracking)
- `endpoints` - OpenAPI endpoint definitions
- `workflows` - Multi-step workflow definitions
- `workflow_steps` - Individual workflow steps
- `workflow_executions` - Runtime execution tracking with state management
- `execution_logs` - Detailed execution logging
- `audit_logs` - Security and compliance logging
- `api_credentials` - Encrypted credential storage
- `secrets` - Encrypted secrets vault with versioning

### Key Relationships
- Users can have multiple API connections
- API connections have multiple endpoints
- Workflows consist of multiple workflow steps
- Workflow executions track runtime state and progress
- Secrets are user-specific and encrypted

## Key Features

### Natural Language Workflow Generation
- **AI-Powered**: Uses OpenAI GPT-4 for natural language understanding
- **Context Aware**: Maintains conversation context for complex workflows
- **Function Calling**: Automatically generates functions from OpenAPI specs
- **Validation**: Validates generated workflows before execution
- **Alternatives**: Suggests alternative approaches when appropriate

### Secrets Management
- **AES-256 Encryption**: All secrets encrypted at rest
- **Multiple Types**: Support for API keys, OAuth2 tokens, webhook secrets, custom
- **Version Control**: Complete version history and rotation
- **Rate Limiting**: 100 requests per minute per user
- **Audit Trail**: Complete audit logging for all operations

### Workflow Execution Engine
- **State Management**: Durable execution state with pause/resume/cancel
- **Queue System**: PgBoss-based job queue for reliable execution
- **Progress Tracking**: Real-time progress monitoring
- **Error Handling**: Comprehensive error handling and retry logic
- **Execution Control**: Full control over running executions

### Security Features
- **RBAC**: Role-based access control with three user levels
- **Encryption**: AES-256 encryption for all sensitive data
- **Audit Logging**: Complete audit trail for compliance
- **Input Validation**: Comprehensive input validation and sanitization
- **Rate Limiting**: Protection against abuse and DoS attacks

## Next Steps

### For New Users
1. **Set up environment**: Follow the environment configuration steps above
2. **Create your first API connection**: Add a test API like the Petstore API
3. **Try natural language workflow generation**: Use the chat interface to create workflows
4. **Store your first secret**: Add API credentials to the secrets vault
5. **Execute a workflow**: Run your first workflow and monitor execution

### For Developers
1. **Review the architecture**: See `docs/ARCHITECTURE.md` for system design
2. **Check the API reference**: See `docs/API_REFERENCE.md` for endpoint documentation
3. **Run the test suite**: Ensure all tests pass before making changes
4. **Follow security guidelines**: See `docs/SECURITY_GUIDE.md` for security best practices

### For Production Deployment
1. **Set up production database**: Configure PostgreSQL for production
2. **Configure environment variables**: Set all required production environment variables
3. **Set up monitoring**: Configure logging and monitoring for production
4. **Security review**: Complete security audit before deployment
5. **Performance testing**: Run load tests to ensure system scalability

---

_Quick Start Guide updated: July 2025_
_Features: Natural language workflow generation, secrets management, execution engine_
_Status: MVP core engine complete with 100% test coverage_
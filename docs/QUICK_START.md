# APIQ Quick Start Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Git

## Current Setup Status

### ✅ Completed
- [x] Project scaffolding (Next.js + TypeScript)
- [x] Database schema (PostgreSQL + Prisma)
- [x] Environment configuration
- [x] Database connection testing

### 🔄 In Progress
- [ ] NextAuth.js authentication setup
- [ ] User management system
- [ ] API connection management

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
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Test database connection
npx tsx scripts/test-db.ts
```

## Current Database Schema

### Tables Created
- `users` - User accounts and authentication
- `api_connections` - External API integrations  
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
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Test database
npx tsx scripts/test-db.ts
```

### Application Development
```bash
# Start development server
npm run dev

# Build application
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Project Structure

```
apiq-mvp/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── lib/
│   └── database/
│       └── client.ts          # Prisma client
├── scripts/
│   └── test-db.ts            # Database testing
├── docs/                     # Documentation
├── .env                      # Environment variables
└── package.json
```

## Database Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: apiq
- **User**: connorbowen (system username)
- **Connection String**: `postgresql://connorbowen@localhost:5432/apiq`

## Troubleshooting

### Common Issues

1. **PostgreSQL not running**
   ```bash
   brew services start postgresql@15
   ```

2. **Database doesn't exist**
   ```bash
   createdb apiq
   ```

3. **Migration errors**
   ```bash
   npx prisma migrate reset
   npx prisma migrate dev
   ```

4. **Permission denied**
   ```bash
   psql -d apiq -c "GRANT ALL PRIVILEGES ON DATABASE apiq TO connorbowen;"
   ```

### Verification Commands

```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Verify database exists
psql -l | grep apiq

# Test connection
psql -d apiq -c "SELECT version();"

# List tables
psql -d apiq -c "\dt"
```

## Next Steps

1. **Set up NextAuth.js** for authentication
2. **Create user management** system
3. **Implement API connection** CRUD operations
4. **Add OpenAPI parsing** functionality
5. **Build workflow engine**

## Support

- **Database Issues**: Check `docs/DATABASE_SETUP.md`
- **Project Structure**: Check `docs/ARCHITECTURE.md`
- **Development Guide**: Check `docs/DEVELOPMENT_GUIDE.md`
- **API Reference**: Check `docs/API_REFERENCE.md`

---

**Last Updated**: December 2024
**Current Step**: Database Schema Setup ✅
**Next Step**: NextAuth Configuration 🔄 
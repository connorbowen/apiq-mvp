# Database Setup Guide

## Overview

This guide covers the complete database setup for the APIQ project, including PostgreSQL installation, configuration, and environment setup.

## Table of Contents

1. [PostgreSQL Installation](#postgresql-installation)
2. [Database Configuration](#database-configuration)
3. [Environment Variables](#environment-variables)
4. [Database Schema](#database-schema)
5. [Testing Database Connection](#testing-database-connection)
6. [Troubleshooting](#troubleshooting)

## PostgreSQL Installation

### macOS Installation (Homebrew)

```bash
# Install PostgreSQL 15
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Add PostgreSQL to PATH (add to ~/.zshrc)
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Alternative Installation Methods

#### Using Postgres.app
1. Download [Postgres.app](https://postgresapp.com/)
2. Install and launch the application
3. Click "Initialize" to create a new server
4. The server will start automatically

#### Using Docker
```bash
# Pull PostgreSQL image
docker pull postgres:15

# Run PostgreSQL container
docker run --name apiq-postgres \
  -e POSTGRES_DB=apiq \
  -e POSTGRES_USER=connorbowen \
  -e POSTGRES_PASSWORD=your-password \
  -p 5432:5432 \
  -d postgres:15
```

## Database Configuration

### Create Database

```bash
# Create the APIQ database
createdb apiq

# Verify database creation
psql -l | grep apiq
```

### Database Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: apiq
- **User**: connorbowen (your system username)
- **Password**: (none for local development)

### Connection String Format

```
postgresql://USERNAME@HOST:PORT/DATABASE
```

Example:
```
postgresql://connorbowen@localhost:5432/apiq
```

## Environment Variables

### Required Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# Database Configuration
DATABASE_URL="postgresql://connorbowen@localhost:5432/apiq"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.1

# Security Configuration
ENCRYPTION_KEY=your-32-character-encryption-key-here
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/apiq.log

# API Documentation Sync
API_DOC_SYNC_INTERVAL=86400000
API_DOC_SYNC_ENABLED=true

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-in-production
```

### Environment Variable Descriptions

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `NODE_ENV` | Application environment | Yes | development |
| `PORT` | Server port | No | 3001 |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `ENCRYPTION_KEY` | 32-character encryption key | Yes | - |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Yes | - |

### Generating Secure Keys

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -hex 16

# Generate NextAuth secret
openssl rand -base64 32
```

## Database Schema

### Schema Overview

The APIQ database schema consists of 10 main tables:

1. **users** - User accounts and authentication
2. **api_connections** - External API integrations
3. **endpoints** - OpenAPI endpoint definitions
4. **workflows** - Multi-step workflow definitions
5. **workflow_steps** - Individual workflow steps
6. **workflow_executions** - Runtime execution tracking
7. **execution_logs** - Detailed execution logging
8. **audit_logs** - Security and compliance logging
9. **api_credentials** - Encrypted credential storage
10. **_prisma_migrations** - Database migration history

### Key Relationships

```
users (1) → (many) api_connections
users (1) → (many) workflows
users (1) → (many) workflow_executions
users (1) → (many) audit_logs

api_connections (1) → (many) endpoints
api_connections (1) → (many) workflow_steps
api_connections (1) → (many) api_credentials

workflows (1) → (many) workflow_steps
workflows (1) → (many) workflow_executions

workflow_executions (1) → (many) execution_logs
```

### Database Enums

```sql
-- User roles
enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}

-- API authentication types
enum AuthType {
  NONE
  API_KEY
  BEARER_TOKEN
  BASIC_AUTH
  OAUTH2
  CUSTOM
}

-- Status indicators
enum Status {
  ACTIVE
  INACTIVE
  ERROR
  PENDING
}

-- Workflow status
enum WorkflowStatus {
  DRAFT
  ACTIVE
  PAUSED
  ARCHIVED
}

-- Execution status
enum ExecutionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

-- Log levels
enum LogLevel {
  INFO
  WARNING
  ERROR
  DEBUG
}
```

## Testing Database Connection

### Run Database Tests

```bash
# Test database connection and schema
npx tsx scripts/test-db.ts
```

### Manual Database Verification

```bash
# Connect to database
psql -d apiq

# List all tables
\dt

# Check table structure
\d users
\d api_connections
\d workflows

# Test basic query
SELECT COUNT(*) FROM users;

# Exit psql
\q
```

### Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Check database status
npx prisma db pull
```

## Database Management

### Backup Database

```bash
# Create backup
pg_dump apiq > apiq_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql apiq < apiq_backup_20241227_143022.sql
```

### Database Maintenance

```bash
# Analyze database statistics
psql -d apiq -c "ANALYZE;"

# Vacuum database
psql -d apiq -c "VACUUM;"

# Check database size
psql -d apiq -c "SELECT pg_size_pretty(pg_database_size('apiq'));"
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if not running
brew services start postgresql@15
```

#### 2. Database Does Not Exist
```bash
# Create database
createdb apiq

# Or connect as superuser and create
sudo -u postgres createdb apiq
```

#### 3. Permission Denied
```bash
# Check user permissions
psql -d apiq -c "\du"

# Grant permissions if needed
psql -d apiq -c "GRANT ALL PRIVILEGES ON DATABASE apiq TO connorbowen;"
```

#### 4. Migration Errors
```bash
# Reset migrations
npx prisma migrate reset

# Or manually drop and recreate
psql -d apiq -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npx prisma migrate dev
```

### Performance Optimization

#### Indexes
The schema includes automatic indexes on:
- Primary keys (id fields)
- Foreign keys (userId, workflowId, etc.)
- Unique constraints (email, unique combinations)

#### Connection Pooling
The Prisma client is configured with connection pooling for optimal performance.

### Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Database Access**: Use strong passwords in production
3. **Network Security**: Configure firewall rules for database access
4. **Encryption**: Sensitive data is encrypted using AES-256
5. **Audit Logging**: All database operations are logged for security

## Production Deployment

### Production Database Setup

1. **Use Managed Database Service**:
   - AWS RDS
   - Google Cloud SQL
   - Azure Database for PostgreSQL
   - Supabase
   - Railway

2. **Environment Variables**:
   ```bash
   DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
   ```

3. **SSL Configuration**:
   - Enable SSL connections
   - Use connection pooling
   - Configure read replicas for scaling

4. **Backup Strategy**:
   - Automated daily backups
   - Point-in-time recovery
   - Cross-region replication

### Migration Strategy

```bash
# Production migration
npx prisma migrate deploy

# Verify migration
npx prisma db pull

# Generate production client
npx prisma generate
```

## Support

For database-related issues:

1. Check the [Prisma Documentation](https://www.prisma.io/docs/)
2. Review [PostgreSQL Documentation](https://www.postgresql.org/docs/)
3. Check the troubleshooting section above
4. Create an issue in the project repository

---

**Last Updated**: December 2024
**Version**: 1.0.0 
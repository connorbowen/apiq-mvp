# APIQ Deployment Guide

## Overview

This deployment guide covers all aspects of deploying APIQ in various environments, from local development to production. The guide includes step-by-step instructions, configuration options, and best practices for each deployment scenario.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Staging Environment](#staging-environment)
4. [Production Deployment](#production-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Cloud Platform Deployments](#cloud-platform-deployments)
7. [Database Setup](#database-setup)
8. [Environment Configuration](#environment-configuration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Recovery](#backup--recovery)
11. [Scaling & Performance](#scaling--performance)
12. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements**
- Node.js 18.0.0 or higher
- PostgreSQL 14.0 or higher
- 2GB RAM
- 10GB disk space

**Recommended Requirements**
- Node.js 20.0.0 or higher
- PostgreSQL 15.0 or higher
- 4GB RAM
- 50GB disk space
- Redis (for caching and sessions)

### Required Accounts & Services

- **OpenAI API**: For AI-powered workflow orchestration
- **Email Service**: For user notifications (SendGrid, AWS SES, etc.)
- **Monitoring Service**: For application monitoring (DataDog, New Relic, etc.)
- **Domain & SSL**: For production deployments

## Local Development Setup

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apiq-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```

4. **Configure environment variables**
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/apiq_dev"
   
   # NextAuth.js
   NEXTAUTH_SECRET="your-development-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   
   # OpenAI
   OPENAI_API_KEY="sk-your-openai-api-key"
   
   # Development
   NODE_ENV="development"
   LOG_LEVEL="debug"
   ```

5. **Set up PostgreSQL database**
   ```bash
   # Install PostgreSQL (if not already installed)
   # macOS: brew install postgresql
   # Ubuntu: sudo apt-get install postgresql postgresql-contrib
   
   # Create database
   createdb apiq_dev
   
   # Run migrations
   npx prisma migrate dev --name init
   
   # Generate Prisma client
   npx prisma generate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Development Tools

**Prisma Studio**
```bash
npx prisma studio
```
Access database GUI at [http://localhost:5555](http://localhost:5555)

**Database Management**
```bash
# Reset database
npx prisma migrate reset

# View migration status
npx prisma migrate status

# Generate new migration
npx prisma migrate dev --name migration_name
```

**Testing**
```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern=user.test.ts

# Run with increased memory (for CI/CD environments)
NODE_OPTIONS="--max-old-space-size=4096" npm test

# Run specific test categories
npm test -- --testPathPattern="unit"
npm test -- --testPathPattern="integration"
npm test -- --testPathPattern="e2e"
```

**Note**: The project uses comprehensive Jest polyfills and separate configurations for different test types. See `docs/TESTING.md` for detailed configuration information.

## Staging Environment

### Staging Setup

1. **Create staging environment**
   ```bash
   # Create staging branch
   git checkout -b staging
   
   # Set up staging environment variables
   cp env.example .env.staging
   ```

2. **Configure staging environment**
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@staging-db:5432/apiq_staging"
   
   # NextAuth.js
   NEXTAUTH_SECRET="your-staging-secret-key"
   NEXTAUTH_URL="https://staging.apiq.com"
   
   # OpenAI
   OPENAI_API_KEY="sk-your-openai-api-key"
   
   # Staging
   NODE_ENV="staging"
   LOG_LEVEL="info"
   
   # Monitoring
   SENTRY_DSN="your-sentry-dsn"
   ```

3. **Deploy to staging**
   ```bash
   # Build application
   npm run build
   
   # Run database migrations
   npx prisma migrate deploy
   
   # Start staging server
   npm start
   ```

### Staging Best Practices

- Use separate database for staging
- Configure staging-specific API keys
- Set up staging monitoring
- Regular staging data cleanup
- Automated testing in staging

## Production Deployment

### Production Checklist

Before deploying to production, ensure:

- [ ] All tests pass
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Incident response plan ready

### Production Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@production-db:5432/apiq_production"

# NextAuth.js
NEXTAUTH_SECRET="your-production-secret-key"
NEXTAUTH_URL="https://apiq.com"

# OpenAI
OPENAI_API_KEY="sk-your-production-openai-key"

# Production
NODE_ENV="production"
LOG_LEVEL="warn"

# Security
ENCRYPTION_KEY="your-32-character-encryption-key"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
DATADOG_API_KEY="your-datadog-key"

# Email
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"

# Redis (for caching and sessions)
REDIS_URL="redis://localhost:6379"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"
```

### Production Deployment Steps

1. **Prepare production build**
   ```bash
   # Install production dependencies
   npm ci --only=production
   
   # Build application
   npm run build
   
   # Generate Prisma client
   npx prisma generate
   ```

2. **Database setup**
   ```bash
   # Run production migrations
   npx prisma migrate deploy
   
   # Verify database connection
   npx prisma db seed
   ```

3. **Start production server**
   ```bash
   # Start with PM2 (recommended)
   npm install -g pm2
   pm2 start npm --name "apiq" -- start
   
   # Or start directly
   npm start
   ```

4. **Verify deployment**
   ```bash
   # Health check
   curl https://apiq.com/api/health
   
   # Check logs
   pm2 logs apiq
   ```

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://apiq:password@db:5432/apiq
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=apiq
      - POSTGRES_USER=apiq
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Docker Deployment Commands

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Stop services
docker-compose down

# Update application
docker-compose pull
docker-compose up -d
```

## Cloud Platform Deployments

### Vercel Deployment

**Recommended for Next.js applications**

1. **Connect repository to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel --prod
   ```

2. **Configure environment variables in Vercel dashboard**
   - Go to Project Settings → Environment Variables
   - Add all required environment variables

3. **Configure custom domain**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records

### AWS Deployment

**Using AWS Elastic Beanstalk**

1. **Create Elastic Beanstalk application**
   ```bash
   # Install EB CLI
   pip install awsebcli
   
   # Initialize EB application
   eb init apiq --platform node.js --region us-east-1
   
   # Create environment
   eb create apiq-production
   ```

2. **Configure environment variables**
   ```bash
   eb setenv DATABASE_URL="postgresql://..."
   eb setenv NEXTAUTH_SECRET="..."
   eb setenv OPENAI_API_KEY="..."
   ```

3. **Deploy application**
   ```bash
   eb deploy
   ```

**Using AWS ECS with Fargate**

1. **Create ECS cluster and task definition**
2. **Configure load balancer**
3. **Set up auto-scaling**
4. **Configure monitoring and logging**

### Google Cloud Platform

**Using Google App Engine**

1. **Create app.yaml configuration**
   ```yaml
   runtime: nodejs18
   env: standard
   
   env_variables:
     DATABASE_URL: "postgresql://..."
     NEXTAUTH_SECRET: "..."
     OPENAI_API_KEY: "..."
   
   automatic_scaling:
     target_cpu_utilization: 0.65
     min_instances: 1
     max_instances: 10
   ```

2. **Deploy to App Engine**
   ```bash
   gcloud app deploy
   ```

### Azure Deployment

**Using Azure App Service**

1. **Create App Service**
   ```bash
   az webapp create --resource-group apiq-rg --plan apiq-plan --name apiq-app
   ```

2. **Configure environment variables**
   ```bash
   az webapp config appsettings set --resource-group apiq-rg --name apiq-app --settings DATABASE_URL="postgresql://..."
   ```

3. **Deploy application**
   ```bash
   az webapp deployment source config-zip --resource-group apiq-rg --name apiq-app --src apiq.zip
   ```

## Database Setup

### PostgreSQL Configuration

**Production PostgreSQL Configuration**
```sql
-- Create database and user
CREATE DATABASE apiq_production;
CREATE USER apiq_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE apiq_production TO apiq_user;

-- Configure connection limits
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();
```

**Connection Pooling**
```typescript
// Configure connection pooling
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

export { pool };
```

### Database Migrations

**Migration Strategy**
```bash
# Development migrations
npx prisma migrate dev --name feature_name

# Production migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate migration from schema changes
npx prisma migrate dev --create-only
```

**Migration Best Practices**
- Always test migrations in staging first
- Use descriptive migration names
- Include rollback strategies
- Monitor migration performance
- Backup before major migrations

### Database Backup

**Automated Backup Script**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="apiq_production"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_DIR/apiq_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/apiq_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "apiq_*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
aws s3 cp $BACKUP_DIR/apiq_$DATE.sql.gz s3://apiq-backups/
```

## Environment Configuration

### Environment-Specific Configs

**Development Configuration**
```typescript
// config/development.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    }
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    maxTokens: 4000
  },
  logging: {
    level: 'debug',
    file: './logs/apiq.log'
  }
};
```

**Production Configuration**
```typescript
// config/production.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 5,
      max: 20
    },
    ssl: true
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL,
    secure: true
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    maxTokens: 4000,
    timeout: 30000
  },
  logging: {
    level: 'warn',
    file: '/var/log/apiq/app.log'
  },
  monitoring: {
    sentry: process.env.SENTRY_DSN,
    datadog: process.env.DATADOG_API_KEY
  }
};
```

### Configuration Validation

```typescript
// lib/config/validation.ts
import { z } from 'zod';

const configSchema = z.object({
  database: z.object({
    url: z.string().url(),
    pool: z.object({
      min: z.number().min(1),
      max: z.number().min(1)
    })
  }),
  auth: z.object({
    secret: z.string().min(32),
    url: z.string().url()
  }),
  openai: z.object({
    apiKey: z.string().startsWith('sk-'),
    model: z.string(),
    maxTokens: z.number().min(1).max(8000)
  })
});

export const validateConfig = (config: any) => {
  return configSchema.parse(config);
};
```

## Monitoring & Logging

### Application Monitoring

**Health Check Endpoint**
```typescript
// pages/api/health.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check OpenAI connection
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await openai.models.list();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV,
      services: {
        database: 'healthy',
        openai: 'healthy'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}
```

**Performance Monitoring**
```typescript
// lib/monitoring/performance.ts
export const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Log performance metrics
    logger.info('Performance Metric', {
      name,
      duration,
      success: true
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    logger.error('Performance Metric', {
      name,
      duration,
      success: false,
      error: error.message
    });
    
    throw error;
  }
};
```

### Logging Configuration

**Structured Logging**
```typescript
// lib/logger.ts
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: process.env.LOG_FILE || './logs/apiq.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

**Audit Logging**
```typescript
// lib/audit/logger.ts
export const auditLog = async (event: AuditEvent): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      details: event.details,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: new Date()
    }
  });
};
```

## Backup & Recovery

### Backup Strategy

**Database Backup**
```bash
#!/bin/bash
# Automated database backup

# Daily backup
pg_dump $DATABASE_URL | gzip > /backups/daily/apiq_$(date +%Y%m%d).sql.gz

# Weekly backup
if [ $(date +%u) -eq 1 ]; then
  pg_dump $DATABASE_URL | gzip > /backups/weekly/apiq_$(date +%Y%m%d).sql.gz
fi

# Monthly backup
if [ $(date +%d) -eq 01 ]; then
  pg_dump $DATABASE_URL | gzip > /backups/monthly/apiq_$(date +%Y%m).sql.gz
fi
```

**File Backup**
```bash
#!/bin/bash
# Backup application files

# Backup configuration files
tar -czf /backups/config/apiq_config_$(date +%Y%m%d).tar.gz /app/config/

# Backup logs
tar -czf /backups/logs/apiq_logs_$(date +%Y%m%d).tar.gz /app/logs/
```

### Recovery Procedures

**Database Recovery**
```bash
#!/bin/bash
# Database recovery script

BACKUP_FILE=$1
DATABASE_URL=$2

if [ -z "$BACKUP_FILE" ] || [ -z "$DATABASE_URL" ]; then
  echo "Usage: $0 <backup_file> <database_url>"
  exit 1
fi

# Stop application
pm2 stop apiq

# Restore database
gunzip -c $BACKUP_FILE | psql $DATABASE_URL

# Run migrations
npx prisma migrate deploy

# Start application
pm2 start apiq
```

**Application Recovery**
```bash
#!/bin/bash
# Application recovery script

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Restart application
pm2 restart apiq
```

## Scaling & Performance

### Horizontal Scaling

**Load Balancer Configuration**
```nginx
# nginx.conf
upstream apiq_backend {
    least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
}

server {
    listen 80;
    server_name apiq.com;
    
    location / {
        proxy_pass http://apiq_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Auto-Scaling Configuration**
```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  app:
    build: .
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

### Performance Optimization

**Caching Strategy**
```typescript
// lib/cache/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },
  
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  },
  
  async del(key: string): Promise<void> {
    await redis.del(key);
  }
};
```

**Database Optimization**
```sql
-- Create indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_api_connections_user_id ON api_connections(user_id);

-- Analyze table statistics
ANALYZE audit_logs;
ANALYZE workflow_executions;
ANALYZE api_connections;
```

## Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check database locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

**Application Issues**
```bash
# Check application logs
pm2 logs apiq

# Check application status
pm2 status

# Restart application
pm2 restart apiq

# Check memory usage
pm2 monit
```

**Performance Issues**
```bash
# Check CPU usage
top -p $(pgrep -f "node.*apiq")

# Check memory usage
free -h

# Check disk usage
df -h

# Check network connections
netstat -tulpn | grep :3000
```

### Debug Mode

**Enable Debug Logging**
```bash
# Set debug environment variable
export DEBUG=apiq:*

# Start application in debug mode
NODE_ENV=development DEBUG=apiq:* npm run dev
```

**Database Debugging**
```bash
# Enable Prisma query logging
export DEBUG="prisma:query"

# Run application with query logging
DEBUG="prisma:query" npm run dev
```

### Config & Debug Scripts

- `next.config.js` has been updated. Review for any new environment or build settings before deploying.
- Use `clear-cache.js` and related scripts for cache management in dev/staging environments as needed.

This deployment guide provides comprehensive coverage of all deployment scenarios and best practices for the APIQ platform. Follow these guidelines to ensure successful deployments in any environment. 
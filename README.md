# APIQ - Multi-API Orchestrator Webapp

A semi-agentic, low-code web application that enables users to orchestrate complex workflows across multiple APIs using natural language and AI-powered automation.

## 🚀 Overview

APIQ transforms how developers and non-technical users interact with multiple APIs. Instead of writing custom scripts or juggling multiple tools, users can describe their goals in natural language, and the AI orchestrator will automatically plan and execute multi-step workflows across connected APIs.

### Key Features

- **🤖 AI-Powered Orchestration**: Natural language to API workflow translation using OpenAI GPT-4
- **🔗 Multi-API Integration**: Connect and manage multiple external APIs with OpenAPI/Swagger specs
- **🛡️ Secure Credential Management**: Encrypted storage of API keys and tokens
- **👥 Role-Based Access Control**: Granular permissions for different user roles
- **📊 Comprehensive Audit Logging**: Complete trail of all actions for compliance
- **🎯 Guided User Experience**: Onboarding, templates, and contextual help
- **⚡ Real-time Execution**: Live workflow progress and error handling

## ✅ Current Status

### ✅ Completed Features
- [x] Project scaffolding (Next.js + TypeScript + Prisma)
- [x] Database schema and migrations
- [x] Environment configuration and validation
- [x] Database connection and testing utilities
- [x] API connection management (CRUD operations)
- [x] OpenAPI specification parsing and validation
- [x] Endpoint extraction and storage
- [x] Endpoint listing with filtering capabilities
- [x] Error handling and logging system
- [x] Health check endpoints
- [x] Test user creation and management
- [x] Comprehensive documentation

### 🔄 In Progress
- [ ] NextAuth.js authentication setup
- [ ] User management system
- [ ] RBAC (Role-Based Access Control)
- [ ] Frontend UI components
- [ ] Workflow execution engine

### 📋 Planned Features
- [ ] AI-powered workflow orchestration
- [ ] Multi-step API workflow execution
- [ ] Background job queuing
- [ ] Audit logging system
- [ ] E2E testing suite
- [ ] Rate limiting and security enhancements

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js (React + TypeScript) with Tailwind CSS
- **Backend**: Next.js API routes (serverless functions)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Auth.js) with email/password and SSO support
- **AI Integration**: OpenAI GPT-4 with function calling
- **API Spec Parsing**: @apidevtools/swagger-parser
- **HTTP Client**: Axios for external API calls

### System Components

1. **Authentication Layer**: NextAuth.js handles user sessions and SSO
2. **API Connection Manager**: Secure storage and management of API credentials
3. **OpenAPI Parser**: Dynamic fetching and parsing of API specifications
4. **Endpoint Extractor**: Extracts and stores API endpoints from OpenAPI specs
5. **AI Orchestrator**: OpenAI integration for natural language interpretation
6. **Workflow Engine**: Multi-step execution with data flow between APIs
7. **Audit System**: Comprehensive logging of all user actions and API calls

## 📁 Project Structure

```
/apiq-mvp
├── /prisma                  # Database schema and migrations
│   ├── schema.prisma        # Prisma schema definition
│   └── migrations/          # Database migration files
├── /lib                     # Utility functions and services
│   ├── /database
│   │   └── client.ts        # Prisma database client
│   ├── /api
│   │   ├── endpoints.ts     # Endpoint extraction utilities
│   │   └── parser.ts        # OpenAPI parsing utilities
│   └── /services
│       └── openaiService.ts # OpenAI integration
├── /scripts                 # Utility scripts
│   ├── test-db.ts          # Database testing script
│   ├── create-test-user.js # Test user creation script
│   └── startup.sh          # Automated startup script
├── /docs                    # Project documentation
│   ├── DATABASE_SETUP.md    # Database setup guide
│   ├── QUICK_START.md       # Quick start guide
│   ├── TROUBLESHOOTING.md   # Troubleshooting guide
│   └── ...                  # Other documentation
├── /pages                   # Next.js pages and API routes
│   └── /api
│       ├── /connections     # API connection management
│       │   └── /[id]/endpoints # Endpoint listing and filtering
│       └── /health          # Health check endpoints
├── /components              # Reusable React components
├── /styles                  # Global styles and Tailwind config
└── /public                  # Static assets
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Git

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apiq-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**
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

4. **Set up environment variables**
   ```bash
   cp env.example .env
   
   # Update database URL (replace with your username)
   sed -i '' 's|DATABASE_URL=./data/apiq.db|DATABASE_URL="postgresql://connorbowen@localhost:5432/apiq"|' .env
   ```

5. **Set up the database**
   ```bash
   # Run migrations
   npx prisma migrate deploy
   
   # Generate Prisma client
   npx prisma generate
   ```

6. **Create test user**
   ```bash
   # Create a test user for development
   node scripts/create-test-user.js
   ```

7. **Test database connection**
   ```bash
   npx tsx scripts/test-db.ts
   ```

8. **Start the development server**
   ```bash
   npm run dev
   ```

9. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### 🔄 Development Workflow

When making schema changes:

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

### 🧪 Testing API Endpoints

Test the API connection creation:
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

## 🗄️ Database Schema

### Current Tables
- `users` - User accounts and authentication
- `api_connections` - External API integrations (with ingestion status tracking)
- `endpoints` - OpenAPI endpoint definitions
- `workflows` - Multi-step workflow definitions
- `workflow_steps` - Individual workflow steps
- `workflow_executions` - Runtime execution tracking
- `execution_logs` - Detailed execution logging
- `audit_logs` - Security and compliance logging
- `api_credentials` - Encrypted credential storage

### Database Connection
- **Host**: localhost
- **Port**: 5432
- **Database**: apiq
- **User**: connorbowen (system username)
- **Connection String**: `postgresql://connorbowen@localhost:5432/apiq`

## 📖 User Guide

### Getting Started

1. **Create an Account**: Sign up with email/password or use SSO
2. **Add Your First API**: Connect an API by providing its OpenAPI spec URL
3. **Explore Endpoints**: Browse available API operations and their parameters
4. **Start a Conversation**: Use natural language to describe what you want to accomplish
5. **Review and Confirm**: The AI will propose a workflow - review and confirm before execution
6. **Monitor Progress**: Watch real-time execution and view results

### Example Workflows

- **"Get the latest customer data from CRM API and then post a welcome message via the Messaging API"**
- **"Fetch the top 10 customers from Sales API, then get their recent interactions from Marketing API"**
- **"When a new customer is created in CRM, automatically create a project in PM tool and notify via Slack"**

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npx prisma studio` - Open Prisma Studio for database management
- `npx tsx scripts/test-db.ts` - Test database connection

### Database Operations

```bash
# Run migrations
npx prisma migrate dev

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Test database connection
npx tsx scripts/test-db.ts
```

### Development Workflow

1. **Feature Development**: Create feature branches from `main`
2. **Testing**: Write unit and integration tests for new features
3. **Code Review**: Submit pull requests for review
4. **Deployment**: Merge to `main` triggers deployment

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 🔒 Security

### Authentication & Authorization

- **Multi-factor authentication** support via NextAuth.js
- **Role-based access control** (Admin, User roles)
- **Session management** with secure JWT tokens
- **SSO integration** for enterprise deployments

### Data Protection

- **Encrypted credential storage** using AES-256
- **Secure API key management** with rotation support
- **Audit logging** of all user actions and API calls
- **Input validation** and sanitization

### Compliance

- **GDPR compliance** with data export/deletion capabilities
- **SOC 2 readiness** with comprehensive audit trails
- **Enterprise security** features for B2B deployments

## 📊 Monitoring & Logging

### Audit Logs

Every action in the system is logged for compliance and debugging:

- User authentication events
- API connection management
- Workflow executions and results
- Error conditions and resolutions

### Performance Monitoring

- API response times and success rates
- AI model usage and costs
- Database query performance
- User activity metrics

## 🚀 Deployment

### Production Setup

1. **Database**: Use managed PostgreSQL service (AWS RDS, Supabase, etc.)
2. **Environment**: Set production environment variables
3. **SSL**: Enable HTTPS with SSL certificates
4. **Monitoring**: Set up error tracking and performance monitoring

### Environment Variables (Production)

```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:port/dbname?sslmode=require"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"
OPENAI_API_KEY="sk-your-openai-key"
ENCRYPTION_KEY="your-production-encryption-key"
```

## 📚 Documentation

- **[Database Setup Guide](docs/DATABASE_SETUP.md)** - Complete database configuration
- **[Quick Start Guide](docs/QUICK_START.md)** - Get up and running quickly
- **[Architecture Guide](docs/ARCHITECTURE.md)** - System design and components
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Development workflow
- **[API Reference](docs/API_REFERENCE.md)** - API documentation
- **[User Guide](docs/USER_GUIDE.md)** - End-user documentation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` directory
- **Issues**: Create an issue in the repository
- **Discussions**: Use GitHub Discussions for questions

## Development & Testing

- See [docs/QUICK_START.md](docs/QUICK_START.md) for setup and quick start.
- See [docs/TESTING.md](docs/TESTING.md) for details on running authentication and integration tests, including the demo script and test users.

---

**Current Version**: 0.1.0  
**Last Updated**: December 2024  
**Status**: Development (Database Setup Complete ✅) 
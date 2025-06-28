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

## 📊 Current Status

### ✅ Completed
- [x] Project scaffolding (Next.js + TypeScript + Tailwind)
- [x] Database schema design and implementation
- [x] PostgreSQL setup and configuration
- [x] Prisma ORM integration
- [x] Environment configuration
- [x] Database connection testing

### 🔄 In Progress
- [ ] NextAuth.js authentication setup
- [ ] User management system
- [ ] API connection management

### 📋 Planned
- [ ] OpenAPI spec parsing
- [ ] AI workflow generation
- [ ] Workflow execution engine
- [ ] Frontend UI components
- [ ] Audit logging system

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
4. **AI Orchestrator**: OpenAI integration for natural language interpretation
5. **Workflow Engine**: Multi-step execution with data flow between APIs
6. **Audit System**: Comprehensive logging of all user actions and API calls

## 📁 Project Structure

```
/apiq-mvp
├── /prisma                  # Database schema and migrations
│   ├── schema.prisma        # Prisma schema definition
│   └── migrations/          # Database migration files
├── /lib                     # Utility functions and services
│   └── /database
│       └── client.ts        # Prisma database client
├── /scripts                 # Utility scripts
│   └── test-db.ts          # Database testing script
├── /docs                    # Project documentation
│   ├── DATABASE_SETUP.md    # Database setup guide
│   ├── QUICK_START.md       # Quick start guide
│   └── ...                  # Other documentation
├── /pages                   # Next.js pages and API routes
├── /components              # Reusable React components
├── /styles                  # Global styles and Tailwind config
└── /public                  # Static assets
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Git

### Installation

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
   npx prisma migrate dev --name init
   npx prisma generate
   ```

6. **Test database connection**
   ```bash
   npx tsx scripts/test-db.ts
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Environment Variables

Required environment variables in `.env`:

```bash
# Database Configuration
DATABASE_URL="postgresql://connorbowen@localhost:5432/apiq"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Security Configuration
ENCRYPTION_KEY=your-32-character-encryption-key-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-in-production
```

Generate secure keys:
```bash
# JWT Secret
openssl rand -base64 32

# Encryption Key
openssl rand -hex 16

# NextAuth Secret
openssl rand -base64 32
```

## 🗄️ Database Schema

### Current Tables
- `users` - User accounts and authentication
- `api_connections` - External API integrations
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

---

**Current Version**: 0.1.0  
**Last Updated**: December 2024  
**Status**: Development (Database Setup Complete ✅) 
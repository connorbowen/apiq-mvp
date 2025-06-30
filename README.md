# APIQ - Multi-API Orchestrator

A semi-agentic, low-code web application that enables users to orchestrate complex workflows across multiple APIs using natural language and AI-powered automation.

## 🚀 Features

### Core Functionality
- **Multi-API Integration** - Connect to any API with OpenAPI/Swagger documentation
- **Workflow Orchestration** - Create complex multi-step workflows across APIs
- **Natural Language Interface** - AI-powered workflow creation and management
- **Real-time Monitoring** - Live workflow execution monitoring and error handling
- **Comprehensive Audit Trails** - Complete logging for compliance and debugging

### Authentication & Security
- **JWT Authentication** - Secure token-based authentication with role-based access control
- **OAuth2 Support** - Multi-provider OAuth2 authentication (GitHub, Google, Slack)
- **Encrypted Storage** - AES-256 encryption for all sensitive data
- **CSRF Protection** - State parameter validation for OAuth2 flows
- **Audit Logging** - Comprehensive security event logging

### API Management
- **OpenAPI Integration** - Automatic API specification parsing and caching
- **Connection Management** - Visual API connection setup and testing
- **Credential Security** - Encrypted storage of API keys and OAuth2 tokens
- **Health Monitoring** - Real-time API status and performance tracking
- **Error Handling** - Comprehensive error management and recovery

### Developer Experience
- **TypeScript** - Full type safety throughout the application
- **Comprehensive Testing** - 282+ tests with 100% pass rate
- **Dependency Injection** - Testable service architecture
- **API Documentation** - Complete API reference documentation
- **Development Tools** - Hot reloading, linting, and debugging support

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Authentication**: JWT, OAuth2, bcrypt
- **Security**: AES-256 encryption, CSRF protection
- **Testing**: Jest, Playwright, Dependency Injection
- **Monitoring**: Audit logging, error tracking, performance monitoring

### OAuth2 System
- **Multi-Provider Support**: GitHub, Google, Slack (extensible)
- **Secure Token Management**: Encrypted storage with automatic refresh
- **CSRF Protection**: State parameter validation
- **Comprehensive Logging**: Complete OAuth2 event audit trail
- **Dependency Injection**: Testable OAuth2 service architecture

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/apiq-mvp.git
   cd apiq-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:setup
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Run tests**
   ```bash
   npm test
   ```

### OAuth2 Configuration

To use OAuth2 authentication:

1. **Configure OAuth2 providers** in your environment variables:
   ```bash
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

2. **Create an API connection** with OAuth2 authentication:
   ```json
   {
     "name": "GitHub API",
     "baseUrl": "https://api.github.com",
     "authType": "OAUTH2",
     "authConfig": {
       "provider": "github",
       "clientId": "your_github_client_id",
       "clientSecret": "your_github_client_secret",
       "redirectUri": "https://your-app.com/api/oauth/callback",
       "scope": "repo user"
     }
   }
   ```

3. **Initiate OAuth2 flow**:
   ```bash
   GET /api/oauth/authorize?apiConnectionId=conn_123&provider=github&clientId=your_client_id&clientSecret=your_client_secret&redirectUri=https://your-app.com/api/oauth/callback
   ```

## 📚 Documentation

- **[Product Requirements Document](docs/prd.md)** - Detailed product specifications
- **[Implementation Plan](docs/implementation-plan.md)** - Development roadmap and progress
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation including OAuth2 endpoints
- **[Architecture Documentation](docs/ARCHITECTURE.md)** - System architecture and design
- **[Security Guide](docs/SECURITY_GUIDE.md)** - Security best practices and OAuth2 security
- **[Testing Guide](docs/TESTING.md)** - Testing strategies and OAuth2 testing
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment instructions

## 🔧 Development

### Project Structure
```
apiq-mvp/
├── components/          # React UI components
├── pages/api/          # Next.js API routes
│   ├── auth/           # Authentication endpoints
│   ├── connections/    # API connection management
│   └── oauth/          # OAuth2 endpoints
├── src/
│   ├── lib/            # Shared utilities and services
│   │   ├── auth/       # Authentication services (JWT, OAuth2)
│   │   ├── api/        # API management services
│   │   └── utils/      # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── middleware/     # Request middleware
├── tests/              # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
├── prisma/             # Database schema and migrations
└── docs/               # Project documentation
```

### OAuth2 Development

The OAuth2 system is built with:
- **OAuth2Service** - Core OAuth2 business logic with dependency injection
- **API Endpoints** - Complete OAuth2 flow endpoints
- **Security Features** - Encrypted storage, CSRF protection, audit logging
- **Testing** - Comprehensive unit tests with mocked dependencies

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run OAuth2 tests specifically
npm test -- tests/unit/lib/auth/oauth2.test.ts
```

## 🔒 Security

### OAuth2 Security Features
- **Encrypted Token Storage** - All OAuth2 tokens encrypted with AES-256
- **CSRF Protection** - State parameter validation prevents cross-site request forgery
- **Scope Validation** - OAuth2 scopes validated and enforced
- **Audit Logging** - Complete OAuth2 event logging for security compliance
- **Automatic Token Refresh** - Secure token refresh before expiration

### Security Best Practices
- All sensitive data encrypted at rest
- HTTPS required for OAuth2 flows
- Comprehensive input validation and sanitization
- Role-based access control (RBAC)
- Regular security audits and monitoring

## 📊 Status

### Current Status
- ✅ **Core Infrastructure** - Complete
- ✅ **API Integration** - Complete with 5+ real APIs
- ✅ **Authentication System** - Complete (JWT + OAuth2)
- ✅ **OAuth2 Implementation** - Complete with GitHub, Google, Slack support
- ✅ **Testing Framework** - 282 tests, 100% pass rate
- 🚧 **Frontend UI** - In progress
- ❌ **AI Integration** - Planned for Phase 4

### OAuth2 Status
- ✅ **OAuth2 Service** - Complete with dependency injection
- ✅ **OAuth2 Endpoints** - All 5 endpoints implemented
- ✅ **OAuth2 Security** - Encrypted storage, CSRF protection, audit logging
- ✅ **OAuth2 Testing** - 14 unit tests, 100% pass rate
- 🚧 **OAuth2 Integration Testing** - In progress
- ❌ **OAuth2 UI Components** - Planned

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Rules
- Follow the [User Rules](docs/user-rules.md) for development guidelines
- Write tests for all new functionality
- Update documentation for any API changes
- Ensure all tests pass before submitting PRs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs](docs/) directory
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Security**: Report security issues to security@apiq.com

---

**APIQ** - Democratizing API orchestration through natural language and AI.
# APIQ - Natural Language Workflow Orchestrator

A semi-agentic, low-code web application that enables non-technincal users to create complex workflows across multiple APIs using natural language and AI-powered automation. The platform prioritizes conversational workflow creation over complex API management.

## 🚀 Features

### Core Functionality
- **Natural Language Workflow Creation** - Chat-based interface for describing workflows in plain English
- **AI-Powered Orchestration** - OpenAI GPT-4 integration for intelligent workflow generation
- **Multi-API Integration** - Connect to any API with OpenAPI/Swagger documentation
- **Conversational Interface** - Friendly, helpful AI responses with clear explanations
- **Simplified User Experience** - Streamlined interface focused on workflow creation
- **Real-time Monitoring** - Live workflow execution monitoring and error handling
- **Comprehensive Audit Trails** - Complete logging for compliance and debugging

### Authentication & Security
- **JWT Authentication** - Secure token-based authentication with role-based access control
- **OAuth2 User Login** - Complete OAuth2 authentication flow for user login (Google, GitHub, Slack)
- **Enterprise SSO** - SAML/OIDC support for Okta, Azure AD, Google Workspace
- **OAuth2 API Integration** - Multi-provider OAuth2 authentication for API connections
- **OAuth2 Frontend Integration** - Complete UI components for OAuth2 flows and token management
- **Email Verification** - Secure email verification with automatic sign-in after verification
- **Password Reset** - Secure password reset flow with email-based token validation
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
- **Comprehensive Testing** - 318+ tests with 100% pass rate, organized into logical groups
- **Dependency Injection** - Testable service architecture
- **API Documentation** - Complete API reference documentation
- **Development Tools** - Hot reloading, linting, and debugging support

## 🎯 Platform Focus

### Natural Language First
APIQ has been refactored to prioritize **natural language workflow creation** over complex API management:

- **Chat Interface** - Primary method for creating workflows through conversation
- **Conversational AI** - Friendly, helpful responses that guide users through workflow creation
- **Simplified Navigation** - Streamlined interface that reduces complexity
- **Quick Examples** - Built-in examples to help users get started quickly
- **OAuth2 User Authentication** - Complete OAuth2 login flow for seamless user experience
- **Enterprise SSO** - SAML/OIDC support for enterprise identity providers

### Example Workflow Creation
Instead of manually configuring API connections and building workflows step-by-step, users can simply describe what they want:

```
User: "When a new GitHub issue is created, send a Slack notification to the team"
AI: "I'll help you create a workflow that monitors GitHub for new issues and sends Slack notifications. Let me set this up for you..."
```

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
- **Frontend Integration**: Complete UI components for OAuth2 flows
- **API Client**: Centralized client for OAuth2 operations
- **Type Safety**: Full TypeScript integration with error handling

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
   # Run all tests
   npm test
   
   # Run specific test groups
   npm run test:e2e:auth        # Authentication & SSO tests
   npm run test:e2e:workflows   # Workflow orchestration tests
   npm run test:e2e:connections # API connection management tests
   npm run test:e2e:ui          # User interface and navigation tests
   
   # Fast UI testing (Chromium only)
   npm run test:e2e:ui-fast     # Optimized UI tests with Chromium
   npm run test:e2e:ui-critical # Critical UI tests only (fastest)
   npm run test:e2e:ui-script   # Run with automatic server management
   ```

### Authentication Configuration

#### OAuth2 Configuration

To use OAuth2 authentication:

1. **Configure OAuth2 providers** in your environment variables:
   ```bash
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

#### Enterprise SSO Configuration (SAML/OIDC)

To use enterprise SSO authentication:

1. **Configure SAML/OIDC providers** in your environment variables:
   ```bash
   # Okta Configuration
   OKTA_ISSUER=https://your-domain.okta.com
   OKTA_CLIENT_ID=your_okta_client_id
   OKTA_CLIENT_SECRET=your_okta_client_secret
   
   # Azure AD Configuration
   AZURE_TENANT_ID=your_tenant_id
   AZURE_CLIENT_ID=your_azure_client_id
   AZURE_CLIENT_SECRET=your_azure_client_secret
   
   # Google Workspace Configuration
   GOOGLE_WORKSPACE_CLIENT_ID=your_google_workspace_client_id
   GOOGLE_WORKSPACE_CLIENT_SECRET=your_google_workspace_client_secret
   ```

2. **Create an API connection** with OAuth2 authentication through the UI:
   - Navigate to the dashboard
   - Click "Create Connection"
   - Select "OAuth2" as authentication type
   - Choose provider (GitHub, Google, Slack)
   - Enter client ID, client secret, and redirect URI
   - Configure required scopes

3. **Initiate OAuth2 flow** through the UI:
   - Go to the connection's OAuth2 setup page
   - Click "Authorize with [Provider]"
   - Complete the OAuth2 authorization flow
   - Tokens are automatically stored and managed

4. **Manage OAuth2 tokens**:
   - View connection status and token expiration
   - Refresh expired tokens automatically
   - Retrieve access tokens for API calls

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
- **OAuth2Service** - Core OAuth2 business logic with dependency injection (DI) for all dependencies (database, encryption, token generation, etc.)
- **API Endpoints** - Complete OAuth2 flow endpoints, all using DI for the OAuth2 service
- **Frontend Components** - Complete UI components for OAuth2 flows and token management
- **API Client** - Centralized client for OAuth2 operations with TypeScript support
- **Security Features** - Encrypted storage, CSRF protection, audit logging
- **Testing** - Comprehensive unit and integration tests with full dependency mocking via DI

> **Note:** The OAuth2 service and all related endpoints have been refactored to use dependency injection, improving testability, maintainability, and clarity. See `src/lib/auth/oauth2.ts` for details.

#### Frontend OAuth2 Components
- **OAuth2Manager** (`src/components/OAuth2Manager.tsx`) - Reusable component for OAuth2 management
- **API Client** (`src/lib/api/client.ts`) - Centralized API client with OAuth2 methods
- **OAuth2 Pages** - Complete flow from authorization to callback handling
- **Type Safety** - Full TypeScript integration with proper error handling

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

## 🆕 Authentication & Recovery Flows

APIQ now includes a complete set of user-friendly authentication and account recovery pages:

- **Forgot Password** (`/forgot-password`): Request a password reset email
- **Reset Password** (`/reset-password?token=...`): Set a new password using a secure token
- **Resend Verification** (`/resend-verification`): Request a new verification email
- **Signup, Login, and Verify**: All flows are linked and provide clear error recovery

See [UI_PAGES.md](docs/UI_PAGES.md) for full details, user experience flows, and error handling.

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

## Unit Test Status (as of 2024-06-30)

- All unit tests pass except for the ChatInterface component tests, which are documented with TODOs (see TESTING.md).
- Failing tests are not commented out or disabled; instead, they are clearly marked with context and next steps per project rules.

---

**APIQ** - Democratizing API orchestration through natural language and AI.
# APIQ - Natural Language API Orchestrator

APIQ is a platform that enables users to orchestrate multiple APIs using natural language. It automatically translates user requests into executable workflows by analyzing available API endpoints and generating the necessary code.

## 🚀 Features

- **Natural Language Processing**: Describe workflows in plain English
- **Multi-API Integration**: Connect and manage multiple external APIs
- **AI-Powered Workflow Generation**: Automatically translate requests to executable workflows
- **Enterprise-Grade Security**: Comprehensive security and compliance features
- **Real-time Execution**: Monitor and manage workflow execution
- **OpenAPI Integration**: Automatic endpoint discovery from OpenAPI specifications

## 🏗️ Architecture

- **Frontend**: Next.js 14+ with React 18+ and TypeScript
- **Backend**: Next.js API routes with Node.js 18+
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: NextAuth.js with JWT tokens
- **AI**: OpenAI GPT-4 for natural language processing
- **Testing**: Jest with real database integration (no mocks)

## 🛠️ Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 14.0 or higher
- npm 8.0.0 or higher

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

3. **Environment setup**
   ```bash
   cp env.example .env.local
   ```
   
   Configure your `.env.local` with your database and API credentials.

4. **Database setup**
   ```bash
   # Create database
   createdb apiq_dev
   
   # Run migrations
   npx prisma migrate dev
   
   # Generate Prisma client
   npx prisma generate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## 🧪 Testing

We follow a **strict no-mock-data policy** for database and authentication operations. All tests use real database connections and real authentication flows.

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test categories
npm test -- --testPathPattern="unit"
npm test -- --testPathPattern="integration"
npm test -- --testPathPattern="e2e"

# Run specific file
npm test -- --testPathPattern="openaiService"
```

### Test Philosophy

- **Real Database**: All tests use real PostgreSQL connections
- **Real Authentication**: Real users with bcrypt-hashed passwords
- **Real JWTs**: Actual login flows generate real tokens
- **No Mocks**: Database and authentication operations are never mocked
- **External Services**: Only external APIs (OpenAI, etc.) are mocked when necessary
- **Structured Logging**: Safe, non-circular logging patterns prevent test failures

### Test Coverage

#### High Coverage Areas (>80%)
- **Services**: OpenAI service (89.55% lines, 100% functions)
- **Utilities**: Encryption (91.48% lines), Logger (87.17% lines)
- **API Parser**: 100% lines and functions
- **RBAC**: 100% lines and functions
- **Database**: 98.55% lines and functions
- **Middleware**: Error handling (80.72% lines), Rate limiting (82.45% lines)

#### Test Statistics
- **Total test suites**: 15
- **Total tests**: 203
- **Pass rate**: 100%
- **Coverage**: 60.12% lines (core business logic >80%)

### Recent Testing Improvements (2024-06)

- **Comprehensive Unit Testing**: Complete coverage for utilities, middleware, and services
- **Structured Logging**: Refactored logging to prevent circular structure errors
- **Test Utilities**: Robust helper utilities for creating test data and managing test lifecycle
- **Middleware Testing**: Full coverage for error handling and rate limiting middleware
- **Service Testing**: Enhanced OpenAI service testing with 89%+ coverage and proper mocking
- **API Parser Testing**: 100% coverage for OpenAPI specification parsing utilities

**Testing Philosophy:**
- Integration/E2E tests use real data, real DB, and real JWTs (no mocks)
- Unit tests mock external services and DB for logic and error handling
- All logging follows safe, structured patterns to prevent circular references

## 📚 Documentation

- [Development Guide](docs/DEVELOPMENT_GUIDE.md) - Development setup and guidelines
- [Testing Guide](docs/TESTING.md) - Testing strategy and best practices
- [API Reference](docs/API_REFERENCE.md) - API documentation
- [Architecture](docs/ARCHITECTURE.md) - System architecture overview
- [Implementation Plan](docs/implementation-plan.md) - Detailed implementation roadmap
- [Security Guide](docs/SECURITY_GUIDE.md) - Security guidelines and best practices

## 🔒 Security

- **Authentication**: JWT-based authentication with NextAuth.js
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: AES-256 encryption for sensitive data
- **Input Validation**: Comprehensive input sanitization
- **Audit Logging**: Complete audit trail for all operations

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   # Set production environment variables
   NODE_ENV=production
   DATABASE_URL=your-production-db-url
   NEXTAUTH_SECRET=your-secret-key
   OPENAI_API_KEY=your-openai-key
   ```

2. **Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

3. **Build and Deploy**
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

```bash
# Build Docker image
docker build -t apiq .

# Run container
docker run -p 3000:3000 apiq
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow our coding standards and testing requirements
4. Ensure all tests pass (including real database integration)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Testing**: Real database integration, no mocks for core functionality
- **Documentation**: Update docs for new features
- **Security**: Follow security guidelines

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs](docs/) directory
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🗺️ Roadmap

See our [Implementation Plan](docs/implementation-plan.md) for detailed roadmap and upcoming features.

### Current Phase: Foundation
- ✅ Project setup and scaffolding
- ✅ Database schema and migrations
- ✅ Authentication system
- ✅ Basic API structure
- ✅ Real database integration testing
- ✅ No-mock-data policy implementation

### Next Phase: External API Validation
- 🔄 Test API connections (Petstore, JSONPlaceholder, etc.)
- 🔄 Real OpenAPI integration
- 🔄 Authentication flow testing
- 🔄 Performance and reliability testing

---

**Built with ❤️ using Next.js, TypeScript, and OpenAI**
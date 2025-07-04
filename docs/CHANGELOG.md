# Changelog

All notable changes to APIQ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup and scaffolding
- Basic Next.js application structure
- TypeScript configuration
- Prisma database integration
- NextAuth.js authentication setup
- OpenAI integration for AI-powered workflows
- API connection management system
- Workflow execution engine
- Audit logging system
- Comprehensive documentation
- **No Mock Data Policy**: Implemented strict no-mock-data policy for database and authentication operations
- **Real Database Integration**: All integration tests now use real PostgreSQL connections
- **Real Authentication Testing**: Tests use real users with bcrypt-hashed passwords and actual JWT tokens
- **Enhanced Test Coverage**: Improved test coverage for critical authentication and database operations
- **Test Data Management**: Proper test data cleanup and unique naming to prevent conflicts
- **Jest Configuration**: Updated Jest setup to use real database instead of test database
- **Documentation Updates**: Comprehensive updates to testing guides and development documentation
- **Comprehensive Unit Testing**: Added complete unit test coverage for utilities, middleware, and services
- **Structured Logging Refactoring**: Refactored logging to prevent circular structure errors and ensure safe logging
- **Test Utilities**: Created robust test helper utilities for creating test data and managing test lifecycle
- **Middleware Testing**: Added comprehensive tests for error handling and rate limiting middleware
- **Service Testing**: Enhanced OpenAI service testing with 89%+ coverage and proper mocking
- **API Parser Testing**: Added 100% coverage for OpenAPI specification parsing utilities
- **Phase 2.3 Authentication Flow Testing** - ✅ COMPLETED
  - API Key authentication testing with Stripe integration
  - OAuth2 flow implementation with JWT tokens
  - Comprehensive security validation
  - **100% test success rate achieved (206/206 tests passing)**
  - All authentication endpoints working correctly
  - RBAC implementation fully functional
  - Comprehensive audit logging implemented
- **OpenAPI Caching System** - ✅ COMPLETED
  - In-memory OpenAPI spec cache with TTL and max size limits
  - Configurable cache settings via environment variables
  - Cache compression for large specifications
  - Admin endpoint for cache statistics and purging
  - Integration with connections API for improved performance
  - Comprehensive unit tests for cache and service layers
  - Cache guardrails to prevent OpenAPI spec mocks in tests
- **Integration Test Authentication Fixes** - ✅ COMPLETED
  - Fixed authentication in `/api/connections` integration tests
  - Updated test expectations to match current API response structure
  - Ensured all connection-related tests use proper authentication helpers
  - Verified authentication rejection for unauthenticated requests
  - All 88 integration tests now passing with proper authentication

### Changed
- N/A
- **Integration Tests**: Refactored all integration tests to remove database and authentication mocks
- **Test Environment**: Updated test environment to use real development database
- **Authentication Flow**: Tests now use real login endpoints to generate valid JWTs
- **Database Operations**: All tests use real Prisma client operations instead of mocks
- **Error Handling**: Improved error handling in tests to match actual API behavior
- **Test Cleanup**: Enhanced test data cleanup to prevent conflicts between test runs
- **Logging Implementation**: Refactored logging to use safe, structured patterns and prevent circular references
- **OpenAI Service**: Updated service to log only safe, non-circular fields and improved error handling
- **Test Coverage**: Significantly improved test coverage across utilities, middleware, and services
- **Test Documentation**: Updated testing documentation to reflect current practices and coverage metrics
- **Test Success Rate**: Improved from 88.8% to 100% (206/206 tests passing)
- **Test Isolation**: Enhanced with unique identifiers and comprehensive cleanup
- **Authentication Flow**: Complete implementation with all auth types tested
- **Security Validation**: Comprehensive security testing completed
- **OpenAPI Service**: Enhanced with caching capabilities and improved error handling
- **Test Guardrails**: Enforced no-mock policy for OpenAPI specifications in tests
- **API Response Structure**: Updated `/api/connections` GET endpoint to return structured data with metadata
  - Response now includes `data.connections` array, `total`, `active`, and `failed` counts
  - Maintains backward compatibility while providing enhanced metadata

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A
- **Database Connection**: Fixed Jest/Prisma environment issues in test setup
- **Authentication Tests**: Fixed auth integration tests to use real authentication flow
- **RBAC Tests**: Fixed RBAC integration tests to use real users and permissions
- **Health Tests**: Fixed health integration tests to use real database health checks
- **Test Isolation**: Improved test isolation to prevent data conflicts
- **Environment Variables**: Fixed test environment configuration
- **Circular Logging**: Fixed circular structure errors in logging by implementing safe logging patterns
- **Test Mocking**: Fixed Jest mocking issues for external dependencies like Winston and axios
- **Coverage Reporting**: Fixed test coverage reporting to accurately reflect current test coverage
- **Test Failures**: Resolved all test failures related to token refresh, cleanup, and mocking
- **Test Infrastructure Issues**: Resolved all test isolation conflicts
- **Authentication Endpoint Issues**: Fixed "Internal server error" problems
- **RBAC Integration Tests**: All RBAC tests now passing
- **Health Check Tests**: All health check tests now passing
- **Parser Unit Tests**: Fixed mocking issues with axios and SwaggerParser
- **Real API Connections**: Resolved unique constraint violations
- **OpenAPI Cache**: Fixed cache initialization and cleanup issues
- **Test Guardrails**: Resolved issues with mock detection in test environment
- **Connection Integration Tests**: Fixed authentication issues in `/api/connections` tests
  - Resolved "Authentication required" errors in tests using `createAuthenticatedRequest`
  - Updated test expectations to match current API response structure (`data.data.connections`)
  - Ensured proper authentication flow for all connection-related endpoints
  - Verified authentication rejection tests work correctly

### Security
- N/A

## [0.1.0] - 2024-01-01

### Added
- **Core Application Structure**
  - Next.js 14+ application with App Router
  - TypeScript configuration with strict mode
  - Tailwind CSS for styling
  - ESLint and Prettier configuration

- **Database Layer**
  - PostgreSQL database with Prisma ORM
  - Initial database schema with User, ApiConnection, Workflow models
  - Database migration system
  - Connection pooling and optimization

- **Authentication System**
  - NextAuth.js integration
  - Email/password authentication
  - JWT token management
  - Session handling
  - Role-based access control (User, Admin, Auditor)

- **API Management**
  - API connection CRUD operations
  - OpenAPI/Swagger specification parsing
  - Endpoint discovery and management
  - Authentication configuration (API Key, Bearer Token, OAuth 2.0, Basic Auth)
  - API testing and validation

- **AI Integration**
  - OpenAI GPT-4 integration
  - Function calling for API orchestration
  - Natural language to workflow translation
  - Dynamic function generation from OpenAPI specs
  - Context management and conversation handling

- **Workflow Engine**
  - Multi-step workflow execution
  - Data flow between API calls
  - Error handling and retry logic
  - Workflow templates and libraries
  - Real-time execution monitoring

- **Security Features**
  - AES-256 encryption for sensitive data
  - Secure credential storage
  - Input validation and sanitization
  - Rate limiting and DDoS protection
  - Comprehensive audit logging

- **User Interface**
  - Responsive dashboard design
  - API explorer with endpoint testing
  - Chat interface for natural language workflows
  - Workflow builder with visual components
  - Real-time execution monitoring

- **Monitoring & Logging**
  - Structured logging with Winston
  - Performance monitoring and metrics
  - Error tracking and alerting
  - Audit trail for compliance
  - Health check endpoints

- **Documentation**
  - Comprehensive README with setup instructions
  - Architecture documentation
  - Development guide with coding standards
  - User guide with feature explanations
  - API reference documentation
  - Security guide with best practices
  - Deployment guide for various environments
  - Contributing guidelines

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Implemented secure authentication with NextAuth.js
- Added encryption for API credentials
- Configured secure headers and HTTPS
- Implemented input validation and sanitization
- Added rate limiting and DDoS protection

## [0.0.1] - 2024-01-01

### Added
- **Project Initialization**
  - Repository setup
  - Basic project structure
  - Development environment configuration
  - Initial documentation

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## Version History

### Version Numbering

APIQ follows [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

### Release Types

- **Major Releases** (X.0.0): Significant new features, breaking changes
- **Minor Releases** (X.Y.0): New features, backwards-compatible
- **Patch Releases** (X.Y.Z): Bug fixes, security updates
- **Pre-releases** (X.Y.Z-alpha/beta/rc): Testing versions

### Release Schedule

- **Major Releases**: Quarterly or as needed for significant changes
- **Minor Releases**: Monthly for new features
- **Patch Releases**: Weekly for bug fixes and security updates
- **Pre-releases**: As needed for testing major changes

## Migration Guides

### Upgrading from v0.0.x to v0.1.0

This is the initial release, so no migration is required. However, if you're setting up from scratch:

1. **Database Setup**
   ```bash
   # Create database
   createdb apiq_production
   
   # Run migrations
   npx prisma migrate deploy
   
   # Generate Prisma client
   npx prisma generate
   ```

2. **Environment Configuration**
   ```env
   # Required environment variables
   DATABASE_URL="postgresql://user:pass@host:port/dbname"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="https://your-domain.com"
   OPENAI_API_KEY="sk-your-openai-key"
   ```

3. **Build and Deploy**
   ```bash
   # Install dependencies
   npm ci --only=production
   
   # Build application
   npm run build
   
   # Start production server
   npm start
   ```

## Breaking Changes

### v0.1.0
- Initial release - no breaking changes

## Deprecation Policy

### Deprecation Timeline
- **Deprecation Notice**: Feature marked as deprecated in changelog
- **6 Months**: Deprecated feature continues to work with warnings
- **12 Months**: Deprecated feature removed in major release

### Current Deprecations
- None at this time

## Security Advisories

### Security Update Process
1. **Discovery**: Security issue identified
2. **Assessment**: Severity and impact evaluated
3. **Fix**: Security patch developed and tested
4. **Release**: Patch released with security advisory
5. **Notification**: Users notified of security update

### Security Contacts
- **Email**: security@apiq.com
- **PGP Key**: [security-pgp-key.asc](https://apiq.com/security-pgp-key.asc)
- **Responsible Disclosure**: [SECURITY.md](../SECURITY.md)

## Support

### Version Support
- **Current Version**: Full support
- **Previous Major Version**: Security updates only
- **Older Versions**: No support

### Support Timeline
- **v0.1.x**: Supported until v1.0.0 release
- **v0.0.x**: No longer supported

### Getting Help
- **Documentation**: [docs/](../docs/)
- **Issues**: [GitHub Issues](https://github.com/apiq/apiq/issues)
- **Discussions**: [GitHub Discussions](https://github.com/apiq/apiq/discussions)
- **Email**: support@apiq.com

---

## Contributing to Changelog

When contributing to the changelog:

1. **Add entries** under the appropriate section
2. **Use clear, concise language**
3. **Include issue/PR numbers** when relevant
4. **Group related changes** together
5. **Follow the established format**

### Changelog Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security-related changes

### Example Entry

```markdown
### Added
- New user dashboard with analytics (#123)
- API rate limiting configuration (#124)

### Fixed
- Resolve authentication token refresh issue (#125)
- Fix workflow execution timeout (#126)
```

---

*This changelog is maintained by the APIQ team and community contributors.* 
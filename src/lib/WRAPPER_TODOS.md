# Wrapper Implementation TODOs

This document tracks third-party libraries that need wrapper implementation for better testing and maintainability.

## High Priority Wrappers (Core Business Logic)

### ✅ Completed
- `src/lib/openaiWrapper.ts` - OpenAI client wrapper
- `src/lib/emailWrapper.ts` - Nodemailer wrapper  
- `src/lib/queueWrapper.ts` - PgBoss wrapper
- `src/lib/swaggerWrapper.ts` - Swagger-parser wrapper

### 🔄 In Progress
None currently

### 📋 TODO: High Priority

#### 1. HTTP Client Wrapper (`src/lib/httpWrapper.ts`)
**Library**: `axios`
**Files using it**:
- `src/services/openaiService.ts`
- `src/services/openApiService.ts` 
- `src/lib/api/parser.ts`
- `tests/unit/services/openaiService.test.ts`

**Reason**: HTTP client is used across multiple services and needs consistent mocking for tests.

#### 2. Authentication Wrapper (`src/lib/authWrapper.ts`)
**Libraries**: `bcryptjs`, `jsonwebtoken`
**Files using them**:
- `src/lib/auth/session.ts`
- `src/lib/auth/sso-providers.ts`
- `pages/api/auth/register.ts`
- `pages/api/auth/verify.ts`
- `pages/api/auth/reset-password.ts`

**Reason**: Authentication is critical security functionality that needs reliable testing.

#### 3. Encryption Wrapper (`src/lib/encryptionWrapper.ts`)
**Library**: `crypto-js`
**Files using it**:
- `src/lib/secrets/secretsVault.ts`
- `src/utils/encryption.ts`

**Reason**: Encryption is security-critical and needs consistent behavior across environments.

## Medium Priority Wrappers

### 📋 TODO: Medium Priority

#### 4. Logging Wrapper (`src/lib/loggingWrapper.ts`)
**Library**: `winston`
**Files using it**:
- `src/utils/logger.ts`

**Reason**: Logging is used throughout the application and should be mockable for tests.

#### 5. Database Wrapper (`src/lib/databaseWrapper.ts`)
**Library**: `@prisma/client`
**Files using it**:
- `pages/api/chat/index.ts`
- Multiple API routes and services

**Reason**: Database access is core functionality, but Prisma already has good testing utilities.

## Low Priority Wrappers

### 📋 TODO: Low Priority

#### 6. NextAuth Wrapper (`src/lib/nextAuthWrapper.ts`)
**Libraries**: `next-auth`, `@next-auth/prisma-adapter`
**Files using them**:
- `src/lib/auth/sso-providers.ts`

**Reason**: NextAuth is already well-designed for testing, but could benefit from consistent interface.

#### 7. Crypto Wrapper (`src/lib/cryptoWrapper.ts`)
**Library**: Node.js `crypto` module
**Files using it**:
- `src/lib/api/parser.ts`
- `pages/api/auth/register.ts`
- `pages/api/auth/reset-password.ts`
- `pages/api/auth/resend-verification.ts`

**Reason**: Node.js crypto is stable and well-tested, but wrapper could provide consistent interface.

## Implementation Guidelines

### Priority Order
1. **HTTP Client Wrapper** - Used across multiple services
2. **Authentication Wrapper** - Security critical
3. **Encryption Wrapper** - Security critical
4. **Logging Wrapper** - Used throughout app
5. **Database Wrapper** - Core functionality
6. **NextAuth Wrapper** - Authentication framework
7. **Crypto Wrapper** - Node.js built-in

### Template Usage
Use `src/lib/wrapperTemplate.ts` as the base template for all new wrappers.

### Testing Strategy
- Mock the wrapper in tests, not the underlying library
- Use `jest.mock()` to mock the wrapper module
- Import the service under test AFTER setting up mocks
- Clear require cache if needed for fresh imports

### Migration Strategy
1. Create wrapper following template pattern
2. Update service to use wrapper instead of direct import
3. Update tests to mock wrapper instead of library
4. Verify all tests pass
5. Update documentation

## Notes

- **React/Next.js libraries** (like `next/navigation`, `react`) don't need wrappers as they're framework-specific
- **Testing libraries** (like `@testing-library/react`, `@playwright/test`) don't need wrappers
- **Build tools** (like ESLint configs) don't need wrappers
- **Type definitions** don't need wrappers

## Status Tracking

- [x] OpenAI wrapper implemented
- [x] Email wrapper implemented  
- [x] Queue wrapper implemented
- [x] Swagger wrapper implemented
- [ ] HTTP client wrapper
- [ ] Authentication wrapper
- [ ] Encryption wrapper
- [ ] Logging wrapper
- [ ] Database wrapper
- [ ] NextAuth wrapper
- [ ] Crypto wrapper 
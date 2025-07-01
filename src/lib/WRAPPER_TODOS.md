# Wrapper Implementation TODOs

This document tracks third-party libraries that need wrapper implementation for better testing and maintainability.

## High Priority Wrappers (Core Business Logic)

### ✅ Completed
- `src/lib/openaiWrapper.ts` - OpenAI client wrapper
- `src/lib/emailWrapper.ts` - Nodemailer wrapper  
- `src/lib/queueWrapper.ts` - PgBoss wrapper
- `src/lib/swaggerWrapper.ts` - Swagger-parser wrapper

**Status**: All high priority wrappers have been implemented and tested successfully.

### 🔄 In Progress
None currently

### 📋 TODO: Medium Priority

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

## Low Priority Wrappers

### 📋 TODO: Low Priority

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

### Advanced Testing Patterns

#### Dynamic Import Pattern (for complex mocking scenarios)
For services that use multiple third-party dependencies (like QueueService), use the dynamic import pattern:

```typescript
// 1. Set up mocks first
jest.doMock('../../../../src/lib/queueWrapper', () => ({
  getQueueClient: jest.fn().mockReturnValue(mockQueueClient),
}));

// 2. Dynamically import after mocks
const queueServiceModule = await import('../../../../src/lib/queue/queueService');
QueueService = queueServiceModule.QueueService;
```

This pattern ensures mocks are applied before the module under test is loaded, preventing hoisting issues.

#### Type-Only Imports
Use type-only imports for test data structures to avoid runtime dependencies:

```typescript
import type { QueueJob, QueueConfig } from '../../../../src/lib/queue/queueService';
```

### Migration Strategy
1. Create wrapper following template pattern
2. Update service to use wrapper instead of direct import
3. Update tests to mock wrapper instead of library
4. Verify all tests pass
5. Update documentation

## Recent Improvements

### QueueService Testing Enhancement
- **Issue**: QueueService tests were failing due to Jest hoisting and pg-boss mocking complexity
- **Solution**: Implemented dynamic import pattern with `jest.doMock()` and `await import()`
- **Result**: All 36 QueueService tests now pass consistently
- **Files Updated**: `tests/unit/lib/queue/queueService.test.ts`

### Linter Warning Resolution
- **Issue**: TypeScript linter warnings about missing types and incorrect type annotations
- **Solution**: Added type-only imports and removed problematic type annotations for dynamically imported modules
- **Result**: Clean linter output with only acceptable `any` type warnings for test context

## Test-Specific Issues

### 📋 TODO: Dashboard Test Memory Issue
**Issue**: `tests/unit/app/dashboard/page.test.tsx` fails with "JavaScript heap out of memory" error
**Files affected**:
- `tests/unit/app/dashboard/page.test.tsx`
- `src/app/dashboard/page.tsx` (may need optimization)

**Potential causes**:
- Large component rendering (510+ lines)
- Infinite loops in component logic
- Memory leaks in test setup/teardown
- Complex API client mocking

**Next steps**:
- [ ] Investigate dashboard component for memory leaks
- [ ] Optimize test setup/teardown
- [ ] Consider splitting large component into smaller pieces
- [ ] Add memory profiling to identify exact cause

**Priority**: Medium (affects test suite completion)

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
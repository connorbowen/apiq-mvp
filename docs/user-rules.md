# APIQ User Rules

## Overview

This document defines the specific development rules, constraints, and guidelines for the APIQ project. These rules must be followed by all contributors and AI assistants working on the project to ensure consistency, quality, and maintainability.

## Table of Contents

1. [Project Structure Rules](#project-structure-rules)
2. [Development Workflow Rules](#development-workflow-rules)
3. [Branch Management Rules](#branch-management-rules)
4. [Task Completion Rules](#task-completion-rules)
5. [Code Quality Rules](#code-quality-rules)
6. [Security Rules](#security-rules)
7. [Database Rules](#database-rules)
8. [API Development Rules](#api-development-rules)
9. [Testing Rules](#testing-rules)
10. [Documentation Rules](#documentation-rules)
11. [Deployment Rules](#deployment-rules)
12. [Compliance Rules](#compliance-rules)

## Project Structure Rules

### Folder Organization
- **`/components`** → React UI components only
- **`/lib`** → Shared utilities, helpers, and services
- **`/pages/api`** → Next.js API routes (serverless functions)
- **`/prisma`** → Database schema and migrations only
- **`/docs`** → Project documentation
- **`/tests`** → Test files (unit, integration, e2e)
- **`/public`** → Static assets only

### File Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Utilities**: camelCase (`apiUtils.ts`)
- **Pages**: kebab-case (`user-profile.tsx`)
- **API Routes**: kebab-case (`api-connections.ts`)
- **Database**: snake_case (migration files)

### Import Organization
```typescript
// 1. External libraries
import React from 'react';
import { NextApiRequest, NextApiResponse } from 'next';

// 2. Internal utilities
import { validateRequest } from '@/lib/validation';
import { prisma } from '@/lib/database/client';

// 3. Types and interfaces
import { User, ApiConnection } from '@/types';

// 4. Components
import { UserProfile } from '@/components/UserProfile';
```

## Development Workflow Rules

### Git Workflow
1. **Branch Naming**: Use conventional prefixes
   - `feature/` - New features
   - `fix/` - Bug fixes
   - `docs/` - Documentation updates
   - `refactor/` - Code refactoring
   - `test/` - Adding or updating tests
   - `chore/` - Maintenance tasks

2. **Commit Messages**: Follow Conventional Commits
   ```
   <type>[optional scope]: <description>
   
   [optional body]
   
   [optional footer(s)]
   ```

3. **Pull Request Process**
   - Create feature branch from `main`
   - Make focused, atomic commits
   - Write descriptive PR description
   - Include tests for new functionality
   - Request review from at least one maintainer

### Code Review Requirements
- All code must be reviewed before merging
- Address all review comments
- Ensure tests pass
- Verify documentation is updated
- Check for security implications

## Branch Management Rules

### Step-by-Step Development Process
1. **Create Feature Branch**: Each development step must be on its own branch
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/step-description
   ```

2. **Development**: Work on the specific step/feature
   - Make focused, atomic commits
   - Follow coding standards
   - Write tests for new functionality
   - Update documentation as needed

3. **Testing**: Ensure all tests pass
   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Pull Request**: Create PR for the step
   - Clear description of what was accomplished
   - Link to relevant documentation sections
   - Include testing results
   - Request review

5. **Review & Merge**: After approval and merge
   - Delete the feature branch
   - Update task tracking
   - Mark step as complete

### Branch Naming Convention
- **Feature Steps**: `feature/step-{number}-{description}`
  - Example: `feature/step-1-prisma-schema-setup`
  - Example: `feature/step-2-nextauth-configuration`
  - Example: `feature/step-3-api-connection-crud`

- **Bug Fixes**: `fix/{description}`
  - Example: `fix/authentication-token-refresh`

- **Documentation**: `docs/{description}`
  - Example: `docs/api-reference-update`

### Branch Lifecycle
1. **Creation**: Branch from `main` when starting a new step
2. **Development**: Work exclusively on the step
3. **Testing**: Ensure all tests pass before PR
4. **Review**: Get approval from maintainer
5. **Merge**: Merge to `main` after approval
6. **Cleanup**: Delete branch after successful merge
7. **Completion**: Mark step as complete in tracking

## Task Completion Rules

### Completion Criteria
A task/step is considered complete when:

1. **Code Implementation**
   - All required functionality is implemented
   - Code follows project standards
   - No linting errors
   - Build passes successfully

2. **Testing**
   - Unit tests written and passing
   - Integration tests written and passing
   - Test coverage meets requirements (80%+)
   - Manual testing completed

3. **Documentation**
   - Code is properly documented
   - README updated if needed
   - API documentation updated
   - User guide updated if applicable

4. **Review Process**
   - Pull request created
   - Code review completed
   - All feedback addressed
   - Approved by maintainer

5. **Merge & Deployment**
   - Successfully merged to `main`
   - Feature branch deleted
   - No merge conflicts
   - Deployment successful (if applicable)

### Completion Tracking
1. **Mark as Complete**: Only after successful merge to `main`
2. **Update Documentation**: Reference completed step in docs
3. **Update Implementation Plan**: Mark step as complete in `/docs/implementation-plan.md`
4. **Create Next Branch**: Start next step with new branch

### Completion Checklist
Before marking a step as complete:

- [ ] All code implemented and tested
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Pull request merged to `main`
- [ ] Feature branch deleted
- [ ] Implementation plan updated
- [ ] Next step identified and planned

### Step Dependencies
1. **Sequential Steps**: Some steps must be completed in order
   - Database schema before API routes
   - Authentication before protected routes
   - Core functionality before advanced features

2. **Parallel Steps**: Some steps can be developed in parallel
   - UI components and API routes
   - Documentation and testing
   - Different feature modules

3. **Dependency Management**: Track step dependencies
   - Document which steps depend on others
   - Plan development order accordingly
   - Avoid blocking dependencies when possible

## Code Quality Rules

### TypeScript Standards
1. **Strict Mode**: Always use strict TypeScript configuration
2. **Type Definitions**: Define interfaces for all complex objects
3. **No Any Types**: Avoid `any` type, use proper typing
4. **Null Safety**: Use optional chaining and nullish coalescing

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

const user = await getUser(id);
if (user?.email) {
  sendEmail(user.email);
}

// ❌ Bad
const user: any = await getUser(id);
if (user && user.email) {
  sendEmail(user.email);
}
```

### React Component Rules
1. **Functional Components**: Use functional components with hooks
2. **Props Interface**: Define props interface for all components
3. **Error Boundaries**: Wrap components in error boundaries
4. **Performance**: Use React.memo, useCallback, useMemo appropriately

```typescript
// ✅ Good
interface UserProfileProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = React.memo(({
  user,
  onEdit,
  className
}) => {
  const handleEdit = useCallback(() => {
    onEdit?.(user);
  }, [user, onEdit]);

  return (
    <div className={className}>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      {onEdit && (
        <button onClick={handleEdit}>Edit</button>
      )}
    </div>
  );
});
```

### Error Handling
1. **Try-Catch Blocks**: Wrap all external calls in try-catch
2. **Error Logging**: Log errors with context (never secrets)
3. **User-Friendly Messages**: Provide clear error messages to users
4. **Graceful Degradation**: Handle errors gracefully

```typescript
// ✅ Good
export const createApiConnection = async (data: CreateApiConnectionInput) => {
  try {
    // Validate input
    const validated = createApiConnectionSchema.parse(data);
    
    // Test connection
    await testApiConnection(validated);
    
    // Create connection
    const connection = await prisma.apiConnection.create({
      data: {
        ...validated,
        authConfig: encryptData(JSON.stringify(validated.authConfig))
      }
    });
    
    return { success: true, data: connection };
  } catch (error) {
    logger.error('Failed to create API connection', {
      error: error.message,
      userId: getCurrentUserId(),
      apiName: data.name
    });
    
    if (error instanceof ValidationError) {
      return { success: false, error: 'Invalid input data' };
    }
    
    return { success: false, error: 'Failed to create API connection' };
  }
};
```

## Security Rules

### Authentication & Authorization
1. **Session Validation**: Always validate user sessions
2. **Role-Based Access**: Check user permissions for all operations
3. **Input Validation**: Validate and sanitize all inputs
4. **Secure Headers**: Use security headers in all responses

```typescript
// ✅ Good
export const requireAuth = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  return session;
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await requireAuth(req, res);
    
    if (!allowedRoles.includes(session.user.role)) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
    
    return session;
  };
};
```

### Data Protection
1. **Encryption**: Encrypt all sensitive data
2. **Secure Storage**: Never store secrets in plain text
3. **API Keys**: Rotate API keys regularly
4. **Audit Logging**: Log all sensitive operations

```typescript
// ✅ Good
export const storeApiCredentials = async (
  userId: string,
  apiId: string,
  credentials: ApiCredentials
) => {
  const encryptedCredentials = encryptData(JSON.stringify(credentials));
  
  await prisma.apiCredentials.create({
    data: {
      userId,
      apiId,
      encryptedData: encryptedCredentials,
      keyId: generateKeyId(),
      createdAt: new Date()
    }
  });
};
```

### Input Validation
1. **Schema Validation**: Use Zod for all input validation
2. **Sanitization**: Sanitize all user inputs
3. **Type Checking**: Validate types at runtime
4. **Length Limits**: Enforce reasonable length limits

```typescript
// ✅ Good
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_]+$/),
  password: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
});

export const validateUserInput = (data: unknown) => {
  return createUserSchema.parse(data);
};
```

## Database Rules

### Schema Changes
1. **Migrations Required**: All schema changes must include migrations
2. **No Direct Changes**: Never modify schema directly in production
3. **Backup First**: Always backup before major schema changes
4. **Test Migrations**: Test migrations in staging first

```bash
# ✅ Good - Create migration
npx prisma migrate dev --name add_user_role_field

# ❌ Bad - Direct schema modification
# Manually editing schema.prisma without migration
```

### Query Optimization
1. **Indexing**: Add indexes for frequently queried fields
2. **Selective Queries**: Only select needed fields
3. **Pagination**: Use pagination for large datasets
4. **Connection Pooling**: Use connection pooling

```typescript
// ✅ Good
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    role: true
  },
  where: {
    role: 'USER',
    createdAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  },
  take: 20,
  skip: 0,
  orderBy: {
    createdAt: 'desc'
  }
});

// ❌ Bad
const users = await prisma.user.findMany({
  where: { role: 'USER' }
}); // No pagination, selects all fields
```

### Data Integrity
1. **Foreign Keys**: Use proper foreign key relationships
2. **Cascading**: Define appropriate cascade behaviors
3. **Constraints**: Use database constraints for data integrity
4. **Transactions**: Use transactions for multi-step operations

```typescript
// ✅ Good
export const deleteUserWithData = async (userId: string) => {
  return await prisma.$transaction(async (tx) => {
    // Delete related data first
    await tx.auditLog.deleteMany({
      where: { userId }
    });
    
    await tx.apiConnection.deleteMany({
      where: { userId }
    });
    
    // Delete user last
    await tx.user.delete({
      where: { id: userId }
    });
  });
};
```

## API Development Rules

### API Route Structure
1. **Consistent Format**: Follow consistent API response format
2. **Error Handling**: Proper error handling and status codes
3. **Validation**: Validate all inputs
4. **Documentation**: Document all API endpoints

```typescript
// ✅ Good
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<User>>
) {
  try {
    // 1. Authentication
    const session = await requireAuth(req, res);
    
    // 2. Method validation
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        timestamp: new Date()
      });
    }
    
    // 3. Input validation
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date()
      });
    }
    
    // 4. Business logic
    const user = await getUserById(id, session.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date()
      });
    }
    
    // 5. Success response
    return res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date()
    });
    
  } catch (error) {
    // 6. Error handling
    logger.error('API Error', {
      endpoint: '/api/users/[id]',
      method: req.method,
      error: error.message,
      userId: session?.user?.id
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date()
    });
  }
}
```

### OpenAPI Integration
1. **Spec Validation**: Always validate OpenAPI specifications
2. **Function Generation**: Generate functions from OpenAPI specs
3. **Error Handling**: Handle OpenAPI parsing errors gracefully
4. **Versioning**: Support multiple OpenAPI versions

```typescript
// ✅ Good
export const parseAndValidateOpenApi = async (url: string) => {
  try {
    const api = await SwaggerParser.parse(url);
    
    // Validate required fields
    if (!api.paths || Object.keys(api.paths).length === 0) {
      throw new Error('No endpoints found in OpenAPI specification');
    }
    
    if (!api.info || !api.info.title) {
      throw new Error('Missing required OpenAPI info fields');
    }
    
    return api;
  } catch (error) {
    logger.error('OpenAPI parsing failed', {
      url,
      error: error.message
    });
    
    throw new Error(`Failed to parse OpenAPI spec: ${error.message}`);
  }
};
```

### Rate Limiting
1. **API Limits**: Implement rate limiting for all APIs
2. **User Limits**: Limit requests per user
3. **IP Limits**: Limit requests per IP address
4. **Graceful Degradation**: Handle rate limit errors gracefully

```typescript
// ✅ Good
import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.session?.user?.id || req.ip;
  }
});
```

## Testing Rules

### Test Coverage
1. **Minimum Coverage**: Maintain 80% code coverage
2. **Critical Paths**: 100% coverage for critical business logic
3. **New Features**: All new features must include tests
4. **Regression Testing**: Ensure no regression in existing functionality

### Test Structure
1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test API endpoints and database operations
3. **End-to-End Tests**: Test complete user workflows
4. **Performance Tests**: Test performance under load

```typescript
// ✅ Good - Unit Test
describe('User Validation', () => {
  it('should validate correct user data', () => {
    const validUser = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'SecurePassword123!'
    };

    const result = createUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      email: 'invalid-email',
      name: 'Test User',
      password: 'SecurePassword123!'
    };

    const result = createUserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });
});

// ✅ Good - Integration Test
describe('/api/users', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should create new user', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'SecurePassword123!'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.email).toBe('test@example.com');
  });
});
```

### Test Data
1. **Test Databases**: Use separate test databases
2. **Fixtures**: Use consistent test data fixtures
3. **Cleanup**: Clean up test data after each test
4. **Isolation**: Ensure tests are isolated and independent

```typescript
// ✅ Good
describe('User Management', () => {
  let testUser: User;
  
  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: await hashPassword('password123'),
        role: 'USER'
      }
    });
  });
  
  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    });
  });
  
  it('should update user profile', async () => {
    // Test implementation
  });
});
```

## Documentation Rules

### Code Documentation
1. **JSDoc Comments**: Document all public functions and classes
2. **README Files**: Include README for each major component
3. **API Documentation**: Document all API endpoints
4. **Examples**: Provide usage examples

```typescript
// ✅ Good
/**
 * Creates a new user in the system
 * @param userData - User data including email, name, and password
 * @returns Promise resolving to the created user
 * @throws {AppError} When user creation fails
 * @example
 * ```typescript
 * const user = await createUser({
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   password: 'SecurePassword123!'
 * });
 * ```
 */
export const createUser = async (userData: CreateUserInput): Promise<User> => {
  // Implementation
};
```

### README Requirements
1. **Setup Instructions**: Clear setup and installation steps
2. **Usage Examples**: Practical usage examples
3. **API Reference**: Link to API documentation
4. **Contributing Guidelines**: How to contribute to the project

### API Documentation
1. **OpenAPI Spec**: Maintain OpenAPI specification
2. **Endpoint Documentation**: Document all endpoints
3. **Request/Response Examples**: Provide examples
4. **Error Codes**: Document all error codes

## Deployment Rules

### Environment Management
1. **Environment Variables**: Use environment variables for configuration
2. **Secrets Management**: Never commit secrets to version control
3. **Environment Separation**: Separate dev, staging, and production
4. **Configuration Validation**: Validate configuration at startup

```typescript
// ✅ Good
export const validateEnvironment = () => {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'OPENAI_API_KEY'
  ];
  
  for (const var_name of required) {
    if (!process.env[var_name]) {
      throw new Error(`Missing required environment variable: ${var_name}`);
    }
  }
};
```

### Deployment Process
1. **Automated Testing**: Run all tests before deployment
2. **Database Migrations**: Apply migrations automatically
3. **Health Checks**: Verify deployment health
4. **Rollback Plan**: Have rollback procedures ready

```bash
# ✅ Good - Deployment script
#!/bin/bash
set -e

echo "Running tests..."
npm test

echo "Building application..."
npm run build

echo "Running database migrations..."
npx prisma migrate deploy

echo "Deploying to production..."
npm run deploy

echo "Running health checks..."
curl -f https://apiq.com/api/health || exit 1

echo "Deployment successful!"
```

### Monitoring
1. **Error Tracking**: Implement error tracking (Sentry)
2. **Performance Monitoring**: Monitor application performance
3. **Health Checks**: Regular health check endpoints
4. **Logging**: Structured logging for all operations

```typescript
// ✅ Good
export const healthCheck = async (req: NextApiRequest, res: NextApiResponse) => {
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
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};
```

## Compliance Rules

### Code Review Compliance
1. **Review All Changes**: All code changes must be reviewed
2. **Security Review**: Security-sensitive changes need security review
3. **Documentation Review**: Documentation changes need review
4. **Testing Review**: Ensure adequate test coverage

### Documentation Compliance
1. **Update Documentation**: Update docs when changing architecture
2. **Cross-Reference**: Reference relevant documentation in commits
3. **Version Control**: Version control all documentation
4. **Accessibility**: Ensure documentation is accessible

### Legal Compliance
1. **License Compliance**: Ensure all dependencies have compatible licenses
2. **Privacy Compliance**: Follow GDPR and privacy regulations
3. **Security Compliance**: Follow security best practices
4. **Audit Compliance**: Maintain audit trails for compliance

### Enforcement
1. **Automated Checks**: Use CI/CD to enforce rules
2. **Manual Reviews**: Human review for complex changes
3. **Training**: Regular training on rules and best practices
4. **Continuous Improvement**: Regularly update and improve rules

## Rule Violations

### Violation Handling
1. **Immediate Fix**: Fix violations immediately when identified
2. **Documentation**: Document violations and resolutions
3. **Prevention**: Implement measures to prevent future violations
4. **Escalation**: Escalate persistent violations to management

### Consequences
1. **Code Rejection**: Reject code that violates critical rules
2. **Review Process**: Additional review for rule violations
3. **Training**: Mandatory training for repeated violations
4. **Escalation**: Escalate to management for persistent issues

---

## Rule Updates

This document should be reviewed and updated regularly to reflect:
- New technologies and best practices
- Lessons learned from development
- Changes in project requirements
- Feedback from team members

**Last Updated**: January 2024
**Next Review**: March 2024
**Document Owner**: Development Team Lead 
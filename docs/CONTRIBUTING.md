# Contributing to APIQ

## Welcome Contributors! 🎉

Thank you for your interest in contributing to APIQ! This guide will help you get started with contributing to our project. We welcome contributions from developers of all skill levels.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Coding Standards](#coding-standards)
4. [Git Workflow](#git-workflow)
5. [Testing Guidelines](#testing-guidelines)
6. [Documentation](#documentation)
7. [Code Review Process](#code-review-process)
8. [Issue Guidelines](#issue-guidelines)
9. [Pull Request Guidelines](#pull-request-guidelines)
10. [Community Guidelines](#community-guidelines)

## Getting Started

### Before You Begin

1. **Read the Documentation**
   - [README.md](../README.md) - Project overview
   - [Architecture Guide](ARCHITECTURE.md) - System design
   - [Development Guide](DEVELOPMENT_GUIDE.md) - Technical details

2. **Join the Community**
   - [GitHub Discussions](https://github.com/apiq/apiq/discussions)
   - [Discord Server](https://discord.gg/apiq)
   - [Slack Workspace](https://apiq-community.slack.com)

3. **Check Existing Issues**
   - Look for existing issues that match your interests
   - Check the [good first issue](https://github.com/apiq/apiq/labels/good%20first%20issue) label
   - Review [help wanted](https://github.com/apiq/apiq/labels/help%20wanted) issues

### Types of Contributions

We welcome various types of contributions:

- **Bug Fixes**: Fix issues and improve reliability
- **Feature Development**: Add new functionality
- **Documentation**: Improve guides, tutorials, and API docs
- **Testing**: Add tests and improve test coverage
- **Performance**: Optimize code and improve efficiency
- **Security**: Identify and fix security issues
- **UI/UX**: Improve user interface and experience

## Development Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **PostgreSQL**: Version 14.0 or higher
- **Git**: Latest version
- **VS Code** (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - Prisma
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier
  - GitLens

### Local Development Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/apiq.git
   cd apiq
   ```

2. **Set up Remote**
   ```bash
   # Add upstream remote
   git remote add upstream https://github.com/apiq/apiq.git
   
   # Verify remotes
   git remote -v
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Environment Setup**
   ```bash
   # Copy environment template
   cp env.example .env.local
   
   # Edit environment variables
   # See [Environment Configuration](#environment-configuration)
   ```

5. **Database Setup**
   ```bash
   # Create development database
   createdb apiq_dev
   
   # Run migrations
   npx prisma migrate dev --name init
   
   # Generate Prisma client
   npx prisma generate
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

7. **Verify Setup**
   - Open [http://localhost:3000](http://localhost:3000)
   - Check that the application loads correctly
   - Run tests: `npm test`

### Environment Configuration

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/apiq_dev"

# NextAuth.js
NEXTAUTH_SECRET="your-development-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI (for AI features)
OPENAI_API_KEY="sk-your-openai-api-key"

# Development
NODE_ENV="development"
LOG_LEVEL="debug"

# Optional: Redis (for caching)
REDIS_URL="redis://localhost:6379"
```

## Coding Standards

### TypeScript Guidelines

**File Naming**
- Use PascalCase for components: `UserProfile.tsx`
- Use camelCase for utilities: `apiUtils.ts`
- Use kebab-case for pages: `user-profile.tsx`

**Type Definitions**
```typescript
// Always define interfaces for complex objects
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

// Use type aliases for simple types
type UserId = string;
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Use enums for constants
enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  AUDITOR = 'AUDITOR'
}
```

**Function Definitions**
```typescript
// Use explicit return types for public functions
export const getUserById = async (id: string): Promise<User | null> => {
  return await prisma.user.findUnique({
    where: { id }
  });
};

// Use arrow functions for components
export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};
```

### React Guidelines

**Component Structure**
```typescript
// components/UserProfile/UserProfile.tsx
import React from 'react';
import { User } from '@/types/user';
import { UserProfileProps } from './UserProfile.types';
import styles from './UserProfile.module.css';

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onEdit,
  className
}) => {
  const handleEdit = () => {
    onEdit?.(user);
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <h2 className={styles.title}>{user.name}</h2>
      <p className={styles.email}>{user.email}</p>
      {onEdit && (
        <button onClick={handleEdit} className={styles.editButton}>
          Edit Profile
        </button>
      )}
    </div>
  );
};
```

**Hooks Usage**
```typescript
// Custom hooks for reusable logic
export const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const userData = await getUserById(userId);
        setUser(userData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return { user, loading, error };
};
```

### API Development Guidelines

**API Route Structure**
```typescript
// pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { validateRequest } from '@/lib/validation';
import { ApiResponse, User } from '@/types/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<User>>
) {
  try {
    // 1. Authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        timestamp: new Date()
      });
    }

    // 2. Method handling
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, session);
      case 'PUT':
        return await handlePut(req, res, session);
      case 'DELETE':
        return await handleDelete(req, res, session);
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          timestamp: new Date()
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date()
    });
  }
}
```

**Error Handling**
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleApiError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  
  console.error('Unexpected error:', error);
  return new AppError('Internal server error', 500);
};
```

### Database Guidelines

**Prisma Schema**
```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  apiConnections ApiConnection[]
  workflows      Workflow[]
  auditLogs      AuditLog[]

  @@map("users")
}

enum Role {
  USER
  ADMIN
  AUDITOR
}
```

**Database Queries**
```typescript
// lib/database/user.ts
import { prisma } from '@/lib/database/client';

export const getUserWithConnections = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      apiConnections: {
        include: {
          endpoints: true
        }
      }
    }
  });
};

export const createUser = async (userData: CreateUserInput) => {
  return await prisma.user.create({
    data: {
      ...userData,
      password: await hashPassword(userData.password)
    }
  });
};
```

## Git Workflow

### Branch Naming Convention

Use descriptive branch names following this pattern:

```
<type>/<description>
```

**Types:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

**Examples:**
```bash
feature/user-authentication
fix/api-rate-limiting
docs/api-reference-update
refactor/database-queries
test/workflow-execution
chore/dependency-update
```

### Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(auth): add two-factor authentication support

fix(api): resolve rate limiting issue with external APIs

docs(api): update API reference with new endpoints

refactor(database): optimize user queries with proper indexing

test(workflow): add comprehensive workflow execution tests

chore(deps): update dependencies to latest versions
```

### Development Workflow

1. **Create Feature Branch**
   ```bash
   # Update main branch
   git checkout main
   git pull upstream main
   
   # Create feature branch
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   ```bash
   # Make your changes
   # Write tests
   # Update documentation
   
   # Stage changes
   git add .
   
   # Commit with conventional message
   git commit -m "feat(component): add new user profile component"
   ```

3. **Keep Branch Updated**
   ```bash
   # Rebase on main to avoid conflicts
   git fetch upstream
   git rebase upstream/main
   ```

4. **Push Changes**
   ```bash
   # Push to your fork
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill out the PR template

## Testing Guidelines

### Test Structure

**Unit Tests**
```typescript
// tests/unit/lib/validation.test.ts
import { createUserSchema } from '@/lib/validation/user';

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
```

**Component Tests**
```typescript
// tests/unit/components/UserProfile.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfile } from '@/components/UserProfile/UserProfile';

describe('UserProfile', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'USER' as const
  };

  it('should display user information', () => {
    render(<UserProfile user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    render(<UserProfile user={mockUser} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByText('Edit Profile'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockUser);
  });
});
```

**API Tests**
```typescript
// tests/integration/api/users.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/users';
import { prisma } from '@/lib/database/client';

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

### Test Coverage

**Coverage Requirements**
- Minimum 80% code coverage
- 100% coverage for critical paths
- All new features must include tests

**Running Tests**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=user.test.ts

# Run E2E tests
npm run test:e2e
```

## Documentation

### Code Documentation

**JSDoc Comments**
```typescript
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

**README Files**
```markdown
# Component Name

Brief description of what this component does.

## Usage

```tsx
import { ComponentName } from '@/components/ComponentName';

<ComponentName prop1="value1" prop2="value2" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | Description of prop1 |
| prop2 | number | No | 0 | Description of prop2 |

## Examples

### Basic Usage
```tsx
<ComponentName prop1="Hello" />
```

### Advanced Usage
```tsx
<ComponentName 
  prop1="Hello" 
  prop2={42}
  onEvent={handleEvent}
/>
```
```

### API Documentation

**OpenAPI/Swagger Documentation**
```typescript
/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user account with the provided information
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *                 minLength: 1
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
```

## Code Review Process

### Review Checklist

**Before Submitting**
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] No console.log statements
- [ ] No sensitive data in code
- [ ] Error handling is implemented
- [ ] Performance considerations addressed

**During Review**
- [ ] Code is readable and maintainable
- [ ] Logic is correct and efficient
- [ ] Security considerations addressed
- [ ] Tests are comprehensive
- [ ] Documentation is clear
- [ ] No breaking changes (unless intended)

### Review Guidelines

**For Reviewers**
- Be constructive and respectful
- Focus on code quality and functionality
- Provide specific feedback and suggestions
- Consider security and performance implications
- Ensure tests are adequate

**For Authors**
- Respond to all review comments
- Make requested changes or explain why not
- Keep commits focused and atomic
- Update documentation as needed
- Test changes thoroughly

## Issue Guidelines

### Creating Issues

**Bug Reports**
```markdown
## Bug Description
Clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Safari, Firefox]
- Version: [e.g. 1.0.0]

## Additional Context
Any other context about the problem.
```

**Feature Requests**
```markdown
## Feature Description
Clear and concise description of the feature.

## Problem Statement
What problem does this feature solve?

## Proposed Solution
How should this feature work?

## Alternative Solutions
Any alternative solutions you've considered.

## Additional Context
Any other context about the feature request.
```

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `priority: high` - High priority issue
- `priority: low` - Low priority issue
- `security` - Security-related issue

## Pull Request Guidelines

### PR Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No sensitive data in code

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that reviewers should know.
```

### PR Review Process

1. **Automated Checks**
   - CI/CD pipeline runs tests
   - Code coverage is checked
   - Linting and formatting verified
   - Security scanning performed

2. **Manual Review**
   - At least one maintainer review required
   - Code quality and functionality reviewed
   - Security implications considered
   - Documentation reviewed

3. **Approval and Merge**
   - All checks must pass
   - All review comments addressed
   - Maintainer approval received
   - Squash and merge preferred

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and considerate
- Use inclusive language
- Be open to constructive feedback
- Help others learn and grow
- Report inappropriate behavior

### Communication

**GitHub Discussions**
- Use discussions for questions and ideas
- Search existing discussions before posting
- Be clear and specific in your questions
- Help others with their questions

**Discord/Slack**
- Join community channels
- Ask questions in appropriate channels
- Share your progress and achievements
- Help other community members

### Recognition

**Contributor Recognition**
- Contributors are listed in README.md
- Significant contributions are highlighted
- Regular contributor spotlights
- Contributor badges and recognition

**Getting Help**
- Check documentation first
- Search existing issues and discussions
- Ask questions in community channels
- Reach out to maintainers for guidance

## Getting Help

### Resources

- **Documentation**: [docs/](../docs/)
- **Issues**: [GitHub Issues](https://github.com/apiq/apiq/issues)
- **Discussions**: [GitHub Discussions](https://github.com/apiq/apiq/discussions)
- **Discord**: [APIQ Community](https://discord.gg/apiq)
- **Slack**: [APIQ Workspace](https://apiq-community.slack.com)

### Contact Maintainers

- **Email**: maintainers@apiq.com
- **GitHub**: [@apiq/maintainers](https://github.com/orgs/apiq/teams/maintainers)

Thank you for contributing to APIQ! Your contributions help make our platform better for everyone. 🚀 
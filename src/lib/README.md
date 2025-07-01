# Library Wrappers

This directory contains wrapper modules for third-party libraries to enable reliable mocking in tests.

## Why Use Wrappers?

Third-party libraries (especially ESM modules or complex APIs) can be difficult to mock in Jest tests due to:
- Module hoisting issues
- ESM/CommonJS compatibility problems
- Runtime checks that break when mocked
- Complex dependency chains

Wrappers solve these issues by providing a simple, controlled interface that's easy to mock.

## Pattern

### 1. Create a Wrapper

Use `wrapperTemplate.ts` as a starting point:

```typescript
// src/lib/emailWrapper.ts
import * as nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string; };
}

export interface EmailClient {
  sendMail: (options: any) => Promise<any>;
  verify: () => Promise<boolean>;
}

export const getEmailClient = (config: EmailConfig): EmailClient => {
  const transporter = nodemailer.createTransport(config);
  
  return {
    sendMail: async (options) => await transporter.sendMail(options),
    verify: async () => await transporter.verify(),
  };
};
```

### 2. Update Your Service

```typescript
// Before
import * as nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport(config);

// After
import { getEmailClient } from '../lib/emailWrapper';
const emailClient = getEmailClient(config);
```

### 3. Mock in Tests

```typescript
// Mock the wrapper
jest.mock('../../../src/lib/emailWrapper', () => ({
  __esModule: true,
  getEmailClient: jest.fn(),
}));

// In beforeEach
const mockEmailClient = {
  sendMail: jest.fn(),
  verify: jest.fn(),
};
(getEmailClient as jest.Mock).mockReturnValue(mockEmailClient);

// In tests
mockEmailClient.sendMail.mockResolvedValue({ messageId: 'test-id' });
```

## When to Create a Wrapper

**Create a wrapper when:**
- The library is difficult to mock in tests
- You need to mock the library in multiple test files
- The library has complex configuration or initialization
- You want to add validation or error handling around the library
- The library is an ESM module or has hoisting issues

**Don't create a wrapper when:**
- The library is already easy to mock (like axios)
- The library is only used in one place and doesn't need testing
- The library is a simple utility (like uuid, crypto)

## Best Practices

1. **Keep wrappers simple** - Don't add business logic, just configuration and interface
2. **Use TypeScript interfaces** - Define clear contracts for the wrapped library
3. **Validate configuration** - Check required parameters and provide helpful errors
4. **Support environment variables** - Allow configuration via env vars for convenience
5. **Export both named and default exports** - Provide flexibility for different use cases
6. **Document the wrapper** - Include JSDoc comments explaining the purpose and usage

## Examples

See these files for working examples:
- `openaiWrapper.ts` - Wraps the OpenAI client
- `emailWrapper.ts` - Wraps the Nodemailer client
- `queueWrapper.ts` - Wraps the PgBoss queue client
- `swaggerWrapper.ts` - Wraps the Swagger-parser client
- `wrapperTemplate.ts` - Template for creating new wrappers

## Available Wrappers

### ✅ Implemented
- `openaiWrapper.ts` - OpenAI client wrapper
- `emailWrapper.ts` - Nodemailer wrapper
- `queueWrapper.ts` - PgBoss queue wrapper
- `swaggerWrapper.ts` - Swagger-parser wrapper

### 📋 TODO: Additional Wrappers Needed
See `WRAPPER_TODOS.md` for a complete list of third-party libraries that need wrapper implementation, prioritized by importance and usage across the codebase.

## Testing Guidelines

1. **Mock the wrapper, not the original library**
2. **Use `jest.mock()` at the top of test files**
3. **Reset mocks in `beforeEach()`**
4. **Clear require cache if needed for fresh imports**
5. **Test the wrapper itself** - Ensure it properly configures and returns the library

## Migration Checklist

When migrating a service to use a wrapper:

- [ ] Create the wrapper module
- [ ] Update the service to use the wrapper
- [ ] Update all tests to mock the wrapper
- [ ] Remove direct imports of the original library
- [ ] Test that the service still works correctly
- [ ] Verify that tests are more reliable and faster 
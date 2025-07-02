# APIQ Development Guide

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Coding Standards](#coding-standards)
4. [Database Development](#database-development)
5. [API Development](#api-development)
6. [Frontend Development](#frontend-development)
7. [Testing Strategy](#testing-strategy)
8. [Security Guidelines](#security-guidelines)
9. [Performance Guidelines](#performance-guidelines)
10. [Deployment](#deployment)

## Development Environment Setup

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

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd apiq-mvp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment configuration**

   ```bash
   cp env.example .env.local
   ```

   Configure your `.env.local`:

   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000
   API_BASE_URL=http://localhost:3000

   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/apiq_dev"

   # NextAuth.js
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   CORS_ORIGIN=http://localhost:3000

   # OpenAI
   OPENAI_API_KEY="sk-your-openai-api-key"

   # Security
   ENCRYPTION_KEY="your-32-character-encryption-key-here"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

   # Email Service (for password reset and verification)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_SECURE="false"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM="your-email@gmail.com"
   ```

   **Email Setup Notes:**
   - For Gmail, use an App Password (not your regular password)
   - Enable 2-Factor Authentication on your Google account
   - Generate an App Password: Google Account → Security → 2-Step Verification → App passwords
   - For development, you can use services like Mailtrap for testing

4. **Database setup**

   ```bash
   # Create database
   createdb apiq_dev

   # Run migrations
   npx prisma migrate dev --name init

   # Generate Prisma client
   npx prisma generate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Development Tools

- **Prisma Studio**: `npx prisma studio` - Database GUI
- **ESLint**: `npm run lint` - Code linting
- **TypeScript**: Built-in type checking
- **Next.js DevTools**: Built-in development tools

## Project Structure

```
/apiq-mvp
├── /pages                    # Next.js pages and API routes
│   ├── /api                 # Serverless API endpoints
│   │   ├── auth/            # Authentication endpoints
│   │   ├── apis/            # API management endpoints
│   │   ├── workflows/       # Workflow endpoints
│   │   ├── chat/            # AI chat endpoints
│   │   └── logs/            # Audit log endpoints
│   ├── _app.tsx            # App wrapper
│   ├── _document.tsx       # Document wrapper
│   ├── index.tsx           # Landing page
│   ├── dashboard.tsx       # Main dashboard
│   ├── auth/               # Authentication pages
│   ├── apis/               # API management pages
│   ├── workflows/          # Workflow pages
│   └── admin/              # Admin pages
├── /components             # Reusable React components
│   ├── /ui                 # Base UI components
│   ├── /auth               # Authentication components
│   ├── /api                # API-related components
│   ├── /workflow           # Workflow components
│   ├── /chat               # Chat interface components
│   └── /layout             # Layout components
├── /lib                    # Utility functions and services
│   ├── /auth               # Authentication utilities
│   ├── /api                # API utilities
│   ├── /openai             # OpenAI integration
│   ├── /database           # Database utilities
│   ├── /validation         # Input validation
│   └── /utils              # General utilities
├── /prisma                 # Database schema and migrations
│   ├── schema.prisma       # Prisma schema
│   └── /migrations         # Database migrations
├── /styles                 # Global styles
├── /public                 # Static assets
├── /tests                  # Test files
│   ├── /unit               # Unit tests
│   ├── /integration        # Integration tests
│   ├── /e2e                # End-to-end tests
│   └── /helpers            # Test helper scripts and utilities
├── /scripts                # Utility and devops scripts
│   ├── init-db.js          # Database initialization
│   ├── startup.sh          # Application startup script
│   └── run-tests.sh        # Test orchestration script
└── /docs                   # Documentation
```

## Coding Standards

### TypeScript Guidelines

1. **Strict TypeScript Configuration**

   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "noImplicitReturns": true,
       "exactOptionalPropertyTypes": true
     }
   }
   ```

2. **Type Definitions**
   - Always define interfaces for API responses
   - Use type guards for runtime type checking
   - Prefer interfaces over types for object shapes
   - Export types from dedicated type files

3. **Example Type Definition**

   ```typescript
   // types/api.ts
   export interface ApiResponse<T = any> {
     success: boolean;
     data?: T;
     error?: string;
     message?: string;
     timestamp: Date;
   }

   export interface ApiConnection {
     id: string;
     name: string;
     baseUrl: string;
     authType: "api_key" | "oauth" | "bearer";
     authConfig: ApiAuthConfig;
     createdAt: Date;
     updatedAt: Date;
   }
   ```

### React Guidelines

1. **Component Structure**

   ```typescript
   // components/ui/Button.tsx
   import React from 'react';
   import { ButtonProps } from './Button.types';

   export const Button: React.FC<ButtonProps> = ({
     children,
     variant = 'primary',
     size = 'medium',
     disabled = false,
     onClick,
     ...props
   }) => {
     return (
       <button
         className={`btn btn-${variant} btn-${size}`}
         disabled={disabled}
         onClick={onClick}
         {...props}
       >
         {children}
       </button>
     );
   };
   ```

2. **Hooks Usage**
   - Use custom hooks for reusable logic
   - Prefer `useCallback` for event handlers
   - Use `useMemo` for expensive computations
   - Implement proper cleanup in `useEffect`

3. **State Management**
   - Use React Context for global state
   - Prefer local state when possible
   - Use SWR for server state management

### API Development Guidelines

1. **API Route Structure**

   ```typescript
   // pages/api/apis/index.ts
   import { NextApiRequest, NextApiResponse } from "next";
   import { getServerSession } from "next-auth/next";
   import { authOptions } from "../auth/[...nextauth]";
   import { validateRequest } from "@/lib/validation";
   import { ApiResponse } from "@/types/api";

   export default async function handler(
     req: NextApiRequest,
     res: NextApiResponse<ApiResponse>,
   ) {
     try {
       // 1. Authentication check
       const session = await getServerSession(req, res, authOptions);
       if (!session) {
         return res.status(401).json({
           success: false,
           error: "Unauthorized",
           timestamp: new Date(),
         });
       }

       // 2. Method validation
       if (req.method === "GET") {
         return await handleGet(req, res, session);
       } else if (req.method === "POST") {
         return await handlePost(req, res, session);
       }

       // 3. Method not allowed
       return res.status(405).json({
         success: false,
         error: "Method not allowed",
         timestamp: new Date(),
       });
     } catch (error) {
       // 4. Error handling
       console.error("API Error:", error);
       return res.status(500).json({
         success: false,
         error: "Internal server error",
         timestamp: new Date(),
       });
     }
   }
   ```

2. **Input Validation**

   ```typescript
   // lib/validation/apiConnection.ts
   import { z } from "zod";

   export const createApiConnectionSchema = z.object({
     name: z.string().min(1).max(100),
     baseUrl: z.string().url(),
     authType: z.enum(["api_key", "oauth", "bearer"]),
     authConfig: z.object({
       apiKey: z.string().optional(),
       bearerToken: z.string().optional(),
       // ... other auth config fields
     }),
     documentationUrl: z.string().url().optional(),
   });

   export type CreateApiConnectionInput = z.infer<
     typeof createApiConnectionSchema
   >;
   ```

3. **Error Handling**

   ```typescript
   // lib/errors.ts
   export class AppError extends Error {
     constructor(
       message: string,
       public statusCode: number = 500,
       public code: string = "INTERNAL_ERROR",
     ) {
       super(message);
       this.name = "AppError";
     }
   }

   export const handleApiError = (error: unknown) => {
     if (error instanceof AppError) {
       return error;
     }

     console.error("Unexpected error:", error);
     return new AppError("Internal server error", 500);
   };
   ```

## Database Development

### Prisma Schema Guidelines

1. **Model Definition**

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
     ADMIN
     USER
   }
   ```

2. **Migration Best Practices**
   - Always review generated migrations
   - Use descriptive migration names
   - Test migrations on development data
   - Include rollback strategies

3. **Query Optimization**

   ```typescript
   // lib/database/user.ts
   import { prisma } from "@/lib/database/client";

   export const getUserWithConnections = async (userId: string) => {
     return await prisma.user.findUnique({
       where: { id: userId },
       include: {
         apiConnections: {
           include: {
             endpoints: true,
           },
         },
       },
     });
   };
   ```

### Database Utilities

1. **Connection Management**

   ```typescript
   // lib/database/client.ts
   import { PrismaClient } from "@prisma/client";

   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
   };

   export const prisma = globalForPrisma.prisma ?? new PrismaClient();

   if (process.env.NODE_ENV !== "production") {
     globalForPrisma.prisma = prisma;
   }
   ```

2. **Transaction Handling**

   ```typescript
   // lib/database/transactions.ts
   import { prisma } from "./client";

   export const createApiConnectionWithEndpoints = async (
     connectionData: CreateApiConnectionInput,
     endpoints: CreateEndpointInput[],
   ) => {
     return await prisma.$transaction(async (tx) => {
       const connection = await tx.apiConnection.create({
         data: connectionData,
       });

       const createdEndpoints = await Promise.all(
         endpoints.map((endpoint) =>
           tx.endpoint.create({
             data: {
               ...endpoint,
               apiConnectionId: connection.id,
             },
           }),
         ),
       );

       return { connection, endpoints: createdEndpoints };
     });
   };
   ```

## API Development

### OpenAI Integration

1. **Client Setup**

   ```typescript
   // lib/openai/client.ts
   import OpenAI from "openai";

   export const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   });
   ```

2. **Function Calling**

   ```typescript
   // lib/openai/functions.ts
   export const generateFunctionDefinitions = (endpoints: Endpoint[]) => {
     return endpoints.map((endpoint) => ({
       name: `${endpoint.apiConnection.name}_${endpoint.method}_${endpoint.path}`,
       description:
         endpoint.description || `${endpoint.method} ${endpoint.path}`,
       parameters: {
         type: "object",
         properties: {
           // Generate properties from endpoint parameters
         },
         required: endpoint.requiredParameters || [],
       },
     }));
   };
   ```

3. **Chat Completion**

   ```typescript
   // lib/openai/chat.ts
   export const createChatCompletion = async (
     messages: ChatMessage[],
     functions: FunctionDefinition[],
   ) => {
     const completion = await openai.chat.completions.create({
       model: "gpt-4",
       messages,
       tools: functions.map((fn) => ({
         type: "function" as const,
         function: fn,
       })),
       tool_choice: "auto",
     });

     return completion.choices[0]?.message;
   };
   ```

### API Spec Parsing

1. **Swagger Parser Integration**

   ```typescript
   // lib/api/parser.ts
   import SwaggerParser from "@apidevtools/swagger-parser";

   export const parseOpenApiSpec = async (url: string) => {
     try {
       const api = await SwaggerParser.parse(url);

       return {
         info: api.info,
         servers: api.servers,
         paths: api.paths,
         components: api.components,
       };
     } catch (error) {
       throw new Error(`Failed to parse OpenAPI spec: ${error.message}`);
     }
   };
   ```

2. **Endpoint Extraction**

   ```typescript
   // lib/api/endpoints.ts
   export const extractEndpoints = (parsedSpec: any) => {
     const endpoints: EndpointData[] = [];

     for (const [path, pathItem] of Object.entries(parsedSpec.paths)) {
       for (const [method, operation] of Object.entries(pathItem)) {
         if (["get", "post", "put", "delete", "patch"].includes(method)) {
           endpoints.push({
             path,
             method: method.toUpperCase(),
             summary: operation.summary,
             description: operation.description,
             parameters: operation.parameters || [],
             requestBody: operation.requestBody,
             responses: operation.responses,
           });
         }
       }
     }

     return endpoints;
   };
   ```

### Queue Management

The QueueService provides robust job queue management using PgBoss 10.3.2 for workflow execution. It's designed for server-side usage and includes comprehensive error handling, health monitoring, and type safety.

#### 1. Service Setup

```typescript
// lib/queue/queueService.ts
import { QueueService, QueueConfig } from "@/lib/queue/queueService";
import { prisma } from "@/lib/database/client";

// Initialize with custom configuration
const queueConfig: Partial<QueueConfig> = {
  maxConcurrency: 10,
  retryLimit: 3,
  retryDelay: 5000,
  timeout: 300000,
  healthCheckInterval: 30000,
};

const queueService = new QueueService(prisma, queueConfig);
await queueService.initialize();
```

#### 2. Job Submission

```typescript
// Submit a job to the queue
const job = {
  queueName: "workflow-execution",
  name: "process-customer-data",
  data: { customerId: "123", action: "sync" },
  retryLimit: 3,
  retryDelay: 5000,
  timeout: 300000,
  priority: 0,
  delay: 0,
  expireIn: 3600000,
  jobKey: "customer-sync-123", // Optional: for deduplication
};

const result = await queueService.submitJob(job);
// Returns: { queueName: 'workflow-execution', jobId: 'job-123' }
```

#### 3. Worker Registration

```typescript
// Register a worker to process jobs
await queueService.registerWorker(
  "workflow-execution",
  async (jobData) => {
    // Process the job
    const result = await processWorkflow(jobData);
    return result;
  },
  {
    teamSize: 5, // Number of concurrent workers
    timeout: 300000,
    retryLimit: 3,
    dataSchema: z.object({
      // Optional: runtime validation
      customerId: z.string(),
      action: z.string(),
    }),
  },
);
```

#### 4. Job Management

```typescript
// Cancel a job
await queueService.cancelJob("workflow-execution", "job-123");

// Get job status
const status = await queueService.getJobStatus("workflow-execution", "job-123");
// Returns JobStatus object with state, retry info, timestamps, etc.
```

#### 5. Health Monitoring

```typescript
// Get overall health status
const health = await queueService.getHealthStatus();
// Returns: QueueHealth with status, message, metrics, etc.

// Get worker statistics
const stats = queueService.getWorkerStats();
// Returns: Array of WorkerStats with active/completed/failed job counts
```

#### 6. Error Handling

```typescript
try {
  const result = await queueService.submitJob(job);
} catch (error) {
  if (error.message.includes("duplicate jobKey")) {
    // Handle deduplication error
    console.log("Job already exists with this key");
  } else if (error.message.includes("Queue service not initialized")) {
    // Handle initialization error
    await queueService.initialize();
  } else {
    // Handle other errors
    console.error("Job submission failed:", error);
  }
}
```

#### 7. Best Practices

**Job Identification**

- Always provide `queueName` for all job operations
- Use `jobKey` for deduplication when needed
- Store both `queueName` and `jobId` for job tracking

**Worker Configuration**

- Use `teamSize` for parallelism (default: 10)
- Set appropriate `timeout` values for job execution
- Configure `retryLimit` and `retryDelay` for resilience

**Data Validation**

- Use zod schemas for runtime validation
- Sanitize sensitive data in job payloads
- Validate job data at API boundaries

**Monitoring**

- Regular health checks for queue status
- Monitor worker statistics for performance
- Set up alerts for failed jobs

**Security**

- Never log sensitive job data
- Use job data sanitization for logs
- Implement proper error handling

#### 8. Testing

```typescript
// tests/unit/lib/queue/queueService.test.ts
describe("QueueService", () => {
  let queueService: QueueService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    queueService = new QueueService(mockPrisma);
  });

  it("should submit a job successfully", async () => {
    const job: QueueJob = {
      queueName: "test-queue",
      name: "test-job",
      data: { test: "data" },
    };

    mockBoss.createQueue.mockResolvedValue(undefined);
    mockBoss.send.mockResolvedValue("job-123");

    const result = await queueService.submitJob(job);

    expect(result).toEqual({ queueName: "test-queue", jobId: "job-123" });
  });
});
```

## Frontend Development

### Component Guidelines

1. **Component Organization**

   ```typescript
   // components/api/ApiConnectionForm.tsx
   import React from 'react';
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';
   import { createApiConnectionSchema } from '@/lib/validation/apiConnection';

   interface ApiConnectionFormProps {
     onSubmit: (data: CreateApiConnectionInput) => Promise<void>;
     loading?: boolean;
   }

   export const ApiConnectionForm: React.FC<ApiConnectionFormProps> = ({
     onSubmit,
     loading = false
   }) => {
     const {
       register,
       handleSubmit,
       formState: { errors }
     } = useForm<CreateApiConnectionInput>({
       resolver: zodResolver(createApiConnectionSchema)
     });

     return (
       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
         {/* Form fields */}
       </form>
     );
   };
   ```

2. **State Management**

   ```typescript
   // hooks/useApiConnections.ts
   import useSWR from "swr";
   import { ApiConnection } from "@/types/api";

   export const useApiConnections = () => {
     const { data, error, mutate } = useSWR<ApiConnection[]>(
       "/api/apis",
       fetcher,
     );

     return {
       connections: data || [],
       loading: !error && !data,
       error,
       mutate,
     };
   };
   ```

3. **Error Boundaries**

   ```typescript
   // components/ErrorBoundary.tsx
   import React from 'react';

   interface ErrorBoundaryState {
     hasError: boolean;
     error?: Error;
   }

   export class ErrorBoundary extends React.Component<
     React.PropsWithChildren<{}>,
     ErrorBoundaryState
   > {
     constructor(props: React.PropsWithChildren<{}>) {
       super(props);
       this.state = { hasError: false };
     }

     static getDerivedStateFromError(error: Error): ErrorBoundaryState {
       return { hasError: true, error };
     }

     componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
       console.error('Error caught by boundary:', error, errorInfo);
     }

     render() {
       if (this.state.hasError) {
         return (
           <div className="error-boundary">
             <h2>Something went wrong.</h2>
             <button onClick={() => this.setState({ hasError: false })}>
               Try again
             </button>
           </div>
         );
       }

       return this.props.children;
     }
   }
   ```

## Testing Strategy

### Testing Philosophy

**No Mock Data Policy**: We follow a strict no-mock-data policy for database and authentication operations in development and production code. All tests use real database connections and real authentication flows.

### Test Categories

#### 1. Unit Tests (`/tests/unit/`)

- **Purpose**: Test individual functions and components in isolation
- **Scope**: Utility functions, business logic, component rendering, middleware, services
- **Mocking**: Only mock external services (OpenAI, external APIs, Winston logger), never database or auth
- **Coverage**: Aim for >90% coverage on business logic, >80% on utilities and middleware

#### Recent Improvements

- **Comprehensive utility testing**: All encryption, logging, and parsing utilities are fully tested
- **Middleware coverage**: Error handling and rate limiting middleware have complete test coverage
- **Service testing**: OpenAI service has 89%+ coverage with robust mocking
- **Structured logging**: All logging follows safe, non-circular patterns

#### 2. Integration Tests (`/tests/integration/`)

- **Purpose**: Test API endpoints and database interactions end-to-end
- **Scope**: Full request/response cycles with real database
- **Authentication**: Use real users with bcrypt-hashed passwords
- **Database**: Real PostgreSQL connections, no mocks
- **Cleanup**: Proper test data cleanup between tests

#### 3. End-to-End Tests (`/tests/e2e/`)

- **Purpose**: Test complete user workflows
- **Scope**: Full browser automation with real backend
- **Data**: Real database with test users
- **Environment**: Separate test database

### Testing Best Practices

#### Database Testing

```typescript
// ✅ GOOD: Real database with test users
beforeAll(async () => {
  // Create real test user with bcrypt-hashed password
  const hashedPassword = await bcrypt.hash("testpass123", 10);
  testUser = await prisma.user.create({
    data: {
      email: "test@example.com",
      password: hashedPassword,
      name: "Test User",
      role: "USER",
    },
  });

  // Login to get real JWT
  const { req, res } = createMocks({
    method: "POST",
    body: { email: "test@example.com", password: "testpass123" },
  });
  await loginHandler(req as any, res as any);
  const data = JSON.parse(res._getData());
  accessToken = data.data.accessToken;
});

// ❌ BAD: Mocking database operations
jest.mock("../../../lib/database/client", () => ({
  prisma: { user: { findFirst: jest.fn() } },
}));
```

#### Authentication Testing

```typescript
// ✅ GOOD: Real authentication flow
it("should authenticate with valid credentials", async () => {
  const { req, res } = createMocks({
    method: "POST",
    body: { email: "admin@example.com", password: "admin123" },
  });

  await loginHandler(req as any, res as any);

  expect(res._getStatusCode()).toBe(200);
  const data = JSON.parse(res._getData());
  expect(data.success).toBe(true);
  expect(data.data.accessToken).toBeDefined();
});

// ❌ BAD: Mocking JWT or authentication
jest.mock("jsonwebtoken");
(jwt.sign as jest.Mock).mockReturnValue("fake-token");
```

#### Test Data Management

```typescript
// ✅ GOOD: Proper cleanup
afterAll(async () => {
  // Clean up test data
  await prisma.apiConnection.deleteMany({
    where: { userId: testUserId },
  });
  await prisma.user.deleteMany({
    where: { id: testUserId },
  });
  await prisma.$disconnect();
});

// ✅ GOOD: Unique test data
const uniqueEmail = `test-${Date.now()}@example.com`;
```

#### Logging and Error Handling

```typescript
// ✅ GOOD: Safe, structured logging
logError("API call failed", error, {
  endpoint: "/api/users",
  method: "GET",
  userId: user.id,
  statusCode: 500,
});

// ❌ BAD: Logging entire objects
logError("API call failed", error, { request, response, user });
```

### Current Test Coverage

#### High Coverage Areas (>80%)

- **Services**: OpenAI service (89.55% lines, 100% functions)
- **Utilities**: Encryption (91.48% lines), Logger (87.17% lines)
- **API Parser**: 100% lines and functions
- **RBAC**: 100% lines and functions
- **Database**: 98.55% lines and functions
- **Middleware**: Error handling (80.72% lines), Rate limiting (82.45% lines)

#### Test Statistics

- **Total test suites**: 52
- **Total tests**: 914 (495 unit + 239 integration + 180 e2e)
- **Pass rate**: 100%
- **Coverage**: 60.12% lines (core business logic >80%)

### Recent Test Suite Improvements

#### **Handler-First Error Contract Implementation**

- **Problem**: Inconsistent error responses for email service failures
- **Solution**: Unified error handling for both `return false` and `throw exception` cases
- **Benefits**: Clear API semantics, better debuggability, easier maintenance
- **Implementation**: Both registration endpoints now return consistent `ApplicationError` with "Failed to send verification email" message

#### **Test Isolation & Parallel Execution**

- **Problem**: Tests failing when run in parallel due to shared state
- **Solution**: Per-test cleanup with unique identifiers using `generateTestId()`
- **Benefits**: Tests can run concurrently without conflicts
- **Implementation**: All tests use unique emails, IDs, and tokens

#### **Health Check Endpoint Enhancements**

- **Problem**: Health check tests failing due to inconsistent responses
- **Solution**: Fixed OpenAI service check, error handling, and CORS headers
- **Benefits**: Reliable health monitoring and consistent API responses
- **Implementation**: Proper error field, success logic, and middleware integration

#### **Robust Mocking Patterns**

- **Problem**: Flaky tests due to inconsistent service mocking
- **Solution**: Guaranteed mock patterns for external services
- **Benefits**: Reliable test execution and consistent behavior
- **Implementation**: `jest.doMock`, `jest.resetModules`, and dynamic `require()` patterns

### Environment Configuration

#### Test Environment Setup

```bash
# Test database should be separate from dev/prod
DATABASE_URL="postgresql://username:password@localhost:5432/apiq_test"

# Test environment variables
NODE_ENV="test"
NEXTAUTH_SECRET="test-secret"
OPENAI_API_KEY="test-key"
ENCRYPTION_KEY="test-encryption-key-32-chars-long"
```

#### Jest Configuration

The project uses a comprehensive Jest setup with polyfills and separate configurations:

**Main Configuration (`jest.config.js`)**

```javascript
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  setupFiles: ["<rootDir>/jest.polyfill.js"],
  testEnvironment: "jsdom",
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/unit/**/*.test.tsx",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "pages/**/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!**/tests/**",
  ],
  coverageDirectory: "coverage/unit",
  testTimeout: 10000,
  maxWorkers: "50%",
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  transformIgnorePatterns: ["/node_modules/(?!(node-fetch)/)"],
};

module.exports = createJestConfig(customJestConfig);
```

**Integration Test Configuration (`jest.integration.config.js`)**

```javascript
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.integration.setup.js"],
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
  testTimeout: 30000,
  forceExit: true,
  setupFiles: ["<rootDir>/jest.polyfill.js"],
};
```

**Polyfill Configuration (`jest.polyfill.js`)**

- TextEncoder/TextDecoder for Node.js compatibility
- Crypto API polyfill for encryption operations
- Fetch API polyfill for HTTP requests
- StructuredClone polyfill for object cloning
- GlobalThis support for older Node versions

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

# Run tests in watch mode
npm test -- --watch
```

### Test Utilities

#### Test Helpers (`/tests/helpers/`)

- `testUtils.ts`: Common test utilities for creating users, connections, and endpoints
- Real JWT generation from login endpoints
- Database cleanup utilities
- Mock request/response creators

#### Test Data Factories

```typescript
// Create test user with real password hash
const testUser = await createTestUser({
  email: "test@example.com",
  password: "testpass123",
  role: "ADMIN",
});

// Create API connection
const connection = await createTestConnection({
  userId: testUser.id,
  name: "Test API",
  baseUrl: "https://api.example.com",
});

// Get real JWT token
const token = await getAuthToken(testUser.email, "testpass123");
```

### Test Coverage Requirements

- **Statements**: 80% minimum (core business logic)
- **Branches**: 80% minimum (core business logic)
- **Functions**: 80% minimum (core business logic)
- **Lines**: 80% minimum (core business logic)

### Continuous Integration

All tests must pass in CI before code can be merged:

- Unit tests
- Integration tests
- Type checking
- Linting
- Security scanning
- Coverage thresholds

**Note**: For detailed testing workflows and when to run each type of test, see `docs/TESTING.md`.

### External Service Testing

For external services (OpenAI, external APIs), we use mocks in tests but ensure:

- Real integration tests exist
- Error handling is tested
- Structured logging prevents circular references

## Security Guidelines

### Authentication & Authorization

1. **Session Management**

   ```typescript
   // lib/auth/session.ts
   import { getServerSession } from "next-auth/next";
   import { authOptions } from "@/pages/api/auth/[...nextauth]";

   export const requireAuth = async (
     req: NextApiRequest,
     res: NextApiResponse,
   ) => {
     const session = await getServerSession(req, res, authOptions);

     if (!session) {
       throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
     }

     return session;
   };

   export const requireRole = (allowedRoles: Role[]) => {
     return async (req: NextApiRequest, res: NextApiResponse) => {
       const session = await requireAuth(req, res);

       if (!allowedRoles.includes(session.user.role)) {
         throw new AppError("Forbidden", 403, "FORBIDDEN");
       }

       return session;
     };
   };
   ```

2. **Input Sanitization**

   ```typescript
   // lib/security/sanitize.ts
   import DOMPurify from "isomorphic-dompurify";

   export const sanitizeInput = (input: string): string => {
     return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
   };

   export const validateUrl = (url: string): boolean => {
     try {
       const parsed = new URL(url);
       return ["http:", "https:"].includes(parsed.protocol);
     } catch {
       return false;
     }
   };
   ```

### Data Protection

1. **Encryption**

   ```typescript
   // lib/security/encryption.ts
   import crypto from "crypto";

   const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
   const ALGORITHM = "aes-256-gcm";

   export const encrypt = (text: string): string => {
     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
     cipher.setAAD(iv);

     let encrypted = cipher.update(text, "utf8", "hex");
     encrypted += cipher.final("hex");

     const authTag = cipher.getAuthTag();

     return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
   };

   export const decrypt = (encryptedText: string): string => {
     const [ivHex, authTagHex, encrypted] = encryptedText.split(":");

     const iv = Buffer.from(ivHex, "hex");
     const authTag = Buffer.from(authTagHex, "hex");

     const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
     decipher.setAAD(iv);
     decipher.setAuthTag(authTag);

     let decrypted = decipher.update(encrypted, "hex", "utf8");
     decrypted += decipher.final("utf8");

     return decrypted;
   };
   ```

### Secrets Management

The Secrets Vault provides secure storage and management of sensitive data. Here's how to use it in development:

1. **Environment Setup**

   ```env
   # Required for Secrets Vault
   ENCRYPTION_MASTER_KEY="your-32-character-master-key-for-secrets-vault"
   ```

2. **Using the Secrets Vault**

   ```typescript
   // lib/secrets/secretsVault.ts
   import { SecretsVault } from "@/lib/secrets/secretsVault";

   const vault = new SecretsVault();

   // Store a secret
   const secretData = {
     value: "sk_test_your_api_key_here",
     metadata: {
       description: "Stripe test API key",
       environment: "test",
     },
   };

   const secret = await vault.storeSecret(
     userId,
     "stripe-test-key",
     secretData,
     "api_key",
   );

   // Retrieve a secret (metadata only)
   const secretMetadata = await vault.getSecretMetadata(
     userId,
     "stripe-test-key",
   );

   // Retrieve secret value (for use in workflows)
   const secretValue = await vault.getSecretValue(userId, "stripe-test-key");
   ```

3. **Input Validation**

   ```typescript
   // The vault automatically validates all inputs:
   // - Secret names: alphanumeric, hyphens, underscores only
   // - User IDs: non-empty strings
   // - Values: non-empty strings
   // - Rate limiting: 100 requests/minute per user

   // Example validation error
   try {
     await vault.storeSecret(userId, "invalid name!", { value: "test" });
   } catch (error) {
     // Error: "Invalid secret name: contains invalid characters"
   }
   ```

4. **Security Best Practices**

   ```typescript
   // Never log sensitive information
   const secretValue = await vault.getSecretValue(userId, "api-key");

   // ✅ Good - log metadata only
   console.log(
     `Retrieved secret: ${secretMetadata.name} (version ${secretMetadata.version})`,
   );

   // ❌ Bad - never log the actual value
   console.log(`Secret value: ${secretValue}`); // This will be caught by security rules
   ```

5. **Testing Secrets**

   ```typescript
   // tests/unit/lib/secrets/secretsVault.test.ts
   describe("SecretsVault", () => {
     beforeEach(async () => {
       // Clear test data and reset rate limits
       await prisma.secret.deleteMany({ where: { userId: testUserId } });
       if (vault && vault["rateLimitCache"]) {
         vault["rateLimitCache"].clear();
       }
     });

     it("should store and retrieve secrets securely", async () => {
       const secretData = { value: "test-secret-value" };

       const secret = await vault.storeSecret(
         testUserId,
         "test-secret",
         secretData,
       );

       expect(secret.name).toBe("test-secret");
       expect(secret.version).toBe(1);

       const retrievedValue = await vault.getSecretValue(
         testUserId,
         "test-secret",
       );
       expect(retrievedValue).toBe("test-secret-value");
     });
   });
   ```

## Performance Guidelines

### Frontend Optimization

1. **Code Splitting**

   ```typescript
   // Dynamic imports for large components
   const WorkflowBuilder = dynamic(() => import('@/components/workflow/WorkflowBuilder'), {
     loading: () => <div>Loading...</div>,
     ssr: false
   });
   ```

2. **Image Optimization**

   ```typescript
   import Image from 'next/image';

   export const OptimizedImage = ({ src, alt, ...props }) => (
     <Image
       src={src}
       alt={alt}
       width={400}
       height={300}
       placeholder="blur"
       blurDataURL="data:image/jpeg;base64,..."
       {...props}
     />
   );
   ```

### Backend Optimization

1. **Database Queries**

   ```typescript
   // Optimize queries with proper includes
   const userWithConnections = await prisma.user.findUnique({
     where: { id: userId },
     include: {
       apiConnections: {
         include: {
           endpoints: {
             select: {
               id: true,
               path: true,
               method: true,
             },
           },
         },
       },
     },
   });
   ```

2. **Caching Strategy**

   ```typescript
   // lib/cache/redis.ts
   import Redis from "ioredis";

   const redis = new Redis(process.env.REDIS_URL);

   export const cacheApiResponse = async (
     key: string,
     data: any,
     ttl: number = 3600,
   ) => {
     await redis.setex(key, ttl, JSON.stringify(data));
   };

   export const getCachedResponse = async (key: string) => {
     const cached = await redis.get(key);
     return cached ? JSON.parse(cached) : null;
   };
   ```

## Deployment

### Environment Configuration

1. **Production Environment Variables**

   ```env
   # Database
   DATABASE_URL="postgresql://user:pass@host:port/dbname"

   # Authentication
   NEXTAUTH_SECRET="your-production-secret"
   NEXTAUTH_URL="https://your-domain.com"

   # OpenAI
   OPENAI_API_KEY="sk-your-production-key"

   ```

# Redis (for caching)

REDIS_URL="redis://localhost:6379"

# Monitoring

SENTRY_DSN="your-sentry-dsn"

````

2. **Build Process**
```bash
# Install dependencies
npm ci --only=production

# Build application
npm run build

# Run database migrations
npx prisma migrate deploy

# Start production server
npm start
````

### Monitoring & Logging

1. **Error Tracking**

   ```typescript
   // lib/monitoring/sentry.ts
   import * as Sentry from "@sentry/nextjs";

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   });

   export const captureException = (error: Error, context?: any) => {
     Sentry.captureException(error, {
       extra: context,
     });
   };
   ```

2. **Performance Monitoring**

   ```typescript
   // lib/monitoring/performance.ts
   export const measureApiPerformance = async (
     name: string,
     fn: () => Promise<any>,
   ) => {
     const start = performance.now();

     try {
       const result = await fn();
       const duration = performance.now() - start;

       // Log performance metrics
       console.log(`API ${name} took ${duration}ms`);

       return result;
     } catch (error) {
       const duration = performance.now() - start;
       console.error(`API ${name} failed after ${duration}ms:`, error);
       throw error;
     }
   };
   ```

## 🚨 Mock/Test Data Policy & Automated Checks

- **No mock or hardcoded data is allowed in dev or prod code or documentation.**
- All test users, demo keys, and mock data must only exist in test scripts or test databases.
- A pre-commit hook and CI check will block any commit/PR that introduces forbidden patterns (e.g., `test-user-123`, `demo-key`, `fake API`, etc.) in non-test code or docs.
- See `package.json` and `.github/workflows/no-mock-data.yml` for details.

This development guide provides comprehensive coverage of the development process, coding standards, and best practices for the APIQ project. Follow these guidelines to ensure code quality, security, and maintainability.

### OpenAPI Cache & Parser

- The OpenAPI cache and parser logic have been improved for better error handling and endpoint extraction. See `src/utils/openApiCache.ts` and `src/lib/api/parser.ts` for details.

### Debug & Test Scripts

- New scripts added for development and debugging:
  - `clear-cache.js`: Clear the OpenAPI cache
  - `debug-openapi.js`: Debug OpenAPI ingestion
  - `debug-parser.js`: Debug OpenAPI parsing
  - `/api/oauth/test.ts`: Test OAuth2 endpoints

### Config Changes

- `next.config.js` has been updated. Review for any new environment or build settings that may affect local or production builds.

### Integration Test Mocking

- **Integration Test Mocking**: All integration tests must mock external API calls. Never rely on live network access for integration test reliability.
- **Correct Import Paths**: Always import shared libraries (like the Prisma client) from `lib/database/client` to ensure compatibility across environments and test runners.

## Testing Guidelines

### Unit Testing

- Write unit tests for all utility functions and services
- Mock external dependencies (APIs, databases)
- Test error conditions and edge cases
- Maintain 80%+ code coverage

### Integration Testing

- Test API endpoints with real database connections
- Test authentication flows end-to-end
- Test OAuth2 provider integrations
- Test workflow execution with real APIs

### E2E Testing

- Test complete user workflows
- Test authentication and authorization
- Test error handling and recovery
- Test performance under load

## Security Development Guidelines

### Input Validation

- Validate all user inputs at API boundaries
- Sanitize data before database storage
- Use TypeScript for compile-time type safety
- Implement runtime validation with zod schemas

### Authentication & Authorization

- Use NextAuth.js for session management
- Implement proper RBAC (Role-Based Access Control)
- Validate user permissions on all operations
- Use secure token storage and rotation

### Data Protection

- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper audit logging
- Never log sensitive information

## Encrypted Secrets Vault Development

### Overview

The Encrypted Secrets Vault provides secure storage for sensitive data such as API keys, OAuth2 tokens, and custom secrets. All secrets are encrypted with AES-256 and include comprehensive input validation, rate limiting, and audit logging.

### Key Components

#### SecretsVault Class

```typescript
import { SecretsVault } from "@/lib/secrets/secretsVault";

// Initialize with Prisma client
const vault = new SecretsVault(prisma);

// Store a secret
const secret = await vault.storeSecret(
  userId,
  "stripe-api-key",
  { value: "sk_test_..." },
  "api_key",
  new Date("2024-12-31"),
);

// Retrieve a secret
const secretData = await vault.getSecret(userId, "stripe-api-key");

// List all secrets (metadata only)
const secrets = await vault.listSecrets(userId);

// Delete a secret
await vault.deleteSecret(userId, "stripe-api-key");
```

#### Security Features

**Input Validation:**

```typescript
// Names: alphanumeric, hyphens, underscores only
// Length: names ≤ 100 chars, values ≤ 10,000 chars
// Types: api_key, oauth2_token, webhook_secret, custom

// Valid names
"stripe-api-key"; // ✅ Valid
"oauth2_token_123"; // ✅ Valid
"my secret"; // ❌ Invalid (contains space)

// Valid types
"api_key"; // ✅ Valid
"oauth2_token"; // ✅ Valid
"webhook_secret"; // ✅ Valid
"custom"; // ✅ Valid
"invalid_type"; // ❌ Invalid
```

**Rate Limiting:**

```typescript
// Per-user rate limiting: 100 requests per minute
// Configurable via environment variables
SECRETS_RATE_LIMIT_WINDOW = 60000; // 1 minute
SECRETS_RATE_LIMIT_MAX_REQUESTS = 100; // Max requests
```

**Encryption:**

```typescript
// AES-256 encryption with master key rotation
// Master key managed via environment variable
ENCRYPTION_MASTER_KEY = your - secure - master - key - here;

// Key rotation without data loss
await vault.rotateKeys();
```

#### Database Schema

```sql
-- Secret table for encrypted storage
CREATE TABLE "Secret" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "encryptedData" TEXT NOT NULL,
  "keyId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Secret_pkey" PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE INDEX "Secret_userId_idx" ON "Secret"("userId");
CREATE INDEX "Secret_name_idx" ON "Secret"("name");
CREATE INDEX "Secret_type_idx" ON "Secret"("type");
```

#### Testing Guidelines

**Unit Tests:**

```typescript
describe("SecretsVault", () => {
  it("should store and retrieve secrets", async () => {
    const vault = new SecretsVault(mockPrisma);
    const secretData = { value: "test-secret" };

    const secret = await vault.storeSecret("user1", "test-secret", secretData);
    expect(secret.name).toBe("test-secret");

    const retrieved = await vault.getSecret("user1", "test-secret");
    expect(retrieved.value).toBe("test-secret");
  });

  it("should validate input parameters", async () => {
    const vault = new SecretsVault(mockPrisma);

    await expect(
      vault.storeSecret("", "test", { value: "secret" }),
    ).rejects.toThrow("Invalid userId");

    await expect(
      vault.storeSecret("user1", "", { value: "secret" }),
    ).rejects.toThrow("Invalid secret name");
  });

  it("should enforce rate limiting", async () => {
    const vault = new SecretsVault(mockPrisma);

    // Submit 101 requests (exceeds limit of 100)
    for (let i = 0; i < 101; i++) {
      if (i < 100) {
        await vault.storeSecret("user1", `secret-${i}`, { value: "test" });
      } else {
        await expect(
          vault.storeSecret("user1", `secret-${i}`, { value: "test" }),
        ).rejects.toThrow("Rate limit exceeded");
      }
    }
  });
});
```

**Integration Tests:**

```typescript
describe("Secrets API Integration", () => {
  it("should handle complete secret lifecycle", async () => {
    // Create secret
    const createResponse = await request(app)
      .post("/api/secrets")
      .send({
        name: "test-api-key",
        type: "api_key",
        value: "sk_test_...",
        metadata: { description: "Test key" },
      });

    expect(createResponse.status).toBe(201);

    // Retrieve secret
    const getResponse = await request(app).get(
      `/api/secrets/${createResponse.body.data.id}`,
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.name).toBe("test-api-key");

    // Delete secret
    const deleteResponse = await request(app).delete(
      `/api/secrets/${createResponse.body.data.id}`,
    );

    expect(deleteResponse.status).toBe(200);
  });
});
```

#### CLI Tools

**Key Rotation:**

```bash
# Rotate master encryption key
npm run rotate-secrets

# Generate new master key
npm run generate-master-key
```

**Health Monitoring:**

```typescript
// Check vault health
const health = await vault.getHealthStatus();
console.log("Vault Status:", health.status);
console.log("Active Secrets:", health.activeSecrets);
console.log("Key Count:", health.keyCount);
```

## Queue Management Development

### Overview

The Queue Management system provides robust job queue management using PgBoss 10.3.2 for workflow execution. It includes comprehensive job management, worker registration, health monitoring, and error handling.

### Key Components

#### QueueService Class

```typescript
import { QueueService, QueueJob, QueueConfig } from "@/lib/queue/queueService";

// Initialize with custom configuration
const queueService = new QueueService(prisma, {
  maxConcurrency: 10,
  retryLimit: 3,
  retryDelay: 5000,
  timeout: 300000,
  healthCheckInterval: 30000,
});

await queueService.initialize();
```

#### Job Submission

```typescript
// Submit a job with comprehensive options
const job: QueueJob = {
  queueName: "workflow-execution",
  name: "process-customer-data",
  data: {
    workflowId: "workflow_123",
    userId: "user_456",
    parameters: { input: "test data" },
  },
  retryLimit: 3,
  retryDelay: 5000,
  timeout: 300000,
  priority: 5,
  delay: 0,
  expireIn: 3600000,
  jobKey: "customer-sync-123", // Optional: for deduplication
};

const result = await queueService.submitJob(job);
// Returns: { queueName: 'workflow-execution', jobId: 'job-123' }
```

#### Worker Registration

```typescript
// Register a worker with configurable options
await queueService.registerWorker(
  "workflow-execution",
  async (jobData) => {
    // Process the job
    const result = await processWorkflow(jobData);
    return result;
  },
  {
    teamSize: 5, // Number of concurrent workers
    timeout: 300000,
    retryLimit: 3,
    dataSchema: z.object({
      // Optional: runtime validation
      workflowId: z.string(),
      userId: z.string(),
      parameters: z.record(z.any()),
    }),
  },
);
```

#### Job Management

```typescript
// Cancel a job
await queueService.cancelJob("workflow-execution", "job-123");

// Get job status
const status = await queueService.getJobStatus("workflow-execution", "job-123");
console.log("Job State:", status.state);
console.log("Retry Count:", status.retryCount);
console.log("Created:", status.createdOn);
```

#### Health Monitoring

```typescript
// Get overall health status
const health = await queueService.getHealthStatus();
console.log("Status:", health.status);
console.log("Active Jobs:", health.activeJobs);
console.log("Queued Jobs:", health.queuedJobs);
console.log("Failed Jobs:", health.failedJobs);
console.log("Workers:", health.workers);

// Get worker statistics
const stats = queueService.getWorkerStats();
stats.forEach((worker) => {
  console.log(`Worker ${worker.workerId}:`, {
    active: worker.activeJobs,
    completed: worker.completedJobs,
    failed: worker.failedJobs,
  });
});
```

#### Job States

```typescript
// Supported job states (PgBossJobState)
type JobState =
  | "created" // Job created and queued
  | "retry" // Job failed and scheduled for retry
  | "active" // Job currently being processed
  | "completed" // Job completed successfully
  | "cancelled" // Job was cancelled
  | "expired" // Job expired before execution
  | "failed"; // Job failed after all retries
```

#### Configuration Options

```typescript
interface QueueConfig {
  maxConcurrency: number; // Default: 10
  retryLimit: number; // Default: 3
  retryDelay: number; // Default: 5000ms
  timeout: number; // Default: 300000ms
  healthCheckInterval: number; // Default: 30000ms
  connectionString?: string; // Optional: custom DB connection
}
```

#### Error Handling

```typescript
// Comprehensive error handling
try {
  const result = await queueService.submitJob(job);
} catch (error) {
  if (error.message.includes("Validation")) {
    // Handle validation errors
    console.error("Invalid job data:", error.message);
  } else if (error.message.includes("Connection")) {
    // Handle connection errors
    console.error("Database connection failed");
  } else if (error.message.includes("Duplicate")) {
    // Handle duplicate jobKey
    console.error("Job already exists with this key");
  } else {
    // Handle other errors
    console.error("Unexpected error:", error.message);
  }
}
```

#### Testing Guidelines

**Unit Tests:**

```typescript
describe("QueueService", () => {
  it("should submit and process jobs", async () => {
    const queueService = new QueueService(mockPrisma);
    await queueService.initialize();

    // Register worker
    await queueService.registerWorker("test-queue", async (data) => {
      return { processed: data.input };
    });

    // Submit job
    const job = {
      queueName: "test-queue",
      name: "test-job",
      data: { input: "test data" },
    };

    const result = await queueService.submitJob(job);
    expect(result.queueName).toBe("test-queue");
    expect(result.jobId).toBeDefined();

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check status
    const status = await queueService.getJobStatus("test-queue", result.jobId);
    expect(status.state).toBe("completed");
  });

  it("should handle job cancellation", async () => {
    const queueService = new QueueService(mockPrisma);
    await queueService.initialize();

    // Submit a job
    const result = await queueService.submitJob({
      queueName: "test-queue",
      name: "test-job",
      data: { input: "test" },
    });

    // Cancel the job
    await queueService.cancelJob("test-queue", result.jobId);

    // Check status
    const status = await queueService.getJobStatus("test-queue", result.jobId);
    expect(status.state).toBe("cancelled");
  });
});
```

**Integration Tests:**

```typescript
describe("Queue API Integration", () => {
  it("should handle complete job lifecycle", async () => {
    // Submit job
    const submitResponse = await request(app)
      .post("/api/queue/jobs")
      .send({
        queueName: "test-queue",
        name: "test-job",
        data: { input: "test data" },
      });

    expect(submitResponse.status).toBe(201);
    const { jobId } = submitResponse.body.data;

    // Check job status
    const statusResponse = await request(app).get(
      `/api/queue/jobs/test-queue/${jobId}`,
    );

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data.state).toBeDefined();

    // Cancel job
    const cancelResponse = await request(app).delete(
      `/api/queue/jobs/test-queue/${jobId}`,
    );

    expect(cancelResponse.status).toBe(200);
  });
});
```

#### Best Practices

1. **Always provide queueName**: Required for all job operations
2. **Use jobKey for deduplication**: Prevents duplicate job execution
3. **Validate job data**: Use zod schemas for runtime validation
4. **Handle errors gracefully**: Implement proper error handling in workers
5. **Monitor health**: Regular health checks for queue status
6. **Configure timeouts**: Set appropriate timeouts for job execution
7. **Use teamSize for parallelism**: Configure worker concurrency appropriately
8. **Sanitize job data**: Remove sensitive information from logs
9. **Implement retry logic**: Handle transient failures gracefully
10. **Monitor performance**: Track job duration and throughput

#### Environment Configuration

```bash
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/apiq"

# Queue configuration (optional)
QUEUE_MAX_CONCURRENCY=10
QUEUE_RETRY_LIMIT=3
QUEUE_RETRY_DELAY=5000
QUEUE_TIMEOUT=300000
```

## Performance Optimization

// ... existing code ...

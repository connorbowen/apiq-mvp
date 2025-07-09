# APIQ Development Guide

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Coding Standards](#coding-standards)
4. [Database Development](#database-development)
5. [API Development](#api-development)
6. [Frontend Development](#frontend-development)
7. [Accessibility and UX Features](#accessibility-and-ux-features)
8. [Testing Strategy](#testing-strategy)
9. [Development Tools & Scripts](#development-tools--scripts)
10. [Security Guidelines](#security-guidelines)
11. [Performance Guidelines](#performance-guidelines)
12. [Deployment](#deployment)

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **PostgreSQL**: Version 14.0 or higher
- **Git**: Latest version
- **OpenAI API Key**: For natural language workflow generation
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

   # OpenAI (Required for natural language workflow generation)
   OPENAI_API_KEY="sk-your-openai-api-key"

   # Google OAuth2 (required for Google OAuth2 E2E and unit tests)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Security (Required for secrets vault)
   ENCRYPTION_MASTER_KEY="your-32-character-master-key-here"
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

   **OpenAI Setup Notes:**
   - Required for natural language workflow generation
   - Get your API key from https://platform.openai.com/api-keys
   - Ensure you have sufficient credits for development and testing

   **Secrets Vault Setup Notes:**
   - Generate a secure 32-character master key for encryption
   - Use: `openssl rand -hex 16` to generate a secure key
   - Never commit the master key to version control

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
│   │   ├── connections/     # API connection management
│   │   ├── workflows/       # Workflow endpoints
│   │   │   ├── generate     # Natural language workflow generation
│   │   │   └── executions   # Workflow execution control
│   │   ├── secrets/         # Secrets vault management
│   │   └── audit-logs/      # Audit log endpoints
│   ├── _app.tsx            # App wrapper
│   ├── _document.tsx       # Document wrapper
│   ├── index.tsx           # Landing page
│   ├── dashboard/          # Main dashboard with tabbed navigation
│   ├── auth/               # Authentication pages
│   ├── connections/        # API connection management pages
│   ├── workflows/          # Workflow pages
│   ├── secrets/            # Secrets management pages
│   └── admin/              # Admin pages
├── /components             # Reusable React components
│   ├── /ui                 # Base UI components
│   ├── /auth               # Authentication components
│   ├── /dashboard          # Dashboard components
│   ├── /workflow           # Workflow components
│   ├── /chat               # Natural language chat interface
│   ├── /secrets            # Secrets management components
│   └── /layout             # Layout components
├── /lib                    # Utility functions and services
│   ├── /auth               # Authentication utilities
│   ├── /api                # API utilities
│   ├── /openai             # OpenAI integration for workflow generation
│   ├── /secrets            # Secrets vault management
│   ├── /workflow           # Workflow execution engine
│   │   ├── executor        # Workflow execution logic
│   │   ├── stepRunner      # Step execution engine
│   │   └── executionStateManager # Execution state management
│   ├── /queue              # Job queue management (PgBoss)
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
│   ├── rotate-secrets.js   # Secrets vault key rotation
│   ├── apply-test-pattern.js # Test pattern codemod
│   ├── check-server-health.js # Server health monitoring
│   ├── identify-slow-tests.sh # Test performance analysis
│   ├── run-performance-test.sh # Performance testing
│   ├── test-health-performance.sh # Health and performance testing
│   └── run-tests.sh        # Test orchestration script
└── /docs                   # Documentation
```

## Development Tools & Scripts

### Test Analysis & Optimization Tools

#### 1. Test Failure Analysis
```bash
# Analyze test failures and identify patterns
node analyze-test-failures.js
```
**Purpose**: Analyzes Jest test results to identify failing test suites and their failure patterns.

**Features**:
- Ranks failing test suites by failure count
- Shows failure rates and error messages
- Provides optimization recommendations
- Color-coded output for easy reading

**Output Example**:
```
Test Failure Analysis
Found 3 failing test suites

Rank │ Suite Name                    │ Failed │ Passed │ Total │ Failure % │ First Error
─────┼───────────────────────────────┼────────┼────────┼───────┼───────────┼─────────────────────
1    │ auth-flow.test.ts             │ 5      │ 15     │ 20    │ 25.0%     │ Database connection failed
2    │ oauth2.test.ts                │ 3      │ 12     │ 15    │ 20.0%     │ OAuth2 provider not configured
3    │ secrets.test.ts               │ 2      │ 8      │ 10    │ 20.0%     │ Encryption key missing
```

#### 2. Test Pattern Application
```bash
# Apply consistent test patterns to integration tests
node scripts/apply-test-pattern.js
```
**Purpose**: Codemod script that applies consistent test data patterns to integration tests.

**Features**:
- Automatically adds `createTestData` imports
- Converts `beforeAll` to `beforeEach` for test isolation
- Removes redundant `afterAll` cleanup blocks
- Detects test data types based on file content
- Ensures proper test isolation and cleanup

**Usage**:
```bash
# Apply to all integration tests
node scripts/apply-test-pattern.js

# Apply to specific test file
node scripts/apply-test-pattern.js tests/integration/api/auth.test.ts
```

#### 3. Slow Test Identification
```bash
# Identify and analyze slow-running tests
./scripts/identify-slow-tests.sh
```
**Purpose**: Identifies tests that are taking too long to run and need optimization.

**Features**:
- Measures execution time for each test
- Identifies tests taking >5 seconds
- Detects tests that timeout
- Provides optimization recommendations
- Generates performance report

**Output Example**:
```
🔍 Identifying Slow Integration Tests
=====================================

📊 Performance Summary
=====================
Test File | Duration | Status
---------|----------|--------
auth-flow.test.ts    | 8.5s     | ✅ PASS
oauth2.test.ts       | 6.2s     | ✅ PASS
secrets.test.ts      | 4.1s     | ✅ PASS

🎯 Optimization Recommendations:

🚨 Tests taking >5 seconds (need optimization):
   - auth-flow.test.ts
   - oauth2.test.ts

⏰ Tests that timed out (critical optimization needed):
   - workflow.test.ts
```

#### 4. Server Health Monitoring
```bash
# Check if development server is running and healthy
node scripts/check-server-health.js
```
**Purpose**: Verifies that the development server is running and responding correctly.

**Features**:
- Checks server health endpoint
- Provides helpful error messages
- Suggests next steps if server is down
- Used by E2E tests to ensure server is ready

**Usage**:
```bash
# Check default server (localhost:3000)
node scripts/check-server-health.js

# Check custom server
BASE_URL=http://localhost:3001 node scripts/check-server-health.js
```

#### 5. Performance Testing
```bash
# Run performance tests for health endpoints
./scripts/run-performance-test.sh

# Run E2E performance tests with environment-aware budgets
npm run test:e2e:performance-area
```
**Purpose**: Tests the performance and reliability of health endpoints and UI pages under load.

**Features**:
- Load tests health endpoints and UI pages
- Measures response times with high-precision timing
- Uses environment-aware performance budgets (3s local, 5s CI)
- Identifies performance bottlenecks
- Generates performance reports
- Follows Playwright best practices for performance testing

### Database & Infrastructure Tools

#### 1. Secrets Vault Key Rotation
```bash
# Rotate secrets vault master key
npm run rotate-secrets
```
**Purpose**: Securely rotates the master encryption key for the secrets vault.

**Features**:
- Re-encrypts all secrets with new master key
- Maintains data integrity during rotation
- Updates environment configuration
- Provides rollback capabilities

**Security Notes**:
- Only run in production environments
- Ensure backup of old master key
- Test in staging environment first
- Coordinate with team for deployment

#### 2. Database Health Check
```bash
# Test database connection and health
npm run db:health
```
**Purpose**: Verifies database connectivity and health status.

**Features**:
- Tests database connection
- Validates schema integrity
- Checks migration status
- Reports database health metrics

### Development Workflow Tools

#### 1. Smart Development Server
```bash
# Start development server with automatic setup
npm run smart-dev
```
**Purpose**: Intelligent development server that handles setup automatically.

**Features**:
- Automatically runs database migrations
- Generates Prisma client if needed
- Checks environment configuration
- Provides helpful error messages
- Optimized for development workflow

#### 2. Test Orchestration
```bash
# Run comprehensive test suite with proper setup
./scripts/run-tests.sh
```
**Purpose**: Orchestrates the complete testing workflow.

**Features**:
- Runs all test types in proper order
- Handles test environment setup
- Provides detailed test reports
- Optimizes test execution
- Generates coverage reports

### Debugging & Troubleshooting Tools

#### 1. Test Isolation Helper
```bash
# Generate unique test identifiers
node tests/helpers/testIsolation.js
```
**Purpose**: Helps create unique test data to prevent test conflicts.

**Features**:
- Generates unique emails and identifiers
- Ensures test isolation
- Prevents test data conflicts
- Improves test reliability

#### 2. Server Health Performance Test
```bash
# Test server health under load
./scripts/test-health-performance.sh
```
**Purpose**: Tests server health endpoints under various load conditions.

**Features**:
- Load tests health endpoints
- Measures response times
- Identifies performance issues
- Generates performance metrics

### Environment Management Tools

#### 1. Environment Validation
```bash
# Validate environment configuration
npm run validate-env
```
**Purpose**: Validates that all required environment variables are set correctly.

**Features**:
- Checks required environment variables
- Validates variable formats
- Provides helpful error messages
- Ensures proper configuration

#### 2. Development Environment Setup
```bash
# Complete development environment setup
npm run setup-dev
```
**Purpose**: Automates the complete development environment setup process.

**Features**:
- Installs dependencies
- Sets up database
- Configures environment
- Runs initial migrations
- Validates setup

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

   export interface Workflow {
     id: string;
     name: string;
     description: string;
     steps: WorkflowStep[];
     userId: string;
     createdAt: Date;
     updatedAt: Date;
   }

   export interface Secret {
     id: string;
     name: string;
     type: SecretType;
     userId: string;
     version: number;
     isActive: boolean;
     expiresAt?: Date;
     createdAt: Date;
     updatedAt: Date;
   }

   export type SecretType = 'api_key' | 'oauth2_token' | 'webhook_secret' | 'custom';
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
   // pages/api/workflows/generate.ts
   import { NextApiRequest, NextApiResponse } from "next";
   import { getServerSession } from "next-auth/next";
   import { authOptions } from "../auth/[...nextauth]";
   import { validateRequest } from "@/lib/validation";
   import { ApiResponse } from "@/types/api";
   import { naturalLanguageWorkflowService } from "@/lib/services/naturalLanguageWorkflowService";

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
       if (req.method === "POST") {
         return await handleGenerateWorkflow(req, res, session);
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

   async function handleGenerateWorkflow(
     req: NextApiRequest,
     res: NextApiResponse<ApiResponse>,
     session: any
   ) {
     const { message } = req.body;
     
     // Validate input
     if (!message || typeof message !== 'string') {
       return res.status(400).json({
         success: false,
         error: "Message is required",
         timestamp: new Date(),
       });
     }

     // Generate workflow using AI
     const workflow = await naturalLanguageWorkflowService.generateWorkflow(
       message,
       session.user.id
     );

     return res.status(200).json({
       success: true,
       data: workflow,
       timestamp: new Date(),
     });
   }
   ```

2. **Input Validation**

   ```typescript
   // lib/validation/workflow.ts
   import { z } from "zod";

   export const generateWorkflowSchema = z.object({
     message: z.string().min(1).max(1000),
     context: z.string().optional(),
   });

   export const createSecretSchema = z.object({
     name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
     type: z.enum(['api_key', 'oauth2_token', 'webhook_secret', 'custom']),
     value: z.string().min(1).max(10000),
     expiresAt: z.string().datetime().optional(),
   });

   // User registration validation with security features
   export const userRegistrationSchema = z.object({
     email: z.string().email("Invalid email format"),
     password: z.string().min(8, "Password must be at least 8 characters long"),
     name: z.string()
       .min(2, "Name must be at least 2 characters")
       .max(50, "Name must be 50 characters or less")
       .regex(/^[a-zA-ZÀ-ÿ0-9\s\-'.]+$/, "Name contains invalid characters"),
   });

   export type GenerateWorkflowInput = z.infer<typeof generateWorkflowSchema>;
   export type CreateSecretInput = z.infer<typeof createSecretSchema>;
   export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
   ```

   **Name Validation Security Features:**
   - **Character Whitelist**: Only allows letters (including accented characters), numbers, spaces, hyphens, apostrophes, and periods
   - **XSS Prevention**: Blocks `<script>` tags and other dangerous HTML constructs
   - **SQL Injection Prevention**: Blocks characters that could be used in SQL injection attacks
   - **Length Limits**: Enforces 2-50 character limits to prevent buffer overflow attacks
   - **International Support**: Supports accented characters (é, í, ñ, etc.) for global user base

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
     workflowExecutions WorkflowExecution[]
     secrets        Secret[]
     auditLogs      AuditLog[]

     @@map("users")
   }

   model Workflow {
     id          String   @id @default(cuid())
     name        String
     description String?
     userId      String
     isActive    Boolean  @default(true)
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     // Relations
     user        User     @relation(fields: [userId], references: [id])
     steps       WorkflowStep[]
     executions  WorkflowExecution[]

     @@map("workflows")
   }

   model WorkflowExecution {
     id          String   @id @default(cuid())
     workflowId  String
     userId      String
     status      ExecutionStatus @default(PENDING)
     progress    Int      @default(0)
     attemptCount Int     @default(0)
     startedAt   DateTime?
     completedAt DateTime?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     // Relations
     workflow    Workflow @relation(fields: [workflowId], references: [id])
     user        User     @relation(fields: [userId], references: [id])
     logs        ExecutionLog[]

     @@map("workflow_executions")
   }

   model Secret {
     id            String      @id @default(cuid())
     name          String
     type          SecretType
     encryptedData String
     keyId         String
     version       Int         @default(1)
     userId        String
     isActive      Boolean     @default(true)
     expiresAt     DateTime?
     createdAt     DateTime    @default(now())
     updatedAt     DateTime    @updatedAt

     // Relations
     user          User        @relation(fields: [userId], references: [id])

     @@map("secrets")
   }

   enum Role {
     USER
     ADMIN
     SUPER_ADMIN
   }

   enum ExecutionStatus {
     PENDING
     RUNNING
     PAUSED
     COMPLETED
     FAILED
     CANCELLED
     RETRYING
   }

   enum SecretType {
     api_key
     oauth2_token
     webhook_secret
     custom
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
         apiConnections: true,
         workflows: {
           include: {
             steps: true,
           },
         },
         secrets: {
           where: { isActive: true },
           select: {
             id: true,
             name: true,
             type: true,
             version: true,
             expiresAt: true,
             createdAt: true,
           },
         },
       },
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

### Component Architecture

The frontend follows a component-based architecture with clear separation of concerns:

1. **Form Components**

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
           <div className="p-4 bg-red-50 border border-red-200 rounded-md">
             <h2 className="text-red-800 font-semibold">Something went wrong</h2>
             <p className="text-red-600">Please try refreshing the page</p>
           </div>
         );
       }

       return this.props.children;
     }
   }
   ```

## Accessibility and UX Features

### Create Connection Modal Accessibility

The Create Connection modal includes comprehensive accessibility features that all developers should maintain:

#### **ARIA Implementation**
```typescript
// Modal container with proper ARIA attributes
<div 
  role="dialog" 
  aria-modal="true" 
  aria-labelledby="modal-title"
  ref={modalRef}
>
  <h3 id="modal-title">Create Connection</h3>
  {/* Modal content */}
</div>
```

#### **Keyboard Navigation**
```typescript
// Auto-focus on first input when modal opens
useEffect(() => {
  nameInputRef.current?.focus();
}, []);

// Focus trap to keep focus within modal
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    // Focus trap logic for Tab key
  };
}, []);
```

#### **Form Validation with Accessibility**
```typescript
// Field-level error handling with ARIA
<input
  aria-required="true"
  aria-invalid={errors.name ? "true" : "false"}
  aria-describedby={errors.name ? "name-error" : undefined}
/>
{errors.name && (
  <div id="name-error" role="alert" className="text-red-600">
    {errors.name.message}
  </div>
)}
```

### ConnectionsTab Search and Filter

The ConnectionsTab includes real-time search and filtering with full accessibility:

#### **Search Implementation**
```typescript
// Real-time search with proper ARIA labels
<input
  data-testid="search-connections"
  aria-label="Search connections"
  placeholder="Search connections..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

#### **Filter Implementation**
```typescript
// Accessible filter dropdown
<select
  data-testid="filter-dropdown"
  aria-label="Filter by auth type"
  value={filterType}
  onChange={(e) => setFilterType(e.target.value)}
>
  <option value="">All types</option>
  <option value="API_KEY">API Key</option>
  <option value="BEARER_TOKEN">Bearer Token</option>
  <option value="BASIC_AUTH">Basic Auth</option>
  <option value="OAUTH2">OAuth2</option>
</select>
```

#### **Combined Filtering Logic**
```typescript
// Search and filter work together seamlessly
const filteredConnections = connections.filter(connection => {
  const matchesSearch = searchTerm === '' || 
    connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    connection.description?.toLowerCase().includes(searchTerm.toLowerCase());
  
  const matchesFilter = filterType === '' || connection.authType === filterType;
  
  return matchesSearch && matchesFilter;
});
```

### Development Guidelines

When working with these components:

1. **Maintain Accessibility**: Always preserve ARIA attributes, keyboard navigation, and focus management
2. **Test Keyboard Navigation**: Ensure all interactive elements are reachable via Tab key
3. **Validate Screen Reader Support**: Test with screen readers to ensure proper announcements
4. **Preserve Search/Filter**: Maintain the real-time search and filtering functionality
5. **Follow UX Patterns**: Use consistent error handling, loading states, and success feedback

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

#### Component Testing Best Practices

```typescript
// ✅ GOOD: Robust text matching for split elements
expect(screen.getAllByText(/Test API Key/i, { exact: false }).length).toBeGreaterThan(0);

// ✅ GOOD: Card-based assertions for filtering tests
const cards = screen.getAllByTestId('secret-card');
expect(cards.some(card => within(card).getByTestId('secret-name-secret-1'))).toBe(true);

// ✅ GOOD: Case-insensitive type comparison
expect(secret.type?.toUpperCase() === 'API_KEY').toBe(true);

// ❌ BAD: Exact text matching that fails with split elements
expect(screen.getByText('Test API Key')).toBeInTheDocument();

// ❌ BAD: Case-sensitive type comparison
expect(secret.type === 'api_key').toBe(true);
```

#### Mock Management

```typescript
// ✅ GOOD: Named export mocking
jest.mock('../../../src/components/ui/SecretTypeSelect', () => ({
  SecretTypeSelect: jest.fn(({ selected, onChange, disabled }) => (
    <select 
      data-testid="secret-type-select"
      value={selected} 
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="API_KEY">API Key</option>
      <option value="BEARER_TOKEN">Bearer Token</option>
    </select>
  ))
}));

// ❌ BAD: Default export mocking for named exports
jest.mock('../../../src/components/ui/SecretTypeSelect', () => 
  jest.fn(() => <div>Mocked Component</div>)
);
```

#### Test Data Consistency

```typescript
// ✅ GOOD: Uppercase types to match UI expectations
const mockSecrets = [
  {
    id: 'secret-1',
    name: 'Test API Key',
    type: 'API_KEY', // Uppercase to match UI
    description: 'A test API key'
  }
];

// ❌ BAD: Lowercase types that don't match UI
const mockSecrets = [
  {
    id: 'secret-1',
    name: 'Test API Key',
    type: 'api_key', // Lowercase doesn't match UI expectations
    description: 'A test API key'
  }
];
```

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

#### E2E Testing with Port Cleanup

All E2E test commands include automatic port cleanup to prevent conflicts:

```bash
# Main E2E test command (includes port cleanup)
npm run test:e2e:current

# Quick feedback during development
npm run test:e2e:fast

# Before commits
npm run test:e2e:smoke

# Run specific E2E test groups (all include port cleanup)
npm run test:e2e:auth        # Authentication & SSO tests
npm run test:e2e:workflows   # Workflow orchestration tests
npm run test:e2e:connections # API connection management tests
npm run test:e2e:ui          # UI & navigation tests

# Manual port cleanup (if needed)
./scripts/kill-port-3000.sh
```

**Port Cleanup Features**:
- **Automatic**: All E2E commands automatically kill processes on port 3000
- **Reliable**: Tests always run on the expected port 3000
- **No Conflicts**: No more port conflicts or tests falling back to different ports
- **Consistent**: Predictable test environment every time

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
     // Reset rate limits using test endpoint
     await request.post('/api/test/reset-rate-limits');
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

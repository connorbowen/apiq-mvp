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
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/apiq_dev"
   
   # NextAuth.js
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   
   # OpenAI
   OPENAI_API_KEY="sk-your-openai-api-key"
   
   # Development
   NODE_ENV="development"
   ```

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
│   └── /e2e                # End-to-end tests
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
     authType: 'api_key' | 'oauth' | 'bearer';
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
   import { NextApiRequest, NextApiResponse } from 'next';
   import { getServerSession } from 'next-auth/next';
   import { authOptions } from '../auth/[...nextauth]';
   import { validateRequest } from '@/lib/validation';
   import { ApiResponse } from '@/types/api';

   export default async function handler(
     req: NextApiRequest,
     res: NextApiResponse<ApiResponse>
   ) {
     try {
       // 1. Authentication check
       const session = await getServerSession(req, res, authOptions);
       if (!session) {
         return res.status(401).json({
           success: false,
           error: 'Unauthorized',
           timestamp: new Date()
         });
       }

       // 2. Method validation
       if (req.method === 'GET') {
         return await handleGet(req, res, session);
       } else if (req.method === 'POST') {
         return await handlePost(req, res, session);
       }

       // 3. Method not allowed
       return res.status(405).json({
         success: false,
         error: 'Method not allowed',
         timestamp: new Date()
       });
     } catch (error) {
       // 4. Error handling
       console.error('API Error:', error);
       return res.status(500).json({
         success: false,
         error: 'Internal server error',
         timestamp: new Date()
       });
     }
   }
   ```

2. **Input Validation**
   ```typescript
   // lib/validation/apiConnection.ts
   import { z } from 'zod';

   export const createApiConnectionSchema = z.object({
     name: z.string().min(1).max(100),
     baseUrl: z.string().url(),
     authType: z.enum(['api_key', 'oauth', 'bearer']),
     authConfig: z.object({
       apiKey: z.string().optional(),
       bearerToken: z.string().optional(),
       // ... other auth config fields
     }),
     documentationUrl: z.string().url().optional()
   });

   export type CreateApiConnectionInput = z.infer<typeof createApiConnectionSchema>;
   ```

3. **Error Handling**
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

   export const handleApiError = (error: unknown) => {
     if (error instanceof AppError) {
       return error;
     }
     
     console.error('Unexpected error:', error);
     return new AppError('Internal server error', 500);
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
   ```

### Database Utilities

1. **Connection Management**
   ```typescript
   // lib/database/client.ts
   import { PrismaClient } from '@prisma/client';

   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
   };

   export const prisma = globalForPrisma.prisma ?? new PrismaClient();

   if (process.env.NODE_ENV !== 'production') {
     globalForPrisma.prisma = prisma;
   }
   ```

2. **Transaction Handling**
   ```typescript
   // lib/database/transactions.ts
   import { prisma } from './client';

   export const createApiConnectionWithEndpoints = async (
     connectionData: CreateApiConnectionInput,
     endpoints: CreateEndpointInput[]
   ) => {
     return await prisma.$transaction(async (tx) => {
       const connection = await tx.apiConnection.create({
         data: connectionData
       });

       const createdEndpoints = await Promise.all(
         endpoints.map(endpoint =>
           tx.endpoint.create({
             data: {
               ...endpoint,
               apiConnectionId: connection.id
             }
           })
         )
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
   import OpenAI from 'openai';

   export const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   });
   ```

2. **Function Calling**
   ```typescript
   // lib/openai/functions.ts
   export const generateFunctionDefinitions = (endpoints: Endpoint[]) => {
     return endpoints.map(endpoint => ({
       name: `${endpoint.apiConnection.name}_${endpoint.method}_${endpoint.path}`,
       description: endpoint.description || `${endpoint.method} ${endpoint.path}`,
       parameters: {
         type: 'object',
         properties: {
           // Generate properties from endpoint parameters
         },
         required: endpoint.requiredParameters || []
       }
     }));
   };
   ```

3. **Chat Completion**
   ```typescript
   // lib/openai/chat.ts
   export const createChatCompletion = async (
     messages: ChatMessage[],
     functions: FunctionDefinition[]
   ) => {
     const completion = await openai.chat.completions.create({
       model: 'gpt-4',
       messages,
       tools: functions.map(fn => ({
         type: 'function' as const,
         function: fn
       })),
       tool_choice: 'auto'
     });

     return completion.choices[0]?.message;
   };
   ```

### API Spec Parsing

1. **Swagger Parser Integration**
   ```typescript
   // lib/api/parser.ts
   import SwaggerParser from '@apidevtools/swagger-parser';

   export const parseOpenApiSpec = async (url: string) => {
     try {
       const api = await SwaggerParser.parse(url);
       
       return {
         info: api.info,
         servers: api.servers,
         paths: api.paths,
         components: api.components
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
         if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
           endpoints.push({
             path,
             method: method.toUpperCase(),
             summary: operation.summary,
             description: operation.description,
             parameters: operation.parameters || [],
             requestBody: operation.requestBody,
             responses: operation.responses
           });
         }
       }
     }

     return endpoints;
   };
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
   import useSWR from 'swr';
   import { ApiConnection } from '@/types/api';

   export const useApiConnections = () => {
     const { data, error, mutate } = useSWR<ApiConnection[]>(
       '/api/apis',
       fetcher
     );

     return {
       connections: data || [],
       loading: !error && !data,
       error,
       mutate
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

### Unit Testing

1. **Test Structure**
   ```typescript
   // tests/unit/lib/validation.test.ts
   import { createApiConnectionSchema } from '@/lib/validation/apiConnection';

   describe('API Connection Validation', () => {
     it('should validate correct input', () => {
       const validInput = {
         name: 'Test API',
         baseUrl: 'https://api.example.com',
         authType: 'api_key' as const,
         authConfig: { apiKey: 'test-key' }
       };

       const result = createApiConnectionSchema.safeParse(validInput);
       expect(result.success).toBe(true);
     });

     it('should reject invalid URL', () => {
       const invalidInput = {
         name: 'Test API',
         baseUrl: 'not-a-url',
         authType: 'api_key' as const,
         authConfig: { apiKey: 'test-key' }
       };

       const result = createApiConnectionSchema.safeParse(invalidInput);
       expect(result.success).toBe(false);
     });
   });
   ```

2. **Component Testing**
   ```typescript
   // tests/unit/components/ApiConnectionForm.test.tsx
   import { render, screen, fireEvent, waitFor } from '@testing-library/react';
   import { ApiConnectionForm } from '@/components/api/ApiConnectionForm';

   describe('ApiConnectionForm', () => {
     it('should submit form with valid data', async () => {
       const mockOnSubmit = jest.fn();
       
       render(<ApiConnectionForm onSubmit={mockOnSubmit} />);

       fireEvent.change(screen.getByLabelText(/name/i), {
         target: { value: 'Test API' }
       });

       fireEvent.change(screen.getByLabelText(/base url/i), {
         target: { value: 'https://api.example.com' }
       });

       fireEvent.click(screen.getByRole('button', { name: /submit/i }));

       await waitFor(() => {
         expect(mockOnSubmit).toHaveBeenCalledWith({
           name: 'Test API',
           baseUrl: 'https://api.example.com',
           authType: 'api_key',
           authConfig: { apiKey: '' }
         });
       });
     });
   });
   ```

### Integration Testing

1. **API Testing**
   ```typescript
   // tests/integration/api/apis.test.ts
   import { createMocks } from 'node-mocks-http';
   import handler from '@/pages/api/apis';
   import { prisma } from '@/lib/database/client';

   describe('/api/apis', () => {
     beforeEach(async () => {
       await prisma.apiConnection.deleteMany();
     });

     it('should create new API connection', async () => {
       const { req, res } = createMocks({
         method: 'POST',
         body: {
           name: 'Test API',
           baseUrl: 'https://api.example.com',
           authType: 'api_key',
           authConfig: { apiKey: 'test-key' }
         }
       });

       await handler(req, res);

       expect(res._getStatusCode()).toBe(201);
       
       const data = JSON.parse(res._getData());
       expect(data.success).toBe(true);
       expect(data.data.name).toBe('Test API');
     });
   });
   ```

### End-to-End Testing

1. **Playwright Setup**
   ```typescript
   // tests/e2e/workflow.spec.ts
   import { test, expect } from '@playwright/test';

   test('complete workflow creation', async ({ page }) => {
     // Navigate to dashboard
     await page.goto('/dashboard');
     
     // Add API connection
     await page.click('[data-testid="add-api-button"]');
     await page.fill('[data-testid="api-name"]', 'Test API');
     await page.fill('[data-testid="api-url"]', 'https://api.example.com');
     await page.click('[data-testid="submit-api"]');
     
     // Create workflow
     await page.click('[data-testid="new-workflow"]');
     await page.fill('[data-testid="workflow-input"]', 'Get user data');
     await page.click('[data-testid="generate-workflow"]');
     
     // Confirm and execute
     await page.click('[data-testid="confirm-workflow"]');
     
     // Verify results
     await expect(page.locator('[data-testid="workflow-success"]')).toBeVisible();
   });
   ```

## Security Guidelines

### Authentication & Authorization

1. **Session Management**
   ```typescript
   // lib/auth/session.ts
   import { getServerSession } from 'next-auth/next';
   import { authOptions } from '@/pages/api/auth/[...nextauth]';

   export const requireAuth = async (req: NextApiRequest, res: NextApiResponse) => {
     const session = await getServerSession(req, res, authOptions);
     
     if (!session) {
       throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
     }
     
     return session;
   };

   export const requireRole = (allowedRoles: Role[]) => {
     return async (req: NextApiRequest, res: NextApiResponse) => {
       const session = await requireAuth(req, res);
       
       if (!allowedRoles.includes(session.user.role)) {
         throw new AppError('Forbidden', 403, 'FORBIDDEN');
       }
       
       return session;
     };
   };
   ```

2. **Input Sanitization**
   ```typescript
   // lib/security/sanitize.ts
   import DOMPurify from 'isomorphic-dompurify';

   export const sanitizeInput = (input: string): string => {
     return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
   };

   export const validateUrl = (url: string): boolean => {
     try {
       const parsed = new URL(url);
       return ['http:', 'https:'].includes(parsed.protocol);
     } catch {
       return false;
     }
   };
   ```

### Data Protection

1. **Encryption**
   ```typescript
   // lib/security/encryption.ts
   import crypto from 'crypto';

   const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
   const ALGORITHM = 'aes-256-gcm';

   export const encrypt = (text: string): string => {
     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
     cipher.setAAD(iv);
     
     let encrypted = cipher.update(text, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     
     const authTag = cipher.getAuthTag();
     
     return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
   };

   export const decrypt = (encryptedText: string): string => {
     const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
     
     const iv = Buffer.from(ivHex, 'hex');
     const authTag = Buffer.from(authTagHex, 'hex');
     
     const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
     decipher.setAAD(iv);
     decipher.setAuthTag(authTag);
     
     let decrypted = decipher.update(encrypted, 'hex', 'utf8');
     decrypted += decipher.final('utf8');
     
     return decrypted;
   };
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
               method: true
             }
           }
         }
       }
     }
   });
   ```

2. **Caching Strategy**
   ```typescript
   // lib/cache/redis.ts
   import Redis from 'ioredis';

   const redis = new Redis(process.env.REDIS_URL);

   export const cacheApiResponse = async (
     key: string,
     data: any,
     ttl: number = 3600
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
   
   # Redis (for caching)
   REDIS_URL="redis://localhost:6379"
   
   # Monitoring
   SENTRY_DSN="your-sentry-dsn"
   ```

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
   ```

### Monitoring & Logging

1. **Error Tracking**
   ```typescript
   // lib/monitoring/sentry.ts
   import * as Sentry from '@sentry/nextjs';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   });

   export const captureException = (error: Error, context?: any) => {
     Sentry.captureException(error, {
       extra: context
     });
   };
   ```

2. **Performance Monitoring**
   ```typescript
   // lib/monitoring/performance.ts
   export const measureApiPerformance = async (
     name: string,
     fn: () => Promise<any>
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

This development guide provides comprehensive coverage of the development process, coding standards, and best practices for the APIQ project. Follow these guidelines to ensure code quality, security, and maintainability. 
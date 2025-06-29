# APIQ Architecture Documentation

## Table of Contents

1. System Overview
2. High-Level Architecture
3. Core Components
4. Data Flow Architecture
5. Security Architecture
6. Scalability Considerations
7. Performance Optimization
8. OpenAPI Spec Caching
9. Deployment Architecture
10. Integration Patterns
11. Error Handling & Resilience
12. Future Architecture Considerations

## System Overview

APIQ is a semi-agentic, low-code web application designed to orchestrate complex workflows across multiple APIs using natural language processing and AI-powered automation. The system follows a modern, scalable architecture that prioritizes security, maintainability, and user experience.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   APIs          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   AI Service    │    │   Audit Logs    │
│   (PostgreSQL)  │    │   (OpenAI)      │    │   (Persistent)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. Frontend Layer (Next.js)

**Technology Stack:**
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + SWR for data fetching
- **Authentication**: NextAuth.js client integration

**Key Components:**
- **Dashboard**: Main application interface
- **API Explorer**: Browse and test connected APIs
- **Chat Interface**: Natural language workflow creation
- **Workflow Builder**: Visual workflow construction
- **Audit Viewer**: Review execution logs and history

### 2. Backend Layer (Next.js API Routes)

**Technology Stack:**
- **Runtime**: Node.js 18+
- **Framework**: Next.js API routes (serverless functions)
- **Language**: TypeScript
- **Database ORM**: Prisma
- **HTTP Client**: Axios

**API Endpoints:**
```
/api/auth/[...nextauth]     # Authentication (NextAuth.js)
/api/apis                   # API connection management
/api/workflows              # Workflow CRUD operations
/api/chat                   # AI chat and workflow generation
/api/execute                # Workflow execution engine
/api/logs                   # Audit log retrieval
```

### 3. Database Layer (PostgreSQL + Prisma)

**Technology Stack:**
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Migrations**: Prisma Migrate
- **Query Builder**: Prisma Client

**Data Models:**
- **User**: Authentication and profile data
- **ApiConnection**: Connected API configurations
- **ApiSpec**: Parsed OpenAPI specifications
- **Endpoint**: Individual API endpoints
- **Workflow**: Workflow definitions
- **WorkflowExecution**: Execution history
- **AuditLog**: Comprehensive audit trail

### 4. AI Integration Layer (OpenAI)

**Technology Stack:**
- **AI Provider**: OpenAI GPT-4
- **Integration**: OpenAI Node.js SDK
- **Function Calling**: OpenAI Function Calling API
- **Prompt Engineering**: Structured system prompts

**Key Features:**
- Natural language to workflow translation
- Dynamic function generation from OpenAPI specs
- Multi-step workflow planning
- Error handling and retry logic

### 5. External API Integration

**Technology Stack:**
- **HTTP Client**: Axios with interceptors
- **Spec Parser**: @apidevtools/swagger-parser
- **Authentication**: Multiple auth schemes support
- **Rate Limiting**: Built-in rate limiting and retry logic

**Supported Authentication Types:**
- API Key
- Bearer Token
- OAuth 2.0
- Basic Authentication

## Data Flow Architecture

### 1. User Authentication Flow

```
User Login Request
       │
       ▼
┌─────────────────┐
│  NextAuth.js    │
│  Credentials    │
│  Provider       │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Prisma Client  │
│  User Lookup    │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  JWT Token      │
│  Generation     │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Session        │
│  Establishment  │
└─────────────────┘
```

### 2. API Connection Flow

```
User Adds API
       │
       ▼
┌─────────────────┐
│  OpenAPI Spec   │
│  URL/File       │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Swagger Parser │
│  Validation     │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Endpoint       │
│  Extraction     │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Database       │
│  Storage        │
└─────────────────┘
```

### 3. Workflow Execution Flow

```
User Natural Language Query
       │
       ▼
┌─────────────────┐
│  OpenAI GPT-4   │
│  Function       │
│  Calling        │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Workflow Plan  │
│  Generation     │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  User           │
│  Confirmation   │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Step-by-Step   │
│  Execution      │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Result         │
│  Compilation    │
└─────────────────┘
```

## Security Architecture

### 1. Authentication & Authorization

**Multi-Layer Security:**
- **Session Management**: NextAuth.js with secure JWT tokens
- **Role-Based Access**: Granular permissions per user role
- **API-Level Security**: Rate limiting and request validation
- **Database Security**: Parameterized queries and input sanitization

**Security Features:**
- Password hashing with bcrypt
- JWT token rotation
- Session timeout management
- CSRF protection
- XSS prevention

### 2. Data Protection

**Encryption Strategy:**
- **At Rest**: AES-256 encryption for sensitive data
- **In Transit**: TLS 1.3 for all communications
- **API Credentials**: Encrypted storage with key rotation
- **Audit Logs**: Immutable, tamper-proof logging

### 3. Compliance & Governance

**Audit Trail:**
- Complete user action logging
- API call tracking and monitoring
- Data access and modification records
- Compliance reporting capabilities

## Scalability Considerations

### 1. Horizontal Scaling

**Stateless Design:**
- API routes are stateless and can be scaled horizontally
- Database connections are pooled and managed
- Session storage is externalized (Redis recommended for production)

**Load Balancing:**
- Multiple API route instances
- Database read replicas
- CDN for static assets

### 2. Performance Optimization

**Caching Strategy:**
- API response caching
- OpenAPI spec caching
- User session caching
- Database query optimization

**Database Optimization:**
- Proper indexing strategy
- Query optimization
- Connection pooling
- Read/write separation

### 3. Monitoring & Observability

**Metrics Collection:**
- API response times
- Database query performance
- AI model usage and costs
- User activity patterns

**Logging Strategy:**
- Structured logging with correlation IDs
- Error tracking and alerting
- Performance monitoring
- Security event logging

## OpenAPI Spec Caching

### Data Flow Diagram

```
User/API Connection
      |
      v
[Spec Fetch (HTTP)]
      |
      v
[OpenAPI Cache (in-memory, TTL, max size, compression)]
      |
      v
[Parser & Validation]
      |
      v
[Database Storage / Endpoint Extraction]
```

### Caching Strategy
- **TTL (Time to Live):** Configurable (default: 1 hour). Specs expire and are re-fetched after TTL.
- **Max Size:** Configurable maximum number of cached specs and total cache size (bytes). Prevents DoS via large specs.
- **Compression:** Large specs are compressed before caching to save memory.
- **Audit Logging:** All fetches, cache hits/misses, and admin actions are logged for traceability.
- **Slow Spec Timeout:** Configurable timeout for slow spec fetches (default: 30s).

### Admin Endpoint
- **Path:** `/api/admin/openapi-cache`
- **Methods:**
  - `GET`: Returns cache stats and entries (URL, fetchedAt, ttlRemaining, size, compressed).
  - `DELETE`: Purges the cache (optionally by URL).
- **Protection:** Requires `x-admin-token` header matching `ADMIN_TOKEN` env var (RBAC recommended for production).
- **Response Example:**
```json
{
  "success": true,
  "stats": {
    "count": 3,
    "maxSize": 100,
    "ttl": 3600,
    "maxSizeBytes": 52428800
  },
  "entries": [
    {
      "url": "https://petstore.swagger.io/v2/swagger.json",
      "fetchedAt": "2024-06-28T12:00:00Z",
      "ttlRemaining": 3590,
      "size": 20480,
      "compressed": false
    }
  ]
}
```

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAPI_CACHE_TTL` | Cache TTL in seconds | 3600 |
| `OPENAPI_CACHE_MAX_SIZE` | Max number of cached specs | 100 |
| `OPENAPI_CACHE_MAX_SIZE_BYTES` | Max total cache size in bytes | 52428800 (50MB) |
| `OPENAPI_CACHE_COMPRESSION` | Enable compression (true/false) | true |
| `OPENAPI_SLOW_SPEC_TIMEOUT` | Timeout for spec fetch in ms | 30000 |
| `ADMIN_TOKEN` | Token for admin endpoint protection | (set by user) |

See `.env.example` for usage.

## Deployment Architecture

### 1. Development Environment

**Local Setup:**
- Next.js development server
- Local PostgreSQL database
- Environment variable configuration
- Hot reloading and debugging

### 2. Production Environment

**Recommended Stack:**
- **Platform**: Vercel (Next.js optimized)
- **Database**: PostgreSQL (managed service)
- **Caching**: Redis (session and API caching)
- **Monitoring**: Vercel Analytics + custom metrics

**Alternative Deployments:**
- **AWS**: Lambda + RDS + CloudFront
- **Docker**: Containerized deployment
- **On-Premise**: Self-hosted with reverse proxy

### 3. CI/CD Pipeline

**Automated Workflow:**
- Code quality checks (ESLint, TypeScript)
- Automated testing (unit, integration)
- Security scanning
- Database migrations
- Deployment automation

## Integration Patterns

### 1. API Integration Patterns

**Standard REST APIs:**
- HTTP methods (GET, POST, PUT, DELETE)
- JSON request/response format
- Standard status codes
- Error handling patterns

**Authentication Patterns:**
- API key in headers
- Bearer token authentication
- OAuth 2.0 flow
- Basic authentication

### 2. AI Integration Patterns

**Function Calling:**
- Dynamic function generation from OpenAPI specs
- Structured parameter validation
- Error handling and retry logic
- Context management across calls

**Prompt Engineering:**
- System prompts for role definition
- User prompts for task specification
- Context injection for workflow state
- Result formatting and validation

## Error Handling & Resilience

### 1. Error Categories

**User Errors:**
- Invalid input validation
- Authentication failures
- Authorization denials
- Resource not found

**System Errors:**
- Database connection failures
- External API timeouts
- AI service unavailability
- Network connectivity issues

### 2. Recovery Strategies

**Retry Logic:**
- Exponential backoff for transient failures
- Circuit breaker pattern for external APIs
- Graceful degradation for non-critical features
- User-friendly error messages

**Fallback Mechanisms:**
- Cached responses when available
- Alternative API endpoints
- Manual workflow execution
- Offline mode for critical functions

## Future Architecture Considerations

### 1. Microservices Evolution

**Potential Split:**
- Authentication service
- API management service
- Workflow execution engine
- AI orchestration service
- Audit logging service

### 2. Advanced AI Features

**Enhanced Capabilities:**
- Multi-modal AI (text, voice, vision)
- Custom model fine-tuning
- Advanced workflow optimization
- Predictive analytics

### 3. Enterprise Features

**Scalability Enhancements:**
- Multi-tenancy support
- Advanced RBAC
- Enterprise SSO integration
- Custom compliance frameworks 
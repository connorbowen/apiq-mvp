# APIQ API Reference

## Overview

This document provides comprehensive documentation for all APIQ backend API endpoints. The API follows RESTful principles and uses JSON for request/response formats.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All API endpoints require authentication using NextAuth.js JWT tokens. Include the session token in your requests:

```bash
# For client-side requests (automatic with NextAuth.js)
# The token is automatically included in requests

# For server-side requests
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

## API Endpoints

### Authentication

#### `GET /api/auth/session`

Get the current user session.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    },
    "expires": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `POST /api/auth/signout`

Sign out the current user.

**Response:**
```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

#### `POST /api/auth/login`
Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "USER"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 900
  },
  "message": "Login successful"
}
```

#### `POST /api/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "expiresIn": 900
  },
  "message": "Token refreshed successfully"
}
```

#### `GET /api/auth/me`
Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "USER"
    }
  }
}
```

### API Connections

#### `GET /api/apis`

Get all API connections for the current user.

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `inactive`)
- `type` (optional): Filter by authentication type
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "api_id",
        "name": "Customer CRM",
        "description": "Customer relationship management API",
        "baseUrl": "https://api.crm.com",
        "authType": "api_key",
        "documentationUrl": "https://api.crm.com/docs",
        "status": "ACTIVE",
        "ingestionStatus": "SUCCEEDED",
        "endpointCount": 15,
        "lastUsed": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 50,
    "active": 45,
    "failed": 5
  }
}
```

> **Note:** The `endpointCount` field is always present in API connection responses. It is `0` if endpoint extraction fails or if the API has no endpoints.

#### `GET /api/apis/{id}`

Get a specific API connection by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "api_id",
    "name": "Customer CRM",
    "description": "Customer relationship management API",
    "baseUrl": "https://api.crm.com",
    "authType": "api_key",
    "authConfig": {
      "apiKey": "***" // masked for security
    },
    "documentationUrl": "https://api.crm.com/docs",
    "status": "ACTIVE",
    "ingestionStatus": "SUCCEEDED",
    "endpoints": [
      {
        "id": "endpoint_id",
        "path": "/customers",
        "method": "GET",
        "summary": "Get customers",
        "description": "Retrieve a list of customers"
      }
    ],
    "endpointCount": 15,
    "lastUsed": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `POST /api/apis`

Create a new API connection.

**Request Body:**
```json
{
  "name": "Customer CRM",
  "description": "Customer relationship management API",
  "baseUrl": "https://api.crm.com",
  "authType": "api_key",
  "authConfig": {
    "apiKey": "your-api-key",
    "headerName": "X-API-Key"
  },
  "documentationUrl": "https://api.crm.com/docs"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_api_id",
    "name": "Customer CRM",
    "description": "Customer relationship management API",
    "baseUrl": "https://api.crm.com",
    "authType": "api_key",
    "status": "ACTIVE",
    "ingestionStatus": "SUCCEEDED",
    "endpointCount": 15,
    "lastUsed": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "API connection created successfully"
}
```

#### `PUT /api/apis/{id}`

Update an existing API connection.

**Request Body:**
```json
{
  "name": "Updated CRM",
  "description": "Updated description",
  "authConfig": {
    "apiKey": "new-api-key"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "api_id",
    "name": "Updated CRM",
    "description": "Updated description",
    "baseUrl": "https://api.crm.com",
    "authType": "api_key",
    "status": "ACTIVE",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "API connection updated successfully"
}
```

#### `DELETE /api/apis/{id}`

Delete an API connection.

**Response:**
```json
{
  "success": true,
  "message": "API connection deleted successfully"
}
```

#### `POST /api/apis/{id}/test`

Test an API connection.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "responseTime": 245,
    "endpoints": 15,
    "newEndpoints": 3,
    "message": "Connection test successful - OpenAPI spec parsed and endpoints extracted"
  }
}
```

#### `POST /api/apis/{id}/refresh`

Refresh the OpenAPI specification for an API connection.

**Response:**
```json
{
  "success": true,
  "data": {
    "endpointsUpdated": 15,
    "newEndpoints": 3,
    "removedEndpoints": 1,
    "specChanged": true,
    "responseTime": 1200,
    "message": "API specification refreshed successfully - endpoints updated"
  }
}
```

### Endpoints

#### `GET /api/apis/{apiId}/endpoints`

Get all endpoints for a specific API connection.

**Query Parameters:**
- `method` (optional): Filter by HTTP method
- `tag` (optional): Filter by OpenAPI tag
- `search` (optional): Search in endpoint descriptions

**Response:**
```json
{
  "success": true,
  "data": {
    "endpoints": [
      {
        "id": "endpoint_id",
        "path": "/customers",
        "method": "GET",
        "summary": "Get customers",
        "description": "Retrieve a list of customers with optional filtering",
        "parameters": [
          {
            "name": "limit",
            "type": "integer",
            "required": false,
            "description": "Number of customers to return"
          }
        ],
        "responses": {
          "200": {
            "description": "Successful response",
            "schema": { /* JSON schema */ }
          }
        }
      }
    ]
  }
}
```

#### `GET /api/apis/{apiId}/endpoints/{endpointId}`

Get detailed information about a specific endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "endpoint_id",
    "path": "/customers/{id}",
    "method": "GET",
    "summary": "Get customer by ID",
    "description": "Retrieve a specific customer by their ID",
    "parameters": [
      {
        "name": "id",
        "in": "path",
        "type": "string",
        "required": true,
        "description": "Customer ID"
      }
    ],
    "requestBody": {
      "required": false,
      "content": {
        "application/json": {
          "schema": { /* JSON schema */ }
        }
      }
    },
    "responses": {
      "200": {
        "description": "Customer found",
        "schema": { /* JSON schema */ }
      },
      "404": {
        "description": "Customer not found"
      }
    }
  }
}
```

#### `POST /api/apis/{apiId}/endpoints/{endpointId}/test`

Test a specific endpoint.

**Request Body:**
```json
{
  "parameters": {
    "id": "customer123"
  },
  "headers": {
    "Accept": "application/json"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statusCode": 200,
    "responseTime": 150,
    "headers": {
      "content-type": "application/json"
    },
    "body": {
      "id": "customer123",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Workflows

#### `GET /api/workflows`

Get all workflows for the current user.

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `active`, `paused`)
- `search` (optional): Search in workflow names and descriptions
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "workflow_id",
        "name": "Customer Onboarding",
        "description": "Automated customer onboarding process",
        "status": "active",
        "stepCount": 5,
        "lastExecuted": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

#### `GET /api/workflows/{id}`

Get a specific workflow by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "workflow_id",
    "name": "Customer Onboarding",
    "description": "Automated customer onboarding process",
    "status": "active",
    "steps": [
      {
        "id": "step_id",
        "name": "Create Customer",
        "type": "api_call",
        "apiConnectionId": "api_id",
        "endpoint": "/customers",
        "method": "POST",
        "parameters": {
          "name": "{{input.customerName}}",
          "email": "{{input.customerEmail}}"
        }
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `POST /api/workflows`

Create a new workflow.

**Request Body:**
```json
{
  "name": "New Workflow",
  "description": "Workflow description",
  "steps": [
    {
      "name": "Step 1",
      "type": "api_call",
      "apiConnectionId": "api_id",
      "endpoint": "/endpoint",
      "method": "GET"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_workflow_id",
    "name": "New Workflow",
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Workflow created successfully"
}
```

#### `PUT /api/workflows/{id}`

Update an existing workflow.

**Request Body:**
```json
{
  "name": "Updated Workflow",
  "description": "Updated description",
  "steps": [ /* updated steps */ ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "workflow_id",
    "name": "Updated Workflow",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Workflow updated successfully"
}
```

#### `DELETE /api/workflows/{id}`

Delete a workflow.

**Response:**
```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

#### `POST /api/workflows/{id}/execute`

Execute a workflow.

**Request Body:**
```json
{
  "input": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "execution_id",
    "status": "running",
    "startedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Workflow execution started"
}
```

### Workflow Executions

#### `GET /api/workflows/{workflowId}/executions`

Get execution history for a workflow.

**Query Parameters:**
- `status` (optional): Filter by execution status
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "executions": [
      {
        "id": "execution_id",
        "status": "completed",
        "startedAt": "2024-01-01T00:00:00.000Z",
        "completedAt": "2024-01-01T00:00:01.000Z",
        "duration": 1000,
        "stepCount": 5,
        "successfulSteps": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### `GET /api/executions/{id}`

Get detailed information about a specific execution.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "execution_id",
    "workflowId": "workflow_id",
    "status": "completed",
    "input": {
      "customerName": "John Doe"
    },
    "output": {
      "customerId": "customer123",
      "welcomeEmailSent": true
    },
    "steps": [
      {
        "id": "step_id",
        "name": "Create Customer",
        "status": "completed",
        "startedAt": "2024-01-01T00:00:00.000Z",
        "completedAt": "2024-01-01T00:00:00.500Z",
        "duration": 500,
        "input": { /* step input */ },
        "output": { /* step output */ }
      }
    ],
    "startedAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:00:01.000Z"
  }
}
```

### AI Chat

#### `POST /api/chat`

Send a natural language request to generate a workflow.

**Request Body:**
```json
{
  "message": "Get customer data from CRM and send a welcome email",
  "context": {
    "availableApis": ["CRM API", "Email API"],
    "previousMessages": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflow": {
      "name": "Customer Welcome Process",
      "description": "Get customer data and send welcome email",
      "steps": [
        {
          "name": "Get Customer Data",
          "type": "api_call",
          "apiConnectionId": "crm_api_id",
          "endpoint": "/customers/{id}",
          "method": "GET"
        },
        {
          "name": "Send Welcome Email",
          "type": "api_call",
          "apiConnectionId": "email_api_id",
          "endpoint": "/emails",
          "method": "POST"
        }
      ]
    },
    "explanation": "This workflow will first retrieve customer information from the CRM API, then send a personalized welcome email using the Email API.",
    "confidence": 0.95
  }
}
```

#### `POST /api/chat/execute`

Execute a workflow from a natural language request.

**Request Body:**
```json
{
  "message": "Get customer data from CRM and send a welcome email",
  "input": {
    "customerId": "customer123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "execution_id",
    "workflow": { /* generated workflow */ },
    "status": "running",
    "startedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Audit Logs

#### `GET /api/logs`

Get audit logs (admin only).

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action type
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_id",
        "userId": "user_id",
        "action": "workflow_executed",
        "details": {
          "workflowId": "workflow_id",
          "executionId": "execution_id",
          "status": "completed"
        },
        "timestamp": "2024-01-01T00:00:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1000,
      "totalPages": 50
    }
  }
}
```

#### `GET /api/logs/{id}`

Get detailed information about a specific audit log entry.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "log_id",
    "userId": "user_id",
    "userEmail": "user@example.com",
    "action": "workflow_executed",
    "details": {
      "workflowId": "workflow_id",
      "workflowName": "Customer Onboarding",
      "executionId": "execution_id",
      "status": "completed",
      "input": { /* execution input */ },
      "output": { /* execution output */ },
      "duration": 1500
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "sessionId": "session_id"
  }
}
```

### System

#### `GET /api/health`

Get system health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "database": "healthy",
      "openai": "healthy",
      "external_apis": "healthy"
    }
  }
}
```

#### `GET /api/stats`

Get system statistics (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "active": 120,
      "newThisMonth": 25
    },
    "apis": {
      "total": 45,
      "active": 42,
      "totalEndpoints": 1250
    },
    "workflows": {
      "total": 200,
      "active": 180,
      "executionsToday": 1500
    },
    "executions": {
      "total": 50000,
      "successful": 48500,
      "failed": 1500,
      "averageDuration": 1250
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | User not authenticated |
| `FORBIDDEN` | User lacks required permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `API_CONNECTION_FAILED` | Failed to connect to external API |
| `WORKFLOW_EXECUTION_FAILED` | Workflow execution failed |
| `AI_SERVICE_ERROR` | OpenAI service error |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `INTERNAL_ERROR` | Internal server error |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per 15 minutes
- **AI chat endpoints**: 10 requests per minute
- **Other endpoints**: 100 requests per 15 minutes

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Pagination information is included in responses:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Webhooks

### Incoming Webhooks

#### `POST /api/webhooks/{webhookId}`

Receive webhook events from external systems.

**Request Body:**
```json
{
  "event": "customer.created",
  "data": {
    "customerId": "customer123",
    "customerName": "John Doe",
    "customerEmail": "john@example.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "triggeredWorkflows": 2,
    "executionIds": ["execution_id_1", "execution_id_2"]
  }
}
```

### Outgoing Webhooks

#### `POST /api/webhooks/outgoing`

Configure outgoing webhooks for workflow events.

**Request Body:**
```json
{
  "name": "Slack Notifications",
  "url": "https://hooks.slack.com/services/...",
  "events": ["workflow.completed", "workflow.failed"],
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

## Admin Endpoints

### OpenAPI Cache Management

#### `GET /api/admin/openapi-cache`

Get OpenAPI cache statistics and status.

**Headers:**
```
Authorization: Bearer <access_token>
X-Admin-Token: <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "size": 5,
    "totalSizeBytes": 1024000,
    "maxSize": 100,
    "maxSizeBytes": 52428800,
    "ttl": 3600,
    "entries": [
      {
        "url": "https://api.example.com/openapi.json",
        "age": 1800000,
        "size": 204800,
        "compressed": true
      }
    ]
  }
}
```

#### `DELETE /api/admin/openapi-cache`

Clear the OpenAPI cache.

**Headers:**
```
Authorization: Bearer <access_token>
X-Admin-Token: <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "OpenAPI cache cleared successfully"
}
```

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @apiq/sdk
```

```typescript
import { ApiQClient } from '@apiq/sdk';

const client = new ApiQClient({
  baseUrl: 'https://api.your-domain.com',
  token: 'your-jwt-token'
});

// Create API connection
const api = await client.apis.create({
  name: 'My API',
  baseUrl: 'https://api.example.com',
  authType: 'api_key',
  authConfig: { apiKey: 'key' }
});

// Execute workflow
const execution = await client.workflows.execute('workflow_id', {
  input: { customerId: '123' }
});
```

### Python

```bash
pip install apiq-sdk
```

```python
from apiq import ApiQClient

client = ApiQClient(
    base_url="https://api.your-domain.com",
    token="your-jwt-token"
)

# Create API connection
api = client.apis.create({
    "name": "My API",
    "baseUrl": "https://api.example.com",
    "authType": "api_key",
    "authConfig": {"apiKey": "key"}
})

# Execute workflow
execution = client.workflows.execute("workflow_id", {
    "input": {"customerId": "123"}
})
```

## Support

For API support and questions:

- **Documentation**: [https://docs.apiq.com](https://docs.apiq.com)
- **Email**: api-support@apiq.com
- **Slack**: [apiq-community.slack.com](https://apiq-community.slack.com)
- **GitHub**: [github.com/apiq/apiq](https://github.com/apiq/apiq)

## API Credential Management

### GET /api/connections/{id}/credentials
Retrieve stored credentials for an API connection.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "credentials": {
      "id": "credential_id",
      "apiConnectionId": "connection_id",
      "isActive": true,
      "expiresAt": "2025-12-31T23:59:59Z",
      "createdAt": "2025-06-29T10:00:00Z",
      "updatedAt": "2025-06-29T10:00:00Z"
    }
  }
}
```

### POST /api/connections/{id}/credentials
Store new credentials for an API connection.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "credentials": {
    "apiKey": "sk_test_...",
    "secretKey": "sk_test_..."
  },
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "credentials": {
      "id": "credential_id",
      "apiConnectionId": "connection_id",
      "isActive": true,
      "expiresAt": "2025-12-31T23:59:59Z",
      "createdAt": "2025-06-29T10:00:00Z",
      "updatedAt": "2025-06-29T10:00:00Z"
    }
  },
  "message": "Credentials stored successfully"
}
```

### PUT /api/connections/{id}/credentials
Update existing credentials for an API connection.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "credentials": {
    "apiKey": "sk_test_new_...",
    "secretKey": "sk_test_new_..."
  },
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "credentials": {
      "id": "credential_id",
      "apiConnectionId": "connection_id",
      "isActive": true,
      "expiresAt": "2025-12-31T23:59:59Z",
      "createdAt": "2025-06-29T10:00:00Z",
      "updatedAt": "2025-06-29T10:05:00Z"
    }
  },
  "message": "Credentials updated successfully"
}
```

### DELETE /api/connections/{id}/credentials
Delete credentials for an API connection (soft delete).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Credentials deleted successfully"
}
``` 
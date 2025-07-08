# APIQ API Reference

This document provides detailed information about the APIQ API endpoints, authentication, and data models.

## Authentication

All API requests require authentication using Bearer tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Base URL

- **Production**: `https://api.apiq.com`
- **Development**: `http://localhost:3000`

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "verified": false
  }
}
```

#### POST /api/auth/login
Authenticate a user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "verified": true
  }
}
```

#### POST /api/auth/verify
Verify email address with verification token.

**Request Body:**
```json
{
  "token": "verification_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### POST /api/auth/resend-verification
Resend verification email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

#### POST /api/auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### POST /api/auth/reset-password
Reset password with reset token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Workflows

#### POST /api/workflows/generate 🆕
Generate a workflow from natural language description.

**Request Body:**
```json
{
  "description": "When a new GitHub issue is created, send a Slack notification",
  "context": {
    "availableConnections": ["google"],
    "previousMessages": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "workflow_123",
    "name": "New Email to Calendar Event",
    "description": "Automatically create a calendar event when a new email arrives",
    "steps": [
      {
        "id": "step_1",
        "type": "trigger",
        "service": "gmail",
        "action": "email.received",
        "config": {
          "label": "inbox"
        }
      },
      {
        "id": "step_2",
        "type": "action",
        "service": "google_calendar",
        "action": "event.create",
        "config": {
          "calendarId": "primary",
          "summary": "New email from {{step_1.from}}",
          "description": "{{step_1.subject}}"
        }
      }
    ],
    "dataMapping": {
      "step_2.summary": "New email from {{step_1.from}}",
      "step_2.description": "{{step_1.subject}}"
    }
  },
  "explanation": "This workflow will monitor your Gmail inbox for new emails and automatically create calendar events.",
  "alternatives": [
    {
      "name": "Enhanced Notification",
      "description": "Include issue labels and assignee information"
    }
  ]
}
```

#### GET /api/workflows
Get all workflows for the authenticated user.

**Response:**
```json
{
  "success": true,
  "workflows": [
    {
      "id": "workflow_123",
      "name": "GitHub to Slack",
      "description": "Notify Slack of new GitHub issues",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastExecuted": "2024-01-15T14:22:00Z"
    }
  ]
}
```

#### POST /api/workflows
Create a new workflow.

**Request Body:**
```json
{
  "name": "My Workflow",
  "description": "Workflow description",
  "steps": [
    {
      "type": "trigger",
      "service": "github",
      "action": "issue.created"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "workflow_123",
    "name": "My Workflow",
    "status": "draft"
  }
}
```

#### GET /api/workflows/{id}
Get a specific workflow by ID.

**Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "workflow_123",
    "name": "GitHub to Slack",
    "description": "Notify Slack of new GitHub issues",
    "steps": [...],
    "status": "active",
    "executions": [...]
  }
}
```

#### PUT /api/workflows/{id}
Update a workflow.

**Request Body:**
```json
{
  "name": "Updated Workflow Name",
  "steps": [...]
}
```

#### DELETE /api/workflows/{id}
Delete a workflow.

**Response:**
```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

#### POST /api/workflows/{id}/execute
Manually execute a workflow.

**Response:**
```json
{
  "success": true,
  "executionId": "exec_123",
  "status": "running"
}
```

### Connections

#### GET /api/connections
Get all API connections for the authenticated user.

**Response:**
```json
{
  "success": true,
  "connections": [
    {
      "id": "conn_123",
      "service": "github",
      "name": "GitHub Account",
      "status": "connected",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST /api/connections
Create a new API connection.

**Request Body:**
```json
{
  "service": "github",
  "config": {
    "clientId": "github_client_id",
    "clientSecret": "github_client_secret"
  }
}
```

#### DELETE /api/connections/{id}
Delete an API connection.

**Response:**
```json
{
  "success": true,
  "message": "Connection deleted successfully"
}
```

### Executions

#### GET /api/executions
Get workflow execution history.

**Query Parameters:**
- `workflowId` (optional): Filter by workflow ID
- `status` (optional): Filter by status (success, failed, running)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "executions": [
    {
      "id": "exec_123",
      "workflowId": "workflow_123",
      "status": "success",
      "startedAt": "2024-01-15T14:22:00Z",
      "completedAt": "2024-01-15T14:22:05Z",
      "duration": 5000,
      "steps": [...]
    }
  ]
}
```

#### GET /api/executions/{id}
Get detailed execution information.

**Response:**
```json
{
  "success": true,
  "execution": {
    "id": "exec_123",
    "workflowId": "workflow_123",
    "status": "success",
    "steps": [
      {
        "id": "step_1",
        "status": "success",
        "startedAt": "2024-01-15T14:22:00Z",
        "completedAt": "2024-01-15T14:22:02Z",
        "output": {...}
      }
    ],
    "logs": [...]
  }
}
```

## Data Models

### Workflow
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "steps": "WorkflowStep[]",
  "status": "draft | active | paused | archived",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "lastExecuted": "datetime"
}
```

### WorkflowStep
```json
{
  "id": "string",
  "type": "trigger | action | condition",
  "service": "string",
  "action": "string",
  "config": "object",
  "position": "number"
}
```

### Execution
```json
{
  "id": "string",
  "workflowId": "string",
  "status": "running | success | failed | cancelled",
  "startedAt": "datetime",
  "completedAt": "datetime",
  "duration": "number",
  "steps": "ExecutionStep[]"
}
```

### Connection
```json
{
  "id": "string",
  "service": "string",
  "name": "string",
  "status": "connected | disconnected | error",
  "config": "object",
  "createdAt": "datetime"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Request validation failed
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API requests are rate limited to:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
``` 
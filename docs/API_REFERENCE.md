# APIQ API Reference

## Overview

This document provides comprehensive documentation for all APIQ backend API endpoints. The API follows RESTful principles and uses JSON for request/response formats.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All API endpoints require authentication. Authentication is managed via secure HTTP-only cookies set by the backend during login and session refresh. 

- **Browser-based requests:**
  - Cookies are automatically included in all requests from the browser. No manual token management or localStorage is required or supported.
  - Do not attempt to read or write authentication tokens in localStorage or sessionStorage.

- **Server-to-server/API requests:**
  - For direct API calls from backend services or scripts, include the session token as a Bearer token:

    ```bash
    Authorization: Bearer <your-jwt-token>
    ```

- **Security:**
  - All authentication cookies are HTTP-only, SameSite=Lax, and (in production) Secure.
  - Tokens are never exposed to client-side JavaScript.

- **Session Management:**
  - Sessions are managed via cookies. Logging out or session expiration will clear cookies and require re-authentication.

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    /* response data */
  },
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

### AI Orchestrator 🆕

The AI Orchestrator is the central hub for all AI-powered interactions in APIQ. It intelligently routes user messages to the appropriate services based on AI classification, providing a unified chat interface for workflow generation, connection guidance, and general assistance.

#### `POST /api/chat/process`

Main AI orchestrator endpoint that processes user messages and routes them to appropriate services.

**Request Body:**
```json
{
  "message": "Create a workflow to send Slack notifications when GitHub issues are created"
}
```

**Response Types:**

**Workflow Generation Response:**
```json
{
  "success": true,
  "data": {
    "type": "workflow",
    "content": "I've created a workflow for you!",
    "workflow": {
      "id": "workflow-id",
      "name": "GitHub to Slack Notification",
      "description": "Automatically send Slack notifications for new GitHub issues",
      "steps": [
        {
          "id": "1",
          "name": "Monitor GitHub Issues",
          "type": "webhook",
          "order": 1,
          "description": "Watch for new GitHub issues"
        },
        {
          "id": "2", 
          "name": "Send Slack Notification",
          "type": "api_call",
          "apiConnectionId": "slack-connection-id",
          "order": 2,
          "description": "Send notification to Slack channel"
        }
      ]
    }
  }
}
```

**Performance Optimizations:**
- **Context-Aware Endpoint Filtering**: Intelligently selects only relevant API endpoints based on user request
- **Token Usage Reduction**: Reduces OpenAI token usage by 83% (17,355 → 2,995 tokens)
- **Pattern Matching**: Supports smart filtering for GitHub, Slack, QuickBooks, ShipStation, and other APIs
- **Error Prevention**: Prevents "maximum context length exceeded" errors from OpenAI

**Connection Guidance Response:**
```json
{
  "success": true,
  "data": {
    "type": "connection_guidance",
    "content": "To create this workflow, you'll need to connect to Discord. I can help you set this up!",
    "connectionGuidance": {
      "requiredApis": 2,
      "missingApis": 1,
      "guidanceMessage": "You need to connect to Discord to complete this workflow"
    }
  }
}
```

**Confidence Confirmation Response:**
```json
{
  "success": true,
  "data": {
    "type": "general_chat",
    "content": "I'd like to help you, but I need some clarification.",
    "confidenceConfirmation": {
      "confidence": 0.45,
      "uncertaintyType": "connection",
      "explanation": "I'm not sure which APIs you need for this request.",
      "suggestions": [
        {
          "option": "GitHub API",
          "description": "Create issues and manage repositories",
          "confidence": 0.8
        },
        {
          "option": "Slack API", 
          "description": "Send notifications to team channels",
          "confidence": 0.7
        },
        {
          "option": "Trello API",
          "description": "Create cards and manage boards", 
          "confidence": 0.6
        }
      ],
      "originalResponse": "I'll help you with your request once I understand exactly what you need."
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to process message",
  "code": "AI_ORCHESTRATOR_ERROR",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `POST /api/chat/classify`

Classify user messages to determine intent and routing.

**Request Body:**
```json
{
  "message": "How do I connect to Slack?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "connection_guidance",
    "confidence": 0.95,
    "reasoning": "User asking about connection setup",
    "suggestedActions": ["Show connection setup", "Provide guidance"]
  }
}
```

#### Confidence Confirmation Configuration

The confidence confirmation system can be configured using environment variables:

**Environment Variables:**
- `CONFIDENCE_THRESHOLD` - Confidence threshold for triggering confirmations (default: 0.95)
  - Values below this threshold will trigger confidence confirmation
  - Higher values = more confirmations, lower values = fewer confirmations
  - Recommended range: 0.6 - 0.95

**Uncertainty Types:**
- `parameter` - Uncertainty about API call parameters
- `connection` - Uncertainty about which API connections to use
- `data_mapping` - Uncertainty about data mapping between steps
- `intent` - Uncertainty about user intent
- `endpoint` - Uncertainty about which API endpoint to use
- `general` - General uncertainty about the request

**Configuration Example:**
```bash
# High confidence threshold (more confirmations)
CONFIDENCE_THRESHOLD=0.95

# Lower confidence threshold (fewer confirmations)
CONFIDENCE_THRESHOLD=0.7
```

### Legacy Workflow Generation (Deprecated)

> **Note**: The `/api/workflows/generate` endpoint is deprecated. Use `/api/chat/process` instead for all workflow generation needs.

#### `POST /api/workflows/generate`

Generate a workflow from natural language description with enhanced logging and retry mechanisms.

**Request Body:**

```json
{
  "userDescription": "When a new GitHub issue is created, send a Slack notification to the team",
  "context": "Optional additional context for the workflow"
}
```

**Enhanced Features:**
- **Comprehensive Logging**: Detailed console logging for debugging workflow generation
- **Retry Logic**: Automatic retry with exponential backoff for OpenAI API calls
- **Error Handling**: Enhanced error messages with specific failure reasons
- **Performance Monitoring**: Request timing and response validation

**Response:**

```json
{
  "success": true,
  "data": {
    "workflow": {
      "id": "workflow_123",
      "name": "GitHub Issue to Slack Notification",
      "description": "Automatically sends Slack notifications when new GitHub issues are created",
      "steps": [
        {
          "id": "step_1",
          "name": "Monitor GitHub Issues",
          "type": "webhook",
          "description": "Listen for new issue events from GitHub",
          "order": 1
        },
        {
          "id": "step_2",
          "name": "Send Slack Notification",
          "type": "api_call",
          "apiConnectionId": "slack_conn_456",
          "endpoint": "/chat.postMessage",
          "method": "POST",
          "parameters": {
            "channel": "#team-notifications",
            "text": "New GitHub issue: {{step_1.title}}",
            "attachments": [
              {
                "title": "{{step_1.title}}",
                "title_link": "{{step_1.html_url}}",
                "text": "{{step_1.body}}",
                "color": "#36a64f"
              }
            ]
          },
          "dataMapping": {
            "issue_title": "$.step_1.title",
            "issue_url": "$.step_1.html_url",
            "issue_body": "$.step_1.body"
          },
          "order": 2
        },
        {
          "id": "step_3",
          "name": "Create Trello Card",
          "type": "api_call",
          "apiConnectionId": "trello_conn_789",
          "endpoint": "/cards",
          "method": "POST",
          "parameters": {
            "name": "{{step_1.title}}",
            "desc": "{{step_1.body}}\n\nLink: {{step_1.html_url}}",
            "idList": "{{trello_list_id}}"
          },
          "dataMapping": {
            "card_name": "$.step_1.title",
            "card_description": "$.step_1.body",
            "card_url": "$.step_1.html_url"
          },
          "order": 3
        }
      ],
      "estimatedExecutionTime": 15000,
      "confidence": 0.95,
      "explanation": "This multi-step workflow \"GitHub Issue to Slack Notification\" executes 3 steps in sequence:\n\nStep 1: Monitor GitHub Issues\nStep 2: Send Slack Notification\nStep 3: Create Trello Card\n\nThe workflow includes data mapping between steps to ensure smooth data flow and proper execution order."
    },
    "validation": {
      "isValid": true,
      "issues": [],
      "suggestions": [
        "Consider adding error handling for API rate limits",
        "You may want to filter issues by labels or assignees"
      ]
    },
    "alternatives": [
      {
        "id": "workflow_124",
        "name": "GitHub Issue to Discord Webhook",
        "description": "Alternative workflow using Discord instead of Slack",
        "confidence": 0.85
      }
    ]
  }
}
```

**Error Response (No API Connections):**

```json
{
  "success": false,
  "error": "No active API connections found. Please add at least one API connection before generating workflows."
}
```

**Error Response (Invalid Description):**

```json
{
  "success": false,
  "error": "Unable to generate workflow. Please provide more specific details about what you want to accomplish."
}
```

**Error Response (OpenAI Service Error):**

```json
{
  "success": false,
  "error": "AI service temporarily unavailable. Please try again in a moment.",
  "code": "AI_SERVICE_ERROR",
  "retryAfter": 30
}
```

**Enhanced Error Handling:**
- **Retry Logic**: Automatic retry for transient OpenAI API failures
- **Rate Limiting**: Built-in rate limiting with retry-after headers
- **Detailed Logging**: Comprehensive error logging for debugging
- **Graceful Degradation**: Fallback responses when AI service is unavailable

### Workflow Management 🆕

The Workflow Management API provides CRUD operations for workflows and execution control.

#### `GET /api/workflows`

List all workflows for the authenticated user.

**Response:**

```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "workflow_123",
        "name": "GitHub Issue to Slack Notification",
        "description": "Automatically sends Slack notifications when new GitHub issues are created",
        "status": "ACTIVE",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

#### `POST /api/workflows`

Create a new workflow.

**Request Body:**

```json
{
  "name": "My Workflow",
  "description": "Description of the workflow",
  "steps": [
    {
      "name": "Step 1",
      "type": "api_call",
      "apiConnectionId": "conn_123",
      "endpoint": "/api/endpoint",
      "method": "GET",
      "parameters": {},
      "order": 1
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "workflow_123",
    "name": "My Workflow",
    "description": "Description of the workflow",
    "status": "DRAFT",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
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
    "id": "workflow_123",
    "name": "My Workflow",
    "description": "Description of the workflow",
    "status": "ACTIVE",
    "steps": [
      {
        "id": "step_1",
        "name": "Step 1",
        "type": "api_call",
        "apiConnectionId": "conn_123",
        "endpoint": "/api/endpoint",
        "method": "GET",
        "parameters": {},
        "order": 1
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `PUT /api/workflows/{id}`

Update an existing workflow.

**Request Body:**

```json
{
  "name": "Updated Workflow Name",
  "description": "Updated description",
  "status": "ACTIVE"
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

### API Catalog Management 🆕

The API Catalog system provides a shared repository of popular APIs that users can discover, browse, and connect to directly. This system dramatically improves API discovery and reduces time-to-first-workflow.

#### `GET /api/catalog`

List all available APIs in the catalog with filtering, pagination, and search capabilities.

**Query Parameters:**
- `category` (optional): Filter by API category
- `search` (optional): Search by name, description, or tags
- `tags` (optional): Filter by specific tags
- `authType` (optional): Filter by authentication type
- `status` (optional): Filter by API status (default: ACTIVE)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sortBy` (optional): Sort by popularity, name, or createdAt (default: popularity)
- `sortOrder` (optional): Sort order asc or desc (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "catalogEntries": [
      {
        "id": "catalog_123",
        "name": "Slack",
        "description": "Slack API for messaging and team collaboration",
        "baseUrl": "https://slack.com/api",
        "documentationUrl": "https://api.slack.com/web",
        "logoUrl": "https://a.slack-edge.com/...",
        "category": "Communication",
        "tags": ["messaging", "team", "collaboration"],
        "authTypes": ["OAUTH2", "BEARER_TOKEN"],
        "status": "ACTIVE",
        "isVerified": true,
        "popularity": 150,
        "endpointCount": 25,
        "endpoints": [
          {
            "id": "endpoint_123",
            "path": "/conversations.list",
            "method": "GET",
            "summary": "List conversations",
            "tags": ["conversations"]
          }
        ]
      }
    ],
    "filters": {
      "categories": [
        {
          "id": "cat_123",
          "name": "Communication",
          "description": "APIs for messaging and team collaboration",
          "apiCount": 15
        }
      ],
      "popularTags": [
        { "tag": "messaging", "count": 25 },
        { "tag": "payments", "count": 18 }
      ],
      "authTypes": ["API_KEY", "BEARER_TOKEN", "OAUTH2", "BASIC_AUTH", "NONE"]
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### `GET /api/catalog/{id}`

Get detailed information about a specific API in the catalog.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "catalog_123",
    "name": "Slack",
    "description": "Slack API for messaging and team collaboration",
    "baseUrl": "https://slack.com/api",
    "documentationUrl": "https://api.slack.com/web",
    "logoUrl": "https://a.slack-edge.com/...",
    "category": "Communication",
    "tags": ["messaging", "team", "collaboration"],
    "authTypes": ["OAUTH2", "BEARER_TOKEN"],
    "status": "ACTIVE",
    "isVerified": true,
    "popularity": 150,
    "endpointCount": 25,
    "endpoints": [
      {
        "id": "endpoint_123",
        "path": "/conversations.list",
        "method": "GET",
        "summary": "List conversations",
        "description": "Retrieve a list of conversations in the workspace",
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "requestBody": null,
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ok": { "type": "boolean" },
                    "channels": { "type": "array" }
                  }
                }
              }
            }
          }
        },
        "tags": ["conversations"],
        "isDeprecated": false
      }
    ],
    "userConnection": {
      "id": "conn_456",
      "name": "My Slack Connection",
      "connectionStatus": "connected",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### `POST /api/catalog`

Create a new API in the catalog (admin only).

**Request Body:**
```json
{
  "name": "New API",
  "description": "Description of the API",
  "baseUrl": "https://api.example.com",
  "documentationUrl": "https://docs.example.com",
  "logoUrl": "https://example.com/logo.png",
  "category": "Business",
  "tags": ["api", "business"],
  "authTypes": ["API_KEY", "OAUTH2"],
  "rawSpec": "OpenAPI specification content",
  "specVersion": "3.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "catalog_123",
    "name": "New API",
    "description": "Description of the API",
    "baseUrl": "https://api.example.com",
    "category": "Business",
    "tags": ["api", "business"],
    "authTypes": ["API_KEY", "OAUTH2"],
    "status": "ACTIVE",
    "isVerified": false,
    "popularity": 0,
    "endpointCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `PUT /api/catalog/{id}`

Update an existing API in the catalog (admin only).

**Request Body:**
```json
{
  "name": "Updated API Name",
  "description": "Updated description",
  "status": "ACTIVE",
  "isVerified": true
}
```

#### `DELETE /api/catalog/{id}`

Delete an API from the catalog (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Catalog entry deleted successfully"
}
```

#### `POST /api/catalog/{id}/connect`

Connect to a catalog API by creating a user connection.

**Request Body:**
```json
{
  "connectionName": "My API Connection",
  "authType": "API_KEY",
  "authConfig": {
    "apiKey": "your-api-key-here"
  },
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connection": {
      "id": "conn_123",
      "name": "My API Connection",
      "description": "Connected to Slack via API Catalog",
      "baseUrl": "https://slack.com/api",
      "authType": "API_KEY",
      "connectionStatus": "disconnected",
      "ingestionStatus": "SUCCEEDED",
      "endpointCount": 25,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "catalog": {
      "id": "catalog_123",
      "name": "Slack",
      "description": "Slack API for messaging and team collaboration",
      "category": "Communication",
      "tags": ["messaging", "team", "collaboration"]
    }
  }
}
```

#### `GET /api/catalog/categories`

Get all available API categories.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_123",
        "name": "Communication",
        "description": "APIs for messaging and team collaboration",
        "icon": "message-circle",
        "color": "#3B82F6",
        "sortOrder": 1,
        "isActive": true,
        "apiCount": 15
      }
    ]
  }
}
```

#### `POST /api/catalog/categories`

Create a new API category (admin only).

**Request Body:**
```json
{
  "name": "AI & Machine Learning",
  "description": "APIs for artificial intelligence and machine learning services",
  "icon": "brain",
  "color": "#EC4899",
  "sortOrder": 5
}
```

### API Connection Management 🆕

The API Connection Management system provides secure storage and management of API connections with comprehensive authentication support, enhanced logging, and intelligent connection guidance.

### Connection Guidance System 🆕

The Connection Guidance System automatically detects when users request workflows requiring APIs they haven't connected yet, providing intelligent guidance and in-chat setup capabilities.

#### `POST /api/workflows/generate` (Enhanced with Connection Guidance)

Generate a workflow from natural language description with automatic connection guidance detection.

**Request Body:**
```json
{
  "userDescription": "Create a workflow that sends a Slack notification when a new GitHub issue is created"
}
```

**Response with Connection Guidance:**
```json
{
  "success": true,
  "data": {
    "workflow": {
      "id": "wf_123",
      "name": "GitHub to Slack Notification",
      "description": "Sends Slack notifications for new GitHub issues"
    },
    "connectionGuidance": {
      "requiresGuidance": true,
      "missingApis": ["Slack", "GitHub"],
      "guidanceMessage": "To create this workflow, you'll need to connect to Slack and GitHub. I can help you set this up!",
      "suggestedConnections": [
        {
          "name": "slack",
          "displayName": "Slack",
          "description": "Team communication and collaboration platform",
          "authType": "OAUTH2",
          "setupInstructions": {
            "step1": "Go to https://api.slack.com/apps and create a new app",
            "step2": "Add OAuth2 scopes: chat:write, channels:read, users:read",
            "step3": "Copy your Client ID and Client Secret"
          }
        }
      ]
    }
  }
}
```

#### `POST /api/connections/test`

Test API connection credentials before saving (used by ConnectionSetupForm).

**Request Body:**
```json
{
  "name": "Slack API",
  "baseUrl": "https://slack.com/api",
  "authType": "OAUTH2",
  "authConfig": {
    "clientId": "your_client_id",
    "clientSecret": "your_client_secret"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "message": "Connection test successful"
  }
}
```

**Features:**
- **Intelligent API Detection**: Automatically identifies missing APIs from user messages
- **Comprehensive API Knowledge Base**: 25+ APIs with detailed setup instructions
- **Multiple Authentication Types**: Support for API_KEY, BEARER_TOKEN, OAUTH2, and BASIC_AUTH
- **Real-time Validation**: Test connections before saving
- **Step-by-Step Guidance**: Detailed setup instructions for each API type

The API Connection Management system provides secure storage and management of API connections with comprehensive authentication support and enhanced logging.

#### `GET /api/connections`

List all API connections for the authenticated user with enhanced logging and validation.

**Response:**

```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "conn_123",
        "name": "GitHub API",
        "baseUrl": "https://api.github.com",
        "authType": "API_KEY",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Enhanced Features:**
- **Comprehensive Logging**: Detailed console logging for connection operations
- **Enhanced Validation**: Improved input validation with better error messages
- **Performance Monitoring**: Request timing and response validation
- **Error Handling**: Enhanced error messages with specific failure reasons

#### `POST /api/connections`

Create a new API connection with enhanced validation and logging.

**Request Body:**

```json
{
  "name": "GitHub API",
  "description": "GitHub API connection for repository management",
  "baseUrl": "https://api.github.com",
  "authType": "API_KEY",
  "authConfig": {
    "apiKey": "ghp_your_github_token_here"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "conn_123",
    "name": "GitHub API",
    "baseUrl": "https://api.github.com",
    "authType": "API_KEY",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "API connection created successfully"
}
```

**Enhanced Features:**
- **Comprehensive Logging**: Detailed console logging for connection creation
- **Enhanced Validation**: Improved input validation with better error messages
- **Performance Monitoring**: Request timing and response validation
- **Error Handling**: Enhanced error messages with specific failure reasons

### Workflow Execution Control 🆕

#### `POST /api/workflows/{id}/execute`

Execute a workflow.

**Response:**

```json
{
  "success": true,
  "data": {
    "executionId": "exec_123",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `GET /api/workflows/executions/{executionId}`

Get execution status and details.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "exec_123",
    "workflowId": "workflow_123",
    "status": "RUNNING",
    "currentStep": 2,
    "totalSteps": 3,
    "progress": 66.67,
    "startedAt": "2024-01-01T00:00:00.000Z",
    "estimatedCompletion": "2024-01-01T00:00:30.000Z",
    "logs": [
      {
        "step": 1,
        "status": "COMPLETED",
        "message": "Step 1 completed successfully",
        "timestamp": "2024-01-01T00:00:10.000Z"
      }
    ]
  }
}
```

#### `POST /api/workflows/executions/{executionId}/pause`

Pause a running execution.

**Response:**

```json
{
  "success": true,
  "message": "Execution paused successfully"
}
```

#### `POST /api/workflows/executions/{executionId}/resume`

Resume a paused execution.

**Response:**

```json
{
  "success": true,
  "message": "Execution resumed successfully"
}
```

#### `POST /api/workflows/executions/{executionId}/cancel`

Cancel a running execution.

**Response:**

```json
{
  "success": true,
  "message": "Execution cancelled successfully"
}
```

### Secrets Management

The Secrets Vault provides secure storage and management of sensitive data such as API keys, OAuth2 tokens, and custom secrets. All secrets are encrypted with AES-256 and include comprehensive input validation, rate limiting, and audit logging.

#### Security Features

- **AES-256 Encryption**: All secret values encrypted at rest
- **Input Validation**: Comprehensive validation for all inputs with character restrictions
- **Rate Limiting**: 100 requests per minute per user
- **Audit Logging**: Complete audit trail for all secret operations
- **No Sensitive Logging**: Never logs secret values, tokens, or PII
- **Automatic Rotation**: Support for automatic secret rotation with configurable intervals

#### `POST /api/secrets`

Store a new secret.

**Request Body:**

```json
{
  "name": "my-api-key",
  "type": "api_key",
  "value": "sk_test_...",
  "description": "Stripe test API key",
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "rotationEnabled": true,
  "rotationInterval": 30
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "secret": {
      "id": "secret_123",
      "name": "my-api-key",
      "type": "api_key",
      "description": "Stripe test API key",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "rotationEnabled": true,
      "rotationInterval": 30,
      "lastRotatedAt": null,
      "nextRotationAt": "2024-02-01T00:00:00.000Z"
    },
    "message": "Secret created successfully"
  }
}
```

**Error Response (Rate Limited):**

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

**Error Response (Validation Error):**

```json
{
  "success": false,
  "error": "Invalid secret name: contains invalid characters",
  "code": "VALIDATION_ERROR"
}
```

#### `GET /api/secrets`

List all secrets for the authenticated user.

**Response:**

```json
{
  "success": true,
  "data": {
    "secrets": [
      {
        "id": "secret_123",
        "name": "my-api-key",
        "type": "api_key",
        "isActive": true,
        "version": 1,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalCount": 1
  }
}
```

#### `GET /api/secrets/{id}`

Retrieve a specific secret (metadata only, value not returned).

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "secret_123",
    "name": "my-api-key",
    "type": "api_key",
    "isActive": true,
    "version": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `PUT /api/secrets/{id}`

Update an existing secret.

**Request Body:**

```json
{
  "value": "sk_test_new_key_...",
  "description": "Updated Stripe test API key"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "secret_123",
    "name": "my-api-key",
    "type": "api_key",
    "isActive": true,
    "version": 2,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Secret updated successfully"
}
```

#### `POST /api/secrets/{name}/rotate` 🆕

Rotate a secret (create new version with new value).

**Request Body:**

```json
{
  "value": "sk_test_rotated_key_...",
  "description": "Rotated Stripe API key"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "secret_123",
    "name": "my-api-key",
    "type": "api_key",
    "isActive": true,
    "version": 3,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Secret rotated successfully"
}
```

#### `DELETE /api/secrets/{id}`

Delete a secret (soft delete for audit trail).

**Response:**

```json
{
  "success": true,
  "message": "Secret deleted successfully"
}
```

### Audit Logs 🆕

The Audit Logs API provides comprehensive logging for all system activities, including user actions, API calls, and security events.

#### `GET /api/audit-logs`

Retrieve audit logs with filtering and pagination.

**Query Parameters:**
- `userId` (optional): Filter by specific user
- `action` (optional): Filter by action type (create, update, delete, execute)
- `resource` (optional): Filter by resource type (workflow, secret, connection)
- `startDate` (optional): Filter logs from this date (ISO 8601)
- `endDate` (optional): Filter logs to this date (ISO 8601)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_123",
        "userId": "user_123",
        "action": "create",
        "resource": "workflow",
        "resourceId": "workflow_123",
        "details": {
          "workflowName": "GitHub to Slack",
          "steps": 2
        },
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

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
      "input": {
        /* execution input */
      },
      "output": {
        /* execution output */
      },
      "duration": 1500
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "sessionId": "session_id"
  }
}
```

### Performance Monitoring 🆕

#### `GET /api/performance/metrics`

Get real-time performance metrics and monitoring data (admin only).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "performance": {
      "totalRequests": 1250,
      "averageResponseTime": 3200,
      "successRate": 96.5,
      "errorRate": 3.5,
      "cacheHitRate": 45.2,
      "retryRate": 8.1,
      "tokenUsage": {
        "average": 1850,
        "max": 3200,
        "total": 2312500
      },
      "breakdown": {
        "classification": 450,
        "connectionAnalysis": 320,
        "workflowGeneration": 2100,
        "total": 2870
      }
    },
    "cache": {
      "size": 45,
      "hitRate": 45.2,
      "missRate": 54.8,
      "memoryUsage": "12.5MB"
    },
    "trends": {
      "responseTimeTrend": "improving",
      "successRateTrend": "stable",
      "cacheHitRateTrend": "improving",
      "recommendations": [
        "Consider increasing cache TTL for frequently requested workflows",
        "Response times are within acceptable range",
        "Cache hit rate is improving with recent optimizations"
      ]
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Admin access required"
}
```

### System

#### `GET /api/health`

Get system health status.

**Response (Healthy):**

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": "45ms",
  "checks": {
    "database": {
      "status": "healthy",
      "details": {
        "connected": true,
        "version": "PostgreSQL 14.0"
      }
    },
    "openai": {
      "status": "healthy",
      "details": {
        "configured": true,
        "model": "gpt-4o-mini"
      }
    },
    "encryption": {
      "status": "healthy",
      "details": {
        "algorithm": "AES-256-GCM"
      }
    }
  }
}
```

**Response (Unhealthy):**

```json
{
  "success": false,
  "status": "unhealthy",
  "error": "Health check failed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": "45ms",
  "checks": {
    "database": {
      "status": "healthy",
      "details": {
        "connected": true,
        "version": "PostgreSQL 14.0"
      }
    },
    "openai": {
      "status": "unhealthy",
      "details": {
        "error": "API key not configured"
      }
    },
    "encryption": {
      "status": "healthy",
      "details": {
        "algorithm": "AES-256-GCM"
      }
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

| Code                        | Description                       |
| --------------------------- | --------------------------------- |
| `UNAUTHORIZED`              | User not authenticated            |
| `FORBIDDEN`                 | User lacks required permissions   |
| `VALIDATION_ERROR`          | Request validation failed         |
| `API_CONNECTION_FAILED`     | Failed to connect to external API |
| `WORKFLOW_EXECUTION_FAILED` | Workflow execution failed         |
| `AI_SERVICE_ERROR`          | OpenAI service error              |
| `RATE_LIMIT_EXCEEDED`       | Rate limit exceeded               |
| `RESOURCE_NOT_FOUND`        | Requested resource not found      |
| `INTERNAL_ERROR`            | Internal server error             |

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

### Test Environment Rate Limiting

In the test environment, rate limits can be reset using the test-only endpoint:

#### `POST /api/test/reset-rate-limits`

Reset rate limits for testing purposes. **Only available in test environment.**

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "message": "Rate limits reset successfully"
}
```

**Note**: This endpoint is only available when `NODE_ENV=test` and is used for test isolation to prevent flaky test failures due to shared rate limiting state.

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
import { ApiQClient } from "@apiq/sdk";

const client = new ApiQClient({
  baseUrl: "https://api.your-domain.com",
  token: "your-jwt-token",
});

// Create API connection
const api = await client.apis.create({
  name: "My API",
  baseUrl: "https://api.example.com",
  authType: "api_key",
  authConfig: { apiKey: "key" },
});

// Execute workflow
const execution = await client.workflows.execute("workflow_id", {
  input: { customerId: "123" },
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

## OAuth2 Authentication

APIQ supports OAuth2 authentication for connecting to third-party APIs that require OAuth2 authorization. The OAuth2 flow is secure, supports multiple providers, and includes automatic token refresh.

> **Note:** The OAuth2 service and all related endpoints are implemented using dependency injection (DI) for all dependencies (database, encryption, token generation, etc.), improving testability, maintainability, and security. All token management and security logic are handled via DI-injected services.

### Frontend Integration

The OAuth2 system includes complete frontend integration with the following components:

#### API Client (`src/lib/api/client.ts`)

Centralized TypeScript client for OAuth2 operations with full type safety.

**Key Methods:**

```typescript
// Get supported OAuth2 providers
async getOAuth2Providers(): Promise<ApiResponse<{ providers: OAuth2Provider[]; count: number }>>

// Initiate OAuth2 authorization flow
async initiateOAuth2Flow(
  apiConnectionId: string,
  provider: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  scope?: string
): Promise<string>

// Refresh OAuth2 tokens
async refreshOAuth2Token(apiConnectionId: string, provider: string): Promise<ApiResponse>

// Get OAuth2 access token
async getOAuth2Token(apiConnectionId: string): Promise<ApiResponse<{ accessToken: string; tokenType: string }>>
```

#### OAuth2 Manager Component (`src/components/OAuth2Manager.tsx`)

Reusable React component for OAuth2 connection management.

**Features:**

- Provider-specific icons and configuration display
- Token refresh and access token retrieval
- Connection status and expiration monitoring
- Comprehensive error handling and success feedback
- Support for GitHub, Google, and Slack providers

#### OAuth2 Pages

- **Login Page** (`src/app/login/page.tsx`) - OAuth2 provider buttons and validation
- **Dashboard** (`src/app/dashboard/page.tsx`) - OAuth2 configuration in connection creation
- **OAuth2 Setup** (`src/app/connections/[id]/oauth2/page.tsx`) - Dedicated OAuth2 management
- **OAuth2 Authorization** (`src/app/oauth/authorize/page.tsx`) - Flow initiation
- **OAuth2 Callback** (`src/app/oauth/callback/page.tsx`) - Flow completion

### Supported OAuth2 Providers

- **GitHub** - For GitHub API access
- **Google** - For Google Calendar, Gmail, and other Google APIs
- **Slack** - For Slack API access

### OAuth2 Flow Overview

1. **Authorization Request** - User initiates OAuth2 flow via `/api/oauth/authorize`
2. **Provider Authorization** - User authorizes on the OAuth2 provider's site
3. **Callback Processing** - Provider redirects to `/api/oauth/callback` with authorization code
4. **Token Exchange** - APIQ exchanges code for access and refresh tokens
5. **Token Storage** - Tokens are encrypted and stored securely
6. **Token Management** - Tokens can be refreshed and retrieved as needed

### OAuth2 Endpoints

#### `GET /api/oauth/providers`

Get list of supported OAuth2 providers and their configuration.

**Authentication:**

> No authentication required. This endpoint is public and can be called without a JWT token.

**Response:**

```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "github",
        "displayName": "GitHub",
        "authorizationUrl": "https://github.com/login/oauth/authorize",
        "tokenUrl": "https://github.com/login/oauth/access_token",
        "scope": "repo user",
        "userInfoUrl": "https://api.github.com/user"
      }
    ],
    "count": 3
  }
}
```

#### `GET /api/oauth/authorize`

Generate OAuth2 authorization URL and redirect user to OAuth2 provider.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `apiConnectionId` (required) - ID of the API connection
- `provider` (required) - OAuth2 provider name (github, google, slack)
- `clientId` (required) - OAuth2 client ID
- `clientSecret` (required) - OAuth2 client secret
- `redirectUri` (required) - OAuth2 redirect URI
- `scope` (optional) - OAuth2 scope (defaults to provider's default scope)

**Response:** Redirects to OAuth2 provider authorization URL

**Example:**

```
GET /api/oauth/authorize?apiConnectionId=conn_123&provider=github&clientId=your_client_id&clientSecret=your_client_secret&redirectUri=https://your-app.com/api/oauth/callback&scope=repo user
```

#### `GET /api/oauth/callback`

Process OAuth2 callback from provider and exchange authorization code for tokens.

**Query Parameters:**

- `code` (required) - Authorization code from OAuth2 provider
- `state` (required) - State parameter for CSRF protection

**Response:**

```json
{
  "success": true,
  "message": "OAuth2 authorization completed successfully"
}
```

**Error Response:**

```json
{
  "error": "OAuth2 authorization failed",
  "details": "User denied access",
  "code": "OAUTH2_ERROR"
}
```

#### `POST /api/oauth/refresh`

Refresh an expired OAuth2 access token using the refresh token.

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "apiConnectionId": "conn_123",
  "provider": "github"
}
```

**Response:**

```json
{
  "success": true,
  "message": "OAuth2 token refreshed successfully"
}
```

#### `GET /api/oauth/token`

Retrieve OAuth2 access token for making API calls to OAuth2-protected services.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `apiConnectionId` (required) - ID of the API connection

**Response:**

```json
{
  "success": true,
  "accessToken": "ghp_xxxxxxxxxxxxxxxxxxxx",
  "tokenType": "Bearer"
}
```

### OAuth2 Security Features

- **Encrypted Token Storage** - All OAuth2 tokens are encrypted before storage
- **CSRF Protection** - State parameter validation prevents CSRF attacks
- **Token Expiration** - Automatic token refresh when tokens expire
- **Audit Logging** - All OAuth2 events are logged for security and compliance
- **Scope Validation** - OAuth2 scopes are validated and enforced

### OAuth2 Test Coverage

The OAuth2 implementation has comprehensive test coverage:

- **Integration Tests**: 111/111 tests passing ✅
  - Core OAuth2 flow tests (16/16 passing)
  - Provider-specific tests (72/72 passing)
    - GitHub OAuth2: Complete flow testing
    - Google OAuth2: Full workflow with Gmail scope
    - Slack OAuth2: Comprehensive testing with users scope
  - Security tests: State parameter validation, authentication requirements
  - SSO authentication flow tests (59/59 passing)
- **Test Scenarios Covered**:
  - ✅ Authorization URL generation
  - ✅ OAuth2 callback processing
  - ✅ Token refresh mechanisms
  - ✅ State parameter validation
  - ✅ Error handling for OAuth2 flows
  - ✅ Provider configuration management
  - ✅ Token encryption and security
  - ✅ SSO integration flows
- **Test Infrastructure**:
  - Comprehensive test utilities (`oauth2TestUtils.ts`)
  - Test data creation and cleanup
  - Provider-specific test configurations
  - Security validation testing

### OAuth2 Configuration

To use OAuth2 with an API connection:

1. **Set Auth Type** - Set `authType` to `"OAUTH2"` in the API connection
2. **Configure Provider** - Add OAuth2 provider configuration to `authConfig`
3. **Initiate Flow** - Use `/api/oauth/authorize` to start OAuth2 flow
4. **Handle Callback** - Process callback at `/api/oauth/callback`
5. **Use Tokens** - Retrieve tokens via `/api/oauth/token` for API calls

**Example API Connection with OAuth2:**

```json
{
  "name": "GitHub API",
  "baseUrl": "https://api.github.com",
  "authType": "OAUTH2",
  "authConfig": {
    "provider": "github",
    "clientId": "your_github_client_id",
    "clientSecret": "your_github_client_secret",
    "redirectUri": "https://your-app.com/api/oauth/callback",
    "scope": "repo user"
  }
}
```

### Error Handling

#### Network Error Handling

Network errors (e.g., loss of connectivity, server unreachable) are now tested in E2E using Playwright by simulating offline mode and attempting a fetch to an API endpoint. The application is expected to handle these errors gracefully at the UI and API boundary, providing user-friendly error messages and not crashing. See `tests/e2e/ui/ui-compliance.test.ts` for the latest test implementation.

### Password Reset & Verification

#### `POST /api/auth/reset-password`

Request a password reset email or set a new password using a reset token.

**Request Body (request reset email):**

```json
{
  "email": "user@example.com"
}
```

**Request Body (reset password):**

```json
{
  "token": "reset_token_from_email",
  "password": "newPassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password reset email sent" // or "Password reset successful"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### `POST /api/auth/resend-verification`

Request a new email verification link for an unverified account.

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

**Error Response:**

```json
{
  "success": false,
  "error": "Email is already verified or does not exist"
}
```

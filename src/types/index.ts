// Core application types for APIQ MVP

// TODO: [SECRETS-FIRST-REFACTOR] Phase 9: Type System Updates
// - Add Secret interface and related types
// - Update ApiConnection interface to reference secrets instead of authConfig
// - Add connection-secret relationship types
// - Add secret metadata and rotation types
// - Update credential types to be secret-based
// - Add connection status types based on secret health
// - Add secret validation and error types
// - Add migration types for credential-to-secret conversion
// - Add connection-secret dependency types
// - Consider adding secret audit and logging types

// User and Authentication
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// API Connection Management
export interface ApiConnection {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
  connectionStatus?: 'draft' | 'disconnected' | 'connecting' | 'connected' | 'error' | 'revoked';
  ingestionStatus: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  endpointCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  authConfig?: any;
  // TODO: [SECRETS-FIRST-REFACTOR] Add secret reference fields
  secretId?: string;
  secretReference?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface CreateApiConnectionRequest {
  name: string;
  description?: string;
  baseUrl: string;
  authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  authConfig?: Record<string, any>;
  documentationUrl?: string;
  // Direct auth fields for frontend compatibility
  apiKey?: string;
  token?: string;
  username?: string;
  password?: string;
  // Test properties for OAuth2 testing
  oauth2Provider?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  // TODO: [SECRETS-FIRST-REFACTOR] Add secret-related fields
  secretIds?: string[];
  secretReferences?: {
    apiKey?: string;
    bearerToken?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
  };
}

export interface UpdateApiConnectionRequest {
  name?: string;
  description?: string;
  baseUrl?: string;
  authType?: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  authConfig?: Record<string, any>;
  documentationUrl?: string;
}

// API Endpoints
export interface Endpoint {
  id: string;
  apiConnectionId: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters: Record<string, any>;
  requestBody?: Record<string, any>;
  responses: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Workflow Management
export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  steps?: WorkflowStep[];
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  isPublic?: boolean;
}

// Workflow Steps
export interface WorkflowStep {
  id: string;
  workflowId: string;
  apiConnectionId?: string;
  stepOrder: number;
  name: string;
  description?: string;
  method?: string;
  endpoint?: string;
  parameters: Record<string, any>;
  conditions?: Record<string, any>;
  retryConfig?: Record<string, any>;
  timeout?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowStepRequest {
  apiConnectionId?: string;
  stepOrder: number;
  name: string;
  description?: string;
  method?: string;
  endpoint?: string;
  parameters: Record<string, any>;
  conditions?: Record<string, any>;
  retryConfig?: Record<string, any>;
  timeout?: number;
}

// Workflow Execution
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  logs?: ExecutionLog[];
}

export interface CreateWorkflowExecutionRequest {
  workflowId: string;
  parameters?: Record<string, any>;
}

// Execution Logs
export interface ExecutionLog {
  id: string;
  executionId: string;
  stepOrder?: number;
  stepName?: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
}

// Audit Logging
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Secrets Management
export interface Secret {
  id: string;
  userId: string;
  name: string;
  type: 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH_USERNAME' | 'BASIC_AUTH_PASSWORD' | 'OAUTH2_CLIENT_ID' | 'OAUTH2_CLIENT_SECRET' | 'OAUTH2_ACCESS_TOKEN' | 'OAUTH2_REFRESH_TOKEN' | 'WEBHOOK_SECRET' | 'SSH_KEY' | 'CERTIFICATE' | 'CUSTOM';
  description?: string;
  connectionId?: string;
  connectionName?: string;
  version: number;
  isActive: boolean;
  expiresAt?: Date;
  rotationEnabled: boolean;
  rotationInterval?: number;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSecretRequest {
  name: string;
  type: 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH_USERNAME' | 'BASIC_AUTH_PASSWORD' | 'OAUTH2_CLIENT_ID' | 'OAUTH2_CLIENT_SECRET' | 'OAUTH2_ACCESS_TOKEN' | 'OAUTH2_REFRESH_TOKEN' | 'WEBHOOK_SECRET' | 'SSH_KEY' | 'CERTIFICATE' | 'CUSTOM';
  value: string;
  description?: string;
  connectionId?: string;
  enableRotation?: boolean;
  rotationInterval?: number;
}

// API Credentials (Legacy - will be migrated to secrets)
export interface ApiCredential {
  id: string;
  userId: string;
  apiConnectionId: string;
  encryptedData: string;
  keyId: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiCredentialRequest {
  apiConnectionId: string;
  credentialData: Record<string, any>;
  expiresAt?: Date;
}

// OpenAI Integration
export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface WorkflowGenerationRequest {
  description: string;
  apiConnections: ApiConnection[];
  parameters?: Record<string, any>;
}

export interface WorkflowGenerationResponse {
  workflow: Workflow;
  steps: WorkflowStep[];
  explanation: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Types
export interface AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, any>;
}

// Environment Configuration
export interface EnvironmentConfig {
  NODE_ENV: string;
  DATABASE_URL: string;
  OPENAI_API_KEY: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  ENCRYPTION_KEY: string;
}

// Utility Types
export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
export type AuthType = 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
export type Status = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN'; 
// Core application types for APIQ MVP

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
  userId: string;
  name: string;
  description?: string;
  baseUrl: string;
  authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  authConfig: Record<string, any>;
  documentationUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
  lastTested?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiConnectionRequest {
  name: string;
  description?: string;
  baseUrl: string;
  authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  authConfig: Record<string, any>;
  documentationUrl?: string;
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
  action: string;
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
  action: string;
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

// API Credentials
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
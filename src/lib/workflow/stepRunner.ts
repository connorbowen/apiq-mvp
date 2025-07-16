import { WorkflowStep, WorkflowExecution, ExecutionLog, ApiConnection } from '../../types';
import { logError, logInfo, logDebug, logWorkflowExecution } from '../../utils/logger';
import { prisma } from '../../../lib/database/client';
import { apiClient } from '../api/client';
import { getSecretsForConnection, validateConnectionSecrets } from '../services/connectionService';
import { secretsVault } from '../secrets/secretsVault';

// Step execution context - data passed between steps
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  userId: string;
  parameters: Record<string, any>;
  stepResults: Record<string, any>; // Results from previous steps
  globalVariables: Record<string, any>; // Global variables for the execution
}

// Step execution result
export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  retryCount: number;
  metadata?: Record<string, any>;
}

// Step type definitions
export type StepType = 'API_CALL' | 'DATA_TRANSFORM' | 'CONDITION' | 'LOOP' | 'WAIT' | 'CUSTOM';

// Base step executor interface
export interface StepExecutor {
  type: StepType;
  execute(step: any, context: ExecutionContext): Promise<StepResult>;
  validate(step: any): boolean;
}

// API Call Step Executor
export class ApiCallStepExecutor implements StepExecutor {
  type: StepType = 'API_CALL';

  async execute(step: any, context: ExecutionContext): Promise<StepResult> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = step.retryConfig?.maxRetries || 3;
    const retryDelay = step.retryConfig?.retryDelay || 1000;

    while (retryCount <= maxRetries) {
      try {
        logDebug('Executing API call step', {
          stepId: step.id,
          stepName: step.name,
          retryCount
        });

        // Get API connection
        const apiConnection = await this.getApiConnection(step.apiConnectionId || null);
        if (!apiConnection) {
          throw new Error(`API connection not found: ${step.apiConnectionId}`);
        }

        // --- SECRETS-FIRST-REFACTOR: Retrieve and validate secrets ---
        const userId = context.userId;
        const connectionId = apiConnection.id;
        // Determine required secret types based on authType
        let requiredTypes: string[] = [];
        switch (apiConnection.authType) {
          case 'API_KEY':
            requiredTypes = ['API_KEY']; break;
          case 'BEARER_TOKEN':
            requiredTypes = ['BEARER_TOKEN']; break;
          case 'BASIC_AUTH':
            requiredTypes = ['BASIC_AUTH_USERNAME', 'BASIC_AUTH_PASSWORD']; break;
          case 'OAUTH2':
            requiredTypes = ['OAUTH2_CLIENT_ID', 'OAUTH2_CLIENT_SECRET', 'OAUTH2_ACCESS_TOKEN']; break;
          default:
            requiredTypes = [];
        }
        const { isValid, missing, issues } = await validateConnectionSecrets(userId, connectionId, requiredTypes as any);
        if (!isValid) {
          throw new Error(`Missing or invalid secrets for connection: ${missing.join(', ')}; Issues: ${issues.join(', ')}`);
        }
        const secrets = await getSecretsForConnection(userId, connectionId);
        // Map secret type to value
        const secretMap = Object.fromEntries(secrets.map(s => [s.type, s]));
        // --- END SECRETS-FIRST-REFACTOR ---

        // Require method and endpoint
        const method = step.method;
        const path = step.endpoint;
        if (!method || !path) {
          throw new Error('API_CALL step must have method and endpoint');
        }
        
        // Prepare request parameters with context substitution
        const requestParams = this.prepareRequestParams(step.parameters, context);

        // --- SECRETS-FIRST-REFACTOR: Use secrets for authentication ---
        // Build auth headers using secrets
        let authHeaders: Record<string, string> = {};
        switch (apiConnection.authType) {
          case 'API_KEY':
            if (secretMap['API_KEY']) {
              authHeaders['x-api-key'] = (await secretsVault.getSecret(userId, secretMap['API_KEY'].name)).value;
            }
            break;
          case 'BEARER_TOKEN':
            if (secretMap['BEARER_TOKEN']) {
              authHeaders['Authorization'] = `Bearer ${(await secretsVault.getSecret(userId, secretMap['BEARER_TOKEN'].name)).value}`;
            }
            break;
          case 'BASIC_AUTH':
            if (secretMap['BASIC_AUTH_USERNAME'] && secretMap['BASIC_AUTH_PASSWORD']) {
              const username = (await secretsVault.getSecret(userId, secretMap['BASIC_AUTH_USERNAME'].name)).value;
              const password = (await secretsVault.getSecret(userId, secretMap['BASIC_AUTH_PASSWORD'].name)).value;
              authHeaders['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
            }
            break;
          case 'OAUTH2':
            if (secretMap['OAUTH2_ACCESS_TOKEN']) {
              authHeaders['Authorization'] = `Bearer ${(await secretsVault.getSecret(userId, secretMap['OAUTH2_ACCESS_TOKEN'].name)).value}`;
            }
            break;
        }
        // --- END SECRETS-FIRST-REFACTOR ---

        // Make API call
        const response = await this.makeApiCall(apiConnection, method, path, { ...requestParams, headers: { ...authHeaders, ...requestParams.headers } });

        const duration = Date.now() - startTime;
        
        logInfo('API call step completed successfully', {
          stepId: step.id,
          stepName: step.name,
          duration,
          retryCount
        });

        return {
          success: true,
          data: response,
          duration,
          retryCount,
          metadata: {
            method,
            path,
            statusCode: response.status || 200
          }
        };

      } catch (error) {
        retryCount++;
        const duration = Date.now() - startTime;
        
        logError('API call step failed', error as Error, {
          stepId: step.id,
          stepName: step.name,
          retryCount,
          maxRetries,
          duration
        });

        if (retryCount > maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration,
            retryCount,
            metadata: { method: step.method }
          };
        }

        // Wait before retry
        await this.sleep(retryDelay * retryCount);
      }
    }

    throw new Error('Unexpected error in API call execution');
  }

  validate(step: any): boolean {
    // Only accept new format: method and endpoint must be present
    return !!(step.apiConnectionId && step.method && step.endpoint);
  }

  private async getApiConnection(apiConnectionId: string | null): Promise<ApiConnection | null> {
    if (!apiConnectionId) {
      console.log('🔍 [ApiCallStepExecutor] No API connection ID provided');
      return null;
    }
    
    console.log('🔍 [ApiCallStepExecutor] Getting API connection:', apiConnectionId);
    
    try {
      // Use Prisma directly instead of API client for server-side operations
      const { prisma } = await import('../singletons/prisma');
      const connection = await prisma.apiConnection.findUnique({
        where: { id: apiConnectionId },
        include: {
          endpoints: {
            where: { isActive: true }
          }
        }
      });
      
      if (!connection) {
        console.error('❌ [ApiCallStepExecutor] API connection not found:', apiConnectionId);
        return null;
      }
      
      console.log('🔍 [ApiCallStepExecutor] API connection found:', {
        id: connection.id,
        name: connection.name,
        baseUrl: connection.baseUrl,
        authType: connection.authType,
        endpointCount: connection.endpoints.length
      });
      
      // Convert to ApiConnection format
      return {
        id: connection.id,
        name: connection.name,
        description: connection.description || '',
        baseUrl: connection.baseUrl,
        authType: connection.authType,
        status: connection.status,
        connectionStatus: connection.connectionStatus,
        ingestionStatus: connection.ingestionStatus,
        endpointCount: connection.endpoints.length,
        createdAt: connection.createdAt.toISOString(),
        updatedAt: connection.updatedAt.toISOString(),
        authConfig: connection.authConfig
      };
    } catch (error) {
      console.error('❌ [ApiCallStepExecutor] Error getting API connection:', error);
      logError('Failed to get API connection', error as Error);
      return null;
    }
  }

  private prepareRequestParams(parameters: Record<string, any>, context: ExecutionContext): Record<string, any> {
    const prepared = { ...parameters };
    
    // Substitute context variables in parameters
    for (const [key, value] of Object.entries(prepared)) {
      if (typeof value === 'string') {
        prepared[key] = this.substituteVariables(value, context);
      }
    }
    
    return prepared;
  }

  private substituteVariables(value: string, context: ExecutionContext): string {
    // Replace {{step.1.data.userId}} with actual step result
    return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.split('.');
      
      if (parts[0] === 'step' && parts[1] && parts[2]) {
        const stepOrder = parseInt(parts[1]);
        const field = parts[2];
        const stepResult = context.stepResults[stepOrder];
        return stepResult?.[field] || match;
      }
      
      if (parts[0] === 'global' && parts[1]) {
        return context.globalVariables[parts[1]] || match;
      }
      
      if (parts[0] === 'param' && parts[1]) {
        return context.parameters[parts[1]] || match;
      }
      
      return match;
    });
  }

  private async makeApiCall(
    apiConnection: ApiConnection, 
    method: string, 
    path: string, 
    params: Record<string, any>
  ): Promise<any> {
    const url = `${apiConnection.baseUrl}${path}`;
    
    // For now, use a simple fetch implementation
    // In production, this would use the existing API client with proper auth
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...params.headers
      },
      body: method !== 'GET' ? JSON.stringify(params.body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private buildAuthHeaders(apiConnection: ApiConnection): Record<string, string> {
    const headers: Record<string, string> = {};
    
    switch (apiConnection.authType) {
      case 'API_KEY':
        const apiKey = apiConnection.authConfig?.apiKey;
        if (apiKey) {
          headers['X-API-Key'] = apiKey;
        }
        break;
      case 'BEARER_TOKEN':
        const token = apiConnection.authConfig?.token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        break;
      case 'BASIC_AUTH':
        const username = apiConnection.authConfig?.username;
        const password = apiConnection.authConfig?.password;
        if (username && password) {
          const credentials = Buffer.from(`${username}:${password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
    }
    
    return headers;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Data Transform Step Executor
export class DataTransformStepExecutor implements StepExecutor {
  type: StepType = 'DATA_TRANSFORM';

  async execute(step: any, context: ExecutionContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      logDebug('Executing data transform step', {
        stepId: step.id,
        stepName: step.name
      });

      const { operation, input, output } = step.parameters;
      let result;

      switch (operation) {
        case 'map':
          result = this.mapData(input, output, context);
          break;
        case 'filter':
          result = this.filterData(input, output, context);
          break;
        case 'aggregate':
          result = this.aggregateData(input, output, context);
          break;
        default:
          throw new Error(`Unsupported transform operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logInfo('Data transform step completed successfully', {
        stepId: step.id,
        stepName: step.name,
        duration
      });

      return {
        success: true,
        data: result,
        duration,
        retryCount: 0
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logError('Data transform step failed', error as Error, {
        stepId: step.id,
        stepName: step.name,
        duration
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        retryCount: 0
      };
    }
  }

  validate(step: any): boolean {
    const { operation, input, output } = step.parameters;
    return !!(operation && input && output);
  }

  private mapData(input: any, output: any, context: ExecutionContext): any {
    // Simple mapping implementation
    const inputData = this.getInputData(input, context);
    return inputData.map((item: any) => {
      const mapped: Record<string, any> = {};
      for (const [key, value] of Object.entries(output)) {
        mapped[key] = this.substituteVariables(value as string, item);
      }
      return mapped;
    });
  }

  private filterData(input: any, output: any, context: ExecutionContext): any {
    const inputData = this.getInputData(input, context);
    return inputData.filter((item: any) => {
      // Simple filter implementation
      return this.evaluateCondition(output.condition, item);
    });
  }

  private aggregateData(input: any, output: any, context: ExecutionContext): any {
    const inputData = this.getInputData(input, context);
    const { field, operation } = output;
    
    switch (operation) {
      case 'sum':
        return inputData.reduce((sum: number, item: any) => sum + (item[field] || 0), 0);
      case 'count':
        return inputData.length;
      case 'average':
        const sum = inputData.reduce((sum: number, item: any) => sum + (item[field] || 0), 0);
        return sum / inputData.length;
      default:
        throw new Error(`Unsupported aggregate operation: ${operation}`);
    }
  }

  private getInputData(input: any, context: ExecutionContext): any {
    if (input.step) {
      return context.stepResults[input.step]?.data || [];
    }
    if (input.global) {
      return context.globalVariables[input.global] || [];
    }
    return input.data || [];
  }

  private substituteVariables(value: string, data: any): string {
    return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      return data[path] || match;
    });
  }

  private evaluateCondition(condition: any, data: any): boolean {
    // Simple condition evaluation
    const { field, operator, value } = condition;
    const fieldValue = data[field];
    
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return fieldValue > value;
      case 'less_than':
        return fieldValue < value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      default:
        return false;
    }
  }
}

// Condition Step Executor
export class ConditionStepExecutor implements StepExecutor {
  type: StepType = 'CONDITION';

  async execute(step: any, context: ExecutionContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      logDebug('Executing condition step', {
        stepId: step.id,
        stepName: step.name
      });

      const { condition, trueStep, falseStep } = step.parameters;
      const result = this.evaluateCondition(condition, context);
      
      const duration = Date.now() - startTime;
      
      logInfo('Condition step completed successfully', {
        stepId: step.id,
        stepName: step.name,
        result,
        duration
      });

      return {
        success: true,
        data: { condition: result, nextStep: result ? trueStep : falseStep },
        duration,
        retryCount: 0
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logError('Condition step failed', error as Error, {
        stepId: step.id,
        stepName: step.name,
        duration
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        retryCount: 0
      };
    }
  }

  validate(step: any): boolean {
    const { condition } = step.parameters;
    return !!condition;
  }

  private evaluateCondition(condition: any, context: ExecutionContext): boolean {
    const { field, operator, value } = condition;
    let fieldValue;

    // Get field value from context
    if (field.startsWith('step.')) {
      const parts = field.split('.');
      const stepOrder = parseInt(parts[1]);
      const fieldName = parts[2];
      fieldValue = context.stepResults[stepOrder]?.data?.[fieldName];
    } else if (field.startsWith('global.')) {
      const globalVar = field.split('.')[1];
      fieldValue = context.globalVariables[globalVar];
    } else if (field.startsWith('param.')) {
      const param = field.split('.')[1];
      fieldValue = context.parameters[param];
    } else {
      fieldValue = field;
    }

    // Evaluate condition
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return fieldValue > value;
      case 'less_than':
        return fieldValue < value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }
}

// Custom Step Executor
export class CustomStepExecutor implements StepExecutor {
  type: StepType = 'CUSTOM';

  async execute(step: any, context: ExecutionContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      logDebug('Executing custom step', {
        stepId: step.id,
        stepName: step.name,
        action: step.action
      });

      // Handle different custom actions
      let result;
      switch (step.action) {
        case 'noop':
          // Add minimal delay to ensure duration > 0
          await this.sleep(1);
          result = { message: 'No operation performed' };
          break;
        case 'wait':
          const waitTime = step.parameters?.waitTime || 1000;
          await this.sleep(waitTime);
          result = { message: `Waited for ${waitTime}ms` };
          break;
        case 'log':
          result = { message: step.parameters?.message || 'Custom log message' };
          break;
        case 'flaky':
          // Simulate a flaky step that fails a certain number of times
          const { failCount = 0, currentFailures = 0 } = step.parameters;
          if (currentFailures < failCount) {
            throw new Error(`Simulated failure ${currentFailures + 1}/${failCount}`);
          }
          result = { message: 'Flaky step succeeded after failures' };
          break;
        default:
          result = { message: `Custom action: ${step.action}` };
      }

      const duration = Date.now() - startTime;
      
      logInfo('Custom step completed successfully', {
        stepId: step.id,
        stepName: step.name,
        duration
      });

      return {
        success: true,
        data: result,
        duration,
        retryCount: 0
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logError('Custom step failed', error as Error, {
        stepId: step.id,
        stepName: step.name,
        duration
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        retryCount: 0
      };
    }
  }

  validate(step: any): boolean {
    // Custom steps are valid if they have an action
    return !!step.action;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main Step Runner
export class StepRunner {
  private executors: Map<StepType, StepExecutor> = new Map();

  constructor() {
    this.registerExecutor(new ApiCallStepExecutor());
    this.registerExecutor(new DataTransformStepExecutor());
    this.registerExecutor(new ConditionStepExecutor());
    this.registerExecutor(new CustomStepExecutor());
  }

  registerExecutor(executor: StepExecutor): void {
    this.executors.set(executor.type, executor);
  }

  async executeStep(step: any, context: ExecutionContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 [StepRunner] Starting step execution:', {
        stepId: step.id,
        stepName: step.name,
        stepType: step.type || 'unknown',
        executionId: context.executionId
      });
      
      const stepType = this.determineStepType(step);
      console.log('🔍 [StepRunner] Determined step type:', stepType);
      
      const executor = this.executors.get(stepType);

      if (!executor) {
        console.error('❌ [StepRunner] No executor found for step type:', stepType);
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: `No executor found for step type: ${stepType}`,
          duration,
          retryCount: 0
        };
      }

      console.log('🔍 [StepRunner] Found executor:', executor.constructor.name);

      if (!executor.validate(step)) {
        console.error('❌ [StepRunner] Step validation failed for type:', stepType);
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: `Invalid step configuration for ${stepType}: ${step.name}`,
          duration,
          retryCount: 0
        };
      }

      console.log('🔍 [StepRunner] Step validation passed');

      // Log step execution start
      await this.logStepExecution(context.executionId, step, 'INFO', 'Step execution started');

      console.log('🔍 [StepRunner] Executing step...');
      const result = await executor.execute(step, context);
      console.log('🔍 [StepRunner] Step execution result:', {
        success: result.success,
        duration: result.duration,
        retryCount: result.retryCount,
        error: result.error
      });
      
      // Log step execution result
      const logMessage = result.success ? 'Step completed successfully' : `Step failed: ${result.error}`;
      await this.logStepExecution(context.executionId, step, result.success ? 'INFO' : 'ERROR', logMessage, result);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('❌ [StepRunner] Step execution error:', {
        stepId: step.id,
        stepName: step.name,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      await this.logStepExecution(context.executionId, step, 'ERROR', `Step execution error: ${errorMessage}`, { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage,
        duration,
        retryCount: 0
      };
    }
  }

  private determineStepType(step: any): StepType {
    // Determine step type based on step configuration
    if (step.apiConnectionId) {
      return 'API_CALL';
    }
    
    const { operation } = step.parameters || {};
    if (operation === 'map' || operation === 'filter' || operation === 'aggregate') {
      return 'DATA_TRANSFORM';
    }
    
    if (step.parameters?.condition) {
      return 'CONDITION';
    }
    
    // Only check for action for custom steps
    if (step.action === 'noop' || step.action === 'wait' || step.action === 'log' || step.action === 'flaky' || step.action === 'custom') {
      return 'CUSTOM';
    }
    
    // Default to API_CALL
    return 'API_CALL';
  }

  private async logStepExecution(
    executionId: string, 
    step: WorkflowStep, 
    level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG',
    message: string,
    data?: any
  ): Promise<void> {
    try {
      await prisma.executionLog.create({
        data: {
          executionId,
          stepOrder: step.stepOrder,
          stepName: step.name,
          level,
          message,
          data: data ? JSON.parse(JSON.stringify(data)) : null
        }
      });
    } catch (error) {
      logError('Failed to log step execution', error as Error);
    }
  }
}

// Export singleton instance
export const stepRunner = new StepRunner(); 
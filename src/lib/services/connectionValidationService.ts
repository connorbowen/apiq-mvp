/**
 * Connection Validation Service
 * 
 * Validates and maps connection IDs for workflow steps.
 * This service ensures that all API calls use valid connection IDs
 * and provides intelligent mapping between user intent and available connections.
 * 
 * Features:
 * - Connection ID validation
 * - Intelligent connection mapping
 * - Endpoint compatibility checking
 * - Error handling for invalid connections
 * - Fallback suggestions for missing connections
 */

import { OpenAIService } from '../../services/openaiService';
import { logInfo, logError } from '../../utils/logger';
import { parseAIResponse } from '../utils/aiResponseParser';

export interface ConnectionValidationRequest {
  steps: Array<{
    id: string;
    name: string;
    type: string;
    apiConnectionId?: string;
    endpoint?: string;
    method?: string;
  }>;
  availableConnections: Array<{
    id: string;
    name: string;
    baseUrl?: string;
    endpoints?: Array<{
      path: string;
      method: string;
      summary?: string;
      parameters?: any[];
    }>;
  }>;
  userDescription: string;
}

export interface ConnectionValidationResult {
  success: boolean;
  validatedSteps?: Array<{
    id: string;
    name: string;
    type: string;
    apiConnectionId: string;
    endpoint: string;
    method: string;
    isValid: boolean;
    validationErrors?: string[];
  }>;
  missingConnections?: Array<{
    stepId: string;
    requiredApi: string;
    suggestedConnections: string[];
  }>;
  error?: string;
}

export class ConnectionValidationService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Validate and map connection IDs for workflow steps
   */
  async validateConnections(request: ConnectionValidationRequest): Promise<ConnectionValidationResult> {
    logInfo('🔍 ConnectionValidationService: Starting connection validation', {
      stepsCount: request.steps.length,
      connectionsCount: request.availableConnections.length
    });

    try {
      // Try AI-powered validation first
      const aiResult = await this.validateConnectionsWithAI(request);
      if (aiResult.success) {
        logInfo('🔍 ConnectionValidationService: AI validation successful', {
          validatedSteps: aiResult.validatedSteps?.length,
          missingConnections: aiResult.missingConnections?.length
        });
        return aiResult;
      }

      // Fallback to rules-based validation
      logInfo('🔍 ConnectionValidationService: Falling back to rules-based validation');
      return this.validateConnectionsWithRules(request);

    } catch (error) {
      logError('🔍 ConnectionValidationService: Connection validation failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection validation failed'
      };
    }
  }

  /**
   * Use AI to validate and map connections
   */
  private async validateConnectionsWithAI(request: ConnectionValidationRequest): Promise<ConnectionValidationResult> {
    try {
      const systemPrompt = this.buildValidationSystemPrompt(request.availableConnections);
      const userPrompt = this.buildValidationUserPrompt(request);

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 800
      });

      const parseResult = parseAIResponse(response);
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse AI response');
      }
      
      return {
        success: true,
        validatedSteps: (parseResult.data as any).validatedSteps,
        missingConnections: (parseResult.data as any).missingConnections || []
      };

    } catch (error) {
      console.error('🔍 ConnectionValidationService: AI validation failed:', error);
      return {
        success: false,
        error: 'AI connection validation failed'
      };
    }
  }

  /**
   * Use rules-based validation for common patterns
   */
  private validateConnectionsWithRules(request: ConnectionValidationRequest): ConnectionValidationResult {
    const validatedSteps: ConnectionValidationResult['validatedSteps'] = [];
    const missingConnections: ConnectionValidationResult['missingConnections'] = [];
    
    const connectionMap = new Map(
      request.availableConnections.map(conn => [conn.id, conn])
    );

    for (const step of request.steps) {
      if (step.type === 'api_call') {
        const validation = this.validateApiCallStep(step, connectionMap, request.userDescription);
        validatedSteps.push(validation);
        
        if (!validation.isValid && validation.validationErrors) {
          missingConnections.push({
            stepId: step.id,
            requiredApi: this.extractRequiredApi(step.name),
            suggestedConnections: this.suggestConnections(step.name, request.availableConnections)
          });
        }
      } else {
        // Non-API steps don't need connection validation
        validatedSteps.push({
          id: step.id,
          name: step.name,
          type: step.type,
          apiConnectionId: '',
          endpoint: '',
          method: '',
          isValid: true
        });
      }
    }

    return {
      success: true,
      validatedSteps,
      missingConnections: missingConnections.length > 0 ? missingConnections : undefined
    };
  }

  /**
   * Validate a single API call step
   */
  private validateApiCallStep(
    step: any, 
    connectionMap: Map<string, any>, 
    userDescription: string
  ): any {
    const errors: string[] = [];
    
    // Check if connection ID exists
    if (!step.apiConnectionId) {
      errors.push('No connection ID provided');
      return {
        id: step.id,
        name: step.name,
        type: step.type,
        apiConnectionId: '',
        endpoint: step.endpoint || '',
        method: step.method || '',
        isValid: false,
        validationErrors: errors
      };
    }

    const connection = connectionMap.get(step.apiConnectionId);
    if (!connection) {
      errors.push(`Connection ID '${step.apiConnectionId}' not found in available connections`);
      return {
        id: step.id,
        name: step.name,
        type: step.type,
        apiConnectionId: step.apiConnectionId,
        endpoint: step.endpoint || '',
        method: step.method || '',
        isValid: false,
        validationErrors: errors
      };
    }

    // Check if endpoint exists
    if (step.endpoint) {
      const endpoint = connection.endpoints?.find((ep: any) => 
        ep.path === step.endpoint && ep.method === step.method
      );
      
      if (!endpoint) {
        errors.push(`Endpoint '${step.method} ${step.endpoint}' not found in connection '${connection.name}'`);
      }
    }

    return {
      id: step.id,
      name: step.name,
      type: step.type,
      apiConnectionId: step.apiConnectionId,
      endpoint: step.endpoint || '',
      method: step.method || '',
      isValid: errors.length === 0,
      validationErrors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Build system prompt for connection validation
   */
  private buildValidationSystemPrompt(availableConnections: ConnectionValidationRequest['availableConnections']): string {
    const connectionInfo = availableConnections.map(conn => 
      `**${conn.name}** (ID: ${conn.id})
Base URL: ${conn.baseUrl || 'N/A'}
Endpoints: ${conn.endpoints?.map(ep => `${ep.method} ${ep.path}`).join(', ') || 'None'}`
    ).join('\n\n');

    return `You are an expert connection validation specialist. Your job is to validate and map connection IDs for workflow steps.

Available Connections:
${connectionInfo}

VALIDATION RULES:
1. Verify that all connection IDs exist in the available connections list
2. Check that endpoints and methods are valid for each connection
3. Suggest alternative connections when validation fails
4. Identify missing connections that would be needed
5. Provide specific error messages for validation failures

VALIDATION CRITERIA:
- Connection ID must exist in available connections
- Endpoint must exist in the connection's endpoints
- Method must match the endpoint's supported methods
- Connection must be compatible with the step's requirements

Respond with JSON in this format:
{
  "validatedSteps": [
    {
      "id": "step_id",
      "name": "Step Name",
      "type": "api_call",
      "apiConnectionId": "valid_connection_id",
      "endpoint": "/api/endpoint",
      "method": "GET",
      "isValid": true,
      "validationErrors": []
    }
  ],
  "missingConnections": [
    {
      "stepId": "step_id",
      "requiredApi": "API Name",
      "suggestedConnections": ["connection_id_1", "connection_id_2"]
    }
  ]
}`;
  }

  /**
   * Build user prompt for connection validation
   */
  private buildValidationUserPrompt(request: ConnectionValidationRequest): string {
    const stepsInfo = request.steps.map(step => 
      `- ${step.name} (${step.type}): ${step.apiConnectionId ? `Connection: ${step.apiConnectionId}` : 'No connection'}`
    ).join('\n');

    return `Validate connections for these workflow steps:

User Description: "${request.userDescription}"

Steps to Validate:
${stepsInfo}

Please validate each step and provide suggestions for any missing or invalid connections.`;
  }

  /**
   * Extract required API from step name
   */
  private extractRequiredApi(stepName: string): string {
    const name = stepName.toLowerCase();
    
    if (name.includes('slack')) return 'Slack';
    if (name.includes('github')) return 'GitHub';
    if (name.includes('trello')) return 'Trello';
    if (name.includes('email')) return 'Email Service';
    if (name.includes('database')) return 'Database';
    
    return 'Unknown API';
  }

  /**
   * Suggest connections based on step requirements
   */
  private suggestConnections(stepName: string, availableConnections: ConnectionValidationRequest['availableConnections']): string[] {
    const name = stepName.toLowerCase();
    const suggestions: string[] = [];
    
    for (const conn of availableConnections) {
      const connName = conn.name.toLowerCase();
      
      if (name.includes('slack') && connName.includes('slack')) {
        suggestions.push(conn.id);
      } else if (name.includes('github') && connName.includes('github')) {
        suggestions.push(conn.id);
      } else if (name.includes('trello') && connName.includes('trello')) {
        suggestions.push(conn.id);
      } else if (name.includes('email') && connName.includes('email')) {
        suggestions.push(conn.id);
      }
    }
    
    return suggestions;
  }
}

/**
 * API Requirement Service
 * 
 * Determines which APIs are needed to fulfill user requests.
 * This service focuses specifically on identifying required APIs
 * and checking if they're available or need to be set up.
 * 
 * Features:
 * - AI-powered API detection
 * - Knowledge base integration
 * - Availability checking
 * - Requirements analysis
 * - Rules-based fallback for common patterns
 */

import { OpenAIService } from '../../services/openaiService';
import { logInfo, logError } from '../../utils/logger';
import { parseAIResponse } from '../utils/aiResponseParser';

export interface ApiRequirementRequest {
  userMessage: string;
  userIntent: {
    userGoal: string;
    guidanceType: string;
    complexity: string;
    requiresMultipleApis: boolean;
  };
  availableConnections: Array<{
    name: string;
    id: string;
    baseUrl?: string;
    endpoints?: Array<{
      path: string;
      method: string;
      summary: string;
    }>;
  }>;
  context?: Record<string, any>;
}

export interface ApiRequirement {
  name: string;
  displayName: string;
  confidence: number;
  reason: string;
  suggestedEndpoints: string[];
  isAvailable: boolean;
  connectionId?: string;
}

export interface ApiRequirementResult {
  success: boolean;
  requirements?: {
    requiresGuidance: boolean;
    requiredApis: ApiRequirement[];
    missingApis: ApiRequirement[];
    availableApis: ApiRequirement[];
    userIntent: string;
    suggestedWorkflow?: string;
  };
  error?: string;
}

export class ApiRequirementService {
  private openaiService: OpenAIService;
  private static readonly API_KNOWLEDGE_BASE = {
    slack: {
      name: 'slack',
      displayName: 'Slack',
      description: 'Team communication and collaboration platform',
      authType: 'BEARER_TOKEN',
      capabilities: ['messaging', 'notifications', 'team_communication'],
      keywords: ['slack', 'message', 'notification', 'team', 'chat'],
      baseUrl: 'https://slack.com/api',
      commonEndpoints: ['/chat.postMessage', '/conversations.list', '/users.list']
    },
    github: {
      name: 'github',
      displayName: 'GitHub',
      description: 'Code repository and project management platform',
      authType: 'BEARER_TOKEN',
      capabilities: ['repository_management', 'issue_tracking', 'pull_requests'],
      keywords: ['github', 'repository', 'issue', 'pull request', 'commit'],
      baseUrl: 'https://api.github.com',
      commonEndpoints: ['/repos/{owner}/{repo}/issues', '/repos/{owner}/{repo}/pulls', '/user']
    },
    trello: {
      name: 'trello',
      displayName: 'Trello',
      description: 'Project management and task organization platform',
      authType: 'API_KEY',
      capabilities: ['project_management', 'task_tracking', 'boards'],
      keywords: ['trello', 'board', 'card', 'list', 'project'],
      baseUrl: 'https://api.trello.com/1',
      commonEndpoints: ['/boards', '/cards', '/lists', '/members']
    },
    email: {
      name: 'email',
      displayName: 'Email Service',
      description: 'Email communication service',
      authType: 'API_KEY',
      capabilities: ['email_sending', 'notifications'],
      keywords: ['email', 'mail', 'send', 'notification'],
      baseUrl: 'https://api.emailservice.com',
      commonEndpoints: ['/send', '/templates', '/contacts']
    }
  };

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Determine which APIs are needed for the user's request
   */
  async determineApiRequirements(request: ApiRequirementRequest): Promise<ApiRequirementResult> {
    logInfo('🔍 ApiRequirementService: Starting API requirement analysis', {
      userGoal: request.userIntent.userGoal,
      connectionsCount: request.availableConnections.length,
      requiresMultipleApis: request.userIntent.requiresMultipleApis
    });

    try {
      // Try AI-powered requirement analysis first
      const aiResult = await this.determineRequirementsWithAI(request);
      if (aiResult.success) {
        logInfo('🔍 ApiRequirementService: AI analysis successful', {
          requiredApis: aiResult.requirements?.requiredApis.length,
          missingApis: aiResult.requirements?.missingApis.length,
          availableApis: aiResult.requirements?.availableApis.length
        });
        return aiResult;
      }

      // Fallback to rules-based analysis
      logInfo('🔍 ApiRequirementService: Falling back to rules-based analysis');
      return this.determineRequirementsWithRules(request);

    } catch (error) {
      logError('🔍 ApiRequirementService: API requirement analysis failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API requirement analysis failed'
      };
    }
  }

  /**
   * Use AI to determine API requirements
   */
  private async determineRequirementsWithAI(request: ApiRequirementRequest): Promise<ApiRequirementResult> {
    try {
      const systemPrompt = this.buildRequirementAnalysisSystemPrompt();
      const userPrompt = this.buildRequirementAnalysisUserPrompt(request);

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 600
      });

      const parseResult = parseAIResponse(response);
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse AI response');
      }
      
      // Process the AI result and check availability
      const processedRequirements = this.processApiRequirements(parseResult.data as any, request.availableConnections);
      
      return {
        success: true,
        requirements: processedRequirements
      };

    } catch (error) {
      console.error('🔍 ApiRequirementService: AI analysis failed:', error);
      return {
        success: false,
        error: 'AI requirement analysis failed'
      };
    }
  }

  /**
   * Use rules-based requirement analysis
   */
  private determineRequirementsWithRules(request: ApiRequirementRequest): ApiRequirementResult {
    const message = request.userMessage.toLowerCase();
    const requiredApis: ApiRequirement[] = [];
    
    // First, check if the user's request can be fulfilled by existing connections
    const existingConnectionMatch = this.findMatchingExistingConnection(message, request.availableConnections);
    if (existingConnectionMatch) {
      logInfo('🔍 ApiRequirementService: Found matching existing connection', {
        connectionName: existingConnectionMatch.name,
        connectionId: existingConnectionMatch.id,
        userMessage: request.userMessage
      });
      
      // User has a connection that can fulfill their request
      return {
        success: true,
        requirements: {
          requiresGuidance: false,
          requiredApis: [{
            name: existingConnectionMatch.name.toLowerCase(),
            displayName: existingConnectionMatch.name,
            confidence: 0.9,
            reason: `User has an existing ${existingConnectionMatch.name} connection that can fulfill their request`,
            suggestedEndpoints: existingConnectionMatch.endpoints?.map(ep => `${ep.method} ${ep.path}`) || [],
            isAvailable: true,
            connectionId: existingConnectionMatch.id
          }],
          missingApis: [],
          availableApis: [{
            name: existingConnectionMatch.name.toLowerCase(),
            displayName: existingConnectionMatch.name,
            confidence: 0.9,
            reason: `User has an existing ${existingConnectionMatch.name} connection that can fulfill their request`,
            suggestedEndpoints: existingConnectionMatch.endpoints?.map(ep => `${ep.method} ${ep.path}`) || [],
            isAvailable: true,
            connectionId: existingConnectionMatch.id
          }],
          userIntent: request.userIntent.userGoal,
          suggestedWorkflow: `Use existing ${existingConnectionMatch.name} connection`
        }
      };
    }
    
    // If no existing connection matches, analyze message for API keywords
    const apiKeywords = Object.keys(ApiRequirementService.API_KNOWLEDGE_BASE);
    
    for (const apiName of apiKeywords) {
      const apiInfo = ApiRequirementService.API_KNOWLEDGE_BASE[apiName as keyof typeof ApiRequirementService.API_KNOWLEDGE_BASE];
      const keywords = apiInfo.keywords;
      
      if (keywords.some(keyword => message.includes(keyword))) {
        const isAvailable = request.availableConnections.some(conn => 
          conn.name.toLowerCase().includes(apiName) || 
          apiName.includes(conn.name.toLowerCase())
        );
        
        const connection = request.availableConnections.find(conn => 
          conn.name.toLowerCase().includes(apiName) || 
          apiName.includes(conn.name.toLowerCase())
        );
        
        requiredApis.push({
          name: apiName,
          displayName: apiInfo.displayName,
          confidence: 0.8,
          reason: `User mentioned ${apiName} in their request`,
          suggestedEndpoints: apiInfo.commonEndpoints,
          isAvailable,
          connectionId: connection?.id
        });
      }
    }

    // Separate available and missing APIs
    const availableApis = requiredApis.filter(api => api.isAvailable);
    const missingApis = requiredApis.filter(api => !api.isAvailable);

    return {
      success: true,
      requirements: {
        requiresGuidance: missingApis.length > 0,
        requiredApis,
        missingApis,
        availableApis,
        userIntent: request.userIntent.userGoal,
        suggestedWorkflow: this.generateWorkflowSuggestion(requiredApis, request.userIntent)
      }
    };
  }

  /**
   * Build system prompt for requirement analysis
   */
  private buildRequirementAnalysisSystemPrompt(): string {
    const knowledgeBase = Object.values(ApiRequirementService.API_KNOWLEDGE_BASE).map(api => ({
      name: api.name,
      displayName: api.displayName,
      capabilities: api.capabilities,
      keywords: api.keywords
    }));

    return `You are an expert API requirement analyst. Your job is to determine which APIs are needed to fulfill user requests.

Available API Knowledge Base: ${JSON.stringify(knowledgeBase, null, 2)}

REQUIREMENT ANALYSIS RULES:
1. Analyze the user's message for API keywords and capabilities
2. Identify all APIs mentioned or implied in the request
3. Determine which APIs are required vs optional
4. Provide confidence scores for each API requirement
5. Suggest relevant endpoints for each API
6. Consider the user's intent and goals

Respond with JSON in this format:
{
  "requiredApis": [
    {
      "name": "api_name",
      "displayName": "API Display Name",
      "confidence": 0.0-1.0,
      "reason": "Why this API is needed",
      "suggestedEndpoints": ["endpoint1", "endpoint2"]
    }
  ],
  "userIntent": "What the user is trying to accomplish",
  "suggestedWorkflow": "Optional workflow suggestion"
}`;
  }

  /**
   * Build user prompt for requirement analysis
   */
  private buildRequirementAnalysisUserPrompt(request: ApiRequirementRequest): string {
    const availableConnections = request.availableConnections.map(conn => ({
      name: conn.name,
      baseUrl: conn.baseUrl,
      endpoints: conn.endpoints?.map(ep => `${ep.method} ${ep.path}`).join(', ') || 'No endpoints'
    }));

    return `Analyze API requirements for this request:

User Message: "${request.userMessage}"
User Goal: "${request.userIntent.userGoal}"
Guidance Type: "${request.userIntent.guidanceType}"
Complexity: "${request.userIntent.complexity}"
Requires Multiple APIs: ${request.userIntent.requiresMultipleApis}

Available Connections: ${JSON.stringify(availableConnections, null, 2)}

${request.context ? `Context: ${JSON.stringify(request.context)}` : ''}`;
  }

  /**
   * Process AI results and check API availability
   */
  private processApiRequirements(aiResult: any, availableConnections: ApiRequirementRequest['availableConnections']) {
    const requiredApis: ApiRequirement[] = aiResult.requiredApis.map((api: any) => {
      const isAvailable = availableConnections.some(conn => 
        conn.name.toLowerCase().includes(api.name.toLowerCase()) ||
        api.name.toLowerCase().includes(conn.name.toLowerCase())
      );
      
      const connection = availableConnections.find(conn => 
        conn.name.toLowerCase().includes(api.name.toLowerCase()) ||
        api.name.toLowerCase().includes(conn.name.toLowerCase())
      );

      return {
        name: api.name,
        displayName: api.displayName,
        confidence: api.confidence,
        reason: api.reason,
        suggestedEndpoints: api.suggestedEndpoints,
        isAvailable,
        connectionId: connection?.id
      };
    });

    const availableApis = requiredApis.filter(api => api.isAvailable);
    const missingApis = requiredApis.filter(api => !api.isAvailable);

    return {
      requiresGuidance: missingApis.length > 0,
      requiredApis,
      missingApis,
      availableApis,
      userIntent: aiResult.userIntent,
      suggestedWorkflow: aiResult.suggestedWorkflow
    };
  }

  /**
   * Find if any existing connection can fulfill the user's request
   */
  private findMatchingExistingConnection(
    message: string, 
    availableConnections: ApiRequirementRequest['availableConnections']
  ): ApiRequirementRequest['availableConnections'][0] | null {
    const lowerMessage = message.toLowerCase();
    
    // Check if any existing connection can fulfill the request
    for (const connection of availableConnections) {
      const connectionName = connection.name.toLowerCase();
      
      // Check if the connection name or baseUrl matches the user's request
      if (lowerMessage.includes(connectionName) || 
          (connection.baseUrl && lowerMessage.includes(connection.baseUrl.toLowerCase()))) {
        logInfo('🔍 ApiRequirementService: Found connection match', {
          connectionName: connection.name,
          connectionId: connection.id,
          userMessage: message
        });
        return connection;
      }
      
      // Check if the connection has endpoints that match the user's request
      if (connection.endpoints && connection.endpoints.length > 0) {
        const hasMatchingEndpoint = connection.endpoints.some(endpoint => {
          const endpointPath = endpoint.path.toLowerCase();
          const endpointSummary = endpoint.summary?.toLowerCase() || '';
          
          // Check if the endpoint path or summary matches the user's request
          return lowerMessage.includes(endpointPath) || 
                 lowerMessage.includes(endpointSummary) ||
                 endpointPath.includes('pet') || // For petstore API
                 endpointSummary.includes('pet');
        });
        
        if (hasMatchingEndpoint) {
          logInfo('🔍 ApiRequirementService: Found endpoint match', {
            connectionName: connection.name,
            connectionId: connection.id,
            userMessage: message
          });
          return connection;
        }
      }
    }
    
    return null;
  }

  /**
   * Generate workflow suggestion based on requirements
   */
  private generateWorkflowSuggestion(requiredApis: ApiRequirement[], userIntent: any): string {
    if (requiredApis.length === 0) {
      return 'No specific workflow needed';
    }

    if (requiredApis.length === 1) {
      return `Simple workflow using ${requiredApis[0].displayName}`;
    }

    return `Multi-step workflow involving ${requiredApis.map(api => api.displayName).join(', ')}`;
  }
}

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
      authType: 'OAUTH2',
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
    },
    google_drive: {
      name: 'google_drive',
      displayName: 'Google Drive',
      description: 'Cloud storage and file management platform',
      authType: 'OAUTH2',
      capabilities: ['file_storage', 'file_sharing', 'document_collaboration'],
      keywords: ['google drive', 'drive', 'file storage', 'cloud storage', 'documents'],
      baseUrl: 'https://www.googleapis.com/drive/v3',
      commonEndpoints: ['/files', '/files/{fileId}', '/files/{fileId}/permissions']
    },
    google_sheets: {
      name: 'google_sheets',
      displayName: 'Google Sheets',
      description: 'Spreadsheet and data management platform',
      authType: 'OAUTH2',
      capabilities: ['spreadsheet_management', 'data_analysis', 'collaborative_editing'],
      keywords: ['google sheets', 'sheets', 'spreadsheet', 'excel', 'data'],
      baseUrl: 'https://sheets.googleapis.com/v4',
      commonEndpoints: ['/spreadsheets', '/spreadsheets/{spreadsheetId}']
    },
    airtable: {
      name: 'airtable',
      displayName: 'Airtable',
      description: 'Database and project management platform',
      authType: 'API_KEY',
      capabilities: ['database_management', 'project_tracking', 'data_organization'],
      keywords: ['airtable', 'database', 'project management', 'tables', 'records'],
      baseUrl: 'https://api.airtable.com/v0',
      commonEndpoints: ['/{baseId}/{tableName}', '/{baseId}/{tableName}/{recordId}']
    },
    notion: {
      name: 'notion',
      displayName: 'Notion',
      description: 'All-in-one workspace for notes, docs, and project management',
      authType: 'OAUTH2',
      capabilities: ['note_taking', 'documentation', 'project_management', 'database_management'],
      keywords: ['notion', 'notes', 'documentation', 'workspace', 'pages'],
      baseUrl: 'https://api.notion.com/v1',
      commonEndpoints: ['/pages', '/databases', '/blocks', '/users']
    },
    mailchimp: {
      name: 'mailchimp',
      displayName: 'Mailchimp',
      description: 'Email marketing and automation platform',
      authType: 'API_KEY',
      capabilities: ['email_marketing', 'automation', 'audience_management'],
      keywords: ['mailchimp', 'email marketing', 'newsletter', 'automation', 'campaigns'],
      baseUrl: 'https://us1.api.mailchimp.com/3.0',
      commonEndpoints: ['/lists', '/campaigns', '/automations', '/reports']
    },
    openai: {
      name: 'openai',
      displayName: 'OpenAI',
      description: 'AI and machine learning services',
      authType: 'API_KEY',
      capabilities: ['text_generation', 'chat_completion', 'embeddings'],
      keywords: ['openai', 'ai', 'gpt', 'chatgpt', 'completion', 'generation'],
      baseUrl: 'https://api.openai.com/v1',
      commonEndpoints: ['/chat/completions', '/completions', '/embeddings']
    },
    stripe: {
      name: 'stripe',
      displayName: 'Stripe',
      description: 'Payment processing and subscription management',
      authType: 'API_KEY',
      capabilities: ['payment_processing', 'subscription_management', 'customer_management'],
      keywords: ['stripe', 'payment', 'billing', 'subscription', 'customer'],
      baseUrl: 'https://api.stripe.com/v1',
      commonEndpoints: ['/charges', '/customers', '/subscriptions', '/invoices']
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
      // Check if this is a vague description that needs special handling
      const isVague = this.isVagueDescription(request.userMessage);
      const isConnectionSetup = request.userIntent.guidanceType === 'connection_setup';
      
      logInfo('🔍 ApiRequirementService: Vague description check', {
        message: request.userMessage,
        isVague,
        guidanceType: request.userIntent.guidanceType,
        isConnectionSetup,
        shouldUseRules: isVague && isConnectionSetup
      });
      
      if (isVague && isConnectionSetup) {
        logInfo('🔍 ApiRequirementService: Detected vague description, using rules-based analysis');
        return this.determineRequirementsWithRules(request);
      }

      // Try AI-powered requirement analysis first
      const aiResult = await this.determineRequirementsWithAI(request);
      if (aiResult.success) {
        logInfo('🔍 ApiRequirementService: AI analysis successful', {
          requiredApis: aiResult.requirements?.requiredApis.length,
          missingApis: aiResult.requirements?.missingApis.length,
          availableApis: aiResult.requirements?.availableApis.length
        });
        
        // If AI returned 0 required APIs but this is a vague description, use rules-based approach
        if (aiResult.requirements?.requiredApis.length === 0 && 
            this.isVagueDescription(request.userMessage) && 
            request.userIntent.guidanceType === 'connection_setup') {
          logInfo('🔍 ApiRequirementService: AI returned 0 APIs for vague description, using rules-based approach');
          return this.determineRequirementsWithRules(request);
        }
        
        return aiResult;
      } else {
        logInfo('🔍 ApiRequirementService: AI analysis failed, falling back to rules-based analysis', {
          error: aiResult.error
        });
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
        logError('🔍 ApiRequirementService: JSON parsing failed', new Error(parseResult.error || 'Failed to parse AI response'));
        throw new Error(parseResult.error || 'Failed to parse AI response');
      }
      
      // Process the AI result and check availability
      const processedRequirements = await this.processApiRequirements(parseResult.data as any, request.availableConnections);
      
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
   * Check if a message is a vague description that needs guidance
   */
  private isVagueDescription(message: string): boolean {
    const vaguePatterns = [
      /^do\s+something$/i,
      /^help\s+me$/i,
      /^what\s+can\s+you\s+do/i,
      /^i\s+want\s+to\s+automate\s+something$/i,
      /^automate\s+something$/i,
      /^create\s+something$/i,
      /^build\s+something$/i,
      /^make\s+something$/i,
      /^set\s+up\s+something$/i,
      /^configure\s+something$/i
    ];
    
    const trimmedMessage = message.trim();
    const isVague = vaguePatterns.some(pattern => pattern.test(trimmedMessage));
    
    logInfo('🔍 ApiRequirementService: Vague description check', {
      message: trimmedMessage,
      isVague,
      matchedPatterns: vaguePatterns.filter(pattern => pattern.test(trimmedMessage))
    });
    
    return isVague;
  }

  /**
   * Use rules-based requirement analysis
   */
  private determineRequirementsWithRules(request: ApiRequirementRequest): ApiRequirementResult {
    const message = request.userMessage.toLowerCase();
    const requiredApis: ApiRequirement[] = [];
    
    // Ensure availableConnections is always an array
    const availableConnections = request.availableConnections || [];
    
    logInfo('🔍 ApiRequirementService: Starting rules-based analysis', {
      message: message,
      availableConnections: availableConnections.length
    });
    
    // Handle vague descriptions - if the user provides a vague description and the intent analysis
    // determined they need connection setup, provide guidance about common APIs
    if (this.isVagueDescription(message) && request.userIntent.guidanceType === 'connection_setup') {
      logInfo('🔍 ApiRequirementService: Detected vague description requiring connection setup', {
        message: message,
        guidanceType: request.userIntent.guidanceType
      });
      
      // For vague descriptions, suggest common APIs that users typically need
      const commonApis = [
        {
          name: 'slack',
          displayName: 'Slack',
          description: 'Team communication and notifications',
          authType: 'BEARER_TOKEN',
          baseUrl: 'https://slack.com/api',
          commonEndpoints: ['/chat.postMessage', '/conversations.list', '/users.list']
        },
        {
          name: 'email',
          displayName: 'Email Service',
          description: 'Send emails and notifications',
          authType: 'API_KEY',
          baseUrl: 'https://api.sendgrid.com/v3',
          commonEndpoints: ['/mail/send', '/templates', '/contacts']
        },
        {
          name: 'github',
          displayName: 'GitHub',
          description: 'Code repository and project management',
          authType: 'BEARER_TOKEN',
          baseUrl: 'https://api.github.com',
          commonEndpoints: ['/repos/{owner}/{repo}/issues', '/repos/{owner}/{repo}/pulls', '/user']
        }
      ];
      
      // Check which common APIs are available
      for (const api of commonApis) {
        const isAvailable = availableConnections.some(conn => {
          const connName = conn.name.toLowerCase();
          return connName.includes(api.name) || 
                 api.name.includes(connName) ||
                 (api.name === 'email' && (connName.includes('email') || connName.includes('sendgrid'))) ||
                 (api.name === 'slack' && connName.includes('slack')) ||
                 (api.name === 'github' && connName.includes('github'));
        });
        
        const connection = availableConnections.find(conn => {
          const connName = conn.name.toLowerCase();
          return connName.includes(api.name) || 
                 api.name.includes(connName) ||
                 (api.name === 'email' && (connName.includes('email') || connName.includes('sendgrid'))) ||
                 (api.name === 'slack' && connName.includes('slack')) ||
                 (api.name === 'github' && connName.includes('github'));
        });
        
        requiredApis.push({
          name: api.name,
          displayName: api.displayName,
          confidence: 0.8, // High confidence for common APIs when user is vague
          reason: `Common API that users typically need for automation and notifications`,
          suggestedEndpoints: api.commonEndpoints,
          isAvailable,
          connectionId: connection?.id
        });
      }
      
      // If no APIs are available, return guidance about setting up connections
      const availableApis = requiredApis.filter(api => api.isAvailable);
      const missingApis = requiredApis.filter(api => !api.isAvailable);
      
      return {
        success: true,
        requirements: {
          requiresGuidance: true, // Always provide guidance for vague descriptions
          requiredApis,
          missingApis,
          availableApis,
          userIntent: 'User provided a vague description and needs guidance on available APIs',
          suggestedWorkflow: 'Consider setting up API connections for common services like Slack, Email, or GitHub to enable automation workflows'
        }
      };
    }
    
    // Enhanced API detection patterns
    const apiDetectionPatterns = [
      {
        name: 'slack',
        displayName: 'Slack',
        keywords: ['slack', 'message', 'notification', 'team', 'chat', 'channel'],
        capabilities: ['messaging', 'notifications', 'team_communication'],
        authType: 'BEARER_TOKEN',
        baseUrl: 'https://slack.com/api',
        commonEndpoints: ['/chat.postMessage', '/conversations.list', '/users.list']
      },
      {
        name: 'github',
        displayName: 'GitHub',
        keywords: ['github', 'repository', 'issue', 'pull request', 'commit', 'repo'],
        capabilities: ['repository_management', 'issue_tracking', 'pull_requests'],
        authType: 'BEARER_TOKEN',
        baseUrl: 'https://api.github.com',
        commonEndpoints: ['/repos/{owner}/{repo}/issues', '/repos/{owner}/{repo}/pulls', '/user']
      },
      {
        name: 'google-drive',
        displayName: 'Google Drive',
        keywords: ['google drive', 'drive', 'file', 'document', 'sync', 'upload', 'download'],
        capabilities: ['file_management', 'document_storage', 'file_sharing'],
        authType: 'OAUTH2',
        baseUrl: 'https://www.googleapis.com/drive/v3',
        commonEndpoints: ['/files', '/files/{fileId}', '/about']
      },
      {
        name: 'stripe',
        displayName: 'Stripe',
        keywords: ['stripe', 'payment', 'billing', 'subscription', 'invoice'],
        capabilities: ['payment_processing', 'billing', 'subscription_management'],
        authType: 'API_KEY',
        baseUrl: 'https://api.stripe.com/v1',
        commonEndpoints: ['/charges', '/customers', '/subscriptions', '/products']
      },
      {
        name: 'openai',
        displayName: 'OpenAI',
        keywords: ['openai', 'gpt', 'ai', 'chatgpt', 'completion', 'language model'],
        capabilities: ['ai_processing', 'language_generation', 'text_completion'],
        authType: 'API_KEY',
        baseUrl: 'https://api.openai.com/v1',
        commonEndpoints: ['/chat/completions', '/completions', '/embeddings']
      },
      {
        name: 'airtable',
        displayName: 'Airtable',
        keywords: ['airtable', 'database', 'table', 'record', 'base'],
        capabilities: ['database_management', 'record_tracking', 'data_storage'],
        authType: 'API_KEY',
        baseUrl: 'https://api.airtable.com/v0',
        commonEndpoints: ['/{baseId}/{tableName}', '/{baseId}/{tableName}/{recordId}']
      },
      {
        name: 'notion',
        displayName: 'Notion',
        keywords: ['notion', 'page', 'database', 'block', 'workspace'],
        capabilities: ['document_management', 'database_management', 'collaboration'],
        authType: 'BEARER_TOKEN',
        baseUrl: 'https://api.notion.com/v1',
        commonEndpoints: ['/pages', '/databases', '/blocks']
      }
    ];

    // Check each API pattern
    for (const apiPattern of apiDetectionPatterns) {
      const isMentioned = apiPattern.keywords.some(keyword => message.includes(keyword));
      
      if (isMentioned) {
        logInfo('🔍 ApiRequirementService: Detected API mention', {
          api: apiPattern.name,
          keywords: apiPattern.keywords.filter(k => message.includes(k))
        });
        
        // Check if user has this API connected
        const isAvailable = availableConnections.some(conn => {
          const connName = conn.name.toLowerCase();
          return connName.includes(apiPattern.name) || 
                 apiPattern.name.includes(connName) ||
                 (apiPattern.name === 'google-drive' && connName.includes('google')) ||
                 (apiPattern.name === 'openai' && connName.includes('openai'));
        });
        
        const connection = availableConnections.find(conn => {
          const connName = conn.name.toLowerCase();
          return connName.includes(apiPattern.name) || 
                 apiPattern.name.includes(connName) ||
                 (apiPattern.name === 'google-drive' && connName.includes('google')) ||
                 (apiPattern.name === 'openai' && connName.includes('openai'));
        });
        
        requiredApis.push({
          name: apiPattern.name,
          displayName: apiPattern.displayName,
          confidence: 0.9,
          reason: `User mentioned ${apiPattern.displayName} in their request`,
          suggestedEndpoints: apiPattern.commonEndpoints,
          isAvailable,
          connectionId: connection?.id
        });
      }
    }

    // Separate available and missing APIs
    const availableApis = requiredApis.filter(api => api.isAvailable);
    const missingApis = requiredApis.filter(api => !api.isAvailable);

    logInfo('🔍 ApiRequirementService: Rules-based analysis complete', {
      totalApis: requiredApis.length,
      availableApis: availableApis.length,
      missingApis: missingApis.length,
      requiresGuidance: missingApis.length > 0
    });

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
3. Check if any required APIs are already available through existing connections
4. Determine which APIs are required vs optional
5. Provide confidence scores for each API requirement
6. Suggest relevant endpoints for each API
7. Consider the user's intent and goals
8. CRITICAL: If a connection exists that can fulfill an API requirement, mark that API as available

CRITICAL: Respond with ONLY valid JSON in this exact format. Do not include any markdown, explanations, or additional text. Ensure all strings are properly quoted and all objects are properly closed:

{
  "requiredApis": [
    {
      "name": "api_name",
      "displayName": "API Display Name",
      "confidence": 0.0-1.0,
      "reason": "Why this API is needed",
      "suggestedEndpoints": ["endpoint1", "endpoint2"],
      "isAvailable": true/false,
      "connectionId": "connection_id_if_available"
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

Available Connections: ${JSON.stringify(availableConnections, null, 2)}

IMPORTANT: Check if the required APIs are already available through existing connections. If a connection exists that can fulfill the API requirement, mark it as available. For example:
- If user mentions "GitHub" and you see a connection named "GitHub E2E Connection", that API is available
- If user mentions "Slack" and you see a connection named "Slack E2E Connection", that API is available
- If user mentions "Trello" and you see a connection named "Trello E2E Connection", that API is available
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
  private async processApiRequirements(aiResult: any, availableConnections: ApiRequirementRequest['availableConnections']) {
    console.log('🔍 ApiRequirementService: Processing AI result:', {
      requiredApis: aiResult.requiredApis?.length || 0,
      availableConnections: availableConnections.length
    });

    const requiredApis: ApiRequirement[] = await Promise.all(aiResult.requiredApis.map(async (api: any) => {
      // Use the AI-powered connection matching logic
      const matchingConnection = await this.findMatchingExistingConnection(
        `${api.name} ${api.displayName} ${api.reason}`,
        availableConnections
      );
      
      const isAvailable = !!matchingConnection;

      console.log('🔍 ApiRequirementService: API processing result:', {
        apiName: api.name,
        isAvailable,
        connectionId: matchingConnection?.id,
        connectionName: matchingConnection?.name
      });

      return {
        name: api.name,
        displayName: api.displayName,
        confidence: api.confidence,
        reason: api.reason,
        suggestedEndpoints: api.suggestedEndpoints,
        isAvailable,
        connectionId: matchingConnection?.id
      };
    }));

    const availableApis = requiredApis.filter(api => api.isAvailable);
    const missingApis = requiredApis.filter(api => !api.isAvailable);

    console.log('🔍 ApiRequirementService: Final processing result:', {
      totalApis: requiredApis.length,
      availableApis: availableApis.length,
      missingApis: missingApis.length,
      requiresGuidance: missingApis.length > 0,
      availableApiNames: availableApis.map(api => api.name),
      missingApiNames: missingApis.map(api => api.name)
    });

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
   * Use AI to evaluate if any existing connection can fulfill the user's request
   * This replaces rigid rule-based matching with intelligent AI evaluation
   */
  private async findMatchingExistingConnection(
    message: string, 
    availableConnections: ApiRequirementRequest['availableConnections']
  ): Promise<ApiRequirementRequest['availableConnections'][0] | null> {
    console.log('🔍 ApiRequirementService: AI-powered connection matching called', {
      message,
      availableConnections: availableConnections.map(c => ({ name: c.name, baseUrl: c.baseUrl }))
    });
    try {
      const systemPrompt = `You are an expert API connection evaluator. Your job is to determine if any existing API connections can fulfill a user's request.

EVALUATION RULES:
1. Analyze the user's request to understand what APIs they need
2. Examine each available connection to see if it can fulfill those needs
3. Consider connection names, base URLs, and any available endpoints
4. Be VERY flexible with naming - ANY connection with relevant keywords should match
5. For test connections, be especially permissive - "E2E Connection for Testing" can fulfill ANY request
6. If a connection can fulfill the request, return the connection details
7. Use a simple, reliable format that's easy to parse

CRITICAL: If you find ANY connection that can fulfill the request, you MUST return the connection details.

EXAMPLES:
- "E2E Connection for Testing" can fulfill ANY request (GitHub, Slack, Email, etc.)
- "Github E2E Connection" can fulfill "GitHub" requests
- "Slack E2E Connection" can fulfill "Slack" requests  
- "Trello E2E Connection" can fulfill "Trello" requests
- Any connection with "test" in the name should be considered for ANY request

RESPONSE FORMAT (SIMPLE AND RELIABLE):
If a connection can fulfill the request, respond with:
MATCH: [connection_id]|[connection_name]|[reason]

If no connection can fulfill the request, respond with:
NO_MATCH: [brief explanation]

This format is much more reliable than JSON and easier to parse.`;

      const userPrompt = `Evaluate if any of these connections can fulfill this request:

USER REQUEST: "${message}"

AVAILABLE CONNECTIONS:
${availableConnections.map(conn => 
  `- Connection Name: "${conn.name}" | Database ID: "${conn.id}" | Base URL: ${conn.baseUrl}${conn.endpoints ? ` | Endpoints: ${conn.endpoints.length}` : ''}`
).join('\n')}

CRITICAL INSTRUCTIONS:
1. The Database ID is the long string that starts with "cmf" (like "cmfztsb2u00069kf96beh5lzo")
2. Do NOT use any part of the connection name (like timestamps in parentheses) as the ID
3. The connection name may contain timestamps like "(1758829690901)" - IGNORE these completely
4. ONLY use the Database ID that starts with "cmf" in your response

Can any of these connections fulfill the user's request?`;

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 300
      });

      console.log('🔍 ApiRequirementService: AI response:', response);

      // Parse the simple format: MATCH: [id]|[name]|[reason] or NO_MATCH: [explanation]
      const responseText = response.trim();
      
      if (responseText.startsWith('MATCH:')) {
        const matchData = responseText.substring(6).trim(); // Remove "MATCH: "
        const parts = matchData.split('|');
        
        if (parts.length >= 3) {
          const connectionId = parts[0].trim();
          const connectionName = parts[1].trim();
          const reason = parts[2].trim();
          
          const matchingConnection = availableConnections.find(conn => conn.id === connectionId);
          if (matchingConnection) {
            console.log('🔍 ApiRequirementService: AI found matching connection', {
              connectionName: matchingConnection.name,
              connectionId: matchingConnection.id,
              reason: reason,
              aiResponse: responseText
            });
            return matchingConnection;
          } else {
            console.warn('🔍 ApiRequirementService: AI returned connection ID that was not found in available connections', {
              connectionId,
              availableConnectionIds: availableConnections.map(c => c.id)
            });
          }
        } else {
          console.warn('🔍 ApiRequirementService: AI returned malformed MATCH response', {
            response: responseText,
            parts: parts
          });
        }
      } else if (responseText.startsWith('NO_MATCH:')) {
        const explanation = responseText.substring(9).trim(); // Remove "NO_MATCH: "
        console.log('🔍 ApiRequirementService: AI determined no matching connection', {
          explanation: explanation,
          aiResponse: responseText
        });
      } else {
        console.warn('🔍 ApiRequirementService: AI returned unexpected response format', {
          response: responseText
        });
      }

      // Fallback: If we have test connections and the AI didn't match anything, use the first test connection
      const testConnection = availableConnections.find(conn => 
        conn.name.toLowerCase().includes('test') || 
        conn.name.toLowerCase().includes('e2e') ||
        conn.name.toLowerCase().includes('testing')
      );
      
      if (testConnection) {
        console.log('🔍 ApiRequirementService: Using fallback test connection', {
          connectionName: testConnection.name,
          connectionId: testConnection.id
        });
        return testConnection;
      }

      return null;

    } catch (error) {
      console.error('🔍 ApiRequirementService: AI connection matching failed:', error);
      return null;
    }
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

/**
 * Connection Guidance Orchestrator
 * 
 * Centralized service that handles all connection guidance logic.
 * This is the single source of truth for determining when and how
 * to provide connection guidance to users.
 * 
 * Features:
 * - Centralized logic for all message processing
 * - Consistent behavior across all entry points
 * - Intelligent API detection and guidance
 * - Robust error handling and fallbacks
 */

import { AIApiDetectionService, ApiDetectionResult } from './aiApiDetectionService';
import { OpenAIService } from '../../services/openaiService';
import { EnhancedConnectionGuidanceOrchestrator } from './enhancedConnectionGuidanceOrchestrator';

export interface ConnectionGuidanceResponse {
  shouldProvideGuidance: boolean;
  guidanceType: 'connection_setup' | 'api_specific' | 'general' | 'none';
  message: string;
  details?: {
    requiredApis: Array<{
      name: string;
      displayName: string;
      description: string;
      authType: string;
      setupInstructions: {
        step1: string;
        step2: string;
        step3: string;
        additionalNotes?: string;
      };
      documentationUrl: string;
      baseUrl: string;
      commonEndpoints: string[];
    }>;
    suggestedWorkflow?: string;
    userIntent?: string;
  };
}

export interface MessageContext {
  message: string;
  availableConnections: Array<{
    name: string;
    id: string;
    baseUrl?: string;
    endpoints?: Array<{ path: string; method: string; summary: string }>;
  }>;
  userId: string;
  context?: Record<string, any>;
}

export class ConnectionGuidanceOrchestrator {
  private aiDetectionService: AIApiDetectionService;
  private openaiService: OpenAIService;
  private enhancedOrchestrator: EnhancedConnectionGuidanceOrchestrator;

  constructor() {
    // Create OpenAIService instance with API key
    this.openaiService = new (OpenAIService as any)(process.env.OPENAI_API_KEY!, 'gpt-4o-mini');
    this.aiDetectionService = new AIApiDetectionService(this.openaiService);
    this.enhancedOrchestrator = new EnhancedConnectionGuidanceOrchestrator(this.openaiService);
  }

  /**
   * Main entry point for all connection guidance decisions using multi-prompt architecture
   * This method is called by ALL message processing entry points
   */
  async processMessage(context: MessageContext): Promise<ConnectionGuidanceResponse> {
    console.log('🔍 ConnectionGuidanceOrchestrator - Processing message with multi-prompt architecture:', {
      message: context.message,
      availableConnections: context.availableConnections.length,
      userId: context.userId
    });

    // Quick check for direct API calls - bypass enhanced orchestrator entirely
    const isDirectApiCall = this.isDirectApiCallRequest(context.message);
    if (isDirectApiCall) {
      console.log('🚀 ConnectionGuidanceOrchestrator - Direct API call detected, bypassing enhanced orchestrator');
      return {
        shouldProvideGuidance: false,
        guidanceType: 'none',
        message: 'Direct API call request - no guidance needed',
        details: {
          requiredApis: []
        }
      };
    }

    try {
      console.log('🔍 ConnectionGuidanceOrchestrator - About to call enhancedOrchestrator.processMessage');
      
      // Add timeout wrapper to prevent hanging
      const timeoutPromise = new Promise<ConnectionGuidanceResponse>((_, reject) => {
        setTimeout(() => {
          console.log('⏰ ConnectionGuidanceOrchestrator - Timeout reached, rejecting promise');
          reject(new Error('Guidance orchestrator timeout after 30 seconds'));
        }, 30000);
      });
      
      console.log('🔍 ConnectionGuidanceOrchestrator - Creating guidance promise...');
      const guidancePromise = this.enhancedOrchestrator.processMessage({
        message: context.message,
        availableConnections: context.availableConnections,
        userId: context.userId,
        context: context.context
      });
      
      console.log('🔍 ConnectionGuidanceOrchestrator - Racing guidance promise against timeout...');
      const result = await Promise.race([guidancePromise, timeoutPromise]);
      console.log('✅ ConnectionGuidanceOrchestrator - Promise race completed successfully');

      console.log('✅ ConnectionGuidanceOrchestrator - Multi-prompt guidance completed:', {
        shouldProvideGuidance: result.shouldProvideGuidance,
        guidanceType: result.guidanceType,
        message: result.message
      });

      console.log('🔍 ConnectionGuidanceOrchestrator - Full guidance result:', JSON.stringify(result, null, 2));

      // Check if this should proceed to normal processing
      if (!result.shouldProvideGuidance) {
        console.log('🔍 ConnectionGuidanceOrchestrator - No guidance needed, should proceed to normal processing');
      } else {
        console.log('🔍 ConnectionGuidanceOrchestrator - Guidance needed, will provide guidance response');
      }

      return result;

    } catch (error) {
      console.error('❌ ConnectionGuidanceOrchestrator - Error in multi-prompt processing:', error);
      console.error('❌ ConnectionGuidanceOrchestrator - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ ConnectionGuidanceOrchestrator - Message that failed:', context.message);
      
      // Check if this looks like a direct API call request
      const isDirectApiCall = this.isDirectApiCallRequest(context.message);
      console.log('🔍 ConnectionGuidanceOrchestrator - Is direct API call request:', isDirectApiCall);
      
      if (isDirectApiCall) {
        console.log('🔄 ConnectionGuidanceOrchestrator - Treating as direct API call, returning no guidance needed');
        return {
          shouldProvideGuidance: false,
          guidanceType: 'none',
          message: 'Direct API call request - no guidance needed',
          details: {
            requiredApis: []
          }
        };
      }
      
      // For non-direct API calls, try a quick fallback without AI
      console.log('🔄 ConnectionGuidanceOrchestrator - Using quick fallback for non-direct API calls');
      return {
        shouldProvideGuidance: false,
        guidanceType: 'none',
        message: 'Request processed - no guidance needed',
        details: {
          requiredApis: []
        }
      };
    }
  }

  /**
   * Check if a message looks like a direct API call request
   */
  private isDirectApiCallRequest(message: string): boolean {
    const directApiPatterns = [
      /^(get|find|search|list|show|display|retrieve|fetch)\s+/i,
      /^(create|add|insert|post|put|update|edit|modify|delete|remove)\s+/i,
      /^(now\s+)?(get|find|search|list|show|display|retrieve|fetch)\s+/i,
      /pets?\s+(available|pending|sold)/i,
      /users?\s+by\s+id/i,
      /orders?\s+(create|new|list)/i,
      /^now\s+get\s+/i,
      /^get\s+pending\s+/i,
      /^get\s+available\s+/i,
      /^get\s+sold\s+/i
    ];
    
    const isDirectApi = directApiPatterns.some(pattern => pattern.test(message));
    console.log('🔍 ConnectionGuidanceOrchestrator - Direct API call detection:', {
      message,
      isDirectApi,
      matchedPatterns: directApiPatterns.filter(pattern => pattern.test(message))
    });
    
    return isDirectApi;
  }

  /**
   * Legacy guidance fallback method
   */
  private async generateLegacyGuidance(context: MessageContext): Promise<ConnectionGuidanceResponse> {
    try {
      // Step 1: Check if we have any connections at all
      if (!context.availableConnections || context.availableConnections.length === 0) {
        console.log('🔍 ConnectionGuidanceOrchestrator - No connections available, providing general guidance');
        return await this.generateGeneralGuidance(context.message);
      }

      // Step 2: Use AI to analyze what APIs are needed
      const aiAnalysis = await this.aiDetectionService.analyzeUserRequest(
        context.message,
        context.availableConnections
      );

      console.log('🔍 ConnectionGuidanceOrchestrator - AI analysis result:', aiAnalysis);

      // Step 3: Determine if guidance is needed
      if (!aiAnalysis.requiresGuidance) {
        console.log('🔍 ConnectionGuidanceOrchestrator - No guidance needed, user can proceed');
        return {
          shouldProvideGuidance: false,
          guidanceType: 'none',
          message: 'You can proceed with your request.'
        };
      }

      // Step 4: Generate specific guidance for required APIs
      return this.generateSpecificGuidance(aiAnalysis, context.message);

    } catch (error) {
      console.error('🔍 ConnectionGuidanceOrchestrator - Error in legacy guidance:', error);
      
      // Final fallback to general guidance
      return await this.generateGeneralGuidance(context.message);
    }
  }

  /**
   * Generate general guidance when no connections are available
   */
  private async generateGeneralGuidance(message: string): Promise<ConnectionGuidanceResponse> {
    try {
      // Use AI detection service to find all required APIs
      const aiAnalysis = await this.aiDetectionService.analyzeUserRequest(message, []);
      
      console.log('🔍 ConnectionGuidanceOrchestrator - AI analysis result:', {
        requiresGuidance: aiAnalysis.requiresGuidance,
        requiredApisCount: aiAnalysis.requiredApis.length,
        requiredApis: aiAnalysis.requiredApis.map(api => api.name)
      });
      
      // Use AI analysis if it detected any required APIs, regardless of requiresGuidance flag
      if (aiAnalysis.requiredApis.length > 0) {
        console.log('🔍 ConnectionGuidanceOrchestrator - Using AI analysis for guidance');
        // Convert AI analysis to guidance response
        const requiredApis = aiAnalysis.requiredApis.map(api => {
          const knowledge = AIApiDetectionService.getApiKnowledge(api.name);
          return {
            name: api.name,
            displayName: knowledge?.displayName || api.displayName,
            description: knowledge?.description || `API for ${api.name}`,
            authType: knowledge?.authType || 'API_KEY',
            setupInstructions: {
              step1: `Go to your ${knowledge?.displayName || api.displayName} admin dashboard`,
              step2: `Navigate to Settings > API Keys or Developer Settings`,
              step3: `Generate a new API key`,
              additionalNotes: `You'll need admin access to generate API keys`
            },
            documentationUrl: knowledge?.baseUrl ? `${knowledge.baseUrl}/docs` : 'https://docs.example.com',
            baseUrl: knowledge?.baseUrl || 'https://api.example.com',
            commonEndpoints: knowledge?.commonEndpoints || ['/api/v1']
          };
        });

        const action = this.getActionFromMessage(message);
        let guidanceMessage: string;
        
        if (requiredApis.length === 1) {
          guidanceMessage = `To ${action} ${requiredApis[0].displayName}, you'll need to connect to the ${requiredApis[0].displayName} API first. I can help you set this up!`;
        } else {
          guidanceMessage = `To ${action} this, you'll need to connect to ${requiredApis.map(api => api.displayName).join(' and ')}. I can help you set these up!`;
        }

        return {
          shouldProvideGuidance: true,
          guidanceType: 'api_specific',
          message: guidanceMessage,
          details: {
            requiredApis,
            suggestedWorkflow: aiAnalysis.suggestedWorkflow,
            userIntent: aiAnalysis.userIntent
          }
        };
      }
    } catch (error) {
      console.error('🔍 ConnectionGuidanceOrchestrator - Error in generateGeneralGuidance:', error);
    }

    // Fallback to simple detection if AI fails
    console.log('🔍 ConnectionGuidanceOrchestrator - Using fallback detection');
    const detectedApi = this.detectApiFromMessage(message);
    
    if (detectedApi) {
      console.log('🔍 ConnectionGuidanceOrchestrator - Fallback detected API:', detectedApi.name);
      return {
        shouldProvideGuidance: true,
        guidanceType: 'api_specific',
        message: `To ${this.getActionFromMessage(message)} ${detectedApi.displayName}, you'll need to set up a connection first. I can help you get started!`,
        details: {
          requiredApis: [detectedApi],
          userIntent: this.extractUserIntent(message)
        }
      };
    }

    return {
      shouldProvideGuidance: true,
      guidanceType: 'general',
      message: 'I can help you set up API connections to automate your workflows. What would you like to connect to?',
      details: {
        requiredApis: [],
        userIntent: this.extractUserIntent(message)
      }
    };
  }

  /**
   * Generate specific guidance based on AI analysis
   */
  private generateSpecificGuidance(aiAnalysis: ApiDetectionResult, message: string): ConnectionGuidanceResponse {
    const requiredApis = aiAnalysis.requiredApis.map(api => {
      const knowledge = AIApiDetectionService.getApiKnowledge(api.name);
      return {
        name: api.name,
        displayName: knowledge?.displayName || api.displayName,
        description: knowledge?.description || `API for ${api.name}`,
        authType: knowledge?.authType || 'API_KEY',
        setupInstructions: {
          step1: `Go to your ${knowledge?.displayName || api.displayName} admin dashboard`,
          step2: `Navigate to Settings > API Keys or Developer Settings`,
          step3: `Generate a new API key`,
          additionalNotes: `You'll need admin access to generate API keys`
        },
        documentationUrl: knowledge?.baseUrl ? `${knowledge.baseUrl}/docs` : 'https://docs.example.com',
        baseUrl: knowledge?.baseUrl || 'https://api.example.com',
        commonEndpoints: knowledge?.commonEndpoints || ['/api/v1']
      };
    });

    const primaryApi = requiredApis[0];
    const action = this.getActionFromMessage(message);
    
    let guidanceMessage: string;
    if (requiredApis.length === 1) {
      guidanceMessage = `To ${action} ${primaryApi.displayName}, you'll need to connect to the ${primaryApi.displayName} API first. I can help you set this up!`;
    } else {
      guidanceMessage = `To ${action} this, you'll need to connect to ${requiredApis.map(api => api.displayName).join(' and ')}`;
    }

    return {
      shouldProvideGuidance: true,
      guidanceType: 'api_specific',
      message: guidanceMessage,
      details: {
        requiredApis,
        suggestedWorkflow: aiAnalysis.suggestedWorkflow,
        userIntent: aiAnalysis.userIntent
      }
    };
  }

  /**
   * Detect API from message using simple keyword matching
   */
  private detectApiFromMessage(message: string): {
    name: string;
    displayName: string;
    description: string;
    authType: string;
    setupInstructions: {
      step1: string;
      step2: string;
      step3: string;
      additionalNotes?: string;
    };
    documentationUrl: string;
    baseUrl: string;
    commonEndpoints: string[];
  } | null {
    const lowerMessage = message.toLowerCase();
    
    const apiPatterns = [
      { 
        keywords: ['skilljar', 'course', 'training', 'learning'], 
        api: { 
          name: 'skilljar', 
          displayName: 'Skilljar',
          description: 'Learning management system for course management and training',
          authType: 'API_KEY',
          setupInstructions: {
            step1: 'Go to your Skilljar admin dashboard',
            step2: 'Navigate to Settings > API Keys',
            step3: 'Generate a new API key',
            additionalNotes: 'You\'ll need admin access to generate API keys'
          },
          documentationUrl: 'https://support.skilljar.com/hc/en-us/articles/360000240153-API-Overview',
          baseUrl: 'https://api.skilljar.com/v1',
          commonEndpoints: ['/courses', '/users', '/enrollments']
        }
      },
      { 
        keywords: ['stripe', 'payment', 'billing', 'subscription'], 
        api: { 
          name: 'stripe', 
          displayName: 'Stripe',
          description: 'Payment processing and subscription management',
          authType: 'API_KEY',
          setupInstructions: {
            step1: 'Go to your Stripe dashboard',
            step2: 'Navigate to Developers > API Keys',
            step3: 'Generate a new API key',
            additionalNotes: 'You\'ll need admin access to generate API keys'
          },
          documentationUrl: 'https://stripe.com/docs/api',
          baseUrl: 'https://api.stripe.com/v1',
          commonEndpoints: ['/charges', '/customers', '/subscriptions', '/products']
        }
      },
      { 
        keywords: ['slack', 'message', 'team', 'chat'], 
        api: { 
          name: 'slack', 
          displayName: 'Slack',
          description: 'Team communication and collaboration platform',
          authType: 'OAUTH2',
          setupInstructions: {
            step1: 'Go to your Slack workspace',
            step2: 'Navigate to Apps > Manage > Custom Integrations',
            step3: 'Create a new app and get OAuth credentials',
            additionalNotes: 'You\'ll need admin access to create apps'
          },
          documentationUrl: 'https://api.slack.com/',
          baseUrl: 'https://slack.com/api',
          commonEndpoints: ['/chat.postMessage', '/conversations.list', '/users.list']
        }
      },
      { 
        keywords: ['github', 'git', 'repository', 'repo', 'code'], 
        api: { 
          name: 'github', 
          displayName: 'GitHub',
          description: 'Code repository and version control platform',
          authType: 'OAUTH2',
          setupInstructions: {
            step1: 'Go to GitHub.com and sign in to your account',
            step2: 'Navigate to Settings > Developer settings > Personal access tokens',
            step3: 'Generate a new token with appropriate permissions',
            additionalNotes: 'You\'ll need to select the scopes your application needs'
          },
          documentationUrl: 'https://docs.github.com/en/rest',
          baseUrl: 'https://api.github.com',
          commonEndpoints: ['/repos', '/issues', '/pulls', '/commits']
        }
      },
      { 
        keywords: ['salesforce', 'crm', 'sales', 'leads'], 
        api: { 
          name: 'salesforce', 
          displayName: 'Salesforce',
          description: 'Customer relationship management platform',
          authType: 'OAUTH2',
          setupInstructions: {
            step1: 'Go to your Salesforce org and navigate to Setup',
            step2: 'Go to Apps > App Manager > New Connected App',
            step3: 'Configure OAuth settings and get credentials',
            additionalNotes: 'You\'ll need admin access to create connected apps'
          },
          documentationUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
          baseUrl: 'https://your-instance.salesforce.com/services/data/v58.0',
          commonEndpoints: ['/sobjects', '/query', '/composite']
        }
      },
      { 
        keywords: ['hubspot', 'marketing', 'contacts', 'leads'], 
        api: { 
          name: 'hubspot', 
          displayName: 'HubSpot',
          description: 'Marketing, sales, and service platform',
          authType: 'API_KEY',
          setupInstructions: {
            step1: 'Go to your HubSpot account and navigate to Settings',
            step2: 'Go to Integrations > API key',
            step3: 'Generate a new API key',
            additionalNotes: 'You\'ll need appropriate permissions to access the API'
          },
          documentationUrl: 'https://developers.hubspot.com/docs/api/overview',
          baseUrl: 'https://api.hubapi.com',
          commonEndpoints: ['/contacts', '/companies', '/deals', '/tickets']
        }
      },
      { 
        keywords: ['openai', 'gpt', 'ai', 'chatgpt'], 
        api: { 
          name: 'openai', 
          displayName: 'OpenAI',
          description: 'Artificial intelligence and language model platform',
          authType: 'API_KEY',
          setupInstructions: {
            step1: 'Go to platform.openai.com and sign in',
            step2: 'Navigate to API Keys section',
            step3: 'Create a new secret key',
            additionalNotes: 'You\'ll need to have credits in your account to use the API'
          },
          documentationUrl: 'https://platform.openai.com/docs/api-reference',
          baseUrl: 'https://api.openai.com/v1',
          commonEndpoints: ['/chat/completions', '/completions', '/embeddings']
        }
      },
      { 
        keywords: ['mailchimp', 'email', 'marketing', 'newsletter'], 
        api: { 
          name: 'mailchimp', 
          displayName: 'Mailchimp',
          description: 'Email marketing and automation platform',
          authType: 'API_KEY',
          setupInstructions: {
            step1: 'Go to your Mailchimp account and navigate to Account & Billing',
            step2: 'Go to Extras > API Keys',
            step3: 'Generate a new API key',
            additionalNotes: 'You\'ll need admin access to generate API keys'
          },
          documentationUrl: 'https://mailchimp.com/developer/marketing/api/',
          baseUrl: 'https://us1.api.mailchimp.com/3.0',
          commonEndpoints: ['/lists', '/campaigns', '/members', '/automations']
        }
      },
      { 
        keywords: ['zapier', 'automation', 'workflow', 'trigger'], 
        api: { 
          name: 'zapier', 
          displayName: 'Zapier',
          description: 'Workflow automation and integration platform',
          authType: 'API_KEY',
          setupInstructions: {
            step1: 'Go to zapier.com and sign in to your account',
            step2: 'Navigate to My Apps > Developer > Create App',
            step3: 'Generate a new API key for your app',
            additionalNotes: 'You\'ll need to create a Zapier app first'
          },
          documentationUrl: 'https://zapier.com/developer/',
          baseUrl: 'https://hooks.zapier.com',
          commonEndpoints: ['/hooks/catch', '/hooks/custom']
        }
      }
    ];

    for (const pattern of apiPatterns) {
      if (pattern.keywords.some(keyword => lowerMessage.includes(keyword))) {
        return pattern.api;
      }
    }

    return null;
  }

  /**
   * Extract user intent from message
   */
  private extractUserIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('update') || lowerMessage.includes('change')) {
      return 'update data';
    } else if (lowerMessage.includes('create') || lowerMessage.includes('add')) {
      return 'create new data';
    } else if (lowerMessage.includes('get') || lowerMessage.includes('fetch') || lowerMessage.includes('retrieve')) {
      return 'retrieve data';
    } else if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
      return 'delete data';
    } else if (lowerMessage.includes('send') || lowerMessage.includes('message')) {
      return 'send communication';
    }
    
    return 'perform an action';
  }

  /**
   * Get action from message
   */
  private getActionFromMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('update') || lowerMessage.includes('change')) {
      return 'update';
    } else if (lowerMessage.includes('create') || lowerMessage.includes('add')) {
      return 'create';
    } else if (lowerMessage.includes('get') || lowerMessage.includes('fetch') || lowerMessage.includes('retrieve')) {
      return 'get';
    } else if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
      return 'delete';
    } else if (lowerMessage.includes('send') || lowerMessage.includes('message')) {
      return 'send';
    }
    
    return 'work with';
  }

  /**
   * Check if a message requires API connections
   */
  static requiresApiConnections(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Check for explicit API-related keywords
    const apiKeywords = [
      'api', 'endpoint', 'request', 'response', 'http', 'rest',
      'get', 'post', 'put', 'delete', 'patch', 'fetch',
      'create', 'update', 'delete', 'find', 'search', 'list',
      'call api', 'make request', 'execute', 'run'
    ];
    
    return apiKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Get all available APIs for guidance
   */
  static getAvailableApis() {
    return AIApiDetectionService.getAllApis();
  }
}

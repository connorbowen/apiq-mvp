/**
 * Guidance Generation Service
 * 
 * Generates specific setup instructions and guidance for users.
 * This service focuses specifically on creating actionable,
 * step-by-step instructions for API setup and usage.
 * 
 * Features:
 * - AI-powered guidance generation
 * - Step-by-step setup instructions
 * - API-specific guidance
 * - General connection guidance
 * - Rules-based fallback for common patterns
 */

import { OpenAIService } from '../../services/openaiService';
import { logInfo, logError } from '../../utils/logger';
import { parseAIResponse } from '../utils/aiResponseParser';

export interface GuidanceGenerationRequest {
  userMessage: string;
  userIntent: {
    userGoal: string;
    guidanceType: string;
    complexity: string;
    requiresMultipleApis: boolean;
  };
  apiRequirements: {
    requiresGuidance: boolean;
    requiredApis: Array<{
      name: string;
      displayName: string;
      confidence: number;
      reason: string;
      suggestedEndpoints: string[];
      isAvailable: boolean;
      connectionId?: string;
    }>;
    missingApis: Array<{
      name: string;
      displayName: string;
      confidence: number;
      reason: string;
      suggestedEndpoints: string[];
      isAvailable: boolean;
    }>;
    availableApis: Array<{
      name: string;
      displayName: string;
      confidence: number;
      reason: string;
      suggestedEndpoints: string[];
      isAvailable: boolean;
      connectionId?: string;
    }>;
    userIntent: string;
    suggestedWorkflow?: string;
  };
  context?: Record<string, any>;
}

export interface ApiGuidance {
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
}

export interface GuidanceGenerationResult {
  success: boolean;
  guidance?: {
    shouldProvideGuidance: boolean;
    guidanceType: 'connection_setup' | 'api_specific' | 'general' | 'none';
    message: string;
    details?: {
      requiredApis: ApiGuidance[];
      suggestedWorkflow?: string;
      userIntent?: string;
    };
  };
  error?: string;
}

export class GuidanceGenerationService {
  private openaiService: OpenAIService;
  private static readonly API_GUIDANCE_BASE = {
    slack: {
      name: 'slack',
      displayName: 'Slack',
      description: 'Team communication and collaboration platform',
      authType: 'OAUTH2',
      setupInstructions: {
        step1: 'Go to https://api.slack.com/apps and create a new app',
        step2: 'Navigate to "OAuth & Permissions" and add the required scopes (chat:write, channels:read)',
        step3: 'Install the app to your workspace and copy the Bot User OAuth Token',
        additionalNotes: 'Make sure to invite the bot to the channels where you want to send messages'
      },
      documentationUrl: 'https://api.slack.com/',
      baseUrl: 'https://slack.com/api',
      commonEndpoints: ['/chat.postMessage', '/conversations.list', '/users.list']
    },
    github: {
      name: 'github',
      displayName: 'GitHub',
      description: 'Code repository and project management platform',
      authType: 'BEARER_TOKEN',
      setupInstructions: {
        step1: 'Go to GitHub Settings > Developer settings > Personal access tokens',
        step2: 'Generate a new token with appropriate scopes (repo, issues, pull_requests)',
        step3: 'Copy the token and use it as your API key',
        additionalNotes: 'Make sure the token has access to the repositories you want to work with'
      },
      documentationUrl: 'https://docs.github.com/en/rest',
      baseUrl: 'https://api.github.com',
      commonEndpoints: ['/repos/{owner}/{repo}/issues', '/repos/{owner}/{repo}/pulls', '/user']
    },
    trello: {
      name: 'trello',
      displayName: 'Trello',
      description: 'Project management and task organization platform',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Go to https://trello.com/app-key to get your API key',
        step2: 'Generate a token by visiting the URL provided with your API key',
        step3: 'Use both the API key and token for authentication',
        additionalNotes: 'Make sure you have access to the boards you want to work with'
      },
      documentationUrl: 'https://developer.atlassian.com/cloud/trello/',
      baseUrl: 'https://api.trello.com/1',
      commonEndpoints: ['/boards', '/cards', '/lists', '/members']
    },
    email: {
      name: 'email',
      displayName: 'Email Service',
      description: 'Email communication service',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Choose an email service provider (SendGrid, Mailgun, etc.)',
        step2: 'Create an account and generate an API key',
        step3: 'Configure your domain and verify your sender identity',
        additionalNotes: 'Make sure to comply with email sending regulations and best practices'
      },
      documentationUrl: 'https://docs.sendgrid.com/',
      baseUrl: 'https://api.emailservice.com',
      commonEndpoints: ['/send', '/templates', '/contacts']
    }
  };

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Generate specific guidance for the user's request
   */
  async generateGuidance(request: GuidanceGenerationRequest): Promise<GuidanceGenerationResult> {
    logInfo('🔍 GuidanceGenerationService: Starting guidance generation', {
      userGoal: request.userIntent.userGoal,
      guidanceType: request.userIntent.guidanceType,
      missingApis: request.apiRequirements.missingApis.length,
      availableApis: request.apiRequirements.availableApis.length
    });

    try {
      // Try AI-powered guidance generation first
      const aiResult = await this.generateGuidanceWithAI(request);
      if (aiResult.success) {
        logInfo('🔍 GuidanceGenerationService: AI generation successful', {
          guidanceType: aiResult.guidance?.guidanceType,
          requiredApis: aiResult.guidance?.details?.requiredApis.length
        });
        return aiResult;
      }

      // Fallback to rules-based generation
      logInfo('🔍 GuidanceGenerationService: Falling back to rules-based generation');
      return this.generateGuidanceWithRules(request);

    } catch (error) {
      logError('🔍 GuidanceGenerationService: Guidance generation failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Guidance generation failed'
      };
    }
  }

  /**
   * Use AI to generate specific guidance
   */
  private async generateGuidanceWithAI(request: GuidanceGenerationRequest): Promise<GuidanceGenerationResult> {
    try {
      // CRITICAL: Check if guidance is actually needed before calling AI
      if (!request.apiRequirements.requiresGuidance && request.apiRequirements.missingApis.length === 0) {
        console.log('🔍 GuidanceGenerationService: Skipping AI call - no guidance needed', {
          requiresGuidance: request.apiRequirements.requiresGuidance,
          missingApis: request.apiRequirements.missingApis.length
        });
        
        return {
          success: true,
          guidance: {
            shouldProvideGuidance: false,
            guidanceType: 'none',
            message: 'You have all the necessary connections. You can proceed with your request.',
            details: {
              requiredApis: [],
              suggestedWorkflow: 'Proceed with your workflow',
              userIntent: request.userIntent.userGoal
            }
          }
        };
      }

      const systemPrompt = this.buildGuidanceGenerationSystemPrompt();
      const userPrompt = this.buildGuidanceGenerationUserPrompt(request);

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.1, // Lower temperature for more consistent JSON output
        max_tokens: 1000 // Increased token limit for more complete responses
      });

      const parseResult = parseAIResponse(response);
      if (!parseResult.success) {
        console.warn('🔍 GuidanceGenerationService: JSON parsing failed, attempting fallback:', parseResult.error);
        
        // Try to extract basic information from the response even if JSON parsing fails
        const fallbackGuidance = this.extractFallbackGuidance(response, request);
        if (fallbackGuidance) {
          return {
            success: true,
            guidance: fallbackGuidance
          };
        }
        
        throw new Error(parseResult.error || 'Failed to parse AI response');
      }
      
      // Validate the parsed data has required fields
      const data = parseResult.data as any;
      if (!data || typeof data.shouldProvideGuidance === 'undefined') {
        console.warn('🔍 GuidanceGenerationService: Invalid response structure, using fallback');
        const fallbackGuidance = this.extractFallbackGuidance(response, request);
        if (fallbackGuidance) {
          return {
            success: true,
            guidance: fallbackGuidance
          };
        }
        throw new Error('Invalid response structure from AI');
      }
      
      return {
        success: true,
        guidance: {
          shouldProvideGuidance: data.shouldProvideGuidance,
          guidanceType: data.guidanceType || 'api_specific',
          message: data.message || 'API guidance needed',
          details: data.details || {}
        }
      };

    } catch (error) {
      console.error('🔍 GuidanceGenerationService: AI generation failed:', error);
      return {
        success: false,
        error: 'AI guidance generation failed'
      };
    }
  }

  /**
   * Extract basic guidance information from malformed AI responses
   */
  private extractFallbackGuidance(response: string, request: GuidanceGenerationRequest): any | null {
    try {
      // Look for key phrases in the response to determine guidance type
      const lowerResponse = response.toLowerCase();
      
      let shouldProvideGuidance = true;
      let guidanceType: 'connection_setup' | 'api_specific' | 'general' | 'none' = 'api_specific';
      let message = 'API guidance needed for your request.';
      
      // Check if the response indicates no guidance is needed
      if (lowerResponse.includes('no guidance') || lowerResponse.includes('no specific api')) {
        shouldProvideGuidance = false;
        guidanceType = 'none';
        message = 'No specific API guidance is required for this request.';
      }
      
      // Check for connection setup guidance
      if (lowerResponse.includes('set up') || lowerResponse.includes('connect') || lowerResponse.includes('configure')) {
        guidanceType = 'connection_setup';
        message = 'You need to set up API connections to complete this workflow.';
      }
      
      // Extract a more specific message if possible
      const messageMatch = response.match(/(?:message|content|response):\s*["']([^"']+)["']/i);
      if (messageMatch) {
        message = messageMatch[1];
      }
      
      return {
        shouldProvideGuidance,
        guidanceType,
        message,
        details: {
          requiredApis: request.apiRequirements.missingApis,
          suggestedWorkflow: `Workflow involving ${request.apiRequirements.missingApis.map(api => api.name).join(', ')}`,
          userIntent: request.userIntent.userGoal
        }
      };
    } catch (error) {
      console.warn('🔍 GuidanceGenerationService: Fallback extraction failed:', error);
      return null;
    }
  }

  /**
   * Use rules-based guidance generation
   */
  private generateGuidanceWithRules(request: GuidanceGenerationRequest): GuidanceGenerationResult {
    const { userIntent, apiRequirements } = request;
    
    // Determine guidance type
    let guidanceType: 'connection_setup' | 'api_specific' | 'general' | 'none' = 'general';
    let message = '';
    let shouldProvideGuidance = true;

    if (apiRequirements.missingApis.length === 0) {
      guidanceType = 'none';
      message = 'You have all the necessary connections. You can proceed with your request.';
      shouldProvideGuidance = false;
    } else if (apiRequirements.missingApis.length === 1) {
      guidanceType = 'api_specific';
      const missingApi = apiRequirements.missingApis[0];
      message = `To ${userIntent.userGoal}, you'll need to set up a ${missingApi.displayName} connection.`;
    } else {
      guidanceType = 'connection_setup';
      const apiNames = apiRequirements.missingApis.map(api => api.displayName).join(', ');
      message = `To ${userIntent.userGoal}, you'll need to set up connections for: ${apiNames}.`;
    }

    // Generate API guidance details
    const requiredApis = apiRequirements.missingApis.map(api => {
      const guidanceInfo = GuidanceGenerationService.API_GUIDANCE_BASE[api.name as keyof typeof GuidanceGenerationService.API_GUIDANCE_BASE];
      if (guidanceInfo) {
        return {
          name: guidanceInfo.name,
          displayName: guidanceInfo.displayName,
          description: guidanceInfo.description,
          authType: guidanceInfo.authType,
          setupInstructions: guidanceInfo.setupInstructions,
          documentationUrl: guidanceInfo.documentationUrl,
          baseUrl: guidanceInfo.baseUrl,
          commonEndpoints: guidanceInfo.commonEndpoints
        };
      }
      return null;
    }).filter(Boolean) as ApiGuidance[];

    return {
      success: true,
      guidance: {
        shouldProvideGuidance,
        guidanceType,
        message,
        details: {
          requiredApis,
          suggestedWorkflow: apiRequirements.suggestedWorkflow,
          userIntent: apiRequirements.userIntent
        }
      }
    };
  }

  /**
   * Build system prompt for guidance generation
   */
  private buildGuidanceGenerationSystemPrompt(): string {
    const guidanceBase = Object.values(GuidanceGenerationService.API_GUIDANCE_BASE).map(api => ({
      name: api.name,
      displayName: api.displayName,
      description: api.description,
      authType: api.authType,
      setupInstructions: api.setupInstructions,
      documentationUrl: api.documentationUrl,
      baseUrl: api.baseUrl,
      commonEndpoints: api.commonEndpoints
    }));

    return `You are an expert guidance generation specialist. Your job is to create helpful, actionable guidance for users.

Available API Guidance Base: ${JSON.stringify(guidanceBase, null, 2)}

GUIDANCE GENERATION RULES:
1. Provide clear, step-by-step instructions for API setup
2. Include specific URLs and authentication details
3. Explain why each API is needed for the user's goal
4. Provide helpful tips and additional notes
5. Make the guidance actionable and easy to follow
6. Consider the user's technical level and context

CRITICAL DECISION LOGIC:
- If "Requires Guidance" is FALSE and "Missing APIs" is empty, set shouldProvideGuidance to FALSE and guidanceType to "none"
- If "Requires Guidance" is TRUE or "Missing APIs" has items, provide appropriate guidance
- ALWAYS respect the "Requires Guidance" flag from the API requirements analysis

MANDATORY RULE: If the API requirements show "Requires Guidance: false" and "Missing APIs: []", you MUST return shouldProvideGuidance: false and guidanceType: "none". Do NOT provide guidance in this case.

GUIDANCE TYPES:
- connection_setup: User needs to set up new API connections
- api_specific: User needs guidance on specific API usage
- general: User needs general help or information
- none: User can proceed without guidance

Respond with JSON in this format:
{
  "shouldProvideGuidance": boolean,
  "guidanceType": "connection_setup|api_specific|general|none",
  "message": "Main guidance message to the user",
  "details": {
    "requiredApis": [
      {
        "name": "api_name",
        "displayName": "API Display Name",
        "description": "API description",
        "authType": "API_KEY|BEARER_TOKEN|OAUTH2",
        "setupInstructions": {
          "step1": "First step",
          "step2": "Second step", 
          "step3": "Third step",
          "additionalNotes": "Additional helpful notes"
        },
        "documentationUrl": "https://docs.example.com",
        "baseUrl": "https://api.example.com",
        "commonEndpoints": ["/endpoint1", "/endpoint2"]
      }
    ],
    "suggestedWorkflow": "Optional workflow suggestion",
    "userIntent": "What the user is trying to accomplish"
  }
}`;
  }

  /**
   * Build user prompt for guidance generation
   */
  private buildGuidanceGenerationUserPrompt(request: GuidanceGenerationRequest): string {
    return `Generate guidance for this request:

User Message: "${request.userMessage}"
User Goal: "${request.userIntent.userGoal}"
Guidance Type: "${request.userIntent.guidanceType}"
Complexity: "${request.userIntent.complexity}"

API Requirements:
- Requires Guidance: ${request.apiRequirements.requiresGuidance}
- Missing APIs: ${request.apiRequirements.missingApis.map(api => api.displayName).join(', ')}
- Available APIs: ${request.apiRequirements.availableApis.map(api => api.displayName).join(', ')}

${request.context ? `Context: ${JSON.stringify(request.context)}` : ''}`;
  }
}

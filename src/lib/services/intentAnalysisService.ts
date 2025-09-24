/**
 * Intent Analysis Service
 * 
 * Analyzes user intent to understand what they want to accomplish.
 * This service focuses specifically on understanding the user's goals
 * and determining the type of guidance they need.
 * 
 * Features:
 * - AI-powered intent analysis
 * - User goal identification
 * - Guidance type classification
 * - Rules-based fallback for common patterns
 * - Confidence scoring for intent detection
 */

import { OpenAIService } from '../../services/openaiService';
import { logInfo, logError } from '../../utils/logger';
import { parseAIResponse } from '../utils/aiResponseParser';

export interface IntentAnalysisRequest {
  userMessage: string;
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

export interface IntentAnalysisResult {
  success: boolean;
  intent?: {
    userGoal: string;
    guidanceType: 'connection_setup' | 'api_specific' | 'general' | 'none';
    complexity: 'simple' | 'medium' | 'complex';
    requiresMultipleApis: boolean;
    confidence: number;
  };
  error?: string;
}

export class IntentAnalysisService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Analyze user intent to understand their goals
   */
  async analyzeIntent(request: IntentAnalysisRequest): Promise<IntentAnalysisResult> {
    logInfo('🔍 IntentAnalysisService: Starting intent analysis', {
      userMessage: request.userMessage,
      connectionsCount: request.availableConnections.length
    });

    try {
      // Try AI-powered intent analysis first
      const aiResult = await this.analyzeIntentWithAI(request);
      if (aiResult.success) {
        logInfo('🔍 IntentAnalysisService: AI analysis successful', {
          userGoal: aiResult.intent?.userGoal,
          guidanceType: aiResult.intent?.guidanceType,
          confidence: aiResult.intent?.confidence
        });
        return aiResult;
      }

      // Fallback to rules-based analysis
      logInfo('🔍 IntentAnalysisService: Falling back to rules-based analysis');
      return this.analyzeIntentWithRules(request);

    } catch (error) {
      logError('🔍 IntentAnalysisService: Intent analysis failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Intent analysis failed'
      };
    }
  }

  /**
   * Use AI to analyze user intent
   */
  private async analyzeIntentWithAI(request: IntentAnalysisRequest): Promise<IntentAnalysisResult> {
    try {
      const systemPrompt = this.buildIntentAnalysisSystemPrompt(request.availableConnections);
      const userPrompt = this.buildIntentAnalysisUserPrompt(request);

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 400
      });

      const parseResult = parseAIResponse(response);
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse AI response');
      }
      
      return {
        success: true,
        intent: {
          userGoal: (parseResult.data as any).userGoal,
          guidanceType: (parseResult.data as any).guidanceType,
          complexity: (parseResult.data as any).complexity,
          requiresMultipleApis: (parseResult.data as any).requiresMultipleApis,
          confidence: (parseResult.data as any).confidence
        }
      };

    } catch (error) {
      console.error('🔍 IntentAnalysisService: AI analysis failed:', error);
      return {
        success: false,
        error: 'AI intent analysis failed'
      };
    }
  }

  /**
   * Use rules-based intent analysis for common patterns
   */
  private analyzeIntentWithRules(request: IntentAnalysisRequest): IntentAnalysisResult {
    const message = request.userMessage.toLowerCase();
    
    // Analyze user goal
    let userGoal = 'General assistance';
    let guidanceType: 'connection_setup' | 'api_specific' | 'general' | 'none' = 'general';
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    let requiresMultipleApis = false;

    // Detect specific goals
    if (message.includes('send') && message.includes('message')) {
      userGoal = 'Send messages to team';
      guidanceType = 'api_specific';
    } else if (message.includes('create') && message.includes('workflow')) {
      userGoal = 'Create automated workflow';
      guidanceType = 'connection_setup';
      complexity = 'medium';
    } else if (message.includes('monitor') || message.includes('track')) {
      userGoal = 'Monitor events or data';
      guidanceType = 'api_specific';
    } else if (message.includes('integrate') || message.includes('connect')) {
      userGoal = 'Integrate multiple services';
      guidanceType = 'connection_setup';
      complexity = 'complex';
      requiresMultipleApis = true;
    } else if (message.includes('get') || message.includes('fetch') || message.includes('retrieve')) {
      userGoal = 'Retrieve data from API';
      guidanceType = 'api_specific';
    } else if (message.includes('update') || message.includes('modify')) {
      userGoal = 'Update or modify data';
      guidanceType = 'api_specific';
    }

    // Check if multiple APIs are mentioned
    const apiKeywords = ['slack', 'github', 'trello', 'email', 'database', 'api'];
    const mentionedApis = apiKeywords.filter(keyword => message.includes(keyword));
    if (mentionedApis.length > 1) {
      requiresMultipleApis = true;
      complexity = 'complex';
    }

    // Determine if guidance is needed
    if (request.availableConnections.length === 0) {
      guidanceType = 'connection_setup';
    } else if (mentionedApis.length > 0) {
      guidanceType = 'api_specific';
    }

    return {
      success: true,
      intent: {
        userGoal,
        guidanceType,
        complexity,
        requiresMultipleApis,
        confidence: 0.7 // Rules-based confidence
      }
    };
  }

  /**
   * Build system prompt for intent analysis
   */
  private buildIntentAnalysisSystemPrompt(availableConnections: IntentAnalysisRequest['availableConnections']): string {
    const connectionInfo = availableConnections.map(conn => 
      `${conn.name} (${conn.id}): ${conn.endpoints?.length || 0} endpoints`
    ).join(', ');

    return `You are an expert intent analysis specialist. Your job is to understand what users want to accomplish and determine the type of guidance they need.

Available Connections: ${connectionInfo}

INTENT ANALYSIS RULES:
1. Understand the user's primary goal and what they're trying to accomplish
2. Determine the type of guidance needed (connection_setup, api_specific, general, none)
3. Assess the complexity of their request (simple, medium, complex)
4. Identify if multiple APIs are required
5. Provide a confidence score for your analysis

GUIDANCE TYPES:
- connection_setup: User needs to set up new API connections
- api_specific: User needs guidance on specific API usage
- general: User needs general help or information
- none: User can proceed without guidance

COMPLEXITY LEVELS:
- simple: Single API, basic operation
- medium: Multiple steps, one API
- complex: Multiple APIs, complex workflow

Respond with JSON in this format:
{
  "userGoal": "What the user is trying to accomplish",
  "guidanceType": "connection_setup|api_specific|general|none",
  "complexity": "simple|medium|complex",
  "requiresMultipleApis": boolean,
  "confidence": 0.0-1.0
}`;
  }

  /**
   * Build user prompt for intent analysis
   */
  private buildIntentAnalysisUserPrompt(request: IntentAnalysisRequest): string {
    let prompt = `Analyze the user's intent and goals:

User Message: "${request.userMessage}"`;

    if (request.context) {
      prompt += `\n\nContext: ${JSON.stringify(request.context)}`;
    }

    return prompt;
  }
}

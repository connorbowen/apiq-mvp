/**
 * Hybrid Message Classification Service
 * 
 * Combines rules-based structure with AI-powered intelligence for message classification.
 * Uses rules for core business logic and AI for context understanding.
 */

import { OpenAIService } from '../../services/openaiService';

export interface MessageClassification {
  type: 'workflow' | 'direct_api_call' | 'connection_guidance' | 'general_chat';
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
  requiresApiConnections: boolean;
}

export class HybridMessageClassificationService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Classify user message using hybrid approach
   */
  async classifyMessage(message: string, context: Record<string, any> = {}, availableConnections: any[] = []): Promise<MessageClassification> {
    // First, apply rules-based filtering for obvious cases
    const rulesResult = this.applyRulesBasedFiltering(message);
    
    // If no connections are available and this would be a direct API call, 
    // classify as connection guidance instead
    if (rulesResult.type === 'direct_api_call' && (!availableConnections || availableConnections.length === 0)) {
      console.log('🔍 Classification: No connections available, changing direct_api_call to connection_guidance');
      return {
        type: 'connection_guidance',
        confidence: 0.9,
        reasoning: 'No API connections available for direct API call',
        suggestedActions: ['Show connection guidance', 'Provide setup instructions'],
        requiresApiConnections: false
      };
    }
    
    if (rulesResult.confidence > 0.9) {
      return rulesResult;
    }

    // For ambiguous cases, use AI for context understanding
    try {
      const aiResult = await this.aiClassifyMessage(message, context);
      
      // Combine rules and AI results
      return this.combineClassificationResults(rulesResult, aiResult);
      
    } catch (error) {
      console.error('AI classification failed, using rules result:', error);
      return rulesResult;
    }
  }

  /**
   * Apply rules-based filtering for obvious cases
   */
  private applyRulesBasedFiltering(message: string): MessageClassification {
    const lowerMessage = message.toLowerCase();
    
    console.log('🔍 Classification - Rules-based filtering for:', message);
    
    // High-confidence rules
    if (this.isExplicitWorkflowRequest(lowerMessage)) {
      console.log('🔍 Classification - Detected as workflow request');
      return {
        type: 'workflow',
        confidence: 0.95,
        reasoning: 'Contains explicit workflow keywords',
        suggestedActions: ['Generate workflow', 'Show workflow steps'],
        requiresApiConnections: true
      };
    }

    if (this.isExplicitApiCall(lowerMessage)) {
      console.log('🔍 Classification - Detected as explicit API call');
      return {
        type: 'direct_api_call',
        confidence: 0.9,
        reasoning: 'Contains explicit API call keywords',
        suggestedActions: ['Execute API call', 'Show API response'],
        requiresApiConnections: true
      };
    }

    if (this.isConnectionRequest(lowerMessage)) {
      return {
        type: 'connection_guidance',
        confidence: 0.9,
        reasoning: 'Contains connection/setup keywords',
        suggestedActions: ['Show connection guidance', 'Provide setup instructions'],
        requiresApiConnections: false
      };
    }

    // Default to general chat with low confidence
    return {
      type: 'general_chat',
      confidence: 0.3,
      reasoning: 'No clear intent detected by rules',
      suggestedActions: ['Ask for clarification', 'Provide general help'],
      requiresApiConnections: false
    };
  }

  /**
   * Use AI to classify ambiguous messages
   */
  private async aiClassifyMessage(
    message: string, 
    context: Record<string, any>
  ): Promise<MessageClassification> {
    const response = await (this.openaiService as any).client.chat.completions.create({
      model: (this.openaiService as any).model,
      messages: [
        { role: 'system', content: this.buildClassificationPrompt() },
        { role: 'user', content: `Message: "${message}"\nContext: ${JSON.stringify(context, null, 2)}` }
      ],
      functions: [
        {
          name: 'classify_message',
          description: 'Classify user message intent and provide reasoning',
          parameters: {
            type: 'object',
            properties: {
              type: { 
                type: 'string', 
                enum: ['workflow', 'direct_api_call', 'connection_guidance', 'general_chat'],
                description: 'Primary message type'
              },
              confidence: { 
                type: 'number', 
                minimum: 0, 
                maximum: 1,
                description: 'Confidence score 0-1'
              },
              reasoning: { 
                type: 'string',
                description: 'Explanation for the classification'
              },
              suggestedActions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Suggested actions to take'
              },
              requiresApiConnections: {
                type: 'boolean',
                description: 'Whether this request requires API connections'
              }
            },
            required: ['type', 'confidence', 'reasoning', 'suggestedActions', 'requiresApiConnections']
          }
        }
      ],
      function_call: { name: 'classify_message' },
      temperature: 0.1,
      max_tokens: 500
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== 'classify_message') {
      throw new Error('Invalid AI response for message classification');
    }

    return JSON.parse(functionCall.arguments);
  }

  /**
   * Combine rules and AI classification results
   */
  private combineClassificationResults(
    rulesResult: MessageClassification, 
    aiResult: MessageClassification
  ): MessageClassification {
    // If both agree on type, use higher confidence
    if (rulesResult.type === aiResult.type) {
      return {
        ...rulesResult,
        confidence: Math.max(rulesResult.confidence, aiResult.confidence),
        reasoning: `${rulesResult.reasoning}. AI confirms: ${aiResult.reasoning}`
      };
    }

    // If AI has much higher confidence, use AI result
    if (aiResult.confidence > rulesResult.confidence + 0.3) {
      return {
        ...aiResult,
        reasoning: `AI overrides rules: ${aiResult.reasoning}. Rules suggested: ${rulesResult.reasoning}`
      };
    }

    // If rules have higher confidence, use rules result
    if (rulesResult.confidence > aiResult.confidence + 0.2) {
      return {
        ...rulesResult,
        reasoning: `Rules override AI: ${rulesResult.reasoning}. AI suggested: ${aiResult.reasoning}`
      };
    }

    // If similar confidence, prefer AI for context understanding
    return {
      ...aiResult,
      confidence: (rulesResult.confidence + aiResult.confidence) / 2,
      reasoning: `Combined analysis: ${aiResult.reasoning}. Rules: ${rulesResult.reasoning}`
    };
  }

  /**
   * Check if message is an explicit workflow request
   */
  private isExplicitWorkflowRequest(message: string): boolean {
    const workflowKeywords = [
      'workflow', 'automate', 'when', 'if', 'then', 'send', 'notify', 
      'email', 'slack', 'trello', 'github', 'jira', 'onboarding', 
      'template', 'process', 'step', 'sequence', 'chain', 'trigger'
    ];
    
    return workflowKeywords.some(keyword => message.includes(keyword)) &&
           !message.includes('pet'); // Exclude pet store examples
  }

  /**
   * Check if message is an explicit API call
   */
  private isExplicitApiCall(message: string): boolean {
    const apiCallKeywords = [
      'get', 'post', 'put', 'delete', 'patch', 'fetch', 'retrieve',
      'create', 'update', 'delete', 'find', 'search', 'list',
      'call api', 'make request', 'execute', 'run'
    ];
    
    return apiCallKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Check if message is a connection request
   */
  private isConnectionRequest(message: string): boolean {
    const connectionKeywords = [
      'connect', 'integrate', 'setup', 'configure', 'auth', 'authentication',
      'api key', 'token', 'credentials', 'oauth', 'login', 'sign in'
    ];
    
    return connectionKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Build system prompt for AI classification
   */
  private buildClassificationPrompt(): string {
    return `You are an expert at classifying user messages for an API automation platform.

MESSAGE TYPES:
1. WORKFLOW: User wants to create a multi-step automated workflow
   - Keywords: "when X happens, do Y", "automate", "workflow", "if/then"
   - Examples: "When a new GitHub issue is created, send a Slack notification"
   
2. DIRECT_API_CALL: User wants to make a single API call
   - Keywords: "get", "post", "fetch", "retrieve", "create", "update"
   - Examples: "Get all users", "Create a new project"
   
3. CONNECTION_GUIDANCE: User needs help setting up API connections
   - Keywords: "connect", "setup", "configure", "auth", "api key"
   - Examples: "How do I connect to Slack?", "Set up GitHub integration"
   
4. GENERAL_CHAT: General questions or unclear intent
   - Keywords: "help", "what", "how", "explain", "tell me about"
   - Examples: "What can you do?", "How does this work?"

CLASSIFICATION RULES:
- Look for explicit intent indicators
- Consider context and previous conversation
- Prefer specific actions over general questions
- Consider the user's likely goal based on the platform

Provide confidence scores based on clarity of intent.`;
  }
}

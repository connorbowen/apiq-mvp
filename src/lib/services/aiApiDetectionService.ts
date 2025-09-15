/**
 * AI-Powered API Detection Service
 * 
 * Uses AI to intelligently detect API requirements from natural language
 * instead of relying on hard-coded keyword matching.
 */

import { OpenAIService } from '../../services/openaiService';

export interface ApiRequirement {
  name: string;
  displayName: string;
  confidence: number;
  context: string;
  alternatives?: string[];
}

export interface ApiDetectionResult {
  requiredApis: ApiRequirement[];
  missingApis: ApiRequirement[];
  suggestedConnections: ApiRequirement[];
  guidanceMessage: string;
  requiresGuidance: boolean;
}

export class AIApiDetectionService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Analyze user request to detect API requirements using AI
   */
  async analyzeApiRequirements(
    userMessage: string,
    availableConnections: Array<{ name: string; id: string }>
  ): Promise<ApiDetectionResult> {
    try {
      const systemPrompt = this.buildApiDetectionPrompt(availableConnections);
      
      const response = await (this.openaiService as any).client.chat.completions.create({
        model: (this.openaiService as any).model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User request: "${userMessage}"` }
        ],
        functions: [
          {
            name: 'analyze_api_requirements',
            description: 'Analyze user request to identify required APIs and provide guidance',
            parameters: {
              type: 'object',
              properties: {
                requiredApis: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'API identifier (e.g., slack, github, stripe)' },
                      displayName: { type: 'string', description: 'Human-readable name (e.g., Slack, GitHub, Stripe)' },
                      confidence: { type: 'number', minimum: 0, maximum: 1, description: 'Confidence score 0-1' },
                      context: { type: 'string', description: 'Why this API is needed based on the request' },
                      alternatives: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Alternative APIs that could fulfill the same need'
                      }
                    },
                    required: ['name', 'displayName', 'confidence', 'context']
                  }
                },
                guidanceMessage: { 
                  type: 'string',
                  description: 'Helpful message explaining what APIs are needed and why'
                }
              },
              required: ['requiredApis', 'guidanceMessage']
            }
          }
        ],
        function_call: { name: 'analyze_api_requirements' },
        temperature: 0.1,
        max_tokens: 1000
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'analyze_api_requirements') {
        throw new Error('Failed to analyze API requirements: Invalid response from AI');
      }

      const result = JSON.parse(functionCall.arguments);
      
      // Determine which APIs are missing
      const availableApiNames = availableConnections.map(conn => conn.name.toLowerCase());
      const missingApis = result.requiredApis.filter((api: ApiRequirement) => 
        !availableApiNames.some(availableName => 
          availableName.includes(api.name.toLowerCase()) || 
          api.name.toLowerCase().includes(availableName)
        )
      );

      // Generate guidance message
      const guidanceMessage = this.generateGuidanceMessage(missingApis, result.guidanceMessage);

      return {
        requiredApis: result.requiredApis,
        missingApis,
        suggestedConnections: missingApis,
        guidanceMessage,
        requiresGuidance: missingApis.length > 0
      };

    } catch (error) {
      console.error('AI API detection failed:', error);
      
      // Fallback to basic keyword matching if AI fails
      return this.fallbackKeywordDetection(userMessage, availableConnections);
    }
  }

  /**
   * Build system prompt for API detection
   */
  private buildApiDetectionPrompt(availableConnections: Array<{ name: string; id: string }>): string {
    const availableApis = availableConnections.map(conn => conn.name).join(', ');
    
    return `You are an expert API integration specialist. Your job is to analyze user requests and identify which APIs are needed to fulfill their requirements.

AVAILABLE CONNECTIONS: ${availableApis || 'None'}

COMMON API CATEGORIES AND EXAMPLES:
- Communication: Slack, Microsoft Teams, Discord, Zoom
- Project Management: Trello, Asana, Jira, Monday.com, Notion
- Code Management: GitHub, GitLab, Bitbucket
- Email: SendGrid, Mailchimp, Gmail, Outlook
- Payments: Stripe, PayPal, Square
- CRM: Salesforce, HubSpot, Pipedrive
- E-commerce: Shopify, WooCommerce, BigCommerce
- Cloud Storage: Google Drive, Dropbox, OneDrive
- Social Media: Twitter, LinkedIn, Facebook
- Analytics: Google Analytics, Mixpanel, Amplitude
- AI/ML: OpenAI, Anthropic, Hugging Face
- Database: Airtable, Notion, MongoDB
- Automation: Zapier, IFTTT, Microsoft Power Automate

ANALYSIS RULES:
1. Look for explicit API mentions (e.g., "send to Slack", "create GitHub issue")
2. Identify implicit needs (e.g., "notify team" → Slack/Teams, "track bugs" → Jira/Trello)
3. Consider context and workflow patterns
4. Suggest alternatives when appropriate
5. Provide confidence scores based on clarity of requirements
6. Only suggest APIs that are commonly available and well-known

EXAMPLES:
- "When a new GitHub issue is created, send a Slack notification" → GitHub, Slack
- "Send welcome email to new customers" → SendGrid/Mailchimp
- "Create invoice for payment" → Stripe/PayPal
- "Track project tasks" → Trello/Asana/Jira
- "Store user data" → Airtable/Notion/Database

Be specific about why each API is needed and provide helpful context.`;
  }

  /**
   * Generate guidance message based on missing APIs
   */
  private generateGuidanceMessage(missingApis: ApiRequirement[], aiMessage: string): string {
    if (missingApis.length === 0) {
      return 'All required APIs are already connected. You can proceed with creating your workflow.';
    }

    if (missingApis.length === 1) {
      const api = missingApis[0];
      return `To create this workflow, you'll need to connect to ${api.displayName}. ${api.context}. I can help you set this up!`;
    } else if (missingApis.length === 2) {
      const names = missingApis.map(api => api.displayName).join(' and ');
      return `This workflow requires connections to ${names}. Let me help you set up these API connections.`;
    } else {
      const names = missingApis.slice(0, -1).map(api => api.displayName).join(', ') + 
                   `, and ${missingApis[missingApis.length - 1].displayName}`;
      return `This workflow requires several API connections: ${names}. I'll guide you through setting them up.`;
    }
  }

  /**
   * Fallback to basic keyword detection if AI fails
   */
  private fallbackKeywordDetection(
    userMessage: string,
    availableConnections: Array<{ name: string; id: string }>
  ): ApiDetectionResult {
    const message = userMessage.toLowerCase();
    const apiKeywords = ['slack', 'github', 'trello', 'stripe', 'sendgrid', 'mailchimp', 'airtable', 'notion', 'shopify', 'woocommerce', 'hubspot', 'salesforce', 'google', 'microsoft', 'twitter', 'openai'];
    
    const mentionedApis = apiKeywords.filter(api => message.includes(api));
    const availableApiNames = availableConnections.map(conn => conn.name.toLowerCase());
    const missingApis = mentionedApis.filter(api => 
      !availableApiNames.some(availableName => 
        availableName.includes(api) || api.includes(availableName)
      )
    );

    return {
      requiredApis: mentionedApis.map(api => ({
        name: api,
        displayName: api.charAt(0).toUpperCase() + api.slice(1),
        confidence: 0.8,
        context: `Mentioned in user request`
      })),
      missingApis: missingApis.map(api => ({
        name: api,
        displayName: api.charAt(0).toUpperCase() + api.slice(1),
        confidence: 0.8,
        context: `Mentioned in user request`
      })),
      suggestedConnections: missingApis.map(api => ({
        name: api,
        displayName: api.charAt(0).toUpperCase() + api.slice(1),
        confidence: 0.8,
        context: `Mentioned in user request`
      })),
      guidanceMessage: missingApis.length > 0 
        ? `You'll need to connect to ${missingApis.map(api => api.charAt(0).toUpperCase() + api.slice(1)).join(', ')} to create this workflow.`
        : 'All required APIs are connected.',
      requiresGuidance: missingApis.length > 0
    };
  }
}

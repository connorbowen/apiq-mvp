/**
 * AI-Powered API Detection Service
 * 
 * Intelligently analyzes user requests to determine which APIs are needed
 * to fulfill their workflow requirements. Uses contextual understanding
 * instead of hard-coded keyword matching.
 */

import { OpenAIService } from '../../services/openaiService';

export interface ApiDetectionResult {
  requiresGuidance: boolean;
  requiredApis: Array<{
    name: string;
    displayName: string;
    confidence: number;
    reason: string;
    suggestedEndpoints?: string[];
  }>;
  userIntent: string;
  suggestedWorkflow?: string;
}

export interface ApiKnowledge {
  name: string;
  displayName: string;
  description: string;
  authType: 'API_KEY' | 'OAUTH2' | 'BASIC_AUTH' | 'BEARER_TOKEN';
  baseUrl: string;
  commonEndpoints: string[];
  capabilities: string[];
  keywords: string[];
}

export class AIApiDetectionService {
  private openaiService: OpenAIService;
  
  // Comprehensive API knowledge base
  private static readonly API_KNOWLEDGE_BASE: Record<string, ApiKnowledge> = {
    'skilljar': {
      name: 'skilljar',
      displayName: 'Skilljar',
      description: 'Learning management system for course management and user training',
      authType: 'API_KEY',
      baseUrl: 'https://api.skilljar.com/v1',
      commonEndpoints: ['/courses', '/users', '/enrollments', '/completions'],
      capabilities: ['course management', 'user enrollment', 'progress tracking', 'completion certificates'],
      keywords: ['course', 'training', 'learning', 'enrollment', 'completion', 'certificate', 'skilljar']
    },
    'slack': {
      name: 'slack',
      displayName: 'Slack',
      description: 'Team communication and collaboration platform',
      authType: 'OAUTH2',
      baseUrl: 'https://slack.com/api',
      commonEndpoints: ['/chat.postMessage', '/conversations.list', '/users.list', '/files.upload'],
      capabilities: ['messaging', 'file sharing', 'channel management', 'user management'],
      keywords: ['message', 'chat', 'team', 'notification', 'channel', 'slack']
    },
    'github': {
      name: 'github',
      displayName: 'GitHub',
      description: 'Code repository and project management platform',
      authType: 'OAUTH2',
      baseUrl: 'https://api.github.com',
      commonEndpoints: ['/repos', '/issues', '/pulls', '/commits', '/releases'],
      capabilities: ['repository management', 'issue tracking', 'pull requests', 'code review'],
      keywords: ['repository', 'repo', 'code', 'git', 'issue', 'pull request', 'commit', 'github']
    },
    'stripe': {
      name: 'stripe',
      displayName: 'Stripe',
      description: 'Payment processing and subscription management',
      authType: 'API_KEY',
      baseUrl: 'https://api.stripe.com/v1',
      commonEndpoints: ['/charges', '/customers', '/subscriptions', '/invoices', '/products'],
      capabilities: ['payment processing', 'subscription management', 'customer management', 'billing'],
      keywords: ['payment', 'billing', 'subscription', 'customer', 'invoice', 'charge', 'stripe']
    },
    'openai': {
      name: 'openai',
      displayName: 'OpenAI',
      description: 'AI and machine learning services',
      authType: 'API_KEY',
      baseUrl: 'https://api.openai.com/v1',
      commonEndpoints: ['/chat/completions', '/completions', '/embeddings', '/images/generations'],
      capabilities: ['text generation', 'chat completion', 'embeddings', 'image generation'],
      keywords: ['ai', 'gpt', 'chatgpt', 'completion', 'embedding', 'generation', 'openai']
    },
    'google': {
      name: 'google',
      displayName: 'Google Workspace',
      description: 'Google productivity and collaboration tools',
      authType: 'OAUTH2',
      baseUrl: 'https://www.googleapis.com',
      commonEndpoints: ['/drive/v3/files', '/sheets/v4/spreadsheets', '/gmail/v1/messages', '/calendar/v3/events'],
      capabilities: ['file storage', 'spreadsheets', 'email', 'calendar', 'document collaboration'],
      keywords: ['google', 'drive', 'sheets', 'gmail', 'calendar', 'document', 'spreadsheet']
    },
    'microsoft': {
      name: 'microsoft',
      displayName: 'Microsoft 365',
      description: 'Microsoft productivity and collaboration suite',
      authType: 'OAUTH2',
      baseUrl: 'https://graph.microsoft.com/v1.0',
      commonEndpoints: ['/me/drive/root/children', '/me/messages', '/me/events', '/teams'],
      capabilities: ['file storage', 'email', 'calendar', 'teams collaboration', 'office documents'],
      keywords: ['microsoft', 'office', 'outlook', 'teams', 'onedrive', 'excel', 'word', 'powerpoint']
    },
    'salesforce': {
      name: 'salesforce',
      displayName: 'Salesforce',
      description: 'Customer relationship management and sales platform',
      authType: 'OAUTH2',
      baseUrl: 'https://your-instance.salesforce.com/services/data/v57.0',
      commonEndpoints: ['/sobjects/Account', '/sobjects/Contact', '/sobjects/Opportunity', '/sobjects/Lead'],
      capabilities: ['crm', 'sales management', 'lead tracking', 'opportunity management', 'customer data'],
      keywords: ['salesforce', 'crm', 'lead', 'opportunity', 'account', 'contact', 'sales']
    },
    'hubspot': {
      name: 'hubspot',
      displayName: 'HubSpot',
      description: 'Marketing, sales, and service platform',
      authType: 'API_KEY',
      baseUrl: 'https://api.hubapi.com',
      commonEndpoints: ['/crm/v3/objects/contacts', '/crm/v3/objects/companies', '/marketing/v3/emails', '/crm/v3/objects/deals'],
      capabilities: ['marketing automation', 'crm', 'email marketing', 'lead management', 'deal tracking'],
      keywords: ['hubspot', 'marketing', 'automation', 'lead', 'email', 'crm', 'deal']
    },
    'zapier': {
      name: 'zapier',
      displayName: 'Zapier',
      description: 'Workflow automation and integration platform',
      authType: 'API_KEY',
      baseUrl: 'https://api.zapier.com/v1',
      commonEndpoints: ['/zaps', '/triggers', '/actions', '/history'],
      capabilities: ['workflow automation', 'app integration', 'data synchronization', 'task automation'],
      keywords: ['zapier', 'automation', 'workflow', 'integration', 'trigger', 'action']
    },
    'sendgrid': {
      name: 'sendgrid',
      displayName: 'SendGrid',
      description: 'Email delivery and marketing platform',
      authType: 'API_KEY',
      baseUrl: 'https://api.sendgrid.com/v3',
      commonEndpoints: ['/mail/send', '/marketing/contacts', '/marketing/campaigns', '/marketing/segments'],
      capabilities: ['email delivery', 'email marketing', 'contact management', 'campaign management'],
      keywords: ['sendgrid', 'email', 'marketing', 'delivery', 'campaign', 'contact']
    }
  };

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Analyze user request and detect required APIs using AI
   */
  async analyzeUserRequest(
    userMessage: string,
    availableConnections: Array<{ 
      name: string; 
      id: string; 
      baseUrl?: string;
      endpoints?: Array<{ path: string; method: string; summary: string }>;
    }> = []
  ): Promise<ApiDetectionResult> {
    console.log('🔍 AIApiDetectionService - Analyzing user request:', { 
      userMessage, 
      availableConnections: availableConnections.length 
    });

    try {
      // Use AI to analyze the user's intent and determine required APIs
      console.log('🔍 AIApiDetectionService - Calling performAIAnalysis...');
      const aiAnalysis = await this.performAIAnalysis(userMessage, availableConnections);
      console.log('🔍 AIApiDetectionService - AI analysis completed:', aiAnalysis);
      
      // Enhance the analysis with knowledge base matching
      const enhancedResult = this.enhanceWithKnowledgeBase(aiAnalysis, userMessage);
      
      console.log('🔍 AIApiDetectionService - Final enhanced result:', enhancedResult);
      return enhancedResult;
      
    } catch (error) {
      console.error('🔍 AIApiDetectionService - AI analysis failed, using fallback:', error);
      console.error('🔍 AIApiDetectionService - Error details:', error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : 'No stack trace');
      return this.fallbackAnalysis(userMessage, availableConnections);
    }
  }

  /**
   * Perform AI analysis of user request
   */
  private async performAIAnalysis(
    userMessage: string,
    availableConnections: Array<{ name: string; id: string; baseUrl?: string; endpoints?: Array<{ path: string; method: string; summary: string }> }>
  ): Promise<ApiDetectionResult> {
    const availableApis = availableConnections.map(conn => ({
      name: conn.name,
      baseUrl: conn.baseUrl,
      endpoints: conn.endpoints?.map(ep => `${ep.method} ${ep.path}`).join(', ') || 'No endpoints'
    }));

    const knowledgeBaseApis = Object.values(AIApiDetectionService.API_KNOWLEDGE_BASE).map(api => ({
      name: api.name,
      displayName: api.displayName,
      capabilities: api.capabilities,
      keywords: api.keywords
    }));

    const prompt = `Analyze this user request and determine what APIs are needed to accomplish their goal.

User Request: "${userMessage}"

Available Connections: ${JSON.stringify(availableApis, null, 2)}

Available API Knowledge Base: ${JSON.stringify(knowledgeBaseApis, null, 2)}

Instructions:
1. Understand what the user is trying to accomplish
2. Determine which APIs would be needed to fulfill their request
3. Check if any of the available connections can fulfill the request
4. If no available connections can fulfill the request, suggest the appropriate APIs from the knowledge base
5. Be intelligent about matching user intent to API capabilities
6. Consider context and implied requirements
7. CRITICAL: If the request involves multiple services/APIs, include ALL of them in the requiredApis array
8. CRITICAL: Look for ALL API names and keywords mentioned in the user request
9. CRITICAL: Each API mentioned should be included as a separate entry in requiredApis
10. CRITICAL: Be flexible with connection name matching - test connections may have names like "Github E2E Connection" or "Slack Test API"
11. CRITICAL: If you see keywords like "notification", "message", "team" - consider Slack
12. CRITICAL: If you see keywords like "issue", "repository", "commit", "pull request" - consider GitHub
13. CRITICAL: If you see keywords like "card", "board", "task", "project" - consider Trello
14. CRITICAL: If you see keywords like "email", "mail", "inbox" - consider Gmail/Email services
15. CRITICAL: If you see keywords like "payment", "billing", "charge" - consider Stripe
16. CRITICAL: If you see keywords like "ticket", "support", "helpdesk" - consider Zendesk
17. CRITICAL: If you see keywords like "webhook", "callback", "trigger" - consider webhook services

Respond with JSON in this format:
{
  "requiresGuidance": boolean,
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
}

Examples:
- "I want to update my skilljar courses" → requiresGuidance: true, requiredApis: [{"name": "skilljar", "displayName": "Skilljar", "confidence": 0.9, "reason": "User wants to manage courses, which requires a learning management system", "suggestedEndpoints": ["/courses", "/courses/{id}"]}]
- "Send a message to my team" → requiresGuidance: true, requiredApis: [{"name": "slack", "displayName": "Slack", "confidence": 0.8, "reason": "User wants to send team messages", "suggestedEndpoints": ["/chat.postMessage"]}]
- "Create a workflow that sends a Slack notification when a new GitHub issue is created" → requiresGuidance: true, requiredApis: [{"name": "slack", "displayName": "Slack", "confidence": 0.9, "reason": "User wants to send notifications", "suggestedEndpoints": ["/chat.postMessage"]}, {"name": "github", "displayName": "GitHub", "confidence": 0.9, "reason": "User wants to monitor GitHub issues", "suggestedEndpoints": ["/repos/{owner}/{repo}/issues", "/repos/{owner}/{repo}/issues/{issue_number}"]}]
- "Get all users from my database" → requiresGuidance: false (if they have a database connection that can handle this)

CRITICAL: Look for ALL APIs mentioned or implied in the request. If you see "Slack" and "GitHub" in the same request, include BOTH. If you see multiple API names, include ALL of them. Be flexible with connection name matching for test connections.`;

    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500
    });

    // chatCompletion returns a string when no functions are used
    let content = typeof response === 'string' ? response : response.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    
    // Clean up markdown formatting if present
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const result = JSON.parse(content);
    console.log('🔍 AIApiDetectionService - Raw AI response:', content);
    console.log('🔍 AIApiDetectionService - Parsed result:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Enhance AI analysis with knowledge base matching
   */
  private enhanceWithKnowledgeBase(aiResult: ApiDetectionResult, userMessage: string): ApiDetectionResult {
    const enhancedApis = aiResult.requiredApis.map(api => {
      const knowledge = AIApiDetectionService.API_KNOWLEDGE_BASE[api.name];
      if (knowledge) {
        return {
          ...api,
          displayName: knowledge.displayName,
          suggestedEndpoints: api.suggestedEndpoints || knowledge.commonEndpoints.slice(0, 3)
        };
      }
      return api;
    });

    return {
      ...aiResult,
      requiredApis: enhancedApis
    };
  }

  /**
   * Fallback analysis when AI fails
   */
  private fallbackAnalysis(
    userMessage: string,
    availableConnections: Array<{ name: string; id: string; baseUrl?: string; endpoints?: Array<{ path: string; method: string; summary: string }> }>
  ): ApiDetectionResult {
    console.log('🔍 AIApiDetectionService - Using fallback analysis');
    
    // Simple keyword-based detection
    const mentionedApis = this.extractMentionedApis(userMessage);
    console.log('🔍 AIApiDetectionService - Fallback mentionedApis:', mentionedApis);
    
    if (mentionedApis.length === 0) {
      console.log('🔍 AIApiDetectionService - No APIs mentioned in fallback');
      return {
        requiresGuidance: false,
        requiredApis: [],
        userIntent: 'General request',
        suggestedWorkflow: undefined
      };
    }

    const requiredApis = mentionedApis.map(apiName => {
      const knowledge = AIApiDetectionService.API_KNOWLEDGE_BASE[apiName];
      return {
        name: apiName,
        displayName: knowledge?.displayName || apiName,
        confidence: 0.7,
        reason: `User mentioned ${apiName}`,
        suggestedEndpoints: knowledge?.commonEndpoints.slice(0, 3) || []
      };
    });

    return {
      requiresGuidance: true,
      requiredApis,
      userIntent: `User wants to work with ${mentionedApis.join(', ')}`,
      suggestedWorkflow: undefined
    };
  }

  /**
   * Extract mentioned APIs from user message
   */
  private extractMentionedApis(message: string): string[] {
    const mentionedApis: string[] = [];
    const lowerMessage = message.toLowerCase();
    console.log('🔍 AIApiDetectionService - extractMentionedApis - message:', lowerMessage);

    for (const [apiName, knowledge] of Object.entries(AIApiDetectionService.API_KNOWLEDGE_BASE)) {
      // Check if API name is mentioned
      if (lowerMessage.includes(apiName)) {
        console.log('🔍 AIApiDetectionService - Found API name:', apiName);
        mentionedApis.push(apiName);
        continue;
      }

      // Check if any keywords are mentioned
      const hasKeyword = knowledge.keywords.some(keyword => {
        const keywordLower = keyword.toLowerCase();
        const found = lowerMessage.includes(keywordLower);
        if (found) {
          console.log('🔍 AIApiDetectionService - Found keyword match:', keywordLower, 'for API:', apiName);
        }
        return found;
      });

      if (hasKeyword) {
        console.log('🔍 AIApiDetectionService - Found API via keyword:', apiName, 'keywords:', knowledge.keywords);
        mentionedApis.push(apiName);
      }
    }

    console.log('🔍 AIApiDetectionService - Final mentionedApis:', mentionedApis);
    return Array.from(new Set(mentionedApis)); // Remove duplicates
  }

  /**
   * Get API knowledge for a specific API
   */
  static getApiKnowledge(apiName: string): ApiKnowledge | undefined {
    return AIApiDetectionService.API_KNOWLEDGE_BASE[apiName];
  }

  /**
   * Get all available APIs
   */
  static getAllApis(): ApiKnowledge[] {
    return Object.values(AIApiDetectionService.API_KNOWLEDGE_BASE);
  }
}
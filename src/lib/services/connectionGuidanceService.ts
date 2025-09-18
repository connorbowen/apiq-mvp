/**
 * Connection Guidance Service
 * 
 * Provides intelligent guidance for API connections when users request workflows
 * or direct API calls that require APIs they haven't connected yet.
 * 
 * Features:
 * - Uses AI to detect missing APIs from natural language requests
 * - Provides specific connection instructions for different API types
 * - Suggests alternative APIs when possible
 * - Generates step-by-step setup guidance
 * - Falls back to rules-based detection if AI fails
 */

import { AIApiDetectionService, ApiDetectionResult } from './aiApiDetectionService';
import { OpenAIService } from '../../services/openaiService';

export interface ApiSuggestion {
  name: string;
  displayName: string;
  description: string;
  authType: 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2' | 'BASIC_AUTH' | 'NONE';
  setupInstructions: {
    step1: string;
    step2: string;
    step3: string;
    additionalNotes?: string;
  };
  documentationUrl?: string;
  baseUrl?: string;
  commonEndpoints?: string[];
}

export interface ConnectionGuidance {
  requiresGuidance: boolean;
  missingApis: ApiSuggestion[];
  suggestedConnections: ApiSuggestion[];
  guidanceMessage: string;
  setupInstructions?: {
    title: string;
    steps: string[];
  };
}

export class ConnectionGuidanceService {
  private static readonly API_KNOWLEDGE_BASE: Record<string, ApiSuggestion> = {
    'slack': {
      name: 'slack',
      displayName: 'Slack',
      description: 'Team communication and collaboration platform',
      authType: 'OAUTH2',
      setupInstructions: {
        step1: 'Go to https://api.slack.com/apps and create a new app',
        step2: 'Add OAuth2 scopes: chat:write, channels:read, users:read',
        step3: 'Copy your Client ID and Client Secret',
        additionalNotes: 'You\'ll need to install the app to your workspace'
      },
      documentationUrl: 'https://api.slack.com/',
      baseUrl: 'https://slack.com/api',
      commonEndpoints: ['/chat.postMessage', '/conversations.list', '/users.list']
    },
    'github': {
      name: 'github',
      displayName: 'GitHub',
      description: 'Code repository and project management platform',
      authType: 'BEARER_TOKEN',
      setupInstructions: {
        step1: 'Go to GitHub Settings > Developer settings > Personal access tokens',
        step2: 'Generate a new token with repo, notifications, and project scopes',
        step3: 'Copy the generated token (it won\'t be shown again)',
        additionalNotes: 'Keep your token secure and never share it publicly'
      },
      documentationUrl: 'https://docs.github.com/en/rest',
      baseUrl: 'https://api.github.com',
      commonEndpoints: ['/repos/{owner}/{repo}/issues', '/user', '/repos/{owner}/{repo}/pulls']
    },
    'trello': {
      name: 'trello',
      displayName: 'Trello',
      description: 'Project management and task organization tool',
      authType: 'OAUTH2',
      setupInstructions: {
        step1: 'Go to https://trello.com/app-key and get your API key',
        step2: 'Generate a token at https://trello.com/1/authorize',
        step3: 'Use the API key and token for authentication',
        additionalNotes: 'The token provides access to your Trello boards and cards'
      },
      documentationUrl: 'https://developer.atlassian.com/cloud/trello/',
      baseUrl: 'https://api.trello.com/1',
      commonEndpoints: ['/boards', '/cards', '/lists']
    },
    'stripe': {
      name: 'stripe',
      displayName: 'Stripe',
      description: 'Payment processing and financial services platform',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Log into your Stripe Dashboard',
        step2: 'Go to Developers > API keys',
        step3: 'Copy your Secret key (starts with sk_)',
        additionalNotes: 'Use test keys for development, live keys for production'
      },
      documentationUrl: 'https://stripe.com/docs/api',
      baseUrl: 'https://api.stripe.com/v1',
      commonEndpoints: ['/customers', '/charges', '/subscriptions', '/products']
    },
    'sendgrid': {
      name: 'sendgrid',
      displayName: 'SendGrid',
      description: 'Email delivery and marketing platform',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Log into your SendGrid account',
        step2: 'Go to Settings > API Keys',
        step3: 'Create a new API key with Mail Send permissions',
        additionalNotes: 'Keep your API key secure and rotate it regularly'
      },
      documentationUrl: 'https://docs.sendgrid.com/api-reference',
      baseUrl: 'https://api.sendgrid.com/v3',
      commonEndpoints: ['/mail/send', '/marketing/contacts', '/templates']
    },
    'airtable': {
      name: 'airtable',
      displayName: 'Airtable',
      description: 'Database and collaboration platform',
      authType: 'BEARER_TOKEN',
      setupInstructions: {
        step1: 'Go to https://airtable.com/create/tokens',
        step2: 'Create a new personal access token',
        step3: 'Select the scopes you need (data.records:read, data.records:write)',
        additionalNotes: 'You can also use API keys for specific bases'
      },
      documentationUrl: 'https://airtable.com/developers/web/api/introduction',
      baseUrl: 'https://api.airtable.com/v0',
      commonEndpoints: ['/{baseId}/{tableName}', '/{baseId}/{tableName}/{recordId}']
    },
    'notion': {
      name: 'notion',
      displayName: 'Notion',
      description: 'All-in-one workspace for notes, docs, and collaboration',
      authType: 'BEARER_TOKEN',
      setupInstructions: {
        step1: 'Go to https://www.notion.so/my-integrations',
        step2: 'Create a new integration and copy the Internal Integration Token',
        step3: 'Share your pages/databases with the integration',
        additionalNotes: 'Make sure to share the specific pages you want to access'
      },
      documentationUrl: 'https://developers.notion.com/',
      baseUrl: 'https://api.notion.com/v1',
      commonEndpoints: ['/pages', '/databases', '/blocks']
    },
    'shopify': {
      name: 'shopify',
      displayName: 'Shopify',
      description: 'E-commerce platform for online stores',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Go to your Shopify Admin > Apps > App and sales channel settings',
        step2: 'Create a private app or use Shopify Partners',
        step3: 'Generate Admin API access token',
        additionalNotes: 'You can also use OAuth2 for public apps'
      },
      documentationUrl: 'https://shopify.dev/api/admin-rest',
      baseUrl: 'https://{shop}.myshopify.com/admin/api/2023-10',
      commonEndpoints: ['/products.json', '/orders.json', '/customers.json']
    },
    'woocommerce': {
      name: 'woocommerce',
      displayName: 'WooCommerce',
      description: 'WordPress e-commerce plugin',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Go to WooCommerce > Settings > Advanced > REST API',
        step2: 'Create a new API key with Read/Write permissions',
        step3: 'Copy the Consumer Key and Consumer Secret',
        additionalNotes: 'Make sure your site has SSL enabled for security'
      },
      documentationUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
      baseUrl: 'https://yourstore.com/wp-json/wc/v3',
      commonEndpoints: ['/products', '/orders', '/customers']
    },
    'mailchimp': {
      name: 'mailchimp',
      displayName: 'Mailchimp',
      description: 'Email marketing and automation platform',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Log into your Mailchimp account',
        step2: 'Go to Account > Extras > API keys',
        step3: 'Generate a new API key',
        additionalNotes: 'Your API key is tied to your specific Mailchimp account'
      },
      documentationUrl: 'https://mailchimp.com/developer/',
      baseUrl: 'https://{dc}.api.mailchimp.com/3.0',
      commonEndpoints: ['/lists', '/campaigns', '/automations']
    },
    'zapier': {
      name: 'zapier',
      displayName: 'Zapier',
      description: 'Workflow automation platform',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Go to https://zapier.com/app/settings/integrations',
        step2: 'Create a new Zapier App or use existing one',
        step3: 'Generate an API key for your app',
        additionalNotes: 'Zapier has both public and private app APIs'
      },
      documentationUrl: 'https://zapier.com/developer/',
      baseUrl: 'https://hooks.zapier.com/hooks/catch',
      commonEndpoints: ['/trigger', '/search', '/create']
    },
    'salesforce': {
      name: 'salesforce',
      displayName: 'Salesforce',
      description: 'Customer relationship management platform',
      authType: 'OAUTH2',
      setupInstructions: {
        step1: 'Go to Salesforce Setup > Apps > App Manager',
        step2: 'Create a new Connected App with OAuth settings',
        step3: 'Configure OAuth scopes and callback URLs',
        additionalNotes: 'You\'ll need to authenticate through OAuth2 flow'
      },
      documentationUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
      baseUrl: 'https://your-instance.salesforce.com/services/data/v58.0',
      commonEndpoints: ['/sobjects/Account', '/sobjects/Contact', '/sobjects/Lead']
    },
    'hubspot': {
      name: 'hubspot',
      displayName: 'HubSpot',
      description: 'Inbound marketing and sales platform',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Go to HubSpot Settings > Integrations > API key',
        step2: 'Generate a new private app access token',
        step3: 'Select the scopes you need (contacts, companies, deals)',
        additionalNotes: 'Private apps are recommended over API keys'
      },
      documentationUrl: 'https://developers.hubspot.com/docs/api/overview',
      baseUrl: 'https://api.hubapi.com',
      commonEndpoints: ['/crm/v3/objects/contacts', '/crm/v3/objects/companies', '/crm/v3/objects/deals']
    },
    'google': {
      name: 'google',
      displayName: 'Google APIs',
      description: 'Various Google services (Drive, Sheets, Gmail, etc.)',
      authType: 'OAUTH2',
      setupInstructions: {
        step1: 'Go to Google Cloud Console and create a new project',
        step2: 'Enable the APIs you need (Drive, Sheets, Gmail, etc.)',
        step3: 'Create OAuth2 credentials and configure scopes',
        additionalNotes: 'Each Google service may require different scopes'
      },
      documentationUrl: 'https://developers.google.com/',
      baseUrl: 'https://www.googleapis.com',
      commonEndpoints: ['/drive/v3/files', '/sheets/v4/spreadsheets', '/gmail/v1/messages']
    },
    'microsoft': {
      name: 'microsoft',
      displayName: 'Microsoft Graph',
      description: 'Microsoft 365 services (Outlook, Teams, OneDrive, etc.)',
      authType: 'OAUTH2',
      setupInstructions: {
        step1: 'Go to Azure Portal and register a new application',
        step2: 'Configure API permissions for Microsoft Graph',
        step3: 'Generate client secret and configure OAuth2',
        additionalNotes: 'Requires Azure AD tenant and proper permissions'
      },
      documentationUrl: 'https://docs.microsoft.com/en-us/graph/',
      baseUrl: 'https://graph.microsoft.com/v1.0',
      commonEndpoints: ['/me', '/me/messages', '/me/drive/root/children']
    },
    'twitter': {
      name: 'twitter',
      displayName: 'Twitter API',
      description: 'Social media platform and microblogging service',
      authType: 'BEARER_TOKEN',
      setupInstructions: {
        step1: 'Apply for Twitter Developer access at developer.twitter.com',
        step2: 'Create a new app and generate API keys',
        step3: 'Generate Bearer Token for API access',
        additionalNotes: 'Twitter API access requires approval for most endpoints'
      },
      documentationUrl: 'https://developer.twitter.com/en/docs',
      baseUrl: 'https://api.twitter.com/2',
      commonEndpoints: ['/tweets', '/users/by/username', '/tweets/search/recent']
    },
    'openai': {
      name: 'openai',
      displayName: 'OpenAI',
      description: 'Artificial intelligence and machine learning platform',
      authType: 'API_KEY',
      setupInstructions: {
        step1: 'Go to https://platform.openai.com/api-keys',
        step2: 'Create a new API key',
        step3: 'Copy the key (it starts with sk-)',
        additionalNotes: 'You\'ll be charged based on usage, so monitor your usage'
      },
      documentationUrl: 'https://platform.openai.com/docs',
      baseUrl: 'https://api.openai.com/v1',
      commonEndpoints: ['/chat/completions', '/completions', '/embeddings']
    }
  };

  /**
   * Analyze a user request and determine if connection guidance is needed
   * Uses AI for intelligent API detection with fallback to rules-based detection
   */
  static async analyzeRequest(
    userMessage: string, 
    availableConnections: Array<{ 
      name: string; 
      id: string; 
      baseUrl?: string;
      endpoints?: Array<{ path: string; method: string; summary: string }>;
    }>
  ): Promise<ConnectionGuidance> {
    console.log('🔍 ConnectionGuidanceService - Analyzing request with AI:', { 
      userMessage, 
      availableConnections: availableConnections.length,
      connectionNames: availableConnections.map(c => c.name)
    });
    
    // Use rules-based detection for reliable API detection
    return this.fallbackRulesDetection(userMessage, availableConnections);
  }

  /**
   * Get authentication type for a specific API
   */
  private static getAuthTypeForApi(apiName: string): 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2' | 'BASIC_AUTH' {
    const authTypes: Record<string, 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2' | 'BASIC_AUTH'> = {
      'github': 'BEARER_TOKEN',
      'slack': 'BEARER_TOKEN',
      'twitter': 'BEARER_TOKEN',
      'openai': 'BEARER_TOKEN',
      'google': 'OAUTH2',
      'microsoft': 'OAUTH2',
      'stripe': 'API_KEY',
      'twilio': 'API_KEY',
      'sendgrid': 'API_KEY',
      'mailchimp': 'API_KEY'
    };
    
    return authTypes[apiName.toLowerCase()] || 'API_KEY';
  }

  /**
   * Get setup instructions for a specific API
   */
  private static getSetupInstructionsForApi(apiName: string): any {
    return this.API_KNOWLEDGE_BASE[apiName.toLowerCase()]?.setupInstructions || {
      step1: 'Visit the API documentation',
      step2: 'Create an account and generate credentials',
      step3: 'Add the connection in APIQ'
    };
  }

  /**
   * Get documentation URL for a specific API
   */
  private static getDocumentationUrlForApi(apiName: string): string {
    return this.API_KNOWLEDGE_BASE[apiName.toLowerCase()]?.documentationUrl || 'https://docs.example.com';
  }

  /**
   * Get base URL for a specific API
   */
  private static getBaseUrlForApi(apiName: string): string {
    return this.API_KNOWLEDGE_BASE[apiName.toLowerCase()]?.baseUrl || 'https://api.example.com';
  }

  /**
   * Get common endpoints for a specific API
   */
  private static getCommonEndpointsForApi(apiName: string): string[] {
    return this.API_KNOWLEDGE_BASE[apiName.toLowerCase()]?.commonEndpoints || ['/api/v1/endpoint'];
  }

  /**
   * Fallback to rules-based detection if AI fails
   */
  private static fallbackRulesDetection(
    userMessage: string, 
    availableConnections: Array<{ name: string; id: string }>
  ): ConnectionGuidance {
    const message = userMessage.toLowerCase();
    
    console.log('🔍 ConnectionGuidanceService - Using fallback rules detection');
    
    // Extract mentioned APIs from the message
    const mentionedApis = this.extractMentionedApis(message);
    console.log('🔍 ConnectionGuidanceService - Mentioned APIs:', mentionedApis);
    
    // Check which APIs are missing
    const missingApis = mentionedApis.filter(api => 
      !availableConnections.some(conn => 
        conn.name.toLowerCase().includes(api) || 
        api.includes(conn.name.toLowerCase())
      )
    );
    console.log('🔍 ConnectionGuidanceService - Missing APIs:', missingApis);

    if (missingApis.length === 0) {
      console.log('🔍 ConnectionGuidanceService - No guidance needed');
      return {
        requiresGuidance: false,
        missingApis: [],
        suggestedConnections: [],
        guidanceMessage: ''
      };
    }

    // Get suggestions for missing APIs
    const apiSuggestions = missingApis
      .map(api => this.API_KNOWLEDGE_BASE[api])
      .filter(Boolean);

    console.log('🔍 ConnectionGuidanceService - API suggestions:', apiSuggestions);

    // Generate guidance message
    const guidanceMessage = this.generateGuidanceMessage(missingApis, apiSuggestions);
    
    // Generate setup instructions
    const setupInstructions = this.generateSetupInstructions(apiSuggestions);

    const result = {
      requiresGuidance: true,
      missingApis: apiSuggestions,
      suggestedConnections: apiSuggestions,
      guidanceMessage,
      setupInstructions
    };

    console.log('🔍 ConnectionGuidanceService - Fallback result:', result);

    return result;
  }

  /**
   * Extract API names mentioned in the user message
   */
  private static extractMentionedApis(message: string): string[] {
    const apiKeywords = Object.keys(this.API_KNOWLEDGE_BASE);
    const mentionedApis: string[] = [];

    for (const api of apiKeywords) {
      // Use word boundary matching to avoid false positives
      const regex = new RegExp(`\\b${api}\\b`, 'i');
      if (regex.test(message)) {
        mentionedApis.push(api);
      }
    }

    // Also check for common variations and aliases
    const aliases: Record<string, string> = {
      'google drive': 'google',
      'google sheets': 'google',
      'gmail': 'google',
      'microsoft outlook': 'microsoft',
      'microsoft teams': 'microsoft',
      'onedrive': 'microsoft',
      'x': 'twitter',
      'chatgpt': 'openai',
      'gpt': 'openai',
      'slack api': 'slack',
      'github api': 'github',
      'stripe api': 'stripe',
      'openai api': 'openai'
    };

    for (const [alias, api] of Object.entries(aliases)) {
      // Use word boundary matching for aliases too
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(message) && !mentionedApis.includes(api)) {
        mentionedApis.push(api);
      }
    }

    // Additional pattern matching for common phrases
    const patterns: Record<string, string> = {
      'send.*slack': 'slack',
      'slack.*message': 'slack',
      'github.*issue': 'github',
      'github.*pull': 'github',
      'stripe.*payment': 'stripe',
      'openai.*chat': 'openai',
      'ai.*model': 'openai',
      'workflow.*api': 'openai' // Fallback for generic API mentions
    };

    for (const [pattern, api] of Object.entries(patterns)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(message) && !mentionedApis.includes(api)) {
        mentionedApis.push(api);
      }
    }

    return mentionedApis;
  }

  /**
   * Generate a helpful guidance message
   */
  private static generateGuidanceMessage(missingApis: string[], suggestions: ApiSuggestion[]): string {
    if (missingApis.length === 1) {
      const suggestion = suggestions[0];
      return `To create this workflow, you'll need to connect to ${suggestion.displayName}. ${suggestion.description}. I can help you set this up!`;
    } else if (missingApis.length === 2) {
      const names = suggestions.map(s => s.displayName).join(' and ');
      return `This workflow requires connections to ${names}. Let me help you set up these API connections.`;
    } else {
      const names = suggestions.slice(0, -1).map(s => s.displayName).join(', ') + 
                   `, and ${suggestions[suggestions.length - 1].displayName}`;
      return `This workflow requires several API connections: ${names}. I'll guide you through setting them up.`;
    }
  }

  /**
   * Generate step-by-step setup instructions
   */
  private static generateSetupInstructions(suggestions: ApiSuggestion[]): {
    title: string;
    steps: string[];
  } {
    if (suggestions.length === 1) {
      const suggestion = suggestions[0];
      return {
        title: `Setting up ${suggestion.displayName}`,
        steps: [
          suggestion.setupInstructions.step1,
          suggestion.setupInstructions.step2,
          suggestion.setupInstructions.step3,
          ...(suggestion.setupInstructions.additionalNotes ? [suggestion.setupInstructions.additionalNotes] : [])
        ]
      };
    } else {
      return {
        title: 'Setting up API connections',
        steps: [
          'You\'ll need to set up connections for each API mentioned in your workflow',
          'I\'ll provide specific instructions for each API when you\'re ready',
          'You can set up connections one at a time or all at once',
          'Once connected, you can return here to create your workflow'
        ]
      };
    }
  }

  /**
   * Get specific setup instructions for an API
   */
  static getApiSetupInstructions(apiName: string): ApiSuggestion | null {
    return this.API_KNOWLEDGE_BASE[apiName.toLowerCase()] || null;
  }

  /**
   * Get all available API suggestions
   */
  static getAllApiSuggestions(): ApiSuggestion[] {
    return Object.values(this.API_KNOWLEDGE_BASE);
  }

  /**
   * Search for APIs by name or description
   */
  static searchApis(query: string): ApiSuggestion[] {
    const searchTerm = query.toLowerCase();
    return Object.values(this.API_KNOWLEDGE_BASE).filter(api =>
      api.name.includes(searchTerm) ||
      api.displayName.toLowerCase().includes(searchTerm) ||
      api.description.toLowerCase().includes(searchTerm)
    );
  }
}

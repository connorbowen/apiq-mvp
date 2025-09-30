/**
 * Endpoint Selection Service
 * 
 * Centralized service for selecting the most appropriate API endpoint
 * based on user intent and available connections.
 * 
 * Features:
 * - Context-aware endpoint filtering
 * - AI-powered endpoint selection with fallback to rules-based logic
 * - Performance optimization (token limits)
 * - Smart scoring algorithm
 * 
 * Used by:
 * - Direct API calls (chat)
 * - Workflow generation
 * - API Explorer
 */

import { OpenAIService } from '../../services/openaiService';

export interface EndpointSelectionResult {
  connectionId: string;
  endpoint: string;
  method: string;
  reason: string;
  confidence: number;
  connectionName: string;
  endpointSummary?: string;
}

export interface EndpointSelectionRequest {
  message: string;
  connections: Array<{
    id: string;
    name: string;
    baseUrl?: string;
    endpoints: Array<{
      path: string;
      method: string;
      summary?: string;
      parameters?: any[];
    }>;
  }>;
  guidanceResponse?: any;
  maxEndpoints?: number;
}

export class EndpointSelectionService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Select the most appropriate endpoint for a user request
   */
  async selectEndpoint(request: EndpointSelectionRequest): Promise<EndpointSelectionResult> {
    try {
      console.log('🔍 EndpointSelectionService: Starting endpoint selection');
      console.log('🔍 EndpointSelectionService: Message:', request.message);
      console.log('🔍 EndpointSelectionService: Connections count:', request.connections.length);

      // First, try AI-powered endpoint selection
      console.log('🔍 EndpointSelectionService: Attempting AI-powered selection...');
      const aiResult = await this.selectEndpointWithAI(request);
      console.log('🔍 EndpointSelectionService: AI selection result:', aiResult ? 'SUCCESS' : 'FAILED');
      
      if (aiResult) {
        console.log('🔍 EndpointSelectionService: AI selection successful, returning result');
        return aiResult;
      }

      // Fallback to rules-based selection
      console.log('🔍 EndpointSelectionService: AI selection failed, falling back to rules-based selection');
      const rulesResult = this.selectEndpointWithRules(request);
      console.log('🔍 EndpointSelectionService: Rules-based selection result:', rulesResult);
      return rulesResult;

    } catch (error) {
      console.error('🔍 EndpointSelectionService: Error during endpoint selection:', error);
      console.error('🔍 EndpointSelectionService: Error type:', typeof error);
      console.error('🔍 EndpointSelectionService: Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('🔍 EndpointSelectionService: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Final fallback to rules-based selection
      console.log('🔍 EndpointSelectionService: Using final fallback to rules-based selection');
      return this.selectEndpointWithRules(request);
    }
  }

  /**
   * AI-powered endpoint selection using focused prompt
   */
  private async selectEndpointWithAI(request: EndpointSelectionRequest): Promise<EndpointSelectionResult | null> {
    try {
      console.log('🔍 EndpointSelectionService: Starting AI selection process');
      
      // Filter relevant endpoints to avoid token limits
      const relevantEndpoints = this.filterRelevantEndpoints(request.connections, request.message);
      console.log('🔍 EndpointSelectionService: Filtered endpoints count:', relevantEndpoints.length);
      
      if (relevantEndpoints.length === 0) {
        console.log('🔍 EndpointSelectionService: No relevant endpoints found for AI selection');
        return null;
      }

      // Build focused prompt for endpoint selection
      const systemPrompt = this.buildEndpointSelectionPrompt(relevantEndpoints, request.guidanceResponse);
      const userPrompt = `Select the best endpoint for this request: "${request.message}"`;

      console.log('🔍 EndpointSelectionService: About to call OpenAI API');
      console.log('🔍 EndpointSelectionService: System prompt length:', systemPrompt.length);
      console.log('🔍 EndpointSelectionService: User prompt:', userPrompt);
      console.log('🔍 EndpointSelectionService: System prompt content:');
      console.log('🔍 EndpointSelectionService: ===== SYSTEM PROMPT START =====');
      console.log(systemPrompt);
      console.log('🔍 EndpointSelectionService: ===== SYSTEM PROMPT END =====');
      console.log('🔍 EndpointSelectionService: User prompt content:');
      console.log('🔍 EndpointSelectionService: ===== USER PROMPT START =====');
      console.log(userPrompt);
      console.log('🔍 EndpointSelectionService: ===== USER PROMPT END =====');
      console.log('🔍 EndpointSelectionService: OpenAI service instance:', !!this.openaiService);
      console.log('🔍 EndpointSelectionService: OpenAI service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.openaiService)));

      // Add timeout wrapper to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        console.log('🔍 EndpointSelectionService: Setting up timeout promise...');
        const timeoutId = setTimeout(() => {
          console.log('⏰ EndpointSelectionService: Timeout reached after 30 seconds');
          reject(new Error('OpenAI API call timeout after 30 seconds'));
        }, 30000);
        console.log('🔍 EndpointSelectionService: Timeout promise set up with ID:', timeoutId);
        console.log('🔍 EndpointSelectionService: Timeout will fire at:', new Date(Date.now() + 30000).toISOString());
      });

      console.log('🔍 EndpointSelectionService: Creating AI promise...');
      console.log('🔍 EndpointSelectionService: About to call openaiService.chatCompletion...');
      console.log('🔍 EndpointSelectionService: OpenAI API key exists:', !!process.env.OPENAI_API_KEY);
      console.log('🔍 EndpointSelectionService: OpenAI API key length:', process.env.OPENAI_API_KEY?.length || 0);
      console.log('🔍 EndpointSelectionService: OpenAI API key prefix:', process.env.OPENAI_API_KEY?.substring(0, 10) || 'N/A');
      console.log('🔍 EndpointSelectionService: OpenAI API key valid format:', process.env.OPENAI_API_KEY?.startsWith('sk-') || false);
      console.log('🔍 EndpointSelectionService: Environment NODE_ENV:', process.env.NODE_ENV);
      console.log('🔍 EndpointSelectionService: Environment OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL || 'default');
      
      // Skip test call - go directly to main AI call
      console.log('🔍 EndpointSelectionService: Skipping test call, proceeding directly to main AI call');
      
      // Check if this is the second message by looking at the message content
      if (request.message.includes('pending')) {
        console.log('🔍 EndpointSelectionService: This is the second message - investigating hang...');
        console.log('🔍 EndpointSelectionService: Current time:', new Date().toISOString());
        console.log('🔍 EndpointSelectionService: Process memory usage:', process.memoryUsage());
        console.log('🔍 EndpointSelectionService: Process uptime:', process.uptime());
        
        // Check OpenAI service state
        console.log('🔍 EndpointSelectionService: OpenAI service state check:');
        console.log('🔍 EndpointSelectionService: - Service exists:', !!this.openaiService);
        console.log('🔍 EndpointSelectionService: - Service constructor:', this.openaiService?.constructor?.name);
        console.log('🔍 EndpointSelectionService: - Service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.openaiService)));
        
        // Check if there are any pending promises or timers
        console.log('🔍 EndpointSelectionService: Process debugging info:');
        console.log('🔍 EndpointSelectionService: - Process PID:', process.pid);
        console.log('🔍 EndpointSelectionService: - Process platform:', process.platform);
        console.log('🔍 EndpointSelectionService: - Process version:', process.version);
      }
      
      console.log('🔍 EndpointSelectionService: Creating main AI promise...');
      console.log('🔍 EndpointSelectionService: Main AI call starting at:', new Date().toISOString());
      
      const mainCallParams = {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 500
      };
      
      console.log('🔍 EndpointSelectionService: Main AI call parameters:', mainCallParams);
      console.log('🔍 EndpointSelectionService: Main AI call messages:', [
        { role: 'system', content: systemPrompt.substring(0, 100) + '...' },
        { role: 'user', content: userPrompt }
      ]);
      
      const aiPromise = this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], mainCallParams).then((result) => {
        console.log('🔍 EndpointSelectionService: AI promise resolved with result:', typeof result);
        console.log('🔍 EndpointSelectionService: Result length:', result?.length || 0);
        console.log('🔍 EndpointSelectionService: FULL RESULT:', result);
        console.log('🔍 EndpointSelectionService: Result preview:', result?.substring(0, 100) || 'N/A');
        console.log('🔍 EndpointSelectionService: AI promise resolved at:', new Date().toISOString());
        return result;
      }).catch((error) => {
        console.error('🔍 EndpointSelectionService: AI promise rejected with error:', error);
        console.error('🔍 EndpointSelectionService: Error type:', typeof error);
        console.error('🔍 EndpointSelectionService: Error message:', error?.message);
        console.error('🔍 EndpointSelectionService: Error stack:', error?.stack);
        console.error('🔍 EndpointSelectionService: Error code:', error?.code);
        console.error('🔍 EndpointSelectionService: Error status:', error?.status);
        console.error('🔍 EndpointSelectionService: Error response:', error?.response);
        console.error('🔍 EndpointSelectionService: Error name:', error?.name);
        console.error('🔍 EndpointSelectionService: Error constructor:', error?.constructor?.name);
        console.error('🔍 EndpointSelectionService: Full error object:', JSON.stringify(error, null, 2));
        console.error('🔍 EndpointSelectionService: AI promise rejected at:', new Date().toISOString());
        throw error;
      });
      
      console.log('🔍 EndpointSelectionService: Main AI promise created successfully');
      
      console.log('🔍 EndpointSelectionService: AI promise created successfully');

      console.log('🔍 EndpointSelectionService: AI promise created, starting race...');
      console.log('🔍 EndpointSelectionService: Starting Promise.race at:', new Date().toISOString());
      console.log('🔍 EndpointSelectionService: AI promise state:', aiPromise);
      console.log('🔍 EndpointSelectionService: Timeout promise state:', timeoutPromise);
      
      // Test Promise.race with a simple test first
      console.log('🔍 EndpointSelectionService: Testing Promise.race with simple test...');
      try {
        const testPromise1 = new Promise(resolve => setTimeout(() => resolve('test1'), 1000));
        const testPromise2 = new Promise(resolve => setTimeout(() => resolve('test2'), 2000));
        const testResult = await Promise.race([testPromise1, testPromise2]);
        console.log('🔍 EndpointSelectionService: Promise.race test successful:', testResult);
      } catch (error) {
        console.log('🔍 EndpointSelectionService: Promise.race test failed:', error);
      }
      
      // Add a progress check every second
      const progressInterval = setInterval(() => {
        console.log('🔍 EndpointSelectionService: Still waiting...', new Date().toISOString());
      }, 1000);
      
      try {
        const response = await Promise.race([aiPromise, timeoutPromise]);
        clearInterval(progressInterval);
        console.log('🔍 EndpointSelectionService: Race completed successfully at:', new Date().toISOString());
        console.log('🔍 EndpointSelectionService: Response received:', typeof response);
        console.log('🔍 EndpointSelectionService: Response content length:', typeof response === 'string' ? response.length : 'N/A');
        console.log('🔍 EndpointSelectionService: FULL RACE RESPONSE:', response);
        console.log('🔍 EndpointSelectionService: Response content preview:', typeof response === 'string' ? response.substring(0, 200) : 'N/A');

      // Parse AI response
        const result = this.parseAIEndpointSelection(response, request.connections);
      if (result) {
        console.log('🔍 EndpointSelectionService: AI selection result:', result);
        return result;
      }

      return null;
      } catch (error) {
        clearInterval(progressInterval);
        console.log('🔍 EndpointSelectionService: Race failed at:', new Date().toISOString());
        console.log('🔍 EndpointSelectionService: Error:', error);
        throw error;
      }

    } catch (error) {
      console.error('🔍 EndpointSelectionService: AI selection failed with error:', error);
      console.error('🔍 EndpointSelectionService: Error type:', typeof error);
      console.error('🔍 EndpointSelectionService: Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('🔍 EndpointSelectionService: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return null;
    }
  }

  /**
   * Rules-based endpoint selection (fallback)
   */
  private selectEndpointWithRules(request: EndpointSelectionRequest): EndpointSelectionResult {
    console.log('🔍 EndpointSelectionService: Using rules-based selection');

    const relevantEndpoints = this.filterRelevantEndpoints(request.connections, request.message);
    
    if (relevantEndpoints.length === 0) {
      // Return first available endpoint as fallback
      if (request.connections.length === 0) {
        throw new Error('No connections available for endpoint selection');
      }
      
      const firstConnection = request.connections[0];
      if (!firstConnection.endpoints || firstConnection.endpoints.length === 0) {
        throw new Error('No endpoints available in first connection');
      }
      
      const firstEndpoint = firstConnection.endpoints[0];
      
      return {
        connectionId: firstConnection.id,
        endpoint: firstEndpoint.path,
        method: firstEndpoint.method,
        reason: 'Fallback selection - no relevant endpoints found',
        confidence: 0.1,
        connectionName: firstConnection.name,
        endpointSummary: firstEndpoint.summary
      };
    }

    // Return the highest scored endpoint
    const bestEndpoint = relevantEndpoints[0];
    return {
      connectionId: bestEndpoint.connection.id,
      endpoint: bestEndpoint.endpoint.path,
      method: bestEndpoint.endpoint.method,
      reason: `Rules-based selection (score: ${bestEndpoint.score})`,
      confidence: Math.min(bestEndpoint.score / 10, 1.0), // Normalize score to 0-1
      connectionName: bestEndpoint.connection.name,
      endpointSummary: bestEndpoint.endpoint.summary
    };
  }

  /**
   * Build focused prompt for endpoint selection
   */
  private buildEndpointSelectionPrompt(
    relevantEndpoints: Array<{ connection: any; endpoint: any; score: number }>,
    guidanceResponse?: any
  ): string {
    // Create a much simpler, focused prompt
    const endpointsList = relevantEndpoints.map(({ connection, endpoint, score }) => 
      `${endpoint.method} ${endpoint.path} (${connection.id}) - ${endpoint.summary || 'No description'}`
    ).join('\n');

    let prompt = `Select the best API endpoint for the user request.

Available endpoints:
${endpointsList}

Rules:
- For "pending pets", "available pets", "sold pets": Use GET /pet/findByStatus
- For "pet by ID": Use GET /pet/{petId}
- For "create pet": Use POST /pet
- For "update pet": Use PUT /pet/{petId}
- For "delete pet": Use DELETE /pet/{petId}

Return JSON:
{
  "connectionId": "exact_connection_id",
  "endpoint": "/exact/path", 
  "method": "GET",
  "reason": "Brief explanation",
  "confidence": 0.9
}`;

    return prompt;
  }

  /**
   * Parse AI response for endpoint selection
   */
  private parseAIEndpointSelection(
    content: string,
    connections: EndpointSelectionRequest['connections']
  ): EndpointSelectionResult | null {
    try {
      // Clean up markdown formatting if present
      let cleanContent = content;
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const result = JSON.parse(cleanContent);
      
      // Validate the result
      if (!result.connectionId || !result.endpoint || !result.method) {
        console.log('🔍 EndpointSelectionService: Invalid AI response format');
        return null;
      }

      // Find the connection and endpoint details
      const connection = connections.find(conn => conn.id === result.connectionId);
      if (!connection) {
        console.log('🔍 EndpointSelectionService: Connection not found:', result.connectionId);
        return null;
      }

      const endpoint = connection.endpoints.find(ep => 
        ep.path === result.endpoint && ep.method.toUpperCase() === result.method.toUpperCase()
      );

      if (!endpoint) {
        console.log('🔍 EndpointSelectionService: Endpoint not found:', result.endpoint, result.method);
        return null;
      }

      return {
        connectionId: result.connectionId,
        endpoint: result.endpoint,
        method: result.method,
        reason: result.reason || 'AI-selected endpoint',
        confidence: Math.max(0, Math.min(1, result.confidence || 0.8)),
        connectionName: connection.name,
        endpointSummary: endpoint.summary
      };

    } catch (error) {
      console.error('🔍 EndpointSelectionService: Failed to parse AI response:', error);
      return null;
    }
  }

  /**
   * Filter endpoints based on user context to avoid token limits
   * Extracted from NaturalLanguageWorkflowService
   */
  private filterRelevantEndpoints(
    connections: EndpointSelectionRequest['connections'], 
    userDescription?: string
  ): Array<{ connection: any; endpoint: any; score: number }> {
    if (!userDescription) {
      // If no context, return a limited set of endpoints (max 20 total)
      return this.getLimitedEndpoints(connections, 20);
    }

    const userText = userDescription.toLowerCase();
    const relevantEndpoints: Array<{ connection: any; endpoint: any; score: number }> = [];

    // Define context keywords and their associated endpoint patterns
    const contextPatterns = {
      // GitHub patterns
      github: {
        keywords: ['github', 'issue', 'pull request', 'pr', 'repository', 'repo', 'commit', 'branch'],
        endpointPatterns: ['issue', 'pull', 'repo', 'commit', 'branch', 'webhook']
      },
      // Slack patterns
      slack: {
        keywords: ['slack', 'notification', 'message', 'channel', 'chat', 'alert'],
        endpointPatterns: ['message', 'chat', 'notification', 'channel', 'post']
      },
      // Email patterns
      email: {
        keywords: ['email', 'mail', 'sendgrid', 'notification', 'alert', 'message'],
        endpointPatterns: ['mail', 'email', 'send', 'notification']
      },
      // Payment patterns
      payment: {
        keywords: ['payment', 'stripe', 'charge', 'invoice', 'billing', 'subscription'],
        endpointPatterns: ['charge', 'payment', 'invoice', 'subscription', 'billing']
      },
      // E-commerce patterns
      ecommerce: {
        keywords: ['shopify', 'order', 'product', 'inventory', 'customer', 'ecommerce'],
        endpointPatterns: ['order', 'product', 'inventory', 'customer', 'shop']
      },
      // QuickBooks patterns
      quickbooks: {
        keywords: ['quickbooks', 'invoice', 'accounting', 'billing', 'payment'],
        endpointPatterns: ['invoice', 'customer', 'payment', 'account']
      },
      // ShipStation patterns
      shipstation: {
        keywords: ['shipstation', 'shipping', 'label', 'fulfillment', 'package'],
        endpointPatterns: ['label', 'shipment', 'order', 'package']
      },
      // Project management patterns
      project: {
        keywords: ['trello', 'card', 'board', 'task', 'project', 'kanban'],
        endpointPatterns: ['card', 'board', 'list', 'task', 'project']
      },
      // Petstore patterns
      petstore: {
        keywords: ['pet', 'pets', 'petstore', 'available', 'sold', 'pending', 'status', 'find', 'get', 'create', 'update', 'delete'],
        endpointPatterns: ['pet', 'findByStatus', 'findByTags', 'inventory', 'order']
      }
    };

    // Score each endpoint based on relevance
    for (const connection of connections) {
      for (const endpoint of connection.endpoints) {
        let relevanceScore = 0;
        const endpointText = `${endpoint.summary} ${endpoint.path} ${endpoint.method}`.toLowerCase();

        // Check against context patterns
        for (const [category, patterns] of Object.entries(contextPatterns)) {
          const keywordMatches = patterns.keywords.filter(keyword => userText.includes(keyword)).length;
          const endpointMatches = patterns.endpointPatterns.filter(pattern => 
            endpointText.includes(pattern)
          ).length;

          if (keywordMatches > 0 && endpointMatches > 0) {
            relevanceScore += (keywordMatches * 2) + endpointMatches;
          }
        }

        // Always include health/status endpoints with low priority
        if (endpointText.includes('health') || endpointText.includes('status')) {
          relevanceScore += 0.5;
        }

        // Include endpoints with high relevance scores
        if (relevanceScore > 0) {
          relevantEndpoints.push({ connection, endpoint, score: relevanceScore });
        }
      }
    }

    // Sort by relevance score and limit to prevent token overflow
    const sortedEndpoints = relevantEndpoints
      .sort((a, b) => b.score - a.score)
      .slice(0, 15) // Limit to 15 most relevant endpoints
      .map(({ connection, endpoint, score }) => ({ connection, endpoint, score }));

    // If we don't have enough relevant endpoints, add some general ones
    if (sortedEndpoints.length < 5) {
      const generalEndpoints = this.getLimitedEndpoints(connections, 10);
      sortedEndpoints.push(...generalEndpoints);
    }

    return sortedEndpoints;
  }

  /**
   * Get a limited number of endpoints from all connections
   */
  private getLimitedEndpoints(connections: EndpointSelectionRequest['connections'], maxTotal: number): Array<{ connection: any; endpoint: any; score: number }> {
    const endpoints: Array<{ connection: any; endpoint: any; score: number }> = [];
    const maxPerConnection = Math.ceil(maxTotal / connections.length);

    for (const connection of connections) {
      const connectionEndpoints = connection.endpoints.slice(0, maxPerConnection);
      for (const endpoint of connectionEndpoints) {
        endpoints.push({ connection, endpoint, score: 0.1 }); // Low score for general endpoints
      }
    }

    return endpoints.slice(0, maxTotal);
  }
}

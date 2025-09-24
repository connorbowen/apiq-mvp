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
      const aiResult = await this.selectEndpointWithAI(request);
      if (aiResult) {
        console.log('🔍 EndpointSelectionService: AI selection successful');
        return aiResult;
      }

      // Fallback to rules-based selection
      console.log('🔍 EndpointSelectionService: Falling back to rules-based selection');
      return this.selectEndpointWithRules(request);

    } catch (error) {
      console.error('🔍 EndpointSelectionService: Error during endpoint selection:', error);
      // Final fallback to rules-based selection
      return this.selectEndpointWithRules(request);
    }
  }

  /**
   * AI-powered endpoint selection using focused prompt
   */
  private async selectEndpointWithAI(request: EndpointSelectionRequest): Promise<EndpointSelectionResult | null> {
    try {
      // Filter relevant endpoints to avoid token limits
      const relevantEndpoints = this.filterRelevantEndpoints(request.connections, request.message);
      
      if (relevantEndpoints.length === 0) {
        console.log('🔍 EndpointSelectionService: No relevant endpoints found for AI selection');
        return null;
      }

      // Build focused prompt for endpoint selection
      const systemPrompt = this.buildEndpointSelectionPrompt(relevantEndpoints, request.guidanceResponse);
      const userPrompt = `Select the best endpoint for this request: "${request.message}"`;

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 500
      });

      // chatCompletion returns a string when no functions are used
      const content = typeof response === 'string' ? response : response.choices?.[0]?.message?.content;
      if (!content) {
        console.log('🔍 EndpointSelectionService: No content from AI response');
        return null;
      }

      // Parse AI response
      const result = this.parseAIEndpointSelection(content, request.connections);
      if (result) {
        console.log('🔍 EndpointSelectionService: AI selection result:', result);
        return result;
      }

      return null;

    } catch (error) {
      console.error('🔍 EndpointSelectionService: AI selection failed:', error);
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
    const endpointsInfo = relevantEndpoints.map(({ connection, endpoint, score }) => 
      `**${connection.name}** (${connection.id})
- ${endpoint.method} ${endpoint.path}: ${endpoint.summary || 'No description'}
- Relevance Score: ${score}`
    ).join('\n\n');

    let prompt = `You are an expert at selecting the most appropriate API endpoint for user requests.

Available Endpoints:
${endpointsInfo}

Your task: Given a user's request, select the single best endpoint.

Selection Rules:
1. For specific items by ID: Use endpoints with path parameters like "/pet/{petId}"
2. For filtered lists: Use endpoints with query parameters like "/pet/findByStatus"  
3. For collections: Use general listing endpoints like "/pets"
4. For creating resources: Use POST endpoints
5. For updating resources: Use PUT/PATCH endpoints
6. For deleting resources: Use DELETE endpoints

${guidanceResponse && guidanceResponse.details && guidanceResponse.details.requiredApis ? `
🚨 CRITICAL GUIDANCE: The connection guidance service suggests these endpoints:
${guidanceResponse.details.requiredApis.map((api: any) => 
  `- ${api.displayName}: ${api.suggestedEndpoints.join(', ')} (${api.reason})`
).join('\n')}

PRIORITIZE these suggested endpoints over your own analysis.
` : ''}

Return JSON in this format:
{
  "connectionId": "exact_connection_id",
  "endpoint": "/exact/path",
  "method": "GET",
  "reason": "Why this endpoint is the best choice",
  "confidence": 0.0-1.0
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

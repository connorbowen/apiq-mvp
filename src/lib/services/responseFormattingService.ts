/**
 * Response Formatting Service
 * 
 * Centralized service for formatting API call results into user-friendly responses.
 * 
 * Features:
 * - AI-powered response formatting with focused prompts
 * - Context-aware explanations and suggestions
 * - Error handling and user-friendly error messages
 * - Consistent response structure across all features
 * 
 * Used by:
 * - Direct API calls (chat)
 * - Workflow execution results
 * - API Explorer responses
 */

import { OpenAIService } from '../../services/openaiService';

export interface FormattedResponse {
  explanation: string;
  suggestedActions: string[];
  formattedData?: any;
  success: boolean;
  confidence: number;
}

export interface ResponseFormattingRequest {
  apiResult: {
    method: string;
    url: string;
    statusCode: number;
    responseData: any;
    responseHeaders?: Record<string, string>;
    executionTime: number;
    error?: string;
  };
  userMessage: string;
  context: any[];
  connectionName?: string;
  endpointSummary?: string;
}

export class ResponseFormattingService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Format API call result into user-friendly response
   */
  async formatApiResponse(request: ResponseFormattingRequest): Promise<FormattedResponse> {
    try {
      console.log('🔍 ResponseFormattingService: Starting response formatting');
      console.log('🔍 ResponseFormattingService: Status code:', request.apiResult.statusCode);
      console.log('🔍 ResponseFormattingService: Has error:', !!request.apiResult.error);

      // Handle error responses
      if (request.apiResult.error || request.apiResult.statusCode >= 400) {
        return this.formatErrorResponse(request);
      }

      // Handle successful responses
      return await this.formatSuccessResponse(request);

    } catch (error) {
      console.error('🔍 ResponseFormattingService: Error during response formatting:', error);
      return this.formatFallbackResponse(request);
    }
  }

  /**
   * Format successful API responses using AI
   */
  private async formatSuccessResponse(request: ResponseFormattingRequest): Promise<FormattedResponse> {
    try {
      // Build focused prompt for response formatting
      const systemPrompt = this.buildResponseFormattingPrompt();
      const userPrompt = this.buildUserPrompt(request);

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500
      });

      // chatCompletion returns a string when no functions are used
      const content = typeof response === 'string' ? response : response.choices?.[0]?.message?.content;
      if (!content) {
        console.log('🔍 ResponseFormattingService: No content from AI response');
        return this.formatFallbackResponse(request);
      }

      // Parse AI response
      const result = this.parseAIResponse(content);
      if (result) {
        console.log('🔍 ResponseFormattingService: AI formatting successful');
        return result;
      }

      return this.formatFallbackResponse(request);

    } catch (error) {
      console.error('🔍 ResponseFormattingService: AI formatting failed:', error);
      return this.formatFallbackResponse(request);
    }
  }

  /**
   * Format error responses
   */
  private formatErrorResponse(request: ResponseFormattingRequest): FormattedResponse {
    const { apiResult, userMessage, connectionName } = request;
    
    let explanation = `I encountered an issue with your request.`;
    let suggestedActions: string[] = [];

    if (apiResult.statusCode === 401) {
      explanation = `I couldn't access the ${connectionName || 'API'} because the authentication failed.`;
      suggestedActions = [
        'Check your API credentials',
        'Verify your connection settings',
        'Try reconnecting to the API'
      ];
    } else if (apiResult.statusCode === 403) {
      explanation = `I don't have permission to access the ${connectionName || 'API'} resource.`;
      suggestedActions = [
        'Check your API permissions',
        'Verify your account access level',
        'Contact your API administrator'
      ];
    } else if (apiResult.statusCode === 404) {
      explanation = `The requested resource wasn't found in the ${connectionName || 'API'}.`;
      suggestedActions = [
        'Check if the endpoint URL is correct',
        'Verify the resource exists',
        'Try a different endpoint'
      ];
    } else if (apiResult.statusCode >= 500) {
      explanation = `The ${connectionName || 'API'} server is experiencing issues.`;
      suggestedActions = [
        'Try again in a few minutes',
        'Check the API status page',
        'Contact API support if the issue persists'
      ];
    } else {
      explanation = `The API request failed with status ${apiResult.statusCode}.`;
      suggestedActions = [
        'Check your request parameters',
        'Verify the API endpoint',
        'Try a different approach'
      ];
    }

    if (apiResult.error) {
      explanation += ` Error: ${apiResult.error}`;
    }

    return {
      explanation,
      suggestedActions,
      success: false,
      confidence: 0.8
    };
  }

  /**
   * Fallback response formatting when AI fails
   */
  private formatFallbackResponse(request: ResponseFormattingRequest): FormattedResponse {
    const { apiResult, userMessage, connectionName } = request;
    
    if (apiResult.error || apiResult.statusCode >= 400) {
      return {
        explanation: `The API call failed. ${apiResult.error || `Status: ${apiResult.statusCode}`}`,
        suggestedActions: ['Check your request and try again'],
        success: false,
        confidence: 0.5
      };
    }

    const dataCount = Array.isArray(apiResult.responseData) 
      ? apiResult.responseData.length 
      : apiResult.responseData ? 1 : 0;

    let explanation = `Successfully retrieved data from ${connectionName || 'the API'}.`;
    if (dataCount > 0) {
      explanation += ` Found ${dataCount} ${dataCount === 1 ? 'item' : 'items'}.`;
    } else {
      explanation += ` Found 0 items.`;
    }

    return {
      explanation,
      suggestedActions: [
        'You can now use this data in workflows',
        'Try filtering or searching for specific items',
        'Create automated workflows with this data'
      ],
      success: true,
      confidence: 0.7
    };
  }

  /**
   * Build focused prompt for response formatting
   */
  private buildResponseFormattingPrompt(): string {
    return `You are a helpful AI assistant that formats API responses into user-friendly explanations.

Your task: Convert API call results into clear, encouraging explanations that help users understand what happened and what they can do next.

Guidelines:
- Use "I'll help you..." or "Let me..." to start explanations
- Be encouraging and positive
- Explain what the user will get back in simple terms
- Use natural language, not technical jargon
- Make the user feel like they're working with a helpful assistant
- Provide specific, actionable suggestions for next steps

Response Format:
Return JSON in this format:
{
  "explanation": "Friendly explanation of what the API call accomplished",
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "success": true,
  "confidence": 0.0-1.0
}

Examples:
- For successful data retrieval: "I found 5 items for you! Here's what I retrieved..."
- For empty results: "I searched for that, but didn't find any matching items. Try..."
- For data creation: "Successfully created your new item! Here's what was added..."`;
  }

  /**
   * Build user prompt with API result context
   */
  private buildUserPrompt(request: ResponseFormattingRequest): string {
    const { apiResult, userMessage, connectionName, endpointSummary } = request;
    
    let prompt = `User Request: "${userMessage}"\n\n`;
    
    if (connectionName) {
      prompt += `API: ${connectionName}\n`;
    }
    
    if (endpointSummary) {
      prompt += `Endpoint: ${endpointSummary}\n`;
    }
    
    prompt += `Method: ${apiResult.method}\n`;
    prompt += `Status: ${apiResult.statusCode}\n`;
    prompt += `Execution Time: ${apiResult.executionTime}ms\n\n`;
    
    if (apiResult.responseData) {
      prompt += `Response Data: ${JSON.stringify(apiResult.responseData).substring(0, 500)}${JSON.stringify(apiResult.responseData).length > 500 ? '...' : ''}\n`;
    }
    
    if (apiResult.error) {
      prompt += `Error: ${apiResult.error}\n`;
    }
    
    return prompt;
  }

  /**
   * Parse AI response for formatted response
   */
  private parseAIResponse(content: string): FormattedResponse | null {
    try {
      // Clean up markdown formatting if present
      let cleanContent = content;
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const result = JSON.parse(cleanContent);
      
      // Validate the result
      if (!result.explanation || !Array.isArray(result.suggestedActions)) {
        console.log('🔍 ResponseFormattingService: Invalid AI response format');
        return null;
      }

      return {
        explanation: result.explanation,
        suggestedActions: result.suggestedActions,
        success: result.success !== false, // Default to true if not specified
        confidence: Math.max(0, Math.min(1, result.confidence || 0.8))
      };

    } catch (error) {
      console.error('🔍 ResponseFormattingService: Failed to parse AI response:', error);
      return null;
    }
  }
}

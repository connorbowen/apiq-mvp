/**
 * Direct API Call Orchestrator
 * 
 * Coordinates the three specialized services for direct API call execution:
 * 1. EndpointSelectionService - Select the appropriate endpoint
 * 2. NaturalLanguageParameterExtractor - Extract parameter values from natural language
 * 3. ResponseFormattingService - Format API results into user-friendly responses
 * 
 * This replaces the monolithic prompt approach with focused, maintainable services.
 */

import { EndpointSelectionService, EndpointSelectionResult } from './endpointSelectionService';
import { NaturalLanguageParameterExtractor } from './naturalLanguageParameterExtractor';
import { ResponseFormattingService, FormattedResponse } from './responseFormattingService';
import { OpenAIService } from '../../services/openaiService';

export interface DirectApiCallRequest {
  message: string;
  availableConnections: Array<{
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
  context: any[];
  guidanceResponse?: any;
}

export interface DirectApiCallResult {
  intent: 'api_call' | 'workflow_creation' | 'general_chat';
  apiCallResult?: {
    method: string;
    url: string;
    parameters: Record<string, any>;
    requestBody?: any;
    headers?: Record<string, string>;
    connectionId: string;
  };
  explanation: string;
  suggestedAction?: string;
  success: boolean;
  error?: string;
}

export class DirectApiCallOrchestrator {
  private endpointSelectionService: EndpointSelectionService;
  private parameterExtractionService: NaturalLanguageParameterExtractor;
  private responseFormattingService: ResponseFormattingService;

  constructor(openaiService: OpenAIService) {
    this.endpointSelectionService = new EndpointSelectionService(openaiService);
    this.parameterExtractionService = new NaturalLanguageParameterExtractor(openaiService);
    this.responseFormattingService = new ResponseFormattingService(openaiService);
  }

  /**
   * Process direct API call request using multi-prompt architecture
   */
  async processDirectApiCall(request: DirectApiCallRequest): Promise<DirectApiCallResult> {
    try {
      console.log('🔍 DirectApiCallOrchestrator: Starting multi-prompt processing');
      console.log('🔍 DirectApiCallOrchestrator: Message:', request.message);
      console.log('🔍 DirectApiCallOrchestrator: Connections:', request.availableConnections.length);

      // Step 1: Select the appropriate endpoint
      const endpointSelection = await this.selectEndpoint(request);
      if (!endpointSelection.success) {
        return {
          intent: 'general_chat',
          explanation: endpointSelection.error || 'Failed to select endpoint',
          success: false,
          error: endpointSelection.error
        };
      }

      // Step 2: Extract parameters from natural language
      const parameterExtraction = await this.extractParameters(request, endpointSelection.data!);
      if (!parameterExtraction.success) {
        return {
          intent: 'general_chat',
          explanation: parameterExtraction.error || 'Failed to extract parameters',
          success: false,
          error: parameterExtraction.error
        };
      }

      // Step 3: Build API call result
      const apiCallResult = {
        method: endpointSelection.data!.method,
        url: endpointSelection.data!.endpoint,
        parameters: parameterExtraction.data!.parameters,
        requestBody: parameterExtraction.data!.requestBody,
        headers: parameterExtraction.data!.headers,
        connectionId: endpointSelection.data!.connectionId
      };

      // Step 4: Format response (this will be used after API execution)
      const responseFormatting = await this.formatResponse(request, {
        method: apiCallResult.method,
        url: apiCallResult.url,
        statusCode: 200, // Placeholder - will be updated after execution
        responseData: null, // Placeholder - will be updated after execution
        executionTime: 0 // Placeholder - will be updated after execution
      });

      console.log('🔍 DirectApiCallOrchestrator: Multi-prompt processing completed successfully');

      return {
        intent: 'api_call',
        apiCallResult,
        explanation: responseFormatting.data!.explanation,
        suggestedAction: responseFormatting.data!.suggestedActions[0],
        success: true
      };

    } catch (error) {
      console.error('🔍 DirectApiCallOrchestrator: Error during processing:', error);
      return {
        intent: 'general_chat',
        explanation: 'I encountered an error while processing your request. Please try again.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Step 1: Select the appropriate endpoint
   */
  private async selectEndpoint(request: DirectApiCallRequest): Promise<{
    success: boolean;
    data?: EndpointSelectionResult;
    error?: string;
  }> {
    try {
      console.log('🔍 DirectApiCallOrchestrator: Step 1 - Endpoint selection');
      
      const result = await this.endpointSelectionService.selectEndpoint({
        message: request.message,
        connections: request.availableConnections,
        guidanceResponse: request.guidanceResponse
      });

      console.log('🔍 DirectApiCallOrchestrator: Endpoint selected:', {
        connectionId: result.connectionId,
        endpoint: result.endpoint,
        method: result.method,
        confidence: result.confidence
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('🔍 DirectApiCallOrchestrator: Endpoint selection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Endpoint selection failed'
      };
    }
  }

  /**
   * Step 2: Extract parameters from natural language
   */
  private async extractParameters(
    request: DirectApiCallRequest,
    endpointSelection: EndpointSelectionResult
  ): Promise<{
    success: boolean;
    data?: {
      parameters: Record<string, any>;
      requestBody?: any;
      headers?: Record<string, string>;
    };
    error?: string;
  }> {
    try {
      console.log('🔍 DirectApiCallOrchestrator: Step 2 - Parameter extraction');

      // Find the selected endpoint details
      const connection = request.availableConnections.find(conn => conn.id === endpointSelection.connectionId);
      if (!connection) {
        throw new Error('Connection not found for parameter extraction');
      }

      const endpoint = connection.endpoints.find(ep => 
        ep.path === endpointSelection.endpoint && ep.method.toUpperCase() === endpointSelection.method.toUpperCase()
      );

      if (!endpoint) {
        throw new Error('Endpoint not found for parameter extraction');
      }

      // Use AI parameter extraction service
      const result = await this.parameterExtractionService.extractParameterValues(
        request.message,
        {
          path: endpoint.path,
          method: endpoint.method,
          parameters: endpoint.parameters || [],
          summary: endpoint.summary
        },
        { conversationHistory: request.context }
      );

      console.log('🔍 DirectApiCallOrchestrator: Parameters extracted:', {
        parameterCount: Object.keys(result.parameters).length,
        confidence: result.confidence
      });

      return {
        success: true,
        data: {
          parameters: result.parameters,
          requestBody: result.parameters, // Use parameters as requestBody for POST requests
          headers: undefined // Will be handled by the parameter extraction service
        }
      };

    } catch (error) {
      console.error('🔍 DirectApiCallOrchestrator: Parameter extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parameter extraction failed'
      };
    }
  }

  /**
   * Step 3: Format response (placeholder for now, will be used after API execution)
   */
  private async formatResponse(
    request: DirectApiCallRequest,
    apiResult: {
      method: string;
      url: string;
      statusCode: number;
      responseData: any;
      executionTime: number;
    }
  ): Promise<{
    success: boolean;
    data?: FormattedResponse;
    error?: string;
  }> {
    try {
      console.log('🔍 DirectApiCallOrchestrator: Step 3 - Response formatting');

      const result = await this.responseFormattingService.formatApiResponse({
        apiResult,
        userMessage: request.message,
        context: request.context,
        connectionName: request.availableConnections.find(conn => 
          conn.endpoints.some(ep => ep.path === apiResult.url && ep.method === apiResult.method)
        )?.name,
        endpointSummary: request.availableConnections.find(conn => 
          conn.endpoints.some(ep => ep.path === apiResult.url && ep.method === apiResult.method)
        )?.endpoints.find(ep => ep.path === apiResult.url && ep.method === apiResult.method)?.summary
      });

      console.log('🔍 DirectApiCallOrchestrator: Response formatted:', {
        explanation: result.explanation.substring(0, 100) + '...',
        suggestedActions: result.suggestedActions.length,
        confidence: result.confidence
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('🔍 DirectApiCallOrchestrator: Response formatting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Response formatting failed'
      };
    }
  }
}

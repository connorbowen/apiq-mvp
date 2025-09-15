/**
 * Parameter Extraction Service
 * 
 * Centralized service for extracting and processing API parameters
 * with natural language understanding capabilities.
 * 
 * This service is used across:
 * - API ingestion (enhance stored parameters)
 * - Direct API calls (chat)
 * - Workflow generation
 * - API Explorer
 * 
 * Now uses AI for intelligent parameter extraction with fallback to rules-based patterns
 */

import { AIParameterExtractionService, AIParameterExtractionResult } from './aiParameterExtractionService';
import { OpenAIService } from '../../services/openaiService';

// Simple logger for browser compatibility
const logInfo = (message: string, meta?: any) => {
  if (typeof window === 'undefined') {
    console.log(`[INFO] ${message}`, meta || '');
  }
};

const logError = (message: string, error: Error, meta?: any) => {
  if (typeof window === 'undefined') {
    console.error(`[ERROR] ${message}`, error, meta || '');
  }
};

export interface ParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  location: 'query' | 'path' | 'header' | 'body';
  examples?: string[];
  naturalLanguageMappings?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface EnhancedEndpoint {
  id: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters: ParameterSchema[];
  requestBody?: any;
  responses?: any;
  naturalLanguageDescription?: string;
}

export class ParameterExtractionService {
  /**
   * Extract and enhance parameters from OpenAPI operation
   */
  static async extractParameterSchemas(
    operation: any, 
    openaiService?: any,
    endpointContext?: string
  ): Promise<ParameterSchema[]> {
    const schemas: ParameterSchema[] = [];
    
    if (!operation.parameters) {
      return schemas;
    }

    for (const param of operation.parameters) {
      // Determine parameter type - handle both OpenAPI 2.0 and 3.0 formats
      let paramType = 'string';
      if (param.schema) {
        // OpenAPI 2.0 body parameter or OpenAPI 3.0 parameter with schema
        if (param.schema.$ref) {
          // Schema reference - treat as object
          paramType = 'object';
        } else if (param.schema.type) {
          // Direct type
          paramType = param.schema.type;
        }
      } else if (param.type) {
        // OpenAPI 2.0 non-body parameter with direct type
        paramType = param.type;
      }

      // Generate natural language mappings using AI if available
      const naturalLanguageMappings = await this.generateNaturalLanguageMappings(
        param, 
        openaiService, 
        endpointContext
      );

      const schema: ParameterSchema = {
        name: param.name,
        type: this.mapOpenApiTypeToParameterType(paramType),
        required: param.required || false,
        description: param.description,
        location: param.in,
        examples: this.extractExamples(param),
        naturalLanguageMappings,
        validation: this.extractValidationRules(param)
      };

      schemas.push(schema);
    }

    return schemas;
  }

  /**
   * Generate natural language mappings for a parameter using AI
   */
  private static async generateNaturalLanguageMappings(
    param: any, 
    openaiService?: any,
    endpointContext?: string
  ): Promise<string[]> {
    // If no OpenAI service provided, use basic patterns
    if (!openaiService) {
      return this.generateBasicMappings(param);
    }

    try {
      const aiExtractionService = new AIParameterExtractionService(openaiService);
      
      const mappings = await aiExtractionService.generateParameterMappings(
        param,
        endpointContext || '',
        ''
      );

      return mappings;

    } catch (error) {
      logError('AI parameter mapping generation failed, using basic patterns', error as Error, {
        paramName: param.name
      });
      
      return this.generateBasicMappings(param);
    }
  }

  /**
   * Generate basic natural language mappings as fallback
   */
  private static generateBasicMappings(param: any): string[] {
    const mappings: string[] = [];
    const name = param.name.toLowerCase();
    const description = (param.description || '').toLowerCase();

    // Common parameter patterns
    const patterns = {
      id: ['id', 'identifier', 'key', 'primary key'],
      status: ['status', 'state', 'condition'],
      name: ['name', 'title', 'label'],
      email: ['email', 'email address', 'e-mail'],
      date: ['date', 'time', 'timestamp', 'created', 'updated'],
      limit: ['limit', 'count', 'size', 'max', 'maximum'],
      offset: ['offset', 'skip', 'page', 'start'],
      search: ['search', 'query', 'filter', 'find'],
      sort: ['sort', 'order', 'order by'],
      tags: ['tags', 'categories', 'labels', 'keywords']
    };

    // Find matching patterns
    for (const [key, values] of Object.entries(patterns)) {
      if (name.includes(key) || values.some(v => name.includes(v) || description.includes(v))) {
        mappings.push(...values);
      }
    }

    // Add specific values for enum parameters
    if (param.schema?.enum) {
      mappings.push(...param.schema.enum.map((v: string) => v.toLowerCase()));
    }

    // Add the parameter name itself
    mappings.push(name);

    return Array.from(new Set(mappings)); // Remove duplicates
  }

  /**
   * Extract examples from parameter
   */
  private static extractExamples(param: any): string[] {
    const examples: string[] = [];

    // From schema examples
    if (param.schema?.example) {
      examples.push(String(param.schema.example));
    }

    // From parameter examples
    if (param.example) {
      examples.push(String(param.example));
    }

    // From enum values
    if (param.schema?.enum) {
      examples.push(...param.schema.enum.slice(0, 3).map((v: any) => String(v)));
    }

    return examples;
  }

  /**
   * Extract validation rules from parameter
   */
  private static extractValidationRules(param: any): ParameterSchema['validation'] {
    const validation: ParameterSchema['validation'] = {};

    if (param.schema) {
      if (param.schema.minimum !== undefined) validation.min = param.schema.minimum;
      if (param.schema.maximum !== undefined) validation.max = param.schema.maximum;
      if (param.schema.pattern) validation.pattern = param.schema.pattern;
      if (param.schema.enum) validation.enum = param.schema.enum;
    }

    return Object.keys(validation).length > 0 ? validation : undefined;
  }

  /**
   * Map OpenAPI type to parameter type
   */
  private static mapOpenApiTypeToParameterType(openApiType: string): ParameterSchema['type'] {
    const typeMap: Record<string, ParameterSchema['type']> = {
      'string': 'string',
      'integer': 'number',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object'
    };

    return typeMap[openApiType] || 'string';
  }

  /**
   * Extract parameters from natural language using AI
   */
  static async extractParametersFromNaturalLanguage(
    message: string,
    endpoint: EnhancedEndpoint,
    openaiService: any,
    context: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    try {
      // Use AI-powered parameter extraction
      const aiExtractionService = new AIParameterExtractionService(openaiService);
      
      const aiResult = await aiExtractionService.extractParametersFromNaturalLanguage(
        message,
        endpoint,
        context
      );

      logInfo('AI parameter extraction completed', {
        message: message.substring(0, 100),
        endpointId: endpoint.id,
        extractedCount: Object.keys(aiResult.parameters).length,
        confidence: aiResult.confidence
      });

      return aiResult.parameters;

    } catch (error) {
      logError('AI parameter extraction failed, falling back to rules', error as Error, {
        message,
        endpointId: endpoint.id
      });
      
      // Fallback to original rules-based extraction
      return this.fallbackRulesExtraction(message, endpoint, openaiService);
    }
  }

  /**
   * Fallback to rules-based parameter extraction if AI fails
   */
  private static async fallbackRulesExtraction(
    message: string,
    endpoint: EnhancedEndpoint,
    openaiService: any
  ): Promise<Record<string, any>> {
    try {
      const systemPrompt = this.buildParameterExtractionPrompt(endpoint);
      
      const response = await openaiService.client.chat.completions.create({
        model: openaiService.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const extractedParams = JSON.parse(result);
      return extractedParams.parameters || {};

    } catch (error) {
      logError('Failed to extract parameters from natural language', error as Error, {
        message,
        endpointId: endpoint.id
      });
      return {};
    }
  }

  /**
   * Build system prompt for parameter extraction
   */
  private static buildParameterExtractionPrompt(endpoint: EnhancedEndpoint): string {
    const parameterDescriptions = endpoint.parameters.map(param => {
      const mappings = param.naturalLanguageMappings?.join(', ') || param.name;
      const examples = param.examples?.length ? ` (examples: ${param.examples.join(', ')})` : '';
      const required = param.required ? ' (REQUIRED)' : ' (optional)';
      
      return `- ${param.name}${required}: ${param.description || 'No description'} 
        Natural language: ${mappings}${examples}`;
    }).join('\n');

    return `You are an AI assistant that extracts parameters from natural language for API calls.

Endpoint: ${endpoint.method} ${endpoint.path}
Description: ${endpoint.description || endpoint.summary || 'No description'}

Available Parameters:
${parameterDescriptions}

Your task:
1. Extract parameter values from the user's natural language message
2. Map natural language terms to the correct parameter names
3. Use examples and descriptions to understand the expected values
4. Return a JSON object with the extracted parameters

Examples:
- "Find pets with status available" → {"status": "available"}
- "Get user by ID 123" → {"id": "123"}
- "Search for John's email" → {"email": "john@testuser.local"}

Return only a JSON object in this format:
{
  "parameters": {
    "paramName": "extractedValue"
  }
}`;
  }

  /**
   * Enhance endpoint with parameter intelligence
   */
  static async enhanceEndpoint(
    endpoint: any, 
    openaiService?: any,
    endpointContext?: string
  ): Promise<EnhancedEndpoint> {
    const enhancedParams = await this.extractParameterSchemas(endpoint, openaiService, endpointContext);
    
    return {
      ...endpoint,
      parameters: enhancedParams,
      naturalLanguageDescription: this.generateNaturalLanguageDescription(endpoint, enhancedParams)
    };
  }

  /**
   * Generate natural language description for endpoint
   */
  private static generateNaturalLanguageDescription(
    endpoint: any, 
    parameters: ParameterSchema[]
  ): string {
    const paramDescriptions = parameters
      .filter(p => p.required)
      .map(p => `${p.name} (${p.naturalLanguageMappings?.join(' or ') || p.name})`)
      .join(', ');

    const optionalParams = parameters
      .filter(p => !p.required)
      .map(p => p.name)
      .join(', ');

    let description = `${endpoint.method} ${endpoint.path}`;
    if (paramDescriptions) {
      description += ` - requires: ${paramDescriptions}`;
    }
    if (optionalParams) {
      description += ` - optional: ${optionalParams}`;
    }

    return description;
  }
}

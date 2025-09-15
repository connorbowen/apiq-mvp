/**
 * AI-Powered Parameter Extraction Service
 * 
 * Uses AI to intelligently extract and map API parameters from natural language
 * instead of relying on hard-coded pattern matching.
 */

import { OpenAIService } from '../../services/openaiService';
import { ParameterSchema } from './parameterExtractionService';

export interface AIParameterMapping {
  parameterName: string;
  extractedValue: any;
  confidence: number;
  reasoning: string;
  alternatives?: string[];
}

export interface AIParameterExtractionResult {
  parameters: Record<string, any>;
  mappings: AIParameterMapping[];
  confidence: number;
  suggestions?: string[];
}

export class AIParameterExtractionService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Extract parameters from natural language using AI
   */
  async extractParametersFromNaturalLanguage(
    message: string,
    endpoint: { 
      path: string; 
      method: string; 
      parameters: ParameterSchema[];
      summary?: string;
      description?: string;
    },
    context: Record<string, any> = {}
  ): Promise<AIParameterExtractionResult> {
    try {
      const systemPrompt = this.buildParameterExtractionPrompt(endpoint);
      
      const response = await (this.openaiService as any).client.chat.completions.create({
        model: (this.openaiService as any).model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User request: "${message}"\nContext: ${JSON.stringify(context, null, 2)}` }
        ],
        functions: [
          {
            name: 'extract_parameters',
            description: 'Extract API parameters from natural language with confidence scoring',
            parameters: {
              type: 'object',
              properties: {
                parameters: {
                  type: 'object',
                  description: 'Extracted parameter values'
                },
                mappings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      parameterName: { type: 'string' },
                      extractedValue: { type: 'string' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      reasoning: { type: 'string' },
                      alternatives: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['parameterName', 'extractedValue', 'confidence', 'reasoning']
                  }
                },
                overallConfidence: { type: 'number', minimum: 0, maximum: 1 },
                suggestions: { type: 'array', items: { type: 'string' } }
              },
              required: ['parameters', 'mappings', 'overallConfidence']
            }
          }
        ],
        function_call: { name: 'extract_parameters' },
        temperature: 0.1,
        max_tokens: 1000
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'extract_parameters') {
        throw new Error('Failed to extract parameters: Invalid response from AI');
      }

      const result = JSON.parse(functionCall.arguments);
      
      return {
        parameters: result.parameters || {},
        mappings: result.mappings || [],
        confidence: result.overallConfidence || 0.5,
        suggestions: result.suggestions || []
      };

    } catch (error) {
      console.error('AI parameter extraction failed:', error);
      
      // Fallback to basic pattern matching
      return this.fallbackPatternExtraction(message, endpoint);
    }
  }

  /**
   * Generate natural language mappings for parameters using AI
   */
  async generateParameterMappings(
    parameter: ParameterSchema,
    endpointContext: string,
    userContext: string = ''
  ): Promise<string[]> {
    try {
      const response = await (this.openaiService as any).client.chat.completions.create({
        model: (this.openaiService as any).model,
        messages: [
          { role: 'system', content: this.buildMappingGenerationPrompt() },
          { role: 'user', content: `Parameter: ${JSON.stringify(parameter)}\nEndpoint: ${endpointContext}\nUser context: "${userContext}"` }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from AI');
      }

      // Parse the response to extract mappings
      const mappings = result.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .map((line: string) => line.replace(/^[-*]\s*/, '').trim());

      return mappings;

    } catch (error) {
      console.error('AI parameter mapping generation failed:', error);
      
      // Fallback to basic patterns
      return this.generateBasicMappings(parameter);
    }
  }

  /**
   * Build system prompt for parameter extraction
   */
  private buildParameterExtractionPrompt(endpoint: any): string {
    const parameterDescriptions = endpoint.parameters.map((param: ParameterSchema) => {
      const mappings = param.naturalLanguageMappings?.join(', ') || param.name;
      const examples = param.examples?.length ? ` (examples: ${param.examples.join(', ')})` : '';
      const required = param.required ? ' (REQUIRED)' : ' (optional)';
      const validation = param.validation ? ` (validation: ${JSON.stringify(param.validation)})` : '';
      
      return `- ${param.name}${required}: ${param.description || 'No description'} 
        Natural language: ${mappings}${examples}${validation}`;
    }).join('\n');

    return `You are an AI assistant that extracts parameters from natural language for API calls.

Endpoint: ${endpoint.method} ${endpoint.path}
Description: ${endpoint.description || endpoint.summary || 'No description'}

Available Parameters:
${parameterDescriptions}

EXTRACTION RULES:
1. Extract parameter values from the user's natural language message
2. Map natural language terms to the correct parameter names
3. Use examples and descriptions to understand expected values
4. Consider context and previous conversation
5. Provide confidence scores for each extraction
6. Suggest alternatives when uncertain
7. Handle implicit values (e.g., "current user" → user ID from context)

EXAMPLES:
- "Find pets with status available" → {"status": "available"}
- "Get user by ID 123" → {"id": "123"}
- "Search for John's email" → {"email": "john@example.com"}
- "Show me recent orders" → {"status": "recent", "limit": 10}
- "Create a new project called 'Website Redesign'" → {"name": "Website Redesign"}

Be intelligent about context and provide helpful reasoning for your extractions.`;
  }

  /**
   * Build system prompt for parameter mapping generation
   */
  private buildMappingGenerationPrompt(): string {
    return `You are an expert at creating natural language mappings for API parameters.

Your task is to generate various ways users might refer to a parameter in natural language.

Consider:
- Synonyms and variations
- Context-specific terms
- Common user language patterns
- Technical vs non-technical terms
- Abbreviations and acronyms
- Related concepts

Return a list of natural language variations, one per line, that users might use to refer to this parameter.

Examples:
- For "userId" → ["user id", "user identifier", "user", "id", "user key", "account id"]
- For "status" → ["status", "state", "condition", "stage", "phase", "status"]
- For "createdAt" → ["created", "created at", "date created", "timestamp", "when created", "creation date"]

Be comprehensive but relevant to the parameter's purpose.`;
  }

  /**
   * Fallback to basic pattern extraction if AI fails
   */
  private fallbackPatternExtraction(
    message: string,
    endpoint: any
  ): AIParameterExtractionResult {
    const parameters: Record<string, any> = {};
    const mappings: AIParameterMapping[] = [];

    for (const param of endpoint.parameters) {
      const mappings = param.naturalLanguageMappings || [param.name];
      let extractedValue = null;
      let confidence = 0;

      // Try to find the parameter value using basic patterns
      for (const mapping of mappings) {
        const pattern = new RegExp(`\\b${mapping}\\s*[:=]\\s*([^\\s,]+)`, 'i');
        const match = message.match(pattern);
        if (match) {
          extractedValue = match[1];
          confidence = 0.7;
          break;
        }
      }

      if (extractedValue) {
        parameters[param.name] = extractedValue;
        mappings.push({
          parameterName: param.name,
          extractedValue,
          confidence,
          reasoning: `Found using pattern matching`
        });
      }
    }

    return {
      parameters,
      mappings,
      confidence: mappings.length > 0 ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length : 0
    };
  }

  /**
   * Generate basic mappings as fallback
   */
  private generateBasicMappings(parameter: ParameterSchema): string[] {
    const name = parameter.name.toLowerCase();
    const description = (parameter.description || '').toLowerCase();

    // Basic pattern matching
    const patterns: Record<string, string[]> = {
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

    const mappings: string[] = [];
    
    // Find matching patterns
    for (const [key, values] of Object.entries(patterns)) {
      if (name.includes(key) || values.some(v => name.includes(v) || description.includes(v))) {
        mappings.push(...values);
      }
    }

    // Add the parameter name itself
    mappings.push(name);

    return Array.from(new Set(mappings)); // Remove duplicates
  }
}

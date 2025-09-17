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
      const systemPrompt = this.buildParameterExtractionPrompt(endpoint, context);
      
      const response = await (this.openaiService as any).client.chat.completions.create({
        model: (this.openaiService as any).model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User request: "${message}"` }
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
  private buildParameterExtractionPrompt(endpoint: any, context: Record<string, any> = {}): string {
    const parameterDescriptions = endpoint.parameters.map((param: ParameterSchema) => {
      const mappings = param.naturalLanguageMappings?.join(', ') || param.name;
      const examples = param.examples?.length ? ` (examples: ${param.examples.join(', ')})` : '';
      const required = param.required ? ' (REQUIRED)' : ' (optional)';
      const validation = param.validation ? ` (validation: ${JSON.stringify(param.validation)})` : '';
      const enumValues = param.validation?.enum ? ` (valid values: ${param.validation.enum.join(', ')})` : '';
      const defaultValue = param.defaultValue ? ` (default: ${param.defaultValue})` : '';
      
      return `- ${param.name}${required}: ${param.description || 'No description'} 
        Natural language: ${mappings}${examples}${validation}${enumValues}${defaultValue}`;
    }).join('\n');

    // Build context summary for better understanding
    const contextSummary = context.conversationHistory ? 
      context.conversationHistory.map((ctx: any) => {
        if (ctx.type === 'assistant' && ctx.apiCallResult) {
          return `Previous API call: ${ctx.apiCallResult.method} ${ctx.apiCallResult.url} returned ${ctx.apiCallResult.statusCode}`;
        }
        return `${ctx.type}: ${ctx.content}`;
      }).join('\n') : 'No previous context';

    return `You are an AI assistant that extracts parameters from natural language for API calls.

Endpoint: ${endpoint.method} ${endpoint.path}
Description: ${endpoint.description || endpoint.summary || 'No description'}

Available Parameters:
${parameterDescriptions}

Conversation Context:
${contextSummary}

EXTRACTION RULES:
1. Extract parameter values from the user's natural language message
2. Map natural language terms to the correct parameter names using the provided mappings
3. Use examples, descriptions, and enum values to understand expected values
4. Consider context and previous conversation - if user asks for "sold pets" after getting "available pets", use status=sold
5. Provide confidence scores for each extraction
6. Suggest alternatives when uncertain
7. Handle implicit values (e.g., "current user" → user ID from context)
8. Use default values when no explicit value is provided
9. Be flexible with synonyms and variations

EXAMPLES:
- "Find pets with status available" → {"status": "available"}
- "Get user by ID 123" → {"id": "123"}
- "Search for John's email" → {"email": "john@example.com"}
- "Show me recent orders" → {"status": "recent", "limit": 10}
- "Create a new project called 'Website Redesign'" → {"name": "Website Redesign"}
- "Get all available pets" → {"status": "available"} (if status parameter exists)
- "Find pets by status" → {"status": "available"} (using default if available)
- "Now get all sold pets to see the difference" → {"status": "sold"} (after getting available pets)

IMPORTANT: Always extract at least one parameter if the endpoint has parameters. Use default values when appropriate. Be generous with confidence scores for obvious matches. Consider the conversation context to understand what the user is asking for.`;
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
      const paramMappings = param.naturalLanguageMappings || [param.name];
      let extractedValue = null;
      let confidence = 0;
      let reasoning = '';

      // Try multiple extraction patterns
      for (const mapping of paramMappings) {
        // Pattern 1: "status available" or "status=available"
        const pattern1 = new RegExp(`\\b${mapping}\\s+(?:is\\s+)?([^\\s,]+)`, 'i');
        const match1 = message.match(pattern1);
        if (match1) {
          extractedValue = match1[1];
          confidence = 0.8;
          reasoning = `Found using pattern: "${mapping} [value]"`;
          break;
        }

        // Pattern 2: "with status available" or "with status=available"
        const pattern2 = new RegExp(`(?:with\\s+)?${mapping}\\s*[:=]\\s*([^\\s,]+)`, 'i');
        const match2 = message.match(pattern2);
        if (match2) {
          extractedValue = match2[1];
          confidence = 0.7;
          reasoning = `Found using pattern: "with ${mapping} = [value]"`;
          break;
        }

        // Pattern 3: "available pets" (value before the mapping)
        const pattern3 = new RegExp(`([^\\s,]+)\\s+${mapping}`, 'i');
        const match3 = message.match(pattern3);
        if (match3) {
          extractedValue = match3[1];
          confidence = 0.6;
          reasoning = `Found using pattern: "[value] ${mapping}"`;
          break;
        }

        // Pattern 4: Direct value matching for enum values
        if (param.validation?.enum) {
          for (const enumValue of param.validation.enum) {
            const pattern4 = new RegExp(`\\b${enumValue}\\b`, 'i');
            if (pattern4.test(message)) {
              extractedValue = enumValue;
              confidence = 0.9;
              reasoning = `Found enum value: "${enumValue}"`;
              break;
            }
          }
          if (extractedValue) break;
        }
      }

      // If still no value found, try default values
      if (!extractedValue && param.defaultValue) {
        extractedValue = param.defaultValue;
        confidence = 0.5;
        reasoning = `Using default value: "${param.defaultValue}"`;
      }

      if (extractedValue) {
        parameters[param.name] = extractedValue;
        mappings.push({
          parameterName: param.name,
          extractedValue,
          confidence,
          reasoning
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

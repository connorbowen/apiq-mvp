
/**
 * Natural Language Parameter Extractor
 * 
 * Uses AI to intelligently extract and map API parameter values from natural language
 * instead of relying on hard-coded pattern matching.
 */

import { OpenAIService } from '../../services/openaiService';
import { ParameterSchema } from './apiSchemaEnhancementService';

export interface ParameterValueMapping {
  parameterName: string;
  extractedValue: any;
  confidence: number;
  reasoning: string;
  alternatives?: string[];
}

export interface ParameterValueExtractionResult {
  parameters: Record<string, any>;
  mappings: ParameterValueMapping[];
  confidence: number;
  suggestions?: string[];
}

export class NaturalLanguageParameterExtractor {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Extract parameter values from natural language using AI
   */
  async extractParameterValues(
    message: string,
    endpoint: { 
      path: string; 
      method: string; 
      parameters: ParameterSchema[];
      summary?: string;
      description?: string;
    },
    context: Record<string, any> = {}
  ): Promise<ParameterValueExtractionResult> {
    console.log('🔍 NaturalLanguageParameterExtractor: Starting parameter value extraction:', {
      message,
      endpoint: endpoint.path,
      method: endpoint.method,
      parametersCount: endpoint.parameters?.length || 0,
      parameters: endpoint.parameters
    });

    try {
      const systemPrompt = this.buildParameterExtractionPrompt(endpoint, context);
      
      console.log('🔍 NaturalLanguageParameterExtractor: Calling AI with prompts:', {
        systemPromptLength: systemPrompt.length,
        userMessage: message
      });
      
      // DEBUG: Log the actual prompt being sent to AI
      console.log('🔍 NaturalLanguageParameterExtractor: FULL SYSTEM PROMPT:', systemPrompt);
      
      // Construct user message - keep it simple and focused on the current request
      const userMessage = `Extract parameters from this request: "${message}"`;
      
      console.log('🔍 NaturalLanguageParameterExtractor: USER MESSAGE:', userMessage);
      console.log('🔍 NaturalLanguageParameterExtractor: Current message to extract from:', message);
      console.log('🔍 NaturalLanguageParameterExtractor: CONTEXT BEING PASSED:', JSON.stringify(context, null, 2));

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ], {
        model: (this.openaiService as any).model,
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

      console.log('🔍 NaturalLanguageParameterExtractor: AI response received:', {
        hasChoices: !!response.choices,
        choicesLength: response.choices?.length,
        hasFunctionCall: !!response.choices?.[0]?.message?.function_call
      });

      // chatCompletion returns full response when functions are used
      const functionCall = response.choices?.[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'extract_parameters') {
        console.error('🔍 NaturalLanguageParameterExtractor: Invalid function call response:', {
          functionCall,
          expectedName: 'extract_parameters'
        });
        throw new Error('Failed to extract parameters: Invalid response from AI');
      }

      const result = JSON.parse(functionCall.arguments);
      
      // Convert mappings to parameters object
      const parameters: Record<string, any> = {};
      if (result.mappings && Array.isArray(result.mappings)) {
        for (const mapping of result.mappings) {
          if (mapping.parameterName && mapping.extractedValue !== undefined) {
            parameters[mapping.parameterName] = mapping.extractedValue;
          }
        }
      }
      
      // Also include any direct parameters if provided
      if (result.parameters && typeof result.parameters === 'object') {
        Object.assign(parameters, result.parameters);
      }

      console.log('🔍 NaturalLanguageParameterExtractor: AI extraction successful:', {
        parameters: parameters,
        parametersCount: Object.keys(parameters).length,
        confidence: result.overallConfidence
      });
      
      // DEBUG: Log the full AI response
      console.log('🔍 NaturalLanguageParameterExtractor: FULL AI RESPONSE:', JSON.stringify(result, null, 2));
      console.log('🔍 NaturalLanguageParameterExtractor: EXTRACTED PARAMETERS:', parameters);
      console.log('🔍 NaturalLanguageParameterExtractor: MAPPINGS:', result.mappings);

      return {
        parameters: parameters,
        mappings: result.mappings || [],
        confidence: result.overallConfidence || 0.5,
        suggestions: result.suggestions || []
      };

    } catch (error) {
      console.error('🔍 NaturalLanguageParameterExtractor: AI extraction failed, using fallback:', error);
      
      // Fallback to basic pattern matching
      const fallbackResult = this.fallbackPatternExtraction(message, endpoint);
      console.log('🔍 NaturalLanguageParameterExtractor: Fallback result:', {
        parameters: fallbackResult.parameters,
        parametersCount: Object.keys(fallbackResult.parameters || {}).length,
        confidence: fallbackResult.confidence
      });
      
      return fallbackResult;
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
      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: this.buildMappingGenerationPrompt() },
        { role: 'user', content: `Parameter: ${JSON.stringify(parameter)}\nEndpoint: ${endpointContext}\nUser context: "${userContext}"` }
      ], {
        model: (this.openaiService as any).model,
        temperature: 0.3,
        max_tokens: 300
      });

      // chatCompletion returns a string when no functions are used
      const result = typeof response === 'string' ? response : response.choices?.[0]?.message?.content;
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
      // Handle both interface structure (validation.enum) and test data structure (schema.enum)
      const enumValues = (param.validation?.enum || (param as any).schema?.enum) ? 
        ` (valid values: ${(param.validation?.enum || (param as any).schema?.enum).join(', ')})` : '';
      const defaultValue = (param.defaultValue || (param as any).schema?.default) ? 
        ` (default: ${param.defaultValue || (param as any).schema?.default})` : '';
      
      return `- ${param.name}${required}: ${param.description || 'No description'} 
        Natural language: ${mappings}${examples}${validation}${enumValues}${defaultValue}`;
    }).join('\n');

    // Build conversation context summary
    const contextSummary = this.buildContextSummary(context);

    return `You are an AI assistant that extracts parameters from natural language for API calls.

Endpoint: ${endpoint.method} ${endpoint.path}
Description: ${endpoint.description || endpoint.summary || 'No description'}

Available Parameters:
${parameterDescriptions}

${contextSummary}

EXTRACTION RULES:
1. CRITICAL: Extract parameter values ONLY from the CURRENT user's message, NOT from previous context
2. Map natural language terms to the correct parameter names using the provided mappings
3. Use examples, descriptions, and enum values to understand expected values
4. Consider the conversation context to understand what the user is asking for NOW
5. Provide confidence scores for each extraction
6. Suggest alternatives when uncertain
7. Handle implicit values (e.g., "current user" → user ID from context)
8. Use default values when no explicit value is provided
9. Be flexible with synonyms and variations

EXAMPLES WITH CONTEXT:
- Previous: "Get available pets", Current: "Now get pending pets" → {"status": "pending"} (extract "pending" from current message)
- Previous: "Get available pets", Current: "Now get sold pets" → {"status": "sold"} (extract "sold" from current message)
- Previous: "Find user 123", Current: "Now find user 456" → {"id": "456"} (extract "456" from current message)
- "Now get pending pets" → {"status": "pending"} (extract "pending" from the message)
- "Now get available pets" → {"status": "available"} (extract "available" from the message)
- "Now get sold pets" → {"status": "sold"} (extract "sold" from the message)
- "Find pets with status available" → {"status": "available"}
- "Get user by ID 123" → {"id": "123"}
- "Search for John's email" → {"email": "john@example.com"}
- "Show me recent orders" → {"status": "recent", "limit": 10}
- "Create a new project called 'Website Redesign'" → {"name": "Website Redesign"}

CRITICAL: 
- If the CURRENT message mentions "available pets" or "available", extract {"status": "available"}
- If the CURRENT message mentions "sold pets" or "sold", extract {"status": "sold"}  
- If the CURRENT message mentions "pending pets" or "pending", extract {"status": "pending"}
- If the CURRENT message says "Now get [status] pets", extract {"status": "[status]"} where [status] is the actual status word
- ALWAYS extract parameters from the CURRENT message, NOT from previous context
- Use default values ONLY when no explicit value is provided in the CURRENT message
- Consider the conversation context ONLY to understand intent, but extract values from the CURRENT message
- Pay special attention to status words like "available", "pending", "sold" in the current message`;
  }

  /**
   * Build conversation context summary for parameter extraction
   */
  private buildContextSummary(context: Record<string, any>): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }

    const contextParts: string[] = [];
    
    // Add recent conversation context
    if (context.recentMessages && Array.isArray(context.recentMessages)) {
      const recentMessages = context.recentMessages.slice(-3); // Last 3 messages
      if (recentMessages.length > 0) {
        contextParts.push('RECENT CONVERSATION CONTEXT:');
        recentMessages.forEach((msg: any, index: number) => {
          if (msg.type === 'user' && msg.content) {
            contextParts.push(`- User: "${msg.content}"`);
          } else if (msg.type === 'assistant' && msg.content) {
            contextParts.push(`- Assistant: "${msg.content}"`);
          }
        });
        contextParts.push('');
      }
    }

    // Add any relevant context from previous API calls
    if (context.previousApiCalls && Array.isArray(context.previousApiCalls)) {
      const recentApiCalls = context.previousApiCalls.slice(-2); // Last 2 API calls
      if (recentApiCalls.length > 0) {
        contextParts.push('RECENT API CALLS:');
        recentApiCalls.forEach((call: any, index: number) => {
          if (call.method && call.url) {
            contextParts.push(`- ${call.method} ${call.url}${call.parameters ? ` with params: ${JSON.stringify(call.parameters)}` : ''}`);
          }
        });
        contextParts.push('');
      }
    }

    return contextParts.length > 0 ? contextParts.join('\n') : '';
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
  ): ParameterValueExtractionResult {
    console.log('🔍 NaturalLanguageParameterExtractor: Starting fallback pattern extraction:', {
      message,
      endpoint: endpoint.path,
      parametersCount: endpoint.parameters?.length || 0
    });

    const parameters: Record<string, any> = {};
    const mappings: ParameterValueMapping[] = [];

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
        const enumValues = param.validation?.enum || (param as any).schema?.enum;
        if (enumValues) {
          for (const enumValue of enumValues) {
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
      const defaultValue = param.defaultValue || (param as any).schema?.default;
      if (!extractedValue && defaultValue) {
        extractedValue = defaultValue;
        confidence = 0.5;
        reasoning = `Using default value: "${defaultValue}"`;
        console.log('🔍 NaturalLanguageParameterExtractor: Using default value for param:', {
          parameterName: param.name,
          defaultValue: defaultValue
        });
      }

      if (extractedValue) {
        parameters[param.name] = extractedValue;
        mappings.push({
          parameterName: param.name,
          extractedValue,
          confidence,
          reasoning
        });
        console.log('🔍 NaturalLanguageParameterExtractor: Found parameter value:', {
          parameterName: param.name,
          extractedValue,
          confidence,
          reasoning
        });
      } else {
        console.log('🔍 NaturalLanguageParameterExtractor: No value found for param:', {
          parameterName: param.name,
          mappings: paramMappings,
          required: param.required
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

/**
 * AI Response Parser Utility
 * 
 * Handles parsing AI responses that may be wrapped in markdown code blocks
 * or contain other formatting that needs to be cleaned before JSON parsing.
 */

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Parse AI response that may be wrapped in markdown code blocks
 */
export function parseAIResponse<T>(response: string): ParseResult<T> {
  try {
    // First, try to parse as-is (in case it's already clean JSON)
    const directParse = JSON.parse(response);
    return {
      success: true,
      data: directParse
    };
  } catch (directError) {
    // If direct parsing fails, try to extract JSON from markdown code blocks
    try {
      // Remove markdown code block markers
      let cleanedResponse = response.trim();
      
      // Remove ```json and ``` markers
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
      }
      
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
      }
      
      // Try to find JSON object in the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      // Parse the cleaned response
      const parsed = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: parsed
      };
      
    } catch (markdownError) {
      // If all parsing attempts fail, return error
      return {
        success: false,
        error: `Failed to parse AI response: ${markdownError instanceof Error ? markdownError.message : String(markdownError)}`
      };
    }
  }
}

/**
 * Safely parse AI response with fallback
 */
export function safeParseAIResponse<T>(response: string, fallback: T): T {
  const result = parseAIResponse<T>(response);
  if (result.success && result.data) {
    return result.data;
  }
  
  console.warn('AI response parsing failed, using fallback:', result.error);
  return fallback;
}

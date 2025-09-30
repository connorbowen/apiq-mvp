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
 * Enhanced with better error handling and JSON repair attempts
 */
export function parseAIResponse<T>(response: string): ParseResult<T> {
  if (!response || typeof response !== 'string') {
    return {
      success: false,
      error: 'Invalid response: must be a non-empty string'
    };
  }

  try {
    // First, try to parse as-is (in case it's already clean JSON)
    const directParse = JSON.parse(response);
    return {
      success: true,
      data: directParse
    };
  } catch (directError) {
    // If direct parsing fails, try to extract and repair JSON
    try {
      // Remove markdown code block markers
      let cleanedResponse = response.trim();
      
      // Remove ```json and ``` markers more robustly
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*\n?/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*\n?/, '');
      }
      
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/\n?\s*```$/, '');
      }
      
      // Try to find JSON object in the response (more flexible matching)
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      // If we still don't have a JSON object, try to find array
      if (!cleanedResponse.trim().startsWith('{')) {
        const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          cleanedResponse = arrayMatch[0];
        }
      }
      
      // Attempt to repair common JSON issues
      cleanedResponse = repairJsonString(cleanedResponse);
      
      // Parse the cleaned response
      const parsed = JSON.parse(cleanedResponse);
      return {
        success: true,
        data: parsed
      };
      
    } catch (markdownError) {
      // If all parsing attempts fail, return error with more context
      return {
        success: false,
        error: `Failed to parse AI response: ${markdownError instanceof Error ? markdownError.message : String(markdownError)}. Original response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`
      };
    }
  }
}

/**
 * Attempt to repair common JSON formatting issues from AI responses
 */
function repairJsonString(jsonString: string): string {
  let repaired = jsonString.trim();
  
  // Remove control characters that break JSON parsing (except newlines in strings)
  // This is more aggressive - remove all control characters except \n, \r, \t
  repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Skip the problematic quote fixing regex that was breaking valid JSON
  
  // Fix common control character issues in string values
  repaired = repaired.replace(/"([^"]*)[\n\r\t]([^"]*)":/g, '"$1\\n$2":');
  repaired = repaired.replace(/"([^"]*)[\n\r\t]([^"]*)":/g, '"$1\\r$2":');
  repaired = repaired.replace(/"([^"]*)[\n\r\t]([^"]*)":/g, '"$1\\t$2":');
  
  // Additional fix for the specific error we're seeing: "Bad control character in string literal"
  // This handles cases where control characters appear in the middle of string values
  repaired = repaired.replace(/"([^"]*)[\x00-\x1F\x7F]([^"]*)"/g, (match, before, after) => {
    return `"${before.replace(/[\x00-\x1F\x7F]/g, '')}${after.replace(/[\x00-\x1F\x7F]/g, '')}"`;
  });
  
  // Fix missing commas between array elements or object properties first
  // Only add comma if there isn't already one and it's not a property name followed by a value
  repaired = repaired.replace(/([^,}\]])\s*([{\[])/g, (match, before, after) => {
    // Don't add comma if before is a property name (ends with :)
    if (before.trim().endsWith(':')) {
      return match;
    }
    return before + ',' + after;
  });
  
  // Fix missing commas between primitive values (more specific patterns)
  // Fix missing comma between string and string
  repaired = repaired.replace(/"\s+"([^"]*)"\s*([}\]])/g, '","$1"$2');
  
  // Fix missing comma between string and other values
  repaired = repaired.replace(/"\s+([^,}\]]\s*[}\]])/g, '",$1');
  
  // Fix missing comma between numbers and other values
  repaired = repaired.replace(/(\d+)\s+([^,}\]]\s*[}\]])/g, '$1,$2');
  
  // Fix missing comma between boolean/null and other values
  repaired = repaired.replace(/(true|false|null)\s+([^,}\]]\s*[}\]])/g, '$1,$2');
  
  // Remove any trailing commas before closing brackets/braces (both objects and arrays)
  // This needs to be done after fixing missing commas
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  // Ensure proper array/object closing
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  
  // Add missing closing braces
  if (openBraces > closeBraces) {
    repaired += '}'.repeat(openBraces - closeBraces);
  }
  
  // Add missing closing brackets
  if (openBrackets > closeBrackets) {
    repaired += ']'.repeat(openBrackets - closeBrackets);
  }
  
  return repaired;
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

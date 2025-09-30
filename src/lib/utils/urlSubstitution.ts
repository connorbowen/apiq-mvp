/**
 * URL Substitution Utility
 * 
 * Provides robust URL parameter substitution for API calls
 */

export interface UrlSubstitutionOptions {
  url: string;
  parameters: Record<string, any>;
  debug?: boolean;
}

export interface UrlSubstitutionResult {
  substitutedUrl: string;
  substitutions: Array<{
    placeholder: string;
    value: string;
    success: boolean;
  }>;
  hasUnsubstitutedParams: boolean;
}

/**
 * Substitute path parameters in a URL template
 * 
 * @param options - URL substitution options
 * @returns URL substitution result with debugging information
 */
export function substituteUrlParameters(options: UrlSubstitutionOptions): UrlSubstitutionResult {
  const { url, parameters, debug = false } = options;
  
  if (debug) {
    console.log('🔍 URL Substitution - Original URL:', url);
    console.log('🔍 URL Substitution - Parameters:', parameters);
  }
  
  let substitutedUrl = url;
  const substitutions: Array<{
    placeholder: string;
    value: string;
    success: boolean;
  }> = [];
  
  // Find all parameter placeholders in the URL
  const placeholderRegex = /\{([^}]+)\}/g;
  const placeholders = [...url.matchAll(placeholderRegex)].map(match => match[1]);
  
  if (debug) {
    console.log('🔍 URL Substitution - Found placeholders:', placeholders);
  }
  
  // Substitute each parameter
  for (const [key, value] of Object.entries(parameters)) {
    const placeholder = `{${key}}`;
    const replacement = String(value);
    
    if (debug) {
      console.log(`🔍 URL Substitution - Replacing ${placeholder} with ${replacement}`);
    }
    
    const beforeSubstitution = substitutedUrl;
    substitutedUrl = substitutedUrl.replace(placeholder, replacement);
    
    const success = substitutedUrl !== beforeSubstitution;
    substitutions.push({
      placeholder,
      value: replacement,
      success
    });
    
    if (debug) {
      console.log(`🔍 URL Substitution - URL after replacement: ${substitutedUrl}`);
      console.log(`🔍 URL Substitution - Substitution successful: ${success}`);
    }
  }
  
  // Check for any remaining unsubstituted parameters
  const hasUnsubstitutedParams = placeholderRegex.test(substitutedUrl);
  
  if (debug) {
    console.log('🔍 URL Substitution - Final substituted URL:', substitutedUrl);
    console.log('🔍 URL Substitution - Has unsubstituted params:', hasUnsubstitutedParams);
  }
  
  return {
    substitutedUrl,
    substitutions,
    hasUnsubstitutedParams
  };
}

/**
 * Validate that all required parameters are provided for URL substitution
 * 
 * @param url - URL template with placeholders
 * @param parameters - Available parameters
 * @returns Validation result
 */
export function validateUrlParameters(url: string, parameters: Record<string, any>): {
  isValid: boolean;
  missingParams: string[];
  extraParams: string[];
} {
  const placeholderRegex = /\{([^}]+)\}/g;
  const requiredParams = [...url.matchAll(placeholderRegex)].map(match => match[1]);
  const providedParams = Object.keys(parameters);
  
  const missingParams = requiredParams.filter(param => !providedParams.includes(param));
  const extraParams = providedParams.filter(param => !requiredParams.includes(param));
  
  return {
    isValid: missingParams.length === 0,
    missingParams,
    extraParams
  };
}

/**
 * Create a safe URL for API calls with proper parameter substitution
 * 
 * @param options - URL substitution options
 * @returns Safe URL for API calls
 */
export function createSafeApiUrl(options: UrlSubstitutionOptions): {
  url: string;
  isValid: boolean;
  errors: string[];
} {
  const { url, parameters, debug = false } = options;
  
  const errors: string[] = [];
  
  // Only validate path parameters (those with {param} syntax)
  // Query parameters are handled separately in the API call logic
  const pathParamValidation = validateUrlParameters(url, parameters);
  if (!pathParamValidation.isValid) {
    errors.push(`Missing required path parameters: ${pathParamValidation.missingParams.join(', ')}`);
  }
  
  // Perform substitution
  const result = substituteUrlParameters({ url, parameters, debug });
  
  // Only check for unsubstituted path parameters, not query parameters
  if (result.hasUnsubstitutedParams) {
    // Check if the unsubstituted params are actually path parameters
    const placeholderRegex = /\{([^}]+)\}/g;
    const unsubstitutedPathParams = [...result.substitutedUrl.matchAll(placeholderRegex)].map(match => match[1]);
    if (unsubstitutedPathParams.length > 0) {
      errors.push(`URL still contains unsubstituted path parameters: ${unsubstitutedPathParams.join(', ')}`);
    }
  }
  
  return {
    url: result.substitutedUrl,
    isValid: errors.length === 0,
    errors
  };
}

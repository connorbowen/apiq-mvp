import { URL } from 'url';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

export interface OpenApiUrlValidationResult extends ValidationResult {
  url?: string;
  isHttps?: boolean;
  isAccessible?: boolean;
}

export interface OpenApiSpecValidationResult extends ValidationResult {
  spec?: any;
  version?: string;
  title?: string;
  endpointCount?: number;
}

/**
 * Validate OpenAPI URL format and accessibility
 */
export async function validateOpenApiUrl(url: string): Promise<OpenApiUrlValidationResult> {
  try {
    // Basic URL format validation
    const parsedUrl = new URL(url);
    
    // Check if it's a valid HTTP/HTTPS URL
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: 'URL must use HTTP or HTTPS protocol',
        code: 'INVALID_PROTOCOL'
      };
    }

    // Check if it's HTTPS (preferred for security)
    const isHttps = parsedUrl.protocol === 'https:';
    
    // Check if URL is accessible (basic connectivity test)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'ApiQ-MVP/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return {
          isValid: false,
          error: `URL is not accessible (HTTP ${response.status})`,
          code: 'URL_NOT_ACCESSIBLE',
          url: url,
          isHttps
        };
      }
      
      return {
        isValid: true,
        url: url,
        isHttps,
        isAccessible: true
      };
      
    } catch (fetchError) {
      return {
        isValid: false,
        error: 'URL is not accessible or unreachable',
        code: 'URL_NOT_ACCESSIBLE',
        url: url,
        isHttps
      };
    }
    
  } catch (urlError) {
    return {
      isValid: false,
      error: 'Invalid URL format',
      code: 'INVALID_URL_FORMAT'
    };
  }
}

/**
 * Validate OpenAPI specification structure
 */
export function validateOpenApiSpec(spec: any): OpenApiSpecValidationResult {
  try {
    // Basic structure validation
    if (!spec || typeof spec !== 'object') {
      return {
        isValid: false,
        error: 'Specification must be a valid JSON object',
        code: 'INVALID_SPEC_FORMAT'
      };
    }

    // Check for OpenAPI version
    const version = spec.openapi || spec.swagger;
    if (!version) {
      return {
        isValid: false,
        error: 'Missing OpenAPI version (openapi or swagger field)',
        code: 'MISSING_VERSION'
      };
    }

    // Validate version format
    if (typeof version !== 'string') {
      return {
        isValid: false,
        error: 'OpenAPI version must be a string',
        code: 'INVALID_VERSION_FORMAT'
      };
    }

    // Check for required info object
    if (!spec.info || typeof spec.info !== 'object') {
      return {
        isValid: false,
        error: 'Missing or invalid info object',
        code: 'MISSING_INFO'
      };
    }

    // Check for required title
    if (!spec.info.title || typeof spec.info.title !== 'string') {
      return {
        isValid: false,
        error: 'Missing or invalid title in info object',
        code: 'MISSING_TITLE'
      };
    }

    // Check for paths object
    if (!spec.paths || typeof spec.paths !== 'object') {
      return {
        isValid: false,
        error: 'Missing or invalid paths object',
        code: 'MISSING_PATHS'
      };
    }

    // Count endpoints
    const endpointCount = Object.keys(spec.paths).length;
    if (endpointCount === 0) {
      return {
        isValid: false,
        error: 'No endpoints found in specification',
        code: 'NO_ENDPOINTS'
      };
    }

    // Validate each path
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (typeof pathItem !== 'object' || pathItem === null) {
        return {
          isValid: false,
          error: `Invalid path definition for ${path}`,
          code: 'INVALID_PATH_DEFINITION'
        };
      }

      // Check if path has at least one HTTP method
      const methods = Object.keys(pathItem).filter(key => 
        ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'].includes(key.toLowerCase())
      );
      
      if (methods.length === 0) {
        return {
          isValid: false,
          error: `Path ${path} has no valid HTTP methods`,
          code: 'NO_HTTP_METHODS'
        };
      }
    }

    return {
      isValid: true,
      spec,
      version,
      title: spec.info.title,
      endpointCount
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Specification validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'VALIDATION_ERROR'
    };
  }
}

/**
 * Comprehensive validation for OpenAPI connection creation
 */
export async function validateOpenApiConnection(
  name: string,
  baseUrl: string,
  documentationUrl?: string
): Promise<ValidationResult> {
  // Validate connection name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return {
      isValid: false,
      error: 'Connection name is required and must be a non-empty string',
      code: 'INVALID_NAME'
    };
  }

  if (name.length > 100) {
    return {
      isValid: false,
      error: 'Connection name must be 100 characters or less',
      code: 'NAME_TOO_LONG'
    };
  }

  // Validate base URL
  if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
    return {
      isValid: false,
      error: 'Base URL is required and must be a non-empty string',
      code: 'INVALID_BASE_URL'
    };
  }

  try {
    const parsedBaseUrl = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
      return {
        isValid: false,
        error: 'Base URL must use HTTP or HTTPS protocol',
        code: 'INVALID_BASE_URL_PROTOCOL'
      };
    }
  } catch {
    return {
      isValid: false,
      error: 'Base URL must be a valid URL format',
      code: 'INVALID_BASE_URL_FORMAT'
    };
  }

  // Validate documentation URL if provided
  if (documentationUrl) {
    const urlValidation = await validateOpenApiUrl(documentationUrl);
    if (!urlValidation.isValid) {
      return {
        isValid: false,
        error: `Invalid documentation URL: ${urlValidation.error}`,
        code: urlValidation.code
      };
    }
  }

  return {
    isValid: true
  };
} 
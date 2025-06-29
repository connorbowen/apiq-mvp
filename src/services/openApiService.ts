import axios, { AxiosResponse } from 'axios';
import { openApiCache } from '../utils/openApiCache';
import logger from '../utils/logger';

export interface OpenApiFetchResult {
  success: boolean;
  spec?: any;
  error?: string;
  cached?: boolean;
  duration?: number;
}

export interface OpenApiValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export class OpenApiService {
  private timeout: number;

  constructor(timeout?: number) {
    this.timeout = timeout || parseInt(process.env.OPENAPI_SLOW_SPEC_TIMEOUT || '30000');
  }

  /**
   * Fetch and parse an OpenAPI spec from a URL
   */
  async fetchSpec(url: string): Promise<OpenApiFetchResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = openApiCache.get(url);
      if (cached) {
        return {
          success: true,
          spec: cached,
          cached: true,
          duration: Date.now() - startTime,
        };
      }

      logger.info('Fetching OpenAPI spec', { url });

      // Fetch with timeout
      const response: AxiosResponse = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json, application/yaml, text/yaml, */*',
          'User-Agent': 'ApiQ-MVP/1.0',
        },
        validateStatus: (status) => status < 500, // Accept 4xx errors for validation
      });

      const duration = Date.now() - startTime;

      if (response.status !== 200) {
        logger.warn('OpenAPI spec fetch failed', { 
          url, 
          status: response.status, 
          duration 
        });
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          duration,
        };
      }

      // Parse the response
      let spec: any;
      const contentType = response.headers['content-type'] || '';
      
      if (contentType.includes('application/json')) {
        spec = response.data;
      } else if (contentType.includes('yaml') || contentType.includes('yml')) {
        spec = this.parseYaml(response.data);
      } else {
        // Try to parse as JSON first, then YAML
        try {
          spec = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        } catch {
          spec = this.parseYaml(response.data);
        }
      }

      // Validate the spec
      const validation = this.validateSpec(spec);
      if (!validation.isValid) {
        logger.warn('Invalid OpenAPI spec', { 
          url, 
          errors: validation.errors,
          duration 
        });
        return {
          success: false,
          error: `Invalid OpenAPI spec: ${validation.errors?.join(', ')}`,
          duration,
        };
      }

      // Cache the valid spec
      openApiCache.set(url, spec);

      logger.info('OpenAPI spec fetched successfully', { 
        url, 
        duration,
        specVersion: spec.openapi || spec.swagger,
        title: spec.info?.title,
      });

      return {
        success: true,
        spec,
        cached: false,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          logger.error('OpenAPI spec fetch timeout', { url, timeout: this.timeout, duration });
          return {
            success: false,
            error: `Request timeout after ${this.timeout}ms`,
            duration,
          };
        }
        
        if (error.response) {
          logger.error('OpenAPI spec fetch failed', { 
            url, 
            status: error.response.status,
            statusText: error.response.statusText,
            duration 
          });
          return {
            success: false,
            error: `HTTP ${error.response.status}: ${error.response.statusText}`,
            duration,
          };
        }
        
        if (error.request) {
          logger.error('OpenAPI spec fetch network error', { url, duration });
          return {
            success: false,
            error: 'Network error - unable to reach the server',
            duration,
          };
        }
      }

      logger.error('OpenAPI spec fetch unexpected error', { 
        url, 
        error: (error as Error).message,
        duration 
      });
      
      return {
        success: false,
        error: `Unexpected error: ${(error as Error).message}`,
        duration,
      };
    }
  }

  /**
   * Validate an OpenAPI spec
   */
  validateSpec(spec: any): OpenApiValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!spec) {
      errors.push('Spec is null or undefined');
      return { isValid: false, errors };
    }

    if (typeof spec !== 'object') {
      errors.push('Spec must be an object');
      return { isValid: false, errors };
    }

    // Check for required OpenAPI version
    if (!spec.openapi && !spec.swagger) {
      errors.push('Missing OpenAPI version (openapi or swagger field)');
      return { isValid: false, errors };
    }

    // Check for required info object
    if (!spec.info) {
      errors.push('Missing info object');
      return { isValid: false, errors };
    }

    if (!spec.info.title) {
      errors.push('Missing info.title');
      return { isValid: false, errors };
    }

    // Check for paths object
    if (!spec.paths) {
      errors.push('Missing paths object');
      return { isValid: false, errors };
    }

    if (typeof spec.paths !== 'object') {
      errors.push('Paths must be an object');
      return { isValid: false, errors };
    }

    // Check for at least one path
    const pathKeys = Object.keys(spec.paths);
    if (pathKeys.length === 0) {
      warnings.push('No API paths defined');
    }

    // Validate each path
    for (const path of pathKeys) {
      if (!path.startsWith('/')) {
        errors.push(`Path "${path}" must start with "/"`);
      }

      const pathObj = spec.paths[path];
      if (typeof pathObj !== 'object') {
        errors.push(`Path "${path}" must be an object`);
        continue;
      }

      // Check for at least one HTTP method
      const methods = Object.keys(pathObj).filter(key => 
        ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'].includes(key.toLowerCase())
      );
      
      if (methods.length === 0) {
        warnings.push(`Path "${path}" has no HTTP methods defined`);
      }
    }

    // Check for components (optional but recommended)
    if (!spec.components) {
      warnings.push('No components object defined (schemas, securitySchemes, etc.)');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Parse YAML content (basic implementation)
   */
  private parseYaml(content: string): any {
    try {
      // Try to use js-yaml if available
      const yaml = require('js-yaml');
      return yaml.load(content);
    } catch {
      // Fallback to basic YAML parsing for simple cases
      logger.warn('js-yaml not available, using basic YAML parsing');
      return this.basicYamlParse(content);
    }
  }

  /**
   * Basic YAML parser for simple cases
   */
  private basicYamlParse(content: string): any {
    // This is a very basic implementation - in production, use js-yaml
    try {
      // Try to parse as JSON first (some APIs return JSON with YAML content-type)
      return JSON.parse(content);
    } catch {
      // For now, return a basic object structure
      logger.warn('Basic YAML parsing failed, returning empty object');
      return {};
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return openApiCache.getStats();
  }

  /**
   * Clear the cache
   */
  clearCache() {
    openApiCache.clear();
  }
}

// Export a default instance
export const openApiService = new OpenApiService(); 
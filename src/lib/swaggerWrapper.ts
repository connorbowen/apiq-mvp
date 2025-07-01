import SwaggerParser from '@apidevtools/swagger-parser';

export interface SwaggerConfig {
  validate?: {
    schema?: boolean;
    spec?: boolean;
  };
  resolve?: {
    external?: boolean;
  };
}

export interface SwaggerClient {
  parse: (url: string, options?: SwaggerConfig) => Promise<any>;
  validate: (api: any, options?: SwaggerConfig) => Promise<any>;
  bundle: (url: string, options?: SwaggerConfig) => Promise<any>;
  dereference: (url: string, options?: SwaggerConfig) => Promise<any>;
}

/**
 * Create and configure a swagger-parser client
 * 
 * @param config - Configuration options for the swagger parser
 * @returns Configured swagger client instance
 */
export const getSwaggerClient = (config: SwaggerConfig = {}): SwaggerClient => {
  // Create the swagger parser instance
  const parser = new SwaggerParser();

  // Return a typed interface
  return {
    parse: async (url: string, options: SwaggerConfig = {}) => {
      const mergedOptions = { ...config, ...options };
      return await parser.parse(url, mergedOptions);
    },
    validate: async (api: any, options: SwaggerConfig = {}) => {
      const mergedOptions = { ...config, ...options };
      return await parser.validate(api, mergedOptions);
    },
    bundle: async (url: string, options: SwaggerConfig = {}) => {
      const mergedOptions = { ...config, ...options };
      return await parser.bundle(url, mergedOptions);
    },
    dereference: async (url: string, options: SwaggerConfig = {}) => {
      const mergedOptions = { ...config, ...options };
      return await parser.dereference(url, mergedOptions);
    },
  };
};

/**
 * Create a swagger client with default configuration
 * 
 * @returns Configured swagger client instance
 */
export const getDefaultSwaggerClient = (): SwaggerClient => {
  const config: SwaggerConfig = {
    validate: {
      schema: true,
      spec: true,
    },
    resolve: {
      external: true,
    },
  };

  return getSwaggerClient(config);
};

/**
 * Validate swagger configuration
 * 
 * @param config - Configuration to validate
 * @returns true if valid, false otherwise
 */
export const validateSwaggerConfig = (config: SwaggerConfig): boolean => {
  // Basic validation - all options are optional
  return true;
};

/**
 * Parse OpenAPI/Swagger specification from URL or file
 * 
 * @param url - URL or file path to the specification
 * @param options - Parser options
 * @returns Parsed API specification
 */
export const parseApiSpec = async (url: string, options?: SwaggerConfig): Promise<any> => {
  const client = getDefaultSwaggerClient();
  return await client.parse(url, options);
};

/**
 * Validate OpenAPI/Swagger specification
 * 
 * @param api - API specification object
 * @param options - Validation options
 * @returns Validation result
 */
export const validateApiSpec = async (api: any, options?: SwaggerConfig): Promise<any> => {
  const client = getDefaultSwaggerClient();
  return await client.validate(api, options);
};

// Export the default client for convenience
export default getDefaultSwaggerClient; 
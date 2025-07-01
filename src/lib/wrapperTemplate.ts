/**
 * Template wrapper for third-party libraries
 * 
 * This template demonstrates the best practice pattern for wrapping
 * third-party libraries to enable reliable mocking in tests.
 * 
 * USAGE:
 * 1. Copy this file and rename it to match your library (e.g., emailWrapper.ts)
 * 2. Replace the imports and types with your specific library
 * 3. Implement the wrapper functions for your use cases
 * 4. Update your service to use the wrapper instead of direct imports
 * 5. Mock the wrapper in your tests
 * 
 * EXAMPLE:
 * // Before (direct import - hard to mock)
 * import SomeLibrary from 'some-library';
 * const client = new SomeLibrary(config);
 * 
 * // After (using wrapper - easy to mock)
 * import getSomeLibraryClient from '../lib/someLibraryWrapper';
 * const client = getSomeLibraryClient(config);
 */

// Replace with your actual library import
// import SomeLibrary from 'some-library';

// Define the configuration interface for your library
export interface LibraryConfig {
  // Add your library's configuration options here
  apiKey?: string;
  endpoint?: string;
  timeout?: number;
  // ... other config options
}

// Define the client interface that your wrapper returns
export interface LibraryClient {
  // Add the methods you use from the library
  someMethod: (param: any) => Promise<any>;
  anotherMethod: (param: any) => Promise<any>;
  // ... other methods
}

/**
 * Create and configure a library client
 * 
 * @param config - Configuration options for the library
 * @returns Configured library client instance
 * 
 * This function should:
 * 1. Validate the configuration
 * 2. Create the library instance with proper settings
 * 3. Return a typed interface for the client
 */
export const getLibraryClient = (config: LibraryConfig): LibraryClient => {
  // Validate configuration
  if (!config.apiKey) {
    throw new Error('API key is required for library client');
  }

  // Create the library instance
  // const client = new SomeLibrary({
  //   apiKey: config.apiKey,
  //   endpoint: config.endpoint || 'https://api.example.com',
  //   timeout: config.timeout || 30000,
  // });

  // Return a typed interface
  // return {
  //   someMethod: async (param: any) => {
  //     return await client.someMethod(param);
  //   },
  //   anotherMethod: async (param: any) => {
  //     return await client.anotherMethod(param);
  //   },
  // };

  // Placeholder implementation - replace with actual library code
  throw new Error('Template wrapper - replace with actual implementation');
};

/**
 * Create a library client with default configuration from environment variables
 * 
 * @returns Configured library client instance
 */
export const getDefaultLibraryClient = (): LibraryClient => {
  const config: LibraryConfig = {
    apiKey: process.env.LIBRARY_API_KEY,
    endpoint: process.env.LIBRARY_ENDPOINT,
    timeout: process.env.LIBRARY_TIMEOUT ? parseInt(process.env.LIBRARY_TIMEOUT) : undefined,
  };

  return getLibraryClient(config);
};

/**
 * Validate library configuration
 * 
 * @param config - Configuration to validate
 * @returns true if valid, false otherwise
 */
export const validateLibraryConfig = (config: LibraryConfig): boolean => {
  return !!(config.apiKey && config.apiKey.length > 0);
};

// Export the default client for convenience
export default getDefaultLibraryClient;

/**
 * TESTING PATTERN:
 * 
 * In your test file:
 * 
 * // Mock the wrapper
 * jest.mock('../../../src/lib/yourLibraryWrapper', () => ({
 *   __esModule: true,
 *   default: jest.fn(),
 *   getLibraryClient: jest.fn(),
 * }));
 * 
 * // In beforeEach
 * const mockClient = {
 *   someMethod: jest.fn(),
 *   anotherMethod: jest.fn(),
 * };
 * (getLibraryClient as jest.Mock).mockReturnValue(mockClient);
 * 
 * // In your tests
 * mockClient.someMethod.mockResolvedValue({ success: true });
 */ 
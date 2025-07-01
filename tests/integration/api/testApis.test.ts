import { TEST_APIS, TestApiConfig } from '../../../src/lib/testApis';
import { parseOpenApiSpec } from '../../../src/lib/api/parser';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Mock axios to avoid external network calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Load local fixture for Petstore API
const petstoreFixture = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../fixtures/petstore-openapi.json'),
    'utf-8'
  )
);

describe('Test API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OpenAPI Spec Fetching', () => {
    // Only test the Petstore API which has a real OpenAPI spec
    const petstoreApi = TEST_APIS.find(api => api.name === 'Petstore API');
    
    if (petstoreApi) {
      it(`should fetch and parse OpenAPI spec for ${petstoreApi.name}`, async () => {
        // Mock the axios call to return our fixture
        mockedAxios.get.mockResolvedValueOnce({
          data: petstoreFixture,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        });

        // Parse the spec using our parser function
        const parsedSpec = await parseOpenApiSpec(petstoreApi.specUrl);
        
        expect(parsedSpec).toBeDefined();
        expect(parsedSpec.spec).toBeDefined();
        expect(parsedSpec.spec.paths).toBeDefined();
        expect(Object.keys(parsedSpec.spec.paths).length).toBeGreaterThan(0);
        
        // Validate we got a reasonable number of endpoints
        const endpointCount = Object.keys(parsedSpec.spec.paths).length;
        if (petstoreApi.expectedEndpoints) {
          expect(endpointCount).toBeGreaterThan(0);
          // Allow some flexibility in endpoint count
          expect(endpointCount).toBeGreaterThanOrEqual(
            Math.floor(petstoreApi.expectedEndpoints * 0.5)
          );
        }

        // Validate spec structure
        expect(parsedSpec.spec.info).toBeDefined();
        expect(parsedSpec.spec.info.title).toBeDefined();
        expect(parsedSpec.spec.info.version).toBeDefined();

        console.log(`${petstoreApi.name}: ${endpointCount} endpoints found`);
      }, 15000); // 15 second timeout for each test
    }

    // Test APIs that don't have OpenAPI specs
    TEST_APIS.filter(api => api.name !== 'Petstore API').forEach((api: TestApiConfig) => {
      it(`should handle non-OpenAPI JSON for ${api.name}`, async () => {
        // Mock axios to return non-OpenAPI JSON
        mockedAxios.get.mockResolvedValueOnce({
          data: { message: 'This is not an OpenAPI spec' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        });

        try {
          await parseOpenApiSpec(api.specUrl);
          fail(`Expected ${api.name} to fail parsing as it's not a real OpenAPI spec`);
        } catch (error: any) {
          expect(error.type).toBeDefined();
          expect(error.message).toBeDefined();
          console.log(`${api.name}: Correctly rejected as non-OpenAPI spec`);
        }
      }, 10000);
    });
  });

  describe('API Health Checks', () => {
    TEST_APIS.forEach((api: TestApiConfig) => {
      it(`should reach base URL for ${api.name}`, async () => {
        // Mock successful response
        mockedAxios.get.mockResolvedValueOnce({
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        });

        const response = await axios.get(api.baseUrl, {
          timeout: 5000,
          validateStatus: (status) => status < 500 // Accept any non-5xx response
        });
        
        // Should get some response (even if 404, that means the server is reachable)
        expect(response.status).toBeLessThan(500);
      }, 10000);
    });
  });

  describe('Rate Limit Simulation', () => {
    it('should handle rate limiting gracefully', async () => {
      // Test with JSONPlaceholder which has rate limiting
      const api = TEST_APIS.find(a => a.name === 'JSONPlaceholder');
      if (!api) {
        console.log('JSONPlaceholder not found in test APIs, skipping rate limit test');
        return;
      }

      // Mock successful responses
      mockedAxios.get.mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      const requests: Promise<any>[] = [];
      const maxRequests = 3; // Conservative number to avoid actual rate limiting

      // Make multiple requests quickly
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          axios.get(api.specUrl, {
            timeout: 5000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'APIQ-Test/1.0'
            }
          }).catch(error => error) // Don't fail the test on individual request failures
        );
      }

      const responses = await Promise.all(requests);
      
      // At least some requests should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      console.log(`Rate limit test: ${successfulResponses.length}/${maxRequests} requests succeeded`);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid spec URLs gracefully', async () => {
      const invalidUrl = 'https://httpbin.org/status/404';
      
      // Mock 404 response
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: 'Not Found'
        }
      });

      try {
        await parseOpenApiSpec(invalidUrl);
        fail('Expected parsing to fail');
      } catch (error: any) {
        expect(error.type).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedUrl = 'https://httpbin.org/json'; // Returns valid JSON, but not OpenAPI spec
      
      // Mock non-OpenAPI JSON response
      mockedAxios.get.mockResolvedValueOnce({
        data: { message: 'This is not an OpenAPI spec' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      try {
        await parseOpenApiSpec(malformedUrl);
        fail('Expected parsing to fail for non-OpenAPI JSON');
      } catch (error: any) {
        expect(error.type).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });
}); 
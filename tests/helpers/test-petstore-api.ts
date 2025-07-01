#!/usr/bin/env tsx

import { parseOpenApiSpec } from '../../src/lib/api/parser';
import { logInfo, logError } from '../../src/utils/logger';

const PETSTORE_API_URL = 'https://petstore.swagger.io/v2/swagger.json';

interface OpenApiOperation {
  summary?: string;
  description?: string;
  parameters?: any[];
  responses?: Record<string, any>;
}

async function testPetstoreApi() {
  console.log('🧪 Testing Petstore API Integration...\n');

  try {
    logInfo('Starting Petstore API test', { url: PETSTORE_API_URL });

    // Test parsing the Petstore OpenAPI spec
    const result = await parseOpenApiSpec(PETSTORE_API_URL);

    console.log('✅ Successfully parsed Petstore API specification!');
    console.log(`📋 API Title: ${result.title || 'N/A'}`);
    console.log(`📋 API Version: ${result.version}`);
    console.log(`📋 Endpoint Count: ${Object.keys(result.spec.paths).length}`);
    console.log(`📋 Spec Hash: ${result.specHash.substring(0, 8)}...`);

    // Display some sample endpoints
    console.log('\n📝 Sample Endpoints:');
    const paths = Object.keys(result.spec.paths);
    paths.slice(0, 5).forEach(path => {
      const pathItem = result.spec.paths[path];
      const methods = Object.keys(pathItem);
      methods.forEach(method => {
        const operation = pathItem[method] as OpenApiOperation;
        console.log(`  ${method.toUpperCase()} ${path} - ${operation.summary || 'No description'}`);
      });
    });

    if (paths.length > 5) {
      console.log(`  ... and ${paths.length - 5} more endpoints`);
    }

    // Test endpoint extraction
    console.log('\n🔍 Testing endpoint extraction...');
    const endpoints = [];
    
    for (const [path, pathItem] of Object.entries(result.spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as Record<string, OpenApiOperation>)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            summary: operation.summary || `${method.toUpperCase()} ${path}`,
            description: operation.description,
            parameters: operation.parameters || [],
            responses: operation.responses || {}
          });
        }
      }
    }

    console.log(`✅ Extracted ${endpoints.length} endpoints from Petstore API`);
    
    // Show some sample endpoint details
    console.log('\n📋 Sample Endpoint Details:');
    endpoints.slice(0, 3).forEach((endpoint, index) => {
      console.log(`\n${index + 1}. ${endpoint.method} ${endpoint.path}`);
      console.log(`   Summary: ${endpoint.summary}`);
      console.log(`   Parameters: ${endpoint.parameters.length}`);
      console.log(`   Responses: ${Object.keys(endpoint.responses).length}`);
    });

    console.log('\n🎉 Petstore API integration test completed successfully!');
    return true;

  } catch (error) {
    logError('Petstore API test failed', error as Error);
    console.error('❌ Petstore API test failed:', error);
    return false;
  }
}

// Run the test
testPetstoreApi()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 
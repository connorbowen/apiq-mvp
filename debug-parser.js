const axios = require('axios');

async function debugParser() {
  try {
    console.log('Fetching Petstore OpenAPI spec...');
    const response = await axios.get('https://petstore.swagger.io/v2/swagger.json');
    const specData = response.data;
    
    console.log('Testing parser logic...');
    
    // Test the parser logic from parser.ts
    if (typeof specData !== 'object' || specData === null) {
      throw new Error('OpenAPI specification must be a JSON object');
    }

    const api = specData;
    
    // Validate the spec has required components
    if (!api.paths || Object.keys(api.paths).length === 0) {
      throw new Error('No endpoints found in OpenAPI specification');
    }

    // Validate it's a valid OpenAPI/Swagger spec
    if (!api.openapi && !api.swagger) {
      throw new Error('Invalid OpenAPI specification: missing openapi or swagger version');
    }

    console.log('Parser validation passed!');
    console.log('Paths count:', Object.keys(api.paths).length);
    console.log('Version:', api.openapi || api.swagger);
    
  } catch (error) {
    console.error('Parser error:', error.message);
  }
}

debugParser(); 
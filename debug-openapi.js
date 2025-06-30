const axios = require('axios');

async function debugOpenAPI() {
  try {
    console.log('Fetching Petstore OpenAPI spec...');
    const response = await axios.get('https://petstore.swagger.io/v2/swagger.json');
    const spec = response.data;
    
    console.log('Spec version:', spec.swagger || spec.openapi);
    console.log('Has paths:', !!spec.paths);
    console.log('Paths count:', Object.keys(spec.paths || {}).length);
    console.log('Paths keys:', Object.keys(spec.paths || {}));
    
    // Test the validation logic from our service
    const errors = [];
    const warnings = [];

    if (!spec) {
      errors.push('Spec is null or undefined');
    }

    if (typeof spec !== 'object') {
      errors.push('Spec must be an object');
    }

    // Check for required OpenAPI version
    if (!spec.openapi && !spec.swagger) {
      errors.push('Missing OpenAPI version (openapi or swagger field)');
    }

    // Check for required info object
    if (!spec.info) {
      errors.push('Missing info object');
    }

    if (!spec.info.title) {
      errors.push('Missing info.title');
    }

    // Check for paths object
    if (!spec.paths) {
      errors.push('Missing paths object');
    }

    if (typeof spec.paths !== 'object') {
      errors.push('Paths must be an object');
    }

    // Check for at least one path
    const pathKeys = Object.keys(spec.paths);
    if (pathKeys.length === 0) {
      warnings.push('No API paths defined');
    }

    console.log('Validation errors:', errors);
    console.log('Validation warnings:', warnings);
    console.log('Is valid:', errors.length === 0);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugOpenAPI(); 
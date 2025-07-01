#!/usr/bin/env tsx

import { parseOpenApiSpec } from '../../src/lib/api/parser';

const PETSTORE_API_URL = 'https://petstore.swagger.io/v2/swagger.json';

async function debugParser() {
  console.log('🔍 Debugging parseOpenApiSpec...\n');

  try {
    const result = await parseOpenApiSpec(PETSTORE_API_URL);
    
    console.log('✅ parseOpenApiSpec returned:');
    console.log('Type:', typeof result);
    console.log('Keys:', Object.keys(result));
    console.log('rawSpec type:', typeof result.rawSpec);
    console.log('rawSpec length:', result.rawSpec?.length);
    console.log('specHash:', result.specHash);
    console.log('spec type:', typeof result.spec);
    console.log('spec keys:', Object.keys(result.spec || {}));
    
    // Check if rawSpec is a string
    if (typeof result.rawSpec === 'string') {
      console.log('✅ rawSpec is a string');
      console.log('First 100 chars:', result.rawSpec.substring(0, 100));
    } else {
      console.log('❌ rawSpec is not a string:', typeof result.rawSpec);
    }
    
    // Check if specHash is a string
    if (typeof result.specHash === 'string') {
      console.log('✅ specHash is a string');
      console.log('Hash length:', result.specHash.length);
    } else {
      console.log('❌ specHash is not a string:', typeof result.specHash);
    }

  } catch (error) {
    console.error('❌ parseOpenApiSpec failed:', error);
  }
}

debugParser()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 
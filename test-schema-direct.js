#!/usr/bin/env node

const { PrismaClient } = require('./src/generated/prisma');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testSchemaExtractionDirect() {
  try {
    console.log('🔍 Testing Schema Extraction Directly...\n');

    // Fetch the Petstore OpenAPI spec directly
    console.log('📥 Fetching Petstore OpenAPI spec...');
    const specResponse = await fetch('https://petstore.swagger.io/v2/swagger.json');
    const spec = await specResponse.json();
    
    console.log(`✅ Fetched spec with ${Object.keys(spec.paths || {}).length} paths`);

    // Analyze the spec for request schemas
    console.log('\n🔍 Analyzing spec for request schemas...');
    
    if (spec.paths) {
      const pathsWithPost = Object.entries(spec.paths).filter(([path, methods]) => 
        methods.post || methods.put || methods.patch
      );
      
      console.log(`📊 Found ${pathsWithPost.length} paths with POST/PUT/PATCH methods\n`);
      
      let totalBodyParams = 0;
      
      pathsWithPost.forEach(([path, methods]) => {
        console.log(`--- Path: ${path} ---`);
        
        ['post', 'put', 'patch'].forEach(method => {
          if (methods[method]) {
            const operation = methods[method];
            console.log(`  ${method.toUpperCase()}: ${operation.summary || operation.operationId || 'No summary'}`);
            
            // Check for parameters with body (OpenAPI 2.0)
            if (operation.parameters) {
              const bodyParams = operation.parameters.filter(p => p.in === 'body');
              if (bodyParams.length > 0) {
                console.log(`    ✅ Has ${bodyParams.length} body parameter(s) (OpenAPI 2.0)`);
                totalBodyParams += bodyParams.length;
                bodyParams.forEach((param, idx) => {
                  console.log(`    📝 Body Param ${idx + 1}: ${param.name}`);
                  console.log(`      Required: ${param.required}`);
                  console.log(`      Schema: ${JSON.stringify(param.schema, null, 6)}`);
                });
              } else {
                console.log(`    ❌ No body parameters found`);
              }
            } else {
              console.log(`    ❌ No parameters found`);
            }
          }
        });
        console.log('');
      });
      
      console.log(`\n📊 Summary:`);
      console.log(`Total paths with POST/PUT/PATCH: ${pathsWithPost.length}`);
      console.log(`Total body parameters found: ${totalBodyParams}`);
      
      if (totalBodyParams > 0) {
        console.log(`✅ The Petstore API DOES have request schemas!`);
        console.log(`❌ The issue is likely in the schema extraction process, not the API itself.`);
      } else {
        console.log(`❌ The Petstore API does not have request schemas.`);
      }
    }

    // Now let's test the schema extraction logic
    console.log('\n🔍 Testing Schema Extraction Logic...');
    
    // Simulate what the endpoint extraction should do
    const testPath = '/pet';
    const testMethod = 'post';
    const testOperation = spec.paths[testPath][testMethod];
    
    console.log(`\nTesting extraction for ${testMethod.toUpperCase()} ${testPath}:`);
    console.log(`Summary: ${testOperation.summary}`);
    
    if (testOperation.parameters) {
      const bodyParams = testOperation.parameters.filter(p => p.in === 'body');
      if (bodyParams.length > 0) {
        console.log(`✅ Found ${bodyParams.length} body parameter(s)`);
        
        const bodyParam = bodyParams[0];
        console.log(`Body Parameter Details:`);
        console.log(`  Name: ${bodyParam.name}`);
        console.log(`  Required: ${bodyParam.required}`);
        console.log(`  Schema: ${JSON.stringify(bodyParam.schema, null, 4)}`);
        
        // This is what should be stored in the database
        const endpointData = {
          path: testPath,
          method: testMethod.toUpperCase(),
          summary: testOperation.summary,
          parameters: testOperation.parameters,
          requestBody: null // OpenAPI 2.0 doesn't have requestBody
        };
        
        console.log(`\n📝 Endpoint data that should be stored:`);
        console.log(`Parameters: ${JSON.stringify(endpointData.parameters, null, 2)}`);
        
        // Test the schema extraction logic from getEndpointsForConnection
        let rawReqSchema = null;
        if (endpointData.requestBody) {
          const requestBody = endpointData.requestBody;
          if (requestBody.content) {
            const contentType = Object.keys(requestBody.content)[0];
            rawReqSchema = contentType ? requestBody.content[contentType]?.schema : null;
          }
        } else if (endpointData.parameters) {
          // OpenAPI 2.0: Look for body parameter
          const parameters = endpointData.parameters;
          const bodyParam = parameters.find(param => param.in === 'body');
          rawReqSchema = bodyParam?.schema || null;
        }
        
        console.log(`\n🔍 Schema extraction result:`);
        if (rawReqSchema) {
          console.log(`✅ Successfully extracted request schema:`);
          console.log(JSON.stringify(rawReqSchema, null, 4));
        } else {
          console.log(`❌ Failed to extract request schema`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchemaExtractionDirect();


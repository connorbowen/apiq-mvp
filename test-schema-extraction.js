#!/usr/bin/env node

const { PrismaClient } = require('./src/generated/prisma');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testSchemaExtraction() {
  try {
    console.log('🔍 Testing Schema Extraction...\n');

    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test-schema-user@example.com',
        name: 'Test Schema User',
        password: 'hashedpassword',
        role: 'ADMIN',
        isActive: true,
        onboardingStage: 'COMPLETED',
        onboardingCompletedAt: new Date()
      }
    });

    console.log(`✅ Created test user: ${testUser.email}`);

    // Create a connection via API
    const connectionData = {
      name: 'Test Petstore API',
      description: 'Test connection for schema extraction',
      baseUrl: 'https://petstore.swagger.io/v2',
      authType: 'API_KEY',
      credentials: {
        apiKey: 'test-api-key-123'
      },
      documentationUrl: 'https://petstore.swagger.io/v2/swagger.json'
    };

    const response = await fetch('http://localhost:3000/api/connections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=test-token; refreshToken=test-refresh-token`
      },
      body: JSON.stringify(connectionData)
    });

    if (!response.ok) {
      console.log(`❌ API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`✅ Created connection: ${result.data.name}`);
    console.log(`📊 Connection ID: ${result.data.id}`);

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check what's in the database
    const connection = await prisma.apiConnection.findUnique({
      where: { id: result.data.id },
      include: {
        endpoints: {
          where: {
            method: 'POST'
          },
          take: 3
        }
      }
    });

    if (!connection) {
      console.log('❌ Connection not found in database');
      return;
    }

    console.log(`\n📊 Connection Details:`);
    console.log(`Name: ${connection.name}`);
    console.log(`Base URL: ${connection.baseUrl}`);
    console.log(`Documentation URL: ${connection.documentationUrl}`);
    console.log(`Ingestion Status: ${connection.ingestionStatus}`);
    console.log(`Raw Spec Length: ${connection.rawSpec ? connection.rawSpec.length : 0} characters`);
    console.log(`Endpoints Count: ${connection.endpoints.length}`);

    // Analyze raw spec
    if (connection.rawSpec) {
      try {
        const spec = JSON.parse(connection.rawSpec);
        console.log(`\n🔍 Raw Spec Analysis:`);
        
        if (spec.paths) {
          const pathsWithPost = Object.entries(spec.paths).filter(([path, methods]) => 
            methods.post || methods.put || methods.patch
          );
          
          console.log(`📊 Found ${pathsWithPost.length} paths with POST/PUT/PATCH methods`);
          
          // Check first POST endpoint
          const firstPostPath = pathsWithPost.find(([path, methods]) => methods.post);
          if (firstPostPath) {
            const [path, methods] = firstPostPath;
            const postOp = methods.post;
            console.log(`\n🎯 First POST endpoint: ${path}`);
            console.log(`Summary: ${postOp.summary}`);
            
            if (postOp.parameters) {
              const bodyParams = postOp.parameters.filter(p => p.in === 'body');
              if (bodyParams.length > 0) {
                console.log(`✅ Has ${bodyParams.length} body parameter(s)`);
                bodyParams.forEach((param, idx) => {
                  console.log(`  Body Param ${idx + 1}: ${param.name}`);
                  console.log(`    Required: ${param.required}`);
                  console.log(`    Schema: ${JSON.stringify(param.schema, null, 4)}`);
                });
              } else {
                console.log(`❌ No body parameters found`);
              }
            } else {
              console.log(`❌ No parameters found`);
            }
          }
        }
      } catch (error) {
        console.log(`❌ Error parsing raw spec: ${error.message}`);
      }
    }

    // Check stored endpoints
    console.log(`\n🔍 Stored Endpoints Analysis:`);
    for (let i = 0; i < connection.endpoints.length; i++) {
      const endpoint = connection.endpoints[i];
      console.log(`\n--- Endpoint ${i + 1} ---`);
      console.log(`ID: ${endpoint.id}`);
      console.log(`Method: ${endpoint.method}`);
      console.log(`Path: ${endpoint.path}`);
      console.log(`Summary: ${endpoint.summary}`);
      
      if (endpoint.parameters) {
        try {
          const params = typeof endpoint.parameters === 'string' 
            ? JSON.parse(endpoint.parameters) 
            : endpoint.parameters;
          
          const bodyParams = params.filter(p => p.in === 'body');
          if (bodyParams.length > 0) {
            console.log(`🎯 Body Parameters Found: ${bodyParams.length}`);
            bodyParams.forEach((param, idx) => {
              console.log(`  Body Param ${idx + 1}: ${param.name}`);
              console.log(`    Required: ${param.required}`);
              console.log(`    Schema: ${JSON.stringify(param.schema, null, 4)}`);
            });
          } else {
            console.log(`❌ No body parameters found`);
          }
        } catch (error) {
          console.log(`❌ Error parsing parameters: ${error.message}`);
          console.log(`Raw parameters: ${endpoint.parameters}`);
        }
      } else {
        console.log(`❌ No parameters stored`);
      }
    }

    // Test API endpoint
    console.log(`\n🔍 Testing API Endpoint:`);
    try {
      const apiResponse = await fetch(`http://localhost:3000/api/connections/${connection.id}/endpoints`);
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log(`✅ API returned ${apiData.data.endpoints.length} endpoints`);
        
        const postEndpoints = apiData.data.endpoints.filter(e => e.method === 'POST');
        if (postEndpoints.length > 0) {
          const firstPost = postEndpoints[0];
          console.log(`\n🎯 First POST endpoint from API:`);
          console.log(`Method: ${firstPost.method}`);
          console.log(`Path: ${firstPost.path}`);
          console.log(`Has requestSchema: ${!!firstPost.requestSchema}`);
          if (firstPost.requestSchema) {
            console.log(`Request Schema: ${JSON.stringify(firstPost.requestSchema, null, 2)}`);
          } else {
            console.log(`❌ No requestSchema in API response`);
          }
        }
      } else {
        console.log(`❌ API request failed: ${apiResponse.status} ${apiResponse.statusText}`);
      }
    } catch (error) {
      console.log(`❌ API test error: ${error.message}`);
    }

    // Cleanup
    await prisma.apiConnection.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log(`\n✅ Cleaned up test data`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchemaExtraction();


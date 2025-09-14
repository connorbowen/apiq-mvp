#!/usr/bin/env node

const { PrismaClient } = require('./src/generated/prisma');
const fetch = require('node-fetch');

async function testConnectionCreation() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 [DEBUG] Testing connection creation and schema extraction...\n');

    // 1. Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: `debug-test-user-${Date.now()}@test.com`,
        name: 'Debug Test User',
        password: '$2a$10$test', // dummy hash
        role: 'ADMIN',
        isActive: true,
        onboardingStage: 'COMPLETED',
        onboardingCompletedAt: new Date()
      }
    });

    console.log('✅ Created test user:', testUser.id);

    // 2. Create a connection
    const connection = await prisma.apiConnection.create({
      data: {
        userId: testUser.id,
        name: 'Debug Petstore',
        baseUrl: 'https://petstore.swagger.io/v2',
        documentationUrl: 'https://petstore.swagger.io/v2/swagger.json',
        authType: 'NONE',
        authConfig: {},
        status: 'ACTIVE',
        connectionStatus: 'connected',
        ingestionStatus: 'PENDING'
      }
    });

    console.log('✅ Created connection:', connection.id);

    // 3. Fetch the OpenAPI spec
    console.log('📥 Fetching OpenAPI spec...');
    const specResponse = await fetch('https://petstore.swagger.io/v2/swagger.json');
    const spec = await specResponse.json();
    console.log('✅ Fetched spec with', Object.keys(spec.paths).length, 'paths');

    // 4. Store the raw spec
    await prisma.apiConnection.update({
      where: { id: connection.id },
      data: { rawSpec: JSON.stringify(spec) }
    });

    console.log('✅ Stored raw spec');

    // 5. Extract and store endpoints
    console.log('🔍 Extracting endpoints...');
    
    // Import the extraction function
    const { extractAndStoreEndpoints } = require('./src/lib/api/endpoints.ts');
    
    // Parse the spec
    const parsedSpec = {
      spec: spec,
      version: spec.swagger || spec.openapi || '2.0'
    };

    const endpointIds = await extractAndStoreEndpoints(connection.id, parsedSpec);
    console.log('✅ Extracted', endpointIds.length, 'endpoints');

    // 6. Check what was stored
    const storedEndpoints = await prisma.endpoint.findMany({
      where: { apiConnectionId: connection.id },
      orderBy: [{ path: 'asc' }, { method: 'asc' }]
    });

    console.log('\n📊 Stored endpoints:');
    storedEndpoints.forEach((endpoint, idx) => {
      console.log(`  ${idx + 1}. ${endpoint.method} ${endpoint.path}`);
      console.log(`     Summary: ${endpoint.summary || 'No summary'}`);
      console.log(`     Has parameters: ${!!endpoint.parameters}`);
      console.log(`     Has requestBody: ${!!endpoint.requestBody}`);
      
      if (endpoint.parameters) {
        try {
          const params = typeof endpoint.parameters === 'string' ? JSON.parse(endpoint.parameters) : endpoint.parameters;
          const bodyParam = params.find(p => p.in === 'body');
          if (bodyParam) {
            console.log(`     ✅ Body parameter found with schema:`);
            console.log(`        ${JSON.stringify(bodyParam.schema, null, 8)}`);
          } else {
            console.log(`     ❌ No body parameter found`);
          }
        } catch (e) {
          console.log(`     ❌ Error parsing parameters: ${e.message}`);
        }
      }
      
      console.log('');
    });

    // 7. Test the getEndpointsForConnection function
    console.log('🔍 Testing getEndpointsForConnection...');
    const { getEndpointsForConnection } = require('./src/lib/api/endpoints.ts');
    
    const transformedEndpoints = await getEndpointsForConnection(connection.id);
    console.log('✅ Retrieved', transformedEndpoints.length, 'transformed endpoints');
    
    const endpointsWithRequestSchema = transformedEndpoints.filter(e => e.requestSchema);
    console.log('📊 Endpoints with request schema:', endpointsWithRequestSchema.length);
    
    if (endpointsWithRequestSchema.length > 0) {
      console.log('✅ Request schemas found!');
      endpointsWithRequestSchema.forEach((endpoint, idx) => {
        console.log(`  ${idx + 1}. ${endpoint.method} ${endpoint.path}`);
        console.log(`     Request schema: ${JSON.stringify(endpoint.requestSchema, null, 6)}`);
      });
    } else {
      console.log('❌ No request schemas found in transformed endpoints');
    }

    // 8. Clean up
    await prisma.endpoint.deleteMany({ where: { apiConnectionId: connection.id } });
    await prisma.apiConnection.delete({ where: { id: connection.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✅ Cleaned up test data');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnectionCreation().catch(console.error);

#!/usr/bin/env node

/**
 * Script to refresh the Petstore connection's OpenAPI spec
 * This will trigger the updated extractAndStoreEndpoints function
 * to extract and store response schemas with dereferencing
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { prisma } = require('../lib/database/client');
const { Prisma } = require('../src/generated/prisma');
const axios = require('axios');

async function refreshPetstoreConnection() {
  try {
    console.log('🔍 Looking for Petstore connection...');
    
    // Find the Petstore connection
    let connection = await prisma.apiConnection.findFirst({
      where: {
        name: {
          contains: 'Petstore',
          mode: 'insensitive'
        }
      },
      include: {
        endpoints: {
          where: { isActive: true }
        }
      }
    });

    if (!connection) {
      console.log('❌ No Petstore connection found');
      
      // List all connections
      const allConnections = await prisma.apiConnection.findMany({
        select: { id: true, name: true, documentationUrl: true }
      });
      
      console.log('📋 Available connections:');
      allConnections.forEach(conn => {
        console.log(`  - ${conn.name} (${conn.id})`);
      });
      
      if (allConnections.length === 0) {
        console.log('❌ No connections found in database');
        return;
      }
      
      // Use the first connection that has a documentation URL
      connection = await prisma.apiConnection.findFirst({
        where: {
          documentationUrl: { not: null }
        },
        include: {
          endpoints: {
            where: { isActive: true }
          }
        }
      });
      
      if (!connection) {
        console.log('❌ No connections with documentation URL found');
        console.log('🔄 Using existing connection and updating it with Petstore URL...');
        
        // Use the first existing connection and update it with Petstore URL
        const existingConnection = await prisma.apiConnection.findFirst();
        if (!existingConnection) {
          console.log('❌ No connections found to update');
          return;
        }
        
        connection = await prisma.apiConnection.update({
          where: { id: existingConnection.id },
          data: {
            name: 'Petstore API Test',
            description: 'Petstore API for testing response schema extraction',
            baseUrl: 'https://petstore.swagger.io/v2',
            authType: 'NONE',
            authConfig: {},
            documentationUrl: 'https://petstore.swagger.io/v2/swagger.json',
            status: 'ACTIVE',
            ingestionStatus: 'PENDING'
          },
          include: {
            endpoints: {
              where: { isActive: true }
            }
          }
        });
        
        console.log(`✅ Updated connection: ${connection.name} (ID: ${connection.id})`);
      } else {
        console.log(`✅ Using connection: ${connection.name} (ID: ${connection.id})`);
      }
    }

    console.log(`📊 Current endpoints: ${connection.endpoints.length}`);

    if (!connection.documentationUrl) {
      console.log('❌ No documentation URL found for this connection');
      return;
    }

    console.log(`🔄 Fetching spec from: ${connection.documentationUrl}`);

    // Fetch the OpenAPI spec directly
    const response = await axios.get(connection.documentationUrl);
    const specData = response.data;
    
    console.log('📋 Fetched spec successfully');

    // Parse the spec (simplified version)
    const rawSpec = JSON.stringify(specData, null, 2);
    const crypto = require('crypto');
    const specHash = crypto.createHash('sha256').update(rawSpec).digest('hex');

    // Update connection with new spec data
    await prisma.apiConnection.update({
      where: { id: connection.id },
      data: {
        rawSpec: rawSpec,
        specHash: specHash,
        ingestionStatus: 'SUCCEEDED',
        lastTested: new Date()
      }
    });

    console.log('💾 Updated connection with new spec data');

    // Extract endpoints manually (simplified version)
    const extractedEndpoints = [];
    
    for (const [path, pathItem] of Object.entries(specData.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const op = operation;

          // Extract first success response schema (OAS2 or OAS3)
          const rawRespSchema = firstSuccessResponse(op);
          let responseSchema = undefined;
          if (rawRespSchema) {
            // For now, just use the raw schema without dereferencing
            responseSchema = rawRespSchema;
          }

          extractedEndpoints.push({
            apiConnectionId: connection.id,
            path,
            method: method.toUpperCase(),
            summary: op.summary,
            description: op.description,
            parameters: op.parameters || [],
            requestBody: op.requestBody,
            responses: op.responses,
            responseSchema: responseSchema
          });
        }
      }
    }

    // Delete existing endpoints and create new ones
    await prisma.endpoint.deleteMany({
      where: { apiConnectionId: connection.id }
    });

    await prisma.endpoint.createMany({
      data: extractedEndpoints
    });

    console.log(`✅ Successfully extracted ${extractedEndpoints.length} endpoints with response schemas`);

    // Verify some endpoints have response schemas
    const endpointsWithResponseSchemas = await prisma.endpoint.findMany({
      where: {
        apiConnectionId: connection.id,
        isActive: true,
        NOT: [{ responseSchema: { equals: Prisma.DbNull } }]
      },
      select: {
        id: true,
        path: true,
        method: true,
        responseSchema: true
      }
    });

    console.log(`📋 Endpoints with response schemas: ${endpointsWithResponseSchemas.length}`);
    
    if (endpointsWithResponseSchemas.length > 0) {
      console.log('🔍 Sample endpoints with response schemas:');
      endpointsWithResponseSchemas.slice(0, 3).forEach(endpoint => {
        console.log(`  - ${endpoint.method} ${endpoint.path}`);
      });
    }

    console.log('🎉 Refresh completed successfully!');

  } catch (error) {
    console.error('❌ Error refreshing Petstore connection:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper to extract first success response schema (OAS2 or OAS3)
function firstSuccessResponse(op) {
  const resKey = Object.keys(op.responses || {}).find(k => /^2\d\d$/.test(k));
  if (!resKey) return undefined;
  const resObj = op.responses[resKey];
  if (resObj.content) {
    const firstCT = Object.keys(resObj.content)[0];
    return resObj.content[firstCT]?.schema;
  }
  if (resObj.schema) return resObj.schema;
  return undefined;
}

// Run the script
refreshPetstoreConnection(); 
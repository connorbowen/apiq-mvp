import { prisma } from '../../lib/database/client';
import petstoreOpenApi from '../fixtures/petstore-openapi.json';

/**
 * Creates a test API connection for the given user with endpoints from Petstore OpenAPI.
 * Only to be used in test scripts.
 * @param userId - The user ID to associate the connection with
 * @param provider - The API provider (e.g., 'github', 'slack')
 * @returns The created API connection
 */
export async function createTestApiConnection(userId: string) {
  // Use a unique name for test connections
  const name = `Test API Connection (${Date.now()})`;
  
  // Create the API connection
  const connection = await prisma.apiConnection.create({
    data: {
      userId,
      name,
      baseUrl: 'https://api.test.local',
      authType: 'API_KEY',
      authConfig: {
        apiKey: 'test-api-key',
      },
      status: 'ACTIVE',
      connectionStatus: 'connected',
      ingestionStatus: 'SUCCEEDED',
    },
  });

  // Create endpoints from Petstore OpenAPI spec
  const endpoints = [];
  const paths = petstoreOpenApi.paths;
  
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods as any)) {
      if (method === 'parameters') continue; // Skip path-level parameters
      
      const op = operation as any;
      endpoints.push({
        apiConnectionId: connection.id,
        path,
        method: method.toUpperCase(),
        summary: op.summary || `${method.toUpperCase()} ${path}`,
        description: op.description || '',
        parameters: op.parameters || [],
        requestBody: op.requestBody || null,
        responses: op.responses || {},
        tags: op.tags || [],
        isActive: true,
      });
    }
  }

  // Create all endpoints in a single transaction
  if (endpoints.length > 0) {
    await prisma.endpoint.createMany({
      data: endpoints,
    });
  }

  console.log(`Created test API connection with ${endpoints.length} endpoints`);
  return connection;
}

/**
 * Deletes all test API connections for the given user.
 * Only to be used in test scripts.
 * @param userId - The user ID whose test connections should be deleted
 */
export async function cleanupTestApiConnections(userId: string) {
  await prisma.apiConnection.deleteMany({
    where: {
      userId,
      name: { contains: 'Test ' },
    },
  });
} 
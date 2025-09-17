import { prisma } from '../../lib/database/client';
import petstoreOpenApi from '../fixtures/petstore-openapi.json';

/**
 * Creates a test API connection for the given user with endpoints from Petstore OpenAPI.
 * Only to be used in test scripts.
 * @param userId - The user ID to associate the connection with
 * @param provider - The API provider (e.g., 'github', 'slack')
 * @returns The created API connection
 */
export async function createTestApiConnection(userId: string, provider?: string) {
  // Use a unique name for test connections that matches AI detection expectations
  const name = provider 
    ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} E2E Connection (${Date.now()})`
    : `E2E Connection for Testing (${Date.now()})`;
  
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
        parameters: Array.isArray(op.parameters) ? op.parameters : [],
        requestBody: op.requestBody || null,
        responses: op.responses || {},
        isActive: true,
      });
      // Debug log for parameters
      if (!Array.isArray(op.parameters)) {
        // eslint-disable-next-line no-console
        console.warn(`[DEBUG] Endpoint ${method.toUpperCase()} ${path} has non-array parameters:`, op.parameters);
      }
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
 * Creates multiple test API connections for workflow testing
 * Creates connections with names that match AI detection expectations
 * Uses minimal, focused endpoints to avoid token limit issues
 * @param userId - The user ID to associate the connections with
 * @returns Array of created API connections
 */
export async function createTestWorkflowConnections(userId: string) {
  const providers = ['GitHub', 'Slack', 'Trello', 'SendGrid', 'Stripe', 'Shopify', 'QuickBooks', 'ShipStation'];
  const connections = [];
  
  for (const provider of providers) {
    const connection = await createMinimalTestApiConnection(userId, provider.toLowerCase());
    connections.push(connection);
  }
  
  console.log(`Created ${connections.length} test workflow connections with minimal endpoints`);
  return connections;
}

/**
 * Creates a minimal test API connection with only essential endpoints
 * This prevents token limit issues in AI workflow generation
 * @param userId - The user ID to associate the connection with
 * @param provider - The API provider (e.g., 'github', 'slack')
 * @returns The created API connection
 */
export async function createMinimalTestApiConnection(userId: string, provider: string) {
  const name = `${provider.charAt(0).toUpperCase() + provider.slice(1)} E2E Connection (${Date.now()})`;
  
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

  // Create minimal, focused endpoints based on provider
  const endpoints = getMinimalEndpointsForProvider(provider, connection.id);
  
  if (endpoints.length > 0) {
    await prisma.endpoint.createMany({
      data: endpoints,
    });
  }

  console.log(`Created minimal test API connection with ${endpoints.length} endpoints for ${provider}`);
  return connection;
}

/**
 * Get minimal, focused endpoints for a specific provider
 * Only includes the most commonly used endpoints to avoid token limits
 */
function getMinimalEndpointsForProvider(provider: string, connectionId: string) {
  const baseEndpoints = [
    {
      apiConnectionId: connectionId,
      path: '/health',
      method: 'GET',
      summary: 'Health check',
      description: 'Check API health status',
      parameters: [],
      requestBody: undefined,
      responses: { '200': { description: 'OK' } },
      isActive: true,
    }
  ];

  switch (provider.toLowerCase()) {
    case 'github':
      return [
        ...baseEndpoints,
        {
          apiConnectionId: connectionId,
          path: '/repos/{owner}/{repo}/issues',
          method: 'GET',
          summary: 'List issues',
          description: 'List issues for a repository',
          parameters: [
            { name: 'owner', in: 'path', required: true, type: 'string' },
            { name: 'repo', in: 'path', required: true, type: 'string' }
          ],
          requestBody: undefined,
          responses: { '200': { description: 'List of issues' } },
          isActive: true,
        },
        {
          apiConnectionId: connectionId,
          path: '/repos/{owner}/{repo}/issues',
          method: 'POST',
          summary: 'Create issue',
          description: 'Create a new issue',
          parameters: [
            { name: 'owner', in: 'path', required: true, type: 'string' },
            { name: 'repo', in: 'path', required: true, type: 'string' }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    body: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { '201': { description: 'Issue created' } },
          isActive: true,
        }
      ];

    case 'slack':
      return [
        ...baseEndpoints,
        {
          apiConnectionId: connectionId,
          path: '/chat.postMessage',
          method: 'POST',
          summary: 'Send message',
          description: 'Send a message to a channel',
          parameters: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    channel: { type: 'string' },
                    text: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Message sent' } },
          isActive: true,
        }
      ];

    case 'trello':
      return [
        ...baseEndpoints,
        {
          apiConnectionId: connectionId,
          path: '/cards',
          method: 'POST',
          summary: 'Create card',
          description: 'Create a new Trello card',
          parameters: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    desc: { type: 'string' },
                    idList: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Card created' } },
          isActive: true,
        }
      ];

    case 'sendgrid':
      return [
        ...baseEndpoints,
        {
          apiConnectionId: connectionId,
          path: '/mail/send',
          method: 'POST',
          summary: 'Send email',
          description: 'Send an email via SendGrid',
          parameters: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    to: { type: 'string' },
                    from: { type: 'string' },
                    subject: { type: 'string' },
                    text: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { '202': { description: 'Email queued' } },
          isActive: true,
        }
      ];

    case 'stripe':
      return [
        ...baseEndpoints,
        {
          apiConnectionId: connectionId,
          path: '/charges',
          method: 'POST',
          summary: 'Create charge',
          description: 'Create a payment charge',
          parameters: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    amount: { type: 'integer' },
                    currency: { type: 'string' },
                    source: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Charge created' } },
          isActive: true,
        }
      ];

    case 'shopify':
      return [
        ...baseEndpoints,
        {
          apiConnectionId: connectionId,
          path: '/orders',
          method: 'GET',
          summary: 'List orders',
          description: 'List orders from Shopify',
          parameters: [],
          requestBody: undefined,
          responses: { '200': { description: 'List of orders' } },
          isActive: true,
        }
      ];

    default:
      return baseEndpoints;
  }
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
      name: { contains: 'E2E Connection for Testing' },
    },
  });
} 
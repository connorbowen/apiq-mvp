import { createMocks } from 'node-mocks-http';
import { NextApiRequest } from 'next';
import { createTestConnection } from '../../helpers/testUtils';
import { prisma } from '../../../src/lib/singletons/prisma';
import { generateToken } from '../../../src/lib/auth/session';
import bcrypt from 'bcryptjs';

// Mock the OpenAI service to avoid API calls
jest.mock('../../../src/lib/services/naturalLanguageWorkflowService', () => {
  return {
    __esModule: true,
    default: class MockNaturalLanguageWorkflowService {
      generateWorkflow = jest.fn().mockResolvedValue({
        success: true,
        workflow: {
          id: 'test-workflow-id',
          name: 'Test Workflow',
          description: 'A test workflow',
          steps: [
            {
              id: 'step-1',
              type: 'api_call',
              endpoint: '/api/test',
              method: 'GET',
              parameters: {}
            }
          ]
        }
      });
      validateWorkflow = jest.fn().mockResolvedValue({
        isValid: true,
        errors: []
      });
    }
  };
});

// Helper function to create properly typed mock requests
function createMockRequest(options: any = {}) {
  const { req, res } = createMocks(options);
  return {
    req: req as unknown as NextApiRequest,
    res: res as any // Use any to preserve mock methods
  };
}

describe('Workflow Generation API Integration Tests', () => {
  let testUser: any;
  let testConnection: any;
  let generateHandler: any;
  let realJWT: string;

  beforeEach(async () => {
    jest.resetModules();
    generateHandler = (await import('../../../pages/api/workflows/generate')).default;
    
    // Create a fresh test user for each test (following secrets test pattern)
    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    testUser = await prisma.user.create({
      data: {
        email: 'workflow-test@example.com',
        name: 'Workflow Test User',
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    });

    // Generate real JWT token using the actual auth system
    realJWT = generateToken(testUser, 'access');
    
    // Create test connection
    testConnection = await createTestConnection({
      id: testUser.id,
      email: testUser.email,
      password: 'testPassword123',
      name: testUser.name,
      role: testUser.role,
      accessToken: realJWT,
      refreshToken: 'dummy-refresh-token'
    });
  });

  afterEach(async () => {
    // Clean up database state after each test
    try {
      if (testConnection?.id) {
        await prisma.apiConnection.delete({ where: { id: testConnection.id } });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    try {
      if (testUser?.id) {
        await prisma.user.delete({ where: { id: testUser.id } });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should authenticate successfully', async () => {
    // Simple test to verify authentication works
    const { req, res } = createMockRequest({
      method: 'POST',
      body: {
        userDescription: 'Simple test'
      },
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${realJWT}`
      }
    });

    await generateHandler(req, res);
    
    // If authentication fails, we get 401. If it succeeds, we get either 200 or 400 (for missing connections)
    const status = res._getStatusCode();
    const responseData = res._getData();
    
    // Should not be 401 (unauthorized)
    expect(status).not.toBe(401);
    
    // Log the response for debugging
    console.log('Response status:', status);
    console.log('Response data:', responseData);
  });

  it('should generate workflow successfully with valid request', async () => {
    const userDescription = 'Create a workflow to fetch user data from GitHub';

    const { req, res } = createMockRequest({
      method: 'POST',
      body: {
        userDescription
      },
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${realJWT}`
      }
    });

    await generateHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('workflow');
    expect(data.data.workflow).toHaveProperty('id');
    expect(data.data.workflow).toHaveProperty('name');
    expect(data.data.workflow).toHaveProperty('steps');
    expect(Array.isArray(data.data.workflow.steps)).toBe(true);
  });

  it('should return 400 for missing userDescription', async () => {
    const { req, res } = createMockRequest({
      method: 'POST',
      body: {
        // Missing userDescription
      },
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${realJWT}`
      }
    });

    await generateHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toContain('userDescription is required');
  });

  it('should return 400 for invalid userDescription type', async () => {
    const { req, res } = createMockRequest({
      method: 'POST',
      body: {
        userDescription: 123 // Should be string
      },
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${realJWT}`
      }
    });

    await generateHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toContain('userDescription is required and must be a string');
  });

  it('should return 401 without authentication', async () => {
    const { req, res } = createMockRequest({
      method: 'POST',
      body: {
        userDescription: 'Test workflow generation'
      },
      headers: {
        'content-type': 'application/json'
        // No authorization header
      }
    });

    await generateHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
  });

  it('should return 405 for unsupported HTTP method', async () => {
    const { req, res } = createMockRequest({
      method: 'GET', // Should be POST
      headers: {
        'authorization': `Bearer ${realJWT}`
      }
    });

    await generateHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Method not allowed');
  });
}); 
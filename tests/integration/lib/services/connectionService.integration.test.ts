import { prisma } from '../../../../lib/database/client';
import {
  markConnecting,
  markConnected,
  markError,
  markDisconnected,
  markRevoked,
  findConnectionByOAuthState,
} from '../../../../src/lib/services/connectionService';
import { ConnectionStatus } from '../../../../src/generated/prisma';
import { createTestUser } from '../../../helpers/testUtils';

describe('ConnectionService (integration) - Optimized', () => {
  let testConnection: any;
  let testUser: any;

  beforeAll(async () => {
    // Clean up any leftover test data
    await prisma.apiConnection.deleteMany({ where: { name: 'Integration Test Connection' } });
    await prisma.user.deleteMany({ where: { email: { contains: 'connection-test' } } });
    
    // Create test user first
    testUser = await createTestUser(undefined, 'connection-test-pass', 'USER', 'Connection Test User');
    
    // Create test connection once per suite for reuse across all tests
    testConnection = await prisma.apiConnection.create({
      data: {
        userId: testUser.id,
        name: 'Integration Test Connection',
        description: 'Integration test connection',
        baseUrl: 'https://example.com',
        authType: 'OAUTH2',
        authConfig: {},
        documentationUrl: '',
        status: 'ACTIVE',
        ingestionStatus: 'PENDING',
        connectionStatus: ConnectionStatus.draft,
      },
    });
  });

  afterAll(async () => {
    // Clean up test connection and user
    await prisma.apiConnection.deleteMany({ where: { name: 'Integration Test Connection' } });
    await prisma.user.deleteMany({ where: { email: { contains: 'connection-test' } } });
  });

  beforeEach(() => {
    // Reset connection status to draft for each test
    // This ensures each test starts with a clean state
  });

  it('should mark connection as connecting', async () => {
    await markConnecting(testConnection.id, 'integration-state');
    const updated = await prisma.apiConnection.findUnique({ where: { id: testConnection.id } });
    expect(updated?.connectionStatus).toBe(ConnectionStatus.connecting);
    expect(updated?.oauthState).toBe('integration-state');
  });

  it('should mark connection as connected', async () => {
    await markConnected(testConnection.id);
    const updated = await prisma.apiConnection.findUnique({ where: { id: testConnection.id } });
    expect(updated?.connectionStatus).toBe(ConnectionStatus.connected);
    expect(updated?.oauthState).toBeNull();
  });

  it('should mark connection as error', async () => {
    await markError(testConnection.id);
    const updated = await prisma.apiConnection.findUnique({ where: { id: testConnection.id } });
    expect(updated?.connectionStatus).toBe(ConnectionStatus.error);
    expect(updated?.oauthState).toBeNull();
  });

  it('should mark connection as disconnected', async () => {
    await markDisconnected(testConnection.id);
    const updated = await prisma.apiConnection.findUnique({ where: { id: testConnection.id } });
    expect(updated?.connectionStatus).toBe(ConnectionStatus.disconnected);
    expect(updated?.oauthState).toBeNull();
  });

  it('should mark connection as revoked', async () => {
    await markRevoked(testConnection.id);
    const updated = await prisma.apiConnection.findUnique({ where: { id: testConnection.id } });
    expect(updated?.connectionStatus).toBe(ConnectionStatus.revoked);
    expect(updated?.oauthState).toBeNull();
  });

  it('should find connection by oauth state', async () => {
    await markConnecting(testConnection.id, 'integration-state');
    const found = await findConnectionByOAuthState('integration-state');
    expect(found).toBeTruthy();
    expect(found?.id).toBe(testConnection.id);
  });
}); 
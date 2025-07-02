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

describe('ConnectionService (integration)', () => {
  let testConnection: any;

  beforeAll(async () => {
    // Clean up any leftover test data
    await prisma.apiConnection.deleteMany({ where: { name: 'Integration Test Connection' } });
  });

  beforeEach(async () => {
    // Create a fresh test connection for each test
    testConnection = await prisma.apiConnection.create({
      data: {
        userId: 'test-user', // Use a valid userId or create a test user if needed
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

  afterEach(async () => {
    // Clean up after each test
    await prisma.apiConnection.deleteMany({ where: { name: 'Integration Test Connection' } });
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
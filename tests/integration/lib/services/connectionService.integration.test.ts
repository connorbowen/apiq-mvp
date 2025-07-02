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
import { createConnectionTestData } from '../../../helpers/createTestData';

describe('ConnectionService (integration) - Optimized', () => {
  let testConnection: any;
  let testUser: any;

  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createConnectionTestData();
    testUser = testData.user;
    testConnection = testData.connection;
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
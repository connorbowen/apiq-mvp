jest.mock('../../../../lib/database/client', () => ({
  prisma: {
    apiConnection: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

// eslint-disable-next-line no-console
console.log('Jest URL →', process.env.DATABASE_URL);

import { jest } from '@jest/globals';

describe('ConnectionService (unit)', () => {
  let markConnecting: any;
  let markConnected: any;
  let markError: any;
  let markDisconnected: any;
  let markRevoked: any;
  let findConnectionByOAuthState: any;
  let getConnectionStatusDisplay: any;
  let ConnectionStatus: any;
  let mockUpdate: any;
  let mockFindUnique: any;

  beforeAll(async () => {
    // Re-import after mock is set up
    const service = await import('../../../../src/lib/services/connectionService');
    markConnecting = service.markConnecting;
    markConnected = service.markConnected;
    markError = service.markError;
    markDisconnected = service.markDisconnected;
    markRevoked = service.markRevoked;
    findConnectionByOAuthState = service.findConnectionByOAuthState;
    getConnectionStatusDisplay = service.getConnectionStatusDisplay;
    ConnectionStatus = (await import('../../../../src/generated/prisma')).ConnectionStatus;
    // Get the mocks
    const client = await import('../../../../lib/database/client');
    mockUpdate = client.prisma.apiConnection.update;
    mockFindUnique = client.prisma.apiConnection.findUnique;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('markConnecting calls update with correct args', async () => {
    mockUpdate.mockResolvedValueOnce({ id: '1', connectionStatus: ConnectionStatus.connecting });
    await markConnecting('1', 'state-xyz');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { connectionStatus: ConnectionStatus.connecting, oauthState: 'state-xyz' },
    });
  });

  it('markConnected calls update with correct args', async () => {
    mockUpdate.mockResolvedValueOnce({ id: '1', connectionStatus: ConnectionStatus.connected });
    await markConnected('1');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { connectionStatus: ConnectionStatus.connected, oauthState: null },
    });
  });

  it('markError calls update with correct args', async () => {
    mockUpdate.mockResolvedValueOnce({ id: '1', connectionStatus: ConnectionStatus.error });
    await markError('1');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { connectionStatus: ConnectionStatus.error, oauthState: null },
    });
  });

  it('markDisconnected calls update with correct args', async () => {
    mockUpdate.mockResolvedValueOnce({ id: '1', connectionStatus: ConnectionStatus.disconnected });
    await markDisconnected('1');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { connectionStatus: ConnectionStatus.disconnected, oauthState: null },
    });
  });

  it('markRevoked calls update with correct args', async () => {
    mockUpdate.mockResolvedValueOnce({ id: '1', connectionStatus: ConnectionStatus.revoked });
    await markRevoked('1');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { connectionStatus: ConnectionStatus.revoked, oauthState: null },
    });
  });

  it('findConnectionByOAuthState calls findUnique with correct args', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: '1', oauthState: 'test-state' });
    await findConnectionByOAuthState('test-state');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { oauthState: 'test-state' },
      include: { user: true },
    });
  });

  describe('getConnectionStatusDisplay', () => {
    it('returns correct display info for each status', () => {
      expect(getConnectionStatusDisplay(ConnectionStatus.draft)).toMatchObject({ label: 'Draft' });
      expect(getConnectionStatusDisplay(ConnectionStatus.disconnected)).toMatchObject({ label: 'Disconnected' });
      expect(getConnectionStatusDisplay(ConnectionStatus.connecting)).toMatchObject({ label: 'Connecting...' });
      expect(getConnectionStatusDisplay(ConnectionStatus.connected)).toMatchObject({ label: 'Connected' });
      expect(getConnectionStatusDisplay(ConnectionStatus.error)).toMatchObject({ label: 'Error - Retry' });
      expect(getConnectionStatusDisplay(ConnectionStatus.revoked)).toMatchObject({ label: 'Revoked' });
      expect(getConnectionStatusDisplay('unknown' as any)).toMatchObject({ label: 'Unknown' });
    });
  });
}); 
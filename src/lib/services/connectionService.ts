import { prisma } from '../../../lib/database/client';
import { ConnectionStatus } from '../../generated/prisma';

// TODO: [SECRETS-FIRST-REFACTOR] Phase 4: Connection Service Updates
// - Add methods to validate connection-secret relationships
// - Add methods to retrieve secrets for connections
// - Add connection status updates based on secret availability
// - Add methods to migrate connections to use secrets
// - Add validation to ensure connections have required secrets
// - Add connection-secret dependency management
// - Add methods to handle secret rotation for connections
// - Add connection status tracking based on secret health
// - Add methods to validate connection configuration with secrets
// - Consider adding connection-secret audit logging

/**
 * Mark a connection as connecting and set the OAuth state
 */
export async function markConnecting(id: string, oauthState: string) {
  return prisma.apiConnection.update({
    where: { id },
    data: { 
      connectionStatus: ConnectionStatus.connecting, 
      oauthState 
    },
  });
}

/**
 * Mark a connection as connected (OAuth flow completed successfully)
 */
export async function markConnected(id: string) {
  return prisma.apiConnection.update({
    where: { id },
    data: { 
      connectionStatus: ConnectionStatus.connected,
      oauthState: null // Clear the state after successful connection
    },
  });
}

/**
 * Mark a connection as error (OAuth flow failed)
 */
export async function markError(id: string, reason?: string) {
  return prisma.apiConnection.update({
    where: { id },
    data: { 
      connectionStatus: ConnectionStatus.error,
      oauthState: null // Clear the state after failed connection
    },
  });
}

/**
 * Mark a connection as disconnected (initial state after creation)
 */
export async function markDisconnected(id: string) {
  return prisma.apiConnection.update({
    where: { id },
    data: { 
      connectionStatus: ConnectionStatus.disconnected,
      oauthState: null
    },
  });
}

/**
 * Mark a connection as revoked (tokens revoked by provider)
 */
export async function markRevoked(id: string) {
  return prisma.apiConnection.update({
    where: { id },
    data: { 
      connectionStatus: ConnectionStatus.revoked,
      oauthState: null
    },
  });
}

/**
 * Find a connection by OAuth state
 */
export async function findConnectionByOAuthState(oauthState: string) {
  return prisma.apiConnection.findUnique({
    where: { oauthState },
    include: {
      user: true
    }
  });
}

/**
 * Get connection status for UI display
 */
export function getConnectionStatusDisplay(status: ConnectionStatus): {
  label: string;
  color: string;
  showConnectButton: boolean;
} {
  switch (status) {
    case ConnectionStatus.draft:
      return { label: 'Draft', color: 'text-gray-600 bg-gray-100', showConnectButton: false };
    case ConnectionStatus.disconnected:
      return { label: 'Disconnected', color: 'text-yellow-600 bg-yellow-100', showConnectButton: true };
    case ConnectionStatus.connecting:
      return { label: 'Connecting...', color: 'text-blue-600 bg-blue-100', showConnectButton: false };
    case ConnectionStatus.connected:
      return { label: 'Connected', color: 'text-green-600 bg-green-100', showConnectButton: false };
    case ConnectionStatus.error:
      return { label: 'Error - Retry', color: 'text-red-600 bg-red-100', showConnectButton: true };
    case ConnectionStatus.revoked:
      return { label: 'Revoked', color: 'text-red-600 bg-red-100', showConnectButton: true };
    default:
      return { label: 'Unknown', color: 'text-gray-600 bg-gray-100', showConnectButton: false };
  }
} 
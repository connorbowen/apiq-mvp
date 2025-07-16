import { prisma } from '../../../lib/database/client';
import { ConnectionStatus } from '../../generated/prisma';
import { secretsVault } from '../secrets/secretsVault';
import { SecretMetadata } from '../secrets/secretsVault';

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

/**
 * Retrieve all secrets for a connection
 */
export async function getSecretsForConnection(userId: string, connectionId: string): Promise<SecretMetadata[]> {
  return secretsVault.getSecretsForConnection(userId, connectionId);
}

/**
 * Validate that a connection has the required secrets
 */
export async function validateConnectionSecrets(userId: string, connectionId: string, requiredTypes: SecretMetadata['type'][]): Promise<{ isValid: boolean; missing: string[]; issues: string[] }> {
  const secrets = await secretsVault.getSecretsForConnection(userId, connectionId);
  const foundTypes = secrets.map(s => s.type);
  const missing = requiredTypes.filter(type => !foundTypes.includes(type));
  const issues: string[] = [];
  for (const type of requiredTypes) {
    const secret = secrets.find(s => s.type === type);
    if (secret) {
      // Optionally, check for expiration or rotation status
      if (secret.expiresAt && secret.expiresAt < new Date()) {
        issues.push(`${type} secret expired`);
      }
    }
  }
  return { isValid: missing.length === 0 && issues.length === 0, missing, issues };
}

/**
 * Link a secret to a connection
 */
export async function linkSecretToConnection(userId: string, secretName: string, connectionId: string, connectionName?: string) {
  return secretsVault.linkSecretToConnection(userId, secretName, connectionId, connectionName);
}

/**
 * Rotate all secrets for a connection
 */
export async function rotateAllConnectionSecrets(userId: string, connectionId: string): Promise<SecretMetadata[]> {
  const secrets = await secretsVault.getSecretsForConnection(userId, connectionId);
  const rotated: SecretMetadata[] = [];
  for (const secret of secrets) {
    try {
      const rotatedSecret = await secretsVault.rotateSecret(userId, secret.name);
      rotated.push(rotatedSecret);
    } catch (e) {
      // Log and continue
      // Optionally, collect errors
    }
  }
  return rotated;
}

/**
 * Update connection status based on secret health
 */
export async function updateConnectionStatusBasedOnSecrets(userId: string, connectionId: string): Promise<void> {
  const secrets = await secretsVault.getSecretsForConnection(userId, connectionId);
  const hasActive = secrets.some(s => s.isActive && (!s.expiresAt || s.expiresAt > new Date()));
  if (!hasActive) {
    await markError(connectionId, 'No valid secrets');
  } else {
    await markConnected(connectionId);
  }
} 
import CryptoJS from 'crypto-js';
import { prisma } from '../../../lib/database/client';
import { PrismaClient } from '../../../src/generated/prisma';
import { logError, logInfo } from '../../utils/logger';

/**
 * Enhanced Secrets Vault with master key rotation
 * Supports multiple encryption keys and automatic key rotation
 * 
 * Features:
 * - Connection-secret linking and management
 * - OAuth2 token storage and rotation
 * - Comprehensive audit logging
 * - Health monitoring and validation
 * - Migration tools for existing credentials
 */

export interface SecretMetadata {
  id: string;
  userId: string;
  name: string;
  type: 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH_USERNAME' | 'BASIC_AUTH_PASSWORD' | 'OAUTH2_CLIENT_ID' | 'OAUTH2_CLIENT_SECRET' | 'OAUTH2_ACCESS_TOKEN' | 'OAUTH2_REFRESH_TOKEN' | 'WEBHOOK_SECRET' | 'SSH_KEY' | 'CERTIFICATE' | 'CUSTOM';
  keyId: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  rotationEnabled?: boolean;
  rotationInterval?: number;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
  rotationHistory?: any[];
  connectionId?: string; // Reference to ApiConnection if this secret is connection-specific
  connectionName?: string; // Human-readable connection name for display
}

export interface SecretData {
  value: string;
  metadata?: Record<string, any>;
}

export interface EncryptionKey {
  id: string;
  key: string;
  version: number;
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per minute per user

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class SecretsVault {
  private prisma: PrismaClient;
  private currentKey!: EncryptionKey; // Will be initialized in initializeKeys()
  private keyCache: Map<string, EncryptionKey> = new Map();
  private rateLimitCache: Map<string, RateLimitEntry> = new Map();

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
    this.initializeKeys();
  }

  /**
   * Initialize encryption keys from environment
   */
  private initializeKeys(): void {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }

    // For now, use a single key. In production, this would load from a key management system
    this.currentKey = {
      id: 'master_key_v1',
      key: masterKey,
      version: 1,
      isActive: true,
      createdAt: new Date()
    };

    this.keyCache.set(this.currentKey.id, this.currentKey);
  }

  /**
   * Validate and sanitize input parameters
   */
  private validateInput(userId: string, name: string, secretData?: SecretData): void {
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid userId: must be a non-empty string');
    }

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Invalid secret name: must be a non-empty string');
    }

    // Sanitize name (alphanumeric, hyphens, underscores, spaces only)
    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9_\-\s]/g, '');
    if (sanitizedName !== name.trim()) {
      throw new Error('Invalid secret name: contains invalid characters. Use only letters, numbers, hyphens, underscores, and spaces');
    }

    // Validate name length
    if (sanitizedName.length > 100) {
      throw new Error('Invalid secret name: too long (max 100 characters)');
    }

    // Validate secret data if provided
    if (secretData) {
      if (!secretData.value || typeof secretData.value !== 'string') {
        throw new Error('Invalid secret value: must be a non-empty string');
      }

      if (secretData.value.length > 10000) {
        throw new Error('Invalid secret value: too long (max 10,000 characters)');
      }

      // Validate metadata if provided
      if (secretData.metadata && typeof secretData.metadata !== 'object') {
        throw new Error('Invalid metadata: must be an object');
      }
    }
  }

  /**
   * Check rate limiting for user
   */
  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const key = `secrets:${userId}`;
    const entry = this.rateLimitCache.get(key);

    if (!entry || now > entry.resetTime) {
      // Reset or create new rate limit entry
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    } else {
      // Increment count
      entry.count++;
      if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        throw new Error(`Rate limit exceeded: maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute`);
      }
    }
  }

  /**
   * Store a secret with encryption
   */
  async storeSecret(
    userId: string,
    name: string,
    secretData: SecretData,
    type: SecretMetadata['type'] = 'CUSTOM',
    expiresAt?: Date,
    rotationConfig?: {
      rotationEnabled?: boolean;
      rotationInterval?: number;
      lastRotatedAt?: Date;
      nextRotationAt?: Date;
      rotationHistory?: any[];
    },
    connectionId?: string,
    connectionName?: string
  ): Promise<SecretMetadata> {
    try {
      // Validate and sanitize inputs
      this.validateInput(userId, name, secretData);
      // Short-circuit: reject empty/whitespace value before any DB or encryption
      if (!secretData.value || typeof secretData.value !== 'string' || secretData.value.trim().length === 0) {
        throw new Error('Invalid secret value: must be a non-empty string');
      }
      
      // Check rate limiting
      this.checkRateLimit(userId);

      // Validate type
      const validTypes = ['API_KEY', 'BEARER_TOKEN', 'BASIC_AUTH_USERNAME', 'BASIC_AUTH_PASSWORD', 'OAUTH2_CLIENT_ID', 'OAUTH2_CLIENT_SECRET', 'OAUTH2_ACCESS_TOKEN', 'OAUTH2_REFRESH_TOKEN', 'WEBHOOK_SECRET', 'SSH_KEY', 'CERTIFICATE', 'CUSTOM'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid secret type: must be one of ${validTypes.join(', ')}`);
      }

      // Validate expiration date
      if (expiresAt && (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime()))) {
        throw new Error('Invalid expiration date');
      }

      if (expiresAt && expiresAt <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }

      // Encrypt the secret data
      const encryptedData = this.encrypt(JSON.stringify(secretData));
      
      // Check if secret already exists
      const existingSecret = await this.prisma.secret.findFirst({
        where: {
          userId,
          name,
          isActive: true
        }
      });

      if (existingSecret) {
        // Update existing secret
        const updatedSecret = await this.prisma.secret.update({
          where: { id: existingSecret.id },
          data: {
            encryptedData: encryptedData.encryptedData,
            keyId: encryptedData.keyId,
            version: existingSecret.version + 1,
            expiresAt,
            rotationEnabled: rotationConfig?.rotationEnabled ?? existingSecret.rotationEnabled,
            rotationInterval: rotationConfig?.rotationInterval ?? existingSecret.rotationInterval,
            lastRotatedAt: rotationConfig?.lastRotatedAt ?? existingSecret.lastRotatedAt,
            nextRotationAt: rotationConfig?.nextRotationAt ?? existingSecret.nextRotationAt,
            rotationHistory: rotationConfig?.rotationHistory ? JSON.parse(JSON.stringify(rotationConfig.rotationHistory)) : existingSecret.rotationHistory,
            updatedAt: new Date()
          }
        });

        logInfo('Secret updated', { userId, secretId: updatedSecret.id, name });
        return this.mapToSecretMetadata(updatedSecret, type);
      } else {
        // Create new secret
        const newSecret = await this.prisma.secret.create({
          data: {
            userId,
            name,
            type,
            encryptedData: encryptedData.encryptedData,
            keyId: encryptedData.keyId,
            expiresAt,
            rotationEnabled: rotationConfig?.rotationEnabled ?? false,
            rotationInterval: rotationConfig?.rotationInterval ?? null,
            lastRotatedAt: rotationConfig?.lastRotatedAt ?? new Date(),
            nextRotationAt: rotationConfig?.nextRotationAt ?? null,
            rotationHistory: rotationConfig?.rotationHistory ? JSON.parse(JSON.stringify(rotationConfig.rotationHistory)) : [],
            connectionId,
            metadata: connectionName ? { connectionName } : undefined
          }
        });

        logInfo('Secret created', { userId, secretId: newSecret.id, name });
        
        // Log the secret creation
        await this.logSecretAccess(userId, 'SECRET_CREATED', name);
        
        return this.mapToSecretMetadata(newSecret, type);
      }
    } catch (error) {
      logError('Failed to store secret', error as Error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt a secret
   */
  async getSecret(userId: string, name: string): Promise<SecretData> {
    try {
      console.log('[SecretsVault.getSecret] called with:', { userId, name });
      // Validate and sanitize inputs
      this.validateInput(userId, name);
      
      // Check rate limiting
      this.checkRateLimit(userId);

      const secret = await this.prisma.secret.findFirst({
        where: {
          userId,
          name,
          isActive: true
        }
      });

      if (!secret) {
        console.log('[SecretsVault.getSecret] Secret not found:', { userId, name });
        throw new Error(`Secret '${name}' not found`);
      }

      // Check if secret is expired
      if (secret.expiresAt && secret.expiresAt < new Date()) {
        console.log('[SecretsVault.getSecret] Secret expired:', { userId, name });
        throw new Error(`Secret '${name}' has expired`);
      }

      // Decrypt the secret
      const decryptedString = this.decrypt(secret.encryptedData, secret.keyId);
      const secretData: SecretData = JSON.parse(decryptedString);

      await this.logSecretAccess(userId, 'SECRET_ACCESSED', name);

      console.log('[SecretsVault.getSecret] Returning secretData:', { hasValue: !!secretData.value });
      return secretData;
    } catch (error) {
      console.error('[SecretsVault.getSecret] Error:', error);
      // Never log sensitive information
      logError('Failed to retrieve secret', error instanceof Error ? error : new Error(String(error)), {
        userId,
        secretName: name,
        // Do not log secret value
      });
      throw new Error(`Failed to retrieve secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all secrets for a user
   */
  async listSecrets(userId: string): Promise<SecretMetadata[]> {
    try {
      // Validate and sanitize inputs
      this.validateInput(userId, 'dummy'); // Use dummy name for validation
      
      // Check rate limiting
      this.checkRateLimit(userId);

      const secrets = await this.prisma.secret.findMany({
        where: {
          userId,
          isActive: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      return secrets.map((secret: any) => this.mapToSecretMetadata(secret, secret.type as SecretMetadata['type']));
    } catch (error) {
      logError('Failed to list secrets', error instanceof Error ? error : new Error(String(error)), {
        userId
      });
      throw new Error(`Failed to list secrets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(userId: string, name: string): Promise<void> {
    try {
      // Validate and sanitize inputs
      this.validateInput(userId, name);
      
      // Check rate limiting
      this.checkRateLimit(userId);

      const secret = await this.prisma.secret.findFirst({
        where: {
          userId,
          name,
          isActive: true
        }
      });

      if (!secret) {
        throw new Error(`Secret '${name}' not found`);
      }

      // Soft delete the secret
      await this.prisma.secret.update({
        where: { id: secret.id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      await this.logSecretAccess(userId, 'SECRET_DELETED', name);
    } catch (error) {
      logError('Failed to delete secret', error instanceof Error ? error : new Error(String(error)), {
        userId,
        secretName: name
      });
      throw new Error(`Failed to delete secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rotate a specific secret (generate new value and update)
   */
  async rotateSecret(userId: string, name: string): Promise<SecretMetadata> {
    try {
      // Validate and sanitize inputs
      this.validateInput(userId, name);
      
      // Check rate limiting
      this.checkRateLimit(userId);

      const secret = await this.prisma.secret.findFirst({
        where: {
          userId,
          name,
          isActive: true
        }
      });

      if (!secret) {
        throw new Error(`Secret '${name}' not found`);
      }

      // Generate new secret value (this would typically call an external API)
      const newValue = this.generateSecureKey();
      
      // Get current secret data
      const currentData = await this.getSecret(userId, name);
      
      // Create new secret data with rotated value
      const newSecretData: SecretData = {
        value: newValue,
        metadata: {
          ...currentData.metadata,
          rotatedAt: new Date().toISOString(),
          previousValue: currentData.value.substring(0, 8) + '...' // Only store partial for audit
        }
      };

      // Update rotation history
      const rotationHistory = secret.rotationHistory ? JSON.parse(JSON.stringify(secret.rotationHistory)) : [];
      rotationHistory.push({
        rotatedAt: new Date().toISOString(),
        previousVersion: secret.version,
        newVersion: secret.version + 1
      });

      // Calculate next rotation date if rotation is enabled
      let nextRotationAt = null;
      if (secret.rotationEnabled && secret.rotationInterval) {
        nextRotationAt = new Date(Date.now() + secret.rotationInterval * 24 * 60 * 60 * 1000);
      }

      // Update the secret with new encrypted data
      const updatedSecret = await this.prisma.secret.update({
        where: { id: secret.id },
        data: {
          encryptedData: this.encrypt(JSON.stringify(newSecretData)).encryptedData,
          keyId: this.currentKey.id,
          version: secret.version + 1,
          lastRotatedAt: new Date(),
          nextRotationAt,
          rotationHistory,
          updatedAt: new Date()
        }
      });

      await this.logSecretAccess(userId, 'SECRET_ROTATED', name);
      
      logInfo('Secret rotated', { userId, secretId: updatedSecret.id, name });
      return this.mapToSecretMetadata(updatedSecret, secret.type as SecretMetadata['type']);
    } catch (error) {
      logError('Failed to rotate secret', error as Error);
      throw error;
    }
  }

  /**
   * Rotate encryption keys (re-encrypt all secrets with new key)
   */
  async rotateKeys(): Promise<void> {
    try {
      logInfo('Starting key rotation process');

      // Generate new master key
      const newMasterKey = this.generateSecureKey();
      const newKey: EncryptionKey = {
        id: `master_key_v${this.currentKey.version + 1}`,
        key: newMasterKey,
        version: this.currentKey.version + 1,
        isActive: true,
        createdAt: new Date()
      };

      // Get all active secrets
      const allSecrets = await this.prisma.secret.findMany({
        where: {
          isActive: true
        }
      });

      // Re-encrypt all secrets with new key
      for (const secret of allSecrets) {
        try {
          // Decrypt with old key
          const decryptedData = this.decrypt(secret.encryptedData, secret.keyId);
          
          // Encrypt with new key
          const newEncryptedData = this.encryptWithKey(decryptedData, newKey);
          
          // Update secret with new encrypted data
          await this.prisma.secret.update({
            where: { id: secret.id },
            data: {
              encryptedData: newEncryptedData.encryptedData,
              keyId: newEncryptedData.keyId,
              updatedAt: new Date()
            }
          });
        } catch (error) {
          logError('Failed to re-encrypt secret during key rotation', error instanceof Error ? error : new Error(String(error)), {
            secretId: secret.id
          });
          // Continue with other secrets
        }
      }

      // Update current key
      this.currentKey = newKey;
      this.keyCache.set(newKey.id, newKey);

      // Mark old key as inactive
      this.keyCache.get(this.currentKey.id)!.isActive = false;

      logInfo('Key rotation completed successfully');
    } catch (error) {
      logError('Failed to rotate keys', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Key rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt data with current key
   */
  private encrypt(data: string): { encryptedData: string; keyId: string } {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.currentKey.key).toString();
      return {
        encryptedData: encrypted,
        keyId: this.currentKey.id
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt data with specific key
   */
  private encryptWithKey(data: string, key: EncryptionKey): { encryptedData: string; keyId: string } {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, key.key).toString();
      return {
        encryptedData: encrypted,
        keyId: key.id
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data
   */
  private decrypt(encryptedData: string, keyId: string): string {
    try {
      const key = this.keyCache.get(keyId);
      if (!key) {
        throw new Error(`Encryption key '${keyId}' not found`);
      }

      const decrypted = CryptoJS.AES.decrypt(encryptedData, key.key);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Decryption failed: Invalid encrypted data or key');
      }
      
      return decryptedString;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a secure encryption key
   */
  private generateSecureKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Map database record to SecretMetadata
   */
  private mapToSecretMetadata(secret: any, type: SecretMetadata['type']): SecretMetadata & { description?: string } {
    let description: string | undefined = undefined;
    let connectionName: string | undefined = undefined;
    try {
      if (secret.encryptedData && secret.keyId) {
        const decrypted = this.decrypt(secret.encryptedData, secret.keyId);
        const parsed = JSON.parse(decrypted);
        if (parsed && typeof parsed === 'object' && parsed.metadata && parsed.metadata.description) {
          description = parsed.metadata.description;
        }
      }
      // Extract connection name from metadata
      if (secret.metadata && typeof secret.metadata === 'object') {
        connectionName = secret.metadata.connectionName;
      }
    } catch (e) {
      // Ignore decryption/parse errors for description
    }
    return {
      id: secret.id,
      userId: secret.userId,
      name: secret.name,
      type,
      keyId: secret.keyId,
      isActive: secret.isActive,
      expiresAt: secret.expiresAt,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      version: secret.version,
      rotationEnabled: secret.rotationEnabled,
      rotationInterval: secret.rotationInterval,
      lastRotatedAt: secret.lastRotatedAt,
      nextRotationAt: secret.nextRotationAt,
      rotationHistory: secret.rotationHistory,
      connectionId: secret.connectionId,
      connectionName,
      ...(description ? { description } : {})
    };
  }

  /**
   * Log secret access for audit
   */
  private async logSecretAccess(userId: string, action: string, secretName: string): Promise<void> {
    try {
      // Map action to user-friendly text
      let actionText = action;
      if (action === 'SECRET_CREATED') {
        actionText = 'SECRET_CREATED';
      } else if (action === 'SECRET_ACCESSED') {
        actionText = 'SECRET_ACCESSED';
      } else if (action === 'SECRET_DELETED') {
        actionText = 'SECRET_DELETED';
      } else if (action === 'SECRET_ROTATED') {
        actionText = 'SECRET_ROTATED';
      }

      console.log('Creating audit log entry:', { userId, action: actionText, resource: secretName });

      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId,
          action: actionText,
          resource: 'SECRET',
          resourceId: secretName,
          details: {
            secretName,
            action: actionText,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (auditLog && auditLog.id) {
        console.log('Audit log entry created successfully:', auditLog.id);
        logInfo('Audit log entry created', { auditLogId: auditLog.id, userId, action: actionText, resource: secretName });
      } else {
        console.log('Audit log entry created successfully: undefined');
      }
    } catch (error) {
      console.error('Failed to create audit log entry:', error);
      logError('Failed to log secret access', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get vault health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    message: string;
    keyCount: number;
    activeSecrets: number;
    lastRotation?: Date;
  }> {
    try {
      const activeSecrets = await this.prisma.secret.count({
        where: { isActive: true }
      });

      const keyCount = this.keyCache.size;
      const hasActiveKey = Array.from(this.keyCache.values()).some(key => key.isActive);

      if (!hasActiveKey) {
        return {
          status: 'error',
          message: 'No active encryption keys found',
          keyCount,
          activeSecrets
        };
      }

      if (this.currentKey.version > 1) {
        return {
          status: 'healthy',
          message: 'Vault is healthy with key rotation support',
          keyCount,
          activeSecrets,
          lastRotation: this.currentKey.createdAt
        };
      }

      return {
        status: 'warning',
        message: 'Vault is operational but using initial key',
        keyCount,
        activeSecrets
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        keyCount: 0,
        activeSecrets: 0
      };
    }
  }

  /**
   * Link a secret to a connection
   */
  async linkSecretToConnection(
    userId: string,
    secretName: string,
    connectionId: string,
    connectionName?: string
  ): Promise<SecretMetadata> {
    try {
      // Validate inputs
      if (!userId || !secretName || !connectionId) {
        throw new Error('userId, secretName, and connectionId are required');
      }

      // Check if connection exists
      const connection = await this.prisma.apiConnection.findUnique({
        where: { id: connectionId, userId }
      });

      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      // Update the secret with connection reference
      const updatedSecret = await this.prisma.secret.update({
        where: { userId_name: { userId, name: secretName } },
        data: {
          connectionId,
          metadata: {
            ...(connectionName && { connectionName }),
            linkedAt: new Date().toISOString()
          }
        }
      });

      // Log the action
      await this.logSecretAccess(userId, 'SECRET_LINKED', secretName);

      return this.mapToSecretMetadata(updatedSecret, updatedSecret.type as SecretMetadata['type']);
    } catch (error) {
      logError('Failed to link secret to connection', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all secrets for a specific connection
   */
  async getSecretsForConnection(userId: string, connectionId: string): Promise<SecretMetadata[]> {
    try {
      const secrets = await this.prisma.secret.findMany({
        where: {
          userId,
          connectionId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return secrets.map(secret => 
        this.mapToSecretMetadata(secret, secret.type as SecretMetadata['type'])
      );
    } catch (error) {
      logError('Failed to get secrets for connection', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create a secret from connection data
   */
  async createSecretFromConnection(
    userId: string,
    connectionId: string,
    secretName: string,
    secretData: SecretData,
    type: SecretMetadata['type'],
    connectionName?: string
  ): Promise<SecretMetadata> {
    try {
      // Validate connection exists
      const connection = await this.prisma.apiConnection.findUnique({
        where: { id: connectionId, userId }
      });

      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      // Create the secret with connection reference
      const secret = await this.storeSecret(
        userId,
        secretName,
        secretData,
        type,
        undefined, // expiresAt
        undefined, // rotationConfig
        connectionId,
        connectionName || connection.name
      );

      return secret;
    } catch (error) {
      logError('Failed to create secret from connection', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Validate secret-connection relationship
   */
  async validateSecretConnectionRelationship(
    userId: string,
    secretName: string,
    connectionId: string
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if secret exists and belongs to user
      const secret = await this.prisma.secret.findUnique({
        where: { userId_name: { userId, name: secretName } }
      });

      if (!secret) {
        issues.push(`Secret ${secretName} not found`);
        return { isValid: false, issues };
      }

      // Check if connection exists and belongs to user
      const connection = await this.prisma.apiConnection.findUnique({
        where: { id: connectionId, userId }
      });

      if (!connection) {
        issues.push(`Connection ${connectionId} not found`);
        return { isValid: false, issues };
      }

      // Check if secret is already linked to this connection
      if (secret.connectionId && secret.connectionId !== connectionId) {
        issues.push(`Secret is already linked to connection ${secret.connectionId}`);
      }

      // Check if connection already has a secret of this type
      const existingSecret = await this.prisma.secret.findFirst({
        where: {
          userId,
          connectionId,
          type: secret.type,
          isActive: true
        }
      });

      if (existingSecret && existingSecret.name !== secretName) {
        issues.push(`Connection already has a ${secret.type} secret: ${existingSecret.name}`);
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, issues };
    }
  }

  /**
   * Migrate existing connection credentials to secrets
   */
  async migrateConnectionCredentialsToSecrets(userId: string, connectionId: string): Promise<{
    success: boolean;
    secretsCreated: string[];
    errors: string[];
  }> {
    const secretsCreated: string[] = [];
    const errors: string[] = [];

    try {
      // Get the connection with its credentials
      const connection = await this.prisma.apiConnection.findUnique({
        where: { id: connectionId, userId },
        include: {
          credentials: true
        }
      });

      if (!connection) {
        errors.push(`Connection ${connectionId} not found`);
        return { success: false, secretsCreated, errors };
      }

      // Migrate each credential to a secret
      for (const credential of connection.credentials) {
        try {
          // Decrypt the credential data
          const decryptedData = this.decrypt(credential.encryptedData, credential.keyId);
          const parsedData = JSON.parse(decryptedData);

          // Create a secret name based on connection and credential type
          const secretName = `${connection.name}_${credential.id}`;

          // Determine secret type based on auth type
          let secretType: SecretMetadata['type'] = 'CUSTOM';
          switch (connection.authType) {
            case 'API_KEY':
              secretType = 'API_KEY';
              break;
            case 'BEARER_TOKEN':
              secretType = 'BEARER_TOKEN';
              break;
            case 'BASIC_AUTH':
              secretType = 'BASIC_AUTH_USERNAME'; // We'll create separate secrets for username/password
              break;
            case 'OAUTH2':
              secretType = 'OAUTH2_CLIENT_ID';
              break;
            default:
              secretType = 'CUSTOM';
          }

          // Create the secret
          await this.createSecretFromConnection(
            userId,
            connectionId,
            secretName,
            { value: parsedData.value || parsedData, metadata: parsedData.metadata },
            secretType,
            connection.name
          );

          secretsCreated.push(secretName);
        } catch (error) {
          errors.push(`Failed to migrate credential ${credential.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        secretsCreated,
        errors
      };
    } catch (error) {
      errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, secretsCreated, errors };
    }
  }
}

// Export singleton instance
export const secretsVault = new SecretsVault(prisma); 
import CryptoJS from 'crypto-js';

/**
 * Encryption utility for securely storing sensitive data
 * Uses AES-256 encryption with environment-based keys
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

export class EncryptionService {
  private static instance: EncryptionService;
  private key: string;

  private constructor() {
    this.key = ENCRYPTION_KEY;
    if (this.key === 'default-key-change-in-production') {
      console.warn('⚠️  Using default encryption key. Please set ENCRYPTION_KEY in production.');
    }
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Encrypt data using AES-256
   */
  public encrypt(data: string | object): { encryptedData: string; keyId: string } {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(dataString, this.key).toString();
      
      return {
        encryptedData: encrypted,
        keyId: this.generateKeyId()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using AES-256
   */
  public decrypt(encryptedData: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.key);
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
   * Decrypt and parse JSON data
   */
  public decryptJson<T = any>(encryptedData: string): T {
    try {
      const decryptedString = this.decrypt(encryptedData);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error(`JSON decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a unique key identifier
   */
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash a password using bcrypt
   */
  public async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a password with its hash
   */
  public async comparePassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random string
   */
  public generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate encryption key strength
   */
  public validateKeyStrength(): boolean {
    if (this.key.length < 32) {
      console.warn('⚠️  Encryption key should be at least 32 characters long');
      return false;
    }
    return true;
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();

// Utility functions for common encryption tasks
export const encryptData = (data: string | object) => encryptionService.encrypt(data);
export const decryptData = (encryptedData: string) => encryptionService.decrypt(encryptedData);
export const decryptJson = <T = any>(encryptedData: string) => encryptionService.decryptJson<T>(encryptedData);
export const hashPassword = (password: string) => encryptionService.hashPassword(password);
export const comparePassword = (password: string, hash: string) => encryptionService.comparePassword(password, hash);
export const generateSecureToken = (length?: number) => encryptionService.generateSecureToken(length); 
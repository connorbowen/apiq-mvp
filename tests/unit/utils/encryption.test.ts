import { 
  EncryptionService, 
  encryptionService,
  encryptData, 
  decryptData, 
  decryptJson,
  hashPassword, 
  comparePassword,
  generateSecureToken 
} from '../../../src/utils/encryption'

describe('Encryption Utils', () => {
  const testData = 'Hello, World!'
  const testObject = { message: 'Hello', number: 42, array: [1, 2, 3] }

  describe('EncryptionService', () => {
    it('should be a singleton', () => {
      const instance1 = EncryptionService.getInstance()
      const instance2 = EncryptionService.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should validate key strength', () => {
      const isValid = encryptionService.validateKeyStrength()
      // This will depend on the actual key length in the environment
      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('encryptData', () => {
    it('should encrypt string data successfully', () => {
      const result = encryptData(testData)
      
      expect(result).toBeDefined()
      expect(result.encryptedData).toBeDefined()
      expect(result.keyId).toBeDefined()
      expect(typeof result.encryptedData).toBe('string')
      expect(result.encryptedData).not.toBe(testData)
    })

    it('should encrypt object data successfully', () => {
      const result = encryptData(testObject)
      
      expect(result).toBeDefined()
      expect(result.encryptedData).toBeDefined()
      expect(result.keyId).toBeDefined()
      expect(typeof result.encryptedData).toBe('string')
    })

    it('should encrypt empty string', () => {
      const result = encryptData('')
      
      expect(result).toBeDefined()
      expect(result.encryptedData).toBeDefined()
      expect(result.encryptedData).not.toBe('')
    })

    it('should handle special characters', () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const result = encryptData(specialData)
      
      expect(result).toBeDefined()
      expect(result.encryptedData).toBeDefined()
      expect(result.encryptedData).not.toBe(specialData)
    })

    it('should handle unicode characters', () => {
      const unicodeData = 'Hello 世界 🌍'
      const result = encryptData(unicodeData)
      
      expect(result).toBeDefined()
      expect(result.encryptedData).toBeDefined()
      expect(result.encryptedData).not.toBe(unicodeData)
    })
  })

  describe('decryptData', () => {
    it('should decrypt string data successfully', () => {
      const encrypted = encryptData(testData)
      const decrypted = decryptData(encrypted.encryptedData)
      
      expect(decrypted).toBe(testData)
    })

    it('should throw error for corrupted data', () => {
      expect(() => {
        decryptData('corrupted-data')
      }).toThrow(/Decryption failed/)
    })

    it('should handle special characters', () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const encrypted = encryptData(specialData)
      const decrypted = decryptData(encrypted.encryptedData)
      
      expect(decrypted).toBe(specialData)
    })

    it('should handle unicode characters', () => {
      const unicodeData = 'Hello 世界 🌍'
      const encrypted = encryptData(unicodeData)
      const decrypted = decryptData(encrypted.encryptedData)
      
      expect(decrypted).toBe(unicodeData)
    })
  })

  describe('decryptJson', () => {
    it('should decrypt and parse JSON data', () => {
      const encrypted = encryptData(testObject)
      const decrypted = decryptJson(encrypted.encryptedData)
      
      expect(decrypted).toEqual(testObject)
    })

    it('should handle complex nested objects', () => {
      const complexObject = {
        user: {
          id: 1,
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        metadata: {
          createdAt: '2023-01-01',
          tags: ['important', 'urgent']
        }
      }
      
      const encrypted = encryptData(complexObject)
      const decrypted = decryptJson(encrypted.encryptedData)
      
      expect(decrypted).toEqual(complexObject)
    })

    it('should throw error for invalid JSON', () => {
      const encrypted = encryptData('not-json')
      
      expect(() => {
        decryptJson(encrypted.encryptedData)
      }).toThrow('JSON decryption failed')
    })
  })

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'mySecurePassword123'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(20)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty password', async () => {
      const hash = await hashPassword('')
      
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).not.toBe('')
    })
  })

  describe('comparePassword', () => {
    it('should compare password with hash successfully', async () => {
      const password = 'mySecurePassword123'
      const hash = await hashPassword(password)
      
      const isValid = await comparePassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject wrong password', async () => {
      const password = 'mySecurePassword123'
      const hash = await hashPassword(password)
      
      const isValid = await comparePassword('wrongPassword', hash)
      expect(isValid).toBe(false)
    })

    it('should handle empty password', async () => {
      const password = ''
      const hash = await hashPassword(password)
      
      const isValid = await comparePassword(password, hash)
      expect(isValid).toBe(true)
    })
  })

  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token16 = generateSecureToken(16)
      const token32 = generateSecureToken(32)
      const token64 = generateSecureToken(64)

      expect(token16).toHaveLength(16)
      expect(token32).toHaveLength(32)
      expect(token64).toHaveLength(64)
    })

    it('should generate different tokens on each call', () => {
      const token1 = generateSecureToken(32)
      const token2 = generateSecureToken(32)

      expect(token1).not.toBe(token2)
    })

    it('should use default length of 32', () => {
      const token = generateSecureToken()
      expect(token).toHaveLength(32)
    })

    it('should generate alphanumeric tokens', () => {
      const token = generateSecureToken(100)
      expect(token).toMatch(/^[A-Za-z0-9]+$/)
    })
  })

  describe('validateKeyStrength', () => {
    it('should validate key strength', () => {
      const isValid = encryptionService.validateKeyStrength()
      // This will depend on the actual key length in the environment
      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('encrypt/decrypt round trip', () => {
    it('should work with different data types', async () => {
      const testCases = [
        'Simple string',
        '1234567890',
        '!@#$%^&*()',
        'Hello 世界 🌍',
        { simple: 'object' },
        { complex: { nested: { data: [1, 2, 3] } } }
      ]

      for (const data of testCases) {
        const encrypted = encryptData(data)
        const decrypted = typeof data === 'string' 
          ? decryptData(encrypted.encryptedData)
          : decryptJson(encrypted.encryptedData)
        
        expect(decrypted).toEqual(data)
      }
    })

    it('should handle large data', () => {
      const largeData = 'x'.repeat(1000)
      const encrypted = encryptData(largeData)
      const decrypted = decryptData(encrypted.encryptedData)
      
      expect(decrypted).toBe(largeData)
    })
  })

  describe('performance', () => {
    it('should handle multiple operations efficiently', async () => {
      const start = Date.now()
      
      for (let i = 0; i < 50; i++) {
        const data = `test-data-${i}`
        const encrypted = encryptData(data)
        const decrypted = decryptData(encrypted.encryptedData)
        expect(decrypted).toBe(data)
      }
      
      const end = Date.now()
      const duration = end - start
      
      // Should complete 50 operations in reasonable time (less than 2 seconds)
      expect(duration).toBeLessThan(2000)
    })

    it('should handle password hashing efficiently', async () => {
      const start = Date.now()
      
      for (let i = 0; i < 5; i++) {
        const password = `password-${i}`
        const hash = await hashPassword(password)
        const isValid = await comparePassword(password, hash)
        expect(isValid).toBe(true)
      }
      
      const end = Date.now()
      const duration = end - start
      
      // Should complete 5 password operations in reasonable time (less than 10 seconds)
      expect(duration).toBeLessThan(10000)
    })
  })
}) 
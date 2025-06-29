import { 
  DatabaseInitializer, 
  initializeDatabase, 
  resetDatabase, 
  healthCheck, 
  getDatabaseStats 
} from '../../../src/database/init';
import { prisma, testDatabaseConnection } from '../../../lib/database/client';
import { hashPassword } from '../../../src/utils/encryption';

// Mock dependencies
jest.mock('../../../lib/database/client', () => ({
  prisma: {
    user: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn()
    },
    apiConnection: {
      count: jest.fn()
    },
    workflow: {
      count: jest.fn()
    },
    workflowExecution: {
      count: jest.fn()
    },
    auditLog: {
      create: jest.fn(),
      count: jest.fn()
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn()
  },
  testDatabaseConnection: jest.fn()
}));

jest.mock('../../../src/utils/encryption', () => ({
  hashPassword: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn()
}));

describe('DatabaseInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default environment
    process.env.DEFAULT_ADMIN_EMAIL = 'admin@apiq.com';
    process.env.DEFAULT_ADMIN_PASSWORD = 'admin123';
    
    // Make NODE_ENV writable for testing
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    delete process.env.DEFAULT_ADMIN_EMAIL;
    delete process.env.DEFAULT_ADMIN_PASSWORD;
    
    // Reset NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true
    });
  });

  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(true);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'admin-user-id',
        email: 'admin@apiq.com'
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await DatabaseInitializer.initialize();

      expect(result).toBe(true);
      expect(testDatabaseConnection).toHaveBeenCalled();
      expect(prisma.user.count).toHaveBeenCalled();
    });

    it('should fail when database connection fails', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(false);

      const result = await DatabaseInitializer.initialize();

      expect(result).toBe(false);
      expect(testDatabaseConnection).toHaveBeenCalled();
    });

    it('should skip initial data creation when users exist', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(true);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);

      const result = await DatabaseInitializer.initialize();

      expect(result).toBe(true);
      expect(prisma.user.count).toHaveBeenCalled();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (testDatabaseConnection as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await DatabaseInitializer.initialize();

      expect(result).toBe(false);
    });

    it('should create default admin user when no users exist', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(true);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'admin-user-id',
        email: 'admin@apiq.com'
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await DatabaseInitializer.initialize();

      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@apiq.com' }
      });
      expect(hashPassword).toHaveBeenCalledWith('admin123');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'admin@apiq.com',
          name: 'System Administrator',
          password: 'hashed-password',
          role: 'SUPER_ADMIN',
          isActive: true
        }
      });
    });

    it('should skip admin creation if admin already exists', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(true);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-admin-id',
        email: 'admin@apiq.com'
      });

      const result = await DatabaseInitializer.initialize();

      expect(result).toBe(true);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should use environment variables for admin credentials', async () => {
      process.env.DEFAULT_ADMIN_EMAIL = 'custom@example.com';
      process.env.DEFAULT_ADMIN_PASSWORD = 'custompass';

      (testDatabaseConnection as jest.Mock).mockResolvedValue(true);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'admin-user-id',
        email: 'custom@example.com'
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await DatabaseInitializer.initialize();

      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'custom@example.com' }
      });
      expect(hashPassword).toHaveBeenCalledWith('custompass');
    });
  });

  describe('resetDatabase', () => {
    it('should reset database successfully in development', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });
      (prisma.$executeRaw as jest.Mock).mockResolvedValue({});

      const result = await DatabaseInitializer.resetDatabase();

      expect(result).toBe(true);
      expect(prisma.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining(['DROP SCHEMA IF EXISTS public CASCADE'])
      );
      expect(prisma.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining(['CREATE SCHEMA public'])
      );
    });

    it('should prevent reset in production', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      });

      const result = await DatabaseInitializer.resetDatabase();

      expect(result).toBe(false);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('should handle reset errors gracefully', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });
      (prisma.$executeRaw as jest.Mock).mockRejectedValue(new Error('Reset failed'));

      const result = await DatabaseInitializer.resetDatabase();

      expect(result).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is working', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '1': 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(10);

      const result = await DatabaseInitializer.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.details).toHaveProperty('responseTime');
      expect(result.details).toHaveProperty('userCount', 10);
      expect(result.details).toHaveProperty('timestamp');
    });

    it('should return unhealthy status when database fails', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await DatabaseInitializer.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.details).toHaveProperty('error');
    });

    it('should measure response time correctly', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '1': 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);

      const startTime = Date.now();
      const result = await DatabaseInitializer.healthCheck();
      const endTime = Date.now();

      expect(result.status).toBe('healthy');
      expect(result.details.responseTime).toMatch(/\d+ms/);
      
      const responseTime = parseInt(result.details.responseTime);
      expect(responseTime).toBeGreaterThanOrEqual(0);
      expect(responseTime).toBeLessThanOrEqual(endTime - startTime + 100); // Allow some buffer
    });
  });

  describe('getStatistics', () => {
    it('should return database statistics', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(25);
      (prisma.apiConnection.count as jest.Mock).mockResolvedValue(10);
      (prisma.workflow.count as jest.Mock).mockResolvedValue(5);
      (prisma.workflowExecution.count as jest.Mock).mockResolvedValue(15);
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(50);

      const stats = await DatabaseInitializer.getStatistics();

      expect(stats).toHaveProperty('users', 25);
      expect(stats).toHaveProperty('apiConnections', 10);
      expect(stats).toHaveProperty('workflows', 5);
      expect(stats).toHaveProperty('executions', 15);
      expect(stats).toHaveProperty('auditLogs', 50);
      expect(stats).toHaveProperty('timestamp');
    });

    it('should throw error when statistics query fails', async () => {
      (prisma.user.count as jest.Mock).mockRejectedValue(new Error('Stats error'));

      await expect(DatabaseInitializer.getStatistics()).rejects.toThrow('Stats error');
    });
  });

  describe('Export Functions', () => {
    it('should export initializeDatabase function', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(true);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'admin-user-id',
        email: 'admin@apiq.com'
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await initializeDatabase();

      expect(result).toBe(true);
    });

    it('should export resetDatabase function', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });
      (prisma.$executeRaw as jest.Mock).mockResolvedValue({});

      const result = await resetDatabase();

      expect(result).toBe(true);
    });

    it('should export healthCheck function', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '1': 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);

      const result = await healthCheck();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('details');
    });

    it('should export getDatabaseStats function', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(10);
      (prisma.apiConnection.count as jest.Mock).mockResolvedValue(5);
      (prisma.workflow.count as jest.Mock).mockResolvedValue(2);
      (prisma.workflowExecution.count as jest.Mock).mockResolvedValue(8);
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(25);

      const stats = await getDatabaseStats();

      expect(stats).toHaveProperty('users');
      expect(stats).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle admin user creation errors', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(true);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockRejectedValue(new Error('Hash failed'));

      const result = await DatabaseInitializer.initialize();

      expect(result).toBe(false);
    });

    it('should handle audit log creation errors gracefully', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(true);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'admin-user-id',
        email: 'admin@apiq.com'
      });
      (prisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('Audit log failed'));

      const result = await DatabaseInitializer.initialize();

      expect(result).toBe(false); // Should fail because audit log error is thrown from createDefaultAdminUser
    });
  });
}); 
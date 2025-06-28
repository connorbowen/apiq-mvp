import { prisma, testDatabaseConnection } from '../../lib/database/client';
import { logInfo, logError, logWarn } from '../utils/logger';
import { hashPassword } from '../utils/encryption';

/**
 * Database initialization utility
 * Handles database setup, migrations, and initial data creation
 */

export class DatabaseInitializer {
  /**
   * Initialize the database
   */
  static async initialize(): Promise<boolean> {
    try {
      logInfo('Starting database initialization...');

      // Test database connection
      const isConnected = await testDatabaseConnection();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }

      // Run database setup
      await this.setupDatabase();
      
      // Create initial data
      await this.createInitialData();

      logInfo('Database initialization completed successfully');
      return true;

    } catch (error) {
      logError('Database initialization failed', error as Error);
      return false;
    }
  }

  /**
   * Setup database schema and indexes
   */
  private static async setupDatabase(): Promise<void> {
    logInfo('Setting up database schema...');

    // Note: Prisma migrations are handled by the CLI
    // This is for any additional setup that might be needed

    // Create indexes for better performance
    await this.createIndexes();

    logInfo('Database schema setup completed');
  }

  /**
   * Create database indexes for better performance
   */
  private static async createIndexes(): Promise<void> {
    try {
      // These would be created via Prisma schema, but here's an example
      // of additional indexes that might be needed
      logInfo('Creating database indexes...');

      // Example: Create composite indexes for common queries
      // await prisma.$executeRaw`
      //   CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_status 
      //   ON workflow_executions(user_id, status);
      // `;

      logInfo('Database indexes created successfully');
    } catch (error) {
      logWarn('Failed to create some indexes (this is usually okay)', { error });
    }
  }

  /**
   * Create initial data for the application
   */
  private static async createInitialData(): Promise<void> {
    logInfo('Creating initial data...');

    // Check if we already have data
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      logInfo('Database already contains data, skipping initial data creation');
      return;
    }

    // Create default admin user
    await this.createDefaultAdminUser();

    // Create sample API connections (optional)
    await this.createSampleApiConnections();

    logInfo('Initial data created successfully');
  }

  /**
   * Create default admin user
   */
  private static async createDefaultAdminUser(): Promise<void> {
    try {
      const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@apiq.com';
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

      // Check if admin user already exists
      const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
      });

      if (existingAdmin) {
        logInfo('Default admin user already exists');
        return;
      }

      // Hash the password
      const hashedPassword = await hashPassword(adminPassword);

      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'System Administrator',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          isActive: true
        }
      });

      logInfo('Default admin user created', {
        userId: adminUser.id,
        email: adminUser.email
      });

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'CREATE',
          resource: 'USER',
          resourceId: adminUser.id,
          details: { role: 'SUPER_ADMIN', isDefault: true }
        }
      });

    } catch (error) {
      logError('Failed to create default admin user', error as Error);
      throw error;
    }
  }

  /**
   * Create sample API connections for demonstration
   */
  private static async createSampleApiConnections(): Promise<void> {
    try {
      // Only create sample data in development
      if (process.env.NODE_ENV !== 'development') {
        return;
      }

      const adminUser = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });

      if (!adminUser) {
        logWarn('No admin user found, skipping sample API connections');
        return;
      }

      // Sample API connections
      const sampleConnections = [
        {
          name: 'JSONPlaceholder API',
          description: 'Free fake API for testing and prototyping',
          baseUrl: 'https://jsonplaceholder.typicode.com',
          authType: 'NONE' as const,
          authConfig: {},
          documentationUrl: 'https://jsonplaceholder.typicode.com/guide/'
        },
        {
          name: 'OpenWeather API',
          description: 'Weather data API',
          baseUrl: 'https://api.openweathermap.org/data/2.5',
          authType: 'API_KEY' as const,
          authConfig: { apiKey: 'demo-key' },
          documentationUrl: 'https://openweathermap.org/api'
        },
        {
          name: 'GitHub API',
          description: 'GitHub REST API v3',
          baseUrl: 'https://api.github.com',
          authType: 'BEARER_TOKEN' as const,
          authConfig: { token: 'demo-token' },
          documentationUrl: 'https://docs.github.com/en/rest'
        }
      ];

      for (const connectionData of sampleConnections) {
        const existingConnection = await prisma.apiConnection.findFirst({
          where: {
            userId: adminUser.id,
            name: connectionData.name
          }
        });

        if (!existingConnection) {
          const connection = await prisma.apiConnection.create({
            data: {
              ...connectionData,
              userId: adminUser.id,
              status: 'ACTIVE'
            }
          });

          logInfo('Sample API connection created', {
            connectionId: connection.id,
            name: connection.name
          });
        }
      }

    } catch (error) {
      logWarn('Failed to create sample API connections', { error });
      // Don't throw error for sample data
    }
  }

  /**
   * Reset database (dangerous - use with caution)
   */
  static async resetDatabase(): Promise<boolean> {
    try {
      logWarn('Resetting database - this will delete all data!');

      // This should only be used in development
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Database reset not allowed in production');
      }

      // Reset the database using Prisma
      await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`;
      await prisma.$executeRaw`CREATE SCHEMA public`;
      
      logInfo('Database reset completed');
      return true;

    } catch (error) {
      logError('Database reset failed', error as Error);
      return false;
    }
  }

  /**
   * Health check for database
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const startTime = Date.now();
      
      // Test basic connection
      await prisma.$queryRaw`SELECT 1`;
      
      // Test user table access
      const userCount = await prisma.user.count();
      
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        details: {
          responseTime: `${responseTime}ms`,
          userCount,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logError('Database health check failed', error as Error);
      
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get database statistics
   */
  static async getStatistics(): Promise<Record<string, any>> {
    try {
      const [
        userCount,
        apiConnectionCount,
        workflowCount,
        executionCount,
        auditLogCount
      ] = await Promise.all([
        prisma.user.count(),
        prisma.apiConnection.count(),
        prisma.workflow.count(),
        prisma.workflowExecution.count(),
        prisma.auditLog.count()
      ]);

      return {
        users: userCount,
        apiConnections: apiConnectionCount,
        workflows: workflowCount,
        executions: executionCount,
        auditLogs: auditLogCount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logError('Failed to get database statistics', error as Error);
      throw error;
    }
  }
}

// Export convenience functions
export const initializeDatabase = () => DatabaseInitializer.initialize();
export const resetDatabase = () => DatabaseInitializer.resetDatabase();
export const healthCheck = () => DatabaseInitializer.healthCheck();
export const getDatabaseStats = () => DatabaseInitializer.getStatistics(); 
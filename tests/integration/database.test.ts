import { prisma } from '../../src/lib/singletons/prisma';
import { getTestFixtures } from '../helpers/testIsolation';
import { createConnectionTestData } from '../helpers/createTestData';

describe('Database Integration Tests', () => {
  let testUser: any;
  let testConnection: any;

  const fixtures = getTestFixtures();

  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createConnectionTestData();
    testUser = testData.user;
    testConnection = testData.connection;

    // Create fixture users
    await prisma.user.createMany({
      data: [
        {
          id: fixtures.users.testUser1.id,
          email: fixtures.users.testUser1.email,
          name: fixtures.users.testUser1.name,
          password: 'test-password',
          role: 'USER',
          isActive: true
        },
        {
          id: fixtures.users.testUser2.id,
          email: fixtures.users.testUser2.email,
          name: fixtures.users.testUser2.name,
          password: 'test-password',
          role: 'USER',
          isActive: true
        }
      ],
      skipDuplicates: true
    });

    // Create fixture API connections
    await prisma.apiConnection.createMany({
      data: [
        {
          id: fixtures.apiConnections.githubConnection.id,
          userId: fixtures.users.testUser1.id,
          name: 'Test GitHub Connection',
          description: 'Test GitHub API connection',
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2',
          authConfig: { provider: 'github' },
          status: 'ACTIVE',
          ingestionStatus: 'SUCCEEDED',
          connectionStatus: 'connected'
        },
        {
          id: fixtures.apiConnections.slackConnection.id,
          userId: fixtures.users.testUser1.id,
          name: 'Test Slack Connection',
          description: 'Test Slack API connection',
          baseUrl: 'https://slack.com/api',
          authType: 'OAUTH2',
          authConfig: { provider: 'slack' },
          status: 'ACTIVE',
          ingestionStatus: 'SUCCEEDED',
          connectionStatus: 'connected'
        }
      ],
      skipDuplicates: true
    });
  });

  it('should connect to the database', async () => {
    try {
      // Connection is already established in globalSetup
      console.log('Database connection successful');
      
      // Try a simple query
      const userCount = await prisma.user.count();
      console.log(`Found ${userCount} users in database`);
      
      expect(userCount).toBeGreaterThanOrEqual(0);
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  });

  it('should find fixture users', async () => {
    try {
      const users = await prisma.user.findMany({
        where: {
          email: {
            in: [fixtures.users.testUser1.email, fixtures.users.testUser2.email]
          }
        },
        select: { id: true, email: true, name: true, role: true }
      });
      
      console.log('Found fixture users:', users);
      expect(users).toHaveLength(2);
      expect(users.map(u => u.email)).toContain(fixtures.users.testUser1.email);
      expect(users.map(u => u.email)).toContain(fixtures.users.testUser2.email);
    } catch (error) {
      console.error('Database query failed:', error);
      throw error;
    }
  });

  it('should find fixture API connections', async () => {
    try {
      const connections = await prisma.apiConnection.findMany({
        where: {
          id: {
            in: [fixtures.apiConnections.githubConnection.id, fixtures.apiConnections.slackConnection.id]
          }
        },
        select: { id: true, name: true, status: true, authType: true }
      });
      
      console.log('Found fixture connections:', connections);
      expect(connections).toHaveLength(2);
      expect(connections.map(c => c.name)).toContain('Test GitHub Connection');
      expect(connections.map(c => c.name)).toContain('Test Slack Connection');
    } catch (error) {
      console.error('Database query failed:', error);
      throw error;
    }
  });

  it('should create and cleanup test data', async () => {
    // Create a test user
    const testEmail = `test-db-user-${Date.now()}@example.com`;
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test DB User',
        password: 'test-password',
        role: 'USER',
      }
    });

    // Verify the user was created
    const foundUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });

    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(testEmail);

    // Cleanup is handled automatically by afterEach
  });
}); 
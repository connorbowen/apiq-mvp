import { prisma } from '../../src/lib/singletons/prisma';
import { getTestFixtures } from '../helpers/testIsolation';

describe('Database Integration Tests', () => {
  const fixtures = getTestFixtures();

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
        select: { id: true, provider: true, name: true, status: true }
      });
      
      console.log('Found fixture connections:', connections);
      expect(connections).toHaveLength(2);
      expect(connections.map(c => c.provider)).toContain('github');
      expect(connections.map(c => c.provider)).toContain('slack');
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
        role: 'USER',
        emailVerified: new Date(),
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
import { prisma } from '../../lib/database/client';
import { createTestSuite } from '../helpers/testUtils';

describe('Database Integration Tests', () => {
  const testSuite = createTestSuite('Database Tests');

  beforeAll(async () => {
    await testSuite.beforeAll();
  });

  afterAll(async () => {
    await testSuite.afterAll();
  });

  it('should connect to the database', async () => {
    try {
      await prisma.$connect();
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

  it('should find existing users', async () => {
    try {
      const users = await prisma.user.findMany({
        take: 5,
        select: { id: true, email: true, name: true, role: true }
      });
      
      console.log('Found users:', users);
      expect(Array.isArray(users)).toBe(true);
    } catch (error) {
      console.error('Database query failed:', error);
      throw error;
    }
  });

  it('should create and delete test data', async () => {
    // Create a test user
    const testUser = await testSuite.createUser(
      'test-db-user@example.com',
      'testpass123',
      'USER' as any,
      'Test DB User'
    );

    // Verify the user was created
    const foundUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });

    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe('test-db-user@example.com');

    // The cleanup will be handled by the test suite
  });
}); 
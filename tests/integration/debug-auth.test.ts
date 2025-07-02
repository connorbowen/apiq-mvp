import { Role } from '../../src/generated/prisma';
import bcrypt from 'bcryptjs';
import { generateTestId } from '../helpers/testUtils';
import { prisma } from '../../lib/database/client';
import { createCommonTestData } from '../helpers/createTestData';

describe('Debug Authentication Issue', () => {
  let testUser: any;

  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createCommonTestData();
    testUser = testData.user;
  });

  it('should create and verify a test user', async () => {
    const testEmail = `debug-test-${generateTestId()}@example.com`;
    const testPassword = 'debugpass123';

    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Debug Test User',
        password: await bcrypt.hash(testPassword, 10),
        role: Role.USER,
        isActive: true,
      },
    });

    console.log('User created:', { id: user.id, email: user.email });

    // Verify user exists
    const foundUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    console.log('Found user:', foundUser ? { id: foundUser.id, email: foundUser.email, isActive: foundUser.isActive } : 'NOT FOUND');

    expect(foundUser).toBeTruthy();
    expect(foundUser?.email).toBe(testEmail);
    expect(foundUser?.isActive).toBe(true);

    // Test password verification
    const isPasswordValid = await bcrypt.compare(testPassword, foundUser!.password);
    console.log('Password valid:', isPasswordValid);
    
    expect(isPasswordValid).toBe(true);

    // Clean up
    await prisma.user.delete({
      where: { id: user.id }
    });
  });
}); 
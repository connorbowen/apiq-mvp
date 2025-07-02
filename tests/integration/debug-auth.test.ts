import { Role } from '../../src/generated/prisma';
import bcrypt from 'bcryptjs';
import { generateTestId } from '../helpers/testUtils';
import { prisma } from '../../lib/database/client';

describe('Debug Authentication Issue', () => {
  beforeAll(async () => {
    // Clean up any existing test users
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'test-debug' }
      }
    });
  });



  test('should create and authenticate a test user', async () => {
    const testEmail = `test-debug-${generateTestId()}@example.com`;
    const testPassword = 'testpass123';
    const testName = 'Test Debug User';

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    console.log('Creating test user...');
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: testName,
        role: Role.USER,
        isActive: true
      }
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
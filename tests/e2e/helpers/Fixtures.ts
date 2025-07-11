// Simple deterministic fixture generator avoiding external dependencies.
// For more advanced data generation, consider installing `@faker-js/faker`.

export interface UserFixture {
  email: string;
  password: string;
  name: string;
}

export const createUserFixture = (overrides: Partial<UserFixture> = {}): UserFixture => {
  const timestamp = Date.now();
  const user: UserFixture = {
    email: `user_${timestamp}@example.com`,
    password: 'Password123!',
    name: `Test User ${timestamp}`,
    ...overrides,
  };

  return user;
};
// Polyfill TextEncoder and TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Global setup for integration tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'apiq_mvp'; // Use apiq_mvp to match DATABASE_URL
process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'connorbowen';
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || '';

// Set DATABASE_URL for test environment
process.env.DATABASE_URL = 'postgresql://connorbowen@localhost:5432/apiq_mvp';

// jest.integration.setup.js
/**
 * OpenAI API Key Handling for Integration Tests
 * - By default, sets OPENAI_API_KEY to a mock value for safe, fast, and cost-free testing.
 * - If USE_REAL_OPENAI=1 is set in the environment, does NOT override OPENAI_API_KEY, allowing the real key from .env.test or the environment to be used.
 * - This follows user-rules.md: never use real keys in dev/prod code, only in test scripts, and only when explicitly enabled.
 */
if (!process.env.USE_REAL_OPENAI) {
  process.env.OPENAI_API_KEY = 'test-openai-api-key';
}
process.env.OPENAI_MODEL = 'gpt-4-turbo-preview';

// Set encryption keys for tests (mock values)
process.env.ENCRYPTION_MASTER_KEY = 'test-32-character-master-key-123';
process.env.ENCRYPTION_KEY = 'test-32-character-encryption-key-123';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console logs during tests unless there's an error
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Override console methods to suppress logs during tests
console.log = jest.fn();
console.warn = jest.fn();
console.error = originalConsoleError; // Keep error logging

// Import Prisma client for transaction management
const { prisma } = require('./src/lib/singletons/prisma');
const { cleanupTestData } = require('./tests/helpers/testIsolation');

// Global test state management
let globalTransactionId = null;

// Global setup - runs once before all tests
beforeAll(async () => {
  // Database connection and fixture loading is handled in jest.integration.setup.ts
  console.log('Integration test suite starting...');
});

// Global teardown - runs once after all tests
afterAll(async () => {
  console.log('Integration test suite completed.');
  try {
    if (globalTransactionId) {
      // Roll back the entire test suite transaction
      await prisma.$executeRawUnsafe('ROLLBACK');
      globalTransactionId = null;
    }
  } catch (error) {
    console.error('Failed to rollback transaction:', error);
  }
  
  // Ensure proper disconnection
  await prisma.$disconnect();
});

// Per-test cleanup - runs after each test
afterEach(async () => {
  // Clean up test data to ensure isolation
  await cleanupTestData();
});

// Disable transaction management for now due to connection pool constraints
// We use table truncation instead for test isolation
const originalTransaction = prisma.$transaction;
prisma.$transaction = async (fn) => {
  // For tests, we'll use the function directly without transaction wrapping
  // since we're managing isolation through table truncation
  return await fn(prisma);
};

// Handle process termination
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
}); 
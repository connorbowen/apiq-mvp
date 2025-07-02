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
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'apiq_test';
process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'connorbowen';
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || '';

// Set DATABASE_URL for test environment
process.env.DATABASE_URL = `postgresql://${process.env.TEST_DB_USER}:${process.env.TEST_DB_PASSWORD}@${process.env.TEST_DB_HOST}:${process.env.TEST_DB_PORT}/${process.env.TEST_DB_NAME}`;

// Set OpenAI API key for tests (mock value)
process.env.OPENAI_API_KEY = 'test-openai-api-key';
process.env.OPENAI_MODEL = 'gpt-4-turbo-preview';

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
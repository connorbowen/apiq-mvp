const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 15000, // Reduced from 30000 for faster feedback
  verbose: false, // Set to false to reduce output noise
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: 2, // Reduced from 4 to prevent database connection pool exhaustion
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Handle environment variables for integration tests
  setupFiles: ['<rootDir>/jest.polyfill.js'],
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  globalSetup: '<rootDir>/jest.integration.setup.ts',
  globalTeardown: '<rootDir>/jest.integration.teardown.ts',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig) 
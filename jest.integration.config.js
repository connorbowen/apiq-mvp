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
  testTimeout: 10000, // Reduced from 15000 for faster feedback
  verbose: false, // Set to false to reduce output noise
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: '50%', // Use 50% of available CPU cores instead of fixed 2
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
  // Add parallelization optimizations
  bail: false, // Don't bail on first failure
  detectOpenHandles: true,
  forceExit: true, // Force exit after tests complete
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig) 
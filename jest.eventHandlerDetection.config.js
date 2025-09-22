/**
 * Jest Configuration for Event Handler Detection
 * 
 * This configuration enables automated detection of conflicting event handlers
 * during test execution and provides detailed reporting.
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test environment setup
  setupFilesAfterEnv: [
    './jest.setup.js',
    './jest.eventHandlerDetection.setup.js'
  ],
  
  // Custom test patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.tsx',
    '**/tests/**/*.eventHandlerDetection.test.ts'
  ],
  
  // Coverage configuration for event handlers
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  
  // Custom coverage thresholds for event handling
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for event handling utilities
    'src/lib/utils/formSubmissionUtils.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/lib/utils/eventHandlerDetector.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Custom reporters for event handler detection
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/eventHandlerDetection',
      filename: 'eventHandlerDetectionReport.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Event Handler Detection Report'
    }]
  ],
  
  // Custom test timeout for detection tests
  testTimeout: 30000,
  
  // Environment variables for detection
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Custom module name mapping for detection utilities
  moduleNameMapping: {
    '^@/lib/utils/eventHandlerDetector$': '<rootDir>/src/lib/utils/eventHandlerDetector.ts',
    '^@/tests/helpers/eventHandlerDetection$': '<rootDir>/tests/helpers/eventHandlerDetection.ts'
  }
};

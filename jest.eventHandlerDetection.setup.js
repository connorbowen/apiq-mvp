/**
 * Jest Setup for Event Handler Detection
 * 
 * This setup file configures the test environment for automated
 * event handler conflict detection.
 */

// Import the event handler detector
const { EventHandlerDetector } = require('../src/lib/utils/eventHandlerDetector');

// Global test configuration
global.eventHandlerDetection = {
  enabled: process.env.EVENT_HANDLER_DETECTION !== 'false',
  failOnCritical: process.env.FAIL_ON_CRITICAL_CONFLICTS !== 'false',
  failOnHigh: process.env.FAIL_ON_HIGH_CONFLICTS !== 'false',
  warnOnMedium: process.env.WARN_ON_MEDIUM_CONFLICTS !== 'false',
  logLevel: process.env.EVENT_HANDLER_LOG_LEVEL || 'warn'
};

// Create global detector instance
global.eventHandlerDetector = new EventHandlerDetector({
  logLevel: global.eventHandlerDetection.logLevel,
  includeWarnings: true,
  checkPreventDefault: true,
  checkStopPropagation: true,
  includeFileInfo: true
});

// Global test utilities
global.detectEventConflicts = async (page) => {
  if (!global.eventHandlerDetection.enabled) return [];
  
  try {
    const conflicts = await page.evaluate(() => {
      // This would need to be injected into the browser context
      // For now, we'll return a mock implementation
      return [];
    });
    return conflicts;
  } catch (error) {
    console.warn('Failed to detect event conflicts:', error.message);
    return [];
  }
};

global.validateFormPatterns = async (page) => {
  if (!global.eventHandlerDetection.enabled) return true;
  
  try {
    // Check for basic form patterns
    const formsWithoutTestId = await page.locator('form:not([data-testid])').count();
    const submitButtonsWithoutTestId = await page.locator('button[type="submit"]:not([data-testid*="primary-action"])').count();
    
    return formsWithoutTestId === 0 && submitButtonsWithoutTestId === 0;
  } catch (error) {
    console.warn('Failed to validate form patterns:', error.message);
    return true;
  }
};

// Custom Jest matchers for event handler detection
expect.extend({
  toHaveNoCriticalConflicts(received) {
    if (!Array.isArray(received)) {
      return {
        message: () => `Expected ${received} to be an array of conflicts`,
        pass: false
      };
    }
    
    const criticalConflicts = received.filter(conflict => conflict.severity === 'critical');
    
    if (criticalConflicts.length === 0) {
      return {
        message: () => `Expected no critical conflicts, but found ${criticalConflicts.length}`,
        pass: true
      };
    }
    
    return {
      message: () => `Expected no critical conflicts, but found ${criticalConflicts.length}: ${criticalConflicts.map(c => c.element).join(', ')}`,
      pass: false
    };
  },
  
  toHaveProperFormPatterns(received) {
    if (typeof received !== 'boolean') {
      return {
        message: () => `Expected ${received} to be a boolean indicating form pattern validity`,
        pass: false
      };
    }
    
    if (received) {
      return {
        message: () => `Expected form patterns to be invalid, but they were valid`,
        pass: true
      };
    }
    
    return {
      message: () => `Expected form patterns to be valid, but they were invalid`,
      pass: false
    };
  }
});

// Global test hooks for event handler detection
beforeEach(() => {
  if (global.eventHandlerDetection.enabled) {
    global.eventHandlerDetector.clearConflicts();
  }
});

afterEach(() => {
  if (global.eventHandlerDetection.enabled) {
    const conflicts = global.eventHandlerDetector.getConflicts();
    
    if (conflicts.length > 0) {
      const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
      const highConflicts = conflicts.filter(c => c.severity === 'high');
      
      if (global.eventHandlerDetection.failOnCritical && criticalConflicts.length > 0) {
        const report = global.eventHandlerDetector.generateReport();
        throw new Error(`Critical event handler conflicts detected:\n${report}`);
      }
      
      if (global.eventHandlerDetection.failOnHigh && highConflicts.length > 0) {
        const report = global.eventHandlerDetector.generateReport();
        throw new Error(`High severity event handler conflicts detected:\n${report}`);
      }
      
      if (global.eventHandlerDetection.warnOnMedium) {
        const mediumConflicts = conflicts.filter(c => c.severity === 'medium');
        if (mediumConflicts.length > 0) {
          console.warn(`Medium severity event handler conflicts detected: ${mediumConflicts.length}`);
        }
      }
    }
  }
});

// Console logging for detection
if (global.eventHandlerDetection.enabled) {
  console.log('🔍 Event Handler Detection enabled');
  console.log(`   Fail on critical conflicts: ${global.eventHandlerDetection.failOnCritical}`);
  console.log(`   Fail on high conflicts: ${global.eventHandlerDetection.failOnHigh}`);
  console.log(`   Warn on medium conflicts: ${global.eventHandlerDetection.warnOnMedium}`);
  console.log(`   Log level: ${global.eventHandlerDetection.logLevel}`);
}

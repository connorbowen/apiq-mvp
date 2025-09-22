# Event Handler Detection System

This document describes the automated event handler conflict detection system implemented to prevent and identify `onSubmit` issues and other event handling problems.

## Overview

The Event Handler Detection System provides comprehensive automated detection of conflicting event handlers that can cause form submission issues, particularly the `onSubmit` problems we've been fixing. It includes both static analysis and runtime detection capabilities.

## Components

### 1. Core Detection Engine (`src/lib/utils/eventHandlerDetector.ts`)

The main detection engine that analyzes React components and DOM elements for event handler conflicts.

**Key Features:**
- Detects multiple event handlers on the same element
- Identifies conflicting `onSubmit` and `onClick` handlers
- Warns about missing `preventDefault`/`stopPropagation`
- Provides specific recommendations for fixes
- Supports both React component analysis and DOM element analysis

**Usage:**
```typescript
import { EventHandlerDetector } from '@/lib/utils/eventHandlerDetector';

const detector = new EventHandlerDetector({
  logLevel: 'warn',
  checkPreventDefault: true,
  checkStopPropagation: true
});

// Detect conflicts in React components
const conflicts = detector.detectConflicts(component);

// Detect conflicts in DOM elements
const domConflicts = detector.detectDOMConflicts(document.body);
```

### 2. Test Utilities (`tests/helpers/eventHandlerDetection.ts`)

Utilities for detecting event handler conflicts in E2E tests and ensuring proper form submission patterns.

**Key Features:**
- Playwright integration for runtime detection
- Form submission pattern validation
- Automated assertions for conflict detection
- Comprehensive reporting

**Usage:**
```typescript
import { detectEventConflicts, assertNoCriticalConflicts } from '../helpers/eventHandlerDetection';

// Detect conflicts in a Playwright page
const conflicts = await detectEventConflicts(page);

// Assert no critical conflicts
await assertNoCriticalConflicts(page);
```

### 3. CLI Tool (`scripts/detect-event-handlers.js`)

Command-line tool for static analysis of event handler conflicts across the codebase.

**Usage:**
```bash
# Detect conflicts in all files
npm run detect:event-handlers

# Detect conflicts in source files only
npm run detect:event-handlers:src

# Detect conflicts in test files only
npm run detect:event-handlers:test

# Detect conflicts in both source and test files
npm run detect:event-handlers:all
```

### 4. Jest Configuration (`jest.eventHandlerDetection.config.js`)

Jest configuration for automated detection during unit and integration tests.

**Usage:**
```bash
# Run tests with event handler detection
npm run test:event-handlers
```

### 5. Playwright Configuration (`playwright.eventHandlerDetection.config.ts`)

Playwright configuration for automated detection during E2E tests.

**Usage:**
```bash
# Run E2E tests with event handler detection
npm run test:e2e:event-handlers
```

## Detection Patterns

### Critical Conflicts (Fail Tests)
- Forms with both `onSubmit` and `onClick` handlers without proper event handling
- Missing `preventDefault()` calls in `onSubmit` handlers
- Multiple conflicting event handlers on form elements

### High Severity Conflicts (Fail Tests)
- Missing `preventDefault()` calls in form submission handlers
- Forms without proper data-testid attributes
- Submit buttons without primary-action data-testid

### Medium Severity Conflicts (Warnings)
- Missing `stopPropagation()` calls in event handlers
- Forms without proper event handling setup
- Inconsistent event handler patterns

### Low Severity Conflicts (Info)
- Multiple event handlers on non-form elements
- Minor event handling inconsistencies

## Integration with Development Workflow

### 1. Pre-commit Hooks
The detection system can be integrated into pre-commit hooks to prevent problematic code from being committed.

### 2. CI/CD Pipeline
Automated detection runs in CI/CD to catch conflicts before deployment.

### 3. Development Mode
Real-time detection during development with console warnings.

### 4. Test Integration
Automatic detection during test execution with failure on critical conflicts.

## Configuration Options

### Environment Variables
```bash
# Enable/disable detection
EVENT_HANDLER_DETECTION=true

# Fail on critical conflicts
FAIL_ON_CRITICAL_CONFLICTS=true

# Fail on high severity conflicts
FAIL_ON_HIGH_CONFLICTS=true

# Warn on medium severity conflicts
WARN_ON_MEDIUM_CONFLICTS=true

# Log level
EVENT_HANDLER_LOG_LEVEL=warn
```

### Jest Configuration
```javascript
// jest.eventHandlerDetection.config.js
module.exports = {
  setupFilesAfterEnv: [
    './jest.setup.js',
    './jest.eventHandlerDetection.setup.js'
  ],
  // ... other configuration
};
```

### Playwright Configuration
```typescript
// playwright.eventHandlerDetection.config.ts
export default defineConfig({
  globalSetup: require.resolve('./tests/helpers/eventHandlerDetection.setup.ts'),
  // ... other configuration
});
```

## Usage Examples

### 1. Basic Conflict Detection
```typescript
import { EventHandlerDetector } from '@/lib/utils/eventHandlerDetector';

const detector = new EventHandlerDetector();
const conflicts = detector.detectConflicts(component);

if (conflicts.length > 0) {
  console.warn('Event handler conflicts detected:', conflicts);
}
```

### 2. E2E Test Integration
```typescript
import { test, expect } from '@playwright/test';
import { assertNoCriticalConflicts, assertProperFormPatterns } from '../helpers/eventHandlerDetection';

test('should have no event handler conflicts', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Assert no critical conflicts
  await assertNoCriticalConflicts(page);
  
  // Assert proper form patterns
  await assertProperFormPatterns(page);
});
```

### 3. React Hook Usage
```typescript
import { useEventHandlerDetection } from '@/lib/utils/eventHandlerDetector';

function MyComponent() {
  const { conflicts, detectConflicts } = useEventHandlerDetection();
  
  useEffect(() => {
    detectConflicts(component);
  }, []);
  
  return <div>...</div>;
}
```

### 4. CLI Usage
```bash
# Basic detection
npm run detect:event-handlers

# With custom options
node scripts/detect-event-handlers.js --src src --test tests --output results

# Generate report only
node scripts/detect-event-handlers.js --no-fail-critical --no-fail-high
```

## Reports and Output

### Console Output
The system provides color-coded console output:
- 🔴 Critical conflicts (red)
- 🟡 High severity conflicts (yellow)
- 🔵 Medium severity conflicts (blue)
- ⚪ Low severity conflicts (white)

### JSON Reports
Detailed JSON reports are generated with:
- Summary statistics
- Detailed conflict information
- File-specific issues
- Recommendations for fixes

### HTML Reports
Jest and Playwright generate HTML reports with visual conflict analysis.

## Best Practices

### 1. Use Form Submission Utilities
Always use the `formSubmissionUtils` for form submissions:
```typescript
import { createFormSubmissionHandler } from '@/lib/utils/formSubmissionUtils';

const handleSubmit = createFormSubmissionHandler(async (formData) => {
  // Handle form submission
});
```

### 2. Proper Data Attributes
Ensure all forms and buttons have proper data-testid attributes:
```tsx
<form data-testid="create-connection-form" onSubmit={handleSubmit}>
  <button data-testid="primary-action create-connection-btn" type="submit">
    Create Connection
  </button>
</form>
```

### 3. Event Handler Patterns
Follow consistent event handler patterns:
```typescript
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // Handle submission
}, []);
```

### 4. Regular Detection
Run detection regularly:
- Before committing code
- In CI/CD pipeline
- During development
- In test suites

## Troubleshooting

### Common Issues

1. **False Positives**: Adjust detection patterns or severity levels
2. **Missing Dependencies**: Ensure all required packages are installed
3. **Performance Issues**: Use selective detection for large codebases
4. **Integration Issues**: Check configuration files and environment variables

### Debug Mode
Enable debug mode for detailed logging:
```bash
EVENT_HANDLER_LOG_LEVEL=debug npm run detect:event-handlers
```

### Custom Patterns
Add custom detection patterns in the configuration files.

## Future Enhancements

1. **IDE Integration**: Real-time detection in VS Code and other IDEs
2. **Auto-fixing**: Automatic fixing of common event handler issues
3. **Performance Analysis**: Detection of performance-impacting event handlers
4. **Accessibility Integration**: Detection of accessibility-related event handling issues
5. **Visual Studio Code Extension**: Dedicated extension for event handler detection

## Contributing

To contribute to the event handler detection system:

1. Add new detection patterns in `eventHandlerDetector.ts`
2. Update test utilities in `eventHandlerDetection.ts`
3. Enhance CLI tool in `detect-event-handlers.js`
4. Update documentation and examples
5. Add tests for new detection patterns

## Support

For issues or questions about the event handler detection system:

1. Check the console output for specific error messages
2. Review the generated reports for detailed information
3. Consult the configuration files for proper setup
4. Check the test examples for usage patterns

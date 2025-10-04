# Confidence Confirmation E2E Tests

This directory contains comprehensive end-to-end tests for the confidence confirmation system that shows a modal when AI-generated workflows have low confidence scores (<0.7).

## Overview

The confidence confirmation system is a critical user experience feature that:
- Shows a modal when AI-generated workflows have confidence scores below 0.7
- Allows users to review the confidence score, explanation, and workflow preview
- Provides options to proceed anyway or cancel the workflow
- Maintains chat context and integrates with workflow execution

## Test Structure

### Test Files

- **`confidence-confirmation.test.ts`** - Main test file with comprehensive coverage
- **`confidenceConfirmationHelpers.ts`** - Helper functions for testing confidence modals

### Test Categories

#### 1. Confidence Threshold Detection
- Tests that modals appear for low confidence workflows
- Tests that modals don't appear for high confidence workflows
- Validates confidence threshold configuration

#### 2. Confidence Confirmation Modal UI
- Tests confidence score display and formatting
- Tests confidence explanation display
- Tests workflow preview with steps
- Validates UX compliance and accessibility

#### 3. User Interaction Flows
- Tests "Proceed Anyway" button functionality
- Tests "Cancel" button functionality
- Tests modal closing with escape key
- Tests modal closing by clicking outside

#### 4. Integration with Workflow Execution
- Tests workflow execution after confidence confirmation
- Tests integration with unsaved workflows
- Validates execution flow continuity

#### 5. Error Handling and Edge Cases
- Tests confidence calculation errors
- Tests modal interaction errors
- Tests chat context maintenance

#### 6. Security and Data Validation
- Tests XSS prevention in confidence explanations
- Tests confidence score data validation
- Tests data exposure prevention

## Test Data Requirements

### Prerequisites
- Test user with appropriate permissions
- API connection for workflow testing
- Clean test environment

### Test Data Setup
```typescript
testData = await createTestData({
  user: testUser,
  connection: {
    name: 'Test API Connection',
    baseUrl: 'https://petstore3.swagger.io/api/v3',
    authType: 'NONE',
    documentationUrl: 'https://petstore3.swagger.io/api/v3/openapi.json'
  }
});
```

## Running the Tests

### Prerequisites
1. Server must be running (`npm run dev`)
2. Database must be accessible
3. Test environment must be clean

### Run All Tests
```bash
npm run test:e2e:confidence
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/chat/confidence-confirmation.test.ts
```

### Run with Custom Script
```bash
./scripts/run-confidence-confirmation-tests.sh
```

## Test Configuration

### Environment Variables
- `BASE_URL` - Base URL for the application (default: http://localhost:3000)
- `NODE_ENV` - Environment (should be 'test')

### Timeouts
- Default timeout: 60 seconds
- Retries: 2 attempts
- Chat response timeout: 15 seconds

## Helper Functions

### Core Helpers
- `waitForConfidenceModal()` - Wait for confidence modal to appear
- `waitForConfidenceModalToClose()` - Wait for modal to close
- `testConfidenceScoreDisplay()` - Test confidence score display
- `testConfidenceExplanation()` - Test explanation display
- `testWorkflowPreview()` - Test workflow preview

### Interaction Helpers
- `clickProceedButton()` - Click proceed button
- `clickCancelButton()` - Click cancel button
- `closeConfidenceModalWithEscape()` - Close with escape key
- `closeConfidenceModalWithBackdrop()` - Close by clicking outside

### Validation Helpers
- `testConfidenceModalAccessibility()` - Test accessibility
- `testConfidenceModalUXCompliance()` - Test UX compliance
- `testConfidenceModalComprehensive()` - Comprehensive test

## Expected Behavior

### High Confidence Workflows
- No confidence modal appears
- Workflow is generated normally
- User can proceed with execution

### Low Confidence Workflows
- Confidence modal appears with score < 70%
- Modal shows confidence score, explanation, and workflow preview
- User can proceed or cancel
- Modal can be closed with escape or backdrop click

### Error Scenarios
- Missing confidence data is handled gracefully
- XSS in explanations is prevented
- Invalid confidence scores are validated
- Modal interactions are robust

## Debugging

### Common Issues
1. **Modal not appearing**: Check if confidence scoring is implemented
2. **Tests timing out**: Increase timeout values or check server performance
3. **Helper functions failing**: Verify data-testid attributes match

### Debug Commands
```bash
# Run with debug output
npx playwright test tests/e2e/chat/confidence-confirmation.test.ts --debug

# Run specific test
npx playwright test tests/e2e/chat/confidence-confirmation.test.ts -g "should show confidence confirmation modal"

# Run with headed browser
npx playwright test tests/e2e/chat/confidence-confirmation.test.ts --headed
```

## Maintenance

### Adding New Tests
1. Follow existing test patterns
2. Use helper functions when possible
3. Include proper cleanup
4. Add appropriate assertions

### Updating Tests
1. Update helper functions for new UI changes
2. Update data-testid selectors if UI changes
3. Update timeout values if needed
4. Update documentation

### Test Data Management
1. Use `createTestData()` for setup
2. Use `cleanupTestData()` for cleanup
3. Avoid hardcoded test data
4. Ensure test isolation

## Related Files

- `src/components/ConfidenceConfirmationModal.tsx` - Modal component
- `tests/helpers/confidenceConfirmationHelpers.ts` - Test helpers
- `tests/helpers/uiHelpers.ts` - General UI helpers
- `tests/helpers/modalHelpers.ts` - Modal testing helpers
- `docs/user-rules.md` - Testing guidelines

## Success Criteria

- All tests pass consistently
- No flaky tests
- Proper error handling
- Good test coverage
- Clear test documentation
- Maintainable test code

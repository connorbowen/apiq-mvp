# Primary Action Button Patterns

## Overview

This document defines the standardized patterns for primary action buttons across the APIQ application to ensure consistency with UX compliance requirements.

## Primary Action Definition

A **primary action** is the main call-to-action that moves users forward in their workflow. These are typically:
- Creation actions (Create, Add, Generate)
- Authentication actions (Sign in, Sign up)
- Submission actions (Save, Submit, Execute)
- Connection actions (Connect, Link)

## Required Attributes

### 1. Data Test ID Pattern
```typescript
// Primary action buttons MUST use combined test ID pattern:
data-testid="primary-action create-{resource}-btn"  // Combines UX compliance + functionality testing
```

### 2. Button Text Standards
```typescript
// Use these exact text patterns:
"Create Workflow"      // For workflow creation
"Add Connection"       // For API connections  
"Create Secret"       // For secrets vault
"Sign in"             // For authentication
"Create account"      // For registration
"Generate Workflow"   // For AI-generated workflows
"Save Workflow"       // For workflow saving
"Execute"             // For workflow execution
```

### 3. Styling Requirements
```typescript
// Primary actions must use these classes:
className="px-4 py-2 bg-{color}-600 text-white rounded-md hover:bg-{color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-{color}-500 transition-colors min-h-[44px]"

// Color mapping:
// - Workflows: green-600/green-700
// - Connections: indigo-600/indigo-700  
// - Secrets: indigo-600/indigo-700
// - Authentication: indigo-600/indigo-700
```

## Implementation Examples

### Workflow Creation Button
```tsx
<button
  data-testid="primary-action create-workflow-btn"
  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors min-h-[44px]"
>
  Create Workflow
</button>
```

### Connection Creation Button
```tsx
<button
  data-testid="primary-action create-connection-btn"
  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors min-h-[44px]"
>
  Add Connection
</button>
```

### Secret Creation Button
```tsx
<button
  data-testid="primary-action create-secret-btn"
  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors min-h-[44px]"
>
  Create Secret
</button>
```

### Authentication Buttons
```tsx
<button
  data-testid="primary-action signin-submit"
  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors min-h-[44px]"
>
  Sign in
</button>
```

## Non-Primary Actions

The following buttons are NOT primary actions and should NOT have `data-testid="primary-action"`:

### Utility/Navigation Buttons
- "Cancel", "Close", "Back", "Previous", "Next"
- "Menu", "Settings", "Profile", "Account"
- "Overview", "Connections", "Secrets", "Admin", "Audit"

### Workflow Management Buttons
- "Execute", "Pause", "Resume", "Delete", "View"
- "Refresh", "Edit", "Test", "Explore"

### Form Actions
- "Save" (for editing existing resources)
- "Update", "Modify", "Change"

## UX Compliance Validation

The `UXComplianceHelper.validateActivationFirstUX()` method validates primary actions by:

1. Looking for `data-testid="primary-action"` attributes (as part of combined test ID)
2. Checking button text matches primary action patterns
3. Excluding utility/navigation buttons
4. Ensuring at least one primary action exists per page

## Migration Checklist

### Components to Update

- [x] `src/components/dashboard/SecretsTab.tsx` ✅ **COMPLETED**
- [ ] `src/components/dashboard/WorkflowsTab.tsx`
- [x] `src/components/dashboard/ConnectionsTab.tsx` ✅ **COMPLETED** (search, filter, accessibility)
- [ ] `src/app/login/page.tsx`
- [ ] `src/app/signup/page.tsx`
- [ ] `src/app/workflows/create/page.tsx`
- [ ] `src/components/NaturalLanguageWorkflowChat.tsx`

### Required Changes

1. **Use combined `data-testid="primary-action create-{resource}-btn"`** for all primary action buttons
2. **Ensure consistent button text** matches the standards above
3. **Apply consistent styling** with proper color schemes
4. **Update tests** to use the new combined data-testid patterns
5. **Verify UX compliance** validation passes

## Testing Guidelines

### Unit Tests
```typescript
// Test primary action presence
expect(screen.getByTestId('primary-action create-workflow-btn')).toBeInTheDocument();

// Test button text
expect(screen.getByTestId('primary-action create-workflow-btn')).toHaveTextContent('Create Workflow');
```

### E2E Tests
```typescript
// Test primary action functionality
await page.getByTestId('primary-action create-workflow-btn').click();

// Test UX compliance
await uxHelper.validateActivationFirstUX();
```

## Success Criteria

- [ ] All primary action buttons have combined `data-testid="primary-action create-{resource}-btn"`
- [ ] Button text matches standardized patterns
- [ ] Styling is consistent across all primary actions
- [ ] UX compliance validation passes for all pages
- [ ] All tests pass with new combined data-testid patterns
- [ ] No utility/navigation buttons have `primary-action` attributes

## Maintenance

- Review this document when adding new primary actions
- Update UX compliance validation if patterns change
- Ensure new components follow these patterns
- Regular audits to maintain consistency 
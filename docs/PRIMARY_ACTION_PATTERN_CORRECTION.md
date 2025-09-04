# Primary Action Pattern Correction

## Overview

This document clarifies the correct usage of primary action patterns in E2E tests and documents the correction made during the guided tour test migration.

## Issue Identified

During the guided tour test migration, initial analysis incorrectly assumed that all UI buttons should use the `getPrimaryActionButton()` helper function. This assumption was based on the migration requirements but failed to account for specialized UI components.

## Primary Action Pattern

### **Standard Primary Action Buttons**
Primary action buttons follow the pattern: `primary-action ${action}-btn`

**Examples:**
- `primary-action signup-btn`
- `primary-action signin-btn`
- `primary-action submit-btn`
- `primary-action save-btn`

**Usage:**
```typescript
const submitButton = await getPrimaryActionButton(page, 'submit');
await submitButton.click();
```

### **Specialized UI Components**
Some UI components use specialized button patterns that don't follow the primary action convention:

**Guided Tour Buttons:**
- `guided-tour-next`
- `guided-tour-prev`
- `guided-tour-skip`

**Usage:**
```typescript
// Correct approach for guided tour
await page.getByTestId('guided-tour-next').click();
await page.getByTestId('guided-tour-prev').click();
await page.getByTestId('guided-tour-skip').click();

// Incorrect approach (would fail)
const nextButton = await getPrimaryActionButton(page, 'guided-tour-next'); // ❌
```

## Correction Applied

### **Before (Incorrect)**
```typescript
// This would look for 'primary-action guided-tour-next-btn' which doesn't exist
const nextButton = await getPrimaryActionButton(page, 'guided-tour-next');
await nextButton.click();
```

### **After (Correct)**
```typescript
// Direct selector for specialized guided tour buttons
await page.getByTestId('guided-tour-next').click();
```

## Guidelines for Future Migrations

### **When to Use `getPrimaryActionButton()`**
- ✅ Standard form submission buttons
- ✅ Standard action buttons (save, cancel, submit, etc.)
- ✅ Buttons that follow the `primary-action ${action}-btn` pattern

### **When to Use Direct Selectors**
- ✅ Specialized navigation components (guided tours, wizards, etc.)
- ✅ Component-specific buttons that don't follow standard patterns
- ✅ Legacy components with established test ID patterns

### **Decision Process**
1. **Check the actual test ID** in the component source code
2. **Verify the pattern** - does it follow `primary-action ${action}-btn`?
3. **Use appropriate helper** - `getPrimaryActionButton()` for standard patterns, direct selectors for specialized components
4. **Document the decision** - add comments explaining why a particular approach was chosen

## Impact on Migration Strategy

This correction demonstrates that:

1. **Helper functions should be flexible** - not all components follow the same patterns
2. **Specialized components should be preserved** - don't force components into generic patterns
3. **Migration analysis should be validated** - assumptions should be tested against actual component behavior
4. **Documentation should be updated** - corrections should be documented for future reference

## Related Files

- `tests/e2e/ui/guided-tour.test.ts` - Corrected implementation
- `src/components/GuidedTour.tsx` - Source component with actual test IDs
- `tests/helpers/e2eHelpers.navigation.ts` - `getPrimaryActionButton()` helper function
- `docs/guided-tour-migration-summary.md` - Updated migration documentation

## Conclusion

The guided tour test migration successfully corrected the primary action pattern assumption and established a clear guideline for handling specialized UI components. This approach maintains the benefits of the helper structure while preserving the specialized nature of components that don't follow standard patterns.

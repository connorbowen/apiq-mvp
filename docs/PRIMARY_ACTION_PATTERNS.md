# Primary Action Patterns (2025-07-16)

## 🆕 DASHBOARD NAVIGATION & PRIMARY ACTION UPDATE
- All navigation to Settings, Profile, Secrets, and Audit Log is now via the user dropdown
- All primary actions and navigation use updated `data-testid` patterns for dropdown items
- Documentation files synchronized to reflect new navigation and test structure

## 🆕 ENHANCED STYLING COMPLIANCE
- **Automatic Enhancement**: All form elements automatically get enhanced text readability
- **No Manual Updates**: Existing components automatically benefit from improved contrast
- **Consistent Experience**: Same high-contrast styling across all forms and inputs
- **Accessibility First**: WCAG 2.1 AA compliant text contrast ratios

### Styling Integration
- **Primary Actions**: Maintain existing patterns while getting enhanced styling
- **Form Fields**: Automatically enhanced without breaking existing functionality
- **Test Coverage**: E2E tests automatically validate text readability compliance

## ✅ COMPLETED
- All primary action buttons, including secrets-first flows, use `data-testid="primary-action {action}-btn"` pattern
- All E2E and unit tests use the new pattern
- All pattern tasks marked as completed

## Examples
- `data-testid="primary-action generate-workflow-btn"`
- `data-testid="primary-action save-workflow-btn"`
- `data-testid="primary-action execute-workflow-btn"`
- `data-testid="primary-action create-connection-header-btn"`
- `data-testid="primary-action create-connection-empty-btn"`
- `data-testid="primary-action submit-connection-btn"`
- ...and all other core flows

## 🆕 CONNECTION CREATION PATTERNS

### **Connection Modal Actions**
- **Create Connection Buttons**: 
  - `data-testid="primary-action create-connection-header-btn"` (when connections exist)
  - `data-testid="primary-action create-connection-empty-btn"` (when no connections)
- **Form Submission**: 
  - `data-testid="primary-action submit-connection-btn"` (submit button)
  - Uses `form.requestSubmit()` for reliable submission

### **Mobile Navigation Patterns**
- **Mobile Tab Navigation**: 
  - `data-testid="mobile-dashboard-tab-{tab}"` (e.g., `mobile-dashboard-tab-chat`)
  - Consistent with desktop tab patterns but mobile-specific

### **Form Field Patterns**
- **Connection Form Fields**:
  - `data-testid="connection-name-input"`
  - `data-testid="connection-description-input"`
  - `data-testid="connection-baseurl-input"`
  - `data-testid="connection-authtype-select"`
  - `data-testid="connection-apikey-input"`
  - `data-testid="connection-bearertoken-input"`
  - `data-testid="connection-username-input"`
  - `data-testid="connection-password-input"`

### **Error Handling Patterns**
- **Error Message Selectors**:
  - `data-testid="error-message"`
  - `data-testid="registration-error"`
  - `.text-sm.font-medium.text-red-800`
  - `.text-red-600`
  - `.text-red-800`

_Last updated: 2025-01-27 (Connection creation patterns and mobile navigation updates)_ 
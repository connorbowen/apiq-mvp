# Changelog

All notable changes to this project will be documented in this file.

## [2025-08-25] - Enhanced Text Readability System

### ✨ Added
- **Enhanced Styling System**: Automatic text readability improvements for all form elements
- **Global CSS Overrides**: High-contrast styling applied automatically to inputs, textareas, selects, and labels
- **WCAG 2.1 AA Compliance**: Meets accessibility standards for text contrast ratios
- **Cross-Platform Consistency**: Enhanced styling works across all viewport sizes and backgrounds

### 🔧 Enhanced
- **Form Inputs**: White backgrounds with dark text for maximum readability
- **Form Labels**: Dark text that's readable against any background
- **Placeholder Text**: Optimized contrast for better visibility
- **Focus States**: Blue borders with subtle shadows for clear focus indicators

### 🧪 Testing
- **E2E Test Suite**: Comprehensive text readability validation (`tests/e2e/ui/text-readability.test.ts`)
- **UX Compliance Helper**: New `validateTextReadability()` method for existing tests
- **Validation Script**: Automated testing of enhanced styling system (`scripts/test-enhanced-styling.js`)
- **Integration**: Existing `validateFormAccessibility()` now includes text readability validation

### 📚 Documentation
- **Enhanced Styling Guide**: Complete system documentation (`docs/ENHANCED_STYLING_SYSTEM.md`)
- **Utility Functions**: CSS-in-JS utilities for dynamic styling (`src/lib/styles/formStyles.ts`)
- **Reusable Components**: Enhanced form components with built-in accessibility (`src/components/ui/FormElements.tsx`)

### 🎯 Impact
- **User Experience**: Significantly improved text readability across all forms
- **Accessibility**: Automatic compliance with WCAG 2.1 AA standards
- **Developer Experience**: No manual component updates required
- **Maintenance**: Centralized styling system for consistent compliance

## [2025-07-16] - Dashboard Navigation Refactor & E2E Improvements

### 🆕 Secrets-First Connection Management
- All API connection creation, management, and rotation now use secrets vault by default
- New `/api/connections/[id]/secrets` endpoint for per-connection secret management
- Database schema: `Secret` model linked to `ApiConnection` with rotation and audit logging
- UI/UX: Connection forms and management UI updated for secrets-first flows
- E2E: `secrets-first-connection.test.ts` and updated `connections-management.test.ts` for secrets-first

### 🆕 E2E Test Suite Enhancements
- Added comprehensive E2E tests for secrets-first flows (creation, linking, rotation, rollback, audit)
- New test scripts: `test:e2e:secrets-first` for targeted secrets-first runs

### 🆕 Bug Fixes & Infrastructure
- Fixed audit log errors (undefined IDs)
- Expanded `CreateApiConnectionRequest` type for secrets-first
- Improved error handling and rollback logic in backend

### 🆕 Documentation
- Updated all core documentation files for secrets-first, E2E, and implementation status
- Synchronized test counts, pass rates, and compliance metrics
- **Archived Implementation Documents**: Moved completed secrets-first refactor implementation documents to `docs/archive/secrets-first-refactor/` for historical preservation

### 🆕 Dashboard Navigation & UX Refactor (2025-07-16)
- **UI/UX:** Dashboard now uses a 3-tab structure: Chat, Workflows, Connections (Settings/Profile/Secrets/Audit Log moved to dropdown)
- **Functionality:** Settings and Profile are only accessible via the dropdown; Admin consolidated into Settings for admins
- **Testing:** E2E and unit tests updated for new navigation, dropdown selectors, and flows
- **Pattern:** All navigation to Settings/Profile/Secrets/Audit Log is via dropdown with new `data-testid` patterns
- **Documentation:** All core documentation files updated for new navigation, selectors, and test metrics
- **Status:** All references to Settings as a main tab removed; test metrics and status indicators synchronized

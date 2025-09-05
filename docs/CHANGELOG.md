# Changelog

All notable changes to this project will be documented in this file.

## [2025-01-27] - Dashboard Layout Optimization & UX Enhancement

### ✨ Added
- **Immersive Dashboard Background**: Full-width animated gradient background with subtle pattern overlays
- **Two-Column Chat Layout**: Desktop chat interface with sidebar for features/stats and main chat area
- **Enhanced Empty States**: Larger icons, bigger text, and more prominent call-to-action buttons
- **Mobile Tab Navigation**: Mobile-specific tab navigation integrated into header
- **Z-Index Management System**: Comprehensive z-index hierarchy for proper UI layering

### 🔧 Enhanced
- **Viewport Fitting**: Dashboard now fits perfectly on standard laptop screens (1366x768, 1440x900) without scrolling
- **Responsive Design**: Improved mobile and desktop layouts with proper touch targets and spacing
- **Button Consistency**: Standardized all form elements (search, filter, buttons) to consistent sizing and styling
- **Visual Hierarchy**: Enhanced tab navigation with icons, better active states, and improved differentiation
- **Profile Dropdown**: Fixed z-index issues ensuring dropdown appears above all content

### 🎨 Visual Improvements
- **Empty State Enhancement**: 
  - Icons increased from 12x12 to 20x20 pixels with lighter colors
  - Headings upgraded from `text-sm` to `text-2xl font-semibold`
  - Descriptions enhanced to `text-lg` with better line spacing
  - Buttons enlarged with hover effects and animations
- **Background System**: Animated gradient background with subtle pattern overlays
- **Tab Navigation**: Added icons and improved visual states for better user experience

### 🏗️ Architecture Changes
- **Layout Restructuring**: Moved header outside main element to escape CSS stacking contexts
- **Height Management**: Implemented `calc(100vh - 80px)` for proper viewport utilization
- **Stacking Context Resolution**: Fixed CSS stacking context issues with transforms and overflow
- **Container Structure**: Proper width constraints and flexbox layouts for consistent sizing

### 🧪 Testing
- **Manual Validation**: Tested across multiple viewport sizes and browsers
- **Responsive Testing**: Verified proper layout adaptation at different breakpoints
- **Z-Index Validation**: Confirmed proper UI element layering and dropdown visibility
- **Existing Test Suite**: All existing tests continue to pass with new layout

### 📚 Documentation
- **DASHBOARD_LAYOUT_OPTIMIZATION.md**: Comprehensive implementation documentation
- **UX_SPEC.md**: Updated with new layout specifications and responsive design features
- **Technical Details**: Documented CSS classes, layout structure, and responsive design patterns

### 🎯 Impact
- **User Experience**: Significantly improved dashboard usability and visual appeal
- **Viewport Utilization**: Perfect fit on standard laptop screens without scrolling
- **Visual Consistency**: Uniform button sizing and form element styling throughout
- **Mobile Optimization**: Enhanced mobile experience with proper touch targets and navigation
- **Professional Appearance**: Clean, modern interface following best practices

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

# APIQ Secrets Vault UX Guide

## Overview

This guide provides comprehensive documentation for the Secrets Vault user experience, covering accessibility compliance, mobile responsiveness, security features, and advanced functionality based on extensive E2E testing.

## Table of Contents

1. [UX Compliance Standards](#ux-compliance-standards)
2. [Accessibility Requirements](#accessibility-requirements)
3. [Mobile Responsiveness](#mobile-responsiveness)
4. [Form Validation & Error Handling](#form-validation--error-handling)
5. [Security UX Patterns](#security-ux-patterns)
6. [Advanced Features](#advanced-features)
7. [Admin Security Settings](#admin-security-settings)
8. [Testing Requirements](#testing-requirements)

## UX Compliance Standards

### Page Structure & Accessibility

#### **Heading Hierarchy**
- **Main Heading**: Must be `h1` or `h2` containing "Secrets", "Manage", or "Vault"
- **Subheadings**: Must be `h2` or `h3` describing the purpose (e.g., "Manage your encrypted API keys, tokens, and sensitive credentials")
- **Page Title**: Must contain "APIQ" or "Multi-API"

#### **ARIA Attributes**
- **Required Elements**:
  - `[aria-label*="secret"]` or `[aria-labelledby]` for secret-related elements
  - `[role="button"]`, `[role="tab"]`, `[role="alert"]` for interactive elements
  - `[aria-required="true"]` for required form fields
  - `[aria-invalid="true"]` for validation errors
  - `[aria-describedby]` for descriptive text

#### **Screen Reader Support**
- **Live Regions**: `#aria-live-announcements` for dynamic content updates
- **Skip Links**: `[href="#main-content"]` or `[href="#content"]` for main content navigation
- **Descriptive Text**: `[aria-describedby]` for complex elements

#### **Visual Indicators**
- **Focus Indicators**: Must be visible with proper outline styles
- **Color Contrast**: Must meet WCAG 2.1 AA standards
- **Error States**: Red background classes (`.bg-red-50.border.border-red-200`)
- **Success States**: Green background classes (`.bg-green-50.border.border-green-200`)

## Accessibility Requirements

### WCAG 2.1 AA Compliance

#### **Keyboard Navigation**
- **Tab Order**: Logical tab order through all interactive elements
- **Focus Management**: Visible focus indicators on all focusable elements
- **Skip Links**: Skip to main content functionality

#### **Form Accessibility**
- **Required Fields**: Clear indication with `*` and `aria-required="true"`
- **Field Labels**: Properly associated labels with `for` attributes
- **Error Messages**: Accessible error containers with `role="alert"`
- **Validation Feedback**: Real-time validation with clear error messages

#### **Dynamic Content**
- **Live Regions**: Announcements for status changes
- **Loading States**: Clear loading indicators with descriptive text
- **Success Messages**: Accessible success notifications

### Mobile Accessibility

#### **Touch-Friendly Design**
- **Button Sizes**: Minimum 44px × 44px for touch targets
- **Touch Interactions**: Support for touch gestures and interactions
- **Mobile Navigation**: Collapsible mobile menu with proper ARIA attributes

#### **Responsive Layout**
- **Viewport Adaptation**: Proper scaling for mobile viewports (375px width)
- **Touch-Friendly Forms**: Adequate spacing and sizing for touch input
- **Mobile Menu**: Accessible mobile navigation with proper focus management

## Mobile Responsiveness

### Viewport Requirements

#### **Mobile Viewport (375px × 667px)**
- **Navigation**: Collapsible mobile menu with toggle button
- **Form Elements**: Touch-friendly input sizes and spacing
- **Buttons**: Minimum 44px touch targets
- **Dropdowns**: Touch-friendly dropdown interactions

#### **Touch Interactions**
- **Form Input**: Support for touch input on all form fields
- **Dropdown Selection**: Touch-friendly option selection
- **Button Interactions**: Proper touch response for all buttons

### Responsive Design Patterns

#### **Layout Adaptation**
- **Tab Navigation**: Responsive tab layout for mobile
- **Secret Cards**: Adaptive card layout for different screen sizes
- **Modal Dialogs**: Responsive modal sizing and positioning

## Form Validation & Error Handling

### Validation Requirements

#### **Required Field Validation**
- **Visual Indicators**: `*` symbol and `aria-required="true"`
- **Error Messages**: Clear, accessible error text
- **Field Highlighting**: `aria-invalid="true"` for invalid fields

#### **Input Validation**
- **Name Validation**: Alphanumeric characters, hyphens, underscores only
- **Value Validation**: Secure value input with proper sanitization
- **Type Validation**: Proper secret type selection

### Error Handling UX

#### **Error Display**
- **Accessible Containers**: `role="alert"` for error messages
- **Field-Level Errors**: Individual field error indicators
- **Form-Level Errors**: Overall form validation feedback

#### **Loading States**
- **Button States**: Disabled state with loading text ("Creating", "Saving")
- **Spinner Indicators**: Visual loading indicators
- **Progress Feedback**: Clear progress indication

## Security UX Patterns

### Encrypted Secrets Storage

#### **Secret Creation Flow**
1. **Form Validation**: Real-time validation with accessible feedback
2. **Type Selection**: Clear secret type indicators (API Key, OAuth2 Token, etc.)
3. **Value Masking**: Secure input with proper masking
4. **Success Feedback**: Clear success messages with encrypted confirmation

#### **Security Indicators**
- **Encryption Status**: Visual indicators for encrypted storage
- **Type Badges**: Clear type indicators for different secret types
- **Version Information**: Version tracking for secrets

### Secure Secret Retrieval

#### **Access Control**
- **Authentication Required**: Proper redirect to login for unauthenticated access
- **Access Logging**: Audit trail for all access attempts
- **Value Masking**: Encrypted display with "Show Value" functionality

#### **Retrieval UX**
- **Expandable Details**: Click to expand secret details
- **Show Value Button**: Secure value revelation with proper access logging
- **Access Confirmation**: Clear indication of access logging

## Advanced Features

### Rate Limiting

#### **Rate Limit UX**
- **User Feedback**: Clear rate limit messages
- **Retry Information**: Proper retry-after headers and messaging
- **Graceful Degradation**: Proper handling of rate limit responses

#### **Rate Limit Testing**
- **Threshold Testing**: 100 requests per minute limit
- **Error Handling**: 429 status code with proper headers
- **UI Feedback**: Rate limit messages in user interface

### Master Key Rotation

#### **Rotation Flow**
1. **Admin Access**: Proper admin-only access controls
2. **Confirmation Dialog**: Clear confirmation with warning text
3. **Progress Indication**: Loading state during rotation
4. **Success Feedback**: Clear success confirmation

#### **Security Settings**
- **Current Key Display**: Show current master key version
- **Rotation Button**: Accessible rotation button with proper labeling
- **Confirmation Dialog**: Modal dialog with proper ARIA attributes

### API Key Rotation

#### **Automated Rotation**
- **Rotation Settings**: Enable/disable rotation with interval configuration
- **Next Rotation Display**: Show next scheduled rotation date
- **Manual Rotation**: Manual rotation button with proper accessibility

#### **Rotation UX**
- **Settings Display**: Clear display of rotation settings
- **Status Indicators**: Visual indicators for rotation status
- **Manual Controls**: Accessible manual rotation controls

## Admin Security Settings

### Security Dashboard

#### **Master Key Management**
- **Current Status**: Display current master key version
- **Rotation Controls**: Accessible rotation button and controls
- **Security Information**: Clear security status information

#### **Access Controls**
- **Admin-Only Access**: Proper role-based access controls
- **Security Indicators**: Visual security status indicators
- **Configuration Options**: Accessible configuration controls

### Audit Logging

#### **Audit Display**
- **Log Entries**: Clear display of audit log entries
- **Timestamps**: Proper timestamp formatting
- **User Information**: User identification in audit logs
- **Action Details**: Clear action descriptions

#### **Access Tracking**
- **Secret Access**: Log all secret access attempts
- **Creation Events**: Log secret creation events
- **Modification Events**: Log secret modification events
- **Security Events**: Log security-related events

## Testing Requirements

### E2E Test Coverage

#### **UX Compliance Tests**
- **Page Structure**: Heading hierarchy and page structure validation
- **Accessibility**: ARIA attributes and screen reader support
- **Mobile Responsiveness**: Touch interactions and responsive design
- **Form Validation**: Error handling and validation feedback

#### **Security Tests**
- **Encryption**: End-to-end encryption verification
- **Access Control**: Authentication and authorization testing
- **Rate Limiting**: Rate limit enforcement and UX
- **Audit Logging**: Complete audit trail verification

#### **Advanced Feature Tests**
- **Master Key Rotation**: Rotation flow and security
- **API Key Rotation**: Automated and manual rotation
- **Admin Settings**: Security dashboard functionality

### Test Data Requirements

#### **Test Secrets**
- **API Keys**: Test API key creation and management
- **OAuth2 Tokens**: OAuth2 token handling and security
- **Database Credentials**: Database password management
- **Custom Secrets**: Custom secret type handling

#### **Test Scenarios**
- **Rate Limiting**: 100+ rapid requests to test limits
- **Access Control**: Unauthenticated access attempts
- **Security Validation**: XSS and injection attempt testing
- **Mobile Testing**: Mobile viewport and touch interaction testing

## Implementation Guidelines

### Component Requirements

#### **Secret Cards**
```typescript
// Required data-testid attributes
data-testid="secret-card"
data-testid="secret-details-{id}"
data-testid="show-secret-value-{id}"
data-testid="secret-type-{type}"
```

#### **Form Elements**
```typescript
// Required form attributes
data-testid="secret-name-input"
data-testid="secret-description-input"
data-testid="secret-type-select"
data-testid="secret-value-input"
data-testid="submit-secret-btn"
data-testid="validation-errors"
```

#### **Navigation Elements**
```typescript
// Required navigation attributes
data-testid="tab-secrets"
data-testid="tab-audit"
data-testid="tab-admin"
data-testid="primary-action create-secret-btn"
```

### Accessibility Implementation

#### **ARIA Attributes**
```typescript
// Required ARIA attributes
aria-required="true" // Required fields
aria-invalid="true" // Validation errors
aria-label="Rotate master key" // Action buttons
role="alert" // Error messages
role="dialog" // Modal dialogs
```

#### **Keyboard Navigation**
```typescript
// Keyboard navigation support
onKeyDown={handleKeyNavigation}
tabIndex={0} // Focusable elements
onFocus={handleFocus} // Focus management
```

### Mobile Responsiveness

#### **Touch Targets**
```css
/* Minimum touch target size */
button, input, select {
  min-width: 44px;
  min-height: 44px;
}
```

#### **Responsive Design**
```css
/* Mobile-first responsive design */
@media (max-width: 768px) {
  .secret-card {
    flex-direction: column;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
}
```

## Success Criteria

### Accessibility Success
- ✅ All interactive elements accessible via keyboard
- ✅ Screen reader compatibility verified
- ✅ WCAG 2.1 AA compliance achieved
- ✅ Color contrast meets accessibility standards

### Mobile Success
- ✅ Touch-friendly interface on mobile devices
- ✅ Responsive layout adapts to different screen sizes
- ✅ Mobile navigation works correctly
- ✅ Form interactions work on touch devices

### Security Success
- ✅ All secrets encrypted at rest and in transit
- ✅ Access control properly enforced
- ✅ Audit logging captures all security events
- ✅ Rate limiting prevents abuse

### UX Success
- ✅ Clear error messages and validation feedback
- ✅ Loading states provide user feedback
- ✅ Success messages confirm actions
- ✅ Intuitive navigation and interaction patterns

---

**Secrets Vault UX Guide Summary**
- **Accessibility**: Complete WCAG 2.1 AA compliance
- **Mobile**: Full mobile responsiveness and touch support
- **Security**: Comprehensive security UX patterns
- **Advanced Features**: Master key rotation, API key rotation, audit logging
- **Testing**: Extensive E2E test coverage for all features
- **Implementation**: Detailed component and accessibility requirements

*Last Updated: July 2025*
*Document Owner: UX/Design Team* 
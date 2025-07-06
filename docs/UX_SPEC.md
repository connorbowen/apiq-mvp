# APIQ Best-in-Class UX Spec

## 1. Global Principles

- **Clarity**: Every page and action should be self-explanatory for both technical and non-technical users.
- **Activation-First**: All high-traffic and onboarding flows are optimized for conversion and user confidence.
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support.
- **Consistency**: Visual and interaction patterns are uniform across all flows.
- **Feedback**: Every user action provides immediate, clear feedback (success, error, loading).
- **Mobile-Responsive**: All features are fully usable on mobile and tablet.
- **Security-First**: Security features are designed with UX in mind, not as an afterthought.

---

## 2. Core Patterns (Apply to All Flows)

### Headings & Hierarchy
- Each page has a single, clear `<h1>` or `<h2>` describing the main action or state.
- Subheadings and descriptions clarify next steps or benefits.
- **Required**: All pages must have proper heading hierarchy for accessibility.

### Form Fields
- All fields have visible `<label>`s, required indicators, and ARIA attributes.
- Placeholders provide helpful, non-redundant guidance.
- Inputs use correct types (`email`, `password`, etc.) and autocomplete attributes.
- Validation errors are shown inline, in accessible containers, and describe how to fix the issue.
- **Required**: `aria-required="true"` for required fields, `aria-invalid="true"` for validation errors.

### Buttons
- Primary actions use descriptive text (e.g., "Sign in", "Create account", "Connect API").
- Loading states show both a spinner and a text change (e.g., "Signing in…").
- Disabled states are visually distinct and accessible.
- **Required**: Minimum 44px touch targets for mobile accessibility.

### Error & Success Messaging
- All errors are shown in a visually distinct, accessible container (e.g., `.bg-red-50`, `.text-red-800`).
- Success states use `.bg-green-50` and `.text-green-800` or similar.
- Messages are actionable ("Try again", "Check your email", "Contact support").
- **Required**: `role="alert"` for error containers, clear action guidance.

### Navigation & Links
- All pages have clear navigation to home, dashboard, and relevant next steps.
- Onboarding and recovery flows always provide a way back to login/home.
- Links are visually distinct and have hover/focus states.
- **Required**: Tab navigation with `data-testid="tab-{name}"` attributes.

### Visual Separation
- Use dividers, whitespace, and grouping to separate major actions (e.g., OAuth2 vs. email login).
- Use cards or panels for complex forms or multi-step flows.
- **Required**: Clear visual hierarchy and spacing.

### Accessibility
- All interactive elements are reachable by keyboard.
- ARIA roles and labels are used for dynamic content.
- Color contrast meets or exceeds AA standards.
- **Required**: WCAG 2.1 AA compliance for all features.

---

## 3. Flow-Specific UX Requirements

### A. Authentication & Onboarding
- **Login/Registration**: As implemented and tested above.
- **Forgot Password**: 
  - Heading: "Reset your password"
  - Email field with label, required, and placeholder.
  - Button: "Send reset link" with loading state.
  - Success: "Reset Link Sent!" with email shown.
  - Error: "Invalid email" or "User not found" in accessible alert.
  - Navigation: Back to login, resend verification, sign up.
- **Password Reset**:
  - Heading: "Set a new password"
  - Password and confirm fields, required, with strength meter or requirements.
  - Button: "Reset password" with loading state.
  - Success: "Password reset! You can now sign in."
  - Error: "Token invalid or expired", "Passwords do not match", etc.
- **Email Verification**:
  - Heading: "Verify your email"
  - Message: "Check your inbox for a verification link."
  - Button: "Resend verification email" with loading state.
  - Success: "Verification email sent."
  - Error: "Invalid or expired token", "Email not found".

### B. API Connections
- **Connection List**:
  - Heading: "Your API Connections"
  - Button: "Add Connection"
  - Each card shows API name, status, last tested, and quick actions (edit, test, delete).
  - Empty state: "No connections yet. Add your first API."
- **Add/Edit Connection**:
  - Stepper or tabs for: API details, authentication, test connection.
  - All fields labeled, required, with tooltips/help.
  - Test connection button with loading and result feedback.
  - Success: "API connected successfully!"
  - Error: "Invalid credentials", "Connection failed", etc.

### C. Workflow Builder
- **Workflow List**:
  - Heading: "Your Workflows"
  - Button: "Create Workflow"
  - Each card: workflow name, status, last run, quick actions.
  - Empty state: "No workflows yet. Create your first workflow."
- **Create/Edit Workflow**:
  - Heading: "Create Workflow" or "Edit Workflow"
  - Natural language input with suggestions.
  - Visual builder: drag-and-drop steps, reorder, delete.
  - Step configuration: labeled fields, required, with validation.
  - Save/Run buttons with loading and feedback.
  - Success: "Workflow saved!" or "Workflow running…"
  - Error: "Step configuration invalid", "API not connected", etc.

### D. Secrets Vault 🆕
- **Secrets List**:
  - Heading: "Secrets Vault" or "Manage your encrypted API keys, tokens, and sensitive credentials"
  - Button: "Create Secret" with `data-testid="create-secret-btn"`
  - Each card shows secret name, type, description, and masked value.
  - Empty state: "No secrets yet. Add your first encrypted secret."
- **Create/Edit Secret**:
  - Heading: "Create Secret" or "Edit Secret"
  - Form fields: name, description, type, value with proper validation.
  - Type selection: API Key, OAuth2 Token, Database Password, etc.
  - Value masking: Secure input with proper encryption indicators.
  - Success: "Secret created successfully!" with encrypted confirmation.
  - Error: "Name can only contain alphanumeric characters", "Value is required", etc.
- **Secret Management**:
  - Expandable details with `data-testid="secret-details-{id}"`
  - Show value button with `data-testid="show-secret-value-{id}"`
  - Rotation settings and next rotation date display.
  - Access logging and audit trail visibility.

### E. Dashboard & Navigation
- **Dashboard**:
  - Overview cards: "Workflows", "Connections", "Recent Activity", "Secrets"
  - Quick links to add workflow/connection/secret.
  - Health/status indicators.
- **Navigation**:
  - Persistent top or side nav with clear icons and labels.
  - Active state highlighted.
  - Mobile: collapsible menu with `data-testid="mobile-menu-toggle"`.

### F. Admin & Security Settings 🆕
- **Admin Dashboard**:
  - Heading: "Admin Dashboard" or "Security Settings"
  - Master key management with current version display.
  - Rotation controls with confirmation dialogs.
  - Security status indicators and compliance information.
- **Audit Logging**:
  - Heading: "Audit Logs" or "Activity History"
  - Filterable log entries with timestamps and user information.
  - Action details and security event tracking.
  - Export capabilities and compliance reporting.

### G. General
- **Loading States**: Skeletons or spinners for all async content.
- **Empty States**: Friendly, actionable messages for all lists and dashboards.
- **Confirmation Modals**: For destructive actions (delete, disconnect), with clear consequences and cancel/confirm buttons.
- **Tooltips/Help**: For complex fields or actions, always available.

---

## 4. Security UX Patterns 🆕

### Encrypted Data Display
- **Value Masking**: All sensitive values displayed as `••••••••••••••••`
- **Show/Hide Toggle**: Secure value revelation with access logging
- **Type Indicators**: Clear visual indicators for different secret types
- **Encryption Status**: Visual confirmation of encrypted storage

### Access Control UX
- **Authentication Required**: Clear redirect to login for unauthenticated access
- **Permission Indicators**: Visual indicators for user permissions
- **Admin-Only Features**: Clear indication of admin-only functionality
- **Session Management**: Clear session status and timeout warnings

### Security Feedback
- **Access Logging**: Clear indication when actions are logged
- **Rate Limiting**: User-friendly rate limit messages with retry guidance
- **Security Events**: Clear notification of security-related events
- **Compliance Status**: Visual indicators for compliance requirements

---

## 5. Mobile Responsiveness Requirements 🆕

### Touch Interactions
- **Minimum Touch Targets**: 44px × 44px for all interactive elements
- **Touch-Friendly Forms**: Adequate spacing and sizing for touch input
- **Mobile Navigation**: Collapsible menu with proper ARIA attributes
- **Gesture Support**: Swipe gestures for navigation and actions

### Responsive Layout
- **Mobile Viewport**: 375px × 667px minimum support
- **Tablet Viewport**: 768px × 1024px support
- **Desktop Viewport**: 1024px+ support
- **Adaptive Components**: Cards, forms, and navigation adapt to screen size

### Mobile-Specific Patterns
- **Bottom Navigation**: For mobile-first navigation patterns
- **Floating Action Buttons**: For primary actions on mobile
- **Pull-to-Refresh**: For content updates on mobile
- **Offline Indicators**: Clear offline status and functionality

---

## 6. Testing & Validation

### E2E Test Requirements
All E2E and unit tests must assert for:
- Correct headings and labels
- Accessible error/success containers
- Button and link texts
- Loading and disabled states
- Navigation and next-step links
- Keyboard accessibility and ARIA attributes
- Mobile responsiveness and touch interactions
- Security UX patterns and access control

### UX Compliance Testing
- **UXComplianceHelper**: Use the comprehensive UX compliance helper for all tests
- **Accessibility Testing**: WCAG 2.1 AA compliance validation
- **Mobile Testing**: Touch interactions and responsive design validation
- **Security Testing**: Security UX patterns and access control validation

### Test Data Requirements
- **Real Authentication**: No mocking in E2E tests
- **Real API Calls**: Use actual API endpoints and responses
- **Real Test Data**: Use realistic test data instead of hardcoded values
- **Security Testing**: Test actual encryption and access control

---

## 7. Activation & Adoption Metrics

### Track and optimize:
- Time to first connection/workflow/secret
- Completion rates for onboarding flows
- Error rates and user drop-off points
- User feedback on clarity and ease of use
- Security feature adoption and usage
- Mobile usage and engagement

### Success Indicators
- **User Activation**: 70%+ complete onboarding within 5 minutes
- **Feature Adoption**: 60%+ use core features within first week
- **Error Reduction**: <5% error rate on critical flows
- **Mobile Engagement**: 40%+ of usage on mobile devices
- **Security Adoption**: 80%+ enable security features

---

## 8. Implementation Guidelines 🆕

### Component Requirements
```typescript
// Required data-testid attributes for all components
data-testid="create-secret-btn"        // Primary action buttons
data-testid="secret-name-input"        // Form inputs
data-testid="secret-type-select"       // Selection controls
data-testid="submit-secret-btn"        // Submit buttons
data-testid="validation-errors"        // Error containers
data-testid="success-message"          // Success containers
data-testid="loading-spinner"          // Loading indicators
data-testid="tab-secrets"              // Navigation tabs
data-testid="mobile-menu-toggle"       // Mobile navigation
```

### Accessibility Implementation
```typescript
// Required ARIA attributes
aria-required="true"                   // Required fields
aria-invalid="true"                    // Validation errors
aria-label="Rotate master key"         // Action buttons
role="alert"                           // Error messages
role="dialog"                          // Modal dialogs
role="tab"                             // Tab navigation
role="option"                          // Dropdown options
```

### Mobile Responsiveness
```css
/* Minimum touch target size */
button, input, select {
  min-width: 44px;
  min-height: 44px;
}

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

---

## 9. Success Criteria 🆕

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

**This spec is ready to be used for:**
- UI/UX design handoff
- E2E and unit test authoring
- Implementation review and QA
- Security UX validation
- Mobile responsiveness testing
- Accessibility compliance verification

# APIQ UX Specification

This document defines the user experience design principles, patterns, and specifications for the APIQ platform.

## Design Principles

### 1. **Simplicity First**
- Complex workflows should be simple to create
- Natural language interface for workflow creation
- Progressive disclosure of advanced features

### 2. **Transparency**
- Clear visibility into workflow execution
- Real-time status updates
- Comprehensive logging and debugging

### 3. **Reliability**
- Clear error messages and recovery paths
- Automatic retry mechanisms
- Graceful degradation

### 4. **Accessibility**
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility

### 5. **Security-First UX** 🆕
- Security features designed with UX in mind
- Clear security indicators and feedback
- Intuitive access control and permissions

## Core User Flows

### 1. Natural Language Workflow Creation 🆕

#### Flow Overview
1. User navigates to "Create Workflow"
2. User describes desired workflow in natural language
3. System generates workflow and shows preview
4. User reviews and confirms or modifies
5. Workflow is saved and activated

#### Interface Design

**Chat Interface**
- Clean, modern chat UI similar to ChatGPT
- Message bubbles with clear user/system distinction
- Typing indicators during processing
- Message history for context

**Input Area**
- Large text area with placeholder: "Describe your workflow in plain English..."
- Auto-expanding text area
- Send button with loading state
- Character limit indicator (500 chars)

**Workflow Preview**
- Visual workflow diagram showing steps
- Step-by-step explanation
- Data mapping visualization
- Edit buttons for each step

**Confirmation Flow**
- "Create Workflow" button
- "Modify" button to edit
- "Try Again" button to regenerate
- Alternative suggestions

#### Example Interactions

**User Input:**
```
"When a new GitHub issue is created, send a Slack notification to #bugs"
```

**System Response:**
```
I'll create a workflow that monitors your GitHub repository for new issues and sends notifications to your Slack #bugs channel.

**Workflow Steps:**
1. 🔔 GitHub: Monitor for new issues
2. 📱 Slack: Send message to #bugs channel

**Data Mapping:**
- Slack message will include: Issue title, URL, and description

Would you like me to create this workflow?
```

### 2. Secrets Vault Management 🆕

#### Flow Overview
1. User navigates to "Secrets Vault"
2. User creates or manages encrypted secrets
3. System provides secure storage and retrieval
4. User can rotate keys and view audit logs

#### Interface Design

**Secrets List**
- Card-based layout with secret information
- Type indicators (API Key, OAuth2 Token, etc.)
- Masked values with show/hide functionality
- Quick actions (edit, rotate, delete)

**Create Secret Form**
- Clear form with proper validation
- Type selection with descriptions
- Secure value input with masking
- Success feedback with encryption confirmation

**Secret Details**
- Expandable details view
- Show value button with access logging
- Rotation settings and schedule
- Audit trail and access history

#### Security UX Patterns
- **Value Masking**: All sensitive values displayed as `••••••••••••••••`
- **Access Logging**: Clear indication when values are accessed
- **Type Indicators**: Visual badges for different secret types
- **Encryption Status**: Clear confirmation of encrypted storage

### 3. Manual Workflow Builder

#### Flow Overview
1. User selects "Build Manually"
2. User adds trigger step
3. User adds action steps
4. User configures data mapping
5. User tests and saves workflow

#### Interface Design

**Step Builder**
- Drag-and-drop interface
- Visual step cards
- Connection lines between steps
- Step configuration panels

**Step Types**
- **Triggers**: Webhook, Schedule, Manual
- **Actions**: API calls, data transformations
- **Conditions**: If/then logic, filters

**Data Mapping**
- Visual field mapping interface
- Auto-suggestions for available fields
- Template variables support
- Validation feedback

### 4. Workflow Management

#### Dashboard
- Workflow cards with status indicators
- Quick actions (pause, edit, delete)
- Execution history
- Performance metrics

#### Workflow Details
- Step-by-step execution view
- Real-time status updates
- Execution logs
- Error details and recovery options

## Component Specifications

### Navigation

**Primary Navigation**
- Logo (left)
- Dashboard, Workflows, Connections, Secrets, Settings (center)
- User menu (right)

**Secondary Navigation**
- Breadcrumbs for deep navigation
- Tab navigation for related content
- Contextual actions

### Forms

**Input Fields**
- Clear labels and placeholders
- Validation messages below fields
- Success/error states
- Auto-focus on first field

**Buttons**
- Primary actions: Blue (#3B82F6)
- Secondary actions: Gray (#6B7280)
- Destructive actions: Red (#EF4444)
- Loading states with spinners

**Validation**
- Real-time validation
- Clear error messages
- Field-level and form-level errors
- Success confirmations

### Modals and Overlays

**Confirmation Dialogs**
- Clear title and description
- Primary and secondary actions
- Keyboard shortcuts (Esc to cancel)
- Focus management

**Side Panels**
- Slide-in from right
- Close button in top-right
- Backdrop click to close
- Responsive design

### Notifications

**Toast Notifications**
- Auto-dismiss after 5 seconds
- Manual dismiss option
- Success, warning, error types
- Stack multiple notifications

**Status Indicators**
- Green: Success/Active
- Yellow: Warning/Pending
- Red: Error/Failed
- Gray: Inactive/Disabled

## Responsive Design

### Breakpoints
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

### Mobile Considerations
- Touch-friendly button sizes (44px minimum)
- Swipe gestures for navigation
- Collapsible navigation menu
- Optimized form layouts

### Tablet Considerations
- Side-by-side layouts where appropriate
- Touch and mouse interaction support
- Optimized for landscape orientation

## Accessibility

### Keyboard Navigation
- Tab order follows visual layout
- Skip links for main content
- Keyboard shortcuts for common actions
- Focus indicators on all interactive elements

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Live regions for dynamic content
- Alt text for images and icons

### Color and Contrast
- WCAG AA contrast ratios
- Color not used as sole indicator
- High contrast mode support
- Focus indicators visible in all themes

## Performance Guidelines

### Loading States
- Skeleton screens for content loading
- Progress indicators for long operations
- Optimistic UI updates
- Graceful error handling

### Animation and Transitions
- Subtle animations (200-300ms)
- Ease-out timing functions
- Reduced motion support
- Performance-optimized animations

## Error Handling

### User-Friendly Messages
- Clear, actionable error messages
- Suggested solutions when possible
- Technical details in expandable sections
- Consistent error message format

### Recovery Paths
- Retry mechanisms for transient errors
- Alternative actions when possible
- Clear next steps for users
- Support contact information

## Content Guidelines

### Voice and Tone
- Professional but approachable
- Clear and concise
- Helpful and encouraging
- Consistent terminology

### Writing Style
- Use active voice
- Keep sentences short
- Use familiar words
- Provide context when needed

### Localization
- Support for multiple languages
- Cultural considerations
- Right-to-left language support
- Date and number formatting

## Testing and Validation

### Usability Testing
- Regular user testing sessions
- A/B testing for major features
- Analytics and user feedback
- Accessibility audits

### Quality Assurance
- Cross-browser testing
- Mobile device testing
- Performance testing
- Accessibility compliance testing
- Security UX testing 🆕

---

**UX Specification Summary**
- **Core Principles**: Clarity, activation-first, accessibility, consistency, feedback, mobile-responsive, security-first
- **Security UX**: Comprehensive security patterns with UX in mind
- **Mobile Responsiveness**: Touch-friendly design with proper responsive layouts
- **Accessibility**: WCAG 2.1 AA compliance with comprehensive testing
- **Implementation**: Detailed component requirements and guidelines
- **Testing**: Comprehensive UX compliance testing framework

*Last Updated: July 2025*
*Document Owner: UX/Design Team* 
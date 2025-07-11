# UI Pages Documentation

This document describes all the user-facing pages in the APIQ application, their functionality, and user experience flows.

## Authentication Pages

### Signup Flow (`/signup`)

**Purpose**: User registration with email verification

**User Experience**:
1. User fills out registration form (email, name, password)
2. Form validates input (email format, password strength, matching passwords, name validation)
3. Name validation: 2-50 characters, letters, numbers, spaces, hyphens, apostrophes, and periods only
4. On successful registration, user is redirected to `/signup-success?email=...`
5. If registration fails, error message is shown with recovery options

**Features**:
- Client-side validation
- OAuth2 social login options (Google, GitHub, Slack)
- Clear error messages with recovery links
- Redirects to dedicated success page

### Signup Success (`/signup-success`)

**Purpose**: Confirmation page after successful registration

**User Experience**:
1. Shows success message with user's email address
2. Clear next steps (check email, click verification link, automatic sign-in)
3. Option to resend verification email if needed
4. Links to sign in or return home

**Features**:
- Step-by-step instructions
- Resend verification functionality
- Professional success messaging
- Clear call-to-action buttons

### Login (`/login`)

**Purpose**: User authentication

**User Experience**:
1. User enters email and password
2. Form validates input
3. On successful login, user is redirected to dashboard
4. If login fails, error message is shown

**Features**:
- Client-side validation
- OAuth2 social login options
- Links to forgot password and signup
- Clear error messages

### Email Verification (`/verify`)

**Purpose**: Email address verification with automatic sign-in

**User Experience**:
1. User clicks verification link from email
2. Token is validated and user account is activated
3. On success, user is automatically signed in and redirected to dashboard
4. If token is invalid/expired, error message with resend option

**Features**:
- Token validation and account activation
- Automatic authentication upon successful verification
- Direct redirect to dashboard (no additional login required)
- Clear success/error messaging
- Link to resend verification if needed

### Forgot Password (`/forgot-password`)

**Purpose**: Request password reset email

**User Experience**:
1. User enters email address
2. Form validates email format
3. On success, user is redirected to `/forgot-password-success?email=...`
4. If request fails, error message is shown

**Features**:
- Email validation
- Security-conscious messaging (doesn't reveal if email exists)
- Redirects to dedicated success page

### Forgot Password Success (`/forgot-password-success`)

**Purpose**: Confirmation page after password reset request

**User Experience**:
1. Shows confirmation message with user's email
2. Clear next steps (check email, click reset link, sign in)
3. Security note about not revealing email existence
4. Option to try different email

**Features**:
- Step-by-step instructions
- Security messaging
- Professional confirmation design
- Clear call-to-action buttons

### Reset Password (`/reset-password?token=...`)

**Purpose**: Set new password using reset token

**User Experience**:
1. User enters new password and confirmation
2. Form validates password strength and matching
3. On success, user is redirected to login with success message
4. If token is invalid/expired, error message with new request option

**Features**:
- Token validation
- Password strength validation
- Clear success/error messaging
- Link to request new reset if needed

### Resend Verification (`/resend-verification`)

**Purpose**: Request new verification email

**User Experience**:
1. User enters email address
2. Form validates email format
3. On success, confirmation message is shown
4. If request fails, error message is shown

**Features**:
- Email validation
- Clear success/error messaging
- Link back to login

## User Experience Improvements

### Success Pages
- **Dedicated success pages** for major actions (signup, forgot password)
- **Clear next steps** with numbered instructions
- **Professional messaging** that builds confidence
- **Recovery options** for common issues

### Error Handling
- **Specific error messages** for different failure types
- **Recovery links** to help users get back on track
- **Validation feedback** for form inputs
- **Network error handling** with retry options

### Navigation Flow
- **Logical progression** through authentication flows
- **Clear call-to-action buttons** at each step
- **Consistent styling** across all pages
- **Mobile-responsive design** for all screen sizes

### Security Features
- **Client-side validation** to prevent unnecessary server requests
- **Security-conscious messaging** (doesn't reveal user existence)
- **Token-based verification** for sensitive operations
- **Rate limiting** on all authentication endpoints

## Technical Implementation

### Form Validation
- Real-time client-side validation
- Server-side validation for security
- Clear error messaging
- Accessibility features (ARIA labels, keyboard navigation)

### State Management
- Local state for form data
- Loading states for better UX
- Error state handling
- Success state management

### API Integration
- Consistent error handling
- Loading state management
- Retry mechanisms for network failures
- Proper HTTP status code handling

### Responsive Design
- Mobile-first approach
- Consistent spacing and typography
- Accessible color contrast
- Touch-friendly button sizes

## Testing

### Test Coverage
- **Comprehensive Authentication Flow Tests**: 44 tests across 4 test suites
  - Signup page tests (redirect to success page, form validation, error handling)
  - Verify page tests (automatic sign-in, token handling, dashboard redirect)
  - Signup success page tests (resend verification, navigation, user feedback)
  - Forgot password success page tests (security messaging, step-by-step instructions)
- **UX Flow Validation**: Tests accurately reflect improved user experience
- **Error Handling**: Comprehensive testing of failure cases and edge conditions
- **Navigation Testing**: Verification of proper href attributes and link behavior
- **Loading States**: Testing of user feedback during async operations

### Email Mocking
- Tests use mocked email service (`tests/helpers/emailMock.ts`)
- No real SMTP connections in tests
- Email content and recipients are verified in tests
- Mock can be configured to simulate failures

## Styling

### Design System
- Consistent with existing app design
- Uses Tailwind CSS classes
- Responsive design for mobile/desktop
- Accessible color contrast and focus states

### Components
- Form inputs with proper labels
- Error/success message styling
- Loading states and disabled buttons
- Consistent button styling and spacing 
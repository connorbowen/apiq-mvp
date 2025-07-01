# UI Pages Documentation

## Authentication Pages

### Login Page (`/login`)
- **Purpose**: User authentication with email/password and OAuth2 providers
- **Features**: 
  - Email/password login form
  - OAuth2 providers (GitHub, Google, Slack)
  - Links to forgot password and resend verification
  - Sign up link for new users
- **File**: `src/app/login/page.tsx`

### Signup Page (`/signup`)
- **Purpose**: New user registration
- **Features**:
  - Email/password registration form
  - OAuth2 signup options
  - Client-side validation
  - Success/error feedback
- **File**: `src/app/signup/page.tsx`

### Forgot Password Page (`/forgot-password`)
- **Purpose**: Request password reset email
- **Features**:
  - Email input form
  - Sends reset email via API
  - Success/error feedback
  - User-friendly messaging
- **File**: `src/app/forgot-password/page.tsx`
- **API Endpoint**: `POST /api/auth/reset-password`

### Reset Password Page (`/reset-password`)
- **Purpose**: Set new password using reset token
- **Features**:
  - Password and confirm password fields
  - Token validation from URL query
  - Client-side password matching validation
  - Automatic redirect to login on success
- **File**: `src/app/reset-password/page.tsx`
- **API Endpoint**: `POST /api/auth/reset-password`

### Email Verification Page (`/verify`)
- **Purpose**: Verify email address using token
- **Features**:
  - Automatic token processing from URL
  - Success/error feedback
  - Links to resend verification
  - Automatic redirect to login on success
- **File**: `src/app/verify/page.tsx`
- **API Endpoint**: `POST /api/auth/verify`

### Resend Verification Page (`/resend-verification`)
- **Purpose**: Request new verification email
- **Features**:
  - Email input form
  - Sends verification email via API
  - Success/error feedback
  - User-friendly messaging
- **File**: `src/app/resend-verification/page.tsx`
- **API Endpoint**: `POST /api/auth/resend-verification`

## User Experience Flow

### Password Reset Flow
1. User clicks "Forgot password?" on login page
2. User enters email on `/forgot-password`
3. System sends reset email with token
4. User clicks link in email → `/reset-password?token=xxx`
5. User sets new password
6. System redirects to login page

### Email Verification Flow
1. User registers on `/signup`
2. System sends verification email with token
3. User clicks link in email → `/verify?token=xxx`
4. System verifies token and activates account
5. System redirects to login page

### Resend Verification Flow
1. User clicks "Resend verification email?" on login page
2. User enters email on `/resend-verification`
3. System sends new verification email
4. User follows verification flow

## Error Handling

### Common Error Scenarios
- **Invalid/Expired Token**: Show error with link to request new token
- **Email Not Found**: Show generic success message (security)
- **Network Errors**: User-friendly error messages
- **Validation Errors**: Clear feedback on form fields

### Error Recovery
- **Reset Password**: Link to `/forgot-password` for new request
- **Email Verification**: Link to `/resend-verification` for new email
- **Login Issues**: Links to relevant recovery pages

## Security Features

### Token Security
- Tokens are cryptographically secure (32 bytes random)
- Tokens expire after 24 hours (verification) or 1 hour (reset)
- Tokens are single-use and deleted after use
- Invalid tokens are handled gracefully

### User Privacy
- Email existence is not revealed in error messages
- Generic success messages for security
- No sensitive data in URLs or logs

### Form Security
- Client-side validation for immediate feedback
- Server-side validation for security
- CSRF protection via Next.js
- Rate limiting on API endpoints

## Testing

### Email Mocking
- Tests use mocked email service (`tests/helpers/emailMock.ts`)
- No real SMTP connections in tests
- Email content and recipients are verified in tests
- Mock can be configured to simulate failures

### Test Coverage
- All authentication flows are tested
- Error scenarios are covered
- UI interactions are tested
- API integration is verified

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
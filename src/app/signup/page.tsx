/**
 * TODO: UX SIMPLIFICATION - SIGNUP PAGE PHASE 2.3 CHANGES - @connorbowen 2024-12-19
 * 
 * PHASE 2.3: Streamline onboarding flow
 * - [ ] Simplify form to email + password only (remove name requirement)
 * - [ ] Make email verification optional (don't block access)
 * - [ ] Redirect directly to Chat interface after successful registration
 * - [ ] Remove complex validation for faster signup
 * - [ ] Add tests: tests/e2e/auth/authentication-session.test.ts - test streamlined signup
 * - [ ] Add tests: tests/integration/api/auth/auth-flow.test.ts - test simplified registration
 * - [ ] Add tests: tests/unit/app/signup/page.test.tsx - test simplified form validation
 * 
 * PHASE 2.4: Guided tour integration
 * - [ ] Add welcome message after successful signup
 * - [ ] Redirect to guided tour instead of dashboard
 * - [ ] Add tests: tests/e2e/onboarding/user-journey.test.ts - test signup to tour flow
 * 
 * IMPLEMENTATION NOTES:
 * - Remove name field validation complexity
 * - Simplify password requirements
 * - Make email verification non-blocking
 * - Update success redirect to /dashboard?tab=chat
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../lib/api/client';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: ''
  });
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'name is required';
        if (value.trim().length < 2) return 'Full name must be at least 2 characters';
        // Validate name format - allow letters, numbers, spaces, basic punctuation
            const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s\-'.]{2,50}$/;
    if (!nameRegex.test(value.trim())) return 'Name contains invalid characters';
        return '';
      case 'email':
        if (!value.trim()) return 'email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'password is required';
        if (value.length < 8) return 'password must be at least 8 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    
    // Clear field error when user starts typing
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors({ ...fieldErrors, [name]: '' });
    }
    
    // Clear general error when user makes changes
    if (error) {
      setError('');
    }
  };

  const handleBlur = (name: string) => {
    const value = formData[name as keyof typeof formData];
    const fieldError = validateField(name, value);
    if (fieldError) {
      setFieldErrors({ ...fieldErrors, [name]: fieldError });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setFieldErrors({});

    // Validate all fields
    const errors: FieldErrors = {};
    Object.keys(formData).forEach(key => {
      const fieldError = validateField(key, formData[key as keyof typeof formData]);
      if (fieldError) {
        errors[key as keyof FieldErrors] = fieldError;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.register(formData.email, formData.name, formData.password);

      if (response.success) {
        setTimeout(() => {
          router.push(`/signup-success?email=${encodeURIComponent(formData.email)}`);
        }, 150); // Small delay to guarantee Playwright sees disabled state
      } else {
        if (response.error?.toLowerCase().includes('already exists') || 
            response.error?.toLowerCase().includes('already registered')) {
          setError('A user with this email already exists. Please sign in instead.');
        } else {
          setError(response.error || 'Registration failed. Please try again.');
        }
        setIsSubmitting(false);
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  const handleOAuth2Signup = (provider: string) => {
    // Redirect to OAuth2 provider for signup
            window.location.href = `/api/auth/sso/google?provider=${provider}&action=signup`;
  };

  const hasErrors = error || Object.values(fieldErrors).some(err => err);
  const allErrorMessages = [
    error,
    ...Object.values(fieldErrors).filter(err => err)
  ].filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your APIQ account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start orchestrating APIs with natural language
          </p>
        </div>

        {/* OAuth2 Signup Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth2Signup('google')}
            aria-label="Continue with Google"
            aria-describedby="oauth2-signup-description"
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <div id="oauth2-signup-description" className="sr-only">Sign up using your Google account</div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">Or continue with email</span>
          </div>
        </div>

        {/* Error Messages - Single accessible container for all errors */}
        {hasErrors && (
          <div className="rounded-md bg-red-50 p-4" role="alert" aria-live="polite">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <div data-testid="registration-error" className="text-sm font-medium text-red-800">
                  {allErrorMessages.map((message, index) => (
                    <div key={index}>{message}</div>
                  ))}
                </div>
                {error.toLowerCase().includes('verify') && (
                  <div className="mt-2">
                    <Link href="/resend-verification" className="text-indigo-600 hover:text-indigo-500 underline text-sm">
                      Resend verification email
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full name <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                aria-required="true"
                aria-invalid={fieldErrors.name ? 'true' : 'false'}
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  fieldErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                aria-describedby="password-requirements"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Create a strong password"
              />
              <div id="password-requirements" className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters with uppercase, lowercase, and number
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm password <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={fieldErrors.confirmPassword ? 'true' : 'false'}
                value={formData.confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <div>
            <button
              data-testid="primary-action signup-btn"
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] primary-action"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center space-y-2">
            <div>
              <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500">
                Back to home
              </Link>
            </div>
            <div>
              <span className="text-sm text-gray-600">Already have an account? </span>
              <Link href="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../lib/api/client';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams?.get('reason');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.login(formData.email, formData.password);

      if (response.success && response.data) {
        // Store tokens in localStorage (in production, use httpOnly cookies)
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(response.error || 'Login failed');
        // Clear password for security
        setFormData({ ...formData, password: '' });
      }
    } catch (error) {
      setError('Network error. Please try again.');
      // Clear password for security
      setFormData({ ...formData, password: '' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth2Login = async (provider: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Initiate OAuth2 flow
      const response = await fetch(`/api/auth/oauth2?provider=${provider}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.redirectUrl) {
          // Redirect to OAuth2 provider
          window.location.href = data.data.redirectUrl;
        } else {
          setError('Failed to initiate OAuth2 flow');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'OAuth2 login failed');
      }
    } catch (error) {
      setError('OAuth2 login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100">
            <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to APIQ
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Multi-API Orchestrator
          </p>
        </div>

        {/* Auth redirect alert */}
        {reason === 'auth' && (
          <div
            role="alert"
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800"
            data-testid="auth-redirect-alert"
          >
            You must sign in to access that page.
          </div>
        )}

        {/* OAuth2 Providers */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuth2Login('google')}
            disabled={isLoading}
            // TODO: Add ARIA attributes for OAuth2 button accessibility
            // aria-label="Continue with Google"
            // aria-describedby="oauth2-description"
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div 
              className="rounded-md bg-red-50 p-4"
              // TODO: Add role="alert" for accessibility compliance
              // role="alert"
              // aria-live="polite"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                // TODO: Add ARIA attributes for form field accessibility
                // aria-required="true"
                // aria-invalid={error ? "true" : "false"}
                // aria-describedby={error ? "email-error" : undefined}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                // TODO: Add ARIA attributes for password field accessibility
                // aria-required="true"
                // aria-invalid={error ? "true" : "false"}
                // aria-describedby={error ? "password-error" : undefined}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
            <div className="flex justify-between text-sm">
              <Link href="/forgot-password" className="text-indigo-600 hover:text-indigo-500">Forgot password?</Link>
              <Link href="/resend-verification" className="text-indigo-600 hover:text-indigo-500">Resend verification email?</Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              // TODO: Fix primary action data-testid pattern to use combined pattern
              // Change from: data-testid="primary-action signin-submit"
              // To: data-testid="primary-action signin-btn"
              data-testid="primary-action signin-submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center space-y-2">
            <div>
              <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500">
                Back to home
              </Link>
            </div>
            <div>
              <span className="text-sm text-gray-600">Don&apos;t have an account? </span>
              <Link href="/signup" className="text-sm text-indigo-600 hover:text-indigo-500">
                Sign up
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 
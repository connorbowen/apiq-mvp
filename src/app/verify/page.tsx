'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../lib/api/client';

export default function VerifyPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const verifyEmail = useCallback(async (token: string) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.verifyEmail(token);

      if (response.success && response.data) {
        // Store authentication tokens
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Check user onboarding state to determine redirect destination
        const user = response.data.user;
        const onboardingStage = user.onboardingStage;
        
        if (onboardingStage === 'NEW_USER' || onboardingStage === null) {
          // New user - show welcome message and redirect to guided tour
          setWelcomeMessage('Welcome to APIQ! Your email has been verified. Let\'s get you started with a quick tour.');
          setSuccess('Email verified successfully!');
          setIsVerifying(false);
          
          // Redirect to guided tour after 2 seconds
          setTimeout(() => {
            router.push('/dashboard?tour=true');
          }, 2000);
        } else {
          // Returning user - redirect directly to Chat interface
          setSuccess('Email verified successfully! Welcome back to APIQ!');
          setIsVerifying(false);
          
          // Redirect directly to Chat interface after 1 second
          setTimeout(() => {
            router.push('/dashboard?tab=chat');
          }, 1000);
        }
      } else {
        setError(response.error || 'Email verification failed. Please try again.');
        setIsVerifying(false);
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
      setIsVerifying(false);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = searchParams?.get('token');
    if (token) {
      verifyEmail(token);
    } else {
      setIsVerifying(false);
      setError('No verification token provided');
    }
  }, [searchParams, verifyEmail]);

  const resendVerification = async () => {
    // This would need to be implemented with a form to collect email
    setError('Please use the resend verification link from your email or contact support.');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Verifying your email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" aria-label="Loading verification"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Verify your email address to complete your registration
          </p>
          {welcomeMessage && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">{welcomeMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Message */}
        {success && (
          <div 
            className="rounded-md bg-green-50 p-4" 
            role="alert"
            aria-live="polite"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
                <p className="mt-1 text-sm text-green-700">
                  {welcomeMessage ? 'Redirecting to guided tour...' : 'Redirecting to dashboard...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div 
            className="rounded-md bg-red-50 p-4" 
            role="alert"
            aria-live="assertive"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p data-testid="verify-error" className="text-sm font-medium text-red-800">{error === 'No verification token provided' ? 'No verification token provided' : 'Email verification failed'}</p>
                <p className="mt-1 text-sm text-red-700">
                  The verification link may be invalid or expired.{' '}
                  <Link href="/resend-verification" className="text-indigo-600 hover:text-indigo-500 underline transition-colors duration-200">
                    Resend verification email
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Didn&apos;t receive the verification email?{' '}
              <Link
                href="/resend-verification"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
              >
                Resend verification email
              </Link>
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push('/dashboard?tab=chat')}
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
            >
              Continue without verification
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
            >
              Back to sign in
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
            >
              Create a new account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
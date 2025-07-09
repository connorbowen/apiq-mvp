"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const router = useRouter();

  const validateEmail = (email: string) => {
    if (!email || email.trim() === "") {
      return "Email is required";
    }
    // More comprehensive email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("");
    }
  };

  const handleEmailBlur = () => {
    // Validate on blur for immediate feedback
    const emailError = validateEmail(email);
    if (emailError) {
      setValidationError(emailError);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Trigger validation on Enter key press for empty field
    if (e.key === 'Enter' && (!email || email.trim() === "")) {
      e.preventDefault();
      const emailError = validateEmail(email);
      if (emailError) {
        setValidationError(emailError);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🔍 [FORGOT-PASSWORD] Form submit triggered');
    e.preventDefault();
    
    // Set loading state immediately to prevent multiple submissions
    if (isLoading) {
      console.log('🔍 [FORGOT-PASSWORD] Already loading, preventing duplicate submission');
      return;
    }
    
    console.log('🔍 [FORGOT-PASSWORD] Form submit prevented, setting loading state');
    setIsLoading(true);
    setError("");
    setValidationError("");
    
    // Client-side validation
    const emailError = validateEmail(email);
    if (emailError) {
      setValidationError(emailError);
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔍 [FORGOT-PASSWORD] Submitting email:', email);
      const response = await apiClient.requestPasswordReset(email);
      console.log('🔍 [FORGOT-PASSWORD] API response:', response);
      
      if (response && response.success) {
        console.log('🔍 [FORGOT-PASSWORD] Success! Navigating to success page...');
        // Keep loading state true during navigation to prevent button re-enabling
        await router.replace(`/forgot-password-success?email=${encodeURIComponent(email)}`);
        return; // Stop here to prevent finally block from running
      }
      
      console.log('🔍 [FORGOT-PASSWORD] API returned error:', response?.error);
      // Handle error response from API - including rate limiting
      if (response?.code === 'RATE_LIMIT_EXCEEDED') {
        setError('Too many password reset requests. Please try again later.');
      } else {
        setError(response?.error || 'Unexpected response.');
      }
    } catch (err: any) {
      console.log('🔍 [FORGOT-PASSWORD] Exception caught:', err);
      setError(err?.response?.data?.message ?? err.message ?? 'Password reset failed.');
    } finally {
      // Only reset loading state if we're still on this page (not on successful navigation)
      // Check if we're still on the forgot password page
      if (window.location.pathname === '/forgot-password') {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Forgot your password?</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Enter your email to receive a password reset link.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} role="form" data-testid="forgot-password-form">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-red-800" role="alert" data-testid="alert-error">
              {error}
            </div>
          )}
          {validationError && (
            <div className="rounded-md bg-red-50 p-4 text-red-800" role="alert" data-testid="alert-validation-error">
              {validationError}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              onKeyDown={handleKeyDown}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your email"
            />
          </div>
          {/* TODO: Fix primary action data-testid pattern to match UX compliance requirements */}
          {/* Current: button[type="submit"] */}
          {/* Required: data-testid="primary-action send-reset-link-btn" */}
          <button
            type="submit"
            disabled={isLoading}
            data-testid="primary-action send-reset-link-btn"
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
          {/* Debug info */}
          <div data-testid="debug-info" style={{display: 'none'}}>
            Loading: {isLoading.toString()}
          </div>
        </form>
      </div>
    </div>
  );
} 
"use client";
import { useState } from "react";
import Link from "next/link";
import { apiClient } from "../../lib/api/client";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  const validateEmail = (email: string): string => {
    if (!email.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Clear errors when user starts typing
    if (fieldError) setFieldError("");
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleBlur = () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldError(emailError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess("");
    setError("");
    setFieldError("");

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldError(emailError);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.resendVerification(email);
      if (response.success) {
        setSuccess("If an account with this email exists, a verification email has been sent. Please check your inbox and spam folder.");
      } else {
        setError(response.error || "Failed to send verification email. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasErrors = error || fieldError;
  const allErrorMessages = [error, fieldError].filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Resend verification email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email to receive a new verification link
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div 
            className="rounded-md bg-green-50 p-4" 
            role="alert"
            // TODO: Add aria-live for dynamic content accessibility
            // aria-live="polite"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Messages - Single accessible container for all errors */}
        {hasErrors && (
          <div 
            className="rounded-md bg-red-50 p-4" 
            role="alert"
            // TODO: Add aria-live for dynamic content accessibility
            // aria-live="assertive"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <div data-testid="resend-error" className="text-sm font-medium text-red-800">
                  {allErrorMessages.map((message, index) => (
                    <div key={index}>{message}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
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
              aria-invalid={fieldError ? 'true' : 'false'}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleBlur}
              className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                fieldError ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your email address"
            />
          </div>

          <button
            data-testid="primary-action resend-verification-btn"
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Resend verification email"}
          </button>

          <div className="text-center space-y-2">
            <div>
              <Link href="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
                Back to sign in
              </Link>
            </div>
            <div>
              <Link href="/signup" className="text-sm text-indigo-600 hover:text-indigo-500">
                Create a new account
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 
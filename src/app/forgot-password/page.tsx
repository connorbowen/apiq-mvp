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
    e.preventDefault();
    setError("");
    setValidationError("");
    
    // Client-side validation
    const emailError = validateEmail(email);
    if (emailError) {
      setValidationError(emailError);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.requestPasswordReset(email);
      if (response.success) {
        // Redirect to success page with email parameter
        router.push(`/forgot-password-success?email=${encodeURIComponent(email)}`);
      } else {
        setError(response.error || "Failed to send reset email");
        setIsLoading(false);
      }
    } catch (error) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Forgot your password?</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Enter your email to receive a password reset link.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} role="form">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-red-800" role="alert">
              {error}
            </div>
          )}
          {validationError && (
            <div className="rounded-md bg-red-50 p-4 text-red-800" role="alert">
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
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
} 
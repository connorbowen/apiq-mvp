"use client";
import { useState } from "react";
import { apiClient } from "../../lib/api/client";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess("");
    setError("");
    try {
      const response = await apiClient.resendVerification(email);
      if (response.success) {
        setSuccess("If an account with this email exists, a verification email has been sent.");
      } else {
        setError(response.error || "Failed to send verification email");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Resend verification email</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Enter your email to receive a new verification link.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {success && <div className="rounded-md bg-green-50 p-4 text-green-800">{success}</div>}
          {error && <div className="rounded-md bg-red-50 p-4 text-red-800">{error}</div>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your email"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Resend Verification"}
          </button>
        </form>
      </div>
    </div>
  );
} 
"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "../../lib/api/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  useEffect(() => {
    if (!token) setError("Missing or invalid reset token.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess("");
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await apiClient.resetPassword(token, password);
      if (response.success) {
        setSuccess("Password reset successful! You can now log in.");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setError(response.error || "Failed to reset password");
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
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Reset your password</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Enter your new password below.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {success && <div className="rounded-md bg-green-50 p-4 text-green-800">{success}</div>}
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-red-800">
              {error}
              <div className="mt-2">
                <a href="/forgot-password" className="text-indigo-600 hover:text-indigo-500 underline text-sm">Request a new password reset</a>
              </div>
            </div>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Confirm new password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
} 
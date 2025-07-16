'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChangeFormProps {
  onPasswordChanged?: () => void;
}

export default function PasswordChangeForm({ onPasswordChanged }: PasswordChangeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PasswordChangeData>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: PasswordChangeData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (response.ok) {
        toast.success('Password changed successfully');
        reset();
        setShowForm(false);
        onPasswordChanged?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Password Change Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Password</h3>
          <p className="text-sm text-gray-600">Change your account password.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Change Password
          </button>
        )}
      </div>

      {/* Password Change Form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  {...register('currentPassword', { required: 'Current password is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters long',
                    },
                    maxLength: {
                      value: 128,
                      message: 'Password must be less than 128 characters',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
                    },
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Password must be at least 8 characters long and contain uppercase, lowercase, and number.
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  {...register('confirmPassword', {
                    required: 'Please confirm your new password',
                    validate: (value) => value === newPassword || 'Passwords do not match',
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  At least 8 characters long
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  Contains at least one uppercase letter
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  Contains at least one lowercase letter
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  Contains at least one number
                </li>
              </ul>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
} 
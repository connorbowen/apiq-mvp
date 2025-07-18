'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';

interface ProfileData {
  firstName?: string;
  lastName?: string;
  timezone?: string;
  language?: string;
  notificationsEnabled?: boolean;
  marketingEmailsEnabled?: boolean;
}

interface ProfileTabProps {
  user: any;
  onProfileUpdated?: () => void;
}

export default function ProfileTab({ user, onProfileUpdated }: ProfileTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  // Add error handling for react-hook-form
  let useFormHook: typeof useForm;
  try {
    useFormHook = useForm;
  } catch (error) {
    console.error('Failed to load react-hook-form:', error);
    // Fallback to basic form handling
    return (
      <div data-testid="profile-tab" className="space-y-6">
        <div data-testid="profile-sentinel" />
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Settings</h3>
          <p className="text-sm text-gray-600">Profile form is loading...</p>
        </div>
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useFormHook<ProfileData>();

  const watchedNotifications = watch('notificationsEnabled');
  const watchedMarketing = watch('marketingEmailsEnabled');

  useEffect(() => {
    if (user) {
      setProfile(user);
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        timezone: user.timezone || 'UTC',
        language: user.language || 'en',
        notificationsEnabled: user.notificationsEnabled ?? true,
        marketingEmailsEnabled: user.marketingEmailsEnabled ?? false,
      });
    }
  }, [user, reset]);

  // Always render the basic structure, even if there are errors
  console.log('🔍 ProfileTab: Rendering with user data:', {
    hasUser: !!user,
    email: user?.email,
    emailVerified: user?.emailVerified,
    role: user?.role
  });
  
  // If no user data is available, show a loading state
  if (!user) {
    return (
      <div data-testid="profile-tab" className="space-y-6">
        <div data-testid="profile-sentinel" />
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center text-gray-500">
            <p>Loading profile information...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // For testing purposes, if we have an email but no emailVerified field,
  // assume the user is not verified (which is the default for new users)
  const isEmailVerified = user.emailVerified === true;
  
  return (
    <div data-testid="profile-tab" className="space-y-6">
      {/* Temporary sentinel to confirm component execution */}
      <div data-testid="profile-sentinel" />
      
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Settings</h3>
          <p className="text-sm text-gray-600">Manage your account information and preferences.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Show user info if available */}
      {user && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="mt-1">
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                />
              </div>
              {/* Email Verification Status */}
              <div className="mt-2">
                {(user?.emailVerified === true) ? (
                  <div className="flex items-center text-sm text-green-600">
                    <span className="mr-1">✓</span>
                    <span>Email verified</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-yellow-600">
                      <span className="mr-1">⚠</span>
                      <span>Email not verified</span>
                    </div>
                    <button
                      onClick={async () => {
                        setIsResendingVerification(true);
                        try {
                          const response = await fetch('/api/auth/resend-verification', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ email: user.email }),
                          });
                          
                          if (response.ok) {
                            toast.success('Verification email sent!');
                          } else {
                            toast.error('Failed to send verification email');
                          }
                        } catch (error) {
                          toast.error('Failed to send verification email');
                        } finally {
                          setIsResendingVerification(false);
                        }
                      }}
                      disabled={isResendingVerification}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isResendingVerification ? 'Sending...' : 'Verify your email'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <div className="mt-1">
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Fallback for when user data is not available */}
      {!user && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center text-gray-500">
            <p>Loading profile information...</p>
          </div>
        </div>
      )}
    </div>
  );
} 
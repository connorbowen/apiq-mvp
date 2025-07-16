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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProfileData>();

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

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        reset({
          firstName: data.profile.firstName || '',
          lastName: data.profile.lastName || '',
          timezone: data.profile.timezone || 'UTC',
          language: data.profile.language || 'en',
          notificationsEnabled: data.profile.notificationsEnabled ?? true,
          marketingEmailsEnabled: data.profile.marketingEmailsEnabled ?? false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile data');
    }
  };

  const onSubmit = async (data: ProfileData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        setProfile(result.profile);
        setIsEditing(false);
        toast.success('Profile updated successfully');
        onProfileUpdated?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      timezone: profile?.timezone || 'UTC',
      language: profile?.language || 'en',
      notificationsEnabled: profile?.notificationsEnabled ?? true,
      marketingEmailsEnabled: profile?.marketingEmailsEnabled ?? false,
    });
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  {...register('firstName', { maxLength: 50 })}
                  disabled={!isEditing}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  {...register('lastName', { maxLength: 50 })}
                  disabled={!isEditing}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={profile.email}
                disabled
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                {profile.emailVerified ? (
                  <span className="text-green-600">✓ Email verified</span>
                ) : (
                  <span className="text-yellow-600">⚠ Email not verified</span>
                )}
              </p>
            </div>
          </div>

          {/* Preferences */}
          <div className="mt-8 space-y-4">
            <h4 className="text-md font-medium text-gray-900">Preferences</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <select
                  id="timezone"
                  {...register('timezone')}
                  disabled={!isEditing}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Australia/Sydney">Sydney</option>
                </select>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                  Language
                </label>
                <select
                  id="language"
                  {...register('language')}
                  disabled={!isEditing}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notificationsEnabled"
                  {...register('notificationsEnabled')}
                  disabled={!isEditing}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notificationsEnabled" className="ml-2 block text-sm text-gray-900">
                  Enable notifications
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="marketingEmailsEnabled"
                  {...register('marketingEmailsEnabled')}
                  disabled={!isEditing}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="marketingEmailsEnabled" className="ml-2 block text-sm text-gray-900">
                  Receive marketing emails
                </label>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="mt-8 space-y-4">
            <h4 className="text-md font-medium text-gray-900">Account Information</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Type</label>
                <input
                  type="text"
                  value={profile.provider === 'credentials' ? 'Email/Password' : profile.provider || 'Email/Password'}
                  disabled
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Member Since</label>
                <input
                  type="text"
                  value={new Date(profile.createdAt).toLocaleDateString()}
                  disabled
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                />
              </div>
            </div>

            {profile.lastLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Login</label>
                <input
                  type="text"
                  value={new Date(profile.lastLogin).toLocaleString()}
                  disabled
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        {isEditing && (
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
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
} 
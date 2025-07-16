'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api/client';

interface WorkflowShare {
  id: string;
  email: string;
  userId: string;
  permission: 'VIEW' | 'EDIT' | 'OWNER';
}

interface WorkflowShareModalProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkflowShareModal({ workflowId, isOpen, onClose }: WorkflowShareModalProps) {
  const [shares, setShares] = useState<WorkflowShare[]>([]);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'EDIT' | 'OWNER'>('VIEW');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadShares = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/share`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setShares(data.shares);
      }
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  }, [workflowId]);

  useEffect(() => {
    if (isOpen) {
      loadShares();
    }
  }, [isOpen, loadShares]);

  const addShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/workflows/${workflowId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), permission }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('User added successfully');
        setEmail('');
        setPermission('VIEW');
        loadShares();
      } else {
        setError(data.error || 'Failed to add user');
      }
    } catch (error) {
      setError('Failed to add user');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermission = async (email: string, newPermission: 'VIEW' | 'EDIT' | 'OWNER') => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, permission: newPermission }),
      });

      const data = await response.json();
      if (data.success) {
        loadShares();
      } else {
        setError(data.error || 'Failed to update permission');
      }
    } catch (error) {
      setError('Failed to update permission');
    }
  };

  const removeShare = async (email: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (data.success) {
        loadShares();
      } else {
        setError(data.error || 'Failed to remove user');
      }
    } catch (error) {
      setError('Failed to remove user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Share Workflow</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Add new user form */}
          <form onSubmit={addShare} className="mb-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Team Member Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="teammate@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="permission" className="block text-sm font-medium text-gray-700">
                  Permissions
                </label>
                <select
                  id="permission"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as 'VIEW' | 'EDIT' | 'OWNER')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="VIEW">View access</option>
                  <option value="EDIT">Edit access</option>
                  <option value="OWNER">Owner access</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                data-testid="primary-action add-member-btn"
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>

          {/* Error/Success messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Current collaborators */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Current Collaborators</h4>
            {shares.length === 0 ? (
              <p className="text-sm text-gray-500">No collaborators yet</p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{share.email}</p>
                      <p className="text-xs text-gray-500">{share.permission} access</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={share.permission}
                        onChange={(e) => updatePermission(share.email, e.target.value as 'VIEW' | 'EDIT' | 'OWNER')}
                        className="text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="VIEW">View</option>
                        <option value="EDIT">Edit</option>
                        <option value="OWNER">Owner</option>
                      </select>
                      <button
                        onClick={() => removeShare(share.email)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
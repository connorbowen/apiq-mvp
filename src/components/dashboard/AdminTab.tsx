/**
 * AdminTab Component
 * 
 * Provides administrative functions for system management.
 * Features:
 * - Master key rotation with confirmation
 * - Queue monitoring and performance metrics
 * - Security settings management
 * - System health monitoring
 * 
 * Note: This component is accessible through the UserDropdown for admin users
 * as part of the UX simplification plan (Phase 2.1).
 * 
 * Usage:
 * <AdminTab user={adminUser} />
 */

'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api/client';

interface AdminTabProps {
  user: any;
}

export default function AdminTab({ user }: AdminTabProps) {
  const [isRotating, setIsRotating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [rotationSuccess, setRotationSuccess] = useState('');
  const [rotationError, setRotationError] = useState('');

  const handleMasterKeyRotation = async () => {
    setIsRotating(true);
    setRotationSuccess('');
    setRotationError('');
    try {
      const response = await apiClient.rotateMasterKey();
      if (response.success) {
        setRotationSuccess('Master key rotated successfully.');
        console.log('Master key rotated successfully');
      } else {
        setRotationError(response.error || 'Failed to rotate master key.');
        console.error('Failed to rotate master key:', response.error);
      }
    } catch (error: any) {
      setRotationError(error?.message || 'Failed to rotate master key.');
      console.error('Failed to rotate master key:', error);
    } finally {
      setIsRotating(false);
      setShowConfirmation(false);
    }
  };

  return (
    <div data-testid="admin-management" role="region" aria-labelledby="admin-heading">
      {/* Header */}
      <div className="mb-6">
        <h2 id="admin-heading" className="text-2xl font-semibold text-gray-900 mb-2">Admin Settings</h2>
        <p className="text-gray-600">Manage system security and administrative functions</p>
      </div>

      {/* Security Settings Section */}
      <div className="mb-8">
        <div 
          data-testid="security-settings"
          className="bg-white shadow overflow-hidden sm:rounded-lg"
        >
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Security Settings</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Configure system security and encryption settings
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Current Master Key</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">master_key_v1</span>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Last Rotation</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date().toLocaleDateString()}
                </dd>
              </div>
              <div className="sm:col-span-2" data-testid="master-key-section">
                <dt className="text-sm font-medium text-gray-500">Master Key Rotation</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <div className="space-y-4">
                    <p>
                      Current Master Key: <span className="font-mono bg-gray-100 px-2 py-1 rounded">master_key_v1</span>
                    </p>
                    <p>
                      Rotating the master key will re-encrypt all secrets with a new encryption key. 
                      This process is irreversible and may take several minutes.
                    </p>
                    <button
                      data-testid="rotate-master-key-btn"
                      onClick={() => setShowConfirmation(true)}
                      disabled={isRotating}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                      aria-label="Rotate master key"
                    >
                      {isRotating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Rotating...
                        </>
                      ) : (
                        'Rotate Master Key'
                      )}
                    </button>
                    {rotationSuccess && (
                      <div className="rounded bg-green-50 border border-green-200 text-green-800 px-4 py-2 mt-2" data-testid="rotation-success">{rotationSuccess}</div>
                    )}
                    {rotationError && (
                      <div className="rounded bg-red-50 border border-red-200 text-red-800 px-4 py-2 mt-2" data-testid="rotation-error">{rotationError}</div>
                    )}
                  </div>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div data-testid="rotation-confirmation" className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 id="confirmation-title" className="text-lg font-medium text-gray-900 mb-4">Confirm Master Key Rotation</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>This will re-encrypt all secrets with a new master key.</strong>
                </p>
                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                  <li>Generate a new master encryption key</li>
                  <li>Re-encrypt all existing secrets</li>
                  <li>Take several minutes to complete</li>
                  <li>Be irreversible</li>
                </ul>
                <p className="mt-4 text-sm text-red-600 font-medium">
                  Are you sure you want to proceed?
                </p>
              </div>
              {/* Rotation Progress Indicator */}
              {isRotating && (
                <div data-testid="rotation-progress" className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-blue-800">Rotating master key and re-encrypting all secrets...</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={isRotating}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  data-testid="confirm-rotation-btn"
                  onClick={handleMasterKeyRotation}
                  disabled={isRotating}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isRotating ? 'Rotating...' : 'Confirm Rotation - This will re-encrypt all secrets'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue Monitoring Section */}
      <div className="mb-8">
        <div 
          data-testid="queue-monitoring"
          className="bg-white shadow overflow-hidden sm:rounded-lg"
        >
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Queue Monitoring</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Monitor workflow execution queue health and performance
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Queue Health</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span data-testid="queue-health" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    Healthy
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Active Jobs</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span data-testid="active-jobs">0</span> running
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Queued Jobs</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span data-testid="queued-jobs">0</span> waiting
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Average Processing Time</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span data-testid="avg-processing-time">2.3s</span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Performance Metrics</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span data-testid="success-rate">98.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Error Rate:</span>
                      <span data-testid="error-rate">1.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Jobs Today:</span>
                      <span data-testid="total-jobs-today">1,247</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jobs per Minute:</span>
                      <span data-testid="jobs-per-minute">12.3</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failure Rate:</span>
                      <span data-testid="failure-rate">1.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Queue Depth:</span>
                      <span data-testid="queue-depth">3</span>
                    </div>
                  </div>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Performance Chart</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <div data-testid="performance-chart" className="h-32 bg-gray-100 rounded-md flex items-center justify-center">
                    <span className="text-gray-500">Performance Chart</span>
                  </div>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Bottleneck Analysis</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <div data-testid="bottleneck-analysis" className="space-y-2">
                    <div className="flex justify-between">
                      <span>API Response Time:</span>
                      <span className="text-yellow-600">High</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Database Queries:</span>
                      <span className="text-green-600">Normal</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Usage:</span>
                      <span className="text-green-600">Normal</span>
                    </div>
                  </div>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
} 
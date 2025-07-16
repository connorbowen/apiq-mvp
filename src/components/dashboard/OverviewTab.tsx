'use client';

/**
 * @deprecated OverviewTab Component - DEPRECATED
 * 
 * This component has been deprecated as part of the UX simplification plan (Phase 2.1).
 * The OverviewTab functionality has been migrated to:
 * - Quick Actions → Chat interface quick start buttons
 * - Metrics Cards → Chat interface status bar  
 * - Recent Activity → Workflows tab activity feed
 * - Welcome Section → Chat interface welcome message
 * 
 * The dashboard now uses a 3-tab structure (Chat, Workflows, Settings) with
 * Chat as the primary interface for new users.
 * 
 * @see UX_SIMPLIFICATION_PLAN.md for migration details
 */

import { useState } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface OverviewTabProps {
  connections: any[];
  workflows: any[];
  secrets: any[];
  user: User | null;
}

export default function OverviewTab({ connections, workflows, secrets, user }: OverviewTabProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Calculate metrics
  const activeConnections = connections.filter(conn => conn.status === 'ACTIVE').length;
  const totalConnections = connections.length;
  const activeWorkflows = workflows.filter(wf => wf.status === 'ACTIVE').length;
  const totalWorkflows = workflows.length;
  const totalSecrets = secrets.length;

  // Recent activity (mock data for now)
  const recentActivity = [
    { id: 1, type: 'workflow', action: 'Workflow "Customer Sync" completed successfully', time: '2 minutes ago' },
    { id: 2, type: 'connection', action: 'GitHub API connection tested successfully', time: '5 minutes ago' },
    { id: 3, type: 'workflow', action: 'Workflow "Data Export" started', time: '10 minutes ago' },
    { id: 4, type: 'secret', action: 'New API key added to secrets vault', time: '1 hour ago' },
  ];

  return (
    <div data-testid="overview-tab">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Overview</h2>
        <p className="text-gray-600">Welcome back, {user?.name || 'User'}! Here&apos;s what&apos;s happening with your API integrations today.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Connections Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">API Connections</dt>
                  <dd className="text-lg font-medium text-gray-900">{activeConnections} / {totalConnections}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/dashboard?tab=connections" className="font-medium text-indigo-700 hover:text-indigo-900">
                View all connections
              </Link>
            </div>
          </div>
        </div>

        {/* Workflows Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Workflows</dt>
                  <dd className="text-lg font-medium text-gray-900">{activeWorkflows} / {totalWorkflows}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/dashboard?tab=workflows" className="font-medium text-green-700 hover:text-green-900">
                View all workflows
              </Link>
            </div>
          </div>
        </div>

        {/* Secrets Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Stored Secrets</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalSecrets}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/dashboard?tab=secrets" className="font-medium text-yellow-700 hover:text-yellow-900">
                Manage secrets
              </Link>
            </div>
          </div>
        </div>

        {/* System Health Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">System Status</dt>
                  <dd className="text-lg font-medium text-gray-900">Healthy</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="font-medium text-green-700">All systems operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/dashboard?tab=connections'}
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add API Connection
            </button>
            <button
              onClick={() => window.location.href = '/workflows/create'}
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Workflow
            </button>
            <button
              onClick={() => window.location.href = '/dashboard?tab=chat'}
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat with AI
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="flow-root">
            <ul className="-mb-8">
              {recentActivity.map((activity, activityIdx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== recentActivity.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                          activity.type === 'workflow' ? 'bg-green-500' :
                          activity.type === 'connection' ? 'bg-indigo-500' :
                          'bg-yellow-500'
                        }`}>
                          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {activity.type === 'workflow' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            )}
                            {activity.type === 'connection' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            )}
                            {activity.type === 'secret' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            )}
                          </svg>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">{activity.action}</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time dateTime={activity.time}>{activity.time}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 
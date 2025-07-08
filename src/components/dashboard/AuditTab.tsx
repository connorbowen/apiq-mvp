'use client';

import { useState, useEffect } from 'react';

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  details: any; // Changed from string to any to handle object responses
  ipAddress: string;
  userAgent?: string;
}

interface AuditTabProps {
  refreshTrigger?: number; // External trigger to refresh audit logs
}

export default function AuditTab({ refreshTrigger = 0 }: AuditTabProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch('/api/audit-logs', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`Failed to load audit logs: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) {
        setAuditLogs(result.data.logs);
      } else {
        throw new Error(result.error || 'Failed to load audit logs');
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load audit logs on mount
  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Refresh audit logs when external trigger changes (e.g., after secret operations)
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadAuditLogs();
    }
  }, [refreshTrigger]);

  const handleManualRefresh = () => {
    loadAuditLogs();
    
    // Announce refresh to screen readers
    const announcementRegion = document.getElementById('aria-live-announcements');
    if (announcementRegion) {
      announcementRegion.textContent = 'Refreshing audit logs...';
      setTimeout(() => {
        announcementRegion.textContent = '';
      }, 2000);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'secrets') return log.action.includes('SECRET');
    if (filter === 'security') return log.action.includes('KEY') || log.action.includes('LOGIN');
    return true;
  });

  console.log('Filtered logs:', filteredLogs.length, 'entries, filter:', filter);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-green-100 text-green-800';
    if (action.includes('ACCESSED')) return 'bg-blue-100 text-blue-800';
    if (action.includes('ROTATED')) return 'bg-yellow-100 text-yellow-800';
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getActionLabel = (action: string) => {
    if (action === 'SECRET_CREATED') return 'Secret created';
    if (action === 'SECRET_ACCESSED') return 'Secret accessed';
    if (action === 'SECRET_DELETED') return 'Secret deleted';
    if (action === 'SECRET_ROTATED') return 'Secret rotated';
    if (action === 'MASTER_KEY_ROTATED') return 'Master key rotated';
    if (action === 'USER_LOGIN') return 'User login';
    if (action === 'api_credentials_stored') return 'Credentials stored';
    if (action === 'OAUTH2_TOKEN_ACCESS') return 'OAuth2 token accessed';
    return action.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <div data-testid="audit-management" role="region" aria-labelledby="audit-heading">
      {/* Header */}
      <div className="mb-6">
        <h2 id="audit-heading" className="text-2xl font-semibold text-gray-900 mb-2">Audit Logs</h2>
        <p className="text-gray-600">Monitor system activity and security events</p>
      </div>

      {/* Filter Controls and Refresh Button */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <label htmlFor="audit-filter" className="text-sm font-medium text-gray-700">
            Filter by:
          </label>
          <select
            id="audit-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
          >
            <option value="all">All Events</option>
            <option value="secrets">Secret Operations</option>
            <option value="security">Security Events</option>
          </select>
        </div>
        
        {/* Manual Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          aria-label="Refresh audit logs"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isRefreshing ? (
            <>
              <svg 
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" 
                fill="none" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading audit logs</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            System events and user actions
          </p>
        </div>
        
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="px-4 py-8 text-center">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-600">Loading audit logs...</span>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} data-testid="audit-log">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.userEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ipAddress}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Export Controls */}
      <div className="mt-6 flex justify-end">
        <button
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
          aria-label="Export audit log"
        >
          <svg className="-ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Log
        </button>
      </div>
    </div>
  );
} 
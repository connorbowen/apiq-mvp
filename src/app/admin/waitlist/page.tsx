'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: string | null;
  source: string | null;
  interests: string[];
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function WaitlistAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    fetchWaitlist();
  }, [session, status, currentPage, statusFilter, searchTerm]);

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        status: statusFilter,
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/waitlist?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        setPagination(data.pagination);
      } else if (response.status === 403) {
        router.push('/dashboard?error=insufficient-permissions');
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (id: string, status: string, notes: string) => {
    try {
      const response = await fetch('/api/admin/waitlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, notes })
      });

      if (response.ok) {
        setEditingEntry(null);
        fetchWaitlist();
      }
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Name', 'Company', 'Role', 'Source', 'Interests', 'Status', 'Notes', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...entries.map(entry => [
        entry.email,
        entry.name || '',
        entry.company || '',
        entry.role || '',
        entry.source || '',
        entry.interests?.join('; ') || '',
        entry.status,
        entry.notes || '',
        new Date(entry.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Check if user has super admin role
  if (session.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-6">
            You need Super Admin privileges to access the waitlist management.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Waitlist Management</h1>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by email, name, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="contacted">Contacted</option>
              </select>
            </div>
          </div>

          {/* Waitlist Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <li key={entry.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {entry.email}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            {entry.name && <span>{entry.name}</span>}
                            {entry.company && <span>• {entry.company}</span>}
                            {entry.role && <span>• {entry.role}</span>}
                          </div>
                          {entry.interests && entry.interests.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {entry.interests.map((interest, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.status === 'approved' ? 'bg-green-100 text-green-800' :
                            entry.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEditingEntry(entry.id);
                          setEditNotes(entry.notes || '');
                        }}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Edit Modal */}
                  {editingEntry === entry.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <select
                            value={entry.status}
                            onChange={(e) => {
                              const newEntries = entries.map(e2 => 
                                e2.id === entry.id ? { ...e2, status: e.target.value } : e2
                              );
                              setEntries(newEntries);
                            }}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="contacted">Contacted</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Notes</label>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateEntry(entry.id, entry.status, editNotes)}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingEntry(null)}
                            className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

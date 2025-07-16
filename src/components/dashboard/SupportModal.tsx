'use client';

import React, { useState } from 'react';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    email: string;
    name: string;
  };
}

export default function SupportModal({ open, onClose, user }: SupportModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          message,
        }),
      });
      if (res.ok) {
        setSuccess('Your support request has been sent! We’ll get back to you soon.');
        setMessage('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send support request.');
      }
    } catch (err) {
      setError('Failed to send support request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 focus:outline-none"
          aria-label="Close support modal"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold mb-2">Contact Support</h2>
        <p className="text-sm text-gray-600 mb-4">Describe your issue or question below. We’ll get back to you at <span className="font-medium">{user.email}</span>.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full border border-gray-300 rounded-md p-2 min-h-[100px] focus:ring-blue-500 focus:border-blue-500"
            placeholder="How can we help you?"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            disabled={isSubmitting}
            maxLength={1000}
          />
          {success && <div className="text-green-600 text-sm">{success}</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
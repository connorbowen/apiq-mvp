import React from 'react';

export function AlertBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800"
      data-testid="alert-banner"
    >
      {children}
    </div>
  );
} 
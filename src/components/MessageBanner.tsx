/**
 * TODO: UX SIMPLIFICATION - MESSAGE BANNER PHASE 1.4 IMPLEMENTATION - @connorbowen 2024-12-19
 * 
 * PHASE 1.4: Consolidate error/success messages
 * - [ ] Create unified MessageBanner component
 * - [ ] Support success, error, warning, and info message types
 * - [ ] Add auto-clear functionality with configurable timeouts
 * - [ ] Add accessibility features (ARIA live regions)
 * - [ ] Add tests: tests/unit/components/MessageBanner.test.tsx
 * - [ ] Add tests: tests/e2e/ui/ui-compliance.test.ts - test message accessibility
 * 
 * PHASE 2.1: 3-tab structure integration
 * - [ ] Integrate with new dashboard structure
 * - [ ] Support message persistence across tab changes
 * - [ ] Add tests: tests/unit/components/MessageBanner.test.tsx - test tab integration
 * 
 * PHASE 3.1: Mobile optimization
 * - [ ] Optimize message display for mobile screens
 * - [ ] Improve mobile message interactions
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test mobile messages
 * 
 * IMPLEMENTATION NOTES:
 * - Create reusable message component
 * - Support multiple message types with appropriate styling
 * - Add auto-clear with configurable timeouts
 * - Ensure accessibility compliance
 * - Support message stacking and management
 */

'use client';

import React, { useState, useEffect } from 'react';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface Message {
  id: string;
  type: MessageType;
  title?: string;
  content: string;
  autoClear?: boolean;
  timeout?: number;
}

interface MessageBannerProps {
  messages: Message[];
  onClear: (messageId: string) => void;
  onClearAll?: () => void;
  maxMessages?: number;
  className?: string;
}

// Message type configurations
const messageConfigs = {
  success: {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-400',
  },
  error: {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-400',
  },
};

export default function MessageBanner({ 
  messages, 
  onClear, 
  onClearAll, 
  maxMessages = 3,
  className = '' 
}: MessageBannerProps) {
  // Auto-clear messages
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    messages.forEach((message) => {
      if (message.autoClear && message.timeout) {
        const timeout = setTimeout(() => {
          onClear(message.id);
        }, message.timeout);
        timeouts.push(timeout);
      }
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [messages, onClear]);

  // Limit displayed messages
  const displayedMessages = messages.slice(0, maxMessages);

  if (displayedMessages.length === 0) {
    return null;
  }

  return (
    <div 
      className={`space-y-2 ${className}`}
      role="region"
      aria-live="polite"
      aria-label="Messages"
    >
      {displayedMessages.map((message) => {
        const config = messageConfigs[message.type];
        
        return (
          <div
            key={message.id}
            className={`p-4 border rounded-md ${config.bgColor} ${config.borderColor}`}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <div className={`${config.iconColor}`}>
                  {config.icon}
                </div>
              </div>
              <div className="ml-3 flex-1">
                {message.title && (
                  <h3 className={`text-sm font-medium ${config.textColor}`}>
                    {message.title}
                  </h3>
                )}
                <div className={`text-sm ${config.textColor}`}>
                  {message.content}
                </div>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    onClick={() => onClear(message.id)}
                    className={`inline-flex rounded-md p-1.5 ${config.bgColor} ${config.textColor} hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${message.type === 'success' ? 'green' : message.type === 'error' ? 'red' : message.type === 'warning' ? 'yellow' : 'blue'}-50 focus:ring-${message.type === 'success' ? 'green' : message.type === 'error' ? 'red' : message.type === 'warning' ? 'yellow' : 'blue'}-600`}
                    aria-label="Dismiss message"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {messages.length > maxMessages && (
        <div className="text-center">
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all messages ({messages.length - maxMessages} more)
          </button>
        </div>
      )}
    </div>
  );
} 
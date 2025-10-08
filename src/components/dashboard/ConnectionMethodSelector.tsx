'use client';

import { useState, useEffect } from 'react';

interface ConnectionMethodSelectorProps {
  onClose: () => void;
  onSelectMethod: (method: 'catalog' | 'manual' | 'import') => void;
}

export default function ConnectionMethodSelector({ 
  onClose, 
  onSelectMethod 
}: ConnectionMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<'catalog' | 'manual' | 'import' | null>(null);

  const methods = [
    {
      id: 'catalog' as const,
      title: 'Browse API Catalog',
      description: 'Connect to popular APIs with pre-configured settings',
      icon: (
        <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      benefits: ['Pre-configured settings', 'Tested integrations', 'Quick setup'],
      popular: true
    },
    {
      id: 'manual' as const,
      title: 'Connect Custom API',
      description: 'Manually configure any API with full control over settings',
      icon: (
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      benefits: ['Full control', 'Any API support', 'Custom configuration'],
      popular: false
    },
    {
      id: 'import' as const,
      title: 'Import from OpenAPI/Swagger',
      description: 'Automatically configure API from OpenAPI specification',
      icon: (
        <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
      benefits: ['Auto-discovery', 'Schema validation', 'Endpoint mapping'],
      popular: false
    }
  ];

  const handleMethodSelect = (method: 'catalog' | 'manual' | 'import') => {
    setSelectedMethod(method);
    onSelectMethod(method);
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              How would you like to add a connection?
            </h3>
            <p className="text-gray-600 mb-8">
              Choose the method that works best for your API
            </p>
          </div>

          {/* Method Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {methods.map((method) => (
              <div
                key={method.id}
                className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedMethod === method.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleMethodSelect(method.id)}
              >
                {method.popular && (
                  <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                    Popular
                  </div>
                )}
                
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    {method.icon}
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {method.title}
                  </h4>
                  
                  <p className="text-gray-600 text-sm mb-4">
                    {method.description}
                  </p>
                  
                  <ul className="text-xs text-gray-500 space-y-1">
                    {method.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="h-3 w-3 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              title="Press Esc to close"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

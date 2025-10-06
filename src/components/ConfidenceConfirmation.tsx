/**
 * ConfidenceConfirmation Component
 * 
 * Simple confidence confirmation that appears as a natural chat message
 * when AI has uncertainty about any aspect of the user's request.
 */

import React from 'react';

interface ConfidenceConfirmationProps {
  confidence: number;
  uncertaintyType: 'parameter' | 'connection' | 'data_mapping' | 'intent' | 'endpoint' | 'general';
  explanation: string;
  suggestions: Array<{
    option: string;
    description: string;
    confidence: number;
  }>;
  originalResponse: string;
  onConfirm: (selectedOption?: string) => void;
  onCancel: () => void;
  onRefine: () => void;
}

export default function ConfidenceConfirmation({
  confidence,
  uncertaintyType,
  explanation,
  suggestions,
  originalResponse,
  onConfirm,
  onCancel,
  onRefine
}: ConfidenceConfirmationProps) {
  
  const getUncertaintyMessage = (type: string) => {
    switch (type) {
      case 'parameter': return "I'm not sure about the parameters for this API call.";
      case 'connection': return "I found multiple API connections that could work.";
      case 'data_mapping': return "I'm uncertain about how to map the data between steps.";
      case 'intent': return "I'm not entirely sure what you want to accomplish.";
      case 'endpoint': return "I'm unsure which API endpoint to use.";
      default: return "I have some uncertainty about this request.";
    }
  };

  return (
    <div 
      data-testid="confidence-confirmation" 
      className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3"
    >
      <div className="text-sm text-blue-900 mb-2">
        <strong>🤔 {getUncertaintyMessage(uncertaintyType)}</strong>
      </div>
      
      <div className="text-sm text-blue-800 mb-3">
        {explanation}
      </div>
      
      {suggestions.length > 0 && (
        <div className="mb-3">
          <div className="text-sm text-blue-800 mb-2">Here are the options I&apos;m considering:</div>
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="text-sm text-blue-700"
                data-testid={`suggestion-${index}`}
              >
                • {suggestion.option} - {suggestion.description}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={`confirm-${index}`}
            onClick={() => onConfirm(suggestion.option)}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            data-testid={`confirm-option-${index}`}
          >
            {suggestion.option}
          </button>
        ))}
        
        <button
          onClick={() => onConfirm()}
          className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
          data-testid="primary-action proceed-anyway-btn"
        >
          Proceed Anyway
        </button>
        
        <button
          onClick={onRefine}
          className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
          data-testid="refine-request-btn"
        >
          Refine Request
        </button>
        
        <button
          onClick={onCancel}
          className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
          data-testid="secondary-action cancel-btn"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

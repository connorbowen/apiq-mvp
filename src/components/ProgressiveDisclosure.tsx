/**
 * ProgressiveDisclosure Component
 * 
 * Shows content progressively based on user onboarding stage.
 * Features are unlocked as users progress through the onboarding journey.
 * 
 * Features:
 * - chat: Basic chat functionality (always available)
 * - workflows: Workflow creation and management
 * - connections: API connection setup
 * - secrets: Secrets management
 * - advanced_workflows: Advanced workflow features
 * 
 * Usage:
 * <ProgressiveDisclosure feature="workflows">
 *   <WorkflowComponent />
 * </ProgressiveDisclosure>
 */

'use client';

import React, { ReactNode } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';

export interface ProgressiveDisclosureProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
  className?: string;
  showIfCompleted?: boolean;
}

export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  children,
  feature,
  fallback,
  className = '',
  showIfCompleted = false,
}) => {
  const { state, isFeatureAvailable } = useOnboarding();
  
  const shouldShow = () => {
    // If onboarding is completed, show everything
    if (state.stage === 'completed') return true;
    
    // If showIfCompleted is true, only show if onboarding is completed
    if (showIfCompleted) return state.stage === 'completed';
    
    // Check if feature is available based on onboarding stage
    return isFeatureAvailable(feature);
  };

  if (!shouldShow()) {
    return fallback ? (
      <div className={className} data-testid="progressive-disclosure">
        {fallback}
      </div>
    ) : null;
  }

  return (
    <div className={className} data-testid="progressive-disclosure">
      {children}
    </div>
  );
};

/**
 * ProgressiveFeature Component
 * 
 * Wrapper for individual features that should be progressively disclosed.
 * Provides consistent styling and messaging for locked features.
 */
export interface ProgressiveFeatureProps {
  children: ReactNode;
  feature: string;
  title: string;
  description: string;
  className?: string;
}

export const ProgressiveFeature: React.FC<ProgressiveFeatureProps> = ({
  children,
  feature,
  title,
  description,
  className = '',
}) => {
  const { state, isFeatureAvailable } = useOnboarding();
  
  const isUnlocked = state.stage === 'completed' || isFeatureAvailable(feature);

  if (!isUnlocked) {
    return (
      <div className={`progressive-feature-locked ${className}`}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{description}</p>
          <div className="text-sm text-gray-500">
            Unlock this feature by progressing through onboarding
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`progressive-feature-unlocked ${className}`}>
      {children}
    </div>
  );
};

/**
 * OnboardingProgress Component
 * 
 * Shows user progress through onboarding stages with visual indicators.
 */
export const OnboardingProgress: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { state } = useOnboarding();
  
  const stages = [
    { key: 'new_user', label: 'New User', description: 'Get started with the platform' },
    { key: 'first_connection', label: 'First Connection', description: 'Connect your first API' },
    { key: 'first_workflow', label: 'First Workflow', description: 'Create your first workflow' },
    { key: 'completed', label: 'Completed', description: 'Master the platform' },
  ];

  const currentStageIndex = stages.findIndex(s => s.key === state.stage);
  const isCompleted = state.stage === 'completed';

  return (
    <div className={`onboarding-progress ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isCompleted ? 'Onboarding Complete!' : 'Getting Started'}
        </h3>
        {!isCompleted && (
          <p className="text-sm text-gray-600">
            Complete these steps to unlock all features
          </p>
        )}
      </div>
      
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const isActive = stage.key === state.stage;
          const isStageCompleted = index < currentStageIndex || isCompleted;
          const isUpcoming = index > currentStageIndex && !isCompleted;

          return (
            <div
              key={stage.key}
              className={`flex items-center space-x-3 p-3 rounded-lg border ${
                isActive
                  ? 'bg-blue-50 border-blue-200'
                  : isStageCompleted
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : isStageCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {isStageCompleted ? '✓' : index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium ${
                    isActive
                      ? 'text-blue-900'
                      : isStageCompleted
                      ? 'text-green-900'
                      : 'text-gray-900'
                  }`}
                >
                  {stage.label}
                </div>
                <div
                  className={`text-xs ${
                    isActive
                      ? 'text-blue-700'
                      : isStageCompleted
                      ? 'text-green-700'
                      : 'text-gray-500'
                  }`}
                >
                  {stage.description}
                </div>
              </div>
              
              {isActive && (
                <div className="flex-shrink-0">
                  <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressiveDisclosure; 
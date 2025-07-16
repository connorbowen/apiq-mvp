/**
 * GuidedTour Component
 * 
 * Provides step-by-step guidance for new users through the application.
 * Features:
 * - Element highlighting with overlay
 * - Tooltip positioning
 * - Step navigation (next/previous/skip)
 * - Progress tracking
 * - Accessibility support
 * - Mobile responsive
 * - Integration with OnboardingContext for state management
 * 
 * Usage:
 * <GuidedTour
 *   steps={tourSteps}
 *   isOpen={showTour}
 *   onClose={() => setShowTour(false)}
 *   onComplete={handleTourComplete}
 *   onSkip={handleTourSkip}
 * />
 */

'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or data-testid
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'type' | 'scroll' | 'wait';
  actionValue?: string;
  completed?: boolean;
}

export interface GuidedTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

/**
 * GuidedTour Component
 * 
 * Provides step-by-step guidance for new users through the application.
 * Features:
 * - Element highlighting with overlay
 * - Tooltip positioning
 * - Step navigation (next/previous/skip)
 * - Progress tracking
 * - Accessibility support
 * - Mobile responsive
 * 
 * Usage:
 * <GuidedTour
 *   steps={tourSteps}
 *   isOpen={showTour}
 *   onClose={() => setShowTour(false)}
 *   onComplete={handleTourComplete}
 *   onSkip={handleTourSkip}
 * />
 */
export const GuidedTour: React.FC<GuidedTourProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
  onSkip,
  className = '',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Find and highlight target element
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const findTarget = () => {
      // Check if target is a data-testid or CSS selector
      let element: HTMLElement | null = null;
      
      if (currentStep.target.startsWith('[data-testid=')) {
        // Target is already a data-testid selector
        element = document.querySelector(currentStep.target) as HTMLElement;
      } else if (currentStep.target.startsWith('#')) {
        // Target is an ID selector
        element = document.querySelector(currentStep.target) as HTMLElement;
      } else if (currentStep.target.startsWith('.')) {
        // Target is a class selector
        element = document.querySelector(currentStep.target) as HTMLElement;
      } else {
        // Target might be a data-testid value, try both formats
        element = document.querySelector(`[data-testid="${currentStep.target}"]`) as HTMLElement;
        if (!element) {
          element = document.querySelector(currentStep.target) as HTMLElement;
        }
      }
      
      return element;
    };

    const element = findTarget();
    if (element) {
      setTargetElement(element);
      calculateTooltipPosition(element);
      setIsVisible(true);
    } else {
      // If element not found, wait a bit and try again (for dynamic content)
      const timer = setTimeout(() => {
        const retryElement = findTarget();
        if (retryElement) {
          setTargetElement(retryElement);
          calculateTooltipPosition(retryElement);
          setIsVisible(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStep, currentStepIndex]);

  // Calculate tooltip position relative to target element
  const calculateTooltipPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const position = currentStep?.position || 'bottom';
    const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
    const tooltipWidth = tooltipRef.current?.offsetWidth || 300;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - 10;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        top = rect.bottom + 10;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.left - tooltipWidth - 10;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.right + 10;
        break;
    }

    // Ensure tooltip stays within viewport
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

    setTooltipPosition({ top, left });
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (targetElement) {
        calculateTooltipPosition(targetElement);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetElement]);

  // Handle step navigation
  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
        case 'Enter':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep]);

  if (!isOpen || !currentStep) return null;

  return (
    <div className={`guided-tour ${className}`}>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
        data-testid="guided-tour-overlay"
      />

      {/* Highlight overlay for target element */}
      {targetElement && isVisible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: targetElement.offsetTop,
            left: targetElement.offsetLeft,
            width: targetElement.offsetWidth,
            height: targetElement.offsetHeight,
            border: '2px solid #3b82f6',
            borderRadius: '4px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
          data-testid="guided-tour-highlight"
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        data-testid="guided-tour-tooltip"
      >
        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 rounded-t-lg" role="progressbar" data-testid="guided-tour-progress">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 id="tour-title" className="text-lg font-semibold text-gray-900">
                {currentStep.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close tour"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p id="tour-description" className="text-gray-700 mb-6">
            {currentStep.description}
          </p>

          {/* Action button if specified */}
          {currentStep.action && (
            <div className="mb-4">
              <button
                onClick={() => {
                  if (currentStep.action === 'click' && targetElement) {
                    targetElement.click();
                  }
                  handleNext();
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {currentStep.action === 'click' ? 'Click here' : 'Continue'}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {!isFirstStep && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  data-testid="guided-tour-prev"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                data-testid="guided-tour-skip"
              >
                Skip tour
              </button>
            </div>

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              data-testid="guided-tour-next"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        {/* Arrow pointing to target */}
        <div
          className="absolute w-4 h-4 bg-white border border-gray-200 transform rotate-45"
          style={{
            top: currentStep.position === 'top' ? '100%' : '-8px',
            left: '50%',
            marginLeft: '-8px',
            borderTop: currentStep.position === 'top' ? 'none' : undefined,
            borderLeft: currentStep.position === 'top' ? 'none' : undefined,
            borderBottom: currentStep.position === 'top' ? '2px solid #3b82f6' : undefined,
            borderRight: currentStep.position === 'top' ? '2px solid #3b82f6' : undefined,
          }}
        />
      </div>
    </div>
  );
};

/**
 * useGuidedTour Hook
 * 
 * Custom hook for managing guided tour state and steps.
 * Provides tour management functions and predefined tour steps.
 */
export const useGuidedTour = () => {
  const { startTour, completeTour, skipTour, state } = useOnboarding();
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Predefined tour steps for different sections
  const chatTourSteps: TourStep[] = [
    {
      id: 'chat-welcome',
      title: 'Welcome to APIQ!',
      description: 'This is your AI-powered chat interface. You can describe what you want to do with your APIs in plain English.',
      target: '[data-testid="chat-interface"]',
      position: 'bottom',
    },
    {
      id: 'chat-input',
      title: 'Start a Conversation',
      description: 'Type your request here. For example: "When a new customer signs up, add them to our CRM and send a welcome email"',
      target: '[data-testid="chat-input"]',
      position: 'top',
      action: 'click',
    },
    {
      id: 'chat-examples',
      title: 'Try Examples',
      description: 'Click on any example to see how the AI understands and processes your requests.',
      target: '[data-testid="chat-examples"]',
      position: 'bottom',
    },
  ];

  const workflowsTourSteps: TourStep[] = [
    {
      id: 'workflows-intro',
      title: 'Workflows',
      description: 'Here you can see all your automated workflows. Each workflow can connect multiple APIs together.',
      target: '[data-testid="workflows-section"]',
      position: 'bottom',
    },
    {
      id: 'workflows-create',
      title: 'Create Workflow',
      description: 'Click here to create a new workflow. You can either use the chat interface or build it manually.',
      target: '[data-testid="create-workflow-btn"]',
      position: 'top',
      action: 'click',
    },
  ];

  const settingsTourSteps: TourStep[] = [
    {
      id: 'settings-intro',
      title: 'Settings',
      description: 'Manage your API connections, secrets, and account preferences here.',
      target: '[data-testid="tab-settings"]',
      position: 'bottom',
    },
    {
      id: 'connections-intro',
      title: 'API Connections',
      description: 'Connect your APIs here. Each connection stores your authentication credentials securely.',
      target: '[data-testid="connections-section"]',
      position: 'bottom',
    },
    {
      id: 'secrets-intro',
      title: 'Secrets Management',
      description: 'Store sensitive information like API keys and passwords securely.',
      target: '[data-testid="secrets-section"]',
      position: 'bottom',
    },
  ];

  const fullTourSteps: TourStep[] = [
    ...chatTourSteps,
    ...workflowsTourSteps,
    ...settingsTourSteps,
  ];

  const openTour = (steps?: TourStep[]) => {
    setIsTourOpen(true);
    startTour();
  };

  const closeTour = () => {
    setIsTourOpen(false);
  };

  const completeTourHandler = () => {
    setIsTourOpen(false);
    completeTour();
  };

  const skipTourHandler = () => {
    setIsTourOpen(false);
    skipTour();
  };

  return {
    isTourOpen,
    openTour,
    closeTour,
    completeTour: completeTourHandler,
    skipTour: skipTourHandler,
    chatTourSteps,
    workflowsTourSteps,
    settingsTourSteps,
    fullTourSteps,
    tourState: state,
  };
};

export default GuidedTour; 
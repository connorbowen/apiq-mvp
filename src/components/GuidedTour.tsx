/**
 * TODO: UX SIMPLIFICATION - GUIDED TOUR PHASE 2.4 IMPLEMENTATION - @connorbowen 2024-12-19
 * 
 * PHASE 2.4: Add guided tour for new users
 * - [ ] Create GuidedTour component
 * - [ ] Add tour steps for Chat, Workflows, Settings
 * - [ ] Implement tour state management
 * - [ ] Add skip/resume functionality
 * - [ ] Add tests: tests/unit/components/GuidedTour.test.tsx
 * - [ ] Add tests: tests/e2e/onboarding/user-journey.test.ts - test guided tour
 * 
 * PHASE 2.2: Progressive disclosure integration
 * - [ ] Integrate with OnboardingContext
 * - [ ] Show tour steps based on user progress
 * - [ ] Add tests: tests/unit/components/GuidedTour.test.tsx - test progressive integration
 * 
 * PHASE 3.1: Mobile optimization
 * - [ ] Optimize tour for mobile screens
 * - [ ] Add mobile-friendly tour interactions
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test mobile tour
 * 
 * IMPLEMENTATION NOTES:
 * - Create overlay-based tour system
 * - Support step-by-step navigation
 * - Add keyboard navigation support
 * - Ensure accessibility compliance
 * - Support tour persistence and resumption
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

interface GuidedTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

export default function GuidedTour({ 
  steps, 
  onComplete, 
  onSkip,
  className = '' 
}: GuidedTourProps) {
  const { state, nextTourStep, previousTourStep, completeTour, skipTour } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[state.currentTourStep];
  const isFirstStep = state.currentTourStep === 0;
  const isLastStep = state.currentTourStep === steps.length - 1;

  // Show tour if not completed
  useEffect(() => {
    if (!state.guidedTourCompleted && steps.length > 0) {
      setIsVisible(true);
    }
  }, [state.guidedTourCompleted, steps.length]);

  // Position tooltip relative to target element
  useEffect(() => {
    if (isVisible && currentStep && tooltipRef.current) {
      const targetElement = document.querySelector(currentStep.target);
      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        
        // Calculate position based on target element
        const position = currentStep.position || 'bottom';
        let top = 0;
        let left = 0;
        
        switch (position) {
          case 'top':
            top = targetRect.top - tooltipRect.height - 10;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
            break;
          case 'bottom':
            top = targetRect.bottom + 10;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
            break;
          case 'left':
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
            left = targetRect.left - tooltipRect.width - 10;
            break;
          case 'right':
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
            left = targetRect.right + 10;
            break;
        }
        
        tooltipRef.current.style.top = `${Math.max(0, top)}px`;
        tooltipRef.current.style.left = `${Math.max(0, left)}px`;
      }
    }
  }, [isVisible, currentStep, state.currentTourStep]);

  const handleNext = () => {
    if (isLastStep) {
      completeTour();
      onComplete?.();
      setIsVisible(false);
    } else {
      nextTourStep();
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      previousTourStep();
    }
  };

  const handleSkip = () => {
    skipTour();
    onSkip?.();
    setIsVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        handleSkip();
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

  if (!isVisible || !currentStep) {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className={`fixed inset-0 z-50 bg-black bg-opacity-50 ${className}`}
      onClick={handleSkip}
    >
      {/* Highlight target element */}
      <div 
        className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 rounded"
        style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-lg shadow-lg p-4 max-w-sm"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 id="tour-title" className="text-lg font-semibold text-gray-900">
            {currentStep.title}
          </h3>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Skip tour"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <p id="tour-description" className="text-gray-600 mb-4">
          {currentStep.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Step {state.currentTourStep + 1} of {steps.length}
          </div>
          
          <div className="flex space-x-2">
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Previous
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
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
import { apiClient } from '../lib/api/client';
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
  onClose: () => void | Promise<void>;
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
  setActiveTab?: (tab: string) => void;
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
  setActiveTab,
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
  
  // Debug logging for step array
  console.log('🎯 GuidedTour: Step array debug:', {
    currentStepIndex,
    totalSteps: steps.length,
    currentStep: currentStep?.id,
    allSteps: steps.map(s => ({ id: s.id, title: s.title }))
  });

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
    console.log('🎯 GuidedTour: Looking for target element:', currentStep.target, 'Found:', !!element);
    console.log('🎯 GuidedTour: Current step ID:', currentStep.id, 'Target selector:', currentStep.target);
    if (element) {
      console.log('🎯 GuidedTour: Target element found, setting up tour');
      setTargetElement(element);
      calculateTooltipPosition(element);
      setIsVisible(true);
    } else {
      // If element not found, wait a bit and try again (for dynamic content)
      // Increase delay for tab-switched content to ensure DOM is ready
      const delay = (currentStep.id === 'workflows-intro' || currentStep.id === 'workflows-create' || 
                    currentStep.id === 'connections-intro') ? 2000 : 1000;
      console.log(`🎯 GuidedTour: Target element not found, retrying in ${delay}ms (tab-switched content: ${delay === 2000})`);
      console.log(`🎯 GuidedTour: Element not found for step: ${currentStep.id}, target: ${currentStep.target}`);
      const timer = setTimeout(() => {
        const retryElement = findTarget();
        console.log('🎯 GuidedTour: Retry found element:', !!retryElement);
        if (retryElement) {
          setTargetElement(retryElement);
          calculateTooltipPosition(retryElement);
          setIsVisible(true);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStep, currentStepIndex]);

  // Calculate tooltip position relative to target element
  const calculateTooltipPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const position = currentStep?.position || 'bottom';
    const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
    const tooltipWidth = tooltipRef.current?.offsetWidth || 300;
    
    // Calculate the actual highlighted area boundaries (including buffer space and blue border)
    const isBufferedStep = currentStep?.id === 'chat-examples' || currentStep?.id === 'workflows-intro' || currentStep?.id === 'workflows-search';
    const buffer = isBufferedStep ? 20 : 0;
    const borderWidth = 4; // Blue border width
    const tooltipSpacing = 15; // Consistent spacing from highlighted area
    
    // Calculate the outer edges of the highlighted area (including buffer + border)
    const highlightedTop = rect.top - buffer - borderWidth;
    const highlightedLeft = rect.left - buffer - borderWidth;
    const highlightedBottom = rect.bottom + buffer + borderWidth;
    const highlightedRight = rect.right + buffer + borderWidth;
    
    console.log('🎯 GuidedTour: Calculating position for element:', {
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      highlightedArea: { top: highlightedTop, left: highlightedLeft, bottom: highlightedBottom, right: highlightedRight },
      position,
      tooltipSize: { width: tooltipWidth, height: tooltipHeight },
      buffer,
      borderWidth,
      tooltipSpacing
    });

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        // Tooltip above: position so arrow points at highlighted area top edge
        // Use 7px spacing (tooltipSpacing - 8) for consistency with bottom position
        top = highlightedTop - tooltipHeight - 7;
        left = highlightedLeft + (rect.width + (buffer + borderWidth) * 2) / 2 - (tooltipWidth / 2);
        break;
      case 'bottom':
        // Tooltip below: position so arrow points at highlighted area bottom edge
        // Arrow is at top of tooltip (top: '-8px'), so reduce spacing to align arrow tip
        top = highlightedBottom + (tooltipSpacing - 8);
        left = highlightedLeft + (rect.width + (buffer + borderWidth) * 2) / 2 - (tooltipWidth / 2);
        break;
      case 'left':
        // Tooltip to the left: position so arrow points at highlighted area left edge
        // Use 7px spacing for consistency with other positions
        top = highlightedTop + (rect.height + (buffer + borderWidth) * 2) / 2 - (tooltipHeight / 2);
        left = highlightedLeft - tooltipWidth - 7;
        break;
      case 'right':
        // Tooltip to the right: position so arrow points at highlighted area right edge
        // Use 7px spacing for consistency with other positions
        top = highlightedTop + (rect.height + (buffer + borderWidth) * 2) / 2 - (tooltipWidth / 2);
        left = highlightedRight + 7;
        break;
    }

    // Ensure tooltip stays within viewport with extra padding for button accessibility
    const viewportPadding = 20;
    const minTop = viewportPadding;
    const maxTop = window.innerHeight - tooltipHeight - viewportPadding;
    const minLeft = viewportPadding;
    const maxLeft = window.innerWidth - tooltipWidth - viewportPadding;
    
    top = Math.max(minTop, Math.min(top, maxTop));
    left = Math.max(minLeft, Math.min(left, maxLeft));
    
    // Additional check: if the tooltip would be too close to the bottom or top,
    // adjust position to prefer center of viewport for better button accessibility
    // BUT respect the intended position (top/bottom) to avoid overriding user intent
    if (position === 'top' && top < viewportPadding) {
      // For top-positioned tooltips, if they're too close to the top, 
      // position them just above the highlighted area instead of forcing them down
      top = highlightedTop - tooltipHeight - 10; // 10px spacing above highlighted area
    } else if (position === 'bottom' && top > window.innerHeight * 0.8) {
      // For bottom-positioned tooltips, if they're too close to the bottom,
      // move them up to avoid being cut off
      top = window.innerHeight * 0.7;
    } else if (position !== 'top' && position !== 'bottom') {
      // For left/right positioned tooltips, use the original logic
      if (top < window.innerHeight * 0.1) {
        top = window.innerHeight * 0.15; // Move away from very top
      } else if (top > window.innerHeight * 0.8) {
        top = window.innerHeight * 0.7; // Move away from very bottom
      }
    }

    console.log('🎯 GuidedTour: Final tooltip position:', { top, left });
    setTooltipPosition({ top, left });
  };

  // Handle window resize & scroll
  useEffect(() => {
    const handleReflow = () => {
      if (targetElement) {
        calculateTooltipPosition(targetElement);
        // Force a state tick so the overlay re-reads getBoundingClientRect()
        setIsVisible(v => v); 
      }
    };

    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, { passive: true });
    return () => {
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow);
    };
  }, [targetElement]);

  // Get computed border-radius from target element
  const getTargetBorderRadius = () => {
    if (!targetElement) return 6;
    const computedStyle = getComputedStyle(targetElement);
    const radius = parseFloat(computedStyle.borderRadius || '6');
    return radius;
  };

  // Handle step navigation
  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      // Switch to workflows tab before workflows steps
      const nextStepIndex = currentStepIndex + 1;
      const nextStep = steps[nextStepIndex];
      
      console.log('🎯 GuidedTour: handleNext called, current step:', currentStep?.id, 'next step:', nextStep?.id);
      console.log('🎯 GuidedTour: nextStep details:', nextStep);
      
      if (nextStep && nextStep.id === 'workflows-tab-highlight' && setActiveTab) {
        console.log('🎯 GuidedTour: Switching to workflows tab after user clicked Next');
        setActiveTab('workflows');
        // Wait for tab switch to complete before advancing
        setTimeout(() => {
          setCurrentStepIndex(nextStepIndex);
        }, 500);
        return;
      } else if (currentStep.id === 'workflows-tab-highlight' && setActiveTab) {
        console.log('🎯 GuidedTour: Switching to workflows tab after user clicked Next on workflows-tab-highlight');
        setActiveTab('workflows');
        // Wait for tab switch to complete before advancing
        setTimeout(() => {
          setCurrentStepIndex(nextStepIndex);
        }, 500);
        return;
      } else if (currentStep.id === 'connections-tab-highlight' && setActiveTab) {
        console.log('🎯 GuidedTour: Switching to connections tab after user clicked Next on connections-tab-highlight');
        setActiveTab('connections');
        // Wait for tab switch to complete before advancing
        setTimeout(() => {
          setCurrentStepIndex(nextStepIndex);
        }, 500);
        return;
      }
      
      // For all other steps, just advance to the next step
      console.log('🎯 GuidedTour: No tab switch needed, advancing to next step:', nextStep?.id);
      console.log('🎯 GuidedTour: Current step index:', currentStepIndex, 'Next step index:', nextStepIndex);
      console.log('🎯 GuidedTour: Total steps:', steps.length);
      
      // Always allow navigation - the target element will be found for the next step
      setCurrentStepIndex(nextStepIndex);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      // Switch back to chat tab when going from workflows back to workflows-tab-highlight
      const previousStepIndex = currentStepIndex - 1;
      const previousStep = steps[previousStepIndex];
      
      if (currentStep.id === 'workflows-intro' && previousStep && previousStep.id === 'workflows-tab-highlight' && setActiveTab) {
        console.log('🎯 GuidedTour: Switching back to chat tab after user clicked Previous');
        setActiveTab('chat');
        // Wait for tab switch to complete before going back
        setTimeout(() => {
          setCurrentStepIndex(previousStepIndex);
        }, 500);
        return;
      } else if (currentStep.id === 'connections-intro' && previousStep && previousStep.id === 'connections-tab-highlight' && setActiveTab) {
        console.log('🎯 GuidedTour: Switching back to workflows tab after user clicked Previous');
        setActiveTab('workflows');
        // Wait for tab switch to complete before going back
        setTimeout(() => {
          setCurrentStepIndex(previousStepIndex);
        }, 500);
        return;
      }
      
      // Normal previous step navigation
      setCurrentStepIndex(previousStepIndex);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          await onClose();
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

  if (!isOpen || !currentStep) {
    console.log('🎯 GuidedTour: Not rendering - isOpen:', isOpen, 'currentStep:', !!currentStep);
    return null;
  }
  
  console.log('🎯 GuidedTour: Rendering tour step:', currentStep.id, 'isVisible:', isVisible, 'targetElement:', !!targetElement);
  console.log('🎯 GuidedTour: Tooltip position:', tooltipPosition);
  console.log('🎯 GuidedTour: Component state:', { isOpen, currentStep: currentStep.id, isVisible, targetElement: !!targetElement });
  console.log('🎯 GuidedTour: Window dimensions:', { width: window.innerWidth, height: window.innerHeight });
  console.log('🎯 GuidedTour: Target element dimensions:', targetElement ? { 
    offsetTop: targetElement.offsetTop, 
    offsetLeft: targetElement.offsetLeft, 
    offsetWidth: targetElement.offsetWidth, 
    offsetHeight: targetElement.offsetHeight 
  } : 'No target element');
  console.log('🎯 GuidedTour: Current step index:', currentStepIndex, 'Total steps:', steps.length);

  return (
    <div className={`guided-tour ${className}`} style={{ position: 'relative', zIndex: 9999 }}>
              {/* Overlay - only handles clicks, no dark background */}
        <div
          ref={overlayRef}
          className="fixed inset-0 z-40"
          onClick={async () => await onClose()}
          aria-hidden="true"
          data-testid="guided-tour-overlay"
        />

              {/* Hole-punch overlay + highlight */}
        {targetElement && isVisible && (
          <>
            {/* Dark overlay with a transparent "hole" over the target */}
            <div
              className="fixed z-40 pointer-events-none"
              style={{
                // Place a transparent rectangle over the target and cast a HUGE shadow around it.
                // The shadow darkens everything except the rectangle (i.e., makes a hole).
                // Add buffer space for steps 3, 5, and 6 (chat-examples, workflows-intro, workflows-search)
                top: (currentStep.id === 'chat-examples' || currentStep.id === 'workflows-intro' || currentStep.id === 'workflows-search')
                  ? targetElement.getBoundingClientRect().top - 20 
                  : targetElement.getBoundingClientRect().top,
                left: (currentStep.id === 'chat-examples' || currentStep.id === 'workflows-intro' || currentStep.id === 'workflows-search')
                  ? targetElement.getBoundingClientRect().left - 20 
                  : targetElement.getBoundingClientRect().left,
                width: (currentStep.id === 'chat-examples' || currentStep.id === 'workflows-intro' || currentStep.id === 'workflows-search')
                  ? targetElement.getBoundingClientRect().width + 40 
                  : targetElement.getBoundingClientRect().width,
                height: (currentStep.id === 'chat-examples' || currentStep.id === 'workflows-intro' || currentStep.id === 'workflows-search')
                  ? targetElement.getBoundingClientRect().height + 40 
                  : targetElement.getBoundingClientRect().height,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                borderRadius: getTargetBorderRadius(),
              }}
              aria-hidden="true"
              data-testid="guided-tour-dark-overlay"
            />

            {/* Blue border for the target element */}
            <div
              className="fixed z-50 pointer-events-none"
              style={{
                // Add buffer space for steps 3, 5, and 6 (chat-examples, workflows-intro, workflows-search)
                top: (currentStep.id === 'chat-examples' || currentStep.id === 'workflows-intro' || currentStep.id === 'workflows-search')
                  ? targetElement.getBoundingClientRect().top - 20 
                  : targetElement.getBoundingClientRect().top,
                left: (currentStep.id === 'chat-examples' || currentStep.id === 'workflows-intro' || currentStep.id === 'workflows-search')
                  ? targetElement.getBoundingClientRect().left - 20 
                  : targetElement.getBoundingClientRect().left,
                width: (currentStep.id === 'chat-examples' || currentStep.id === 'workflows-intro' || currentStep.id === 'workflows-search')
                  ? targetElement.getBoundingClientRect().width + 40 
                  : targetElement.getBoundingClientRect().width,
                height: (currentStep.id === 'chat-examples' || currentStep.id === 'workflows-intro' || currentStep.id === 'workflows-search')
                  ? targetElement.getBoundingClientRect().height + 40 
                  : targetElement.getBoundingClientRect().height,
                border: '4px solid #3b82f6',
                borderRadius: getTargetBorderRadius(),
                backgroundColor: 'transparent',
              }}
              data-testid="guided-tour-highlight"
            />
          </>
        )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[60] bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm pointer-events-auto"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          minHeight: '200px', // Ensure enough space for buttons
          minWidth: '300px',  // Ensure enough space for buttons
        }}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        data-testid="guided-tour-tooltip"
      >


        {/* Arrow pointing to target - positioned first so it appears behind content */}
        <div
          className="absolute w-4 h-4 bg-white border border-gray-200 transform rotate-45"
          style={{
            zIndex: -1, // Force behind all tooltip content
            // Calculate arrow position relative to highlighted area edges
            ...(currentStep.position === 'top' && {
              // Arrow at top edge of highlighted area, pointing down toward tooltip
              bottom: '-8px', // At tooltip top edge (correct)
              left: 'calc(50% - 8px)', // Center horizontally
              borderTop: 'none',
              borderLeft: 'none',
            }),
            ...(currentStep.position === 'bottom' && {
              // Arrow at bottom edge of highlighted area, pointing down toward tooltip
              top: '-8px', // At tooltip top edge (correct)
              left: 'calc(50% - 8px)', // Center horizontally
              borderTop: 'none',
              borderLeft: 'none',
            }),
            ...(currentStep.position === 'left' && {
              // Arrow at left edge of highlighted area, pointing left toward tooltip
              top: 'calc(50% - 8px)', // Center vertically
              left: '-23px', // Position at highlighted area left edge (15 + 8)
              borderBottom: 'none',
              borderRight: 'none',
            }),
            ...(currentStep.position === 'right' && {
              // Arrow at right edge of highlighted area, pointing right toward tooltip
              top: 'calc(50% - 8px)', // Center vertically
              left: '-8px', // At tooltip left edge (correct)
              borderTop: 'none',
              borderLeft: 'none',
            }),
          }}
        />

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 rounded-t-lg" role="progressbar" data-testid="guided-tour-progress" style={{ position: 'relative', zIndex: 3 }}>
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6" style={{ position: 'relative', zIndex: 2 }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 id="tour-title" className="text-lg font-semibold text-gray-900">
                {currentStep.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1" data-testid="tour-step-counter">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
            </div>
            <button
              onClick={async () => await onClose()}
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
  const { startTour, completeTour, skipTour, state, syncWithUserData } = useOnboarding();
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
      id: 'workflows-tab-highlight',
      title: 'Workflows Tab',
      description: 'Click here to switch to the Workflows tab, where you can see all your automated workflows.',
      target: '[data-testid="tab-workflows"]',
      position: 'bottom',
    },
    {
      id: 'workflows-intro',
      title: 'Workflows Management',
      description: 'Here you can see all your automated workflows. Each workflow can connect multiple APIs together.',
      target: '[data-testid="workflows-management"]',
      position: 'bottom',
    },
    {
      id: 'workflows-search',
      title: 'Search & Filter',
      description: 'Use the search bar to find specific workflows and filter by status to organize your view.',
      target: '[data-testid="workflows-search-filter"]',
      position: 'bottom',
    },
    {
      id: 'workflows-create',
      title: 'Create Workflow',
      description: 'Click here to create a new workflow. You can either use the chat interface or build it manually.',
      target: '[data-testid="primary-action create-workflow-btn"]',
      position: 'left',
    },
  ];

  const connectionsTourSteps: TourStep[] = [
    {
      id: 'connections-tab-highlight',
      title: 'Connections Tab',
      description: 'Click here to switch to the Connections tab, where you can manage your API connections.',
      target: '[data-testid="tab-connections"]',
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
      id: 'connections-create',
      title: 'Create Connection',
      description: 'Click here to add a new API connection. You can connect to various services like CRM, email, databases, and more.',
      target: '[data-testid="primary-action create-connection-header-btn"]',
      position: 'top',
    },
  ];

  const fullTourSteps: TourStep[] = [
    ...chatTourSteps,
    ...workflowsTourSteps,
    ...connectionsTourSteps,
  ];

  const openTour = (steps?: TourStep[]) => {
    console.log('🎯 useGuidedTour: openTour called, setting isTourOpen to true');
    setIsTourOpen(true);
    startTour();
  };

  const closeTour = async () => {
    setIsTourOpen(false);
    // Temporarily dismiss the tour for this session (will reappear on refresh/login)
    // but don't permanently mark it as dismissed in the database
    const now = new Date().toISOString();
    console.log('🎯 GuidedTour: closeTour called, updating tour state...');
    try {
      await apiClient.updateTourState({
        currentStep: 0,
        totalSteps: 0,
        isActive: false,
        completedSteps: [],
        dismissed: false, // Keep as false so it can reappear
        lastShown: now
      });
      console.log('🎯 GuidedTour: Tour state updated successfully');
    } catch (error) {
      console.error('🎯 GuidedTour: Failed to update tour state:', error);
    }
    const userResponse = await apiClient.getCurrentUser();
    if (userResponse.success && userResponse.data) {
      syncWithUserData(userResponse.data.user);
    }
  };

  const completeTourHandler = async () => {
    setIsTourOpen(false);
    const now = new Date().toISOString();
    await apiClient.updateTourState({
      currentStep: 0,
      totalSteps: 0,
      isActive: false,
      completedSteps: [],
      dismissed: true,
      lastShown: now
    });
    const userResponse = await apiClient.getCurrentUser();
    if (userResponse.success && userResponse.data) {
      syncWithUserData(userResponse.data.user);
    }
    completeTour();
  };

  const skipTourHandler = async () => {
    setIsTourOpen(false);
    const now = new Date().toISOString();
    await apiClient.updateTourState({
      currentStep: 0,
      totalSteps: 0,
      isActive: false,
      completedSteps: [],
      dismissed: true,
      lastShown: now
    });
    const userResponse = await apiClient.getCurrentUser();
    if (userResponse.success && userResponse.data) {
      syncWithUserData(userResponse.data.user);
    }
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
    connectionsTourSteps,
    fullTourSteps,
    tourState: state,
  };
};

export default GuidedTour; 
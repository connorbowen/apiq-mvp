/**
 * TODO: UX SIMPLIFICATION - ONBOARDING CONTEXT PHASE 2.2 IMPLEMENTATION - @connorbowen 2024-12-19
 * 
 * PHASE 2.2: Implement progressive disclosure
 * - [ ] Create OnboardingContext for state management
 * - [ ] Add onboarding stage tracking
 * - [ ] Add progressive feature unlocking logic
 * - [ ] Add guided tour state management
 * - [ ] Add tests: tests/unit/contexts/OnboardingContext.test.tsx
 * - [ ] Add tests: tests/e2e/onboarding/user-journey.test.ts - test context integration
 * 
 * PHASE 2.4: Guided tour integration
 * - [ ] Add tour step management
 * - [ ] Add tour completion tracking
 * - [ ] Add tour skip/resume functionality
 * - [ ] Add tests: tests/unit/contexts/OnboardingContext.test.tsx - test tour features
 * 
 * PHASE 2.3: Streamline onboarding flow
 * - [ ] Add onboarding completion tracking
 * - [ ] Add onboarding state persistence
 * - [ ] Add tests: tests/unit/contexts/OnboardingContext.test.tsx - test onboarding flow
 * 
 * IMPLEMENTATION NOTES:
 * - Create context with onboarding state management
 * - Add progressive disclosure logic
 * - Integrate with API client for state persistence
 * - Support tour step management
 * - Add localStorage persistence for offline support
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Onboarding stages for progressive disclosure
export type OnboardingStage = 'new_user' | 'first_connection' | 'first_workflow' | 'completed';

// Tour step management
export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  completed: boolean;
}

// Onboarding context state
interface OnboardingState {
  stage: OnboardingStage;
  completedAt?: Date;
  guidedTourCompleted: boolean;
  tourSteps: TourStep[];
  currentTourStep: number;
}

// Onboarding context interface
interface OnboardingContextType {
  state: OnboardingState;
  updateStage: (stage: OnboardingStage) => void;
  completeOnboarding: () => void;
  startTour: () => void;
  completeTour: () => void;
  nextTourStep: () => void;
  previousTourStep: () => void;
  skipTour: () => void;
  isFeatureAvailable: (feature: string) => boolean;
}

// Default onboarding state
const defaultState: OnboardingState = {
  stage: 'new_user',
  guidedTourCompleted: false,
  tourSteps: [],
  currentTourStep: 0,
};

// Create context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider component
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(defaultState);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('onboardingState');
    if (savedState) {
      try {
        setState(JSON.parse(savedState));
      } catch (error) {
        console.error('Failed to parse onboarding state:', error);
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('onboardingState', JSON.stringify(state));
  }, [state]);

  // Update onboarding stage
  const updateStage = (stage: OnboardingStage) => {
    setState(prev => ({ ...prev, stage }));
  };

  // Complete onboarding
  const completeOnboarding = () => {
    setState(prev => ({ 
      ...prev, 
      stage: 'completed', 
      completedAt: new Date() 
    }));
  };

  // Start guided tour
  const startTour = () => {
    setState(prev => ({ 
      ...prev, 
      currentTourStep: 0,
      guidedTourCompleted: false 
    }));
  };

  // Complete guided tour
  const completeTour = () => {
    setState(prev => ({ 
      ...prev, 
      guidedTourCompleted: true,
      currentTourStep: 0 
    }));
  };

  // Next tour step
  const nextTourStep = () => {
    setState(prev => ({ 
      ...prev, 
      currentTourStep: Math.min(prev.currentTourStep + 1, prev.tourSteps.length - 1) 
    }));
  };

  // Previous tour step
  const previousTourStep = () => {
    setState(prev => ({ 
      ...prev, 
      currentTourStep: Math.max(prev.currentTourStep - 1, 0) 
    }));
  };

  // Skip tour
  const skipTour = () => {
    setState(prev => ({ 
      ...prev, 
      guidedTourCompleted: true,
      currentTourStep: 0 
    }));
  };

  // Check if feature is available based on onboarding stage
  const isFeatureAvailable = (feature: string): boolean => {
    switch (feature) {
      case 'chat':
        return true; // Always available
      case 'workflows':
        return state.stage !== 'new_user';
      case 'connections':
        return state.stage !== 'new_user';
      case 'secrets':
        return state.stage === 'first_workflow' || state.stage === 'completed';
      case 'advanced_workflows':
        return state.stage === 'completed';
      default:
        return true;
    }
  };

  const value: OnboardingContextType = {
    state,
    updateStage,
    completeOnboarding,
    startTour,
    completeTour,
    nextTourStep,
    previousTourStep,
    skipTour,
    isFeatureAvailable,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Hook to use onboarding context
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
} 
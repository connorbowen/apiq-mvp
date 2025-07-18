/**
 * OnboardingContext
 * 
 * Provides comprehensive onboarding state management for progressive disclosure
 * and guided tour functionality. Manages user onboarding stages, feature availability,
 * and tour progression to create a personalized user experience.
 * 
 * Features:
 * - Progressive disclosure based on onboarding stage
 * - Guided tour state management
 * - Feature availability control
 * - Local storage persistence
 * - Tour step navigation
 * - Onboarding completion tracking
 * 
 * Onboarding Stages:
 * - new_user: Basic chat functionality only
 * - first_connection: Connections and workflows unlocked
 * - first_workflow: Secrets management unlocked
 * - completed: All features available
 * 
 * Usage:
 * <OnboardingProvider>
 *   <App />
 * </OnboardingProvider>
 * 
 * const { state, isFeatureAvailable, updateStage } = useOnboarding();
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
  syncWithUserData: (userData: any) => void;
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

  // Sync onboarding context with user data from the database
  const syncWithUserData = (userData: any) => {
    if (userData) {
      console.log('🔄 OnboardingContext: Syncing with user data:', {
        onboardingStage: userData.onboardingStage || userData.onboarding_stage,
        guidedTourCompleted: userData.guidedTourCompleted || userData.guided_tour_completed,
        onboardingCompletedAt: userData.onboardingCompletedAt || userData.onboarding_completed_at
      });
      
      // Map database fields to context fields
      const onboardingStage = userData.onboardingStage || userData.onboarding_stage;
      const guidedTourCompleted = userData.guidedTourCompleted || userData.guided_tour_completed;
      const onboardingCompletedAt = userData.onboardingCompletedAt || userData.onboarding_completed_at;
      
      if (onboardingStage) {
        // Convert database enum to context enum
        const stageMap: Record<string, OnboardingStage> = {
          'NEW_USER': 'new_user',
          'FIRST_CONNECTION': 'first_connection', 
          'FIRST_WORKFLOW': 'first_workflow',
          'COMPLETED': 'completed'
        };
        const mappedStage = stageMap[onboardingStage] || 'new_user';
        setState(prev => ({ ...prev, stage: mappedStage }));
      }
      
      // Explicitly handle guided tour completion state
      if (guidedTourCompleted !== undefined) {
        console.log('🔄 OnboardingContext: Setting guidedTourCompleted to:', guidedTourCompleted);
        setState(prev => ({ ...prev, guidedTourCompleted: Boolean(guidedTourCompleted) }));
      }
      
      if (onboardingCompletedAt) {
        setState(prev => ({ 
          ...prev, 
          stage: 'completed',
          completedAt: new Date(onboardingCompletedAt)
        }));
      }
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
    syncWithUserData,
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
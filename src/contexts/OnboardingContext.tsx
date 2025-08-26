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
import { apiClient } from '../lib/api/client';

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
  tourSteps: TourStep[];
  currentTourStep: number;
  tourState?: {
    currentStep: number;
    totalSteps: number;
    isActive: boolean;
    completedSteps: number[];
    dismissed: boolean;
    lastShown: string;
  };
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
  syncWithTourState: () => Promise<void>;
}

// Default onboarding state
const defaultState: OnboardingState = {
  stage: 'new_user',
  tourSteps: [],
  currentTourStep: 0,
};

// Create context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider component
export function OnboardingProvider({ children }: { children: ReactNode }) {
  console.log('🔄 OnboardingProvider: Initializing...');
  const [state, setState] = useState<OnboardingState>(defaultState);

  // Fetch and sync tourState from backend on mount
  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        console.log('🔄 OnboardingContext: Fetching tour state from backend...');
        const response = await apiClient.getTourState();
        
        // Only update state if component is still mounted
        if (isMounted) {
          console.log('🔄 OnboardingContext: Tour state response:', response);
          if (response.success && response.data) {
            console.log('🔄 OnboardingContext: Setting tour state:', response.data);
            setState(prev => ({ ...prev, tourState: response.data }));
          } else {
            console.log('🔄 OnboardingContext: Tour state response was not successful:', response);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('🔄 OnboardingContext: Error fetching tour state:', error);
          // Ignore error, tourState will remain undefined
        }
      }
    })();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Method to sync tourState from backend
  const syncWithTourState = async () => {
    try {
      const response = await apiClient.getTourState();
      if (response.success && response.data) {
        setState(prev => ({ ...prev, tourState: response.data }));
      }
    } catch (error) {
      // Ignore error
    }
  };

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
  const startTour = async () => {
    try {
      const response = await apiClient.updateTourState({
        currentStep: 0,
        totalSteps: 3,
        isActive: true,
        completedSteps: [],
        dismissed: false,
        lastShown: new Date().toISOString(),
      });
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          currentTourStep: 0,
          tourState: response.data
        }));
      }
    } catch (error) {
      console.error('Failed to start tour:', error);
    }
  };

  // Complete guided tour
  const completeTour = async () => {
    try {
      const response = await apiClient.updateTourState({
        currentStep: 0,
        totalSteps: 3,
        isActive: false,
        completedSteps: [0, 1, 2], // Mark all steps as completed
        dismissed: false,
        lastShown: new Date().toISOString(),
      });
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          currentTourStep: 0,
          tourState: response.data
        }));
      }
    } catch (error) {
      console.error('Failed to complete tour:', error);
    }
  };

  // Next tour step
  const nextTourStep = async () => {
    const nextStep = Math.min(state.currentTourStep + 1, state.tourSteps.length - 1);
    try {
      const response = await apiClient.updateTourState({
        currentStep: nextStep,
        totalSteps: 3,
        isActive: true,
        completedSteps: Array.from({ length: nextStep }, (_, i) => i), // Mark previous steps as completed
        dismissed: false,
        lastShown: new Date().toISOString(),
      });
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          currentTourStep: nextStep,
          tourState: response.data
        }));
      }
    } catch (error) {
      console.error('Failed to update tour step:', error);
      // Fallback to local state update
      setState(prev => ({ 
        ...prev, 
        currentTourStep: nextStep
      }));
    }
  };

  // Previous tour step
  const previousTourStep = async () => {
    const prevStep = Math.max(state.currentTourStep - 1, 0);
    try {
      const response = await apiClient.updateTourState({
        currentStep: prevStep,
        totalSteps: 3,
        isActive: true,
        completedSteps: Array.from({ length: prevStep }, (_, i) => i),
        dismissed: false,
        lastShown: new Date().toISOString(),
      });
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          currentTourStep: prevStep,
          tourState: response.data
        }));
      }
    } catch (error) {
      console.error('Failed to update tour step:', error);
      // Fallback to local state update
      setState(prev => ({ 
        ...prev, 
        currentTourStep: prevStep
      }));
    }
  };

  // Skip tour
  const skipTour = async () => {
    try {
      const response = await apiClient.updateTourState({
        currentStep: 0,
        totalSteps: 3,
        isActive: false,
        completedSteps: [],
        dismissed: true,
        lastShown: new Date().toISOString(),
      });
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          currentTourStep: 0,
          tourState: response.data
        }));
      }
    } catch (error) {
      console.error('Failed to skip tour:', error);
    }
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
        onboardingCompletedAt: userData.onboardingCompletedAt || userData.onboarding_completed_at
      });
      
      // Map database fields to context fields
      const onboardingStage = userData.onboardingStage || userData.onboarding_stage;
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
    syncWithTourState,
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
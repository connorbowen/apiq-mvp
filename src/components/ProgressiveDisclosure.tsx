/**
 * TODO: UX SIMPLIFICATION - PROGRESSIVE DISCLOSURE PHASE 2.2 IMPLEMENTATION - @connorbowen 2024-12-19
 * 
 * PHASE 2.2: Implement progressive disclosure
 * - [ ] Create ProgressiveDisclosure component
 * - [ ] Show/hide features based on onboarding stage
 * - [ ] Integrate with OnboardingContext
 * - [ ] Add smooth transitions for feature reveals
 * - [ ] Add tests: tests/unit/components/ProgressiveDisclosure.test.tsx
 * - [ ] Add tests: tests/e2e/onboarding/user-journey.test.ts - test progressive disclosure
 * 
 * PHASE 2.4: Guided tour integration
 * - [ ] Add tour step highlighting
 * - [ ] Integrate with guided tour flow
 * - [ ] Add tests: tests/unit/components/ProgressiveDisclosure.test.tsx - test tour integration
 * 
 * PHASE 3.1: Mobile optimization
 * - [ ] Optimize progressive disclosure for mobile
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test mobile progressive disclosure
 * 
 * IMPLEMENTATION NOTES:
 * - Create wrapper component for progressive feature display
 * - Support feature unlocking based on user actions
 * - Add smooth animations for feature reveals
 * - Ensure accessibility during transitions
 * - Support both immediate and gradual feature reveals
 */

'use client';

import React, { ReactNode } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';

interface ProgressiveDisclosureProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
  showImmediately?: boolean;
  className?: string;
}

export default function ProgressiveDisclosure({ 
  children, 
  feature, 
  fallback, 
  showImmediately = false,
  className = '' 
}: ProgressiveDisclosureProps) {
  const { isFeatureAvailable } = useOnboarding();
  
  const isAvailable = isFeatureAvailable(feature);
  
  if (showImmediately || isAvailable) {
    return (
      <div className={`progressive-disclosure ${className}`}>
        {children}
      </div>
    );
  }
  
  if (fallback) {
    return (
      <div className={`progressive-disclosure-fallback ${className}`}>
        {fallback}
      </div>
    );
  }
  
  return null;
}

// Higher-order component for progressive disclosure
export function withProgressiveDisclosure<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string,
  fallback?: ReactNode
) {
  return function ProgressiveDisclosureWrapper(props: P) {
    return (
      <ProgressiveDisclosure feature={feature} fallback={fallback}>
        <WrappedComponent {...props} />
      </ProgressiveDisclosure>
    );
  };
} 
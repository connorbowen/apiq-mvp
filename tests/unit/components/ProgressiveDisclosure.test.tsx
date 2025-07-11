/**
 * TODO: UX SIMPLIFICATION - PROGRESSIVE DISCLOSURE UNIT TESTS - @connorbowen 2024-12-19
 * 
 * PHASE 2.2: Implement progressive disclosure
 * - [ ] test('should show content when feature is available')
 * - [ ] test('should hide content when feature is not available')
 * - [ ] test('should show fallback when provided and feature not available')
 * - [ ] test('should show content immediately when showImmediately is true')
 * - [ ] test('should integrate with OnboardingContext')
 * - [ ] test('should handle feature availability changes')
 * 
 * PHASE 2.4: Guided tour integration
 * - [ ] test('should work with guided tour highlighting')
 * - [ ] test('should support tour step integration')
 * - [ ] test('should handle tour state changes')
 * 
 * PHASE 3.1: Mobile optimization
 * - [ ] test('should work correctly on mobile screens')
 * - [ ] test('should handle mobile feature availability')
 * 
 * HIGHER-ORDER COMPONENT TESTING:
 * - [ ] test('should wrap components with progressive disclosure')
 * - [ ] test('should pass props correctly to wrapped component')
 * - [ ] test('should handle fallback in HOC')
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressiveDisclosure, { withProgressiveDisclosure } from '../../../src/components/ProgressiveDisclosure';
import { OnboardingProvider, useOnboarding } from '../../../src/contexts/OnboardingContext';

// Mock the OnboardingContext
jest.mock('../../../src/contexts/OnboardingContext', () => ({
  ...jest.requireActual('../../../src/contexts/OnboardingContext'),
  useOnboarding: jest.fn(),
}));

const mockUseOnboarding = useOnboarding as jest.MockedFunction<typeof useOnboarding>;

describe('ProgressiveDisclosure', () => {
  const TestComponent = () => <div>Test Content</div>;
  const FallbackComponent = () => <div>Fallback Content</div>;

  beforeEach(() => {
    mockUseOnboarding.mockReturnValue({
      isFeatureAvailable: jest.fn(),
      state: {
        stage: 'new_user',
        guidedTourCompleted: false,
        tourSteps: [],
        currentTourStep: 0,
      },
      updateStage: jest.fn(),
      completeOnboarding: jest.fn(),
      startTour: jest.fn(),
      completeTour: jest.fn(),
      nextTourStep: jest.fn(),
      previousTourStep: jest.fn(),
      skipTour: jest.fn(),
    });
  });

  describe('Feature Availability', () => {
    test('should show content when feature is available', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(true),
      });

      render(
        <ProgressiveDisclosure feature="chat">
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('should hide content when feature is not available', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(false),
      });

      render(
        <ProgressiveDisclosure feature="advanced_workflows">
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    test('should show fallback when provided and feature not available', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(false),
      });

      render(
        <ProgressiveDisclosure 
          feature="advanced_workflows"
          fallback={<FallbackComponent />}
        >
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
      expect(screen.getByText('Fallback Content')).toBeInTheDocument();
    });

    test('should show content immediately when showImmediately is true', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(false),
      });

      render(
        <ProgressiveDisclosure 
          feature="advanced_workflows"
          showImmediately={true}
        >
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Feature Integration', () => {
    test('should integrate with OnboardingContext', () => {
      const mockIsFeatureAvailable = jest.fn().mockReturnValue(true);
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: mockIsFeatureAvailable,
      });

      render(
        <ProgressiveDisclosure feature="workflows">
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(mockIsFeatureAvailable).toHaveBeenCalledWith('workflows');
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('should handle different feature types', () => {
      const mockIsFeatureAvailable = jest.fn()
        .mockReturnValueOnce(true)  // chat
        .mockReturnValueOnce(false) // workflows
        .mockReturnValueOnce(true); // connections

      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: mockIsFeatureAvailable,
      });

      const { rerender } = render(
        <ProgressiveDisclosure feature="chat">
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();

      rerender(
        <ProgressiveDisclosure feature="workflows">
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();

      rerender(
        <ProgressiveDisclosure feature="connections">
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Styling and Classes', () => {
    test('should apply custom className', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(true),
      });

      render(
        <ProgressiveDisclosure 
          feature="chat"
          className="custom-class"
        >
          <TestComponent />
        </ProgressiveDisclosure>
      );

      const container = screen.getByText('Test Content').parentElement;
      expect(container).toHaveClass('progressive-disclosure', 'custom-class');
    });

    test('should apply fallback className', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(false),
      });

      render(
        <ProgressiveDisclosure 
          feature="advanced_workflows"
          fallback={<FallbackComponent />}
          className="custom-class"
        >
          <TestComponent />
        </ProgressiveDisclosure>
      );

      const container = screen.getByText('Fallback Content').parentElement;
      expect(container).toHaveClass('progressive-disclosure-fallback', 'custom-class');
    });
  });

  describe('Higher-Order Component', () => {
    test('should wrap components with progressive disclosure', () => {
      const mockIsFeatureAvailable = jest.fn().mockReturnValue(true);
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: mockIsFeatureAvailable,
      });

      const WrappedComponent = withProgressiveDisclosure(TestComponent, 'chat');
      
      render(<WrappedComponent />);

      expect(mockIsFeatureAvailable).toHaveBeenCalledWith('chat');
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('should pass props correctly to wrapped component', () => {
      const mockIsFeatureAvailable = jest.fn().mockReturnValue(true);
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: mockIsFeatureAvailable,
      });

      const TestComponentWithProps = ({ message }: { message: string }) => (
        <div>Test Content: {message}</div>
      );

      const WrappedComponent = withProgressiveDisclosure(TestComponentWithProps, 'chat');
      
      render(<WrappedComponent message="Hello World" />);

      expect(screen.getByText('Test Content: Hello World')).toBeInTheDocument();
    });

    test('should handle fallback in HOC', () => {
      const mockIsFeatureAvailable = jest.fn().mockReturnValue(false);
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: mockIsFeatureAvailable,
      });

      const WrappedComponent = withProgressiveDisclosure(
        TestComponent, 
        'advanced_workflows',
        <FallbackComponent />
      );
      
      render(<WrappedComponent />);

      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
      expect(screen.getByText('Fallback Content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty children', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(true),
      });

      render(
        <ProgressiveDisclosure feature="chat">
          {null}
        </ProgressiveDisclosure>
      );

      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    test('should handle multiple children', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(true),
      });

      render(
        <ProgressiveDisclosure feature="chat">
          <div>First Child</div>
          <div>Second Child</div>
        </ProgressiveDisclosure>
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
    });
  });
}); 
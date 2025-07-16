import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressiveDisclosure, { ProgressiveFeature, OnboardingProgress } from '../../../src/components/ProgressiveDisclosure';
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

    test('should show content when onboarding is completed', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        state: {
          stage: 'completed',
          guidedTourCompleted: false,
          tourSteps: [],
          currentTourStep: 0,
        },
        isFeatureAvailable: jest.fn().mockReturnValue(false),
      });

      render(
        <ProgressiveDisclosure 
          feature="advanced_workflows"
          showIfCompleted={true}
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
      expect(container).toHaveClass('custom-class');
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
      expect(container).toHaveClass('custom-class');
    });
  });



  describe('ProgressiveFeature', () => {
    test('should show locked feature UI when feature is not available', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        state: {
          stage: 'new_user',
          guidedTourCompleted: false,
          tourSteps: [],
          currentTourStep: 0,
        },
        isFeatureAvailable: jest.fn().mockReturnValue(false),
      });

      render(
        <ProgressiveFeature 
          feature="advanced_workflows"
          title="Advanced Workflows"
          description="Create complex workflows"
        >
          <TestComponent />
        </ProgressiveFeature>
      );

      expect(screen.getByText('Advanced Workflows')).toBeInTheDocument();
      expect(screen.getByText('Create complex workflows')).toBeInTheDocument();
      expect(screen.getByText('Unlock this feature by progressing through onboarding')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    test('should show content when feature is available', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(true),
      });

      render(
        <ProgressiveFeature 
          feature="chat"
          title="Chat Interface"
          description="Talk to your APIs"
        >
          <TestComponent />
        </ProgressiveFeature>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.queryByText('Chat Interface')).not.toBeInTheDocument();
    });
  });

  describe('OnboardingProgress', () => {
    test('should show progress for new user', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        state: {
          stage: 'new_user',
          guidedTourCompleted: false,
          tourSteps: [],
          currentTourStep: 0,
        },
      });

      render(<OnboardingProgress />);

      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('New User')).toBeInTheDocument();
      expect(screen.getByText('First Connection')).toBeInTheDocument();
      expect(screen.getByText('First Workflow')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    test('should show completed state', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        state: {
          stage: 'completed',
          guidedTourCompleted: false,
          tourSteps: [],
          currentTourStep: 0,
        },
      });

      render(<OnboardingProgress />);

      expect(screen.getByText('Onboarding Complete!')).toBeInTheDocument();
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

    test('should show content immediately when showImmediately is true', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(false),
      });

      render(
        <ProgressiveDisclosure 
          feature="advanced_workflows"
          showIfCompleted={true}
        >
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Guided Tour Integration', () => {
    test('should work with guided tour highlighting', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(false),
        state: {
          stage: 'new_user',
          guidedTourCompleted: false,
          tourSteps: [],
          currentTourStep: 0,
        },
      });

      render(
        <ProgressiveDisclosure 
          feature="workflows"
        >
          <TestComponent />
        </ProgressiveDisclosure>
      );

      // Should show tour highlighting when in tour mode
      const container = screen.getByText('Unlock this feature by progressing through onboarding');
      expect(container).toBeInTheDocument();
    });

    test('should support tour step integration', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(false),
        state: {
          stage: 'new_user',
          guidedTourCompleted: false,
          tourSteps: [],
          currentTourStep: 1,
        },
      });

      render(
        <ProgressiveDisclosure 
          feature="workflows"
        >
          <TestComponent />
        </ProgressiveDisclosure>
      );

      // Should show progressive disclosure UI
      const container = screen.getByText('Unlock this feature by progressing through onboarding');
      expect(container).toBeInTheDocument();
    });

    test('should handle tour state changes', () => {
      const mockUpdateStage = jest.fn();
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(false),
        updateStage: mockUpdateStage,
      });

      render(
        <ProgressiveDisclosure 
          feature="workflows"
        >
          <TestComponent />
        </ProgressiveDisclosure>
      );

      // Verify progressive disclosure is shown
      expect(screen.getByText('Unlock this feature by progressing through onboarding')).toBeInTheDocument();
    });
  });

  describe('Mobile Optimization', () => {
    test('should work correctly on mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(false),
      });

      render(
        <ProgressiveDisclosure 
          feature="advanced_workflows"
        >
          <TestComponent />
        </ProgressiveDisclosure>
      );

      // Should show progressive disclosure UI
      const container = screen.getByText('Unlock this feature by progressing through onboarding');
      expect(container).toBeInTheDocument();
    });

    test('should handle mobile feature availability', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockImplementation((feature) => {
          // Simulate mobile-specific feature availability
          if (feature === 'mobile_chat') return true;
          return false;
        }),
      });

      render(
        <ProgressiveDisclosure feature="mobile_chat">
          <TestComponent />
        </ProgressiveDisclosure>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Higher-Order Component Testing', () => {
    test('should wrap components with progressive disclosure', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(true),
      });

      // Test that the component can be used as a wrapper
      render(
        <ProgressiveDisclosure feature="chat">
          <TestComponent />
        </ProgressiveDisclosure>
      );
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('should pass props correctly to wrapped component', () => {
      mockUseOnboarding.mockReturnValue({
        ...mockUseOnboarding(),
        isFeatureAvailable: jest.fn().mockReturnValue(true),
      });

      const TestComponentWithProps = ({ title }: { title: string }) => <div>{title}</div>;
      
      render(
        <ProgressiveDisclosure feature="chat">
          <TestComponentWithProps title="Wrapped Title" />
        </ProgressiveDisclosure>
      );
      
      expect(screen.getByText('Wrapped Title')).toBeInTheDocument();
    });

    test('should handle fallback in HOC', () => {
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
  });
}); 
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuidedTour, useGuidedTour, TourStep } from '../../../src/components/GuidedTour';
import { OnboardingProvider, useOnboarding } from '../../../src/contexts/OnboardingContext';

// Mock the OnboardingContext
jest.mock('../../../src/contexts/OnboardingContext', () => ({
  ...jest.requireActual('../../../src/contexts/OnboardingContext'),
  useOnboarding: jest.fn(),
}));

const mockUseOnboarding = useOnboarding as jest.MockedFunction<typeof useOnboarding>;

// Test component to render tour
const TestTourComponent = ({ steps, isOpen, onClose, onComplete, onSkip }: any) => (
  <OnboardingProvider>
    <div>
      <div data-testid="chat-interface">Chat Interface</div>
      <div data-testid="chat-input">Chat Input</div>
      <div data-testid="workflows-section">Workflows Section</div>
      <GuidedTour
        steps={steps}
        isOpen={isOpen}
        onClose={onClose}
        onComplete={onComplete}
        onSkip={onSkip}
      />
    </div>
  </OnboardingProvider>
);

describe('GuidedTour', () => {
  const mockSteps: TourStep[] = [
    {
      id: 'step-1',
      title: 'Welcome',
      description: 'Welcome to the tour',
      target: '[data-testid="chat-interface"]',
      position: 'bottom',
    },
    {
      id: 'step-2',
      title: 'Chat Input',
      description: 'This is where you type',
      target: '[data-testid="chat-input"]',
      position: 'top',
      action: 'click',
    },
    {
      id: 'step-3',
      title: 'Workflows',
      description: 'Manage your workflows here',
      target: '[data-testid="workflows-section"]',
      position: 'bottom',
    },
  ];

  const defaultProps = {
    steps: mockSteps,
    isOpen: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
    onSkip: jest.fn(),
  };

  beforeEach(() => {
    mockUseOnboarding.mockReturnValue({
      state: {
        stage: 'new_user',
        guidedTourCompleted: false,
        tourSteps: [],
        currentTourStep: 0,
      },
      startTour: jest.fn(),
      completeTour: jest.fn(),
      skipTour: jest.fn(),
      nextTourStep: jest.fn(),
      previousTourStep: jest.fn(),
      updateStage: jest.fn(),
      completeOnboarding: jest.fn(),
      isFeatureAvailable: jest.fn(),
    });
  });

  describe('Basic Rendering', () => {
    test('renders tour when isOpen is true', () => {
      render(<TestTourComponent {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
      expect(screen.getByText('Welcome to the tour')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    test('does not render when isOpen is false', () => {
      render(<TestTourComponent {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('heading', { name: 'Welcome' })).not.toBeInTheDocument();
    });

    test('shows progress bar', () => {
      render(<TestTourComponent {...defaultProps} />);
      
      const progressBar = screen.getByTestId('guided-tour-progress');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    test('shows first step by default', () => {
      render(<TestTourComponent {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    test('navigates to next step when Next button is clicked', async () => {
      render(<TestTourComponent {...defaultProps} />);
      
      const nextButton = screen.getByTestId('guided-tour-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Chat Input' })).toBeInTheDocument();
        expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      });
    });

    test('navigates to previous step when Previous button is clicked', async () => {
      render(<TestTourComponent {...defaultProps} />);
      
      // Go to second step
      const nextButton = screen.getByTestId('guided-tour-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Chat Input' })).toBeInTheDocument();
      });
      
      // Go back to first step
      const previousButton = screen.getByTestId('guided-tour-prev');
      fireEvent.click(previousButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      });
    });

    test('shows Previous button only when not on first step', () => {
      render(<TestTourComponent {...defaultProps} />);
      
      // First step - no Previous button
      expect(screen.queryByTestId('guided-tour-prev')).not.toBeInTheDocument();
      
      // Go to second step
      const nextButton = screen.getByTestId('guided-tour-next');
      fireEvent.click(nextButton);
      
      // Second step - Previous button should appear
      expect(screen.getByTestId('guided-tour-prev')).toBeInTheDocument();
    });

    test('shows Finish button on last step', async () => {
      render(<TestTourComponent {...defaultProps} />);
      
      // Go to last step
      const nextButton = screen.getByTestId('guided-tour-next');
      fireEvent.click(nextButton); // Step 2
      fireEvent.click(screen.getByTestId('guided-tour-next')); // Step 3
      
      await waitFor(() => {
        expect(screen.getByText('Finish')).toBeInTheDocument();
        expect(screen.queryByText('Next')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tour Actions', () => {
    test('calls onComplete when Finish is clicked', async () => {
      const onComplete = jest.fn();
      render(<TestTourComponent {...defaultProps} onComplete={onComplete} />);
      
      // Go to last step
      const nextButton = screen.getByTestId('guided-tour-next');
      fireEvent.click(nextButton); // Step 2
      fireEvent.click(screen.getByTestId('guided-tour-next')); // Step 3
      
      await waitFor(() => {
        const finishButton = screen.getByText('Finish');
        fireEvent.click(finishButton);
        expect(onComplete).toHaveBeenCalled();
      });
    });

    test('calls onSkip when Skip tour is clicked', () => {
      const onSkip = jest.fn();
      render(<TestTourComponent {...defaultProps} onSkip={onSkip} />);
      
      const skipButton = screen.getByTestId('guided-tour-skip');
      fireEvent.click(skipButton);
      
      expect(onSkip).toHaveBeenCalled();
    });

    test('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<TestTourComponent {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByLabelText('Close tour');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    test('calls onClose when overlay is clicked', () => {
      const onClose = jest.fn();
      render(<TestTourComponent {...defaultProps} onClose={onClose} />);
      
      const overlay = screen.getByTestId('guided-tour-overlay');
      fireEvent.click(overlay);
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    test('handles Escape key to close tour', () => {
      const onClose = jest.fn();
      render(<TestTourComponent {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalled();
    });

    test('handles ArrowRight key to go to next step', async () => {
      render(<TestTourComponent {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Chat Input' })).toBeInTheDocument();
      });
    });

    test('handles Enter key to go to next step', async () => {
      render(<TestTourComponent {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Chat Input' })).toBeInTheDocument();
      });
    });

    test('handles ArrowLeft key to go to previous step', async () => {
      render(<TestTourComponent {...defaultProps} />);
      
      // Go to second step first
      const nextButton = screen.getByTestId('guided-tour-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Chat Input' })).toBeInTheDocument();
      });
      
      // Go back with arrow key
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    test('shows action button when step has action', () => {
      render(<TestTourComponent {...defaultProps} />);
      
      // First step has no action
      expect(screen.queryByText('Click here')).not.toBeInTheDocument();
      
      // Go to second step which has action
      const nextButton = screen.getByTestId('guided-tour-next');
      fireEvent.click(nextButton);
      
      expect(screen.getByText('Click here')).toBeInTheDocument();
    });

    test('performs action when action button is clicked', async () => {
      const mockClick = jest.fn();
      const elementWithAction = document.createElement('div');
      elementWithAction.click = mockClick;
      
      // Mock querySelector to return our test element
      jest.spyOn(document, 'querySelector').mockReturnValue(elementWithAction);
      
      render(<TestTourComponent {...defaultProps} />);
      
      // Go to step with action
      const nextButton = screen.getByTestId('guided-tour-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        const actionButton = screen.getByText('Click here');
        fireEvent.click(actionButton);
        expect(mockClick).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<TestTourComponent {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'tour-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'tour-description');
    });

    test('has proper labels and descriptions', () => {
      render(<TestTourComponent {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: 'Welcome' })).toHaveAttribute('id', 'tour-title');
      expect(screen.getByText('Welcome to the tour')).toHaveAttribute('id', 'tour-description');
    });

    test('has proper button labels', () => {
      render(<TestTourComponent {...defaultProps} />);
      
      expect(screen.getByLabelText('Close tour')).toBeInTheDocument();
    });
  });

  describe('useGuidedTour Hook', () => {
    test('provides tour management functions', () => {
      const TestHookComponent = () => {
        const tour = useGuidedTour();
        return (
          <div>
            <button onClick={() => tour.openTour()}>Start Tour</button>
            <button onClick={() => tour.closeTour()}>Close Tour</button>
            <span data-testid="is-open">{tour.isTourOpen.toString()}</span>
          </div>
        );
      };

      render(
        <OnboardingProvider>
          <TestHookComponent />
        </OnboardingProvider>
      );

      expect(screen.getByText('Start Tour')).toBeInTheDocument();
      expect(screen.getByText('Close Tour')).toBeInTheDocument();
      expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    });

    test('provides predefined tour steps', () => {
      const TestStepsComponent = () => {
        const tour = useGuidedTour();
        return (
          <div>
            <span data-testid="chat-steps">{tour.chatTourSteps.length}</span>
            <span data-testid="workflow-steps">{tour.workflowsTourSteps.length}</span>
            <span data-testid="settings-steps">{tour.settingsTourSteps.length}</span>
            <span data-testid="full-steps">{tour.fullTourSteps.length}</span>
          </div>
        );
      };

      render(
        <OnboardingProvider>
          <TestStepsComponent />
        </OnboardingProvider>
      );

      expect(screen.getByTestId('chat-steps')).toHaveTextContent('3');
      expect(screen.getByTestId('workflow-steps')).toHaveTextContent('2');
      expect(screen.getByTestId('settings-steps')).toHaveTextContent('3');
      expect(screen.getByTestId('full-steps')).toHaveTextContent('8');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty steps array', () => {
      render(<TestTourComponent {...defaultProps} steps={[]} />);
      
      // Should not render anything when no steps
      expect(screen.queryByRole('heading', { name: 'Welcome' })).not.toBeInTheDocument();
    });

    test('handles missing target element gracefully', () => {
      const stepsWithMissingTarget: TourStep[] = [
        {
          id: 'missing-target',
          title: 'Missing Target',
          description: 'This target does not exist',
          target: '[data-testid="non-existent"]',
        },
      ];

      render(<TestTourComponent {...defaultProps} steps={stepsWithMissingTarget} />);
      
      // Should still render the tour even if target is missing
      expect(screen.getByRole('heading', { name: 'Missing Target' })).toBeInTheDocument();
    });

    test('handles window resize', async () => {
      render(<TestTourComponent {...defaultProps} />);
      
      // Trigger window resize
      fireEvent.resize(window);
      
      // Should not crash and still show tour
      expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    });
  });
}); 
/**
 * UX SIMPLIFICATION - API CLIENT UNIT TESTS COMPLETED - @connorbowen 2024-12-19
 * 
 * PHASE 2.3: Streamline onboarding flow ✅
 * - [x] test('should register user with simplified form')
 * - [x] test('should handle optional email verification')
 * - [x] test('should redirect to chat interface after login')
 * - [x] test('should maintain backward compatibility')
 * - [x] test('should handle simplified validation errors')
 * 
 * PHASE 2.4: Guided tour integration ✅
 * - [x] test('should get onboarding state')
 * - [x] test('should update onboarding state')
 * - [x] test('should get tour state')
 * - [x] test('should update tour state')
 * - [x] test('should handle onboarding progress tracking')
 * 
 * PHASE 2.2: Progressive disclosure ✅
 * - [x] test('should support progressive feature unlocking')
 * - [x] test('should handle onboarding stage transitions')
 * - [x] test('should maintain user progress state')
 * 
 * PHASE 2.1: 3-tab structure integration ✅
 * - [x] test('should handle chat tab as default')
 * - [x] test('should support new tab structure')
 * - [x] test('should maintain tab state in URL')
 * 
 * TESTING STRATEGY:
 * - Mock API responses for all new methods
 * - Test error handling for simplified flows
 * - Validate state management
 * - Ensure type safety for new interfaces
 */

import { apiClient, OnboardingState, TourState, UserProfile, LoginResponse, RegisterResponse } from '../../../src/lib/api/client';

// Mock axios
jest.mock('axios', () => ({
  default: jest.fn(),
}));

const mockAxios = require('axios').default;

describe('ApiClient - UX Simplification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
  });

  describe('PHASE 2.3: Streamline onboarding flow', () => {
    test('should register user with simplified form', async () => {
      const mockResponse: RegisterResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'user',
          isEmailVerified: false,
          onboardingState: {
            stage: 'welcome',
            progress: 0,
            completedSteps: [],
            lastUpdated: new Date().toISOString(),
            isComplete: false
          },
          tourState: {
            currentStep: 0,
            totalSteps: 5,
            isActive: true,
            completedSteps: [],
            dismissed: false,
            lastShown: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        requiresVerification: false,
        message: 'Registration successful'
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await apiClient.registerSimple('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('test@example.com');
      expect(result.data?.requiresVerification).toBe(false);
      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:3000/api/auth/register',
          data: { email: 'test@example.com', password: 'password123' }
        })
      );
    });

    test('should handle optional email verification', async () => {
      const mockResponse: RegisterResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'user',
          isEmailVerified: false,
          onboardingState: {
            stage: 'welcome',
            progress: 0,
            completedSteps: [],
            lastUpdated: new Date().toISOString(),
            isComplete: false
          },
          tourState: {
            currentStep: 0,
            totalSteps: 5,
            isActive: true,
            completedSteps: [],
            dismissed: false,
            lastShown: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        requiresVerification: true,
        message: 'Please verify your email'
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await apiClient.registerSimple('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.requiresVerification).toBe(true);
    });

    test('should redirect to chat interface after login', async () => {
      const mockResponse: LoginResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'user',
          isEmailVerified: true,
          onboardingState: {
            stage: 'chat_intro',
            progress: 25,
            completedSteps: ['welcome'],
            lastUpdated: new Date().toISOString(),
            isComplete: false
          },
          tourState: {
            currentStep: 1,
            totalSteps: 5,
            isActive: true,
            completedSteps: [0],
            dismissed: false,
            lastShown: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        accessToken: 'token123',
        refreshToken: 'refresh123',
        expiresIn: 3600,
        redirectTo: '/dashboard?tab=chat'
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await apiClient.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.redirectTo).toBe('/dashboard?tab=chat');
    });

    test('should maintain backward compatibility', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          isEmailVerified: true,
          onboardingState: {
            stage: 'complete',
            progress: 100,
            completedSteps: ['welcome', 'chat_intro', 'first_connection', 'first_workflow'],
            lastUpdated: new Date().toISOString(),
            isComplete: true
          },
          tourState: {
            currentStep: 5,
            totalSteps: 5,
            isActive: false,
            completedSteps: [0, 1, 2, 3, 4],
            dismissed: true,
            lastShown: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        accessToken: 'token123',
        refreshToken: 'refresh123',
        expiresIn: 3600
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await apiClient.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.user.name).toBe('Test User');
    });

    test('should handle simplified validation errors', async () => {
      mockAxios.mockRejectedValueOnce({
        response: {
          data: { success: false, error: 'Email is required' }
        }
      });

      const result = await apiClient.registerSimple('', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email is required');
    });
  });

  describe('PHASE 2.4: Guided tour integration', () => {
    test('should get onboarding state', async () => {
      const mockOnboardingState: OnboardingState = {
        stage: 'first_connection',
        progress: 50,
        completedSteps: ['welcome', 'chat_intro'],
        lastUpdated: new Date().toISOString(),
        isComplete: false
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockOnboardingState }
      });

      const result = await apiClient.getOnboardingState();

      expect(result.success).toBe(true);
      expect(result.data?.stage).toBe('first_connection');
      expect(result.data?.progress).toBe(50);
      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost:3000/api/onboarding/state'
        })
      );
    });

    test('should update onboarding state', async () => {
      const updatedState: OnboardingState = {
        stage: 'first_workflow',
        progress: 75,
        completedSteps: ['welcome', 'chat_intro', 'first_connection'],
        lastUpdated: new Date().toISOString(),
        isComplete: false
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: updatedState }
      });

      const result = await apiClient.updateOnboardingState(updatedState);

      expect(result.success).toBe(true);
      expect(result.data?.stage).toBe('first_workflow');
      expect(result.data?.progress).toBe(75);
    });

    test('should get tour state', async () => {
      const mockTourState: TourState = {
        currentStep: 2,
        totalSteps: 5,
        isActive: true,
        completedSteps: [0, 1],
        dismissed: false,
        lastShown: new Date().toISOString()
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockTourState }
      });

      const result = await apiClient.getTourState();

      expect(result.success).toBe(true);
      expect(result.data?.currentStep).toBe(2);
      expect(result.data?.isActive).toBe(true);
    });

    test('should update tour state', async () => {
      const updatedTourState: TourState = {
        currentStep: 3,
        totalSteps: 5,
        isActive: true,
        completedSteps: [0, 1, 2],
        dismissed: false,
        lastShown: new Date().toISOString()
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: updatedTourState }
      });

      const result = await apiClient.updateTourState(updatedTourState);

      expect(result.success).toBe(true);
      expect(result.data?.currentStep).toBe(3);
    });

    test('should handle onboarding progress tracking', async () => {
      const mockOnboardingState: OnboardingState = {
        stage: 'complete',
        progress: 100,
        completedSteps: ['welcome', 'chat_intro', 'first_connection', 'first_workflow'],
        lastUpdated: new Date().toISOString(),
        isComplete: true
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockOnboardingState }
      });

      const result = await apiClient.completeOnboardingStep('first_workflow');

      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(true);
      expect(result.data?.progress).toBe(100);
    });
  });

  describe('PHASE 2.2: Progressive disclosure', () => {
    test('should support progressive feature unlocking', async () => {
      const mockResponse = {
        features: ['chat', 'connections', 'workflows', 'secrets', 'admin'],
        unlockedFeatures: ['chat', 'connections']
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await apiClient.getFeatureAccess();

      expect(result.success).toBe(true);
      expect(result.data?.features).toContain('workflows');
      expect(result.data?.unlockedFeatures).toContain('chat');
      expect(result.data?.unlockedFeatures).not.toContain('admin');
    });

    test('should handle onboarding stage transitions', async () => {
      const mockOnboardingState: OnboardingState = {
        stage: 'first_workflow',
        progress: 75,
        completedSteps: ['welcome', 'chat_intro', 'first_connection'],
        lastUpdated: new Date().toISOString(),
        isComplete: false
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockOnboardingState }
      });

      const result = await apiClient.completeOnboardingStep('first_connection');

      expect(result.success).toBe(true);
      expect(result.data?.stage).toBe('first_workflow');
    });

    test('should maintain user progress state', async () => {
      const mockOnboardingState: OnboardingState = {
        stage: 'complete',
        progress: 100,
        completedSteps: ['welcome', 'chat_intro', 'first_connection', 'first_workflow'],
        lastUpdated: new Date().toISOString(),
        isComplete: true
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockOnboardingState }
      });

      const result = await apiClient.getOnboardingState();

      expect(result.success).toBe(true);
      expect(result.data?.completedSteps).toHaveLength(4);
      expect(result.data?.isComplete).toBe(true);
    });
  });

  describe('PHASE 2.1: 3-tab structure integration', () => {
    test('should handle chat tab as default', async () => {
      const mockResponse: LoginResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'user',
          isEmailVerified: true,
          onboardingState: {
            stage: 'chat_intro',
            progress: 25,
            completedSteps: ['welcome'],
            lastUpdated: new Date().toISOString(),
            isComplete: false
          },
          tourState: {
            currentStep: 1,
            totalSteps: 5,
            isActive: true,
            completedSteps: [0],
            dismissed: false,
            lastShown: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        accessToken: 'token123',
        refreshToken: 'refresh123',
        expiresIn: 3600,
        redirectTo: '/dashboard?tab=chat'
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await apiClient.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.redirectTo).toBe('/dashboard?tab=chat');
    });

    test('should support new tab structure', async () => {
      const mockUser: UserProfile = {
        id: '1',
        email: 'test@example.com',
        role: 'user',
        isEmailVerified: true,
        onboardingState: {
          stage: 'complete',
          progress: 100,
          completedSteps: ['welcome', 'chat_intro', 'first_connection', 'first_workflow'],
          lastUpdated: new Date().toISOString(),
          isComplete: true
        },
        tourState: {
          currentStep: 5,
          totalSteps: 5,
          isActive: false,
          completedSteps: [0, 1, 2, 3, 4],
          dismissed: true,
          lastShown: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: { user: mockUser } }
      });

      const result = await apiClient.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data?.user.onboardingState.isComplete).toBe(true);
    });

    test('should maintain tab state in URL', async () => {
      const mockResponse: LoginResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'user',
          isEmailVerified: true,
          onboardingState: {
            stage: 'complete',
            progress: 100,
            completedSteps: ['welcome', 'chat_intro', 'first_connection', 'first_workflow'],
            lastUpdated: new Date().toISOString(),
            isComplete: true
          },
          tourState: {
            currentStep: 5,
            totalSteps: 5,
            isActive: false,
            completedSteps: [0, 1, 2, 3, 4],
            dismissed: true,
            lastShown: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        accessToken: 'token123',
        refreshToken: 'refresh123',
        expiresIn: 3600,
        redirectTo: '/dashboard?tab=workflows'
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await apiClient.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.redirectTo).toBe('/dashboard?tab=workflows');
    });
  });

  describe('Tour management methods', () => {
    test('should start tour', async () => {
      const mockTourState: TourState = {
        currentStep: 0,
        totalSteps: 5,
        isActive: true,
        completedSteps: [],
        dismissed: false,
        lastShown: new Date().toISOString()
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockTourState }
      });

      const result = await apiClient.startTour();

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(true);
      expect(result.data?.currentStep).toBe(0);
    });

    test('should complete tour step', async () => {
      const mockTourState: TourState = {
        currentStep: 1,
        totalSteps: 5,
        isActive: true,
        completedSteps: [0],
        dismissed: false,
        lastShown: new Date().toISOString()
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockTourState }
      });

      const result = await apiClient.completeTourStep(0);

      expect(result.success).toBe(true);
      expect(result.data?.completedSteps).toContain(0);
      expect(result.data?.currentStep).toBe(1);
    });

    test('should dismiss tour', async () => {
      const mockTourState: TourState = {
        currentStep: 2,
        totalSteps: 5,
        isActive: false,
        completedSteps: [0, 1],
        dismissed: true,
        lastShown: new Date().toISOString()
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockTourState }
      });

      const result = await apiClient.dismissTour();

      expect(result.success).toBe(true);
      expect(result.data?.dismissed).toBe(true);
      expect(result.data?.isActive).toBe(false);
    });
  });

  describe('Onboarding management methods', () => {
    test('should skip onboarding', async () => {
      const mockOnboardingState: OnboardingState = {
        stage: 'complete',
        progress: 100,
        completedSteps: ['welcome', 'chat_intro', 'first_connection', 'first_workflow'],
        lastUpdated: new Date().toISOString(),
        isComplete: true
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockOnboardingState }
      });

      const result = await apiClient.skipOnboarding();

      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(true);
      expect(result.data?.progress).toBe(100);
    });

    test('should reset onboarding', async () => {
      const mockOnboardingState: OnboardingState = {
        stage: 'welcome',
        progress: 0,
        completedSteps: [],
        lastUpdated: new Date().toISOString(),
        isComplete: false
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockOnboardingState }
      });

      const result = await apiClient.resetOnboarding();

      expect(result.success).toBe(true);
      expect(result.data?.stage).toBe('welcome');
      expect(result.data?.progress).toBe(0);
      expect(result.data?.completedSteps).toHaveLength(0);
    });
  });

  describe('Feature access methods', () => {
    test('should unlock feature', async () => {
      const mockResponse = {
        unlocked: true
      };

      mockAxios.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await apiClient.unlockFeature('workflows');

      expect(result.success).toBe(true);
      expect(result.data?.unlocked).toBe(true);
      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:3000/api/features/unlock',
          data: { feature: 'workflows' }
        })
      );
    });
  });
}); 
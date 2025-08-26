// E2E helpers - streamlined version
// Split into focused modules to comply with file size limits

// Re-export from split modules
export type { E2ESetupOptions, TestArtifacts } from './e2eHelpers.setup';
export { 
  setupE2E, 
  loginAndNavigate, 
  closeAllModals, 
  resetRateLimits, 
  cleanupE2E,
  ensureTestIsolation,
  clearUIState,
  cleanupTestConnections,
  completeTestTeardown
} from './e2eHelpers.setup';

export { navigateToUserDropdownItem, navigateToSettings, navigateToProfile, getPrimaryActionButton, navigateWithKeyboard } from './e2eHelpers.navigation';

export { setupGlobalErrorListeners, setupTracing, stopTracing, clearAuthState, retryServerRequest, waitForServerReady } from './e2eHelpers.utils'; 
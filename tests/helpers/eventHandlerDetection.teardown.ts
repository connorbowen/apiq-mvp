/**
 * Event Handler Detection Teardown
 * 
 * Global teardown for event handler conflict detection in E2E tests.
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🔍 Tearing down Event Handler Detection...');
  
  // Clean up environment variables
  delete process.env.EVENT_HANDLER_DETECTION;
  delete process.env.FAIL_ON_CRITICAL_CONFLICTS;
  delete process.env.FAIL_ON_HIGH_CONFLICTS;
  delete process.env.WARN_ON_MEDIUM_CONFLICTS;
  delete process.env.EVENT_HANDLER_LOG_LEVEL;
  
  console.log('✅ Event Handler Detection teardown complete');
}

export default globalTeardown;

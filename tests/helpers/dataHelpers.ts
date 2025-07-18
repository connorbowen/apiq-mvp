// Data helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { TestUser, TestConnection, TestEndpoint } from './testUtils';
import {
  createTestUser,
  createTestConnection,
  createTestEndpoint,
  cleanupTestUser,
  cleanupTestConnection,
  cleanupTestEndpoint,
  cleanupTestUsers,
  cleanupTestConnections,
  createTestWorkflow,
  cleanupTestWorkflow
} from './testUtils';

export interface TestDataOptions {
  userId?: string;
  connectionId?: string;
  workflowId?: string;
  secretId?: string;
  user?: Partial<TestUser>;
  connection?: Partial<TestConnection>;
  workflow?: Partial<{ name: string; description: string; steps: any[] }>;
}

/**
 * Create test data for E2E tests (user, connection, workflow)
 */
export const createTestData = async (options: TestDataOptions = {}): Promise<{
  user?: TestUser;
  connection?: TestConnection;
  workflow?: { id: string; name: string; description: string; userId: string };
}> => {
  let user: TestUser | undefined;
  let connection: TestConnection | undefined;
  let workflow: { id: string; name: string; description: string; userId: string } | undefined;

  if (options.user) {
    user = await createTestUser(
      options.user.email,
      options.user.password,
      options.user.role,
      options.user.name
    );
  }
  if (options.connection && user) {
    connection = await createTestConnection(
      user,
      options.connection.name,
      options.connection.baseUrl,
      options.connection.authType
    );
  }
  if (options.workflow && user) {
    workflow = await createTestWorkflow(
      user,
      options.workflow.name,
      options.workflow.description,
      options.workflow.steps
    );
  }
  return { user, connection, workflow };
};

/**
 * Clean up test data for E2E tests (user, connection, workflow)
 */
export const cleanupTestData = async (options: TestDataOptions = {}): Promise<void> => {
  if (options.workflowId) {
    await cleanupTestWorkflow(options.workflowId);
  }
  if (options.connectionId) {
    await cleanupTestConnection({ id: options.connectionId } as TestConnection);
  }
  if (options.userId) {
    await cleanupTestUser({ id: options.userId } as TestUser);
  }
  // Optionally, add batch cleanup if arrays are provided in the future
};

/**
 * Fill and submit the connection creation form in the UI.
 * Opens the modal, fills all provided fields, and submits the form.
 *
 * @example
 * await createConnectionForm(page, {
 *   name: 'My Connection',
 *   description: 'Test connection',
 *   baseUrl: 'https://api.example.com',
 *   authType: 'API_KEY',
 *   apiKey: 'test-key'
 * });
 */
export const createConnectionForm = async (
  page: import('@playwright/test').Page,
  options: {
    name: string;
    description?: string;
    baseUrl: string;
    authType: 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2';
    apiKey?: string;
    bearerToken?: string;
    username?: string;
    password?: string;
    provider?: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scope?: string;
  }
): Promise<void> => {
  console.log('🪵 createConnectionForm: Starting form creation...');
  
  // Open the create connection modal
  await page.click('[data-testid="primary-action create-connection-header-btn"]');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  console.log('🪵 createConnectionForm: Modal opened');

  // Fill required fields
  await page.fill('[data-testid="connection-name-input"]', options.name);
  if (options.description) {
    await page.fill('[data-testid="connection-description-input"]', options.description);
  }
  await page.fill('[data-testid="connection-baseurl-input"]', options.baseUrl);
  await page.selectOption('[data-testid="connection-authtype-select"]', options.authType);
  console.log('🪵 createConnectionForm: Basic fields filled');

  // Fill auth-specific fields
  if (options.authType === 'API_KEY' && options.apiKey) {
    await page.fill('[data-testid="connection-apikey-input"]', options.apiKey);
    console.log('🪵 createConnectionForm: API key filled');
  }
  if (options.authType === 'BEARER_TOKEN' && options.bearerToken) {
    await page.fill('[data-testid="connection-bearertoken-input"]', options.bearerToken);
    console.log('🪵 createConnectionForm: Bearer token filled');
  }
  if (options.authType === 'BASIC_AUTH') {
    if (options.username) await page.fill('[data-testid="connection-username-input"]', options.username);
    if (options.password) await page.fill('[data-testid="connection-password-input"]', options.password);
    console.log('🪵 createConnectionForm: Basic auth fields filled');
  }
  if (options.authType === 'OAUTH2') {
    if (options.provider) await page.selectOption('[data-testid="connection-provider-select"]', options.provider);
    if (options.clientId) await page.fill('[data-testid="connection-clientid-input"]', options.clientId);
    if (options.clientSecret) await page.fill('[data-testid="connection-clientsecret-input"]', options.clientSecret);
    if (options.redirectUri) await page.fill('[data-testid="connection-redirecturi-input"]', options.redirectUri);
    if (options.scope) await page.fill('[data-testid="connection-scope-input"]', options.scope);
    console.log('🪵 createConnectionForm: OAuth2 fields filled');
  }

  // Wait for any validation to complete and check for errors
  await page.waitForTimeout(500); // Small delay for validation
  
  // Check for validation errors
  const errorElements = await page.locator('[data-testid$="-error"]').all();
  if (errorElements.length > 0) {
    console.log('🪵 createConnectionForm: Validation errors found:');
    for (const error of errorElements) {
      const errorText = await error.textContent();
      console.log('🪵 createConnectionForm: Error:', errorText);
    }
    throw new Error(`Form validation failed: ${errorElements.length} errors found`);
  }

  // Check submit button state before clicking
  const submitButton = page.locator('[data-testid="primary-action submit-connection-btn"]');
  const isEnabled = await submitButton.isEnabled();
  const buttonText = await submitButton.textContent();
  console.log('🪵 createConnectionForm: Submit button state:', { isEnabled, buttonText });
  
  if (!isEnabled) {
    throw new Error('Submit button is disabled - form may not be valid');
  }

  // Submit the form
  console.log('🪵 createConnectionForm: Clicking submit button...');
  await submitButton.click();
  console.log('🪵 createConnectionForm: Submit button clicked');
}; 
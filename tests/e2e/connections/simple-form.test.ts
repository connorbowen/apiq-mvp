import { test, expect } from '../../helpers/serverHealthCheck';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;

test.describe('Simple Form Test', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-simple-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Simple Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'e2eTestPass123');
    await page.click('button[type="submit"]');
    
    // Wait for successful login and redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Navigate to connections tab
    await page.click('[data-testid="tab-connections"]');
  });

  test('should submit form and create connection', async ({ page }) => {
    // Click create connection button
    await page.click('[data-testid="create-connection-btn"]');
    
    // Wait for modal to appear
    await page.waitForSelector('[data-testid="connection-name-input"]');
    
    // Fill form fields
    await page.fill('[data-testid="connection-name-input"]', 'Simple Test Connection');
    await page.fill('[data-testid="connection-description-input"]', 'A simple test connection');
    await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
    await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
    await page.fill('[data-testid="connection-apikey-input"]', 'simple-api-key-123');
    
    // Submit form
    await page.click('[data-testid="submit-connection-btn"]');
    
    // Wait for the form to be processed
    await page.waitForTimeout(3000);
    
    // Check if modal is closed (indicates success)
    const modalVisible = await page.locator('[data-testid="connection-name-input"]').isVisible();
    console.log('Modal still visible after submission:', modalVisible);
    
    // Check if there's a success message
    const successMessage = await page.locator('[data-testid="success-message"]').isVisible();
    console.log('Success message visible:', successMessage);
    
    // Check if there's an error message
    const errorMessage = await page.locator('[data-testid="error-message"]').isVisible();
    console.log('Error message visible:', errorMessage);
    
    // Take a screenshot
    await page.screenshot({ path: 'simple-form-test.png' });
    
    // For now, just verify the form was submitted (modal closed or success message shown)
    expect(modalVisible).toBe(false);
  });
}); 
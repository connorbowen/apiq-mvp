wimport { test, expect } from '@playwright/test';

test.describe('SSO Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('SAML login flow with Okta', async ({ page }) => {
    // Navigate to login page
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    
    // Click SAML login button
    await page.getByRole('button', { name: /sign in with okta/i }).click();
    
    // Should redirect to Okta login page
    await expect(page).toHaveURL(/.*okta\.com.*/);
    
    // Mock successful authentication
    await page.route('**/saml/callback', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, user: { id: 'user-1', email: 'test@example.com' } })
      });
    });
    
    // Complete login flow
    await page.goto('/dashboard');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('OIDC login flow with Azure AD', async ({ page }) => {
    // Navigate to login page
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    
    // Click OIDC login button
    await page.getByRole('button', { name: /sign in with azure ad/i }).click();
    
    // Should redirect to Azure AD login page
    await expect(page).toHaveURL(/.*microsoftonline\.com.*/);
    
    // Mock successful authentication
    await page.route('**/oidc/callback', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, user: { id: 'user-1', email: 'test@example.com' } })
      });
    });
    
    // Complete login flow
    await page.goto('/dashboard');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('SSO error handling - invalid certificate', async ({ page }) => {
    // Mock SAML error response
    await page.route('**/saml/callback', async route => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid certificate',
          code: 'INVALID_CERTIFICATE'
        })
      });
    });
    
    // Attempt SAML login
    await page.getByRole('button', { name: /sign in with okta/i }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid certificate/i)).toBeVisible();
    await expect(page.getByText(/please contact your administrator/i)).toBeVisible();
  });

  test('SSO error handling - access denied', async ({ page }) => {
    // Mock OIDC access denied response
    await page.route('**/oidc/callback', async route => {
      await route.fulfill({
        status: 403,
        body: JSON.stringify({ 
          success: false, 
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        })
      });
    });
    
    // Attempt OIDC login
    await page.getByRole('button', { name: /sign in with azure ad/i }).click();
    
    // Should show access denied message
    await expect(page.getByText(/access denied/i)).toBeVisible();
    await expect(page.getByText(/you do not have permission/i)).toBeVisible();
  });

  test('SSO provider selection UI', async ({ page }) => {
    // Check that all SSO providers are displayed
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with github/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with okta/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with azure ad/i })).toBeVisible();
    
    // Check that buttons have proper styling and are clickable
    const ssoButtons = page.locator('button[class*="sso"]');
    await expect(ssoButtons).toHaveCount(4);
    
    for (const button of await ssoButtons.all()) {
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
    }
  });

  test('SSO session management', async ({ page }) => {
    // Mock successful login
    await page.route('**/saml/callback', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          success: true, 
          user: { id: 'user-1', email: 'test@example.com' },
          sessionToken: 'mock-session-token'
        })
      });
    });
    
    // Login via SAML
    await page.getByRole('button', { name: /sign in with okta/i }).click();
    await page.goto('/dashboard');
    
    // Verify session is maintained
    await page.reload();
    await expect(page.getByText(/welcome/i)).toBeVisible();
    
    // Check user info in header
    await expect(page.getByText(/test@example.com/i)).toBeVisible();
  });

  test('SSO logout flow', async ({ page }) => {
    // Mock successful login first
    await page.route('**/saml/callback', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          success: true, 
          user: { id: 'user-1', email: 'test@example.com' }
        })
      });
    });
    
    // Login and navigate to dashboard
    await page.getByRole('button', { name: /sign in with okta/i }).click();
    await page.goto('/dashboard');
    
    // Click logout
    await page.getByRole('button', { name: /logout/i }).click();
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
}); 
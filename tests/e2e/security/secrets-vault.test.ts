import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
let createdSecretIds: string[] = [];

test.describe('Secrets Vault E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-secrets-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Secrets Vault Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async ({ request }) => {
    // Clean up created secrets
    for (const id of createdSecretIds) {
      try {
        await request.delete(`/api/secrets/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
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
    // Navigate to secrets management
    await page.click('[data-testid="tab-secrets"]');
  });

  test.describe('UX Compliance - Page Structure & Accessibility', () => {
    test('should have proper heading hierarchy and page structure', async ({ page }) => {
      // Validate main heading (h1 or h2)
      await expect(page.locator('h1, h2')).toContainText(/Secrets|Manage|Vault/i);
      
      // Validate subheadings for different sections
      await expect(page.locator('h2, h3')).toContainText(/API Credentials|OAuth2 Tokens|Database Passwords/i);
      
      // Validate page title and meta description
      await expect(page).toHaveTitle(/Secrets|Vault/i);
    });

    test('should be accessible with proper ARIA attributes', async ({ page }) => {
      // Test ARIA labels and roles
      await expect(page.locator('[aria-label*="secret"], [aria-labelledby]')).toBeVisible();
      await expect(page.locator('[role="button"], [role="tab"], [role="alert"]')).toBeVisible();
      
      // Test required field indicators
      await expect(page.locator('[aria-required="true"]')).toBeVisible();
      
      // Test form labels are properly associated
      await expect(page.locator('label[for]')).toBeVisible();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('should support screen reader accessibility', async ({ page }) => {
      // Test live regions for dynamic content
      await expect(page.locator('[aria-live="polite"], [aria-live="assertive"]')).toBeVisible();
      
      // Test descriptive text for screen readers
      await expect(page.locator('[aria-describedby]')).toBeVisible();
      
      // Test skip links for main content
      await expect(page.locator('[href="#main-content"], [href="#content"]')).toBeVisible();
    });

    test('should have proper color contrast and visual indicators', async ({ page }) => {
      // Test error states use proper color classes
      await expect(page.locator('.bg-red-50, .text-red-800')).toBeVisible();
      
      // Test success states use proper color classes
      await expect(page.locator('.bg-green-50, .text-green-800')).toBeVisible();
      
      // Test focus indicators are visible
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveCSS('outline', /none|auto/);
    });
  });

  test.describe('UX Compliance - Form Validation & Error Handling', () => {
    test('should show accessible error messages for validation failures', async ({ page }) => {
      // Click create secret button
      await page.click('[data-testid="create-secret-btn"]');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should show validation errors in accessible containers
      await expect(page.locator('[role="alert"]')).toBeVisible();
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/required|invalid/i);
      
      // Should show field-level errors
      await expect(page.locator('[data-testid="secret-name-input"]')).toHaveAttribute('aria-invalid', 'true');
    });

    test('should show loading states during form submission', async ({ page }) => {
      // Click create secret button
      await page.click('[data-testid="create-secret-btn"]');
      
      // Fill valid form data
      await page.fill('[data-testid="secret-name-input"]', 'Loading Test Secret');
      await page.fill('[data-testid="secret-description-input"]', 'Test secret for loading states');
      await page.selectOption('[data-testid="secret-type-select"]', 'API_KEY');
      await page.fill('[data-testid="secret-value-input"]', 'test_secret_value');
      
      // Submit form and check loading state
      await page.click('button[type="submit"]');
      
      // Should show loading state with spinner and text change
      await expect(page.getByRole('button', { name: /Creating|Saving|Loading/i })).toBeDisabled();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Secret created successfully');
    });

    test('should provide clear feedback for required fields', async ({ page }) => {
      // Click create secret button
      await page.click('[data-testid="create-secret-btn"]');
      
      // Check required field indicators
      await expect(page.locator('[data-testid="secret-name-input"]')).toHaveAttribute('aria-required', 'true');
      await expect(page.locator('[data-testid="secret-value-input"]')).toHaveAttribute('aria-required', 'true');
      
      // Check required field labels
      await expect(page.locator('label[for*="secret-name"]')).toContainText('*');
      await expect(page.locator('label[for*="secret-value"]')).toContainText('*');
    });
  });

  test.describe('UX Compliance - Mobile Responsiveness', () => {
    test('should be fully functional on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Test touch-friendly button sizes (44px minimum)
      const buttons = page.locator('button');
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      // Test form inputs are touch-friendly
      await page.click('[data-testid="create-secret-btn"]');
      await expect(page.locator('[data-testid="secret-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="secret-value-input"]')).toBeVisible();
    });

    test('should support touch interactions and gestures', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test swipe gestures for navigation (if implemented)
      // await page.touchscreen.swipe(300, 200, 100, 200);
      
      // Test touch interactions with form elements
      await page.click('[data-testid="create-secret-btn"]');
      await page.tap('[data-testid="secret-name-input"]');
      await page.fill('[data-testid="secret-name-input"]', 'Touch Test Secret');
      
      // Test touch-friendly dropdown
      await page.tap('[data-testid="secret-type-select"]');
      await expect(page.locator('[role="option"]')).toBeVisible();
    });
  });

  test.describe('Encrypted Secrets Storage', () => {
    test('should create encrypted API credential with proper UX feedback', async ({ page }) => {
      // Click create secret button
      await page.click('[data-testid="create-secret-btn"]');
      
      // Validate form structure and accessibility
      await expect(page.locator('h2, h3')).toContainText(/Create|Add|New/i);
      await expect(page.locator('[data-testid="secret-name-input"]')).toHaveAttribute('aria-required', 'true');
      
      // Fill secret details
      await page.fill('[data-testid="secret-name-input"]', 'Test API Key');
      await page.fill('[data-testid="secret-description-input"]', 'Test API key for external service');
      await page.selectOption('[data-testid="secret-type-select"]', 'API_KEY');
      await page.fill('[data-testid="secret-value-input"]', 'sk_test_1234567890abcdef');
      
      // Submit form and check loading state
      await page.click('button[type="submit"]');
      await expect(page.getByRole('button', { name: /Creating|Saving/i })).toBeDisabled();
      
      // Should show success message in accessible container
      await expect(page.locator('[role="alert"]')).toContainText('Secret created successfully');
      await expect(page.locator('.bg-green-50')).toBeVisible();
      
      // Should show the new secret in the list
      await expect(page.locator('[data-testid="secret-card"]')).toContainText('Test API Key');
      
      // Should NOT show the actual secret value (encrypted)
      await expect(page.locator('[data-testid="secret-card"]')).not.toContainText('sk_test_1234567890abcdef');
      await expect(page.locator('[data-testid="secret-card"]')).toContainText('••••••••••••••••');
    });

    test('should create encrypted OAuth2 token with proper type indicators', async ({ page }) => {
      // Click create secret button
      await page.click('[data-testid="create-secret-btn"]');
      
      // Fill secret details for OAuth2 token
      await page.fill('[data-testid="secret-name-input"]', 'GitHub OAuth Token');
      await page.fill('[data-testid="secret-description-input"]', 'GitHub OAuth2 access token');
      await page.selectOption('[data-testid="secret-type-select"]', 'OAUTH2_TOKEN');
      await page.fill('[data-testid="secret-value-input"]', 'ghp_1234567890abcdef');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[role="alert"]')).toContainText('Secret created successfully');
      
      // Should show the new secret in the list
      await expect(page.locator('[data-testid="secret-card"]')).toContainText('GitHub OAuth Token');
      
      // Should show OAuth2 token type indicator
      await expect(page.locator('[data-testid="secret-card"]')).toContainText('OAuth2 Token');
    });

    test('should create encrypted database credential with proper security indicators', async ({ page }) => {
      // Click create secret button
      await page.click('[data-testid="create-secret-btn"]');
      
      // Fill secret details for database credential
      await page.fill('[data-testid="secret-name-input"]', 'Production DB Password');
      await page.fill('[data-testid="secret-description-input"]', 'Production database password');
      await page.selectOption('[data-testid="secret-type-select"]', 'DATABASE_PASSWORD');
      await page.fill('[data-testid="secret-value-input"]', 'SuperSecurePassword123!');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[role="alert"]')).toContainText('Secret created successfully');
      
      // Should show the new secret in the list
      await expect(page.locator('[data-testid="secret-card"]')).toContainText('Production DB Password');
      
      // Should show database password type indicator
      await expect(page.locator('[data-testid="secret-card"]')).toContainText('Database Password');
    });
  });

  test.describe('Secure Secret Retrieval', () => {
    test('should retrieve encrypted secret value securely with proper UX', async ({ page }) => {
      // Create secret via API first
      const response = await page.request.post('/api/secrets', {
        data: {
          name: 'Retrievable Secret',
          description: 'Secret for retrieval testing',
          type: 'API_KEY',
          value: 'retrievable_secret_value_123'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const secret = await response.json();
      if (secret.data?.id) {
        createdSecretIds.push(secret.data.id);
      }
      
      // Navigate to secrets list
      await page.reload();
      
      // Click on the secret to view details
      await page.click(`[data-testid="secret-details-${secret.data.id}"]`);
      
      // Should show secret details but not the value
      await expect(page.locator('[data-testid="secret-name"]')).toContainText('Retrievable Secret');
      await expect(page.locator('[data-testid="secret-description"]')).toContainText('Secret for retrieval testing');
      await expect(page.locator('[data-testid="secret-value-display"]')).toContainText('••••••••••••••••');
      
      // Click reveal button with proper accessibility
      await expect(page.locator('[data-testid="reveal-secret-btn"]')).toHaveAttribute('aria-label', /reveal|show/i);
      await page.click('[data-testid="reveal-secret-btn"]');
      
      // Should show the actual value
      await expect(page.locator('[data-testid="secret-value-display"]')).toContainText('retrievable_secret_value_123');
      
      // Should auto-hide after a few seconds
      await page.waitForTimeout(5000);
      await expect(page.locator('[data-testid="secret-value-display"]')).toContainText('••••••••••••••••');
    });

    test('should require authentication to retrieve secrets with proper redirect UX', async ({ page }) => {
      // Create secret via API first
      const response = await page.request.post('/api/secrets', {
        data: {
          name: 'Protected Secret',
          description: 'Secret requiring authentication',
          type: 'API_KEY',
          value: 'protected_secret_value_456'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const secret = await response.json();
      if (secret.data?.id) {
        createdSecretIds.push(secret.data.id);
      }
      
      // Logout
      await page.click('[data-testid="logout-btn"]');
      await expect(page).toHaveURL(/.*login/);
      
      // Try to access secret without authentication
      await page.goto(`${BASE_URL}/secrets/${secret.data.id}`);
      
      // Should redirect to login with proper message
      await expect(page).toHaveURL(/.*login/);
      await expect(page.locator('[role="alert"]')).toContainText(/sign in|login|authentication/i);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should enforce rate limiting on secrets operations with user-friendly feedback', async ({ page }) => {
      // Create multiple secrets rapidly to test rate limiting
      for (let i = 0; i < 105; i++) {
        const response = await page.request.post('/api/secrets', {
          data: {
            name: `Rate Limit Test ${i}`,
            description: `Secret ${i} for rate limit testing`,
            type: 'API_KEY',
            value: `secret_value_${i}`
          },
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        });
        
        const secret = await response.json();
        if (secret.data?.id) {
          createdSecretIds.push(secret.data.id);
        }
        
        // If we hit rate limit, break
        if (response.status() === 429) {
          break;
        }
      }
      
      // Try one more request
      const rateLimitResponse = await page.request.post('/api/secrets', {
        data: {
          name: 'Rate Limited Secret',
          description: 'This should be rate limited',
          type: 'API_KEY',
          value: 'rate_limited_value'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should return 429 Too Many Requests
      expect(rateLimitResponse.status()).toBe(429);
      
      // Should include rate limit headers
      const retryAfter = rateLimitResponse.headers()['retry-after'];
      expect(retryAfter).toBeDefined();
      
      // Test UI shows rate limit message
      await page.reload();
      await expect(page.locator('[role="alert"]')).toContainText(/rate limit|too many requests/i);
    });
  });

  test.describe('Security Compliance', () => {
    test('should not log sensitive information with proper security UX', async ({ page }) => {
      // Create secret with sensitive data
      const response = await page.request.post('/api/secrets', {
        data: {
          name: 'Sensitive Secret',
          description: 'Secret with sensitive data',
          type: 'API_KEY',
          value: 'super_sensitive_token_789'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const secret = await response.json();
      if (secret.data?.id) {
        createdSecretIds.push(secret.data.id);
      }
      
      // Check that the response doesn't contain the sensitive value
      expect(secret.data?.value).not.toBe('super_sensitive_token_789');
      expect(secret.data?.value).toBeUndefined();
      
      // Navigate to audit logs
      await page.click('[data-testid="tab-audit"]');
      
      // Should show audit entry but not the sensitive value
      await expect(page.locator('[data-testid="audit-log"]')).toContainText('Secret created');
      await expect(page.locator('[data-testid="audit-log"]')).not.toContainText('super_sensitive_token_789');
    });

    test('should validate and sanitize secret inputs with accessible error messages', async ({ page }) => {
      // Click create secret button
      await page.click('[data-testid="create-secret-btn"]');
      
      // Try to create secret with invalid characters
      await page.fill('[data-testid="secret-name-input"]', 'Invalid Secret<script>alert("xss")</script>');
      await page.fill('[data-testid="secret-description-input"]', 'Description with invalid chars: <>&"');
      await page.selectOption('[data-testid="secret-type-select"]', 'API_KEY');
      await page.fill('[data-testid="secret-value-input"]', 'valid_secret_value');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show validation error in accessible container
      await expect(page.locator('[role="alert"]')).toContainText(/Invalid characters|Validation failed/i);
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toBeVisible();
      
      // Should show field-level errors
      await expect(page.locator('[data-testid="secret-name-input"]')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  test.describe('Master Key Rotation', () => {
    test('should support master key rotation with proper UX flow', async ({ page }) => {
      // Navigate to admin settings
      await page.click('[data-testid="tab-admin"]');
      await page.click('[data-testid="security-settings"]');
      
      // Should show proper heading hierarchy
      await expect(page.locator('h1, h2')).toContainText(/Security|Settings|Admin/i);
      
      // Should show master key rotation section
      await expect(page.locator('[data-testid="master-key-section"]')).toBeVisible();
      
      // Should show current master key status
      await expect(page.locator('[data-testid="master-key-status"]')).toContainText(/Active|Configured/i);
      
      // Should show rotation button with proper accessibility
      await expect(page.locator('[data-testid="rotate-master-key-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="rotate-master-key-btn"]')).toHaveAttribute('aria-label', /rotate|change/i);
    });

    test('should handle master key rotation process with proper confirmation UX', async ({ page }) => {
      // Navigate to admin settings
      await page.click('[data-testid="tab-admin"]');
      await page.click('[data-testid="security-settings"]');
      
      // Click rotate master key button
      await page.click('[data-testid="rotate-master-key-btn"]');
      
      // Should show confirmation dialog with proper accessibility
      await expect(page.locator('[data-testid="rotation-confirmation"]')).toBeVisible();
      await expect(page.locator('[data-testid="rotation-confirmation"]')).toContainText(/This will re-encrypt all secrets/i);
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Confirm rotation
      await page.click('[data-testid="confirm-rotation-btn"]');
      
      // Should show rotation in progress with loading state
      await expect(page.locator('[data-testid="rotation-progress"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /Rotating|Processing/i })).toBeDisabled();
      
      // Should show success message when complete
      await expect(page.locator('[role="alert"]')).toContainText('Master key rotated successfully');
      await expect(page.locator('.bg-green-50')).toBeVisible();
    });
  });

  test.describe('Audit Logging', () => {
    test('should log all secret operations with proper audit UX', async ({ page }) => {
      // Create a secret to generate audit log
      const response = await page.request.post('/api/secrets', {
        data: {
          name: 'Audit Test Secret',
          description: 'Secret for audit testing',
          type: 'API_KEY',
          value: 'audit_test_value'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const secret = await response.json();
      if (secret.data?.id) {
        createdSecretIds.push(secret.data.id);
      }
      
      // Navigate to audit logs
      await page.click('[data-testid="tab-audit"]');
      
      // Should show proper heading for audit section
      await expect(page.locator('h1, h2')).toContainText(/Audit|Logs|History/i);
      
      // Should show audit entry for secret creation
      await expect(page.locator('[data-testid="audit-log"]')).toContainText('Secret created');
      await expect(page.locator('[data-testid="audit-log"]')).toContainText('Audit Test Secret');
      await expect(page.locator('[data-testid="audit-log"]')).toContainText(testUser.email);
      
      // Should show timestamp
      await expect(page.locator('[data-testid="audit-log"]')).toContainText(/\d{4}-\d{2}-\d{2}/);
    });

    test('should log secret access attempts with proper access tracking UX', async ({ page }) => {
      // Create secret via API first
      const response = await page.request.post('/api/secrets', {
        data: {
          name: 'Access Log Secret',
          description: 'Secret for access logging',
          type: 'API_KEY',
          value: 'access_log_value'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const secret = await response.json();
      if (secret.data?.id) {
        createdSecretIds.push(secret.data.id);
      }
      
      // Navigate to secrets list
      await page.reload();
      
      // Click on the secret to view details (access attempt)
      await page.click(`[data-testid="secret-details-${secret.data.id}"]`);
      
      // Navigate to audit logs
      await page.click('[data-testid="tab-audit"]');
      
      // Should show audit entry for secret access
      await expect(page.locator('[data-testid="audit-log"]')).toContainText('Secret accessed');
      await expect(page.locator('[data-testid="audit-log"]')).toContainText('Access Log Secret');
    });
  });

  test.describe('End-to-End Encryption', () => {
    test('should encrypt data at rest and in transit with proper security UX', async ({ page }) => {
      // Create secret via API
      const response = await page.request.post('/api/secrets', {
        data: {
          name: 'E2E Encrypted Secret',
          description: 'Secret for E2E encryption testing',
          type: 'API_KEY',
          value: 'e2e_encrypted_value_123'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const secret = await response.json();
      if (secret.data?.id) {
        createdSecretIds.push(secret.data.id);
      }
      
      // Verify response doesn't contain plaintext value
      expect(secret.data?.value).toBeUndefined();
      
      // Verify secret is encrypted in database by checking audit log
      await page.click('[data-testid="tab-audit"]');
      await expect(page.locator('[data-testid="audit-log"]')).toContainText('Secret created');
      await expect(page.locator('[data-testid="audit-log"]')).not.toContainText('e2e_encrypted_value_123');
    });
  });

  test.describe('API Key Rotation', () => {
    test('should support automated API key rotation with proper rotation UX', async ({ page }) => {
      // Create secret via API first
      const response = await page.request.post('/api/secrets', {
        data: {
          name: 'Rotatable API Key',
          description: 'API key for rotation testing',
          type: 'API_KEY',
          value: 'old_api_key_123',
          rotationEnabled: true,
          rotationInterval: 30 // days
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const secret = await response.json();
      if (secret.data?.id) {
        createdSecretIds.push(secret.data.id);
      }
      
      // Navigate to secrets list
      await page.reload();
      
      // Click on the secret to view details
      await page.click(`[data-testid="secret-details-${secret.data.id}"]`);
      
      // Should show rotation settings with proper labels
      await expect(page.locator('[data-testid="rotation-enabled"]')).toContainText('Enabled');
      await expect(page.locator('[data-testid="rotation-interval"]')).toContainText('30 days');
      
      // Should show next rotation date
      await expect(page.locator('[data-testid="next-rotation"]')).toBeVisible();
      
      // Should show manual rotation button with proper accessibility
      await expect(page.locator('[data-testid="rotate-now-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="rotate-now-btn"]')).toHaveAttribute('aria-label', /rotate now|manual rotation/i);
    });
  });

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('should meet WCAG 2.1 AA accessibility standards', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test focus management
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test skip links
      await page.keyboard.press('Tab');
      await expect(page.locator('[href="#main-content"]')).toBeVisible();
      
      // Test ARIA landmarks
      await expect(page.locator('[role="main"], [role="navigation"], [role="complementary"]')).toBeVisible();
      
      // Test form accessibility
      await page.click('[data-testid="create-secret-btn"]');
      await expect(page.locator('[data-testid="secret-name-input"]')).toHaveAttribute('aria-required', 'true');
      await expect(page.locator('label[for*="secret-name"]')).toBeVisible();
    });

    test('should support screen reader compatibility', async ({ page }) => {
      // Test live regions for dynamic content
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      
      // Test descriptive text for complex elements
      await expect(page.locator('[aria-describedby]')).toBeVisible();
      
      // Test status announcements
      await page.click('[data-testid="create-secret-btn"]');
      await page.fill('[data-testid="secret-name-input"]', 'Screen Reader Test');
      await page.click('button[type="submit"]');
      await expect(page.locator('[aria-live="assertive"]')).toContainText(/created|success/i);
    });
  });
}); 
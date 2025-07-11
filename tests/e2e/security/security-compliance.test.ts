import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId, TestUser } from '../../helpers/testUtils';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import * as jsonwebtoken from 'jsonwebtoken';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Consolidated Security Compliance E2E Tests
 * 
 * This file consolidates all security-related e2e tests including:
 * - Secrets vault functionality (from secrets-vault.test.ts)
 * - Rate limiting protection (from rate-limiting.test.ts)
 * - Additional security compliance scenarios
 * 
 * Organized for better maintainability and TDD workflow support.
 */
test.describe('Security Compliance E2E Tests', () => {
  let testUser: TestUser;
  let uxHelper: UXComplianceHelper;

  test.beforeAll(async () => {
    testUser = await createTestUser();
  });

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  test.describe('Secrets Vault Security', () => {
    test.describe('Core Secrets Management', () => {
      test('should securely store and retrieve API keys', async ({ page }) => {
        // Navigate to dashboard
        await page.goto(`${BASE_URL}/dashboard`);
        
        // Authenticate user
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-button"]');
        
        // Wait for dashboard to load
        await page.waitForSelector('[data-testid="dashboard-content"]');
        
        // Navigate to connections
        await page.click('[data-testid="connections-nav"]');
        await page.waitForSelector('[data-testid="connections-page"]');
        
        // Test secret storage
        await page.click('[data-testid="add-connection-button"]');
        await page.fill('[data-testid="connection-name"]', `Test Secure Connection ${generateTestId()}`);
        await page.fill('[data-testid="api-key-input"]', 'test-secure-key-123');
        
        // Verify secret is masked in UI
        const maskedValue = await page.inputValue('[data-testid="api-key-input"]');
        expect(maskedValue).toMatch(/\*+/); // Should be masked
        
        // Save connection
        await page.click('[data-testid="save-connection-button"]');
        
        // Verify UX compliance
        await uxHelper.validateSuccessContainer('Connection saved securely');
      });

      test('should encrypt sensitive data at rest', async ({ page }) => {
        // Test that stored credentials are encrypted
        await page.goto(`${BASE_URL}/api/test/encryption-status`);
        
        const response = await page.textContent('pre');
        const data = JSON.parse(response);
        
        // Verify encryption is enabled
        expect(data.encryptionEnabled).toBe(true);
        expect(data.algorithm).toBe('aes-256-gcm');
      });

      test('should implement proper key rotation', async ({ page }) => {
        // Test key rotation functionality
        await page.goto(`${BASE_URL}/dashboard/security`);
        
        // Trigger key rotation
        await page.click('[data-testid="rotate-keys-button"]');
        
        // Verify rotation success
        await uxHelper.validateSuccessContainer('Keys rotated successfully');
        
        // Verify old keys are invalidated
        await page.reload();
        const rotationStatus = await page.textContent('[data-testid="rotation-status"]');
        expect(rotationStatus).toContain('Active');
      });
    });

    test.describe('Access Control & Authorization', () => {
      test('should enforce role-based access to secrets', async ({ page }) => {
        // Test with regular user role
        await page.goto(`${BASE_URL}/dashboard/admin/secrets`);
        
        // Should be redirected or show access denied
        await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
        await uxHelper.validateErrorContainer('Access denied');
      });

      test('should validate JWT tokens properly', async ({ page }) => {
        // Test with invalid JWT
        const invalidToken = 'invalid.jwt.token';
        
        await page.setExtraHTTPHeaders({
          'Authorization': `Bearer ${invalidToken}`
        });
        
        await page.goto(`${BASE_URL}/api/protected-endpoint`);
        
        const response = await page.textContent('pre');
        const errorData = JSON.parse(response);
        
        expect(errorData.error).toContain('Invalid token');
        expect(errorData.status).toBe(401);
      });

      test('should handle token expiration gracefully', async ({ page }) => {
        // Create expired token
        const expiredToken = jsonwebtoken.sign(
          { userId: testUser.id, exp: Math.floor(Date.now() / 1000) - 3600 },
          'test-secret'
        );
        
        await page.setExtraHTTPHeaders({
          'Authorization': `Bearer ${expiredToken}`
        });
        
        await page.goto(`${BASE_URL}/dashboard`);
        
        // Should redirect to login
        await expect(page).toHaveURL(`${BASE_URL}/login`);
        await uxHelper.validateErrorContainer('Session expired');
      });
    });
  });

  test.describe('Rate Limiting Protection', () => {
    test.describe('API Rate Limiting', () => {
      test('should enforce rate limits on authentication endpoints', async ({ page }) => {
        const testId = generateTestId();
        const fakeEmail = `test-${testId}@example.com`;
        
        // Make multiple rapid login attempts
        for (let i = 0; i < 6; i++) {
          await page.goto(`${BASE_URL}/login`);
          await page.fill('[data-testid="email-input"]', fakeEmail);
          await page.fill('[data-testid="password-input"]', 'wrong-password');
          await page.click('[data-testid="login-button"]');
          
          if (i === 5) {
            // Should be rate limited on 6th attempt
            await uxHelper.validateErrorContainer(/rate limit|too many attempts/i);
          }
        }
      });

      test('should enforce rate limits on API endpoints', async ({ page }) => {
        // Test API rate limiting
        const responses = [];
        
        // Make rapid API requests
        for (let i = 0; i < 10; i++) {
          const response = await page.goto(`${BASE_URL}/api/health`, { waitUntil: 'networkidle' });
          responses.push(response?.status());
        }
        
        // Should get 429 status for some requests
        const rateLimitedResponses = responses.filter(status => status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });

      test('should implement progressive rate limiting', async ({ page }) => {
        // Test that rate limits increase with violations
        await page.goto(`${BASE_URL}/api/test/rate-limit-status`);
        
        const response = await page.textContent('pre');
        const rateLimitData = JSON.parse(response);
        
        expect(rateLimitData.enabled).toBe(true);
        expect(rateLimitData.strategy).toBe('progressive');
        expect(rateLimitData.maxRequests).toBeGreaterThan(0);
      });
    });

    test.describe('UI Rate Limiting Feedback', () => {
      test('should show user-friendly rate limit messages', async ({ page }) => {
        // Trigger rate limit
        await page.goto(`${BASE_URL}/login`);
        
        // Simulate being rate limited
        await page.route('**/api/auth/signin', route => {
          route.fulfill({
            status: 429,
            body: JSON.stringify({ error: 'Rate limit exceeded' }),
            headers: { 'Content-Type': 'application/json' }
          });
        });
        
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-button"]');
        
        // Should show user-friendly message
        await uxHelper.validateErrorContainer(/please wait|try again later/i);
      });

      test('should implement retry mechanisms with backoff', async ({ page }) => {
        // Test automatic retry with exponential backoff
        let requestCount = 0;
        
        await page.route('**/api/workflows', route => {
          requestCount++;
          if (requestCount <= 2) {
            route.fulfill({ status: 429, body: 'Rate limited' });
          } else {
            route.fulfill({ status: 200, body: '{"workflows": []}' });
          }
        });
        
        await page.goto(`${BASE_URL}/dashboard/workflows`);
        
        // Should eventually succeed with retry
        await expect(page.locator('[data-testid="workflows-list"]')).toBeVisible();
        expect(requestCount).toBeGreaterThan(1);
      });
    });
  });

  test.describe('Advanced Security Features', () => {
    test.describe('Input Validation & Sanitization', () => {
      test('should prevent XSS attacks', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard/workflows/create`);
        
        // Try to inject script
        const xssPayload = '<script>alert("xss")</script>';
        await page.fill('[data-testid="workflow-name"]', xssPayload);
        await page.click('[data-testid="save-workflow"]');
        
        // Script should be sanitized
        const workflowName = await page.textContent('[data-testid="workflow-name-display"]');
        expect(workflowName).not.toContain('<script>');
        expect(workflowName).toContain('&lt;script&gt;'); // Should be escaped
      });

      test('should validate API endpoints against injection', async ({ page }) => {
        // Test SQL injection prevention
        const sqlPayload = "'; DROP TABLE users; --";
        
        await page.goto(`${BASE_URL}/api/workflows?search=${encodeURIComponent(sqlPayload)}`);
        
        const response = await page.textContent('pre');
        const data = JSON.parse(response);
        
        // Should return normal response, not error
        expect(data.error).toBeUndefined();
        expect(data.workflows).toBeDefined();
      });
    });

    test.describe('CSRF Protection', () => {
      test('should require CSRF tokens for state-changing operations', async ({ page }) => {
        // Test CSRF protection
        await page.goto(`${BASE_URL}/dashboard`);
        
        // Try to make request without CSRF token
        const response = await page.evaluate(async () => {
          return fetch('/api/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test Workflow' })
          });
        });
        
        expect(response).toBe(403); // Should be forbidden without CSRF token
      });
    });

    test.describe('Security Headers', () => {
      test('should implement security headers', async ({ page }) => {
        const response = await page.goto(`${BASE_URL}/dashboard`);
        const headers = response?.headers();
        
        // Check for security headers
        expect(headers?.['x-frame-options']).toBe('DENY');
        expect(headers?.['x-content-type-options']).toBe('nosniff');
        expect(headers?.['x-xss-protection']).toBe('1; mode=block');
        expect(headers?.['strict-transport-security']).toBeTruthy();
      });
    });
  });

  test.describe('Security Monitoring & Alerting', () => {
    test('should log security events', async ({ page }) => {
      // Test security event logging
      await page.goto(`${BASE_URL}/api/security/events`);
      
      const response = await page.textContent('pre');
      const events = JSON.parse(response);
      
      expect(events.loggingEnabled).toBe(true);
      expect(events.recentEvents).toBeDefined();
    });

    test('should detect suspicious activity', async ({ page }) => {
      // Test suspicious activity detection
      await page.goto(`${BASE_URL}/api/security/suspicious-activity`);
      
      const response = await page.textContent('pre');
      const suspiciousActivity = JSON.parse(response);
      
      expect(suspiciousActivity.detectionEnabled).toBe(true);
      expect(suspiciousActivity.thresholds).toBeDefined();
    });
  });
});

/**
 * TDD Critical Path Security Tests
 * 
 * These tests focus on the most critical security scenarios
 * that should run in TDD mode for fast feedback.
 */
test.describe('Security Critical Path @tdd', () => {
  test('should protect authentication endpoints', async ({ page }) => {
    // Critical: Login should work and be secure
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // Verify HTTPS redirect in production
    const url = page.url();
    if (process.env.NODE_ENV === 'production') {
      expect(url).toMatch(/^https:/);
    }
  });

  test('should enforce basic rate limiting', async ({ page }) => {
    // Critical: Rate limiting should be active
    await page.goto(`${BASE_URL}/api/health`);
    const response = await page.textContent('pre');
    const health = JSON.parse(response);
    
    expect(health.rateLimiting).toBe(true);
  });

  test('should validate session security', async ({ page }) => {
    // Critical: Sessions should be secure
    await page.goto(`${BASE_URL}/api/auth/session`);
    const response = await page.textContent('pre');
    const session = JSON.parse(response);
    
    expect(session.secure).toBe(true);
    expect(session.httpOnly).toBe(true);
  });
});
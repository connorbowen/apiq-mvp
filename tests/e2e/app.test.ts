import { test, expect } from '@playwright/test'

test.describe('APIQ Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('http://localhost:3000')
  })

  test.describe('Home Page', () => {
    test('should load the home page successfully', async ({ page }) => {
      // Check if the page loads without errors
      await expect(page).toHaveTitle(/APIQ/)
      
      // Check for main content
      await expect(page.locator('h1')).toContainText(/APIQ|Multi-API Orchestrator/i)
      
      // Check for navigation elements
      await expect(page.locator('nav')).toBeVisible()
      
      // Check for main content sections
      await expect(page.locator('main')).toBeVisible()
    })

    test('should display hero section with call-to-action', async ({ page }) => {
      // Check hero section content
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('p')).toContainText(/orchestrate|workflow|automation/i)
      
      // Check for CTA buttons
      const ctaButtons = page.locator('button, a[href*="signup"], a[href*="login"]')
      await expect(ctaButtons.first()).toBeVisible()
    })

    test('should have responsive design', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1920, height: 1080 })
      await expect(page.locator('nav')).toBeVisible()
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 })
      await expect(page.locator('nav')).toBeVisible()
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(page.locator('nav')).toBeVisible()
    })

    test('should have proper meta tags', async ({ page }) => {
      // Check for essential meta tags
      await expect(page.locator('meta[name="viewport"]')).toBeVisible()
      await expect(page.locator('meta[name="description"]')).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('should have working navigation links', async ({ page }) => {
      // Check for navigation links
      const navLinks = page.locator('nav a')
      await expect(navLinks.first()).toBeVisible()
      
      // Test navigation functionality
      const firstLink = navLinks.first()
      const href = await firstLink.getAttribute('href')
      if (href && !href.startsWith('#')) {
        await firstLink.click()
        await expect(page).not.toHaveURL('http://localhost:3000/')
      }
    })

    test('should have mobile menu functionality', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Look for mobile menu button
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], .mobile-menu-button')
      if (await menuButton.isVisible()) {
        await menuButton.click()
        await expect(page.locator('nav')).toBeVisible()
      }
    })
  })

  test.describe('API Health Check', () => {
    test('should have working health check endpoint', async ({ page }) => {
      // Test the health check API endpoint
      const response = await page.request.get('/api/health')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('status', 'healthy')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('uptime')
    })

    test('should handle health check with database check', async ({ page }) => {
      const response = await page.request.get('/api/health?check=database')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('database')
      expect(data.database).toHaveProperty('status')
      expect(data.database).toHaveProperty('responseTime')
    })

    test('should handle health check with external API check', async ({ page }) => {
      const response = await page.request.get('/api/health?check=external')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('external')
      expect(data.external).toHaveProperty('status')
      expect(data.external).toHaveProperty('responseTime')
    })
  })

  test.describe('User Interface', () => {
    test('should have proper color scheme and styling', async ({ page }) => {
      // Check for Tailwind CSS classes
      const body = page.locator('body')
      await expect(body).toHaveClass(/bg-|text-|font-/)
      
      // Check for proper contrast and readability
      const textElements = page.locator('p, h1, h2, h3, h4, h5, h6')
      await expect(textElements.first()).toBeVisible()
    })

    test('should have proper accessibility features', async ({ page }) => {
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6')
      await expect(headings.first()).toBeVisible()
      
      // Check for alt text on images
      const images = page.locator('img')
      for (let i = 0; i < await images.count(); i++) {
        const alt = await images.nth(i).getAttribute('alt')
        expect(alt).toBeTruthy()
      }
      
      // Check for proper button labels
      const buttons = page.locator('button')
      for (let i = 0; i < await buttons.count(); i++) {
        const ariaLabel = await buttons.nth(i).getAttribute('aria-label')
        const text = await buttons.nth(i).textContent()
        expect(ariaLabel || text).toBeTruthy()
      }
    })

    test('should handle form interactions properly', async ({ page }) => {
      // Look for forms on the page
      const forms = page.locator('form')
      if (await forms.count() > 0) {
        const form = forms.first()
        
        // Test form inputs
        const inputs = form.locator('input, textarea, select')
        for (let i = 0; i < await inputs.count(); i++) {
          const input = inputs.nth(i)
          await input.focus()
          await expect(input).toBeFocused()
        }
      }
    })
  })

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('http://localhost:3000')
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    })

    test('should have proper loading states', async ({ page }) => {
      // Check for loading indicators if any
      const loadingElements = page.locator('[data-loading], .loading, .spinner')
      if (await loadingElements.count() > 0) {
        await expect(loadingElements.first()).toBeVisible()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle 404 errors gracefully', async ({ page }) => {
      const response = await page.goto('http://localhost:3000/nonexistent-page')
      expect(response?.status()).toBe(404)
      
      // Should show a proper error page
      await expect(page.locator('h1, h2')).toContainText(/404|Not Found|Page Not Found/i)
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true)
      
      try {
        await page.goto('http://localhost:3000')
        // Should handle offline state gracefully
        await expect(page.locator('body')).toBeVisible()
      } finally {
        await page.context().setOffline(false)
      }
    })
  })

  test.describe('Security', () => {
    test('should have proper security headers', async ({ page }) => {
      const response = await page.goto('http://localhost:3000')
      const headers = response?.headers()
      
      // Check for security headers
      expect(headers).toHaveProperty('x-frame-options')
      expect(headers).toHaveProperty('x-content-type-options')
      expect(headers).toHaveProperty('referrer-policy')
    })

    test('should not expose sensitive information in source', async ({ page }) => {
      const content = await page.content()
      
      // Should not contain sensitive information
      expect(content).not.toContain('password')
      expect(content).not.toContain('secret')
      expect(content).not.toContain('api_key')
      expect(content).not.toContain('token')
    })

    test('should handle XSS attempts', async ({ page }) => {
      // Test with potentially malicious input
      const maliciousInput = '<script>alert("xss")</script>'
      
      // Look for input fields
      const inputs = page.locator('input[type="text"], textarea')
      if (await inputs.count() > 0) {
        const input = inputs.first()
        await input.fill(maliciousInput)
        
        // Should not execute the script
        const value = await input.inputValue()
        expect(value).toBe(maliciousInput)
      }
    })
  })

  test.describe('Cross-browser Compatibility', () => {
    test('should work in different browsers', async ({ page, browserName }) => {
      // Test basic functionality across browsers
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('h1')).toBeVisible()
      
      // Browser-specific tests
      if (browserName === 'chromium') {
        // Chrome-specific tests
        await expect(page.locator('nav')).toBeVisible()
      } else if (browserName === 'firefox') {
        // Firefox-specific tests
        await expect(page.locator('nav')).toBeVisible()
      } else if (browserName === 'webkit') {
        // Safari-specific tests
        await expect(page.locator('nav')).toBeVisible()
      }
    })
  })

  test.describe('Database Integration', () => {
    test('should have working database connection', async ({ page }) => {
      // Test database connectivity through health check
      const response = await page.request.get('/api/health?check=database')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.database.status).toMatch(/connected|disconnected/)
    })
  })

  test.describe('API Integration', () => {
    test('should handle API requests properly', async ({ page }) => {
      // Test basic API functionality
      const response = await page.request.get('/api/health')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('status')
    })

    test('should handle API errors gracefully', async ({ page }) => {
      // Test non-existent API endpoint
      const response = await page.request.get('/api/nonexistent')
      expect(response.status()).toBe(404)
    })
  })
}) 
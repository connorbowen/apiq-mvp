import { test, expect } from '@playwright/test';

test.describe('Debug Form Submission', () => {
  test('should debug form submission', async ({ page }) => {
    await page.goto('http://localhost:3000/forgot-password');
    
    // Wait for page to load
    await expect(page.locator('h2')).toContainText('Forgot your password?');
    
    // Fill the form
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Check if button is enabled
    const button = page.getByTestId('primary-action send-reset-link-btn');
    await expect(button).toBeEnabled();
    await expect(button).toHaveText('Send Reset Link');
    
    // Click the button
    console.log('About to click button...');
    await button.click();
    console.log('Button clicked');
    
    // Wait a moment to see if anything happens
    await page.waitForTimeout(2000);
    
    // Check if button text changed
    const buttonText = await button.textContent();
    console.log('Button text after click:', buttonText);
    
    // Check if button is disabled
    const isDisabled = await button.isDisabled();
    console.log('Button disabled after click:', isDisabled);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after click:', currentUrl);
    
    // Check for any error messages
    const errorElements = page.locator('.bg-red-50');
    const errorCount = await errorElements.count();
    console.log('Error elements found:', errorCount);
    
    if (errorCount > 0) {
      const errorText = await errorElements.first().textContent();
      console.log('Error text:', errorText);
    }
  });
}); 
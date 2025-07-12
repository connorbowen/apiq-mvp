// @ts-nocheck
import { Page, expect } from '@playwright/test';

export class ForgotPasswordPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/forgot-password');
  }

  async requestReset(email: string): Promise<void> {
    await this.page.fill('input[name="email"]', email);
    await this.page.getByTestId('primary-action send-reset-link-btn').click();
  }

  async expectSuccessPage(): Promise<void> {
    await expect(this.page).toHaveURL(/forgot-password-success/);
    await expect(this.page.locator('h2')).toContainText(/Reset Link Sent/i);
  }
}
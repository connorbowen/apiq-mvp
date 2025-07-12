// @ts-nocheck
import { Page, expect } from '@playwright/test';

export class ResetPasswordPage {
  constructor(private readonly page: Page) {}

  async goto(token: string): Promise<void> {
    await this.page.goto(`/reset-password?token=${token}`);
  }

  async resetPassword(newPassword: string): Promise<void> {
    await this.page.fill('input[name="password"]', newPassword);
    await this.page.fill('input[name="confirmPassword"]', newPassword);
    await this.page.getByTestId('primary-action reset-password-btn').click();
  }

  async expectSuccess(): Promise<void> {
    await expect(this.page.locator('[data-testid="success-message"], .bg-green-50')).toBeVisible();
    await expect(this.page).toHaveURL(/login/);
  }
}
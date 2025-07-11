// @ts-nocheck
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async fillEmail(email: string): Promise<void> {
    await this.page.locator('input[name="email"]').fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.page.locator('input[name="password"]').fill(password);
  }

  async submit(): Promise<void> {
    await Promise.all([
      this.page.waitForNavigation({ url: /dashboard/i }),
      this.page.locator('button[type="submit"]').click(),
    ]);
  }

  async expectLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard/i);
  }
}
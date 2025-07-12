// @ts-nocheck
import { Page, expect } from '@playwright/test';

export interface RegistrationData {
  email: string;
  password: string;
  name: string;
}

export class RegistrationPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/signup');
  }

  async register(data: RegistrationData): Promise<void> {
    await this.page.fill('input[name="name"]', data.name);
    await this.page.fill('input[name="email"]', data.email);
    await this.page.fill('input[name="password"]', data.password);
    await this.page.fill('input[name="confirmPassword"]', data.password);
    await this.page.getByTestId('primary-action signup-btn').click();
  }

  async expectVerificationEmailPage(): Promise<void> {
    await expect(this.page).toHaveURL(/verify-email/);
    await expect(this.page.locator('h2')).toContainText(/Verify your email/i);
  }
}
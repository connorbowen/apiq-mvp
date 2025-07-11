// @ts-nocheck

export interface UserCredentials {
  email: string;
  password: string;
}

import { Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

export class AuthFlow {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Log in via the UI using the provided user credentials.
   * Abstracting this flow keeps test specs concise and centralises selectors.
   */
  async login(user: UserCredentials): Promise<void> {
    const loginPage = new LoginPage(this.page);
    await loginPage.goto();
    await loginPage.fillEmail(user.email);
    await loginPage.fillPassword(user.password);
    await loginPage.submit();
    await loginPage.expectLoggedIn();
  }

  /**
   * Logs out the current user using the UI. Update selectors when the UI changes.
   */
  async logout(): Promise<void> {
    // These selectors are placeholders – adjust to actual UI once implemented.
    await this.page.click('[data-test="user-menu-button"]');
    await this.page.click('[data-test="logout-button"]');
    await expect(this.page).toHaveURL(/login/i);
  }
}
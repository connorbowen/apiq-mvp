// @ts-nocheck
import { Page, expect } from '@playwright/test';

export class OAuth2ConsentPage {
  constructor(private readonly page: Page) {}

  async expectConsentScreen(provider: 'google' | 'github' | 'slack'): Promise<void> {
    // For stubbed providers during test we just assert URL contains provider
    await expect(this.page).toHaveURL(new RegExp(provider, 'i'));
  }

  async approve(): Promise<void> {
    // In test environment we might auto-approve. If a consent button exists, click it.
    const approveBtn = this.page.locator('button:has-text("Allow")');
    if (await approveBtn.count()) {
      await approveBtn.click();
    }
  }
}
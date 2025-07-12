// @ts-nocheck
import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*dashboard/);
    await expect(this.page.locator('h2')).toContainText(/Dashboard|Overview|Welcome/i);
  }
}
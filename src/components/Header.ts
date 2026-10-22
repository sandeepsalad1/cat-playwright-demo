import type { Locator, Page } from '@playwright/test';

/** Global cat.com header: logo, account menu and top navigation. */
export class Header {
  readonly logo: Locator;
  readonly accountMenu: Locator;

  constructor(private readonly page: Page) {
    this.logo = page.locator('header a[href="/en_US.html"]').first();
    this.accountMenu = page.locator('a.newAccount').first();
  }

  /** Opens the account modal and follows its Sign In button to Cat ID. */
  async openSignIn(): Promise<void> {
    await this.accountMenu.click();
    await this.page
      .locator('.my-account-buttons a:visible', { hasText: 'Sign In' })
      .first()
      .click();
  }

  async goHome(): Promise<void> {
    await this.logo.click();
  }
}

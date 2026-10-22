import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Cat ID sign-in (Azure AD B2C at signin.cat.com).
 * Step 1: CWS ID -> Continue. Step 2: password -> Sign in.
 */
export class SignInPage {
  readonly username: Locator;
  readonly continueButton: Locator;
  readonly password: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.username = page.locator('#signInName');
    this.continueButton = page.locator('#next');
    this.password = page.locator('#password, input[type="password"]').first();
    this.submitButton = page.locator('#next, button[type="submit"]').first();
  }

  async expectOnSignIn(): Promise<void> {
    await this.page.waitForURL(/signin\.cat\.com/);
    await expect(this.username).toBeVisible();
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.expectOnSignIn();
    await this.username.fill(username);
    await this.continueButton.click();
    await expect(this.password).toBeVisible();
    await this.password.fill(password);
    await this.submitButton.click();
    // B2C redirects back to cat.com via /services/catb2c/callback.
    await this.page.waitForURL(/www\.cat\.com\/(?!services)/, { timeout: 60_000 });
  }
}

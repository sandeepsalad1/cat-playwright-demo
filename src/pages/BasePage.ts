import { expect, type Locator, type Page } from '@playwright/test';
import { Header } from '../components/Header';

/**
 * Shared behaviour for every cat.com page: navigation, the cookie banner,
 * and the global header.
 */
export abstract class BasePage {
  readonly header: Header;
  protected abstract readonly path: string;

  constructor(readonly page: Page) {
    this.header = new Header(page);
  }

  async goto(): Promise<void> {
    // Third-party analytics can hold the "load" event open for a long time.
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    await this.dismissCookieBanner();
  }

  /** OneTrust banner appears on first visit in a fresh browser context. */
  async dismissCookieBanner(): Promise<void> {
    const accept = this.page.locator('#onetrust-accept-btn-handler');
    try {
      await accept.waitFor({ state: 'visible', timeout: 5_000 });
      await accept.click();
      await accept.waitFor({ state: 'hidden' });
    } catch {
      // Banner not shown (already accepted or not served) - nothing to do.
    }
  }

  /** Main page heading. Some pages (e.g. merchandise) have no h1, so fall back to h2. */
  get heading(): Locator {
    return this.page.locator('h1:visible, h2:visible').first();
  }

  async expectLoaded(titlePattern: RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(titlePattern);
    await expect(this.heading).toBeVisible();
  }
}

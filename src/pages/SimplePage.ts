import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Content pages that only need navigation and a load check. */
export class SimplePage extends BasePage {
  constructor(page: Page, protected readonly path: string) {
    super(page);
  }
}

export const financingPage = (page: Page) =>
  new SimplePage(page, '/en_US/support/financing-protection.html');

export const merchandisePage = (page: Page) =>
  new SimplePage(page, '/en_US/products/gifts-and-apparel.html');

import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  protected readonly path = '/en_US.html';
  readonly browseEquipmentLink: Locator;
  readonly financingLink: Locator;
  readonly merchandiseLink: Locator;

  constructor(page: Page) {
    super(page);
    // The mega-menu holds hidden copies of these links, so only match visible ones.
    this.browseEquipmentLink = page.locator('a[href$="/en_US/products/new/equipment.html"]:visible').first();
    this.financingLink = page.locator('a[href$="/en_US/support/financing-protection.html"]:visible').first();
    this.merchandiseLink = page.locator('a[href$="/en_US/products/gifts-and-apparel.html"]:visible').first();
  }
}

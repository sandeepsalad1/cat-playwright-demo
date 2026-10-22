import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** A single equipment family, e.g. /equipment/excavators.html. */
export class EquipmentCategoryPage extends BasePage {
  protected path: string;

  constructor(page: Page, readonly slug: string) {
    super(page);
    this.path = `/en_US/products/new/equipment/${slug}.html`;
  }

  subcategoryLink(subSlug: string): Locator {
    return this.page
      .locator(`a[href$="/equipment/${this.slug}/${subSlug}.html"]:visible`)
      .first();
  }

  async openSubcategory(subSlug: string): Promise<void> {
    await this.subcategoryLink(subSlug).click();
    await this.page.waitForURL(`**/equipment/${this.slug}/${subSlug}.html`, {
      waitUntil: 'domcontentloaded',
    });
  }
}

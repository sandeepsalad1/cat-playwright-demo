import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** /en_US/products/new/equipment.html - list of all equipment families. */
export class EquipmentPage extends BasePage {
  protected readonly path = '/en_US/products/new/equipment.html';

  constructor(page: Page) {
    super(page);
  }

  /** Category cards live in the catalogue grid, not the (hidden) mega-menu. */
  get catalogue(): Locator {
    return this.page.locator('.catalog-container');
  }

  get categoryCards(): Locator {
    return this.catalogue.locator('a[href*="/en_US/products/new/equipment/"]:visible');
  }

  /** The grid is rendered client-side a few seconds after DOMContentLoaded. */
  async waitForCatalogue(): Promise<void> {
    await expect(this.categoryCards.first()).toBeVisible({ timeout: 30_000 });
  }

  override async goto(): Promise<void> {
    await super.goto();
    await this.waitForCatalogue();
  }

  /** Open the page without waiting for cards - for tests where the feed is empty or failing. */
  async gotoWithoutCatalogue(): Promise<void> {
    await super.goto();
  }

  /** Card titles in display order, including cards hidden beyond the first page. */
  get cardTitles(): Locator {
    return this.catalogue.locator('a.card-title');
  }

  /**
   * Cards don't share one URL shape: most are /equipment/<slug>.html but some
   * (e.g. motor graders) are /content/catdotcom/.../equipment/<slug>/<slug>.html.
   * Match on the slug segment instead of an exact path.
   */
  categoryLink(slug: string): Locator {
    return this.catalogue.locator(`a[href*="/equipment/${slug}"]:visible`).first();
  }

  async openCategory(slug: string): Promise<void> {
    await this.categoryLink(slug).click();
    await this.page.waitForURL(new RegExp(`/equipment/${slug}(/${slug})?\\.html`), {
      waitUntil: 'domcontentloaded',
    });
  }

  /** Slugs of every family linked from the page, e.g. "excavators". */
  async categorySlugs(): Promise<string[]> {
    await this.waitForCatalogue();
    const hrefs = await this.categoryCards
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    const slugs = hrefs
      .map((href) => href.match(/\/equipment\/([a-z0-9-]+)(?:\/\1)?\.html$/)?.[1])
      .filter((s): s is string => Boolean(s));
    return [...new Set(slugs)];
  }
}

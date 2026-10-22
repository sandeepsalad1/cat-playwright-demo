import type { Page, Route } from '@playwright/test';
import {
  CATALOGUE_FEED_GLOB,
  type CatalogueFeed,
  type ProductFamily,
} from '../api/catalogueFeed';

/**
 * Controls what the equipment page receives from its catalogue feed, so the UI
 * can be tested independently of the data behind it. Call before navigating.
 */
export class CatalogueMock {
  constructor(private readonly page: Page) {}

  /** Serve a fixed feed; the real endpoint is never called. */
  async stub(models: ProductFamily[], overrides: Partial<CatalogueFeed> = {}): Promise<void> {
    await this.page.route(CATALOGUE_FEED_GLOB, (route) =>
      route.fulfill({ json: { ...emptyFeed(), ...overrides, models } }),
    );
  }

  /** Call the real endpoint, then change its response before the page sees it. */
  async patch(change: (feed: CatalogueFeed) => CatalogueFeed): Promise<void> {
    await this.page.route(CATALOGUE_FEED_GLOB, async (route) => {
      const response = await route.fetch();
      const feed = (await response.json()) as CatalogueFeed;
      await route.fulfill({ response, json: change(feed) });
    });
  }

  /** Answer with an HTTP error status. */
  async fail(status: number, body = 'Internal Server Error'): Promise<void> {
    await this.page.route(CATALOGUE_FEED_GLOB, (route) =>
      route.fulfill({ status, contentType: 'text/plain', body }),
    );
  }

  /** Drop the request as if the network failed. */
  async abort(): Promise<void> {
    await this.page.route(CATALOGUE_FEED_GLOB, (route) => route.abort('failed'));
  }

  /** Let the real response through, but only after a delay. */
  async delay(ms: number): Promise<void> {
    await this.page.route(CATALOGUE_FEED_GLOB, async (route: Route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, ms));
      await route.fulfill({ response });
    });
  }
}

export function emptyFeed(): CatalogueFeed {
  return { models: [], sidekicks: [], promoCards: [], dealers: [], hasPrice: false, pageType: 'productFamily' };
}

/** A made-up product family that links to a real page shape. */
export function family(name: string, id: number, slug = name.toLowerCase().replace(/\s+/g, '-')): ProductFamily {
  return {
    family_name: name,
    family_url: `/en_US/products/new/equipment/${slug}.html`,
    family_id: String(id),
    image_url: 'https://s7d2.scene7.com/is/image/Caterpillar/CM20210429-d9417-b0b02?$webp-cc-s$',
    small_image_url: 'https://s7d2.scene7.com/is/image/Caterpillar/CM20210429-d9417-b0b02?$cc-t$',
    filters: ['acquisition_type:new'],
  };
}

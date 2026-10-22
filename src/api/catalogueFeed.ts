import type { Page } from '@playwright/test';

/**
 * JSON feed the equipment page calls to render its catalogue grid.
 * Found by watching the page's network traffic; the UI has no other data source.
 */
export const CATALOGUE_FEED_PATH =
  '/content/catdotcom/en_US/products/new/equipment/jcr:content/root/responsivegrid/productfamilycards.feed.json';

/** Glob for page.route() - matches the feed on any host. */
export const CATALOGUE_FEED_GLOB = '**/productfamilycards.feed.json';

export type ProductFamily = {
  family_name: string;
  family_url: string;
  family_id: string;
  image_url: string;
  small_image_url?: string;
  filters: string[];
};

export type CatalogueFeed = {
  models: ProductFamily[];
  sidekicks: unknown[];
  promoCards: unknown[];
  dealers: unknown[];
  hasPrice: boolean;
  pageType: string;
};

/** status is 0 when the request fails at network level (e.g. a redirect loop). */
export type FetchResult = { status: number; contentType: string; body: string; error?: string };

/**
 * Calls the feed from inside a cat.com page.
 *
 * cat.com's CDN fingerprints non-browser HTTP clients and answers Playwright's
 * APIRequestContext (`request` fixture) with 403, even with the browser's cookies.
 * A fetch() from the page itself goes through Chromium's network stack and is
 * allowed, so the client runs its requests there. Against an internal test
 * environment without bot protection this would just use `request`.
 */
export class CatalogueFeedClient {
  constructor(private readonly page: Page) {}

  /** Load a light cat.com page so fetch() runs same-origin. */
  async open(): Promise<this> {
    await this.page.goto('/en_US.html', { waitUntil: 'domcontentloaded' });
    return this;
  }

  fetch(path: string, method: 'GET' | 'HEAD' = 'GET'): Promise<FetchResult> {
    return this.page.evaluate(
      async ({ path, method }) => {
        try {
          const res = await fetch(path, { method, headers: { Accept: 'application/json, text/html' } });
          return {
            status: res.status,
            contentType: res.headers.get('content-type') ?? '',
            body: method === 'HEAD' ? '' : await res.text(),
          };
        } catch (e) {
          return { status: 0, contentType: '', body: '', error: String(e) };
        }
      },
      { path, method },
    );
  }

  pause(ms: number): Promise<void> {
    return this.page.waitForTimeout(ms);
  }

  get(): Promise<FetchResult> {
    return this.fetch(CATALOGUE_FEED_PATH);
  }

  async models(): Promise<ProductFamily[]> {
    const response = await this.get();
    if (response.status !== 200) throw new Error(`Catalogue feed returned ${response.status}`);
    return (JSON.parse(response.body) as CatalogueFeed).models;
  }
}

/** "excavators" from "/en_US/products/new/equipment/excavators.html". */
export function slugOf(familyUrl: string): string | undefined {
  return familyUrl.match(/\/equipment\/([a-z0-9-]+)(?:\/[a-z0-9-]+)?\.html$/)?.[1];
}

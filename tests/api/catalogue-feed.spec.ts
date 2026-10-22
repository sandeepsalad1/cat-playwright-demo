import { test, expect } from '../../src/fixtures/test';
import { type CatalogueFeed } from '../../src/api/catalogueFeed';

const LINK_CHECK_DELAY_MS = 2_000;

/** Links seen broken on cat.com, with what was observed. Excluded from the link crawl. */
const knownBrokenLinks: Record<string, string> = {
  '/en_US/products/new/equipment/asphalt-pavers.html':
    'Found 22 Oct 2026: intermittently answers 301 redirecting to itself (ERR_TOO_MANY_REDIRECTS)',
};

/**
 * Contract checks on the live catalogue feed that drives the equipment grid.
 * If cat.com changes the shape of this JSON, these fail before the UI tests do.
 */
test.describe('catalogue feed API', () => {
  test('returns 200 JSON with the expected top-level shape', async ({ catalogueFeed }) => {
    const response = await catalogueFeed.get();

    expect(response.status).toBe(200);
    expect(response.contentType).toContain('application/json');

    const body = JSON.parse(response.body) as CatalogueFeed;
    expect(body).toEqual(
      expect.objectContaining({
        models: expect.any(Array),
        dealers: expect.any(Array),
        hasPrice: expect.any(Boolean),
        pageType: expect.any(String),
      }),
    );
  });

  test('every product family has a name, link, numeric id and image', async ({ catalogueFeed }) => {
    const models = await catalogueFeed.models();
    expect(models.length).toBeGreaterThan(10);

    for (const family of models) {
      expect.soft(family.family_name, JSON.stringify(family)).toMatch(/\S/);
      expect.soft(family.family_url, family.family_name).toMatch(/^\/.*\/equipment\/.+\.html$/);
      expect.soft(family.family_id, family.family_name).toMatch(/^\d+$/);
      expect.soft(family.image_url, family.family_name).toMatch(/^https:\/\//);
    }
  });

  test('family ids and names are unique', async ({ catalogueFeed }) => {
    const models = await catalogueFeed.models();
    const ids = models.map((m) => m.family_id);
    const names = models.map((m) => m.family_name);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  test('every family link resolves', async ({ catalogueFeed }) => {
    // ~25 requests: enough to trip cat.com's rate limiting when run with everything else,
    // so it only runs on request:  CHECK_ALL_LINKS=1 npm run test:api
    test.skip(!process.env.CHECK_ALL_LINKS, 'Set CHECK_ALL_LINKS=1 to crawl every family link');
    test.setTimeout(180_000);
    const models = await catalogueFeed.models();

    // Sequential and spaced out: cat.com rate-limits bursts (403) and it is a production site.
    for (const family of models.filter((m) => !(m.family_url in knownBrokenLinks))) {
      const response = await catalogueFeed.fetch(family.family_url, 'HEAD');
      expect.soft(response.status, `${family.family_name} -> ${family.family_url}`).toBe(200);
      await catalogueFeed.pause(LINK_CHECK_DELAY_MS);
    }
  });

  for (const [url, defect] of Object.entries(knownBrokenLinks)) {
    test(`known defect (monitored): ${url}`, async ({ catalogueFeed }) => {
      // Intermittent - it depends on which CDN edge serves the request - so it can't be a
      // hard pass/fail. Each run records what it saw as an annotation in the report.
      const response = await catalogueFeed.fetch(url, 'HEAD');
      const seen = response.status === 200 ? 'link worked on this run' : `still broken: ${response.error ?? response.status}`;
      test.info().annotations.push({ type: 'known defect', description: `${defect}. This run: ${seen}` });
      console.log(`[known defect] ${url} -> ${seen}`);
    });
  }

  test('the grid shows the feed families in feed order, first page visible', async ({
    catalogueFeed,
    equipmentPage,
  }) => {
    const feedUrls = (await catalogueFeed.models()).map((m) => m.family_url);

    await equipmentPage.goto();
    const visible = await equipmentPage.categoryCards.evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    const rendered = await equipmentPage.catalogue
      .locator('a.card-title')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href')));

    // Every family from the API is rendered, in the same order...
    expect(rendered).toEqual(feedUrls);
    // ...and the visible cards are the first page of it (the grid shows 24 at a time).
    expect(visible.length).toBe(Math.min(feedUrls.length, 24));
    expect(visible).toEqual(feedUrls.slice(0, visible.length));
  });
});

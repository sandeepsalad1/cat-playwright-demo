import { test, expect } from '../../src/fixtures/test';
import { family } from '../../src/mocks/catalogueMock';

/**
 * The real equipment page, with its catalogue feed intercepted by page.route().
 * Lets us drive states that production data can't give us on demand:
 * specific data, empty results, server errors, network failures and slow responses.
 */
test.describe('equipment catalogue with a mocked feed', () => {
  test('renders exactly the families the feed returns', async ({ catalogueMock, equipmentPage }) => {
    await catalogueMock.stub([family('Test Haul Truck', 9001), family('Test Loader', 9002)]);

    await equipmentPage.goto();

    await expect(equipmentPage.categoryCards).toHaveCount(2);
    await expect(equipmentPage.cardTitles).toHaveText(['Test Haul Truck', 'Test Loader']);
    await expect(equipmentPage.categoryLink('test-haul-truck')).toHaveAttribute(
      'href',
      '/en_US/products/new/equipment/test-haul-truck.html',
    );
  });

  test('shows changes made to the live response', async ({ catalogueMock, equipmentPage }) => {
    await catalogueMock.patch((feed) => ({
      ...feed,
      models: feed.models
        .slice(0, 3)
        .reverse()
        .map((m, i) => (i === 0 ? { ...m, family_name: `${m.family_name} (patched)` } : m)),
    }));

    await equipmentPage.goto();

    await expect(equipmentPage.categoryCards).toHaveCount(3);
    await expect(equipmentPage.cardTitles.first()).toHaveText(/\(patched\)\s*$/);
  });

  test('shows the first 24 families when the feed returns more', async ({ catalogueMock, equipmentPage }) => {
    const thirty = Array.from({ length: 30 }, (_, i) => family(`Test Family ${i + 1}`, 9100 + i));
    await catalogueMock.stub(thirty);

    await equipmentPage.goto();

    await expect(equipmentPage.cardTitles).toHaveCount(30);
    await expect(equipmentPage.categoryCards).toHaveCount(24);
    await expect(equipmentPage.categoryCards.last()).toHaveText('Test Family 24');
  });

  test('empty feed: no cards, page still usable', async ({ catalogueMock, equipmentPage, page }) => {
    const errors = collectPageErrors(page);
    await catalogueMock.stub([]);

    // Start waiting before navigating: the mocked response can arrive during goto().
    const feedResponse = page.waitForResponse('**/productfamilycards.feed.json');
    await equipmentPage.gotoWithoutCatalogue();
    await feedResponse;

    await expect(equipmentPage.heading).toBeVisible();
    await expect(equipmentPage.categoryCards).toHaveCount(0);
    await expect(equipmentPage.header.accountMenu).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const status of [500, 503, 404]) {
    test(`feed returns ${status}: no cards, page still usable`, async ({ catalogueMock, equipmentPage, page }) => {
      const errors = collectPageErrors(page);
      await catalogueMock.fail(status);

      const feedResponse = page.waitForResponse('**/productfamilycards.feed.json');
      await equipmentPage.gotoWithoutCatalogue();
      await feedResponse;

      await expect(equipmentPage.heading).toBeVisible();
      await expect(equipmentPage.categoryCards).toHaveCount(0);
      await expect(equipmentPage.header.accountMenu).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('network failure: no cards, page still usable', async ({ catalogueMock, equipmentPage, page }) => {
    const errors = collectPageErrors(page);
    await catalogueMock.abort();

    const failed = page.waitForEvent('requestfailed', (r) => r.url().includes('productfamilycards.feed.json'));
    await equipmentPage.gotoWithoutCatalogue();
    await failed;

    await expect(equipmentPage.heading).toBeVisible();
    await expect(equipmentPage.categoryCards).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('slow feed: cards appear once the response arrives', async ({ catalogueMock, equipmentPage }) => {
    await catalogueMock.delay(6_000);

    await equipmentPage.gotoWithoutCatalogue();
    await expect(equipmentPage.categoryCards).toHaveCount(0);

    await equipmentPage.waitForCatalogue();
    await expect(equipmentPage.categoryCards.first()).toBeVisible();
  });
});

/** Uncaught exceptions thrown by the page's own JavaScript. */
function collectPageErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

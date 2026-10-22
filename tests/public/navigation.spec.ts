import { test, expect } from '../../src/fixtures/test';
import { EquipmentCategoryPage } from '../../src/pages/EquipmentCategoryPage';
import { equipmentJourneys } from '../../src/data/equipment';

test.describe('cat.com public navigation', () => {
  test('home page loads with the main header', async ({ homePage }) => {
    await homePage.goto();
    await homePage.expectLoaded(/Cat \| Caterpillar/);
    await expect(homePage.header.accountMenu).toBeVisible();
  });

  test('home -> equipment catalogue', async ({ homePage, equipmentPage, page }) => {
    await homePage.goto();
    await homePage.browseEquipmentLink.click();
    await expect(page).toHaveURL(/\/products\/new\/equipment\.html$/);
    await equipmentPage.expectLoaded(/Heavy Equipment/);

    const slugs = await equipmentPage.categorySlugs();
    expect(slugs.length).toBeGreaterThan(10);
    expect(slugs).toEqual(expect.arrayContaining(['excavators', 'dozers']));
  });

  for (const journey of equipmentJourneys) {
    test(`equipment -> ${journey.slug}`, async ({ equipmentPage, page }) => {
      await equipmentPage.goto();
      await equipmentPage.openCategory(journey.slug);

      const category = new EquipmentCategoryPage(page, journey.slug);
      await category.expectLoaded(journey.title);

      if ('subcategory' in journey) {
        await category.openSubcategory(journey.subcategory);
        await expect(category.heading).toBeVisible();
      }
    });
  }

  test('financing and merchandise pages are reachable', async ({ financing, merchandise }) => {
    await financing.goto();
    await financing.expectLoaded(/Financ/i);

    await merchandise.goto();
    await merchandise.expectLoaded(/Gifts|Apparel|Merchandise/i);
  });

  test('sign in hands off to Cat ID', async ({ homePage, signInPage }) => {
    await homePage.goto();
    await homePage.header.openSignIn();
    await signInPage.expectOnSignIn();
  });
});

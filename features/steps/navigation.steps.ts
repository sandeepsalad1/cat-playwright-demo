import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';
import { EquipmentCategoryPage } from '../../src/pages/EquipmentCategoryPage';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

Given('I am on the cat.com home page', async ({ homePage }) => {
  await homePage.goto();
  await homePage.expectLoaded(/Cat \| Caterpillar/);
});

When('I open the equipment catalogue', async ({ homePage, equipmentPage, page }) => {
  await homePage.browseEquipmentLink.click();
  await expect(page).toHaveURL(/\/products\/new\/equipment\.html$/);
  await equipmentPage.waitForCatalogue();
});

Then('I should see more than {int} equipment families', async ({ equipmentPage }, min: number) => {
  expect((await equipmentPage.categorySlugs()).length).toBeGreaterThan(min);
});

Then(
  'the catalogue should include {string} and {string}',
  async ({ equipmentPage }, first: string, second: string) => {
    expect(await equipmentPage.categorySlugs()).toEqual(expect.arrayContaining([first, second]));
  },
);

When(
  'I open the {string} equipment family',
  async ({ equipmentPage, page, currentCategory }, family: string) => {
    await equipmentPage.openCategory(family);
    currentCategory.value = new EquipmentCategoryPage(page, family);
  },
);

Then(
  'I should be on the {string} page titled {string}',
  async ({ page, currentCategory }, family: string, title: string) => {
    await expect(page).toHaveURL(new RegExp(`/equipment/${family}`));
    await currentCategory.value!.expectLoaded(new RegExp(escape(title), 'i'));
  },
);

When('I open the {string} sub-category', async ({ currentCategory }, sub: string) => {
  await currentCategory.value!.openSubcategory(sub);
});

Then('I should be on the {string} sub-category page', async ({ page, currentCategory }, sub: string) => {
  await expect(page).toHaveURL(new RegExp(`/${sub}\\.html`));
  await expect(currentCategory.value!.heading).toBeVisible();
});

When('I visit the {string} page', async ({ financing, merchandise }, name: string) => {
  const target = { financing, merchandise }[name as 'financing' | 'merchandise'];
  if (!target) throw new Error(`Unknown page "${name}"`);
  await target.goto();
});

Then('the page title should mention {string}', async ({ page }, title: string) => {
  await expect(page).toHaveTitle(new RegExp(escape(title), 'i'));
});

When('I choose to sign in', async ({ homePage }) => {
  await homePage.header.openSignIn();
});

Then('I should be on the Cat ID sign-in page', async ({ signInPage }) => {
  await signInPage.expectOnSignIn();
});

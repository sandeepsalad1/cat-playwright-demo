import { test, expect } from '../../src/fixtures/test';

test.describe('signed-in user', () => {
  test('can open My Account and its sections', async ({ myAccountPage, page }) => {
    await myAccountPage.goto();
    await expect(page).toHaveURL(/\/account\/myaccount/);

    for (const section of ['Account Information', 'Site Settings', 'Security Settings'] as const) {
      await expect(myAccountPage.sectionLink(section)).toBeVisible();
    }
  });

  test('session survives navigation to the equipment catalogue', async ({ equipmentPage, page }) => {
    await equipmentPage.goto();
    await equipmentPage.expectLoaded(/Heavy Equipment/);
    // Still signed in: the account page opens without redirecting to Cat ID.
    await page.goto('/en_US/account/myaccount.html');
    await expect(page).not.toHaveURL(/signin\.cat\.com/);
  });
});

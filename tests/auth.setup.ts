import { test as setup, expect } from '../src/fixtures/test';
import { STORAGE_STATE } from '../src/config/paths';

/**
 * Signs in once with credentials from .env and saves the session so the
 * "authenticated" project starts already logged in.
 */
setup('sign in to Cat ID', async ({ homePage, signInPage, page }) => {
  const username = process.env.CAT_USERNAME!;
  const password = process.env.CAT_PASSWORD!;

  await homePage.goto();
  await homePage.header.openSignIn();
  await signInPage.signIn(username, password);

  await expect(page).toHaveURL(/www\.cat\.com/);
  await page.context().storageState({ path: STORAGE_STATE });
});

import type { Fixtures, PlaywrightTestArgs } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { EquipmentPage } from '../pages/EquipmentPage';
import { SignInPage } from '../pages/SignInPage';
import { MyAccountPage } from '../pages/MyAccountPage';
import { financingPage, merchandisePage, type SimplePage } from '../pages/SimplePage';

export type PageFixtures = {
  homePage: HomePage;
  equipmentPage: EquipmentPage;
  financing: SimplePage;
  merchandise: SimplePage;
  signInPage: SignInPage;
  myAccountPage: MyAccountPage;
};

/**
 * Page objects created per test. Shared by the plain Playwright specs
 * (src/fixtures/test.ts) and the BDD steps (features/steps/fixtures.ts).
 */
export const pageFixtures: Fixtures<PageFixtures, {}, PlaywrightTestArgs> = {
  homePage: async ({ page }, use) => use(new HomePage(page)),
  equipmentPage: async ({ page }, use) => use(new EquipmentPage(page)),
  financing: async ({ page }, use) => use(financingPage(page)),
  merchandise: async ({ page }, use) => use(merchandisePage(page)),
  signInPage: async ({ page }, use) => use(new SignInPage(page)),
  myAccountPage: async ({ page }, use) => use(new MyAccountPage(page)),
};

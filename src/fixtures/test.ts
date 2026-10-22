import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { EquipmentPage } from '../pages/EquipmentPage';
import { SignInPage } from '../pages/SignInPage';
import { MyAccountPage } from '../pages/MyAccountPage';
import { financingPage, merchandisePage, type SimplePage } from '../pages/SimplePage';

type PageFixtures = {
  homePage: HomePage;
  equipmentPage: EquipmentPage;
  financing: SimplePage;
  merchandise: SimplePage;
  signInPage: SignInPage;
  myAccountPage: MyAccountPage;
};

/**
 * Page objects are created per test, so specs ask for what they need
 * instead of constructing pages themselves.
 */
export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  equipmentPage: async ({ page }, use) => use(new EquipmentPage(page)),
  financing: async ({ page }, use) => use(financingPage(page)),
  merchandise: async ({ page }, use) => use(merchandisePage(page)),
  signInPage: async ({ page }, use) => use(new SignInPage(page)),
  myAccountPage: async ({ page }, use) => use(new MyAccountPage(page)),
});

export { expect };

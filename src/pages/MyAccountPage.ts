import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyAccountPage extends BasePage {
  protected readonly path = '/en_US/account/myaccount.html';

  constructor(page: Page) {
    super(page);
  }

  sectionLink(name: 'Account Information' | 'Site Settings' | 'Security Settings') {
    return this.page.getByRole('link', { name, exact: true }).first();
  }
}

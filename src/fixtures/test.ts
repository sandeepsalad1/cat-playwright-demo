import { test as base, expect } from '@playwright/test';
import { pageFixtures, type PageFixtures } from './pageFixtures';

/**
 * Page objects are created per test, so specs ask for what they need
 * instead of constructing pages themselves.
 */
export const test = base.extend<PageFixtures>(pageFixtures);

export { expect };

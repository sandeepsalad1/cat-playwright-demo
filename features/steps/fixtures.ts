import { test as base, createBdd } from 'playwright-bdd';
import { pageFixtures, type PageFixtures } from '../../src/fixtures/pageFixtures';
import type { EquipmentCategoryPage } from '../../src/pages/EquipmentCategoryPage';

type ScenarioState = {
  /** The equipment family page the scenario is currently on. */
  currentCategory: { value?: EquipmentCategoryPage };
};

// Same page-object fixtures as the plain specs, plus per-scenario state.
export const test = base.extend<PageFixtures & ScenarioState>({
  ...pageFixtures,
  currentCategory: async ({}, use) => use({}),
});

export const { Given, When, Then } = createBdd(test);

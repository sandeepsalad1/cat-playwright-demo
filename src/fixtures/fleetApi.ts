import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { startFleetApi, TOKENS, type Role } from '../../mock-api/fleetApi';

/** Who is calling: a real role, nobody, or someone with a bad token. */
export type Caller = Role | 'anonymous' | 'invalid-token';

export type FleetApiFixtures = {
  /** Base URL of a fresh mock API started for this test (isolated data). */
  fleetApiUrl: string;
  /** API client authenticated as the given caller. */
  as: (caller: Caller) => Promise<APIRequestContext>;
};

export const test = base.extend<FleetApiFixtures>({
  fleetApiUrl: async ({}, use) => {
    const api = await startFleetApi();
    await use(api.url);
    await api.close();
  },

  as: async ({ playwright, fleetApiUrl }, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async (caller) => {
      const token = caller === 'anonymous' ? undefined : caller === 'invalid-token' ? 'not-a-real-token' : TOKENS[caller];
      const context = await playwright.request.newContext({
        baseURL: fleetApiUrl,
        extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      });
      contexts.push(context);
      return context;
    });
    await Promise.all(contexts.map((c) => c.dispose()));
  },
});

export { expect };

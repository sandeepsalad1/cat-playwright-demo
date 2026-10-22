import { test, expect, type Caller } from '../../src/fixtures/fleetApi';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Role } from '../../mock-api/fleetApi';

/**
 * REST API and role-based access tests against the local MOCK fleet API
 * (mock-api/fleetApi.ts). cat.com exposes no public API with roles, so this
 * shows the approach on a self-contained service. Each test gets fresh data.
 */

const newMachine = { name: 'Truck 202', type: 'haul-truck', site: 'East Pit', serialNumber: 'SN-797F-0202' };

type Action = { name: string; call: (api: APIRequestContext) => Promise<APIResponse> };

const actions: Record<string, Action> = {
  list: { name: 'list machines', call: (api) => api.get('/api/v1/machines') },
  read: { name: 'read a machine', call: (api) => api.get('/api/v1/machines/M-001') },
  create: { name: 'create a machine', call: (api) => api.post('/api/v1/machines', { data: newMachine }) },
  status: {
    name: 'change machine status',
    call: (api) => api.patch('/api/v1/machines/M-001/status', { data: { status: 'down' } }),
  },
  delete: { name: 'delete a machine', call: (api) => api.delete('/api/v1/machines/M-002') },
};

/** Expected HTTP status for every role x action. */
const permissionMatrix: Record<Role, Record<keyof typeof actions, number>> = {
  admin: { list: 200, read: 200, create: 201, status: 200, delete: 204 },
  operator: { list: 200, read: 200, create: 403, status: 200, delete: 403 },
  viewer: { list: 200, read: 200, create: 403, status: 403, delete: 403 },
};

test.describe('fleet API (mock) - authentication', () => {
  for (const caller of ['anonymous', 'invalid-token'] as Caller[]) {
    test(`${caller} caller gets 401 with an error body`, async ({ as }) => {
      const api = await as(caller);
      const response = await api.get('/api/v1/machines');

      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({
        error: { code: 'UNAUTHENTICATED', message: expect.any(String) },
      });
    });
  }

  test('a non-Bearer Authorization header is rejected', async ({ playwright, fleetApiUrl }) => {
    const api = await playwright.request.newContext({
      baseURL: fleetApiUrl,
      extraHTTPHeaders: { Authorization: 'Basic YWRtaW46YWRtaW4=' },
    });
    expect((await api.get('/api/v1/machines')).status()).toBe(401);
    await api.dispose();
  });
});

test.describe('fleet API (mock) - role permissions', () => {
  for (const [role, expectations] of Object.entries(permissionMatrix) as [Role, Record<string, number>][]) {
    for (const [key, expected] of Object.entries(expectations)) {
      test(`${role} can${expected === 403 ? 'not' : ''} ${actions[key].name} (${expected})`, async ({ as }) => {
        const response = await actions[key].call(await as(role));
        expect(response.status()).toBe(expected);
      });
    }
  }

  test('a forbidden call returns FORBIDDEN and changes nothing', async ({ as }) => {
    const viewer = await as('viewer');
    const admin = await as('admin');

    const response = await viewer.delete('/api/v1/machines/M-002');
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe('FORBIDDEN');

    expect((await admin.get('/api/v1/machines/M-002')).status()).toBe(200);
  });

  test('viewers do not see serial numbers; operators and admins do', async ({ as }) => {
    const machinesFor = async (role: Role) =>
      (await (await (await as(role)).get('/api/v1/machines')).json()).items as Record<string, unknown>[];

    for (const machine of await machinesFor('viewer')) {
      expect(machine).not.toHaveProperty('serialNumber');
    }
    for (const role of ['operator', 'admin'] as Role[]) {
      for (const machine of await machinesFor(role)) {
        expect(machine.serialNumber, role).toMatch(/^SN-/);
      }
    }
  });
});

test.describe('fleet API (mock) - validation and errors', () => {
  test('create without required fields lists every missing field', async ({ as }) => {
    const response = await (await as('admin')).post('/api/v1/machines', { data: { name: 'No details' } });

    expect(response.status()).toBe(400);
    const { error } = await response.json();
    expect(error.code).toBe('VALIDATION_ERROR');
    for (const field of ['type', 'site', 'serialNumber']) expect(error.message).toContain(`${field} is required`);
  });

  const badBodies: [string, unknown][] = [
    ['an unknown machine type', { ...newMachine, type: 'spaceship' }],
    ['an unexpected field', { ...newMachine, status: 'operating' }],
    ['blank strings', { ...newMachine, name: '   ' }],
  ];
  for (const [label, data] of badBodies) {
    test(`create with ${label} is rejected (400)`, async ({ as }) => {
      const response = await (await as('admin')).post('/api/v1/machines', { data });
      expect(response.status()).toBe(400);
      expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    });
  }

  test('malformed JSON is rejected (400 INVALID_JSON)', async ({ as }) => {
    const response = await (await as('admin')).post('/api/v1/machines', {
      headers: { 'Content-Type': 'application/json' },
      // A Buffer is sent as-is; a string would be JSON-encoded by Playwright.
      data: Buffer.from('{"name": "Truck",'),
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_JSON');
  });

  test('an invalid status value is rejected (400)', async ({ as }) => {
    const response = await (await as('operator')).patch('/api/v1/machines/M-001/status', {
      data: { status: 'flying' },
    });
    expect(response.status()).toBe(400);
  });

  test('an invalid status filter is rejected (400)', async ({ as }) => {
    expect((await (await as('viewer')).get('/api/v1/machines?status=flying')).status()).toBe(400);
  });

  test('unknown machine and unknown route return 404', async ({ as }) => {
    const admin = await as('admin');
    expect((await admin.get('/api/v1/machines/M-999')).status()).toBe(404);
    expect((await admin.delete('/api/v1/machines/M-999')).status()).toBe(404);
    expect((await admin.get('/api/v1/sites')).status()).toBe(404);
  });

  test('unsupported method returns 405', async ({ as }) => {
    expect((await (await as('admin')).put('/api/v1/machines/M-001', { data: {} })).status()).toBe(405);
  });
});

test.describe('fleet API (mock) - end to end', () => {
  test('admin creates, reads, updates, filters and deletes a machine', async ({ as }) => {
    const admin = await as('admin');

    const created = await admin.post('/api/v1/machines', { data: newMachine });
    expect(created.status()).toBe(201);
    const machine = await created.json();
    expect(machine).toEqual({ id: expect.stringMatching(/^M-\d{3}$/), status: 'idle', ...newMachine });
    expect(created.headers()['location']).toBe(`/api/v1/machines/${machine.id}`);

    expect(await (await admin.get(`/api/v1/machines/${machine.id}`)).json()).toEqual(machine);

    const updated = await admin.patch(`/api/v1/machines/${machine.id}/status`, { data: { status: 'operating' } });
    expect((await updated.json()).status).toBe('operating');

    const operating = await (await admin.get('/api/v1/machines?status=operating')).json();
    expect(operating.items.map((m: { id: string }) => m.id)).toContain(machine.id);
    expect(operating.total).toBe(operating.items.length);

    expect((await admin.delete(`/api/v1/machines/${machine.id}`)).status()).toBe(204);
    expect((await admin.get(`/api/v1/machines/${machine.id}`)).status()).toBe(404);
  });
});

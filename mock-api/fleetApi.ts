import http from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A small, self-contained REST API used to demonstrate API and role-based access
 * (RBAC) testing. It is a MOCK - loosely modelled on a mining fleet service
 * (machines, statuses, sites) - and is not a Caterpillar or MineStar API.
 *
 * Roles:
 *   admin    - full access: list, read, create, update status, delete
 *   operator - list, read, update status
 *   viewer   - list and read only; serial numbers are hidden
 *
 * Errors always use the shape { error: { code, message } }.
 */

export type Role = 'admin' | 'operator' | 'viewer';
export type MachineStatus = 'operating' | 'idle' | 'maintenance' | 'down';

export type Machine = {
  id: string;
  name: string;
  type: 'haul-truck' | 'excavator' | 'dozer' | 'loader' | 'drill';
  site: string;
  status: MachineStatus;
  serialNumber: string;
};

/** Static bearer tokens - fine for a local mock, never for anything real. */
export const TOKENS: Record<Role, string> = {
  admin: 'mock-admin-token',
  operator: 'mock-operator-token',
  viewer: 'mock-viewer-token',
};

const MACHINE_TYPES: Machine['type'][] = ['haul-truck', 'excavator', 'dozer', 'loader', 'drill'];
const STATUSES: MachineStatus[] = ['operating', 'idle', 'maintenance', 'down'];

const PERMISSIONS: Record<Role, ReadonlySet<string>> = {
  admin: new Set(['machines:read', 'machines:create', 'machines:status', 'machines:delete', 'serial:read']),
  operator: new Set(['machines:read', 'machines:status', 'serial:read']),
  viewer: new Set(['machines:read']),
};

function seed(): Map<string, Machine> {
  const machines: Machine[] = [
    { id: 'M-001', name: 'Truck 101', type: 'haul-truck', site: 'North Pit', status: 'operating', serialNumber: 'SN-797F-0001' },
    { id: 'M-002', name: 'Shovel 7', type: 'excavator', site: 'North Pit', status: 'idle', serialNumber: 'SN-6060-0002' },
    { id: 'M-003', name: 'Dozer 12', type: 'dozer', site: 'South Dump', status: 'maintenance', serialNumber: 'SN-D11-0003' },
  ];
  return new Map(machines.map((m) => [m.id, m]));
}

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export type RunningFleetApi = { url: string; close: () => Promise<void> };

/** Starts a fresh API (with fresh data) on a free port. */
export async function startFleetApi(): Promise<RunningFleetApi> {
  const machines = seed();
  let nextId = machines.size + 1;

  const server = http.createServer(async (req, res) => {
    const send = (status: number, body?: unknown) => {
      res.writeHead(status, body === undefined ? {} : { 'Content-Type': 'application/json' });
      res.end(body === undefined ? undefined : JSON.stringify(body));
    };

    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean); // ['api','v1','machines',id?,'status'?]

      if (url.pathname === '/health') return send(200, { status: 'ok' });
      if (parts[0] !== 'api' || parts[1] !== 'v1' || parts[2] !== 'machines' || parts.length > 5) {
        throw new ApiError(404, 'NOT_FOUND', `No route for ${req.method} ${url.pathname}`);
      }

      const role = authenticate(req.headers.authorization);
      const can = (permission: string) => PERMISSIONS[role].has(permission);
      const require = (permission: string) => {
        if (!can(permission)) throw new ApiError(403, 'FORBIDDEN', `Role '${role}' cannot ${permission}`);
      };
      const view = (m: Machine) => (can('serial:read') ? m : { ...m, serialNumber: undefined });
      const find = (id: string) => {
        const m = machines.get(id);
        if (!m) throw new ApiError(404, 'NOT_FOUND', `Machine ${id} not found`);
        return m;
      };

      const [, , , id, sub] = parts;

      // /api/v1/machines
      if (!id) {
        if (req.method === 'GET') {
          require('machines:read');
          const status = url.searchParams.get('status');
          if (status && !STATUSES.includes(status as MachineStatus)) {
            throw new ApiError(400, 'VALIDATION_ERROR', `Unknown status '${status}'`);
          }
          const list = [...machines.values()].filter((m) => !status || m.status === status);
          return send(200, { items: list.map(view), total: list.length });
        }
        if (req.method === 'POST') {
          require('machines:create');
          const body = await readJson(req);
          const problems = validateNewMachine(body);
          if (problems.length) throw new ApiError(400, 'VALIDATION_ERROR', problems.join('; '));
          const machine: Machine = {
            id: `M-${String(nextId++).padStart(3, '0')}`,
            status: 'idle',
            ...(body as Omit<Machine, 'id' | 'status'>),
          };
          machines.set(machine.id, machine);
          res.setHeader('Location', `/api/v1/machines/${machine.id}`);
          return send(201, view(machine));
        }
        throw new ApiError(405, 'METHOD_NOT_ALLOWED', `${req.method} not allowed`);
      }

      // /api/v1/machines/:id/status
      if (sub === 'status') {
        if (req.method !== 'PATCH') throw new ApiError(405, 'METHOD_NOT_ALLOWED', `${req.method} not allowed`);
        require('machines:status');
        const machine = find(id);
        const body = (await readJson(req)) as { status?: unknown };
        if (!STATUSES.includes(body.status as MachineStatus)) {
          throw new ApiError(400, 'VALIDATION_ERROR', `status must be one of ${STATUSES.join(', ')}`);
        }
        machine.status = body.status as MachineStatus;
        return send(200, view(machine));
      }
      if (sub) throw new ApiError(404, 'NOT_FOUND', `No route for ${req.method} ${url.pathname}`);

      // /api/v1/machines/:id
      if (req.method === 'GET') {
        require('machines:read');
        return send(200, view(find(id)));
      }
      if (req.method === 'DELETE') {
        require('machines:delete');
        find(id);
        machines.delete(id);
        return send(204);
      }
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', `${req.method} not allowed`);
    } catch (e) {
      if (e instanceof ApiError) return send(e.status, { error: { code: e.code, message: e.message } });
      return send(500, { error: { code: 'INTERNAL', message: 'Unexpected error' } });
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function authenticate(header: string | undefined): Role {
  if (!header) throw new ApiError(401, 'UNAUTHENTICATED', 'Missing Authorization header');
  const token = header.match(/^Bearer (.+)$/)?.[1];
  const role = (Object.keys(TOKENS) as Role[]).find((r) => TOKENS[r] === token);
  if (!role) throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid token');
  return role;
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body is not valid JSON');
  }
}

function validateNewMachine(body: unknown): string[] {
  const b = (body ?? {}) as Record<string, unknown>;
  const problems: string[] = [];
  for (const field of ['name', 'type', 'site', 'serialNumber']) {
    if (typeof b[field] !== 'string' || !(b[field] as string).trim()) problems.push(`${field} is required`);
  }
  if (typeof b.type === 'string' && !MACHINE_TYPES.includes(b.type as Machine['type'])) {
    problems.push(`type must be one of ${MACHINE_TYPES.join(', ')}`);
  }
  const unknown = Object.keys(b).filter((k) => !['name', 'type', 'site', 'serialNumber'].includes(k));
  if (unknown.length) problems.push(`unknown fields: ${unknown.join(', ')}`);
  return problems;
}

import path from 'path';

/** Where the signed-in browser session is saved by tests/auth.setup.ts. */
export const STORAGE_STATE = path.join(__dirname, '..', '..', '.auth', 'user.json');

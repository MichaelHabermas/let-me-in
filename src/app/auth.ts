import type { AdminAuthCredentials } from './admin-auth-types';

export type { AdminAuthCredentials } from './admin-auth-types';

/** PRD E6.S1.F1.T1 — persisted login instant (ms since epoch). */
export const ADMIN_TOKEN_STORAGE_KEY = 'gatekeeper_admin_token';

const SESSION_MS = 8 * 60 * 60 * 1000;

export type AdminAuthDeps = {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  nowMs: () => number;
  admin: AdminAuthCredentials;
};

export type AdminAuth = {
  login(user: string, pass: string): boolean;
  logout(): void;
  isAdmin(): boolean;
};

export function createAdminAuth(deps: AdminAuthDeps): AdminAuth {
  return {
    login(user: string, pass: string): boolean {
      if (user !== deps.admin.user || pass !== deps.admin.pass) return false;
      deps.storage.setItem(ADMIN_TOKEN_STORAGE_KEY, String(deps.nowMs()));
      return true;
    },
    logout(): void {
      deps.storage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    },
    isAdmin(): boolean {
      const raw = deps.storage.getItem(ADMIN_TOKEN_STORAGE_KEY);
      if (raw === null) return false;
      const t = Number(raw);
      if (!Number.isFinite(t)) return false;
      return deps.nowMs() - t < SESSION_MS;
    },
  };
}

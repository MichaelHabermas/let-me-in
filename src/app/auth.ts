import type { AdminAuthCredentials } from './admin-auth-types';

export type { AdminAuthCredentials } from './admin-auth-types';

/** PRD E6.S1.F1.T1 — persisted login instant (ms since epoch). */
export const ADMIN_TOKEN_STORAGE_KEY = 'gatekeeper_admin_token';

const SESSION_MS = 8 * 60 * 60 * 1000;

/** Client-only brute-force friction; does not replace server rate limits. */
const MAX_FAILED_ATTEMPTS_IN_WINDOW = 8;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

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
  let failWindowStart = 0;
  let failureCount = 0;
  let lockoutUntil = 0;

  return {
    login(user: string, pass: string): boolean {
      const now = deps.nowMs();
      if (now < lockoutUntil) return false;

      const match = user === deps.admin.user && pass === deps.admin.pass;
      if (match) {
        failWindowStart = 0;
        failureCount = 0;
        lockoutUntil = 0;
        deps.storage.setItem(ADMIN_TOKEN_STORAGE_KEY, String(now));
        return true;
      }

      if (now - failWindowStart > FAILURE_WINDOW_MS) {
        failWindowStart = now;
        failureCount = 0;
      }
      failureCount += 1;
      if (failureCount >= MAX_FAILED_ATTEMPTS_IN_WINDOW) {
        lockoutUntil = now + LOCKOUT_MS;
        failWindowStart = 0;
        failureCount = 0;
      }
      return false;
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

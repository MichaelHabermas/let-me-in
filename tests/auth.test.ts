/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';

import {
  ADMIN_TOKEN_STORAGE_KEY,
  createAdminAuth,
  type AdminAuthDeps,
} from '../src/app/auth';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem(k: string) {
      return m.has(k) ? m.get(k)! : null;
    },
    setItem(k: string, v: string) {
      m.set(k, v);
    },
    removeItem(k: string) {
      m.delete(k);
    },
    clear() {
      m.clear();
    },
    key() {
      return null;
    },
    get length() {
      return m.size;
    },
  };
}

type MakeDepsOverrides = {
  storage?: AdminAuthDeps['storage'];
  admin?: AdminAuthDeps['admin'];
  nowMs?: () => number;
};

function makeDeps(overrides: MakeDepsOverrides = {}): {
  deps: AdminAuthDeps;
  setNow: (ms: number) => void;
} {
  const t0 = 1_700_000_000_000;
  let now = t0;
  const deps: AdminAuthDeps = {
    storage: overrides.storage ?? memoryStorage(),
    nowMs: overrides.nowMs ?? (() => now),
    admin: overrides.admin ?? { user: 'admin', pass: 'secret' },
  };
  return {
    deps,
    setNow(ms: number) {
      now = ms;
    },
  };
}

describe('createAdminAuth', () => {
  it('rejects wrong password', () => {
    const { deps } = makeDeps();
    const auth = createAdminAuth(deps);
    expect(auth.login('admin', 'wrong')).toBe(false);
    expect(deps.storage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBeNull();
    expect(auth.isAdmin()).toBe(false);
  });

  it('accepts correct credentials and persists token timestamp', () => {
    const { deps } = makeDeps();
    const auth = createAdminAuth(deps);
    expect(auth.login('admin', 'secret')).toBe(true);
    expect(deps.storage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBe('1700000000000');
    expect(auth.isAdmin()).toBe(true);
  });

  it('treats expired session as logged out', () => {
    const { deps, setNow } = makeDeps({ admin: { user: 'a', pass: 'b' } });
    const auth = createAdminAuth(deps);
    expect(auth.login('a', 'b')).toBe(true);
    setNow(1_700_000_000_000 + 8 * 60 * 60 * 1000);
    expect(auth.isAdmin()).toBe(false);
  });

  it('logout clears token', () => {
    const { deps } = makeDeps();
    const auth = createAdminAuth(deps);
    auth.login('admin', 'secret');
    auth.logout();
    expect(deps.storage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBeNull();
    expect(auth.isAdmin()).toBe(false);
  });

  it('invalid token value is treated as logged out', () => {
    const { deps } = makeDeps();
    deps.storage.setItem(ADMIN_TOKEN_STORAGE_KEY, 'not-a-number');
    const auth = createAdminAuth(deps);
    expect(auth.isAdmin()).toBe(false);
  });
});

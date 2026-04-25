import { describe, expect, it } from 'vitest';

import {
  ADMIN_TOKEN_STORAGE_KEY,
  createAdminAuth,
  type AdminAuthDeps,
} from '../src/app/auth';
import { createMemoryStorage } from './support/memory-storage';

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
    storage: overrides.storage ?? createMemoryStorage(),
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

  it('rejects all logins while lockout is active, even with correct password', () => {
    const t0 = 1_000_000_000_000;
    let now = t0;
    const { deps } = makeDeps({ nowMs: () => now, admin: { user: 'u', pass: 'p' } });
    const auth = createAdminAuth(deps);
    for (let i = 0; i < 8; i += 1) {
      expect(auth.login('u', 'bad')).toBe(false);
    }
    now += 1;
    expect(auth.login('u', 'p')).toBe(false);
    now = t0 + 15 * 60 * 1000;
    expect(auth.login('u', 'p')).toBe(true);
  });

  it('resets failed-attempt state after a successful login', () => {
    const t0 = 2_000_000_000_000;
    let now = t0;
    const { deps } = makeDeps({ nowMs: () => now, admin: { user: 'u', pass: 'p' } });
    const auth = createAdminAuth(deps);
    for (let i = 0; i < 7; i += 1) {
      expect(auth.login('u', 'bad')).toBe(false);
    }
    expect(auth.login('u', 'p')).toBe(true);
    for (let i = 0; i < 7; i += 1) {
      expect(auth.login('u', 'bad')).toBe(false);
    }
    expect(auth.login('u', 'p')).toBe(true);
  });
});

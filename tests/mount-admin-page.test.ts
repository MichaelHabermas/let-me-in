/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminAuth } from '../src/app/auth';
import { mountAdminPage } from '../src/app/mount-admin-page';
import { createDexiePersistence } from '../src/infra/persistence';
import { createTestGateRuntime } from './support/create-test-gate-runtime';
import { stubCanvas2dContext } from './support/stub-canvas-2d-context';

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

const testDbName = 'mount-admin-page-test';

describe('mountAdminPage', () => {
  beforeEach(async () => {
    await Dexie.delete(testDbName);
    document.body.innerHTML = '<div id="app"></div>';
    stubCanvas2dContext();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Dexie.delete(testDbName);
    document.body.innerHTML = '';
  });

  it('shows login modal when injected auth is not admin', () => {
    const storage = memoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    mountAdminPage({
      rt: createTestGateRuntime(),
      persistence: createDexiePersistence(testDbName),
      auth,
    });

    expect(document.querySelector('[data-testid="admin-login-modal"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="admin-logout"]')).toBeNull();
  });

  it('shows enrollment when injected auth is already admin', () => {
    const storage = memoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    mountAdminPage({
      rt: createTestGateRuntime(),
      persistence: createDexiePersistence(testDbName),
      auth,
    });

    expect(document.querySelector('[data-testid="admin-login-modal"]')).toBeNull();
    expect(document.querySelector('[data-testid="admin-logout"]')).not.toBeNull();
  });

  it('logout uses injected auth storage only', () => {
    const storage = memoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    mountAdminPage({
      rt: createTestGateRuntime(),
      persistence: createDexiePersistence(testDbName),
      auth,
    });

    document.querySelector<HTMLButtonElement>('[data-testid="admin-logout"]')?.click();

    expect(auth.isAdmin()).toBe(false);
    expect(document.querySelector('[data-testid="admin-login-modal"]')).not.toBeNull();
  });
});

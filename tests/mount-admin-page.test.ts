/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminAuth } from '../src/app/auth';
import { mountAdminView } from '../src/app/mount-admin-shell';
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
let currentPersistence: ReturnType<typeof createDexiePersistence> | null = null;

function createTestPersistence() {
  currentPersistence = createDexiePersistence(testDbName);
  return currentPersistence;
}

async function waitForRosterRows(expected: number): Promise<void> {
  for (let i = 0; i < 100; i += 1) {
    if (document.querySelectorAll('[data-testid="admin-user-roster-tbody"] tr').length === expected) {
      return;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`Timed out waiting for ${expected} roster rows`);
}

describe('mountAdminView', () => {
  beforeEach(async () => {
    await currentPersistence?.resetIndexedDbClientForTests();
    currentPersistence = null;
    await Dexie.delete(testDbName);
    document.body.innerHTML = '<div id="app"></div>';
    stubCanvas2dContext();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await currentPersistence?.resetIndexedDbClientForTests();
    currentPersistence = null;
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
    mountAdminView({
      rt: createTestGateRuntime(),
      persistence: createTestPersistence(),
      auth,
    });

    expect(document.querySelector('[data-testid="admin-login-modal"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="admin-logout"]')).toBeNull();
  });

  it('shows enrollment when injected auth is already admin', async () => {
    const storage = memoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    const persistence = createTestPersistence();
    await persistence.initDatabase(createTestGateRuntime().databaseSeedSettings!);
    mountAdminView({
      rt: createTestGateRuntime(),
      persistence,
      auth,
    });

    expect(document.querySelector('[data-testid="admin-login-modal"]')).toBeNull();
    expect(document.querySelector('[data-testid="admin-logout"]')).not.toBeNull();
  });

  it('lists seeded users in roster table', async () => {
    const storage = memoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    const persistence = createTestPersistence();
    await persistence.initDatabase(createTestGateRuntime().databaseSeedSettings!);
    const emb = new Float32Array(512).fill(0.02);
    for (let i = 0; i < 3; i += 1) {
      await persistence.usersRepo.put({
        id: `id-${i}`,
        name: `User ${i}`,
        role: 'Staff',
        referenceImageBlob: new Blob([String(i)], { type: 'image/jpeg' }),
        embedding: emb,
        createdAt: 1_700_000_000_000 + i,
      });
    }

    mountAdminView({
      rt: createTestGateRuntime(),
      persistence,
      auth,
    });

    await waitForRosterRows(3);
  });

  it('logout uses injected auth storage only', async () => {
    const storage = memoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    const persistence = createTestPersistence();
    await persistence.initDatabase(createTestGateRuntime().databaseSeedSettings!);
    mountAdminView({
      rt: createTestGateRuntime(),
      persistence,
      auth,
    });

    document.querySelector<HTMLButtonElement>('[data-testid="admin-logout"]')?.click();

    expect(auth.isAdmin()).toBe(false);
    expect(document.querySelector('[data-testid="admin-login-modal"]')).not.toBeNull();
  });
});

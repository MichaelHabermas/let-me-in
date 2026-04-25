import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminAuth } from '../src/app/auth';
import type { GateRuntime } from '../src/app/gate-runtime';
import { mountAdminView } from '../src/app/mount-admin-shell';
import { createDexiePersistence } from '../src/infra/persistence';
import { createTestGateRuntime } from './support/create-test-gate-runtime';
import { createMemoryStorage } from './support/memory-storage';
import { embeddingVectorFilled } from './support/test-embeddings';
import { stubCanvas2dContext } from './support/stub-canvas-2d-context';

const testDbName = 'mount-admin-page-test';
let currentPersistence: ReturnType<typeof createDexiePersistence> | null = null;
let testRt: GateRuntime;

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
    testRt = createTestGateRuntime();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await currentPersistence?.resetIndexedDbClientForTests();
    currentPersistence = null;
    await Dexie.delete(testDbName);
    document.body.innerHTML = '';
  });

  it('shows login modal when injected auth is not admin', () => {
    const storage = createMemoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    mountAdminView({
      rt: testRt,
      persistence: createTestPersistence(),
      auth,
    });

    expect(document.querySelector('[data-testid="admin-login-modal"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="admin-logout"]')).toBeNull();
  });

  it('shows enrollment when injected auth is already admin', async () => {
    const storage = createMemoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    const persistence = createTestPersistence();
    await persistence.initDatabase(testRt.databaseSeedSettings!);
    mountAdminView({
      rt: testRt,
      persistence,
      auth,
    });

    expect(document.querySelector('[data-testid="admin-login-modal"]')).toBeNull();
    expect(document.querySelector('[data-testid="admin-logout"]')).not.toBeNull();
  });

  it('E14: threshold status and SPECS 0.75 preset update settings', async () => {
    const storage = createMemoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    const persistence = createTestPersistence();
    await persistence.initDatabase(testRt.databaseSeedSettings!);
    mountAdminView({ rt: testRt, persistence, auth });

    const status = document.querySelector('[data-testid="admin-thresholds-status"]');
    const calibrationStatus = document.querySelector(
      '[data-testid="admin-thresholds-calibration-status"]',
    );
    for (let i = 0; i < 100; i += 1) {
      if (status?.textContent?.includes('0.85')) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(status?.textContent).toMatch(/0\.85/);
    expect(status?.textContent).toMatch(/0\.65/);
    expect(status?.textContent).toMatch(/0\.05/);
    expect(calibrationStatus?.textContent).toContain('Auto-calibration');

    document.querySelector<HTMLButtonElement>('[data-testid="admin-threshold-apply-spec075"]')?.click();
    for (let i = 0; i < 50; i += 1) {
      if (status?.textContent?.includes('0.75')) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(status?.textContent).toMatch(/0\.75/);
  });

  it('lists seeded users in roster table', async () => {
    const storage = createMemoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    const persistence = createTestPersistence();
    await persistence.initDatabase(testRt.databaseSeedSettings!);
    const emb = embeddingVectorFilled(0.02);
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
      rt: testRt,
      persistence,
      auth,
    });

    await waitForRosterRows(3);
  });

  it('renders export control and triggers JSON download', async () => {
    const storage = createMemoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    const persistence = createTestPersistence();
    await persistence.initDatabase(testRt.databaseSeedSettings!);
    await persistence.usersRepo.put({
      id: 'id-1',
      name: 'User 1',
      role: 'Staff',
      referenceImageBlob: new Blob(['ref'], { type: 'image/jpeg' }),
      embedding: embeddingVectorFilled(0.02),
      createdAt: 1_700_000_000_000,
    });

    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    mountAdminView({
      rt: testRt,
      persistence,
      auth,
    });

    const exportButton = document.querySelector<HTMLButtonElement>('[data-testid="admin-export-trigger"]');
    expect(exportButton).not.toBeNull();
    const createCallsBefore = createObjectUrlSpy.mock.calls.length;
    const revokeCallsBefore = revokeObjectUrlSpy.mock.calls.length;
    exportButton?.click();
    for (let i = 0; i < 20; i += 1) {
      if (createObjectUrlSpy.mock.calls.length > createCallsBefore) break;
      await new Promise((r) => setTimeout(r, 0));
    }

    expect(createObjectUrlSpy.mock.calls.length).toBeGreaterThan(createCallsBefore);
    expect(revokeObjectUrlSpy.mock.calls.length).toBeGreaterThanOrEqual(revokeCallsBefore);
  });

  it('shows export failure status when download creation fails', async () => {
    const storage = createMemoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    const persistence = createTestPersistence();
    await persistence.initDatabase(testRt.databaseSeedSettings!);
    await persistence.usersRepo.put({
      id: 'id-err',
      name: 'Err User',
      role: 'Staff',
      referenceImageBlob: new Blob(['ref'], { type: 'image/jpeg' }),
      embedding: embeddingVectorFilled(0.03),
      createdAt: 1_700_000_000_999,
    });

    mountAdminView({
      rt: testRt,
      persistence,
      auth,
    });

    const exportButton = document.querySelector<HTMLButtonElement>('[data-testid="admin-export-trigger"]');
    const statusEl = document.querySelector<HTMLElement>('[data-testid="admin-import-status"]');
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
      if (blob instanceof Blob && blob.type.includes('application/json')) {
        throw new Error('boom');
      }
      return 'blob:ok';
    });
    exportButton?.click();
    for (let i = 0; i < 20; i += 1) {
      if (statusEl?.textContent === 'Export failed.') break;
      await new Promise((r) => setTimeout(r, 0));
    }

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(statusEl?.textContent).toBe('Export failed.');
  });

  it('logout uses injected auth storage only', async () => {
    const storage = createMemoryStorage();
    const auth = createAdminAuth({
      storage,
      nowMs: () => 1_700_000_000_000,
      admin: { user: 'u', pass: 'p' },
    });
    expect(auth.login('u', 'p')).toBe(true);

    const persistence = createTestPersistence();
    await persistence.initDatabase(testRt.databaseSeedSettings!);
    mountAdminView({
      rt: testRt,
      persistence,
      auth,
    });

    document.querySelector<HTMLButtonElement>('[data-testid="admin-logout"]')?.click();

    expect(auth.isAdmin()).toBe(false);
    expect(document.querySelector('[data-testid="admin-login-modal"]')).not.toBeNull();
  });
});

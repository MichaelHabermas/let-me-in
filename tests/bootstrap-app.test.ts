/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootstrapApp } from '../src/app/bootstrap-app';
import { createDexiePersistence } from '../src/infra/persistence';

const testDbName = 'bootstrap-app-isolated';
let currentPersistence: ReturnType<typeof createDexiePersistence> | null = null;

describe('bootstrapApp', () => {
  beforeEach(async () => {
    await currentPersistence?.resetIndexedDbClientForTests();
    currentPersistence = null;
    await Dexie.delete(testDbName);
  });

  afterEach(async () => {
    await currentPersistence?.resetIndexedDbClientForTests();
    currentPersistence = null;
    await Dexie.delete(testDbName);
  });

  it('initializes injected persistence before calling mount', async () => {
    const persistence = createDexiePersistence(testDbName);
    currentPersistence = persistence;
    const mount = vi.fn();

    const result = await bootstrapApp({
      mount,
      persistence,
      getHttpsStartupState: () => ({ ok: true }),
    });

    expect(result).toEqual({ ok: true });
    expect(mount).toHaveBeenCalledOnce();

    const settings = await persistence.settingsRepo.toArray();
    expect(settings.some((r) => r.key === 'thresholds')).toBe(true);
    expect(settings.some((r) => r.key === 'cooldownMs')).toBe(true);
  });

  it('uses injected getDatabaseSeedSettings for initDatabase', async () => {
    const persistence = createDexiePersistence(testDbName);
    currentPersistence = persistence;
    const mount = vi.fn();
    const seedCooldown = 424_242;
    const seedThresholds = { strong: 0.9, weak: 0.7, unknown: 0.7, margin: 0.06 };

    const result = await bootstrapApp({
      mount,
      persistence,
      getHttpsStartupState: () => ({ ok: true }),
      getDatabaseSeedSettings: () => ({
        thresholds: seedThresholds,
        cooldownMs: seedCooldown,
      }),
    });

    expect(result).toEqual({ ok: true });
    const settings = await persistence.settingsRepo.toArray();
    const cooldownRow = settings.find((r) => r.key === 'cooldownMs');
    expect(cooldownRow?.value).toBe(seedCooldown);
    const thresholdsRow = settings.find((r) => r.key === 'thresholds');
    expect(thresholdsRow?.value).toEqual(seedThresholds);
  });

  it('returns https result without mounting when HTTPS check fails', async () => {
    const mount = vi.fn();
    const renderHttpsBanner = vi.fn();

    const result = await bootstrapApp({
      mount,
      getHttpsStartupState: () => ({ ok: false, message: 'no https' }),
      renderHttpsBanner,
    });

    expect(result).toEqual({ ok: false, reason: 'https', message: 'no https' });
    expect(mount).not.toHaveBeenCalled();
    expect(renderHttpsBanner).toHaveBeenCalledWith('no https');
  });
});

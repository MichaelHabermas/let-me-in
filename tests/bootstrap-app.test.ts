/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootstrapApp } from '../src/app/bootstrap-app';
import { createDexiePersistence } from '../src/infra/persistence';

const testDbName = 'bootstrap-app-isolated';

describe('bootstrapApp', () => {
  beforeEach(async () => {
    await Dexie.delete(testDbName);
  });

  afterEach(async () => {
    await Dexie.delete(testDbName);
  });

  it('initializes injected persistence before calling mount', async () => {
    const persistence = createDexiePersistence(testDbName);
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

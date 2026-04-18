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

    bootstrapApp({ mount, persistence });

    await vi.waitFor(
      async () => {
        expect(mount).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    const settings = await persistence.settingsRepo.toArray();
    expect(settings.some((r) => r.key === 'thresholds')).toBe(true);
    expect(settings.some((r) => r.key === 'cooldownMs')).toBe(true);
  });
});

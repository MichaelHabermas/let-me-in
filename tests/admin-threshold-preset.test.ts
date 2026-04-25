import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import {
  applySpec075StrongPreset,
  readAccessThresholds,
  SPECS_COURSE_STRONG_FLOOR,
} from '../src/app/admin-threshold-preset';
import { createDexiePersistence } from '../src/infra/persistence';

import { createTestGateRuntime } from './support/create-test-gate-runtime';

describe('admin-threshold-preset (E14)', () => {
  const dbName = `admin-th-preset-${crypto.randomUUID()}`;

  afterEach(async () => {
    await Dexie.delete(dbName);
  });

  it('applySpec075StrongPreset sets strong to SPECS floor and preserves other fields', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);

    const before = await readAccessThresholds(persistence, rt.databaseSeedSettings);
    expect(before.strong).toBe(0.85);

    const after = await applySpec075StrongPreset(persistence, rt.databaseSeedSettings);
    expect(after.strong).toBe(SPECS_COURSE_STRONG_FLOOR);
    expect(after.weak).toBe(before.weak);
    expect(after.margin).toBe(before.margin);
    expect(after.unknown).toBe(before.unknown);

    const row = await readAccessThresholds(persistence, rt.databaseSeedSettings);
    expect(row.strong).toBe(0.75);
    await persistence.resetIndexedDbClientForTests();
  });
});

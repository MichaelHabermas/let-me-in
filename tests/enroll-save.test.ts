import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { persistEnrolledUser } from '../src/app/enroll-save';
import type { DatabaseSeedSettings } from '../src/infra/persistence';
import { createDexiePersistence } from '../src/infra/persistence';

const seed: DatabaseSeedSettings = {
  thresholds: { strong: 0.85, weak: 0.65, unknown: 0.65, margin: 0.05 },
  cooldownMs: 3000,
};

const dbName = 'enroll-save-test-db';

async function resetDb(): Promise<void> {
  await Dexie.delete(dbName);
}

describe('persistEnrolledUser', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(async () => {
    await resetDb();
  });

  it('writes one user row', async () => {
    const persistence = createDexiePersistence(dbName);
    await persistence.initDatabase(seed);
    await persistEnrolledUser(persistence, {
      name: 'Ada',
      role: 'Engineer',
      embedding: new Float32Array(512).fill(0.01),
      referenceImageBlob: new Blob(['x'], { type: 'image/jpeg' }),
      randomId: () => 'id-1',
      nowMs: () => 42,
    });
    const users = await persistence.usersRepo.toArray();
    expect(users).toHaveLength(1);
    expect(users[0]!.name).toBe('Ada');
    expect(users[0]!.embedding.length).toBe(512);
  });
});

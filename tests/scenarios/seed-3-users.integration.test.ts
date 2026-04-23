import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { persistEnrolledUser } from '../../src/app/enroll-save';
import type { DatabaseSeedSettings } from '../../src/infra/persistence';
import { createDexiePersistence } from '../../src/infra/persistence';

const seed: DatabaseSeedSettings = {
  thresholds: { strong: 0.85, weak: 0.65, unknown: 0.65, margin: 0.05 },
  cooldownMs: 3000,
};

const dbName = 'gatekeeper';

async function wipe(): Promise<void> {
  await Dexie.delete(dbName);
}

describe('seed 3 users (dev helper)', () => {
  beforeEach(wipe);
  afterEach(wipe);

  it('writes three distinct users into IndexedDB', async () => {
    const persistence = createDexiePersistence(dbName);
    await persistence.initDatabase(seed);

    for (let i = 0; i < 3; i++) {
      const emb = new Float32Array(512);
      emb.fill((i + 1) * 0.001);
      await persistEnrolledUser(persistence, {
        name: `Seed User ${i + 1}`,
        role: `Role ${i + 1}`,
        embedding: emb,
        referenceImageBlob: new Blob([`fake-jpeg-${i}`], { type: 'image/jpeg' }),
        randomId: () => `00000000-0000-4000-8000-00000000000${i + 1}`,
        nowMs: () => 1_700_000_000_000 + i,
      });
    }

    const users = await persistence.usersRepo.toArray();
    expect(users).toHaveLength(3);
    expect(users.map((u) => u.name).sort()).toEqual(['Seed User 1', 'Seed User 2', 'Seed User 3']);
  });
});

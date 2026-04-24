import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { USER_ROLES } from '../../src/domain/user-roles';
import { persistEnrolledUser } from '../../src/app/enrollment/enroll-save';
import { createDexiePersistence } from '../../src/infra/persistence';

import { DEFAULT_TEST_DATABASE_SEED } from '../support/create-test-gate-runtime';
import { embeddingVectorFilled } from '../support/test-embeddings';

const seed = DEFAULT_TEST_DATABASE_SEED;

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
      const emb = embeddingVectorFilled((i + 1) * 0.001);
      await persistEnrolledUser(persistence, {
        name: `Seed User ${i + 1}`,
        role: USER_ROLES[i % USER_ROLES.length]!,
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

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
      role: 'Staff',
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

  it('updates existing user id and preserves createdAt by default', async () => {
    const persistence = createDexiePersistence(dbName);
    await persistence.initDatabase(seed);
    await persistEnrolledUser(persistence, {
      name: 'Ada',
      role: 'Staff',
      embedding: new Float32Array(512).fill(0.01),
      referenceImageBlob: new Blob(['x'], { type: 'image/jpeg' }),
      randomId: () => 'id-1',
      nowMs: () => 100,
    });
    await persistEnrolledUser(persistence, {
      name: 'Ada II',
      role: 'Visitor',
      embedding: new Float32Array(512).fill(0.02),
      referenceImageBlob: new Blob(['y'], { type: 'image/jpeg' }),
      existingUserId: 'id-1',
      nowMs: () => 9999,
    });
    const u = await persistence.usersRepo.get('id-1');
    expect(u?.name).toBe('Ada II');
    expect(u?.role).toBe('Visitor');
    expect(u?.createdAt).toBe(100);
    expect(await persistence.usersRepo.toArray()).toHaveLength(1);
  });

  it('normalizes role casing on create', async () => {
    const persistence = createDexiePersistence(dbName);
    await persistence.initDatabase(seed);
    await persistEnrolledUser(persistence, {
      name: 'Ada',
      role: 'contractor',
      embedding: new Float32Array(512).fill(0.01),
      referenceImageBlob: new Blob(['x'], { type: 'image/jpeg' }),
      randomId: () => 'id-case',
      nowMs: () => 1,
    });
    const u = await persistence.usersRepo.get('id-case');
    expect(u?.role).toBe('Contractor');
  });

  it('rejects unknown role on create', async () => {
    const persistence = createDexiePersistence(dbName);
    await persistence.initDatabase(seed);
    await expect(
      persistEnrolledUser(persistence, {
        name: 'Ada',
        role: 'Intern',
        embedding: new Float32Array(512).fill(0.01),
        referenceImageBlob: new Blob(['x'], { type: 'image/jpeg' }),
        randomId: () => 'id-bad',
        nowMs: () => 1,
      }),
    ).rejects.toThrow(/Unknown role/);
  });

  it('preserves legacy role on update when unchanged', async () => {
    const persistence = createDexiePersistence(dbName);
    await persistence.initDatabase(seed);
    await persistence.usersRepo.put({
      id: 'legacy-1',
      name: 'Lee',
      role: 'Freelancer',
      referenceImageBlob: new Blob(['x'], { type: 'image/jpeg' }),
      embedding: new Float32Array(512).fill(0.01),
      createdAt: 1,
    });
    await persistEnrolledUser(persistence, {
      name: 'Lee',
      role: 'Freelancer',
      embedding: new Float32Array(512).fill(0.02),
      referenceImageBlob: new Blob(['y'], { type: 'image/jpeg' }),
      existingUserId: 'legacy-1',
      nowMs: () => 2,
    });
    const u = await persistence.usersRepo.get('legacy-1');
    expect(u?.role).toBe('Freelancer');
  });

  it('rejects unknown role when updating', async () => {
    const persistence = createDexiePersistence(dbName);
    await persistence.initDatabase(seed);
    await persistence.usersRepo.put({
      id: 'legacy-2',
      name: 'Lee',
      role: 'Freelancer',
      referenceImageBlob: new Blob(['x'], { type: 'image/jpeg' }),
      embedding: new Float32Array(512).fill(0.01),
      createdAt: 1,
    });
    await expect(
      persistEnrolledUser(persistence, {
        name: 'Lee',
        role: 'InvalidRole',
        embedding: new Float32Array(512).fill(0.02),
        referenceImageBlob: new Blob(['y'], { type: 'image/jpeg' }),
        existingUserId: 'legacy-2',
      }),
    ).rejects.toThrow(/Unknown role/);
  });
});

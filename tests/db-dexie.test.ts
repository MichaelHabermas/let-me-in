import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseSeedSettings } from '../src/infra/persistence';
import {
  createDexiePersistence,
  getDefaultPersistence,
  initDatabase,
  resetIndexedDbClientForTests,
} from '../src/infra/persistence';

const defaultTestSeed = {
  thresholds: { strong: 0.85, weak: 0.65, unknown: 0.65, margin: 0.05 },
  cooldownMs: 3000,
} satisfies DatabaseSeedSettings;

async function resetDb(): Promise<void> {
  await resetIndexedDbClientForTests();
  await Dexie.delete('gatekeeper');
}

describe('Dexie schema v1', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(async () => {
    await resetDb();
  });

  it('opens gatekeeper database', async () => {
    await initDatabase(defaultTestSeed);
    const exists = await Dexie.exists('gatekeeper');
    expect(exists).toBe(true);
  });

  it('seeds default settings on first open', async () => {
    await initDatabase(defaultTestSeed);
    const rows = await getDefaultPersistence().settingsRepo.toArray();
    const keys = rows.map((r) => r.key).sort();
    expect(keys).toEqual(['cooldownMs', 'thresholds']);
    const th = rows.find((r) => r.key === 'thresholds');
    expect(th?.value).toMatchObject({ strong: 0.85, weak: 0.65, unknown: 0.65, margin: 0.05 });
  });

  it('round-trips a user record', async () => {
    await initDatabase(defaultTestSeed);
    const db = getDefaultPersistence();
    const id = '00000000-0000-4000-8000-000000000001';
    const user = {
      id,
      name: 'Test User',
      role: 'staff',
      referenceImageBlob: new Blob(['x'], { type: 'image/jpeg' }),
      embedding: new Float32Array(512).fill(0.01),
      createdAt: Date.now(),
    };
    await db.usersRepo.put(user);
    const read = await db.usersRepo.get(id);
    expect(read?.name).toBe('Test User');
    expect(read?.embedding.length).toBe(512);
  });

  it('round-trips access log and supports appendDecision', async () => {
    await initDatabase(defaultTestSeed);
    const log = getDefaultPersistence().accessLogRepo;
    const ts = Date.now();
    await log.put({
      timestamp: ts,
      userId: null,
      similarity01: 0.42,
      decision: 'DENIED',
      capturedFrameBlob: new Blob(['f'], { type: 'image/png' }),
    });
    const row = await log.get(ts);
    expect(row?.decision).toBe('DENIED');

    await log.appendDecision({
      userId: 'u1',
      similarity01: 0.9,
      decision: 'GRANTED',
      capturedFrameBlob: new Blob(['g'], { type: 'image/png' }),
    });
    const all = await log.toArray();
    expect(all.length).toBe(2);
  });
});

describe('createDexiePersistence', () => {
  it('deleteWithAnonymization nulls accessLog userId then deletes user', async () => {
    const dbName = `gatekeeper-anon-${crypto.randomUUID()}`;
    const p = createDexiePersistence(dbName);
    try {
      await p.initDatabase(defaultTestSeed);
      const uid = 'user-to-delete';
      await p.usersRepo.put({
        id: uid,
        name: 'X',
        role: 'Staff',
        referenceImageBlob: new Blob(),
        embedding: new Float32Array(8),
        createdAt: 1,
      });
      await p.accessLogRepo.appendDecision({
        userId: uid,
        similarity01: 0.9,
        decision: 'GRANTED',
        capturedFrameBlob: new Blob(['a']),
        timestamp: 10_000,
      });
      await p.accessLogRepo.appendDecision({
        userId: 'other',
        similarity01: 0.5,
        decision: 'DENIED',
        capturedFrameBlob: new Blob(['b']),
        timestamp: 10_001,
      });
      const before = await p.accessLogRepo.toArray();
      expect(before.length).toBe(2);
      await p.usersRepo.deleteWithAnonymization(uid);
      expect(await p.usersRepo.get(uid)).toBeUndefined();
      const after = await p.accessLogRepo.toArray();
      expect(after.length).toBe(2);
      const row0 = after.find((r) => r.timestamp === 10_000);
      expect(row0?.userId).toBeNull();
      const row1 = after.find((r) => r.timestamp === 10_001);
      expect(row1?.userId).toBe('other');
    } finally {
      await p.resetIndexedDbClientForTests();
      await Dexie.delete(dbName);
    }
  });

  it('whereTimestampBetween returns inclusive range', async () => {
    const dbName = `gatekeeper-range-${crypto.randomUUID()}`;
    const p = createDexiePersistence(dbName);
    try {
      await p.initDatabase(defaultTestSeed);
      await p.accessLogRepo.put({
        timestamp: 100,
        userId: null,
        similarity01: 0.1,
        decision: 'DENIED',
        capturedFrameBlob: new Blob(),
      });
      await p.accessLogRepo.put({
        timestamp: 200,
        userId: null,
        similarity01: 0.2,
        decision: 'DENIED',
        capturedFrameBlob: new Blob(),
      });
      const mid = await p.accessLogRepo.whereTimestampBetween(150, 250);
      expect(mid.map((r) => r.timestamp)).toEqual([200]);
      const all = await p.accessLogRepo.whereTimestampBetween(100, 200);
      expect(all.length).toBe(2);
    } finally {
      await p.resetIndexedDbClientForTests();
      await Dexie.delete(dbName);
    }
  });

  it('isolates data by database name', async () => {
    const dbName = `gatekeeper-isolated-${crypto.randomUUID()}`;
    const p = createDexiePersistence(dbName);
    try {
      await p.initDatabase(defaultTestSeed);
      expect(await Dexie.exists(dbName)).toBe(true);
      const id = '00000000-0000-4000-8000-000000000099';
      await p.usersRepo.put({
        id,
        name: 'Isolated',
        role: 'staff',
        referenceImageBlob: new Blob(['y'], { type: 'image/jpeg' }),
        embedding: new Float32Array(8).fill(0.5),
        createdAt: Date.now(),
      });
      expect((await p.usersRepo.get(id))?.name).toBe('Isolated');
    } finally {
      await p.resetIndexedDbClientForTests();
      await Dexie.delete(dbName);
    }
  });
});

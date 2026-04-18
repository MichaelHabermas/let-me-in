import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  accessLogRepo,
  initDatabase,
  settingsRepo,
  usersRepo,
} from '../src/infra/contracts';

describe('Dexie schema v1', () => {
  beforeEach(async () => {
    await Dexie.delete('gatekeeper');
  });

  afterEach(async () => {
    await Dexie.delete('gatekeeper');
  });

  it('opens gatekeeper database', async () => {
    await initDatabase();
    const exists = await Dexie.exists('gatekeeper');
    expect(exists).toBe(true);
  });

  it('seeds default settings on first open', async () => {
    await initDatabase();
    const rows = await settingsRepo.toArray();
    const keys = rows.map((r) => r.key).sort();
    expect(keys).toEqual(['cooldownMs', 'thresholds']);
    const th = rows.find((r) => r.key === 'thresholds');
    expect(th?.value).toMatchObject({ strong: 0.8, weak: 0.65, unknown: 0.6, margin: 0.05 });
  });

  it('round-trips a user record', async () => {
    await initDatabase();
    const id = '00000000-0000-4000-8000-000000000001';
    const user = {
      id,
      name: 'Test User',
      role: 'staff',
      referenceImageBlob: new Blob(['x'], { type: 'image/jpeg' }),
      embedding: new Float32Array(512).fill(0.01),
      createdAt: Date.now(),
    };
    await usersRepo.put(user);
    const read = await usersRepo.get(id);
    expect(read?.name).toBe('Test User');
    expect(read?.embedding.length).toBe(512);
  });

  it('round-trips access log and supports appendDecision', async () => {
    await initDatabase();
    const ts = Date.now();
    await accessLogRepo.put({
      timestamp: ts,
      userId: null,
      similarity01: 0.42,
      decision: 'DENIED',
      capturedFrameBlob: new Blob(['f'], { type: 'image/png' }),
    });
    const row = await accessLogRepo.get(ts);
    expect(row?.decision).toBe('DENIED');

    await accessLogRepo.appendDecision({
      userId: 'u1',
      similarity01: 0.9,
      decision: 'GRANTED',
      capturedFrameBlob: new Blob(['g'], { type: 'image/png' }),
    });
    const all = await accessLogRepo.toArray();
    expect(all.length).toBe(2);
  });
});

/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';

import { mountLogPageIntoApp } from '../src/app/mount-log-page';
import { createDexiePersistence } from '../src/infra/persistence';

import { createTestGateRuntime } from './support/create-test-gate-runtime';

describe('mountLogPageIntoApp', () => {
  it('shows at most 20 newest rows', async () => {
    const dbName = `log-page-${crypto.randomUUID()}`;
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.getDatabaseSeedSettings());

    await persistence.usersRepo.put({
      id: 'u1',
      name: 'One',
      role: 'r',
      referenceImageBlob: new Blob(),
      embedding: new Float32Array(512),
      createdAt: 1,
    });

    const blob = new Blob(['x']);
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 25; i += 1) {
      await persistence.accessLogRepo.appendDecision({
        userId: 'u1',
        similarity01: 0.5,
        decision: 'GRANTED',
        capturedFrameBlob: blob,
        timestamp: t0 + i,
      });
    }

    const app = document.createElement('div');
    document.body.appendChild(app);
    await mountLogPageIntoApp(app, { persistence, rt });

    const rows = app.querySelectorAll('.log-table tbody tr');
    expect(rows.length).toBe(20);

    await persistence.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
    document.body.removeChild(app);
  });
});

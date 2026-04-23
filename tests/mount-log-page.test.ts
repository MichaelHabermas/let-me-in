/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';

import { mountLogPageIntoApp } from '../src/app/mount-log-page';
import { createDexiePersistence } from '../src/infra/persistence';

import { createTestGateRuntime } from './support/create-test-gate-runtime';

describe('mountLogPageIntoApp', () => {
  it('renders all log rows with toolbar', async () => {
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

    expect(app.querySelector('[data-testid="log-toolbar"]')).not.toBeNull();
    const rows = app.querySelectorAll('.log-table tbody tr');
    expect(rows.length).toBe(25);

    await persistence.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
    document.body.removeChild(app);
  });

  it('filters by decision', async () => {
    const dbName = `log-page-f-${crypto.randomUUID()}`;
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
    await persistence.accessLogRepo.appendDecision({
      userId: 'u1',
      similarity01: 0.9,
      decision: 'GRANTED',
      capturedFrameBlob: blob,
      timestamp: 100,
    });
    await persistence.accessLogRepo.appendDecision({
      userId: 'u1',
      similarity01: 0.2,
      decision: 'DENIED',
      capturedFrameBlob: blob,
      timestamp: 101,
    });

    const app = document.createElement('div');
    document.body.appendChild(app);
    await mountLogPageIntoApp(app, { persistence, rt });

    const dec = app.querySelector<HTMLSelectElement>('[data-testid="log-filter-decision"]');
    expect(dec).not.toBeNull();
    dec!.value = 'DENIED';
    dec!.dispatchEvent(new Event('change', { bubbles: true }));

    expect(app.querySelectorAll('.log-table tbody tr').length).toBe(1);
    expect(app.querySelector('.log-table tbody tr')?.textContent).toContain('DENIED');

    await persistence.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
    document.body.removeChild(app);
  });

  it('toggles sort when clicking similarity header', async () => {
    const dbName = `log-page-s-${crypto.randomUUID()}`;
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
    await persistence.accessLogRepo.appendDecision({
      userId: 'u1',
      similarity01: 0.1,
      decision: 'GRANTED',
      capturedFrameBlob: blob,
      timestamp: 200,
    });
    await persistence.accessLogRepo.appendDecision({
      userId: 'u1',
      similarity01: 0.9,
      decision: 'GRANTED',
      capturedFrameBlob: blob,
      timestamp: 201,
    });

    const app = document.createElement('div');
    document.body.appendChild(app);
    await mountLogPageIntoApp(app, { persistence, rt });

    app.querySelector('[data-testid="log-sort-similarity"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    const firstPct = app.querySelector('.log-table tbody tr td:nth-child(3)')?.textContent;
    app.querySelector('[data-testid="log-sort-similarity"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    const secondPct = app.querySelector('.log-table tbody tr td:nth-child(3)')?.textContent;
    expect(firstPct).not.toBe(secondPct);

    await persistence.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
    document.body.removeChild(app);
  });
});

import Dexie from 'dexie';
import { describe, expect, it, vi } from 'vitest';

import { mountLogPageIntoApp } from '../src/app/mount-log-page';
import { createDexiePersistence } from '../src/infra/persistence';

import { createTestGateRuntime } from './support/create-test-gate-runtime';
import { embeddingVectorZeros } from './support/test-embeddings';

describe('mountLogPageIntoApp', () => {
  it('renders all log rows with toolbar', async () => {
    const dbName = `log-page-${crypto.randomUUID()}`;
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings!);

    await persistence.usersRepo.put({
      id: 'u1',
      name: 'One',
      role: 'Staff',
      referenceImageBlob: new Blob(),
      embedding: embeddingVectorZeros(),
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
    await persistence.initDatabase(rt.databaseSeedSettings!);
    await persistence.usersRepo.put({
      id: 'u1',
      name: 'One',
      role: 'Staff',
      referenceImageBlob: new Blob(),
      embedding: embeddingVectorZeros(),
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
    await persistence.initDatabase(rt.databaseSeedSettings!);
    await persistence.usersRepo.put({
      id: 'u1',
      name: 'One',
      role: 'Staff',
      referenceImageBlob: new Blob(),
      embedding: embeddingVectorZeros(),
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

  it('export CSV button triggers a download', async () => {
    const dbName = `log-page-csv-${crypto.randomUUID()}`;
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings!);
    await persistence.usersRepo.put({
      id: 'u1',
      name: 'One',
      role: 'Staff',
      referenceImageBlob: new Blob(),
      embedding: embeddingVectorZeros(),
      createdAt: 1,
    });
    const blob = new Blob(['x']);
    await persistence.accessLogRepo.appendDecision({
      userId: 'u1',
      similarity01: 0.5,
      decision: 'GRANTED',
      capturedFrameBlob: blob,
      timestamp: 100,
    });

    const app = document.createElement('div');
    document.body.appendChild(app);
    await mountLogPageIntoApp(app, { persistence, rt });

    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    app.querySelector<HTMLButtonElement>('[data-testid="log-export-csv"]')?.click();

    expect(createUrl).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:mock');

    createUrl.mockRestore();
    revoke.mockRestore();
    clickSpy.mockRestore();

    await persistence.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
    document.body.removeChild(app);
  });

  it('teardown removes toolbar listeners', async () => {
    const dbName = `log-page-teardown-${crypto.randomUUID()}`;
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings!);
    const app = document.createElement('div');
    document.body.appendChild(app);

    const teardown = await mountLogPageIntoApp(app, { persistence, rt });
    const exportBtn = app.querySelector<HTMLButtonElement>('[data-testid="log-export-csv"]');
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    teardown();
    exportBtn?.click();
    expect(clickSpy).not.toHaveBeenCalled();

    createUrl.mockRestore();
    revoke.mockRestore();
    clickSpy.mockRestore();
    await persistence.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
    document.body.removeChild(app);
  });

  it('supports review actions and review-state filtering', async () => {
    const dbName = `log-page-review-${crypto.randomUUID()}`;
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings!);
    await persistence.usersRepo.put({
      id: 'u1',
      name: 'One',
      role: 'Staff',
      referenceImageBlob: new Blob(),
      embedding: embeddingVectorZeros(),
      createdAt: 1,
    });
    await persistence.accessLogRepo.put({
      timestamp: 300,
      userId: 'u1',
      similarity01: 0.78,
      decision: 'DENIED',
      capturedFrameBlob: new Blob(),
    });

    const app = document.createElement('div');
    document.body.appendChild(app);
    await mountLogPageIntoApp(app, { persistence, rt });

    const grantBtn = app.querySelector<HTMLButtonElement>('[data-testid="log-review-grant-300"]');
    grantBtn?.click();
    for (let i = 0; i < 30; i += 1) {
      const row = await persistence.accessLogRepo.get(300);
      if (row?.reviewedDecision === 'GRANTED') break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect((await persistence.accessLogRepo.get(300))?.reviewedDecision).toBe('GRANTED');

    const reviewFilter = app.querySelector<HTMLSelectElement>('[data-testid="log-filter-review"]');
    reviewFilter!.value = 'UNREVIEWED';
    reviewFilter!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.querySelectorAll('.log-table tbody tr').length).toBe(0);

    reviewFilter!.value = 'REVIEWED';
    reviewFilter!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.querySelectorAll('.log-table tbody tr').length).toBe(1);

    await persistence.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
    document.body.removeChild(app);
  });
});

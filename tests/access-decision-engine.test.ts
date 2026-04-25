import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAccessDecisionContext } from '../src/app/access-decision-context';
import { createAccessDecisionEvaluator } from '../src/app/access-decision-engine';
import { createDexiePersistence } from '../src/infra/persistence';

vi.mock('../src/app/gate-access-evaluation', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/app/gate-access-evaluation')>();
  return { ...mod, imageDataToPngBlob: vi.fn().mockResolvedValue(new Blob()) };
});

import { createTestGateRuntime } from './support/create-test-gate-runtime';
import { embeddingVectorZeros } from './support/test-embeddings';

describe('createAccessDecisionEvaluator', () => {
  const dbName = `access-engine-${crypto.randomUUID()}`;

  afterEach(async () => {
    await Dexie.delete(dbName);
  });

  it('returns null when no enrolled users', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);
    const evalFn = await createAccessDecisionEvaluator(persistence, rt.databaseSeedSettings);
    const frame = new ImageData(2, 2);
    const embedding = embeddingVectorZeros();
    expect(await evalFn({ embedding, frame })).toBeNull();
    await persistence.resetIndexedDbClientForTests();
  });

  it('with context, does not call usersRepo.toArray on each evaluation (snapshot reuse)', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);
    await persistence.usersRepo.put({
      id: 'u1',
      name: 'A',
      role: 'r',
      referenceImageBlob: new Blob(),
      embedding: embeddingVectorZeros(),
      createdAt: 1,
    });
    const toArray = vi.spyOn(persistence.usersRepo, 'toArray');
    const context = await createAccessDecisionContext(persistence, rt.databaseSeedSettings);
    const evalFn = await createAccessDecisionEvaluator(
      persistence,
      rt.databaseSeedSettings,
      undefined,
      context,
    );
    const frame = new ImageData(2, 2);
    const embedding = embeddingVectorZeros();
    toArray.mockClear();
    await evalFn({ embedding, frame });
    await evalFn({ embedding, frame });
    expect(toArray).not.toHaveBeenCalled();
    await persistence.resetIndexedDbClientForTests();
  });
});

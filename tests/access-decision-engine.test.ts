import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { createAccessDecisionEvaluator } from '../src/app/access-decision-engine';
import { createDexiePersistence } from '../src/infra/persistence';

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
});

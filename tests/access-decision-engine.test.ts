import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAccessDecisionContext } from '../src/app/access-decision-context';
import { createAccessDecisionEvaluator } from '../src/app/access-decision-engine';
import { writeAccessThresholdsToSettings } from '../src/app/access-thresholds-store';
import { createDexiePersistence } from '../src/infra/persistence';

vi.mock('../src/app/gate-access-evaluation', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/app/gate-access-evaluation')>();
  return { ...mod, imageDataToPngBlob: vi.fn().mockResolvedValue(new Blob()) };
});

import { createTestGateRuntime } from './support/create-test-gate-runtime';
import { embeddingVectorFilled, embeddingVectorZeros } from './support/test-embeddings';

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

  it('with context, reuses snapshot and keeps repeated evaluations behaviorally stable', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);
    await persistence.usersRepo.put({
      id: 'u1',
      name: 'A',
      role: 'r',
      referenceImageBlob: new Blob(),
      embedding: embeddingVectorFilled(0.1),
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
    const embedding = embeddingVectorFilled(0.1);
    toArray.mockClear();
    const first = await evalFn({ embedding, frame });
    const second = await evalFn({ embedding, frame });
    expect(toArray).not.toHaveBeenCalled();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second?.verdict).toEqual(first?.verdict);
    expect(second?.displayName).toBe(first?.displayName);
    await persistence.resetIndexedDbClientForTests();
  });

  it('refresh picks up threshold changes from settings', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);
    const context = await createAccessDecisionContext(persistence, rt.databaseSeedSettings);
    expect(context.getSnapshot().thresholds.strong).toBe(rt.databaseSeedSettings.thresholds.strong);

    await writeAccessThresholdsToSettings(persistence.settingsRepo, {
      strong: 0.75,
      weak: 0.65,
      margin: 0.05,
      unknown: 0.65,
    });
    await context.refresh();
    expect(context.getSnapshot().thresholds.strong).toBe(0.75);
    await persistence.resetIndexedDbClientForTests();
  });

  it('requires passing liveness before a strong identity match grants', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);
    await persistence.usersRepo.put({
      id: 'u1',
      name: 'A',
      role: 'r',
      referenceImageBlob: new Blob(),
      embedding: embeddingVectorFilled(0.1),
      createdAt: 1,
    });
    const evalFn = await createAccessDecisionEvaluator(persistence, rt.databaseSeedSettings);
    const frame = new ImageData(2, 2);
    const embedding = embeddingVectorFilled(0.1);
    const failed = await evalFn({
      embedding,
      frame,
      liveness: {
        decision: 'FAIL',
        reason: 'PRESENTATION_ATTACK_RISK',
        score: 0.1,
        sampleCount: 5,
        requiredSamples: 5,
        metrics: { frameDifference: 0, textureVariation: 0, sharpness: 0, glareRisk: 0 },
      },
    });
    expect(failed?.verdict.decision).toBe('UNCERTAIN');
    expect(failed?.verdict.reasons).toContain('PRESENTATION_ATTACK_RISK');

    const passed = await evalFn({
      embedding,
      frame,
      liveness: {
        decision: 'PASS',
        reason: 'LIVE_MOTION_CONFIRMED',
        score: 0.8,
        sampleCount: 5,
        requiredSamples: 5,
        metrics: { frameDifference: 0.04, textureVariation: 0.2, sharpness: 0.8, glareRisk: 0 },
      },
    });
    expect(passed?.verdict.decision).toBe('GRANTED');
    await persistence.resetIndexedDbClientForTests();
  });
});

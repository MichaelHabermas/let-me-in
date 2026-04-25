import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import {
  THRESHOLD_CALIBRATION_META_KEY,
  THRESHOLD_CALIBRATION_SHADOW_KEY,
  runAutomaticThresholdCalibration,
} from '../src/app/access-threshold-calibration';
import { createDexiePersistence } from '../src/infra/persistence';
import { createTestGateRuntime } from './support/create-test-gate-runtime';

describe('runAutomaticThresholdCalibration', () => {
  const dbName = `threshold-calibration-${crypto.randomUUID()}`;

  afterEach(async () => {
    await Dexie.delete(dbName);
  });

  it('skips calibration when sample count is too low', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);
    for (let i = 0; i < 5; i += 1) {
      await persistence.accessLogRepo.appendDecision({
        userId: `u-${i}`,
        similarity01: 0.8,
        decision: 'GRANTED',
        capturedFrameBlob: new Blob(),
        timestamp: 1000 + i,
      });
    }

    const result = await runAutomaticThresholdCalibration({
      persistence,
      seedFallback: rt.databaseSeedSettings,
      nowMs: 2000,
      options: { minSamples: 10, lookbackWindowMs: 10_000 },
    });
    expect(result.applied).toBe(false);
    expect(result.meta.reason).toBe('skipped_insufficient_data');
    expect(result.meta.explainability).toBeUndefined();
  });

  it('applies bounded threshold updates and persists metadata', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);
    let ts = 10_000;
    for (let i = 0; i < 12; i += 1) {
      await persistence.accessLogRepo.appendDecision({
        userId: `g-${i}`,
        similarity01: 0.9 + i * 0.001,
        decision: 'GRANTED',
        capturedFrameBlob: new Blob(),
        timestamp: ts++,
      });
    }
    for (let i = 0; i < 12; i += 1) {
      await persistence.accessLogRepo.appendDecision({
        userId: null,
        similarity01: 0.55 + i * 0.001,
        decision: 'DENIED',
        capturedFrameBlob: new Blob(),
        timestamp: ts++,
      });
    }

    const before = await persistence.settingsRepo.get('thresholds');
    const result = await runAutomaticThresholdCalibration({
      persistence,
      seedFallback: rt.databaseSeedSettings,
      nowMs: ts + 10,
      options: {
        minSamples: 20,
        minGrantedSamples: 6,
        minDeniedSamples: 6,
        lookbackWindowMs: 100_000,
        maxDriftPerRun: 0.01,
      },
    });
    const after = await persistence.settingsRepo.get('thresholds');
    const meta = await persistence.settingsRepo.get(THRESHOLD_CALIBRATION_META_KEY);

    expect(result.applied).toBe(true);
    expect(after?.value).not.toEqual(before?.value);
    expect(meta?.value).toMatchObject({
      reason: 'applied',
      sampleCount: 24,
      reviewedSamplesUsed: 0,
      rawSamplesUsed: 24,
    });
    expect(result.meta.maxDriftApplied).toBeLessThanOrEqual(0.01);
    expect(result.meta.explainability).toBeDefined();
    expect(result.meta.explainability).toMatchObject({
      deniedP95: expect.any(Number),
      grantedP10: expect.any(Number),
      projectedFalseGrantBefore: expect.any(Number),
      projectedFalseGrantAfter: expect.any(Number),
      projectedFalseDenyBefore: expect.any(Number),
      projectedFalseDenyAfter: expect.any(Number),
    });
  });

  it('shadow mode stores preview without changing live thresholds or live meta', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);
    let ts = 10_000;
    for (let i = 0; i < 12; i += 1) {
      await persistence.accessLogRepo.appendDecision({
        userId: `g-${i}`,
        similarity01: 0.9 + i * 0.001,
        decision: 'GRANTED',
        capturedFrameBlob: new Blob(),
        timestamp: ts++,
      });
    }
    for (let i = 0; i < 12; i += 1) {
      await persistence.accessLogRepo.appendDecision({
        userId: null,
        similarity01: 0.55 + i * 0.001,
        decision: 'DENIED',
        capturedFrameBlob: new Blob(),
        timestamp: ts++,
      });
    }

    const before = await persistence.settingsRepo.get('thresholds');
    const beforeMeta = await persistence.settingsRepo.get(THRESHOLD_CALIBRATION_META_KEY);
    const result = await runAutomaticThresholdCalibration({
      persistence,
      seedFallback: rt.databaseSeedSettings,
      nowMs: ts + 10,
      applyThresholds: false,
      options: {
        minSamples: 20,
        minGrantedSamples: 6,
        minDeniedSamples: 6,
        lookbackWindowMs: 100_000,
        maxDriftPerRun: 0.01,
      },
    });
    const after = await persistence.settingsRepo.get('thresholds');
    const liveMetaAfter = await persistence.settingsRepo.get(THRESHOLD_CALIBRATION_META_KEY);
    const shadow = await persistence.settingsRepo.get(THRESHOLD_CALIBRATION_SHADOW_KEY);

    expect(after?.value).toEqual(before?.value);
    expect(liveMetaAfter?.value).toEqual(beforeMeta?.value);
    expect(result.applied).toBe(false);
    expect(result.meta.reason).toBe('applied');
    expect(shadow?.value).toMatchObject({
      meta: { reason: 'applied', sampleCount: 24 },
    });
  });

  it('prioritizes reviewed decisions when collecting calibration samples', async () => {
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings);
    let ts = 20_000;
    for (let i = 0; i < 10; i += 1) {
      await persistence.accessLogRepo.put({
        timestamp: ts++,
        userId: `u-${i}`,
        similarity01: 0.9 + i * 0.001,
        decision: 'GRANTED',
        capturedFrameBlob: new Blob(),
        reviewedDecision: 'DENIED',
        reviewedAt: ts + 1000,
      });
      await persistence.accessLogRepo.put({
        timestamp: ts++,
        userId: null,
        similarity01: 0.55 + i * 0.001,
        decision: 'DENIED',
        capturedFrameBlob: new Blob(),
        reviewedDecision: 'GRANTED',
        reviewedAt: ts + 1000,
      });
    }

    const result = await runAutomaticThresholdCalibration({
      persistence,
      seedFallback: rt.databaseSeedSettings,
      nowMs: ts + 10,
      options: {
        minSamples: 20,
        minGrantedSamples: 6,
        minDeniedSamples: 6,
        lookbackWindowMs: 100_000,
      },
    });

    expect(result.meta.reviewedSamplesUsed).toBe(20);
    expect(result.meta.rawSamplesUsed).toBe(0);
    expect(result.meta.reason).toBe('applied');
  });
});

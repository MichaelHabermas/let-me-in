import type { AccessThresholds } from '../domain/access-policy';
import { collectCalibrationSamples } from '../domain/access-log-review';
import type { CalibrationExplainability } from '../domain/threshold-calibration-explain';
import { round4 } from './access-threshold-calibration-math';
import type { ThresholdCalibrationMeta } from './access-threshold-calibration-types';

export function buildMetaInsufficient(
  nowMs: number,
  current: AccessThresholds,
  sampleCount: number,
): ThresholdCalibrationMeta {
  return {
    lastRunAtMs: nowMs,
    reason: 'skipped_insufficient_data',
    sampleCount,
    previous: current,
    next: null,
    maxDriftApplied: 0,
    reviewedSamplesUsed: 0,
    rawSamplesUsed: 0,
  };
}

export function buildMetaIbalanced(
  p: {
    nowMs: number;
    current: AccessThresholds;
    samples: ReturnType<typeof collectCalibrationSamples>;
  },
  sampleCount: number,
  explainability: CalibrationExplainability | undefined,
): ThresholdCalibrationMeta {
  return {
    lastRunAtMs: p.nowMs,
    reason: 'skipped_imbalanced_labels',
    sampleCount,
    previous: p.current,
    next: null,
    maxDriftApplied: 0,
    reviewedSamplesUsed: p.samples.reviewedUsed,
    rawSamplesUsed: p.samples.rawUsed,
    ...(explainability ? { explainability } : {}),
  };
}

export function buildMetaNoChange(
  p: {
    nowMs: number;
    current: AccessThresholds;
    next: AccessThresholds;
    samples: ReturnType<typeof collectCalibrationSamples>;
  },
  sampleCount: number,
  explainability: CalibrationExplainability | undefined,
): ThresholdCalibrationMeta {
  return {
    lastRunAtMs: p.nowMs,
    reason: 'skipped_no_change',
    sampleCount,
    previous: p.current,
    next: p.next,
    maxDriftApplied: 0,
    reviewedSamplesUsed: p.samples.reviewedUsed,
    rawSamplesUsed: p.samples.rawUsed,
    ...(explainability ? { explainability } : {}),
  };
}

export function buildMetaApplied(
  p: {
    nowMs: number;
    current: AccessThresholds;
    next: AccessThresholds;
    samples: ReturnType<typeof collectCalibrationSamples>;
  },
  sampleCount: number,
  maxDrift: number,
  explainability: CalibrationExplainability | undefined,
): ThresholdCalibrationMeta {
  return {
    lastRunAtMs: p.nowMs,
    reason: 'applied',
    sampleCount,
    previous: p.current,
    next: p.next,
    maxDriftApplied: round4(maxDrift),
    reviewedSamplesUsed: p.samples.reviewedUsed,
    rawSamplesUsed: p.samples.rawUsed,
    ...(explainability ? { explainability } : {}),
  };
}

export function thresholdsUnchanged(a: AccessThresholds, b: AccessThresholds): boolean {
  return (
    a.strong === b.strong && a.weak === b.weak && a.unknown === b.unknown && a.margin === b.margin
  );
}

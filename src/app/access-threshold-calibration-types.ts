import type { AccessThresholds } from '../domain/access-policy';
import type { CalibrationExplainability } from '../domain/threshold-calibration-explain';

export const THRESHOLD_CALIBRATION_META_KEY = 'thresholdCalibrationMeta';
export const THRESHOLD_CALIBRATION_SHADOW_KEY = 'thresholdCalibrationShadow';

export type ThresholdCalibrationMeta = {
  lastRunAtMs: number;
  reason:
    | 'applied'
    | 'skipped_insufficient_data'
    | 'skipped_imbalanced_labels'
    | 'skipped_no_change';
  sampleCount: number;
  previous: AccessThresholds | null;
  next: AccessThresholds | null;
  maxDriftApplied: number;
  reviewedSamplesUsed: number;
  rawSamplesUsed: number;
  explainability?: CalibrationExplainability;
};

/** Pending preview from shadow-mode run; does not change live thresholds. */
export type ThresholdCalibrationShadow = {
  previewedAtMs: number;
  meta: ThresholdCalibrationMeta;
};

export type ThresholdCalibrationOptions = {
  lookbackWindowMs?: number;
  minSamples?: number;
  minGrantedSamples?: number;
  minDeniedSamples?: number;
  maxDriftPerRun?: number;
  minGap?: number;
  minWeak?: number;
  maxStrong?: number;
  minMargin?: number;
  maxMargin?: number;
};

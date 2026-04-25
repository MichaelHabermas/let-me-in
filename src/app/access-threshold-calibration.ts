import type { AccessThresholds } from '../domain/access-policy';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import { collectCalibrationSamples } from '../domain/access-log-review';
import type { DexiePersistence, SettingsStore } from '../infra/persistence';
import {
  readAccessThresholdsFromSettings,
  writeAccessThresholdsToSettings,
} from './access-thresholds-store';

export const THRESHOLD_CALIBRATION_META_KEY = 'thresholdCalibrationMeta';

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

const DEFAULTS: Required<ThresholdCalibrationOptions> = {
  lookbackWindowMs: 24 * 60 * 60 * 1000,
  minSamples: 20,
  minGrantedSamples: 6,
  minDeniedSamples: 6,
  maxDriftPerRun: 0.02,
  minGap: 0.05,
  minWeak: 0.5,
  maxStrong: 0.95,
  minMargin: 0.02,
  maxMargin: 0.12,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo] ?? 0;
  const low = sorted[lo] ?? 0;
  const high = sorted[hi] ?? low;
  return low + (high - low) * (idx - lo);
}

function round4(value: number): number {
  return Number(value.toFixed(4));
}

function clampDrift(next: number, current: number, maxDrift: number): number {
  return clamp(next, current - maxDrift, current + maxDrift);
}

function deriveCandidateThresholds(
  current: AccessThresholds,
  grantedScores: number[],
  deniedScores: number[],
  opts: Required<ThresholdCalibrationOptions>,
): AccessThresholds {
  const weakFromDenied = percentile(deniedScores, 0.95);
  const strongFromGranted = percentile(grantedScores, 0.1);
  const nextWeakPre = clamp(weakFromDenied, opts.minWeak, opts.maxStrong - opts.minGap);
  const nextStrongPre = clamp(strongFromGranted, nextWeakPre + opts.minGap, opts.maxStrong);
  const nextWeak = clampDrift(nextWeakPre, current.weak, opts.maxDriftPerRun);
  const nextStrong = clampDrift(nextStrongPre, current.strong, opts.maxDriftPerRun);
  const strong = clamp(round4(nextStrong), nextWeak + opts.minGap, opts.maxStrong);
  const weak = clamp(round4(nextWeak), opts.minWeak, strong - opts.minGap);
  const candidateMargin = clamp((strong - weak) * 0.5, opts.minMargin, opts.maxMargin);
  const margin = round4(clampDrift(candidateMargin, current.margin, opts.maxDriftPerRun));
  return { strong: round4(strong), weak: round4(weak), unknown: round4(weak), margin };
}

async function writeCalibrationMeta(
  settingsRepo: SettingsStore,
  meta: ThresholdCalibrationMeta,
): Promise<void> {
  await settingsRepo.put({ key: THRESHOLD_CALIBRATION_META_KEY, value: meta });
}

export async function readThresholdCalibrationMeta(
  settingsRepo: SettingsStore,
): Promise<ThresholdCalibrationMeta | null> {
  const row = await settingsRepo.get(THRESHOLD_CALIBRATION_META_KEY);
  if (!row?.value || typeof row.value !== 'object') return null;
  return row.value as ThresholdCalibrationMeta;
}

export async function runAutomaticThresholdCalibration(params: {
  persistence: DexiePersistence;
  seedFallback: DatabaseSeedSettings;
  nowMs?: number;
  options?: ThresholdCalibrationOptions;
}): Promise<{ applied: boolean; meta: ThresholdCalibrationMeta }> {
  const nowMs = params.nowMs ?? Date.now();
  const opts = { ...DEFAULTS, ...(params.options ?? {}) };
  const current = await readAccessThresholdsFromSettings(
    params.persistence.settingsRepo,
    params.seedFallback,
  );
  const logs = await params.persistence.accessLogRepo.whereTimestampBetween(
    nowMs - opts.lookbackWindowMs,
    nowMs,
  );
  const sampleCount = logs.length;
  if (sampleCount < opts.minSamples) {
    const meta: ThresholdCalibrationMeta = {
      lastRunAtMs: nowMs,
      reason: 'skipped_insufficient_data',
      sampleCount,
      previous: current,
      next: null,
      maxDriftApplied: 0,
      reviewedSamplesUsed: 0,
      rawSamplesUsed: 0,
    };
    await writeCalibrationMeta(params.persistence.settingsRepo, meta);
    return { applied: false, meta };
  }
  const samples = collectCalibrationSamples(logs);
  const grantedScores = samples.grantedScores;
  const deniedScores = samples.deniedScores;
  if (
    grantedScores.length < opts.minGrantedSamples ||
    deniedScores.length < opts.minDeniedSamples
  ) {
    const meta: ThresholdCalibrationMeta = {
      lastRunAtMs: nowMs,
      reason: 'skipped_imbalanced_labels',
      sampleCount,
      previous: current,
      next: null,
      maxDriftApplied: 0,
      reviewedSamplesUsed: samples.reviewedUsed,
      rawSamplesUsed: samples.rawUsed,
    };
    await writeCalibrationMeta(params.persistence.settingsRepo, meta);
    return { applied: false, meta };
  }
  const next = deriveCandidateThresholds(current, grantedScores, deniedScores, opts);
  const unchanged =
    next.strong === current.strong &&
    next.weak === current.weak &&
    next.unknown === current.unknown &&
    next.margin === current.margin;
  if (unchanged) {
    const meta: ThresholdCalibrationMeta = {
      lastRunAtMs: nowMs,
      reason: 'skipped_no_change',
      sampleCount,
      previous: current,
      next,
      maxDriftApplied: 0,
      reviewedSamplesUsed: samples.reviewedUsed,
      rawSamplesUsed: samples.rawUsed,
    };
    await writeCalibrationMeta(params.persistence.settingsRepo, meta);
    return { applied: false, meta };
  }
  await writeAccessThresholdsToSettings(params.persistence.settingsRepo, next);
  const maxDriftApplied = Math.max(
    Math.abs(next.strong - current.strong),
    Math.abs(next.weak - current.weak),
    Math.abs(next.margin - current.margin),
  );
  const meta: ThresholdCalibrationMeta = {
    lastRunAtMs: nowMs,
    reason: 'applied',
    sampleCount,
    previous: current,
    next,
    maxDriftApplied: round4(maxDriftApplied),
    reviewedSamplesUsed: samples.reviewedUsed,
    rawSamplesUsed: samples.rawUsed,
  };
  await writeCalibrationMeta(params.persistence.settingsRepo, meta);
  return { applied: true, meta };
}

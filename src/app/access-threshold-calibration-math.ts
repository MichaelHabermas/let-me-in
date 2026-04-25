import type { AccessThresholds } from '../domain/access-policy';
import {
  buildCalibrationExplainability,
  type CalibrationExplainability,
} from '../domain/threshold-calibration-explain';

export type DriftTuningOptions = {
  minGap: number;
  minWeak: number;
  maxStrong: number;
  maxDriftPerRun: number;
  minMargin: number;
  maxMargin: number;
};

export function round4(value: number): number {
  return Number(value.toFixed(4));
}

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

function clampDrift(next: number, current: number, maxDrift: number): number {
  return clamp(next, current - maxDrift, current + maxDrift);
}

export function deriveCandidateThresholds(
  current: AccessThresholds,
  grantedScores: number[],
  deniedScores: number[],
  opts: DriftTuningOptions,
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

export function maybeExplainability(params: {
  grantedScores: number[];
  deniedScores: number[];
  previous: AccessThresholds;
  next: AccessThresholds | null;
}): CalibrationExplainability | undefined {
  if (params.grantedScores.length === 0 || params.deniedScores.length === 0) return undefined;
  return buildCalibrationExplainability({
    grantedScores: params.grantedScores,
    deniedScores: params.deniedScores,
    previous: params.previous,
    next: params.next,
  });
}

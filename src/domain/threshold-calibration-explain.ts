import { decideFromMatch, type AccessThresholds } from './access-policy';
import type { MatchResult } from './types';

/** Single-best match replay: runner-up null → margin gate passes (see access-policy). */
export function syntheticMatchForScore(score01: number): MatchResult {
  return {
    best: { userId: '__calibration__', score: score01 },
    runnerUp: null,
  };
}

export function percentileCalibration(values: number[], p: number): number {
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

export type CalibrationProjectionCounts = {
  /** Deny-labeled samples that would GRANT under thresholds (over-permissive). */
  falseGrant: number;
  /** Grant-labeled samples that would not GRANT (under-permissive / uncertain). */
  falseDeny: number;
};

export function projectCalibrationMismatchCounts(
  grantedScores: number[],
  deniedScores: number[],
  thresholds: AccessThresholds,
): CalibrationProjectionCounts {
  let falseGrant = 0;
  for (const score of deniedScores) {
    const match = syntheticMatchForScore(score);
    if (decideFromMatch(match, thresholds) === 'GRANTED') falseGrant += 1;
  }
  let falseDeny = 0;
  for (const score of grantedScores) {
    const match = syntheticMatchForScore(score);
    if (decideFromMatch(match, thresholds) !== 'GRANTED') falseDeny += 1;
  }
  return { falseGrant, falseDeny };
}

export type CalibrationExplainability = {
  deniedP95: number;
  grantedP10: number;
  deltaStrong: number;
  deltaWeak: number;
  deltaMargin: number;
  projectedFalseGrantBefore: number;
  projectedFalseGrantAfter: number;
  projectedFalseDenyBefore: number;
  projectedFalseDenyAfter: number;
};

export function round4(n: number): number {
  return Number(n.toFixed(4));
}

export function buildCalibrationExplainability(params: {
  grantedScores: number[];
  deniedScores: number[];
  previous: AccessThresholds;
  next: AccessThresholds | null;
}): CalibrationExplainability {
  const { grantedScores, deniedScores, previous, next } = params;
  const deniedP95 = round4(percentileCalibration(deniedScores, 0.95));
  const grantedP10 = round4(percentileCalibration(grantedScores, 0.1));
  const effectiveNext = next ?? previous;
  const before = projectCalibrationMismatchCounts(grantedScores, deniedScores, previous);
  const after = projectCalibrationMismatchCounts(grantedScores, deniedScores, effectiveNext);
  return {
    deniedP95,
    grantedP10,
    deltaStrong: round4(effectiveNext.strong - previous.strong),
    deltaWeak: round4(effectiveNext.weak - previous.weak),
    deltaMargin: round4(effectiveNext.margin - previous.margin),
    projectedFalseGrantBefore: before.falseGrant,
    projectedFalseGrantAfter: after.falseGrant,
    projectedFalseDenyBefore: before.falseDeny,
    projectedFalseDenyAfter: after.falseDeny,
  };
}

import type { Decision, MatchResult } from './types';

/** Threshold slice used by `decideFromMatch` — mirrors `config.thresholds` without importing config. */
export type AccessThresholds = {
  strong: number;
  weak: number;
  /** Kept for labeling compatibility; typically equal to `weak` for Epic E5 literals. */
  unknown: number;
  margin: number;
};

/**
 * Map embedding similarity to an access decision.
 * GRANTED: top score in the strong band and top-2 margin clears the configured floor.
 * UNCERTAIN: score at or above `weak` but grant conditions not met (weak/ambiguous).
 * DENIED: score below `weak` (unknown face / non-match band).
 *
 * When there is no runner-up, margin is treated as satisfied (single enrolled user).
 */
export function decideFromMatch(match: MatchResult, t: AccessThresholds): Decision {
  const score = match.best.score;
  if (score < t.weak) return 'DENIED';

  const marginDelta = match.runnerUp === null ? 1 : match.best.score - match.runnerUp.score;

  if (score >= t.strong && marginDelta >= t.margin) return 'GRANTED';
  return 'UNCERTAIN';
}

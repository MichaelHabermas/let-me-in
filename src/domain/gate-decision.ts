import { decideFromMatch, type AccessThresholds } from './access-policy';
import type { Decision, MatchResult } from './types';

/** Single place for match + thresholds → access verdict (audit / UI / persistence). */
export type GateDecisionInput = {
  match: MatchResult;
  thresholds: AccessThresholds;
  /** Reserved for policy versioning / multi-tab coherence. */
  policyEpochId?: string;
  /** Reserved for ONNX / detector latency budgets. */
  modelLatencyMs?: number;
};

export type GateAccessVerdict = {
  decision: Decision;
  /** Stable machine-oriented tags for logs and replay. */
  reasons: readonly string[];
  bestScore: number;
  marginDelta: number;
};

function marginDeltaFor(match: MatchResult): number {
  return match.runnerUp === null ? 1 : match.best.score - match.runnerUp.score;
}

function reasonsForUncertain(
  score: number,
  marginDelta: number,
  t: AccessThresholds,
): readonly string[] {
  if (score < t.strong) return ['weak-or-mid-band'];
  if (marginDelta < t.margin) return ['insufficient-margin'];
  return ['uncertain'];
}

function reasonsFor(match: MatchResult, t: AccessThresholds, decision: Decision): readonly string[] {
  const score = match.best.score;
  const marginDelta = marginDeltaFor(match);
  if (decision === 'DENIED') return ['below-unknown'];
  if (decision === 'GRANTED') return ['strong-and-margin'];
  return reasonsForUncertain(score, marginDelta, t);
}

export function evaluateGateAccessMatch(input: GateDecisionInput): GateAccessVerdict {
  const { match, thresholds } = input;
  const decision = decideFromMatch(match, thresholds);
  const bestScore = match.best.score;
  const marginDelta = marginDeltaFor(match);
  return {
    decision,
    reasons: reasonsFor(match, thresholds, decision),
    bestScore,
    marginDelta,
  };
}

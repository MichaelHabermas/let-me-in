import { decideFromMatch, type AccessThresholds } from './access-policy';
import type { Decision, MatchResult } from './types';
import type { LivenessEvidence } from '../app/liveness';

/** Single place for match + thresholds → access verdict (audit / UI / persistence). */
export type GateDecisionInput = {
  match: MatchResult;
  thresholds: AccessThresholds;
  /** Reserved for policy versioning / multi-tab coherence. */
  policyEpochId?: string;
  /** Reserved for ONNX / detector latency budgets. */
  modelLatencyMs?: number;
  liveness?: LivenessEvidence;
};

export type GateAccessVerdict = {
  decision: Decision;
  userId: string | null;
  label: string;
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

function reasonsFor(
  match: MatchResult,
  t: AccessThresholds,
  decision: Decision,
  liveness?: LivenessEvidence,
): readonly string[] {
  if (liveness?.decision === 'FAIL') {
    return ['PRESENTATION_ATTACK_RISK', liveness.reason];
  }
  const score = match.best.score;
  const marginDelta = marginDeltaFor(match);
  if (decision === 'DENIED') return ['below-weak-band'];
  if (decision === 'GRANTED') return ['strong-and-margin'];
  return reasonsForUncertain(score, marginDelta, t);
}

export function evaluateGateAccessMatch(input: GateDecisionInput): GateAccessVerdict {
  const { match, thresholds, liveness } = input;
  const identityDecision = decideFromMatch(match, thresholds);
  const decision =
    identityDecision === 'GRANTED' && liveness?.decision === 'FAIL'
      ? 'UNCERTAIN'
      : identityDecision;
  const bestScore = match.best.score;
  const marginDelta = marginDeltaFor(match);
  return {
    decision,
    userId: decision === 'DENIED' ? null : match.best.userId,
    label: decision === 'DENIED' ? 'Unknown' : 'Matched user',
    reasons: reasonsFor(match, thresholds, decision, liveness),
    bestScore,
    marginDelta,
  };
}

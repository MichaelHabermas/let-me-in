import type { AccessThresholds } from '../domain/access-policy';
import { evaluateGateAccessMatch } from '../domain/gate-decision';
import type { Decision } from '../domain/types';

/** PRD E5.S1.F2.T1 input shape — thresholds mirror `config.thresholds` / settings row. */
export type PolicyDecideInput = {
  best: { userId: string; score: number };
  runnerUp: { userId: string; score: number } | null;
  thresholds: AccessThresholds;
};

export type PolicyDecision =
  | { decision: 'GRANTED'; userId: string; score: number }
  | { decision: 'UNCERTAIN'; userId: string; score: number }
  | { decision: 'DENIED'; userId: null; score: number; label: 'Unknown' };

/**
 * Maps top-2 match scores to GRANTED / UNCERTAIN / DENIED per glossary §3.
 * Delegates to domain `evaluateGateAccessMatch` — single source of truth.
 */
export function decide(input: PolicyDecideInput): PolicyDecision {
  const verdict = evaluateGateAccessMatch({
    match: { best: input.best, runnerUp: input.runnerUp },
    thresholds: input.thresholds,
  });
  const score = verdict.bestScore;
  const d: Decision = verdict.decision;
  if (d === 'DENIED') {
    return { decision: 'DENIED', userId: null, score, label: 'Unknown' };
  }
  if (d === 'GRANTED') {
    return { decision: 'GRANTED', userId: input.best.userId, score };
  }
  return { decision: 'UNCERTAIN', userId: input.best.userId, score };
}

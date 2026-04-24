import { describe, expect, it } from 'vitest';

import { evaluateGateAccessMatch } from '../src/domain/gate-decision';
import { decide, type PolicyDecision } from '../src/app/policy';
import type { AccessThresholds } from '../src/domain/access-policy';

const thresholds: AccessThresholds = {
  strong: 0.85,
  weak: 0.65,
  unknown: 0.65,
  margin: 0.05,
};

function verdictToPolicyShape(verdict: ReturnType<typeof evaluateGateAccessMatch>): PolicyDecision {
  const score = verdict.bestScore;
  if (verdict.decision === 'DENIED') {
    return { decision: 'DENIED', userId: null, score, label: 'Unknown' };
  }
  if (verdict.decision === 'GRANTED') {
    return { decision: 'GRANTED', userId: verdict.userId!, score };
  }
  return { decision: 'UNCERTAIN', userId: verdict.userId!, score };
}

describe('decide vs evaluateGateAccessMatch parity', () => {
  it.each([
    {
      name: 'GRANTED strong + margin',
      best: { userId: 'u1', score: 0.86 },
      runnerUp: { userId: 'u2', score: 0.7 } as const,
    },
    {
      name: 'UNCERTAIN weak band',
      best: { userId: 'u1', score: 0.7 },
      runnerUp: { userId: 'u2', score: 0.2 } as const,
    },
    {
      name: 'DENIED below weak',
      best: { userId: 'u1', score: 0.64 },
      runnerUp: { userId: 'u2', score: 0.5 } as const,
    },
    {
      name: 'UNCERTAIN strong score but margin too small',
      best: { userId: 'u1', score: 0.86 },
      runnerUp: { userId: 'u2', score: 0.84 } as const,
    },
    {
      name: 'GRANTED at strong with no runner-up',
      best: { userId: 'u1', score: 0.85 },
      runnerUp: null,
    },
  ])('$name: decide matches domain verdict mapping', ({ best, runnerUp }) => {
    const input = { best, runnerUp, thresholds };
    const fromDecide = decide(input);
    const fromDomain = verdictToPolicyShape(
      evaluateGateAccessMatch({ match: { best, runnerUp }, thresholds }),
    );
    expect(fromDecide).toEqual(fromDomain);
  });
});

import { describe, expect, it } from 'vitest';

import { decide } from '../src/app/policy';
import type { AccessThresholds } from '../src/domain/access-policy';

const thresholds: AccessThresholds = {
  strong: 0.85,
  weak: 0.65,
  unknown: 0.65,
  margin: 0.05,
};

describe('policy.decide (E5.S1.F2.T1)', () => {
  it.each([
    {
      name: 'GRANTED strong + margin',
      best: { userId: 'u1', score: 0.86 },
      runnerUp: { userId: 'u2', score: 0.7 },
      want: { decision: 'GRANTED' as const, userId: 'u1', score: 0.86 },
    },
    {
      name: 'UNCERTAIN weak band',
      best: { userId: 'u1', score: 0.7 },
      runnerUp: { userId: 'u2', score: 0.2 },
      want: { decision: 'UNCERTAIN' as const, userId: 'u1', score: 0.7 },
    },
    {
      name: 'DENIED below weak',
      best: { userId: 'u1', score: 0.64 },
      runnerUp: { userId: 'u2', score: 0.5 },
      want: { decision: 'DENIED' as const, userId: null, score: 0.64, label: 'Unknown' as const },
    },
    {
      name: 'UNCERTAIN strong score but margin too small',
      best: { userId: 'u1', score: 0.86 },
      runnerUp: { userId: 'u2', score: 0.84 },
      want: { decision: 'UNCERTAIN' as const, userId: 'u1', score: 0.86 },
    },
    {
      name: 'GRANTED at strong with no runner-up',
      best: { userId: 'u1', score: 0.85 },
      runnerUp: null,
      want: { decision: 'GRANTED' as const, userId: 'u1', score: 0.85 },
    },
  ])('$name', ({ best, runnerUp, want }) => {
    const got = decide({ best, runnerUp, thresholds });
    expect(got).toEqual(want);
  });
});

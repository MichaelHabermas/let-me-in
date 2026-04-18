import { describe, expect, it } from 'vitest';

import { evaluateGateAccessMatch } from '../src/domain/gate-decision';
import type { MatchResult } from '../src/domain/types';

const t = { strong: 0.8, weak: 0.65, unknown: 0.6, margin: 0.05 } as const;

function match(score: number, runnerUp: MatchResult['runnerUp']): MatchResult {
  return { best: { userId: 'u1', score }, runnerUp };
}

describe('evaluateGateAccessMatch', () => {
  it('matches decideFromMatch for DENIED and tags below-unknown', () => {
    const m = match(0.59, { userId: 'u2', score: 0.5 });
    const v = evaluateGateAccessMatch({ match: m, thresholds: t });
    expect(v.decision).toBe('DENIED');
    expect(v.reasons).toEqual(['below-unknown']);
    expect(v.bestScore).toBe(0.59);
    expect(v.marginDelta).toBeCloseTo(0.09, 5);
  });

  it('GRANTED with strong-and-margin', () => {
    const m = match(0.82, { userId: 'u2', score: 0.7 });
    const v = evaluateGateAccessMatch({ match: m, thresholds: t });
    expect(v.decision).toBe('GRANTED');
    expect(v.reasons).toEqual(['strong-and-margin']);
    expect(v.marginDelta).toBeCloseTo(0.12, 5);
  });

  it('UNCERTAIN for strong score but margin too small', () => {
    const m = match(0.82, { userId: 'u2', score: 0.78 });
    const v = evaluateGateAccessMatch({ match: m, thresholds: t });
    expect(v.decision).toBe('UNCERTAIN');
    expect(v.reasons).toEqual(['insufficient-margin']);
  });

  it('GRANTED with null runner-up uses margin 1', () => {
    const m = match(0.85, null);
    const v = evaluateGateAccessMatch({ match: m, thresholds: t });
    expect(v.decision).toBe('GRANTED');
    expect(v.marginDelta).toBe(1);
  });

  it('UNCERTAIN in mid band', () => {
    const m = match(0.7, { userId: 'u2', score: 0.2 });
    const v = evaluateGateAccessMatch({ match: m, thresholds: t });
    expect(v.decision).toBe('UNCERTAIN');
    expect(v.reasons).toEqual(['weak-or-mid-band']);
  });
});

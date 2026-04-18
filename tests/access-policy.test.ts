import { describe, expect, it } from 'vitest';

import { decideFromMatch } from '../src/domain/access-policy';
import type { MatchResult } from '../src/domain/types';

const t = { strong: 0.8, weak: 0.65, unknown: 0.6, margin: 0.05 } as const;

function match(score: number, runnerUp: MatchResult['runnerUp']): MatchResult {
  return { best: { userId: 'u1', score }, runnerUp };
}

describe('decideFromMatch', () => {
  it('returns DENIED below unknown threshold', () => {
    expect(decideFromMatch(match(0.59, { userId: 'u2', score: 0.5 }), t)).toBe('DENIED');
  });

  it('returns GRANTED when strong and margin clear', () => {
    expect(decideFromMatch(match(0.82, { userId: 'u2', score: 0.7 }), t)).toBe('GRANTED');
  });

  it('returns UNCERTAIN when strong score but margin too small', () => {
    expect(decideFromMatch(match(0.82, { userId: 'u2', score: 0.78 }), t)).toBe('UNCERTAIN');
  });

  it('treats missing runner-up as satisfied margin', () => {
    expect(decideFromMatch(match(0.85, null), t)).toBe('GRANTED');
  });

  it('returns UNCERTAIN in weak band without grant', () => {
    expect(decideFromMatch(match(0.7, { userId: 'u2', score: 0.2 }), t)).toBe('UNCERTAIN');
  });

  it('returns UNCERTAIN between unknown and strong when margin fails', () => {
    expect(decideFromMatch(match(0.75, { userId: 'u2', score: 0.74 }), t)).toBe('UNCERTAIN');
  });
});

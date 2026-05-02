import { describe, expect, it } from 'vitest';

import { evaluateGateAccessMatch } from '../src/domain/gate-decision';
import type { MatchResult } from '../src/domain/types';

const t = { strong: 0.85, weak: 0.65, unknown: 0.65, margin: 0.05 } as const;

function match(score: number, runnerUp: MatchResult['runnerUp']): MatchResult {
  return { best: { userId: 'u1', score }, runnerUp };
}

describe('evaluateGateAccessMatch', () => {
  it('matches decideFromMatch for DENIED and tags below-weak-band', () => {
    const m = match(0.64, { userId: 'u2', score: 0.5 });
    const v = evaluateGateAccessMatch({ match: m, thresholds: t });
    expect(v.decision).toBe('DENIED');
    expect(v.reasons).toEqual(['below-weak-band']);
    expect(v.userId).toBeNull();
    expect(v.label).toBe('Unknown');
    expect(v.bestScore).toBe(0.64);
    expect(v.marginDelta).toBeCloseTo(0.14, 5);
  });

  it('GRANTED with strong-and-margin', () => {
    const m = match(0.86, { userId: 'u2', score: 0.7 });
    const v = evaluateGateAccessMatch({ match: m, thresholds: t });
    expect(v.decision).toBe('GRANTED');
    expect(v.userId).toBe('u1');
    expect(v.label).toBe('Matched user');
    expect(v.reasons).toEqual(['strong-and-margin']);
    expect(v.marginDelta).toBeCloseTo(0.16, 5);
  });

  it('UNCERTAIN for strong score but margin too small', () => {
    const m = match(0.86, { userId: 'u2', score: 0.84 });
    const v = evaluateGateAccessMatch({ match: m, thresholds: t });
    expect(v.decision).toBe('UNCERTAIN');
    expect(v.userId).toBe('u1');
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

  it('demotes strong identity to UNCERTAIN when liveness fails', () => {
    const m = match(0.9, { userId: 'u2', score: 0.5 });
    const v = evaluateGateAccessMatch({
      match: m,
      thresholds: t,
      liveness: {
        decision: 'FAIL',
        reason: 'LOW_FRAME_DIFFERENCE',
        score: 0.2,
        sampleCount: 5,
        requiredSamples: 5,
        metrics: { frameDifference: 0, textureVariation: 0.2, sharpness: 0.7, glareRisk: 0 },
      },
    });
    expect(v.decision).toBe('UNCERTAIN');
    expect(v.reasons).toEqual(['PRESENTATION_ATTACK_RISK', 'LOW_FRAME_DIFFERENCE']);
  });
});

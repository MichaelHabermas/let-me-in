import { describe, expect, it } from 'vitest';

import { cosine, l2normalize, matchOne, similarity01 } from '../src/app/match';

describe('l2normalize (E4.S1.F3.T2)', () => {
  it('makes dot(v,v) ≈ 1 after normalize', () => {
    const v = new Float32Array([3, 4, 0, 0]);
    l2normalize(v);
    let dot = 0;
    for (let i = 0; i < v.length; i++) dot += v[i]! * v[i]!;
    expect(dot).toBeCloseTo(1, 5);
  });
});

describe('cosine + similarity01 (E5.S1.F1.T1)', () => {
  it('returns ~1 for identical vectors', () => {
    const a = new Float32Array([1, 2, 3, 4]);
    const b = new Float32Array([1, 2, 3, 4]);
    expect(cosine(a, b)).toBeCloseTo(1, 5);
    expect(similarity01(a, b)).toBeCloseTo(1, 5);
  });

  it('returns ~0.5 similarity01 for orthogonal vectors', () => {
    const a = new Float32Array([1, 0, 0, 0]);
    const b = new Float32Array([0, 1, 0, 0]);
    expect(similarity01(a, b)).toBeCloseTo(0.5, 5);
  });
});

describe('matchOne (E5.S1.F1.T2)', () => {
  it('returns correct top-2 ranking for enrolled fixture', () => {
    const live = new Float32Array([1, 0, 0, 0]);
    const ranked = matchOne(live, [
      { userId: 'u3', embedding: new Float32Array([0, 0, 1, 0]) },
      { userId: 'u2', embedding: new Float32Array([0.7, 0.7, 0, 0]) },
      { userId: 'u1', embedding: new Float32Array([1, 0, 0, 0]) },
    ]);
    expect(ranked.best.userId).toBe('u1');
    expect(ranked.runnerUp?.userId).toBe('u2');
    expect(ranked.best.score).toBeGreaterThan(ranked.runnerUp!.score);
  });
});

import { describe, expect, it } from 'vitest';

import { l2normalize } from '../src/app/match';

describe('l2normalize (E4.S1.F3.T2)', () => {
  it('makes dot(v,v) ≈ 1 after normalize', () => {
    const v = new Float32Array([3, 4, 0, 0]);
    l2normalize(v);
    let dot = 0;
    for (let i = 0; i < v.length; i++) dot += v[i]! * v[i]!;
    expect(dot).toBeCloseTo(1, 5);
  });
});

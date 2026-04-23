import { describe, expect, it } from 'vitest';

import { evaluateGateAccessMatch } from '../src/domain/gate-decision';
import type { AccessThresholds } from '../src/domain/access-policy';
import { matchOne, type EnrolledEmbedding } from '../src/app/match';

/** E5 DoD-1: 50 enrolled 512-d vectors — match + policy must stay well under 20 ms on CI/laptop. */
function normalizedRandom512(seed: number): Float32Array {
  const v = new Float32Array(512);
  let s = seed;
  for (let i = 0; i < 512; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    v[i] = (s / 0x7fffffff) * 2 - 1;
  }
  let sumSq = 0;
  for (let i = 0; i < 512; i++) sumSq += v[i]! * v[i]!;
  const inv = 1 / Math.sqrt(sumSq);
  for (let i = 0; i < 512; i++) v[i]! *= inv;
  return v;
}

describe('matchOne perf (E5 DoD-1)', () => {
  const thresholds: AccessThresholds = {
    strong: 0.85,
    weak: 0.65,
    unknown: 0.65,
    margin: 0.05,
  };

  it('completes matchOne + decide path for 50 users in under 20 ms (warm-up excluded)', () => {
    const enrolled: EnrolledEmbedding[] = [];
    for (let u = 0; u < 50; u++) {
      enrolled.push({ userId: `u${u}`, embedding: normalizedRandom512(10_000 + u) });
    }
    const live = normalizedRandom512(42);

    for (let w = 0; w < 5; w++) {
      const ranked = matchOne(live, enrolled);
      evaluateGateAccessMatch({
        match: { best: ranked.best, runnerUp: ranked.runnerUp },
        thresholds,
      });
    }

    const samples: number[] = [];
    for (let r = 0; r < 3; r++) {
      const t0 = performance.now();
      const ranked = matchOne(live, enrolled);
      evaluateGateAccessMatch({
        match: { best: ranked.best, runnerUp: ranked.runnerUp },
        thresholds,
      });
      samples.push(performance.now() - t0);
    }
    const median = [...samples].sort((a, b) => a - b)[1]!;
    expect(median).toBeLessThan(20);
  });
});

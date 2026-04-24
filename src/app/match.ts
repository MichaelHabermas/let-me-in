/**
 * Similarity and embedding helpers for the matching engine (E5 will add brute-force cosine).
 */

import { f32At } from '../infra/typed-index';

/** In-place L2 normalization; returns the same buffer for chaining. */
export function l2normalize(vec: Float32Array): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    const v = f32At(vec, i);
    sumSq += v * v;
  }
  const n = Math.sqrt(sumSq);
  if (n < 1e-12) {
    return vec;
  }
  const inv = 1 / n;
  for (let i = 0; i < vec.length; i++) {
    vec[i] = f32At(vec, i) * inv;
  }
  return vec;
}

/** Stable shape for matching against enrolled embeddings. */
export type EnrolledEmbedding = {
  userId: string;
  embedding: Float32Array;
};

export type MatchOneResult = {
  best: { userId: string; score: number };
  runnerUp: { userId: string; score: number } | null;
};

/**
 * Cosine similarity for equal-length vectors (full formula; for L2-normalized
 * inputs this matches the dot product).
 */
export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`cosine() length mismatch: ${a.length} !== ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = f32At(a, i);
    const bv = f32At(b, i);
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < 1e-12) return 0;
  return dot / denom;
}

/** Maps cosine [-1, 1] to [0, 1]. */
export function similarity01(a: Float32Array, b: Float32Array): number {
  const c = cosine(a, b);
  const clamped = Math.max(-1, Math.min(1, c));
  return (1 + clamped) / 2;
}

/** Brute-force 1:N matching with top-2 ranking. */
export function matchOne(
  live: Float32Array,
  enrolled: readonly EnrolledEmbedding[],
): MatchOneResult {
  if (enrolled.length === 0) {
    throw new Error('matchOne() requires at least one enrolled embedding');
  }

  let bestIdx = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  let runnerIdx = -1;
  let runnerScore = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < enrolled.length; i++) {
    const cur = enrolled[i];
    if (!cur) continue;
    const score = similarity01(live, cur.embedding);
    if (score > bestScore) {
      runnerIdx = bestIdx;
      runnerScore = bestScore;
      bestIdx = i;
      bestScore = score;
    } else if (score > runnerScore) {
      runnerIdx = i;
      runnerScore = score;
    }
  }

  const best = enrolled[bestIdx];
  if (!best) {
    throw new Error('matchOne() internal error: missing best match');
  }
  const runner = runnerIdx >= 0 ? (enrolled[runnerIdx] ?? null) : null;
  return {
    best: { userId: best.userId, score: bestScore },
    runnerUp: runner ? { userId: runner.userId, score: runnerScore } : null,
  };
}

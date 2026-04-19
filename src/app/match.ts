/**
 * Similarity and embedding helpers for the matching engine (E5 will add brute-force cosine).
 */

/** In-place L2 normalization; returns the same buffer for chaining. */
export function l2normalize(vec: Float32Array): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    const v = vec[i]!;
    sumSq += v * v;
  }
  const n = Math.sqrt(sumSq);
  if (n < 1e-12) {
    return vec;
  }
  const inv = 1 / n;
  for (let i = 0; i < vec.length; i++) {
    vec[i]! *= inv;
  }
  return vec;
}

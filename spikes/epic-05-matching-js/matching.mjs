/**
 * Epic 5 — pure JS matching (toy vectors). No ML.
 *
 * Geometry: L2-normalized vectors; raw cosine = dot(a,b) ∈ [-1, 1].
 * Decision score for PRE-SEARCH §3 bands: similarity01 = (1 + cosineRaw) / 2 ∈ [0, 1].
 *
 * --- PRE-SEARCH §3 band mapping (on similarity01) ---
 * | strong | similarity01 ≥ 0.80 |
 * | weak   | 0.65 ≤ similarity01 < 0.80 |
 * | reject | similarity01 < 0.65 |
 * Optional “strong GRANTED”: also require (score − secondScore) ≥ 0.05 — see strongGrantedWithMargin.
 */

const EPS = 1e-5;

/**
 * @param {Float32Array} v
 * @returns {Float32Array} new unit vector (same length)
 * @throws {RangeError} if ‖v‖ is zero
 */
export function l2Normalize(v) {
  let sq = 0;
  for (let i = 0; i < v.length; i++) sq += v[i] * v[i];
  const n = Math.sqrt(sq);
  if (n < EPS) throw new RangeError("l2Normalize: zero vector");
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

/** L2 norm (for tests). */
export function l2Norm(v) {
  let sq = 0;
  for (let i = 0; i < v.length; i++) sq += v[i] * v[i];
  return Math.sqrt(sq);
}

/**
 * Cosine similarity for already L2-normalized a, b (same length).
 * @returns {number} dot(a,b) ∈ [-1, 1]
 */
export function cosine(a, b) {
  if (a.length !== b.length) throw new RangeError("cosine: length mismatch");
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d;
}

/** Map raw cosine to [0,1] for §3 thresholds. */
export function similarity01FromCosine(cos) {
  return (1 + cos) / 2;
}

/**
 * @param {Float32Array} query — should be L2-normalized
 * @param {Float32Array[]} gallery — each row L2-normalized, same dimension as query
 * @returns {{ index: number, score: number, secondScore: number | null, cosineRaw: number, secondCosineRaw: number | null }}
 *   score / secondScore are similarity01. Sort by cosine desc, then index asc → tie on top → lowest index wins;
 *   secondScore is the 2nd row in that order (same cosine possible → margin 0).
 */
export function bestMatch(query, gallery) {
  if (gallery.length === 0) throw new RangeError("bestMatch: empty gallery");
  const ranked = gallery.map((g, i) => ({ i, c: cosine(query, g) }));
  ranked.sort((a, b) => {
    if (b.c !== a.c) return b.c - a.c;
    return a.i - b.i;
  });
  const top = ranked[0];
  const runner = ranked[1];
  return {
    index: top.i,
    score: similarity01FromCosine(top.c),
    secondScore: runner ? similarity01FromCosine(runner.c) : null,
    cosineRaw: top.c,
    secondCosineRaw: runner ? runner.c : null,
  };
}

/** PRE-SEARCH §3 bands on similarity01 ∈ [0,1]. */
export const Band = {
  Strong: "strong",
  Weak: "weak",
  Reject: "reject",
};

/**
 * @param {number} s — similarity01
 * @returns {"strong"|"weak"|"reject"}
 */
export function bandFromSimilarity01(s) {
  if (s >= 0.8) return Band.Strong;
  if (s >= 0.65) return Band.Weak;
  return Band.Reject;
}

/**
 * Strong GRANTED per §3 + optional margin (F5.3 / E5-T5).
 * @param {number} score — similarity01 of best match
 * @param {number | null} secondScore — similarity01 of runner-up; null if |gallery|===1
 * @param {{ margin?: number }} [opts]
 */
export function strongGrantedWithMargin(score, secondScore, opts = {}) {
  const margin = opts.margin ?? 0.05;
  if (score < 0.8) return false;
  if (secondScore == null) return true;
  return score - secondScore >= margin;
}

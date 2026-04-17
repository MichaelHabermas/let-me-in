/**
 * Epic 5 matching (copied for Epic 6). similarity01 = (1 + cosine) / 2 on L2-normalized fingerprints.
 */

const EPS = 1e-5;

export function l2Normalize(v) {
  let sq = 0;
  for (let i = 0; i < v.length; i++) sq += v[i] * v[i];
  const n = Math.sqrt(sq);
  if (n < EPS) throw new RangeError("l2Normalize: zero vector");
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

export function cosine(a, b) {
  if (a.length !== b.length) throw new RangeError("cosine: length mismatch");
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d;
}

export function similarity01FromCosine(cos) {
  return (1 + cos) / 2;
}

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

export const Band = {
  Strong: "strong",
  Weak: "weak",
  Reject: "reject",
};

export function bandFromSimilarity01(s) {
  if (s >= 0.8) return Band.Strong;
  if (s >= 0.65) return Band.Weak;
  return Band.Reject;
}

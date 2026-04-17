import assert from "node:assert/strict";
import test from "node:test";
import {
  l2Normalize,
  l2Norm,
  cosine,
  similarity01FromCosine,
  bestMatch,
  bandFromSimilarity01,
  Band,
  strongGrantedWithMargin,
} from "./matching.mjs";

const EPS = 1e-5;

test("E5-T1: l2Normalize — unit length within ε", () => {
  const v = new Float32Array([3, 4, 0]);
  const u = l2Normalize(v);
  assert.ok(Math.abs(l2Norm(u) - 1) < EPS);
});

test("E5-T1: l2Normalize — throws on zero vector", () => {
  assert.throws(() => l2Normalize(new Float32Array([0, 0, 0])), RangeError);
});

test("E5-T2: cosine — hand checks (normalized vectors)", () => {
  // Expected vs actual (dot on unit vectors):
  // e0·e0 = 1
  // e0·e1 = 0 (orthogonal)
  // a = (1/√2,1/√2,0), b = (1/√2,-1/√2,0) → a·b = 1/2 - 1/2 = 0
  const e0 = new Float32Array([1, 0, 0]);
  const e1 = new Float32Array([0, 1, 0]);
  const a = l2Normalize(new Float32Array([1, 1, 0]));
  const b = l2Normalize(new Float32Array([1, -1, 0]));

  assert.ok(Math.abs(cosine(e0, e0) - 1) < EPS, `expected 1, got ${cosine(e0, e0)}`);
  assert.ok(Math.abs(cosine(e0, e1) - 0) < EPS, `expected 0, got ${cosine(e0, e1)}`);
  assert.ok(Math.abs(cosine(a, b) - 0) < EPS, `expected 0, got ${cosine(a, b)}`);
});

test("E5-T3: bestMatch — toy gallery", () => {
  const q = l2Normalize(new Float32Array([1, 0, 0]));
  const g0 = l2Normalize(new Float32Array([1, 0.1, 0]));
  const g1 = l2Normalize(new Float32Array([0, 1, 0]));
  const g2 = l2Normalize(new Float32Array([-1, 0, 0]));
  const r = bestMatch(q, [g0, g1, g2]);
  assert.equal(r.index, 0);
  assert.ok(r.score > similarity01FromCosine(cosine(q, g1)));
  assert.ok(r.secondScore != null && r.secondScore >= 0 && r.secondScore <= 1);
});

test("E5-T3: bestMatch — tie → lowest index", () => {
  const q = new Float32Array([1, 0, 0]);
  const same = new Float32Array([1, 0, 0]);
  const r = bestMatch(q, [same, same]);
  assert.equal(r.index, 0);
  assert.ok(Math.abs(r.score - similarity01FromCosine(1)) < EPS);
  assert.ok(r.secondScore != null && Math.abs(r.score - r.secondScore) < EPS);
});

test("E5-T3: bestMatch — single gallery entry → secondScore null", () => {
  const q = new Float32Array([1, 0, 0]);
  const r = bestMatch(q, [q]);
  assert.equal(r.index, 0);
  assert.equal(r.secondScore, null);
});

test("E5-T3: bestMatch — empty gallery throws", () => {
  const q = new Float32Array([1, 0, 0]);
  assert.throws(() => bestMatch(q, []), RangeError);
});

test("E5-T4: bands on similarity01", () => {
  assert.equal(bandFromSimilarity01(0.85), Band.Strong);
  assert.equal(bandFromSimilarity01(0.8), Band.Strong);
  assert.equal(bandFromSimilarity01(0.7), Band.Weak);
  assert.equal(bandFromSimilarity01(0.65), Band.Weak);
  assert.equal(bandFromSimilarity01(0.64), Band.Reject);
});

test("E5-T5: margin — strong without runner-up", () => {
  assert.equal(strongGrantedWithMargin(0.85, null), true);
});

test("E5-T5: margin — rejects strong top score when runner-up too close", () => {
  assert.equal(strongGrantedWithMargin(0.85, 0.82, { margin: 0.05 }), false);
  assert.equal(strongGrantedWithMargin(0.85, 0.79, { margin: 0.05 }), true);
});

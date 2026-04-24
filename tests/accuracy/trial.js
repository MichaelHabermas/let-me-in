#!/usr/bin/env node
/**
 * E10.S2 — helpers for TPR/FPR from confusion-matrix counts (offline math).
 * See `docs/ACCURACY_RESULTS.md` for the recording template.
 */

export function truePositiveRate(tp, fn) {
  const d = tp + fn;
  return d === 0 ? NaN : tp / d;
}

export function falsePositiveRate(fp, tn) {
  const d = fp + tn;
  return d === 0 ? NaN : fp / d;
}

export function formatRates({ tpr, fpr }) {
  return `TPR=${(tpr * 100).toFixed(1)}% FPR=${(fpr * 100).toFixed(1)}%`;
}

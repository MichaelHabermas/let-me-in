import { describe, expect, it } from 'vitest';
import { falsePositiveRate, formatRates, truePositiveRate } from './accuracy/trial.js';

describe('tests/accuracy/trial.js', () => {
  it('computes TPR and FPR', () => {
    const tpr = truePositiveRate(17, 3);
    const fpr = falsePositiveRate(2, 78);
    expect(tpr).toBeCloseTo(0.85, 5);
    expect(fpr).toBeCloseTo(0.025, 5);
    expect(formatRates({ tpr, fpr })).toMatch(/TPR=/);
  });
});

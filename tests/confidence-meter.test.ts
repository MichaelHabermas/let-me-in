import { describe, expect, it } from 'vitest';

import {
  confidenceBandForScore,
  renderConfidenceMeter,
} from '../src/ui/components/confidence-meter';

describe('confidenceBandForScore', () => {
  it('classifies strong vs weak vs reject from default config thresholds', () => {
    expect(confidenceBandForScore(0.9)).toBe('strong');
    expect(confidenceBandForScore(0.85)).toBe('strong');
    expect(confidenceBandForScore(0.7)).toBe('weak');
    expect(confidenceBandForScore(0.65)).toBe('weak');
    expect(confidenceBandForScore(0.64)).toBe('reject');
  });
});

describe('renderConfidenceMeter', () => {
  it('sets fill width and band class for a high score', () => {
    const el = renderConfidenceMeter({ similarity01: 0.92 });
    expect(el.classList.contains('confidence-meter--strong')).toBe(true);
    const fill = el.querySelector('.confidence-meter__fill') as HTMLDivElement;
    expect(fill.style.width).toBe('92%');
    expect(el.getAttribute('aria-valuenow')).toBe('92');
  });

  it('clamps fill to 100%', () => {
    const el = renderConfidenceMeter({ similarity01: 1.05 });
    const fill = el.querySelector('.confidence-meter__fill') as HTMLDivElement;
    expect(fill.style.width).toBe('100%');
  });
});

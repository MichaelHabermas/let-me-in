/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';

import { renderDecisionBanner } from '../src/ui/components/decision-banner';

describe('renderDecisionBanner', () => {
  it('renders granted variant with title', () => {
    const el = renderDecisionBanner({
      variant: 'granted',
      title: 'Alex — 92%',
    });
    expect(el.classList.contains('banner--granted')).toBe(true);
    expect(el.querySelector('.banner__title')?.textContent).toBe('Alex — 92%');
  });

  it('renders uncertain without name line', () => {
    const el = renderDecisionBanner({
      variant: 'uncertain',
      title: 'Please try again',
    });
    expect(el.classList.contains('banner--uncertain')).toBe(true);
    expect(el.textContent).toBe('Please try again');
  });

  it('renders denied variant', () => {
    const el = renderDecisionBanner({
      variant: 'denied',
      title: 'Unknown — 40%',
    });
    expect(el.classList.contains('banner--denied')).toBe(true);
  });
});

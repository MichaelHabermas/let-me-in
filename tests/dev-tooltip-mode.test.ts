import { afterEach, describe, expect, it } from 'vitest';

import {
  cycleDevTooltipMode,
  getDevTooltipMode,
  setDevTooltipMode,
} from '../src/app/dev-tooltip-mode';

const STORAGE_KEY = 'gatekeeper:dev-tooltip-mode';

describe('dev-tooltip-mode', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDevTooltipMode('advanced');
  });

  it('cycles advanced → simple → off → advanced', () => {
    setDevTooltipMode('advanced');
    expect(cycleDevTooltipMode()).toBe('simple');
    expect(getDevTooltipMode()).toBe('simple');
    expect(cycleDevTooltipMode()).toBe('off');
    expect(getDevTooltipMode()).toBe('off');
    expect(cycleDevTooltipMode()).toBe('advanced');
    expect(getDevTooltipMode()).toBe('advanced');
  });

  it('persists off to localStorage', () => {
    setDevTooltipMode('off');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('off');
  });
});

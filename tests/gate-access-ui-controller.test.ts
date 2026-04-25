import { describe, expect, it } from 'vitest';

import { createGateUiRuntimeSlice } from '../src/app/gate-ui-runtime';
import { config } from '../src/config';
import {
  createGateAccessUiController,
  FALLBACK_GATE_ACCESS_UI_STRINGS,
} from '../src/app/gate-access-ui-controller';

const bands = { strong: 0.85, weak: 0.65 };

describe('createGateAccessUiController', () => {
  it('renders decision banner and confidence meter with score (GRANTED)', () => {
    const host = document.createElement('div');
    const ui = createGateAccessUiController(host, FALLBACK_GATE_ACCESS_UI_STRINGS);
    const blob = new Blob(['x']);
    ui.present({
      policy: {
        decision: 'GRANTED',
        userId: 'u1',
        label: 'Matched user',
        reasons: ['strong-and-margin'],
        bestScore: 0.88,
        marginDelta: 0.1,
      },
      displayName: 'Alex',
      referenceImageBlob: null,
      capturedFrameBlob: blob,
      bandThresholds: bands,
    });

    expect(host.querySelector('.banner--granted')).not.toBeNull();
    expect(host.querySelector('.banner__title')?.textContent).toBe('Alex — 88%');
    expect(host.querySelector('.confidence-meter')).not.toBeNull();
    expect(host.querySelector('.confidence-meter__fill')?.getAttribute('style')).toContain('88%');
  });

  it('includes similarity in banner title for DENIED (Unknown + score per SPECS)', () => {
    const host = document.createElement('div');
    const ui = createGateAccessUiController(host, FALLBACK_GATE_ACCESS_UI_STRINGS);
    ui.present({
      policy: {
        decision: 'DENIED',
        userId: null,
        label: 'Unknown',
        reasons: ['below-weak-band'],
        bestScore: 0.4,
        marginDelta: 0.1,
      },
      displayName: null,
      referenceImageBlob: null,
      capturedFrameBlob: new Blob(['x']),
      bandThresholds: bands,
    });

    expect(host.querySelector('.banner--denied')).not.toBeNull();
    expect(host.querySelector('.banner__title')?.textContent).toBe('Unknown — 40%');
  });

  it('config-driven gateAccessUiStrings include score in granted and denied copy (product path)', () => {
    const { gateAccessUiStrings } = createGateUiRuntimeSlice(config, false);
    const host = document.createElement('div');
    const ui = createGateAccessUiController(host, gateAccessUiStrings);

    ui.present({
      policy: {
        decision: 'GRANTED',
        userId: 'u1',
        label: 'Matched user',
        reasons: ['strong-and-margin'],
        bestScore: 0.91,
        marginDelta: 0.1,
      },
      displayName: 'Pat',
      referenceImageBlob: null,
      capturedFrameBlob: new Blob(['x']),
      bandThresholds: bands,
    });
    expect(host.querySelector('.banner__title')?.textContent).toMatch(/Pat/);
    expect(host.querySelector('.banner__title')?.textContent).toMatch(/91/);

    host.replaceChildren();
    ui.present({
      policy: {
        decision: 'DENIED',
        userId: null,
        label: 'Unknown',
        reasons: ['below-weak-band'],
        bestScore: 0.33,
        marginDelta: 0.1,
      },
      displayName: null,
      referenceImageBlob: null,
      capturedFrameBlob: new Blob(['x']),
      bandThresholds: bands,
    });
    const deniedTitle = host.querySelector('.banner__title')?.textContent ?? '';
    expect(deniedTitle).toContain(config.ui.strings.unknown);
    expect(deniedTitle).toMatch(/33/);
  });
});

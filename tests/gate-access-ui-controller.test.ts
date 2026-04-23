/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';

import {
  createGateAccessUiController,
  FALLBACK_GATE_ACCESS_UI_STRINGS,
} from '../src/app/gate-access-ui-controller';

describe('createGateAccessUiController', () => {
  it('renders decision banner and confidence meter', () => {
    const host = document.createElement('div');
    const ui = createGateAccessUiController(host, FALLBACK_GATE_ACCESS_UI_STRINGS);
    const blob = new Blob(['x']);
    ui.present({
      policy: { decision: 'GRANTED', userId: 'u1', score: 0.88 },
      displayName: 'Alex',
      referenceImageBlob: null,
      capturedFrameBlob: blob,
    });

    expect(host.querySelector('.banner--granted')).not.toBeNull();
    expect(host.querySelector('.confidence-meter')).not.toBeNull();
    expect(host.querySelector('.confidence-meter__fill')?.getAttribute('style')).toContain('88%');
  });
});

import { describe, expect, it } from 'vitest';

import { createGateUiRuntimeSlice } from '../src/app/gate-ui-runtime';
import { getDatabaseSeedSettingsFromConfig } from '../src/app/gate-seed-settings';
import type { Config } from '../src/config';

const uiCfg: Pick<Config, 'org' | 'camera' | 'ui'> = {
  org: { name: 'TestOrg', logoUrl: '' },
  camera: {
    idealWidth: 640,
    idealHeight: 480,
    defaultFacingMode: 'environment',
  },
  ui: {
    strings: {
      unknown: 'u',
      noFace: 'nf',
      multiFace: 'mf',
      cameraPermissionDenied: 'perm',
      cameraNoDevice: 'nodev',
      cameraUnknownError: 'unk',
      cameraStart: 'start',
      cameraStop: 'stop',
      detectorLoading: 'det-loading',
      detectorLoadFailed: 'det-fail',
    },
  },
};

describe('createGateUiRuntimeSlice', () => {
  it('sets showFpsOverlay from isDev', () => {
    expect(createGateUiRuntimeSlice(uiCfg, false).showFpsOverlay).toBe(false);
    expect(createGateUiRuntimeSlice(uiCfg, true).showFpsOverlay).toBe(true);
  });

  it('builds titles and preview dimensions from config', () => {
    const rt = createGateUiRuntimeSlice(uiCfg, false);
    expect(rt.orgName).toBe('TestOrg');
    expect(rt.gatePageTitle).toBe('TestOrg — Entry');
    expect(rt.previewCanvasWidth).toBe(640);
    expect(rt.getDefaultVideoConstraintsForCamera().facingMode).toBe('environment');
  });

  it('maps camera error codes to strings', () => {
    const rt = createGateUiRuntimeSlice(uiCfg, false);
    expect(rt.getCameraUserFacingMessage('permission-denied')).toBe('perm');
    expect(rt.getCameraUserFacingMessage('camera-stopped')).toBe('');
  });

  it('exposes detector status strings', () => {
    const rt = createGateUiRuntimeSlice(uiCfg, false);
    expect(rt.getDetectorLoadingMessage()).toBe('det-loading');
    expect(rt.getDetectorLoadFailedMessage()).toBe('det-fail');
  });
});

describe('getDatabaseSeedSettingsFromConfig', () => {
  it('returns thresholds and cooldown aligned with AccessThresholds', () => {
    const seed = getDatabaseSeedSettingsFromConfig({
      thresholds: { strong: 0.9, weak: 0.7, unknown: 0.55, margin: 0.03 },
      cooldownMs: 5000,
    });
    expect(seed.cooldownMs).toBe(5000);
    expect(seed.thresholds.strong).toBe(0.9);
    expect(seed.thresholds).not.toBe(
      getDatabaseSeedSettingsFromConfig({
        thresholds: { strong: 0.9, weak: 0.7, unknown: 0.55, margin: 0.03 },
        cooldownMs: 5000,
      }).thresholds,
    );
  });
});

import { describe, expect, it } from 'vitest';

import { composeGateRuntime } from '../src/app/gate-runtime';
import { getGateSessionWiring } from '../src/app/gate-runtime-wiring';
import { createGateUiRuntimeSlice } from '../src/app/gate-ui-runtime';
import { getDatabaseSeedSettingsFromConfig } from '../src/app/gate-seed-settings';
import type { Config } from '../src/config';

const uiCfg: Pick<Config, 'org' | 'camera' | 'ui' | 'devLogEmbeddingTimings'> = {
  org: { name: 'TestOrg', logoUrl: '', tagline: 'Test org tagline.' },
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
      modelLoadStageDetector: 'det-stage',
      modelLoadStageEmbedder: 'emb-stage',
      modelLoadRetry: 'retry',
      adminLoginHeading: 'h',
      adminLoginUsername: 'u',
      adminLoginPassword: 'p',
      adminLoginSubmit: 's',
      adminLoginError: 'e',
      adminLogout: 'o',
      rosterTitle: 'rt',
      rosterColPhoto: 'rp',
      rosterColName: 'rn',
      rosterColRole: 'rr',
      rosterColCreated: 'rc',
      rosterColActions: 'ra',
      rosterEdit: 're',
      rosterDelete: 'rd',
      rosterThumbnailAlt: 'rta',
      rosterBulkImport: 'rb',
      rosterExportJson: 'rej',
      rosterImportPick: 'rip',
      rosterImportConfirmDuplicates: 'ric',
      rosterImportProgress: 'rpr',
      rosterImportDone: 'rid',
      rosterExportDone: 'red',
      rosterDeleteConfirm: 'rdc',
      enrollTitle: 't',
      enrollStartCamera: 'sc',
      enrollCapture: 'c',
      enrollRetake: 'r',
      enrollSave: 'sv',
      enrollNameLabel: 'n',
      enrollRoleLabel: 'rl',
      enrollRolePlaceholder: 'rp',
      enrollRoleRequired: 'rrq',
      enrollRoleLegacySuffix: ' leg',
      enrollSuccess: 'ok',
      enrollNameRequired: 'req',
      accessGrantedBanner: '{name} {similarity}',
      accessDeniedBanner: '{unknown} {similarity}',
      accessTryAgain: 'try',
      consentTitle: 'ct',
      consentIntro: 'ci',
      consentBulletPurpose: 'b1',
      consentBulletStored: 'b2',
      consentBulletRetention: 'b3',
      consentBulletRefuse: 'b4',
      consentAccept: 'okc',
      consentDecline: 'noc',
      logExportCsv: 'csv',
      cameraSelectAriaLabel: 'cam',
      cameraDefaultDeviceOption: 'def',
      cameraUnnamedFormat: 'Camera {n}',
      adminAccessThresholdsTitle: 'Match thresholds',
      adminAccessThresholdsStatus: 's={strong} w={weak} m={margin}',
      adminAccessThresholdsApplySpec075: '0.75',
    },
  },
  devLogEmbeddingTimings: false,
};

describe('createGateUiRuntimeSlice', () => {
  it('sets showFpsOverlay from isDev', () => {
    expect(createGateUiRuntimeSlice(uiCfg, false).showFpsOverlay).toBe(false);
    expect(createGateUiRuntimeSlice(uiCfg, true).showFpsOverlay).toBe(true);
  });

  it('builds titles and preview dimensions from config', () => {
    const rt = createGateUiRuntimeSlice(uiCfg, false);
    expect(rt.orgName).toBe('TestOrg');
    expect(rt.orgTagline).toBe('Test org tagline.');
    expect(rt.gatePageTitle).toBe('TestOrg — Entry');
    expect(rt.previewCanvasWidth).toBe(640);
    expect(rt.defaultVideoConstraintsForCamera.facingMode).toBe('environment');
  });

  it('maps camera error codes to strings', () => {
    const rt = createGateUiRuntimeSlice(uiCfg, false);
    expect(rt.getCameraUserFacingMessage('permission-denied')).toBe('perm');
    expect(rt.getCameraUserFacingMessage('camera-stopped')).toBe('');
  });

  it('exposes detector status strings', () => {
    const rt = createGateUiRuntimeSlice(uiCfg, false);
    expect(rt.detectorLoadingMessage).toBe('det-loading');
    expect(rt.detectorLoadFailedMessage).toBe('det-fail');
    expect(rt.modelLoadStageDetectorLabel).toBe('det-stage');
    expect(rt.modelLoadStageEmbedderLabel).toBe('emb-stage');
    expect(rt.modelLoadRetryLabel).toBe('retry');
  });

  it('exposes log page strings for mounts', () => {
    const rt = createGateUiRuntimeSlice(uiCfg, false);
    expect(rt.logPageStrings.unknown).toBe('u');
    expect(rt.logPageStrings.logExportCsv).toBe('csv');
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

describe('composeGateRuntime', () => {
  it('merges UI slice with database seed and preview session deps', () => {
    const ui = createGateUiRuntimeSlice(uiCfg, false);
    const full = composeGateRuntime(ui, () =>
      getDatabaseSeedSettingsFromConfig({
        thresholds: { strong: 0.9, weak: 0.7, unknown: 0.55, margin: 0.03 },
        cooldownMs: 4200,
      }),
    );
    expect(full.databaseSeedSettings.cooldownMs).toBe(4200);
    expect(full.gatePreviewSessionCoreDeps.cooldownMs).toBe(4200);
    expect(full.gatePreviewSessionCoreDeps.noFaceMessage).toBe('nf');
    expect(full.runtimeSlices.gate.pageTitle).toBe(full.gatePageTitle);
    expect(full.runtimeSlices.admin.pageTitle).toBe(full.adminPageTitle);
    expect(full.runtimeSlices.admin.ui).toBe(full.adminUiStrings);
  });

  it('getGateSessionWiring exposes core + slices consistent with flat runtime', () => {
    const ui = createGateUiRuntimeSlice(uiCfg, false);
    const full = composeGateRuntime(ui, () =>
      getDatabaseSeedSettingsFromConfig({
        thresholds: { strong: 0.9, weak: 0.7, unknown: 0.55, margin: 0.03 },
        cooldownMs: 4200,
      }),
    );
    const w = getGateSessionWiring(full);
    expect(w.core).toBe(full.gatePreviewSessionCoreDeps);
    expect(w.accessUi).toBe(full.runtimeSlices.gate.accessUi);
    expect(w.consent).toBe(full.consentModalStrings);
    expect(w.gatePageTitle).toBe(full.gatePageTitle);
    expect(w.core.noFaceMessage).toBe(full.noFaceMessage);
  });
});

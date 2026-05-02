import type { DatabaseSeedSettings } from '../../src/domain/database-seed';
import { composeGateRuntime, type GateRuntime } from '../../src/app/gate-runtime';
import { getDatabaseSeedSettingsFromConfig } from '../../src/app/gate-seed-settings';
import type { GateSeedConfigSlice } from '../../src/app/gate-seed-settings';
import { createGateUiRuntimeSlice } from '../../src/app/gate-ui-runtime';
import {
  createCameraConfig,
  createUiStrings,
  DEFAULT_THRESHOLD_CONFIG,
  type Config,
  type UiStringsConfig,
} from '../../src/config';

/** Canonical gate seed config for Vitest — same values as `createTestGateRuntime` uses. */
export const DEFAULT_TEST_GATE_SEED_CONFIG: GateSeedConfigSlice = {
  thresholds: DEFAULT_THRESHOLD_CONFIG,
  cooldownMs: 3000,
};

export const DEFAULT_TEST_DATABASE_SEED: DatabaseSeedSettings =
  getDatabaseSeedSettingsFromConfig(DEFAULT_TEST_GATE_SEED_CONFIG);

const TEST_UI_STRING_OVERRIDES: Partial<UiStringsConfig> = {
  noFace: 'No face',
  multiFace: 'Multi',
  cameraPermissionDenied: 'perm',
  cameraNoDevice: 'nodev',
  cameraUnknownError: 'unk',
  cameraStart: 'Start',
  cameraStop: 'Stop',
  detectorLoading: 'Loading detector…',
  detectorLoadFailed: 'Detector failed.',
  modelLoadRetry: 'Retry',
  adminLoginHeading: 'Sign in',
  adminLoginUsername: 'User',
  adminLoginPassword: 'Pass',
  adminLoginSubmit: 'Go',
  adminLoginError: 'Bad creds',
  adminLogout: 'Out',
  rosterTitle: 'Users',
  rosterThumbnailAlt: 'Face',
  rosterBulkImport: 'Import',
  rosterExportJson: 'Export',
  rosterImportPick: 'Pick file',
  rosterImportConfirmDuplicates: 'Dup ok?',
  rosterImportProgress: '{current}/{total}',
  rosterImportDone: 'Done',
  rosterExportDone: 'Exported',
  rosterDeleteConfirm: 'Delete user?',
  enrollTitle: 'Enroll',
  enrollStartCamera: 'Start cam',
  enrollCapture: 'Cap',
  enrollRolePlaceholder: 'Pick role',
  enrollRoleRequired: 'Need role',
  enrollSuccess: 'Saved',
  enrollNameRequired: 'Need name',
  consentTitle: 'Consent',
  consentIntro: 'Intro',
  consentBulletPurpose: 'Purpose',
  consentBulletStored: 'Stored',
  consentBulletRetention: 'Retention',
  consentBulletRefuse: 'Refuse',
  consentAccept: 'Accept',
  cameraSelectAriaLabel: 'Camera',
  adminAccessThresholdsApplySpec075: 'Apply 0.75',
};

const testGateUiConfig: Pick<
  Config,
  'org' | 'camera' | 'ui' | 'devLogEmbeddingTimings'
> = {
  org: {
    name: 'TestOrg',
    logoUrl: '',
    tagline: 'Test tagline for browser-only facial recognition.',
  },
  camera: createCameraConfig({ idealWidth: 320, idealHeight: 240 }),
  ui: {
    strings: createUiStrings(TEST_UI_STRING_OVERRIDES),
  },
  devLogEmbeddingTimings: false,
};

/** `GateRuntime` for DOM tests — same composition path as production `resolveGateRuntime`. */
export function createTestGateRuntime(): GateRuntime {
  return composeGateRuntime(createGateUiRuntimeSlice(testGateUiConfig, false), () =>
    getDatabaseSeedSettingsFromConfig(DEFAULT_TEST_GATE_SEED_CONFIG),
  );
}

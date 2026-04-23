import { createGateUiRuntimeSlice } from '../../src/app/gate-ui-runtime';
import { getDatabaseSeedSettingsFromConfig } from '../../src/app/gate-seed-settings';
import { composeGateRuntime, type GateRuntime } from '../../src/app/runtime-settings';
import type { Config } from '../../src/config';

const testGateUiConfig: Pick<Config, 'org' | 'camera' | 'ui' | 'devLogEmbeddingTimings'> = {
  org: {
    name: 'TestOrg',
    logoUrl: '',
    tagline: 'Test tagline for browser-only facial recognition.',
  },
  camera: {
    idealWidth: 320,
    idealHeight: 240,
    defaultFacingMode: 'user',
  },
  ui: {
    strings: {
      unknown: 'Unknown',
      noFace: 'No face',
      multiFace: 'Multi',
      cameraPermissionDenied: 'perm',
      cameraNoDevice: 'nodev',
      cameraUnknownError: 'unk',
      cameraStart: 'Start',
      cameraStop: 'Stop',
      detectorLoading: 'Loading detector…',
      detectorLoadFailed: 'Detector failed.',
      adminLoginHeading: 'Sign in',
      adminLoginUsername: 'User',
      adminLoginPassword: 'Pass',
      adminLoginSubmit: 'Go',
      adminLoginError: 'Bad creds',
      adminLogout: 'Out',
      rosterTitle: 'Users',
      rosterColPhoto: 'Photo',
      rosterColName: 'Name',
      rosterColRole: 'Role',
      rosterColCreated: 'Added',
      rosterColActions: 'Actions',
      rosterEdit: 'Edit',
      rosterDelete: 'Delete',
      rosterThumbnailAlt: 'Face',
      rosterBulkImport: 'Import',
      rosterImportPick: 'Pick file',
      rosterImportConfirmDuplicates: 'Dup ok?',
      rosterImportProgress: '{current}/{total}',
      rosterImportDone: 'Done',
      rosterDeleteConfirm: 'Delete user?',
      enrollTitle: 'Enroll',
      enrollStartCamera: 'Start cam',
      enrollCapture: 'Cap',
      enrollRetake: 'Retake',
      enrollSave: 'Save',
      enrollNameLabel: 'Name',
      enrollRoleLabel: 'Role',
      enrollRolePlaceholder: 'Pick role',
      enrollRoleRequired: 'Need role',
      enrollRoleLegacySuffix: ' (legacy)',
      enrollSuccess: 'Saved',
      enrollNameRequired: 'Need name',
      accessGrantedBanner: '{name} — {similarity}%',
      accessDeniedBanner: '{unknown} — {similarity}%',
      accessTryAgain: 'Please try again',
      consentTitle: 'Consent',
      consentIntro: 'Intro',
      consentBulletPurpose: 'Purpose',
      consentBulletStored: 'Stored',
      consentBulletRetention: 'Retention',
      consentBulletRefuse: 'Refuse',
      consentAccept: 'Accept',
      consentDecline: 'Decline',
    },
  },
  devLogEmbeddingTimings: false,
};

/** `GateRuntime` for DOM tests — same composition path as production `resolveGateRuntime`. */
export function createTestGateRuntime(): GateRuntime {
  const seedCfg = {
    thresholds: { strong: 0.85, weak: 0.65, unknown: 0.65, margin: 0.05 },
    cooldownMs: 3000,
  };
  return composeGateRuntime(createGateUiRuntimeSlice(testGateUiConfig, false), () =>
    getDatabaseSeedSettingsFromConfig(seedCfg),
  );
}

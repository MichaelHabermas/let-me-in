import type { Config } from '../config';
import type { CameraErrorCode } from '../infra/camera';
import type { GateAccessUiStrings } from './gate-access-ui-controller';
import type { ConsentModalStrings } from '../ui/components/consent';

/** Config fields needed for titles, preview layout, and camera UX strings. */
export type GateUiConfigSlice = Pick<Config, 'org' | 'camera' | 'ui' | 'devLogEmbeddingTimings'>;

export type AdminUiStrings = {
  loginHeading: string;
  loginUsername: string;
  loginPassword: string;
  loginSubmit: string;
  loginError: string;
  logout: string;
  rosterTitle: string;
  rosterColPhoto: string;
  rosterColName: string;
  rosterColRole: string;
  rosterColCreated: string;
  rosterColActions: string;
  rosterEdit: string;
  rosterDelete: string;
  rosterThumbnailAlt: string;
  rosterBulkImport: string;
  rosterImportPick: string;
  rosterImportConfirmDuplicates: string;
  rosterImportProgress: string;
  rosterImportDone: string;
  rosterDeleteConfirm: string;
  enrollTitle: string;
  enrollStartCamera: string;
  enrollCapture: string;
  enrollRetake: string;
  enrollSave: string;
  enrollNameLabel: string;
  enrollRoleLabel: string;
  enrollRolePlaceholder: string;
  enrollRoleRequired: string;
  enrollRoleLegacySuffix: string;
  enrollSuccess: string;
  enrollNameRequired: string;
  cameraDefaultDeviceOption: string;
  cameraSelectAriaLabel: string;
  cameraUnnamedFormat: (indexOneBased: number) => string;
};

/** Log page copy — keep mounts off raw `config.ui.strings`. */
export type LogPageStrings = {
  unknown: string;
  logExportCsv: string;
};

export type GateUiRuntimeSlice = {
  orgName: string;
  orgTagline: string;
  gatePageTitle: string;
  adminPageTitle: string;
  logPageTitle: string;
  logPageStrings: LogPageStrings;
  previewCanvasWidth: number;
  previewCanvasHeight: number;
  showFpsOverlay: boolean;
  devLogEmbeddingTimings: boolean;
  defaultVideoConstraintsForCamera: {
    idealWidth: number;
    idealHeight: number;
    facingMode: string;
  };
  getCameraUserFacingMessage(code: CameraErrorCode): string;
  cameraStartLabel: string;
  cameraStopLabel: string;
  detectorLoadingMessage: string;
  detectorLoadFailedMessage: string;
  modelLoadStageDetectorLabel: string;
  modelLoadStageEmbedderLabel: string;
  modelLoadRetryLabel: string;
  noFaceMessage: string;
  multiFaceMessage: string;
  cameraDefaultDeviceOption: string;
  cameraSelectAriaLabel: string;
  formatUnnamedCamera: (indexOneBased: number) => string;
  adminUiStrings: AdminUiStrings;
  gateAccessUiStrings: GateAccessUiStrings;
  consentModalStrings: ConsentModalStrings;
};

/**
 * UI-facing runtime derived from org config only (no `import.meta` here — pass `isDev` explicitly).
 */
function cameraMessage(cfg: GateUiConfigSlice, code: CameraErrorCode): string {
  switch (code) {
    case 'permission-denied':
      return cfg.ui.strings.cameraPermissionDenied;
    case 'no-device':
      return cfg.ui.strings.cameraNoDevice;
    case 'unknown':
      return cfg.ui.strings.cameraUnknownError;
    case 'camera-stopped':
      return '';
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

function adminStringsFromConfig(cfg: GateUiConfigSlice): AdminUiStrings {
  const s = cfg.ui.strings;
  return {
    loginHeading: s.adminLoginHeading,
    loginUsername: s.adminLoginUsername,
    loginPassword: s.adminLoginPassword,
    loginSubmit: s.adminLoginSubmit,
    loginError: s.adminLoginError,
    logout: s.adminLogout,
    rosterTitle: s.rosterTitle,
    rosterColPhoto: s.rosterColPhoto,
    rosterColName: s.rosterColName,
    rosterColRole: s.rosterColRole,
    rosterColCreated: s.rosterColCreated,
    rosterColActions: s.rosterColActions,
    rosterEdit: s.rosterEdit,
    rosterDelete: s.rosterDelete,
    rosterThumbnailAlt: s.rosterThumbnailAlt,
    rosterBulkImport: s.rosterBulkImport,
    rosterImportPick: s.rosterImportPick,
    rosterImportConfirmDuplicates: s.rosterImportConfirmDuplicates,
    rosterImportProgress: s.rosterImportProgress,
    rosterImportDone: s.rosterImportDone,
    rosterDeleteConfirm: s.rosterDeleteConfirm,
    enrollTitle: s.enrollTitle,
    enrollStartCamera: s.enrollStartCamera,
    enrollCapture: s.enrollCapture,
    enrollRetake: s.enrollRetake,
    enrollSave: s.enrollSave,
    enrollNameLabel: s.enrollNameLabel,
    enrollRoleLabel: s.enrollRoleLabel,
    enrollRolePlaceholder: s.enrollRolePlaceholder,
    enrollRoleRequired: s.enrollRoleRequired,
    enrollRoleLegacySuffix: s.enrollRoleLegacySuffix,
    enrollSuccess: s.enrollSuccess,
    enrollNameRequired: s.enrollNameRequired,
    cameraDefaultDeviceOption: s.cameraDefaultDeviceOption,
    cameraSelectAriaLabel: s.cameraSelectAriaLabel,
    cameraUnnamedFormat: (i: number) => s.cameraUnnamedFormat.replaceAll('{n}', String(i)),
  };
}

/* eslint-disable max-lines-per-function -- single runtime slice factory */
export function createGateUiRuntimeSlice(
  cfg: GateUiConfigSlice,
  isDev: boolean,
): GateUiRuntimeSlice {
  const orgName = cfg.org.name;
  const s = cfg.ui.strings;
  return {
    orgName,
    orgTagline: cfg.org.tagline,
    gatePageTitle: `${orgName} — Entry`,
    adminPageTitle: `${orgName} — Admin`,
    logPageTitle: `${orgName} — Entry log`,
    logPageStrings: {
      unknown: s.unknown,
      logExportCsv: s.logExportCsv,
    },
    previewCanvasWidth: cfg.camera.idealWidth,
    previewCanvasHeight: cfg.camera.idealHeight,
    showFpsOverlay: isDev,
    devLogEmbeddingTimings: cfg.devLogEmbeddingTimings,
    defaultVideoConstraintsForCamera: {
      idealWidth: cfg.camera.idealWidth,
      idealHeight: cfg.camera.idealHeight,
      facingMode: cfg.camera.defaultFacingMode,
    },
    getCameraUserFacingMessage(code: CameraErrorCode): string {
      return cameraMessage(cfg, code);
    },
    cameraStartLabel: s.cameraStart,
    cameraStopLabel: s.cameraStop,
    detectorLoadingMessage: s.detectorLoading,
    detectorLoadFailedMessage: s.detectorLoadFailed,
    modelLoadStageDetectorLabel: s.modelLoadStageDetector,
    modelLoadStageEmbedderLabel: s.modelLoadStageEmbedder,
    modelLoadRetryLabel: s.modelLoadRetry,
    noFaceMessage: s.noFace,
    multiFaceMessage: s.multiFace,
    cameraDefaultDeviceOption: s.cameraDefaultDeviceOption,
    cameraSelectAriaLabel: s.cameraSelectAriaLabel,
    formatUnnamedCamera(i: number) {
      return s.cameraUnnamedFormat.replaceAll('{n}', String(i));
    },
    adminUiStrings: adminStringsFromConfig(cfg),
    gateAccessUiStrings: {
      formatGranted(name, similarityPct) {
        return s.accessGrantedBanner
          .replaceAll('{name}', name)
          .replaceAll('{similarity}', String(similarityPct));
      },
      formatDenied(similarityPct) {
        return s.accessDeniedBanner
          .replaceAll('{unknown}', s.unknown)
          .replaceAll('{similarity}', String(similarityPct));
      },
      tryAgain: s.accessTryAgain,
    },
    consentModalStrings: {
      title: s.consentTitle,
      intro: s.consentIntro,
      bullets: [
        s.consentBulletPurpose,
        s.consentBulletStored,
        s.consentBulletRetention,
        s.consentBulletRefuse,
      ],
      accept: s.consentAccept,
      decline: s.consentDecline,
    },
  };
}
/* eslint-enable max-lines-per-function */

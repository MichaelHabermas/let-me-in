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
  enrollTitle: string;
  enrollStartCamera: string;
  enrollCapture: string;
  enrollRetake: string;
  enrollSave: string;
  enrollNameLabel: string;
  enrollRoleLabel: string;
  enrollSuccess: string;
  enrollNameRequired: string;
};

export type GateUiRuntimeSlice = {
  orgName: string;
  orgTagline: string;
  gatePageTitle: string;
  adminPageTitle: string;
  logPageTitle: string;
  previewCanvasWidth: number;
  previewCanvasHeight: number;
  showFpsOverlay: boolean;
  devLogEmbeddingTimings: boolean;
  getDefaultVideoConstraintsForCamera(): {
    idealWidth: number;
    idealHeight: number;
    facingMode: string;
  };
  getCameraUserFacingMessage(code: CameraErrorCode): string;
  getCameraStartLabel(): string;
  getCameraStopLabel(): string;
  getDetectorLoadingMessage(): string;
  getDetectorLoadFailedMessage(): string;
  getNoFaceMessage(): string;
  getMultiFaceMessage(): string;
  getAdminUiStrings(): AdminUiStrings;
  getGateAccessUiStrings(): GateAccessUiStrings;
  getConsentModalStrings(): ConsentModalStrings;
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
    enrollTitle: s.enrollTitle,
    enrollStartCamera: s.enrollStartCamera,
    enrollCapture: s.enrollCapture,
    enrollRetake: s.enrollRetake,
    enrollSave: s.enrollSave,
    enrollNameLabel: s.enrollNameLabel,
    enrollRoleLabel: s.enrollRoleLabel,
    enrollSuccess: s.enrollSuccess,
    enrollNameRequired: s.enrollNameRequired,
  };
}

export function createGateUiRuntimeSlice(
  cfg: GateUiConfigSlice,
  isDev: boolean,
): GateUiRuntimeSlice {
  const orgName = cfg.org.name;
  return {
    orgName,
    orgTagline: cfg.org.tagline,
    gatePageTitle: `${orgName} — Entry`,
    adminPageTitle: `${orgName} — Admin`,
    logPageTitle: `${orgName} — Entry log`,
    previewCanvasWidth: cfg.camera.idealWidth,
    previewCanvasHeight: cfg.camera.idealHeight,
    showFpsOverlay: isDev,
    devLogEmbeddingTimings: cfg.devLogEmbeddingTimings,
    getDefaultVideoConstraintsForCamera() {
      return {
        idealWidth: cfg.camera.idealWidth,
        idealHeight: cfg.camera.idealHeight,
        facingMode: cfg.camera.defaultFacingMode,
      };
    },
    getCameraUserFacingMessage(code: CameraErrorCode): string {
      return cameraMessage(cfg, code);
    },
    getCameraStartLabel(): string {
      return cfg.ui.strings.cameraStart;
    },
    getCameraStopLabel(): string {
      return cfg.ui.strings.cameraStop;
    },
    getDetectorLoadingMessage(): string {
      return cfg.ui.strings.detectorLoading;
    },
    getDetectorLoadFailedMessage(): string {
      return cfg.ui.strings.detectorLoadFailed;
    },
    getNoFaceMessage(): string {
      return cfg.ui.strings.noFace;
    },
    getMultiFaceMessage(): string {
      return cfg.ui.strings.multiFace;
    },
    getAdminUiStrings(): AdminUiStrings {
      return adminStringsFromConfig(cfg);
    },
    getGateAccessUiStrings(): GateAccessUiStrings {
      const s = cfg.ui.strings;
      return {
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
      };
    },
    getConsentModalStrings(): ConsentModalStrings {
      const s = cfg.ui.strings;
      return {
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
      };
    },
  };
}

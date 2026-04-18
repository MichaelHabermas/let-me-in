import type { Config } from '../config';
import type { CameraErrorCode } from '../infra/camera';

/** Config fields needed for titles, preview layout, and camera UX strings. */
export type GateUiConfigSlice = Pick<Config, 'org' | 'camera' | 'ui'>;

export type GateUiRuntimeSlice = {
  orgName: string;
  gatePageTitle: string;
  adminPageTitle: string;
  logPageTitle: string;
  previewCanvasWidth: number;
  previewCanvasHeight: number;
  showFpsOverlay: boolean;
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
};

/**
 * UI-facing runtime derived from org config only (no `import.meta` here — pass `isDev` explicitly).
 */
export function createGateUiRuntimeSlice(
  cfg: GateUiConfigSlice,
  isDev: boolean,
): GateUiRuntimeSlice {
  const orgName = cfg.org.name;
  return {
    orgName,
    gatePageTitle: `${orgName} — Entry`,
    adminPageTitle: `${orgName} — Admin`,
    logPageTitle: `${orgName} — Entry log`,
    previewCanvasWidth: cfg.camera.idealWidth,
    previewCanvasHeight: cfg.camera.idealHeight,
    showFpsOverlay: isDev,
    getDefaultVideoConstraintsForCamera() {
      return {
        idealWidth: cfg.camera.idealWidth,
        idealHeight: cfg.camera.idealHeight,
        facingMode: cfg.camera.defaultFacingMode,
      };
    },
    getCameraUserFacingMessage(code: CameraErrorCode): string {
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
  };
}

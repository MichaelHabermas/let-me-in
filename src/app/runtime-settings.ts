/**
 * Single app boundary for org/runtime values derived from config and env.
 * UI and bootstrap read `resolveGateRuntime()`; do not use `import.meta.env` in UI for flags.
 */

import { config } from '../config';
import type { CameraErrorCode } from '../infra/camera';
import type { DatabaseSeedSettings } from '../infra/persistence';

export type GateRuntime = {
  orgName: string;
  gatePageTitle: string;
  adminPageTitle: string;
  logPageTitle: string;
  previewCanvasWidth: number;
  previewCanvasHeight: number;
  /** Dev-only FPS overlay on gate preview (maps `import.meta.env.DEV`). */
  showFpsOverlay: boolean;
  getDatabaseSeedSettings(): DatabaseSeedSettings;
  getDefaultVideoConstraintsForCamera(): {
    idealWidth: number;
    idealHeight: number;
    facingMode: string;
  };
  getCameraUserFacingMessage(code: CameraErrorCode): string;
  getCameraStartLabel(): string;
  getCameraStopLabel(): string;
};

export function resolveGateRuntime(): GateRuntime {
  const orgName = config.org.name;
  return {
    orgName,
    gatePageTitle: `${orgName} — Entry`,
    adminPageTitle: `${orgName} — Admin`,
    logPageTitle: `${orgName} — Entry log`,
    previewCanvasWidth: config.camera.idealWidth,
    previewCanvasHeight: config.camera.idealHeight,
    showFpsOverlay: Boolean(import.meta.env.DEV),
    getDatabaseSeedSettings(): DatabaseSeedSettings {
      return { thresholds: { ...config.thresholds }, cooldownMs: config.cooldownMs };
    },
    getDefaultVideoConstraintsForCamera() {
      return {
        idealWidth: config.camera.idealWidth,
        idealHeight: config.camera.idealHeight,
        facingMode: config.camera.defaultFacingMode,
      };
    },
    getCameraUserFacingMessage(code: CameraErrorCode): string {
      switch (code) {
        case 'permission-denied':
          return config.ui.strings.cameraPermissionDenied;
        case 'no-device':
          return config.ui.strings.cameraNoDevice;
        case 'unknown':
          return config.ui.strings.cameraUnknownError;
        case 'camera-stopped':
          return '';
        default: {
          const _exhaustive: never = code;
          return _exhaustive;
        }
      }
    },
    getCameraStartLabel(): string {
      return config.ui.strings.cameraStart;
    },
    getCameraStopLabel(): string {
      return config.ui.strings.cameraStop;
    },
  };
}

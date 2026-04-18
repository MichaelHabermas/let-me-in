/**
 * UI layer may import only from `app/*`. Re-exports org-facing copy from config.
 */

import type { CameraErrorCode } from '../infra/contracts';
import { config } from '../config';

export function getOrgName(): string {
  return config.org.name;
}

export function getGatePageTitle(): string {
  return `${config.org.name} — Entry`;
}

export function getAdminPageTitle(): string {
  return `${config.org.name} — Admin`;
}

export function getLogPageTitle(): string {
  return `${config.org.name} — Entry log`;
}

export function getDefaultVideoConstraintsForCamera(): {
  idealWidth: number;
  idealHeight: number;
  facingMode: string;
} {
  return {
    idealWidth: config.camera.idealWidth,
    idealHeight: config.camera.idealHeight,
    facingMode: config.camera.defaultFacingMode,
  };
}

export function getCameraUserFacingMessage(code: CameraErrorCode): string {
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
}

export function getCameraStartLabel(): string {
  return config.ui.strings.cameraStart;
}

export function getCameraStopLabel(): string {
  return config.ui.strings.cameraStop;
}

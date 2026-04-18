/**
 * UI-facing entry for camera — re-exports infra so `src/ui/*` never imports `infra/*` (PRD §2.2).
 */

export { createCamera } from '../infra/contracts';

export type {
  Camera,
  CameraBrowserDeps,
  CameraError,
  CameraErrorCode,
  CameraStartOptions,
  CreateCameraOptions,
  DefaultVideoConstraints,
} from '../infra/contracts';

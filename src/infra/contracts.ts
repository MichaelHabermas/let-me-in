/**
 * Dependency-inversion surface: app and UI import from here, not from dexie/onnx directly.
 */

export type { BboxPixels, Decision, MatchResult, User, AccessLogRow } from './types';

export {
  accessLogRepo,
  initDatabase,
  resetIndexedDbClientForTests,
  settingsRepo,
  usersRepo,
} from './db-dexie';

export type { DatabaseSeedSettings, SettingsRow } from './db-dexie';

export type {
  Camera,
  CameraBrowserDeps,
  CameraError,
  CameraErrorCode,
  CameraStartOptions,
  CreateCameraOptions,
  DefaultVideoConstraints,
  ErrorCallback,
  FrameCallback,
  Unsubscribe,
} from './camera';

export { createCamera } from './camera';

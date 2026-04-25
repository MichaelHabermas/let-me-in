import type { Camera, CameraStartOptions, DefaultVideoConstraints } from '../camera';
import type { User } from '../../domain/types';
import type { DexiePersistence } from '../../infra/persistence';
import type { ModelLoadStatusController } from '../model-load-status-ui';
import type { FaceEmbedder } from '../../infra/embedder-ort';
import type { YoloDetector } from '../../infra/detector-core';
import type { EnrollState } from './enroll-fsm';

export type EnrollmentControllerOptions = {
  camera: Camera;
  detector: YoloDetector;
  embedder: FaceEmbedder;
  video: HTMLVideoElement;
  frameCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  statusEl: HTMLElement;
  getNoFaceMessage: () => string;
  getMultiFaceMessage: () => string;
  persistence: DexiePersistence;
  onStateChange?: (s: EnrollState) => void;
  modelLoadUi?: ModelLoadStatusController;
  /** Shown with Retry when `modelLoadUi` is set. */
  modelLoadFailedMessage?: string;
  /** E12: same basis as `createCamera({ defaultConstraints })` for start + stale recovery. */
  defaultVideoConstraints: DefaultVideoConstraints;
  getCameraStartOptions?: () => CameraStartOptions;
  onAfterCameraStart?: (camera: Camera) => void | Promise<void>;
  onRecoverStaleEnrollDevice?: (fallbackFacing: string) => void | Promise<void>;
};

export type EnrollmentController = {
  getState(): EnrollState;
  /** Load an existing user for name/role edits and optional re-capture (idle only). */
  beginEditFromUser(user: User): void;
  isCameraRunning(): boolean;
  startSession(): Promise<void>;
  stopSession(): void;
  captureFace(): Promise<boolean>;
  retake(): void;
  saveUser(name: string, role: string): Promise<void>;
  dispose(): void;
};

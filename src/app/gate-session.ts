import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { CameraErrorCode } from '../infra/camera';
import type { YoloDetector } from '../infra/detector-core';
import type { FaceEmbedder } from '../infra/embedder-ort';
import type { DexiePersistence } from '../infra/persistence';
import type { Camera, CreateCameraOptions } from './camera';
import type { GateAccessUiStrings } from './gate-access-ui-controller';
import type { EvaluateGateAccessFn } from './gate-access-evaluation';
import { maybeMountFpsOverlay } from './gate-fps-overlay';
import { wireCameraControls } from './gate-session-orchestrator';
import type { AppendAccessLogFn } from './detection-pipeline';

export type GatePreviewSessionDeps = {
  createCamera: (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    options: CreateCameraOptions,
  ) => Camera;
  getDefaultVideoConstraintsForCamera: () => CreateCameraOptions['defaultConstraints'];
  getCameraUserFacingMessage: (code: CameraErrorCode) => string;
  yoloDetector?: YoloDetector;
  faceEmbedder?: FaceEmbedder;
  /** When true, logs `[gate] embed: …` from the detection pipeline (see `config.devLogEmbeddingTimings`). */
  logEmbeddingTimings?: boolean;
  detectorLoadingMessage: string;
  detectorLoadFailedMessage: string;
  noFaceMessage: string;
  multiFaceMessage: string;
  cooldownMs: number;
  evaluateDecision?: EvaluateGateAccessFn;
  appendAccessLog?: AppendAccessLogFn;
  accessUiStrings?: GateAccessUiStrings;
  /** When set with `databaseSeedFallback`, live access loads users/thresholds before the pipeline starts. */
  persistence?: DexiePersistence;
  /** Defaults for settings rows when DB was only seeded minimally. */
  databaseSeedFallback?: DatabaseSeedSettings;
};

export type GatePreviewElements = {
  cameraToggleBtn: HTMLButtonElement;
  statusEl: HTMLElement;
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  overlayCanvas?: HTMLCanvasElement;
  /** Live access result (`#decision`); optional for tests that omit DOM shell. */
  decisionEl?: HTMLElement;
};

/**
 * Wires camera preview, toolbar, status, optional FPS overlay, optional YOLO pipeline, teardown.
 */
export function wireGatePreviewSession(
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
  options?: { showFpsOverlay?: boolean },
): () => void {
  const { statusEl, previewWrap, video, canvas } = elements;
  const camera = deps.createCamera(video, canvas, {
    defaultConstraints: deps.getDefaultVideoConstraintsForCamera(),
  });

  camera.onError((err) => {
    const msg = deps.getCameraUserFacingMessage(err.code);
    if (msg) statusEl.textContent = msg;
  });

  const unsubFps = maybeMountFpsOverlay(camera, previewWrap, options?.showFpsOverlay ?? false);
  const stopControls = wireCameraControls(camera, elements, deps);

  return () => {
    stopControls();
    unsubFps();
    void deps.yoloDetector?.dispose();
    void deps.faceEmbedder?.dispose();
    camera.stop();
  };
}

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
import type { ModelLoadStatusController } from './model-load-status-ui';
import type { AppendAccessLogFn } from './detection-pipeline';

/** `createUserMedia` binding + per-brand camera error copy. */
export type GateSessionCameraFactoryDeps = {
  createCamera: (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    options: CreateCameraOptions,
  ) => Camera;
  getDefaultVideoConstraintsForCamera: () => CreateCameraOptions['defaultConstraints'];
  getCameraUserFacingMessage: (code: CameraErrorCode) => string;
};

/** YOLO + embedder handles (optional) and dev timing logs. */
export type GateSessionDetectorModelDeps = {
  yoloDetector?: YoloDetector;
  faceEmbedder?: FaceEmbedder;
  /** When true, logs `[gate] embed: …` from the detection pipeline (see `config.devLogEmbeddingTimings`). */
  logEmbeddingTimings?: boolean;
};

/**
 * Copy for model-load UI, pipeline status, and camera device list — no access policy.
 */
export type GateSessionPipelineMessageDeps = {
  detectorLoadingMessage: string;
  detectorLoadFailedMessage: string;
  modelLoadStageDetectorLabel: string;
  modelLoadStageEmbedderLabel: string;
  modelLoadRetryLabel: string;
  noFaceMessage: string;
  multiFaceMessage: string;
  cooldownMs: number;
  /** E12: first option label for the gate camera `<select>`. */
  cameraDefaultDeviceOption: string;
  cameraSelectAriaLabel: string;
  formatUnnamedCamera: (indexOneBased: number) => string;
};

/** Optional live access, logging, and DB (composed at mount). */
export type GateAccessOptionDeps = {
  evaluateDecision?: EvaluateGateAccessFn;
  appendAccessLog?: AppendAccessLogFn;
  accessUiStrings?: GateAccessUiStrings;
  /** When set with `databaseSeedFallback`, live access loads users/thresholds before the pipeline starts. */
  persistence?: DexiePersistence;
  /** Defaults for settings rows when DB was only seeded minimally. */
  databaseSeedFallback?: DatabaseSeedSettings;
};

export type GatePreviewSessionDeps = GateSessionCameraFactoryDeps &
  GateSessionDetectorModelDeps &
  GateSessionPipelineMessageDeps &
  GateAccessOptionDeps;

export type GatePreviewElements = {
  cameraToggleBtn: HTMLButtonElement;
  statusEl: HTMLElement;
  /** E11 progress + retry; optional for unit tests. */
  modelLoadUi?: ModelLoadStatusController;
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  overlayCanvas?: HTMLCanvasElement;
  /** Live access result (`#decision`); optional for tests that omit DOM shell. */
  decisionEl?: HTMLElement;
  /** E12: when set with persistence, populates from `enumerateDevices` after the first stream. */
  cameraDeviceSelect?: HTMLSelectElement;
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

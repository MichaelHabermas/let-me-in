import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { CameraErrorCode } from '../infra/camera';
import type { YoloDetector } from '../infra/detector-core';
import type { FaceEmbedder } from '../infra/embedder-ort';
import type { DexiePersistence } from '../infra/persistence';
import type { Camera, CreateCameraOptions } from './camera';
import {
  createGateAccessUiController,
  FALLBACK_GATE_ACCESS_UI_STRINGS,
  type GateAccessUiStrings,
} from './gate-access-ui-controller';
import { createDetectorPipelineCoordinator } from './gate-detector-coordinator';
import type { AppendAccessLogFn } from './pipeline';
import { loadLiveAccessDecisionFn } from './gate-live-access';

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
  evaluateDecision?: import('./gate-access-evaluation').EvaluateGateAccessFn;
  appendAccessLog?: AppendAccessLogFn;
  accessUiStrings?: GateAccessUiStrings;
  /** When set with `databaseSeedFallback`, live access loads users/thresholds before the pipeline starts. */
  persistence?: DexiePersistence;
  /** Defaults for settings rows when DB was only seeded minimally. */
  databaseSeedFallback?: DatabaseSeedSettings;
};

export type GatePreviewElements = {
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  statusEl: HTMLElement;
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  overlayCanvas?: HTMLCanvasElement;
  /** Live access result (`#decision`); optional for tests that omit DOM shell. */
  decisionEl?: HTMLElement;
};

function wireCameraControls(
  camera: Camera,
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
): () => void {
  const { startBtn, stopBtn, statusEl } = elements;
  const loadingMsg = deps.detectorLoadingMessage;
  const failedMsg = deps.detectorLoadFailedMessage;
  const coord = createDetectorPipelineCoordinator({ elements, camera, statusEl });
  coord.beginModelLoad(deps, loadingMsg, failedMsg);

  const onStart = async () => {
    startBtn.disabled = true;
    try {
      if (!(await coord.waitReady(deps, loadingMsg))) {
        startBtn.disabled = false;
        return;
      }
      statusEl.textContent = '';

      let attachDeps = deps;
      if (!deps.evaluateDecision && deps.persistence && deps.databaseSeedFallback) {
        const uiStrings = deps.accessUiStrings ?? FALLBACK_GATE_ACCESS_UI_STRINGS;
        const accessUi =
          elements.decisionEl && createGateAccessUiController(elements.decisionEl, uiStrings);
        const evaluateDecision = await loadLiveAccessDecisionFn(
          deps.persistence,
          deps.databaseSeedFallback,
          accessUi
            ? {
                onDecision: (ev) => accessUi.present(ev),
              }
            : undefined,
        );
        const appendAccessLog: AppendAccessLogFn | undefined =
          deps.appendAccessLog ??
          ((p) => deps.persistence!.accessLogRepo.appendDecision(p));
        attachDeps = { ...deps, evaluateDecision, appendAccessLog };
      }

      await camera.start();
      stopBtn.disabled = false;
      coord.attachRunningPipeline(attachDeps);
    } catch {
      startBtn.disabled = false;
    }
  };

  startBtn.addEventListener('click', () => {
    void onStart();
  });

  stopBtn.addEventListener('click', () => {
    coord.stopPipeline();
    camera.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  return () => {
    coord.stopPipeline();
  };
}

function maybeMountFpsOverlay(camera: Camera, host: HTMLElement, enabled: boolean): () => void {
  if (!enabled) return () => {};

  const fpsEl = document.createElement('div');
  fpsEl.id = 'fps';
  fpsEl.className = 'gate-preview__fps';
  host.appendChild(fpsEl);

  let lastTs = 0;
  const rolling: number[] = [];

  return camera.onFrame((ts) => {
    if (lastTs > 0) {
      const dt = ts - lastTs;
      if (dt > 0) rolling.push(1000 / dt);
      if (rolling.length > 30) rolling.shift();
      const avg = rolling.reduce((a, b) => a + b, 0) / rolling.length;
      fpsEl.textContent = `${avg.toFixed(1)} FPS`;
    }
    lastTs = ts;
  });
}

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

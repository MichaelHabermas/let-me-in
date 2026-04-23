import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { CameraErrorCode } from '../infra/camera';
import type { YoloDetector } from '../infra/detector-core';
import type { FaceEmbedder } from '../infra/embedder-ort';
import type { DexiePersistence } from '../infra/persistence';
import type { Camera, CreateCameraOptions } from './camera';
import { createAccessAudioCues } from './audio';
import {
  createGateAccessUiController,
  FALLBACK_GATE_ACCESS_UI_STRINGS,
  type GateAccessUiStrings,
} from './gate-access-ui-controller';
import type { EvaluateGateAccessFn } from './gate-access-evaluation';
import { createDetectorPipelineCoordinator } from './gate-detector-coordinator';
import { loadLiveAccessDecisionFn } from './gate-live-access';
import type { AppendAccessLogFn } from './pipeline';

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

function readCameraToggleLabels(btn: HTMLButtonElement): { start: string; stop: string } {
  return {
    start: btn.dataset.labelStart ?? 'Start camera',
    stop: btn.dataset.labelStop ?? 'Stop camera',
  };
}

function syncCameraToggleUi(btn: HTMLButtonElement, mode: 'idle' | 'loading' | 'running'): void {
  const { start, stop } = readCameraToggleLabels(btn);
  if (mode === 'running') {
    btn.textContent = stop;
    btn.dataset.cameraState = 'running';
    btn.setAttribute('aria-label', stop);
    btn.disabled = false;
  } else if (mode === 'loading') {
    btn.textContent = start;
    btn.dataset.cameraState = 'idle';
    btn.setAttribute('aria-label', start);
    btn.disabled = true;
  } else {
    btn.textContent = start;
    btn.dataset.cameraState = 'idle';
    btn.setAttribute('aria-label', start);
    btn.disabled = false;
  }
}

function wireCameraControls(
  camera: Camera,
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
): () => void {
  const { cameraToggleBtn, statusEl } = elements;
  const loadingMsg = deps.detectorLoadingMessage;
  const failedMsg = deps.detectorLoadFailedMessage;
  const coord = createDetectorPipelineCoordinator({ elements, camera, statusEl });
  coord.beginModelLoad(deps, loadingMsg, failedMsg);

  const onStart = async () => {
    syncCameraToggleUi(cameraToggleBtn, 'loading');
    try {
      if (!(await coord.waitReady(deps, loadingMsg))) {
        syncCameraToggleUi(cameraToggleBtn, 'idle');
        return;
      }
      statusEl.textContent = '';

      let attachDeps = deps;
      if (!deps.evaluateDecision && deps.persistence && deps.databaseSeedFallback) {
        const uiStrings = deps.accessUiStrings ?? FALLBACK_GATE_ACCESS_UI_STRINGS;
        const accessUi =
          elements.decisionEl && createGateAccessUiController(elements.decisionEl, uiStrings);
        const audioCues = createAccessAudioCues();
        const evaluateDecision = await loadLiveAccessDecisionFn(
          deps.persistence,
          deps.databaseSeedFallback,
          {
            onDecision: (ev) => {
              accessUi?.present(ev);
              audioCues.play(ev.policy.decision);
            },
          },
        );
        const appendAccessLog: AppendAccessLogFn | undefined =
          deps.appendAccessLog ?? ((p) => deps.persistence!.accessLogRepo.appendDecision(p));
        attachDeps = { ...deps, evaluateDecision, appendAccessLog };
      }

      await camera.start();
      coord.attachRunningPipeline(attachDeps);
      syncCameraToggleUi(cameraToggleBtn, 'running');
    } catch {
      syncCameraToggleUi(cameraToggleBtn, 'idle');
    }
  };

  cameraToggleBtn.addEventListener('click', () => {
    if (camera.isRunning()) {
      coord.stopPipeline();
      camera.stop();
      syncCameraToggleUi(cameraToggleBtn, 'idle');
    } else {
      void onStart();
    }
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

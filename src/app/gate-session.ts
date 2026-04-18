import type { CameraErrorCode } from '../infra/camera';
import type { YoloDetector } from '../infra/detector-core';
import type { Camera, CreateCameraOptions } from './camera';
import {
  attachPipeline,
  beginDetectorLoad,
  waitForDetectorReady,
  type DetectorGateState,
} from './gate-detector-coordinator';

export type GatePreviewSessionDeps = {
  createCamera: (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    options: CreateCameraOptions,
  ) => Camera;
  getDefaultVideoConstraintsForCamera: () => CreateCameraOptions['defaultConstraints'];
  getCameraUserFacingMessage: (code: CameraErrorCode) => string;
  yoloDetector?: YoloDetector;
  detectorLoadingMessage?: string;
  detectorLoadFailedMessage?: string;
  /** Injected for tests; defaults to `setTimeout` delay. */
  sleep?: (ms: number) => Promise<void>;
};

export type GatePreviewElements = {
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  statusEl: HTMLElement;
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  overlayCanvas?: HTMLCanvasElement;
};

function wireCameraControls(
  camera: Camera,
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
): () => void {
  const { startBtn, stopBtn, statusEl } = elements;
  const loadingMsg = deps.detectorLoadingMessage ?? 'Loading face detector…';
  const failedMsg =
    deps.detectorLoadFailedMessage ?? 'Face detector could not load. Try refreshing.';
  const state: DetectorGateState = { loadState: deps.yoloDetector ? 'pending' : 'none' };
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  beginDetectorLoad({ deps, camera, statusEl, state, loadingMsg, failedMsg });

  const onStart = async () => {
    startBtn.disabled = true;
    try {
      if (!(await waitForDetectorReady({ deps, statusEl, state, loadingMsg, failedMsg, sleep }))) {
        startBtn.disabled = false;
        return;
      }
      statusEl.textContent = '';
      await camera.start();
      stopBtn.disabled = false;
      attachPipeline({ camera, deps, elements, state });
    } catch {
      startBtn.disabled = false;
    }
  };

  startBtn.addEventListener('click', () => {
    void onStart();
  });

  stopBtn.addEventListener('click', () => {
    state.stopPipeline?.();
    state.stopPipeline = undefined;
    camera.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  return () => {
    state.stopPipeline?.();
    state.stopPipeline = undefined;
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
    camera.stop();
  };
}

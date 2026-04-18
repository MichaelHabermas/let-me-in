import type { CameraErrorCode } from '../infra/camera';
import type { Camera, CreateCameraOptions } from './camera';

export type GatePreviewSessionDeps = {
  createCamera: (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    options: CreateCameraOptions,
  ) => Camera;
  getDefaultVideoConstraintsForCamera: () => CreateCameraOptions['defaultConstraints'];
  getCameraUserFacingMessage: (code: CameraErrorCode) => string;
};

export type GatePreviewElements = {
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  statusEl: HTMLElement;
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
};

function wireCameraControls(
  camera: Camera,
  startBtn: HTMLButtonElement,
  stopBtn: HTMLButtonElement,
  statusEl: HTMLElement,
): void {
  startBtn.addEventListener('click', async () => {
    statusEl.textContent = '';
    startBtn.disabled = true;
    try {
      await camera.start();
      stopBtn.disabled = false;
    } catch {
      startBtn.disabled = false;
    }
  });

  stopBtn.addEventListener('click', () => {
    camera.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });
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
 * Wires camera preview, toolbar, status, optional FPS overlay, and unload teardown.
 * Returns teardown (stop camera, unsubscribe FPS) for tests or duplicate-safe unload.
 */
export function wireGatePreviewSession(
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
  options?: { showFpsOverlay?: boolean },
): () => void {
  const { startBtn, stopBtn, statusEl, previewWrap, video, canvas } = elements;
  const camera = deps.createCamera(video, canvas, {
    defaultConstraints: deps.getDefaultVideoConstraintsForCamera(),
  });

  camera.onError((err) => {
    const msg = deps.getCameraUserFacingMessage(err.code);
    if (msg) statusEl.textContent = msg;
  });

  const unsubFps = maybeMountFpsOverlay(camera, previewWrap, options?.showFpsOverlay ?? false);
  wireCameraControls(camera, startBtn, stopBtn, statusEl);

  return () => {
    unsubFps();
    camera.stop();
  };
}

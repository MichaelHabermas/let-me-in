import { getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import type { YoloDetector } from '../infra/detector-core';
import { createYoloDetector } from '../infra/detector-ort';
import { createFaceEmbedder, type FaceEmbedder } from '../infra/embedder-ort';
import type { Camera, CreateCameraOptions } from './camera';
import { createCamera } from './camera';
import { buildGateDom } from './gate-preview-dom';
import { wireGatePreviewSession } from './gate-session';
import type { GateRuntime } from './runtime-settings';
import { resolveGateRuntime } from './runtime-settings';

export type MountGateHostDeps = {
  rt: GateRuntime;
  createCamera: (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    options: CreateCameraOptions,
  ) => Camera;
  wireGatePreviewSession: typeof wireGatePreviewSession;
  createYoloDetector?: () => YoloDetector;
  createFaceEmbedder?: () => FaceEmbedder;
  /** When true (default), register `beforeunload` teardown like production. */
  addBeforeUnload?: boolean;
};

/**
 * Mount the gate UI into an existing host (tests inject `#app` or a detached div).
 * Returns teardown (stop camera, remove listeners) — also registered on `beforeunload` when enabled.
 */
export function mountGateIntoHost(host: HTMLElement, deps: MountGateHostDeps): () => void {
  const {
    rt,
    createCamera: createCam,
    wireGatePreviewSession: wireSession,
    createYoloDetector: createDet = () => createYoloDetector(getDetectorRuntimeSettings()),
    createFaceEmbedder: createEmb = () => createFaceEmbedder(getEmbedderRuntimeSettings()),
    addBeforeUnload = true,
  } = deps;

  document.title = rt.gatePageTitle;
  host.innerHTML = '';

  const { main, startBtn, stopBtn, statusEl, previewWrap, video, canvas, overlayCanvas } =
    buildGateDom(rt);
  host.appendChild(main);

  const yoloDetector = createDet();
  const faceEmbedder = createEmb();

  const teardown = wireSession(
    { startBtn, stopBtn, statusEl, previewWrap, video, canvas, overlayCanvas },
    {
      createCamera: createCam,
      getDefaultVideoConstraintsForCamera: () => rt.getDefaultVideoConstraintsForCamera(),
      getCameraUserFacingMessage: (code) => rt.getCameraUserFacingMessage(code),
      yoloDetector,
      faceEmbedder,
      logEmbeddingTimings: rt.devLogEmbeddingTimings,
      detectorLoadingMessage: rt.getDetectorLoadingMessage(),
      detectorLoadFailedMessage: rt.getDetectorLoadFailedMessage(),
    },
    { showFpsOverlay: rt.showFpsOverlay },
  );

  if (addBeforeUnload) {
    window.addEventListener('beforeunload', teardown, { once: true });
  }

  return teardown;
}

export function mountGateView(): void {
  const app = document.getElementById('app');
  if (!app) return;

  mountGateIntoHost(app, {
    rt: resolveGateRuntime(),
    createCamera,
    wireGatePreviewSession,
  });
}

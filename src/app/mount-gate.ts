import { getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import type { YoloDetector } from '../infra/detector-core';
import { createYoloDetector } from '../infra/detector-ort';
import { createFaceEmbedder, type FaceEmbedder } from '../infra/embedder-ort';
import { getDefaultPersistence } from '../infra/persistence';
import type { Camera, CreateCameraOptions } from './camera';
import { createCamera } from './camera';
import { buildGateDom } from './gate-preview-dom';
import { bootstrapGateConsentIfNeeded } from './gate-consent-bootstrap';
import { buildGatePreviewSessionDeps } from './gate-preview-session-deps';
import { wireGatePreviewSession, type GatePreviewSessionDeps } from './gate-session';
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
  /** Merged into `buildGatePreviewSessionDeps` (e.g. `persistence`, `evaluateDecision`). */
  sessionDepsExtras?: Partial<GatePreviewSessionDeps>;
};

/**
 * Mount the gate UI into an existing host (tests inject `#app` or a detached div).
 * Returns teardown (stop camera, remove listeners) — also registered on `beforeunload` when enabled.
 */
/** Composition-root helper: binds default detector/embedder factories to `get*RuntimeSettings()`. */
export function createMountGateHostDeps(
  rt: GateRuntime,
  overrides?: Partial<Omit<MountGateHostDeps, 'rt'>>,
): MountGateHostDeps {
  return {
    rt,
    createCamera: overrides?.createCamera ?? createCamera,
    wireGatePreviewSession: overrides?.wireGatePreviewSession ?? wireGatePreviewSession,
    createYoloDetector:
      overrides?.createYoloDetector ?? (() => createYoloDetector(getDetectorRuntimeSettings())),
    createFaceEmbedder:
      overrides?.createFaceEmbedder ?? (() => createFaceEmbedder(getEmbedderRuntimeSettings())),
    addBeforeUnload: overrides?.addBeforeUnload,
    sessionDepsExtras: overrides?.sessionDepsExtras,
  };
}

export function mountGateIntoHost(host: HTMLElement, deps: MountGateHostDeps): () => void {
  const {
    rt,
    createCamera: createCam,
    wireGatePreviewSession: wireSession,
    createYoloDetector: createDet = () => createYoloDetector(getDetectorRuntimeSettings()),
    createFaceEmbedder: createEmb = () => createFaceEmbedder(getEmbedderRuntimeSettings()),
    addBeforeUnload = true,
    sessionDepsExtras,
  } = deps;

  document.title = rt.gatePageTitle;
  host.innerHTML = '';

  const {
    main,
    startBtn,
    stopBtn,
    statusEl,
    previewWrap,
    video,
    canvas,
    overlayCanvas,
    decisionEl,
  } = buildGateDom(rt);
  host.appendChild(main);

  const persistence = sessionDepsExtras?.persistence;
  if (persistence) {
    startBtn.disabled = true;
    void bootstrapGateConsentIfNeeded({
      persistence,
      startBtn,
      shell: main,
      strings: rt.getConsentModalStrings(),
    });
  }

  const yoloDetector = createDet();
  const faceEmbedder = createEmb();

  const teardown = wireSession(
    {
      startBtn,
      stopBtn,
      statusEl,
      previewWrap,
      video,
      canvas,
      overlayCanvas,
      decisionEl,
    },
    buildGatePreviewSessionDeps(
      rt,
      { createCamera: createCam, yoloDetector, faceEmbedder },
      sessionDepsExtras,
    ),
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

  const rt = resolveGateRuntime();
  mountGateIntoHost(
    app,
    createMountGateHostDeps(rt, {
      sessionDepsExtras: {
        persistence: getDefaultPersistence(),
        databaseSeedFallback: rt.getDatabaseSeedSettings(),
      },
    }),
  );
}

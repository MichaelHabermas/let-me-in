import { getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import type { YoloDetector } from '../infra/detector-core';
import { createYoloDetector } from '../infra/detector-ort';
import { createFaceEmbedder, type FaceEmbedder } from '../infra/embedder-ort';
import { resolvePersistence } from '../infra/persistence';
import type { DexiePersistence, PersistenceProvider } from '../infra/persistence';
import type { Camera, CreateCameraOptions } from './camera';
import { createCamera } from './camera';
import { buildGateDom } from './gate-preview-dom';
import { bootstrapGateConsentIfNeeded } from './gate-consent-bootstrap';
import { wireGatePreviewSession, type GatePreviewSessionDeps } from './gate-session';
import type { GateRuntime } from './gate-runtime';
import { resolveGateRuntime } from './gate-runtime';

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

function maybeBootstrapConsent(
  persistence: GatePreviewSessionDeps['persistence'] | undefined,
  cameraToggleBtn: HTMLButtonElement,
  main: HTMLElement,
  rt: GateRuntime,
): void {
  if (!persistence) return;
  cameraToggleBtn.disabled = true;
  void bootstrapGateConsentIfNeeded({
    persistence,
    cameraToggleBtn,
    shell: main,
    strings: rt.consentModalStrings,
  });
}

function buildSessionDeps(
  rt: GateRuntime,
  createCam: MountGateHostDeps['createCamera'],
  yoloDetector: YoloDetector,
  faceEmbedder: FaceEmbedder,
  sessionDepsExtras: MountGateHostDeps['sessionDepsExtras'],
): GatePreviewSessionDeps {
  return {
    createCamera: createCam,
    yoloDetector,
    faceEmbedder,
    ...rt.gatePreviewSessionCoreDeps,
    accessUiStrings: rt.gateAccessUiStrings,
    ...sessionDepsExtras,
  };
}

export function mountGateIntoHost(host: HTMLElement, deps: MountGateHostDeps): () => void {
  const { rt } = deps;
  const createCam = deps.createCamera;
  const wireSession = deps.wireGatePreviewSession;
  const createDet =
    deps.createYoloDetector ?? (() => createYoloDetector(getDetectorRuntimeSettings()));
  const createEmb =
    deps.createFaceEmbedder ?? (() => createFaceEmbedder(getEmbedderRuntimeSettings()));
  const addBeforeUnload = deps.addBeforeUnload ?? true;
  const { sessionDepsExtras } = deps;
  document.title = rt.gatePageTitle;
  host.innerHTML = '';

  const { main, cameraToggleBtn, statusEl, previewWrap, video, canvas, overlayCanvas, decisionEl } =
    buildGateDom(rt);
  host.appendChild(main);
  maybeBootstrapConsent(sessionDepsExtras?.persistence, cameraToggleBtn, main, rt);
  const yoloDetector = createDet();
  const faceEmbedder = createEmb();
  const sessionDeps = buildSessionDeps(
    rt,
    createCam,
    yoloDetector,
    faceEmbedder,
    sessionDepsExtras,
  );
  const teardown = wireSession(
    {
      cameraToggleBtn,
      statusEl,
      previewWrap,
      video,
      canvas,
      overlayCanvas,
      decisionEl,
    },
    sessionDeps,
    { showFpsOverlay: rt.showFpsOverlay },
  );

  if (addBeforeUnload) {
    window.addEventListener('beforeunload', teardown, { once: true });
  }

  return teardown;
}

export type MountGateViewOptions = {
  hostDepsOverrides?: Partial<Omit<MountGateHostDeps, 'rt'>>;
  persistence?: DexiePersistence;
  persistenceProvider?: PersistenceProvider;
};

export function mountGateView(options?: MountGateViewOptions): void {
  const app = document.getElementById('app');
  if (!app) return;

  const rt = resolveGateRuntime();
  const persistence = resolvePersistence({
    persistence: options?.persistence,
    provider: options?.persistenceProvider,
  });
  mountGateIntoHost(
    app,
    createMountGateHostDeps(rt, {
      ...(options?.hostDepsOverrides ?? {}),
      sessionDepsExtras: {
        ...(options?.hostDepsOverrides?.sessionDepsExtras ?? {}),
        persistence,
        databaseSeedFallback: rt.databaseSeedSettings,
      },
    }),
  );
}

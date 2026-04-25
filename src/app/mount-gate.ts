import type { YoloDetector } from '../infra/detector-core';
import type { FaceEmbedder } from '../infra/embedder-ort';
import type { DexiePersistence, PersistenceProvider } from '../infra/persistence';
import type { ModelLoadProgress } from '../infra/model-load-types';
import type { Camera, CreateCameraOptions } from './camera';
import { createCamera } from './camera';
import { buildGateDom } from './gate-preview-dom';
import { mountModelLoadForRuntime } from './model-load-for-runtime';
import { createOrtDetectorEmbedderWithLoadProgress } from './ort-detector-embedder-factory';
import { bootstrapGateConsentIfNeeded } from './gate-consent-bootstrap';
import { wireGatePreviewSession, type GatePreviewSessionDeps } from './gate-session';
import type { GateRuntime } from './gate-runtime';
import { resolveGateRuntime } from './gate-runtime';
import { resolveAppContext } from './app-context';

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
 * Default mount deps: real camera + `wireGatePreviewSession`; ORT models come from
 * `createOrtDetectorEmbedderWithLoadProgress` inside `mountGateIntoHost` (progress wired to the E11 UI).
 * Tests pass `createYoloDetector` + `createFaceEmbedder` together to inject fakes.
 */
export function createMountGateHostDeps(
  rt: GateRuntime,
  overrides?: Partial<Omit<MountGateHostDeps, 'rt'>>,
): MountGateHostDeps {
  return {
    rt,
    createCamera: overrides?.createCamera ?? createCamera,
    wireGatePreviewSession: overrides?.wireGatePreviewSession ?? wireGatePreviewSession,
    createYoloDetector: overrides?.createYoloDetector,
    createFaceEmbedder: overrides?.createFaceEmbedder,
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
    strings: rt.runtimeSlices.gate.consent,
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
    accessUiStrings: rt.runtimeSlices.gate.accessUi,
    ...sessionDepsExtras,
  };
}

function mountGateDomStage(host: HTMLElement, rt: GateRuntime) {
  document.title = rt.runtimeSlices.gate.pageTitle;
  host.innerHTML = '';
  const dom = buildGateDom(rt);
  host.appendChild(dom.main);
  return dom;
}

function createGateModelFactoriesStage(
  deps: MountGateHostDeps,
  onProgress: (p: ModelLoadProgress) => void,
) {
  const a = deps.createYoloDetector;
  const b = deps.createFaceEmbedder;
  if (a && b) {
    return { yoloDetector: a(), faceEmbedder: b() };
  }
  if (!a && !b) {
    const ort = createOrtDetectorEmbedderWithLoadProgress(onProgress);
    return { yoloDetector: ort.detector, faceEmbedder: ort.embedder };
  }
  throw new Error('mount-gate: pass both createYoloDetector and createFaceEmbedder, or neither');
}

/**
 * Mount the gate UI into an existing host (tests inject `#app` or a detached div).
 * Returns teardown (stop camera, remove listeners) — also registered on `beforeunload` when enabled.
 */
export function mountGateIntoHost(host: HTMLElement, deps: MountGateHostDeps): () => void {
  const { rt } = deps;
  const createCam = deps.createCamera;
  const wireSession = deps.wireGatePreviewSession;
  const addBeforeUnload = deps.addBeforeUnload ?? true;
  const { sessionDepsExtras } = deps;
  const {
    main,
    cameraDeviceSelect,
    cameraToggleBtn,
    modelLoadRoot,
    statusEl,
    previewWrap,
    video,
    canvas,
    overlayCanvas,
    decisionEl,
  } = mountGateDomStage(host, rt);
  maybeBootstrapConsent(sessionDepsExtras?.persistence, cameraToggleBtn, main, rt);
  const modelLoadUi = mountModelLoadForRuntime(modelLoadRoot, rt, 'gate');
  const { yoloDetector, faceEmbedder } = createGateModelFactoriesStage(deps, (p) =>
    modelLoadUi.onProgress(p),
  );
  const sessionDeps = buildSessionDeps(
    rt,
    createCam,
    yoloDetector,
    faceEmbedder,
    sessionDepsExtras,
  );
  const teardown = wireSession(
    {
      cameraDeviceSelect,
      cameraToggleBtn,
      statusEl,
      modelLoadUi,
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
  const { persistence } = resolveAppContext({
    persistence: options?.persistence,
    persistenceProvider: options?.persistenceProvider,
  });
  const rt = resolveGateRuntime();
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

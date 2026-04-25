import { startVideoCameraResilient } from '../camera-resilient-start';
import type { EnrollFsmEvent, EnrollState } from './enroll-fsm';
import { transitionEnrollState } from './enroll-fsm';
import {
  captureEnrollmentFace,
  paintEnrollmentPreview,
  runEnrollmentOverlayFrame,
  saveEnrollmentUser,
  type EnrollmentFrameDeps,
} from './enroll-capture-frames';
import type { User } from '../../domain/types';
import { createModelLoadOrchestrator } from '../model-load-orchestrator';
import type { EnrollmentController, EnrollmentControllerOptions } from './enroll-capture.types';

type EnrollMut = {
  state: EnrollState;
  inferenceBusy: boolean;
  pendingEmbedding: Float32Array | null;
  pendingReferenceBlob: Blob | null;
  editingUserId: string | null;
  loadGeneration: number;
  unsubFrame: (() => void) | null;
};

function runOverlayInference(
  m: EnrollMut,
  opts: EnrollmentControllerOptions,
  frameDeps: EnrollmentFrameDeps,
): void {
  if (m.state !== 'detecting' || m.inferenceBusy || !opts.camera.isRunning()) return;
  m.inferenceBusy = true;
  void (async () => {
    try {
      await runEnrollmentOverlayFrame(frameDeps);
    } catch (err) {
      console.warn('[enrollment] inference', err);
    } finally {
      m.inferenceBusy = false;
    }
  })();
}

/**
 * One attempt: load ORT models, start camera, then subscribe overlay frames.
 * Separated for readability; shares closure with the surrounding controller via `m` and `opts`.
 */
/* eslint-disable max-lines-per-function -- start path: model orchestrator + camera + frame subscription + retry */
async function runStartSessionAttempt(
  m: EnrollMut,
  opts: EnrollmentControllerOptions,
  frameDeps: EnrollmentFrameDeps,
  apply: (e: EnrollFsmEvent) => void,
  onOverlayFrame: () => void,
  resetAfterLoadFailure: () => void,
): Promise<void> {
  m.loadGeneration += 1;
  const gen = m.loadGeneration;
  try {
    const modelLoad = createModelLoadOrchestrator({
      targets: [
        { key: 'detector', enabled: true, load: () => opts.detector.load() },
        { key: 'embedder', enabled: true, load: () => opts.embedder.load() },
      ],
      modelLoadUi: opts.modelLoadUi,
      failedMessage: opts.modelLoadFailedMessage ?? 'Model load failed',
      onFailed: () => {
        console.error('[enrollment] model load failed');
      },
    });
    const loaded = await modelLoad.run();
    if (!loaded) return;
    if (gen !== m.loadGeneration) return;
    const dc = opts.defaultVideoConstraints;
    const getOpts = () => opts.getCameraStartOptions?.() ?? { facingMode: dc.facingMode };
    await startVideoCameraResilient(opts.camera, getOpts, dc.facingMode, async (fb) => {
      await opts.onRecoverStaleEnrollDevice?.(fb);
    });
    if (gen !== m.loadGeneration) return;
    await opts.onAfterCameraStart?.(opts.camera);
    if (gen !== m.loadGeneration) return;
    paintEnrollmentPreview(frameDeps);
    apply({ type: 'ready_detecting' });
    m.unsubFrame = opts.camera.onFrame(() => {
      onOverlayFrame();
    });
  } catch (e) {
    if (gen !== m.loadGeneration) return;
    console.error('[enrollment] start failed', e);
    resetAfterLoadFailure();
    const { modelLoadUi, modelLoadFailedMessage: modelLoadFailed } = opts;
    if (modelLoadUi && modelLoadFailed) {
      modelLoadUi.showError(modelLoadFailed);
      modelLoadUi.setRetryHandler(() => {
        modelLoadUi.clearError();
        if (m.state !== 'idle' && m.state !== 'editing') return;
        apply({ type: 'start_camera' });
        void runStartSessionAttempt(
          m,
          opts,
          frameDeps,
          apply,
          onOverlayFrame,
          resetAfterLoadFailure,
        ).catch(() => {});
      });
      return;
    }
    throw e;
  }
}
/* eslint-enable max-lines-per-function */

/** Frame loop + FSM; detection helpers: `enroll-capture-frames`. */
/* eslint-disable max-lines-per-function -- public API: thin methods over shared `m` + `frameDeps` */
export function createEnrollmentController(opts: EnrollmentControllerOptions): EnrollmentController {
  const oc = opts.overlayCanvas.getContext('2d');
  const fc = opts.frameCanvas.getContext('2d', { willReadFrequently: true });
  if (!oc || !fc) {
    throw new Error('EnrollmentController: missing canvas 2d context');
  }

  const frameDeps: EnrollmentFrameDeps = {
    camera: opts.camera,
    detector: opts.detector,
    embedder: opts.embedder,
    video: opts.video,
    frameCanvas: opts.frameCanvas,
    overlayCanvas: opts.overlayCanvas,
    frameCtx: fc,
    overlayCtx: oc,
    statusEl: opts.statusEl,
    getNoFaceMessage: opts.getNoFaceMessage,
    getMultiFaceMessage: opts.getMultiFaceMessage,
    persistence: opts.persistence,
  };

  const m: EnrollMut = {
    state: 'idle',
    inferenceBusy: false,
    pendingEmbedding: null,
    pendingReferenceBlob: null,
    editingUserId: null,
    loadGeneration: 0,
    unsubFrame: null,
  };

  function emit() {
    opts.onStateChange?.(m.state);
  }

  function setState(next: EnrollState) {
    m.state = next;
    emit();
  }

  function apply(e: EnrollFsmEvent) {
    const next = transitionEnrollState(m.state, e);
    if (next !== m.state) setState(next);
  }

  const onOverlay = () => runOverlayInference(m, opts, frameDeps);

  const resetAfterLoadFailure = () => {
    m.pendingEmbedding = null;
    m.pendingReferenceBlob = null;
    m.editingUserId = null;
    m.unsubFrame?.();
    m.unsubFrame = null;
    opts.camera.stop();
    oc.clearRect(0, 0, opts.overlayCanvas.width, opts.overlayCanvas.height);
    setState('idle');
  };

  return {
    getState() {
      return m.state;
    },

    beginEditFromUser(user: User) {
      if (m.state !== 'idle') return;
      m.pendingEmbedding = new Float32Array(user.embedding);
      m.pendingReferenceBlob = user.referenceImageBlob;
      m.editingUserId = user.id;
      apply({ type: 'begin_edit_from_user' });
    },

    isCameraRunning() {
      return opts.camera.isRunning();
    },

    async startSession() {
      if (m.state !== 'idle' && m.state !== 'editing') return;
      apply({ type: 'start_camera' });

      try {
        await runStartSessionAttempt(m, opts, frameDeps, apply, onOverlay, resetAfterLoadFailure);
      } catch {
        /* Thrown only when `modelLoadUi` is not configured for recoverable error UI. */
      }
    },

    stopSession() {
      m.loadGeneration += 1;
      opts.modelLoadUi?.hide();
      m.unsubFrame?.();
      m.unsubFrame = null;
      opts.camera.stop();
      oc.clearRect(0, 0, opts.overlayCanvas.width, opts.overlayCanvas.height);
      opts.statusEl.textContent = '';
      m.pendingEmbedding = null;
      m.pendingReferenceBlob = null;
      m.editingUserId = null;
      setState('idle');
    },

    async captureFace(): Promise<boolean> {
      if (m.state !== 'detecting') return false;
      try {
        const cap = await captureEnrollmentFace(frameDeps);
        if (!cap) return false;
        m.pendingEmbedding = cap.embedding;
        m.pendingReferenceBlob = cap.referenceImageBlob;
        apply({ type: 'capture' });
        apply({ type: 'begin_edit' });
        return true;
      } catch (e) {
        console.warn('[enrollment] capture', e);
        opts.statusEl.textContent = opts.getNoFaceMessage();
        return false;
      }
    },

    retake() {
      if (m.state === 'editing' && !opts.camera.isRunning()) {
        return;
      }
      if (m.state !== 'captured' && m.state !== 'editing') return;
      m.pendingEmbedding = null;
      m.pendingReferenceBlob = null;
      apply({ type: 'retake' });
      opts.statusEl.textContent = '';
    },

    async saveUser(name: string, role: string) {
      if (m.state !== 'editing' || !m.pendingEmbedding || !m.pendingReferenceBlob) return;
      apply({ type: 'save' });
      try {
        const existingId = m.editingUserId ?? undefined;
        await saveEnrollmentUser(
          opts.persistence,
          name,
          role,
          m.pendingEmbedding,
          m.pendingReferenceBlob,
          existingId ? { existingUserId: existingId } : undefined,
        );
        apply({ type: 'save_ok' });
        m.pendingEmbedding = null;
        m.pendingReferenceBlob = null;
        m.editingUserId = null;
        if (opts.camera.isRunning()) {
          apply({ type: 'continue_enrolling' });
        } else {
          apply({ type: 'reset_after_saved' });
        }
      } catch (e) {
        console.error('[enrollment] save', e);
        apply({ type: 'save_err' });
        throw e;
      }
    },

    dispose() {
      m.loadGeneration += 1;
      m.unsubFrame?.();
      m.unsubFrame = null;
      opts.camera.stop();
      void opts.detector.dispose().catch(() => {});
      void opts.embedder.dispose().catch(() => {});
    },
  };
}
/* eslint-enable max-lines-per-function */

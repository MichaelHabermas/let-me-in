import type { EnrollFsmEvent, EnrollState } from './enroll-fsm';
import { transitionEnrollState } from './enroll-fsm';
import {
  captureEnrollmentFace,
  saveEnrollmentUser,
  type EnrollmentFrameDeps,
} from './enroll-capture-frames';
import type { User } from '../../domain/types';
import type { EnrollmentController, EnrollmentControllerOptions } from './enroll-capture.types';
import {
  type EnrollSessionMut,
  runEnrollmentOverlayInference,
  runEnrollmentStartAttempt,
} from './enroll-session-lifecycle';

/** Frame loop + FSM; detection helpers: `enroll-capture-frames`, lifecycle: `enroll-session-lifecycle`. */
/* eslint-disable max-lines-per-function -- public API: thin methods over shared `m` + `frameDeps` */
export function createEnrollmentController(
  opts: EnrollmentControllerOptions,
): EnrollmentController {
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
    noFaceMessage: opts.getNoFaceMessage(),
    multiFaceMessage: opts.getMultiFaceMessage(),
    persistence: opts.persistence,
  };

  const m: EnrollSessionMut = {
    state: 'idle',
    inferenceBusy: false,
    pendingEmbedding: null,
    pendingReferenceBlob: null,
    editingUserId: null,
    loadGeneration: 0,
    unsubFrame: null,
  };

  function setState(next: EnrollState) {
    m.state = next;
    opts.onStateChange?.(m.state);
  }

  function apply(e: EnrollFsmEvent) {
    const next = transitionEnrollState(m.state, e);
    if (next !== m.state) setState(next);
  }

  const onOverlay = () => runEnrollmentOverlayInference(m, opts, frameDeps);

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
        await runEnrollmentStartAttempt(
          m,
          opts,
          frameDeps,
          apply,
          onOverlay,
          resetAfterLoadFailure,
        );
      } catch (e) {
        console.error('[enrollment] start session failed (no recoverable model-load UI path)', e);
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

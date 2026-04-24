import type { Camera } from '../camera';
import type { EnrollState } from './enroll-fsm';
import { transitionEnrollState } from './enroll-fsm';
import {
  captureEnrollmentFace,
  paintEnrollmentPreview,
  runEnrollmentOverlayFrame,
  saveEnrollmentUser,
  type EnrollmentFrameDeps,
} from './enroll-capture-frames';
import type { Detection } from '../../infra/detector-core';
import type { FaceEmbedder } from '../../infra/embedder-ort';
import type { DexiePersistence } from '../../infra/persistence';
import type { User } from '../../domain/types';
import type { ModelLoadStatusController } from '../model-load-status-ui';
import { loadDetectorAndEmbedderParallel } from '../parallel-model-load';

export type EnrollmentControllerOptions = {
  camera: Camera;
  detector: {
    load(): Promise<void>;
    infer(imageData: ImageData): Promise<Detection[]>;
    dispose(): Promise<void>;
  };
  embedder: FaceEmbedder;
  video: HTMLVideoElement;
  frameCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  statusEl: HTMLElement;
  getNoFaceMessage: () => string;
  getMultiFaceMessage: () => string;
  persistence: DexiePersistence;
  onStateChange?: (s: EnrollState) => void;
  modelLoadUi?: ModelLoadStatusController;
  /** Shown with Retry when `modelLoadUi` is set. */
  modelLoadFailedMessage?: string;
};

export type EnrollmentController = {
  getState(): EnrollState;
  /** Load an existing user for name/role edits and optional re-capture (idle only). */
  beginEditFromUser(user: User): void;
  isCameraRunning(): boolean;
  startSession(): Promise<void>;
  stopSession(): void;
  captureFace(): Promise<boolean>;
  retake(): void;
  saveUser(name: string, role: string): Promise<void>;
  dispose(): void;
};

/** Orchestrates frame loop + FSM; inference helpers live in enroll-capture-frames.ts. */
/* eslint-disable max-lines-per-function -- single session bundle (handlers are short) */
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
    getNoFaceMessage: opts.getNoFaceMessage,
    getMultiFaceMessage: opts.getMultiFaceMessage,
    persistence: opts.persistence,
  };

  let state: EnrollState = 'idle';
  let inferenceBusy = false;
  let pendingEmbedding: Float32Array | null = null;
  let pendingReferenceBlob: Blob | null = null;
  let editingUserId: string | null = null;
  let unsubFrame: (() => void) | null = null;
  let loadGeneration = 0;

  function emit() {
    opts.onStateChange?.(state);
  }

  function setState(next: EnrollState) {
    state = next;
    emit();
  }

  function apply(e: Parameters<typeof transitionEnrollState>[1]) {
    const next = transitionEnrollState(state, e);
    if (next !== state) setState(next);
  }

  function runOverlayInference() {
    if (state !== 'detecting' || inferenceBusy || !opts.camera.isRunning()) return;
    inferenceBusy = true;
    void (async () => {
      try {
        await runEnrollmentOverlayFrame(frameDeps);
      } catch (err) {
        console.warn('[enrollment] inference', err);
      } finally {
        inferenceBusy = false;
      }
    })();
  }

  return {
    getState() {
      return state;
    },

    beginEditFromUser(user: User) {
      if (state !== 'idle') return;
      pendingEmbedding = new Float32Array(user.embedding);
      pendingReferenceBlob = user.referenceImageBlob;
      editingUserId = user.id;
      apply({ type: 'begin_edit_from_user' });
    },

    isCameraRunning() {
      return opts.camera.isRunning();
    },

    async startSession() {
      if (state !== 'idle' && state !== 'editing') return;
      apply({ type: 'start_camera' });

      const resetAfterLoadFailure = () => {
        pendingEmbedding = null;
        pendingReferenceBlob = null;
        editingUserId = null;
        unsubFrame?.();
        unsubFrame = null;
        opts.camera.stop();
        oc.clearRect(0, 0, opts.overlayCanvas.width, opts.overlayCanvas.height);
        setState('idle');
      };

      const runAttempt = async (): Promise<void> => {
        loadGeneration += 1;
        const gen = loadGeneration;
        try {
          await loadDetectorAndEmbedderParallel({
            detector: opts.detector,
            embedder: opts.embedder,
            modelLoadUi: opts.modelLoadUi,
          });
          if (gen !== loadGeneration) return;
          await opts.camera.start();
          if (gen !== loadGeneration) return;
          paintEnrollmentPreview(frameDeps);
          apply({ type: 'ready_detecting' });
          unsubFrame = opts.camera.onFrame(() => {
            runOverlayInference();
          });
        } catch (e) {
          if (gen !== loadGeneration) return;
          console.error('[enrollment] start failed', e);
          resetAfterLoadFailure();
          const modelLoadUi = opts.modelLoadUi;
          const modelLoadFailed = opts.modelLoadFailedMessage;
          if (modelLoadUi && modelLoadFailed) {
            modelLoadUi.showError(modelLoadFailed);
            modelLoadUi.setRetryHandler(() => {
              modelLoadUi.clearError();
              if (state !== 'idle' && state !== 'editing') return;
              apply({ type: 'start_camera' });
              void runAttempt().catch(() => {});
            });
            return;
          }
          throw e;
        }
      };

      try {
        await runAttempt();
      } catch {
        /* thrown only when no modelLoadUi */
      }
    },

    stopSession() {
      loadGeneration += 1;
      opts.modelLoadUi?.hide();
      unsubFrame?.();
      unsubFrame = null;
      opts.camera.stop();
      oc.clearRect(0, 0, opts.overlayCanvas.width, opts.overlayCanvas.height);
      opts.statusEl.textContent = '';
      pendingEmbedding = null;
      pendingReferenceBlob = null;
      editingUserId = null;
      setState('idle');
    },

    async captureFace(): Promise<boolean> {
      if (state !== 'detecting') return false;
      try {
        const cap = await captureEnrollmentFace(frameDeps);
        if (!cap) return false;
        pendingEmbedding = cap.embedding;
        pendingReferenceBlob = cap.referenceImageBlob;
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
      if (state === 'editing' && !opts.camera.isRunning()) {
        return;
      }
      if (state !== 'captured' && state !== 'editing') return;
      pendingEmbedding = null;
      pendingReferenceBlob = null;
      apply({ type: 'retake' });
      opts.statusEl.textContent = '';
    },

    async saveUser(name: string, role: string) {
      if (state !== 'editing' || !pendingEmbedding || !pendingReferenceBlob) return;
      apply({ type: 'save' });
      try {
        const existingId = editingUserId ?? undefined;
        await saveEnrollmentUser(
          opts.persistence,
          name,
          role,
          pendingEmbedding,
          pendingReferenceBlob,
          existingId ? { existingUserId: existingId } : undefined,
        );
        apply({ type: 'save_ok' });
        pendingEmbedding = null;
        pendingReferenceBlob = null;
        editingUserId = null;
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
      unsubFrame?.();
      unsubFrame = null;
      opts.camera.stop();
      void opts.detector.dispose().catch(() => {});
      void opts.embedder.dispose().catch(() => {});
    },
  };
}
/* eslint-enable max-lines-per-function */

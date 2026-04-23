import type { EnrollState } from './enroll-fsm';
import { transitionEnrollState } from './enroll-fsm';
import { persistEnrolledUser } from './enroll-save';
import type { EnrollmentController } from './enroll-capture';
import type { DexiePersistence } from '../infra/persistence';

export type StubEnrollmentOptions = {
  persistence: DexiePersistence;
  onStateChange?: (s: EnrollState) => void;
};

/** Headless-friendly enrollment for Playwright (`VITE_E2E_STUB_ENROLL=true`). */
/* eslint-disable max-lines-per-function -- mirrors real controller surface */
export function createStubEnrollmentController(opts: StubEnrollmentOptions): EnrollmentController {
  let state: EnrollState = 'idle';
  let pendingEmbedding: Float32Array | null = null;
  let pendingReferenceBlob: Blob | null = null;

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

  return {
    getState() {
      return state;
    },
    async startSession() {
      if (state !== 'idle') return;
      apply({ type: 'start_camera' });
      apply({ type: 'ready_detecting' });
    },
    stopSession() {
      pendingEmbedding = null;
      pendingReferenceBlob = null;
      setState('idle');
    },
    async captureFace() {
      if (state !== 'detecting') return false;
      const embedding = new Float32Array(512);
      embedding.fill(1 / Math.sqrt(512));
      pendingEmbedding = embedding;
      pendingReferenceBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
        type: 'image/jpeg',
      });
      apply({ type: 'capture' });
      apply({ type: 'begin_edit' });
      return true;
    },
    retake() {
      if (state !== 'captured' && state !== 'editing') return;
      pendingEmbedding = null;
      pendingReferenceBlob = null;
      apply({ type: 'retake' });
    },
    async saveUser(name: string, role: string) {
      if (state !== 'editing' || !pendingEmbedding || !pendingReferenceBlob) return;
      apply({ type: 'save' });
      await persistEnrolledUser(opts.persistence, {
        name,
        role,
        embedding: pendingEmbedding,
        referenceImageBlob: pendingReferenceBlob,
      });
      apply({ type: 'save_ok' });
      pendingEmbedding = null;
      pendingReferenceBlob = null;
      apply({ type: 'continue_enrolling' });
    },
    dispose() {},
  };
}
/* eslint-enable max-lines-per-function */

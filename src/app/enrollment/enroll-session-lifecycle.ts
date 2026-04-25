import { startVideoCameraResilient } from '../camera-resilient-start';
import type { EnrollFsmEvent, EnrollState } from './enroll-fsm';
import {
  paintEnrollmentPreview,
  runEnrollmentOverlayFrame,
  type EnrollmentFrameDeps,
} from './enroll-capture-frames';
import {
  buildDetectorEmbedderModelLoadTargets,
  createModelLoadOrchestrator,
} from '../model-load-orchestrator';
import type { EnrollmentControllerOptions } from './enroll-capture.types';

/** Mutable enrollment session row — owned by `createEnrollmentController`. */
export type EnrollSessionMut = {
  state: EnrollState;
  inferenceBusy: boolean;
  pendingEmbedding: Float32Array | null;
  pendingReferenceBlob: Blob | null;
  editingUserId: string | null;
  loadGeneration: number;
  unsubFrame: (() => void) | null;
};

export function runEnrollmentOverlayInference(
  m: EnrollSessionMut,
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
 */
/* eslint-disable max-lines-per-function -- start path: model orchestrator + camera + frame subscription + retry */
export async function runEnrollmentStartAttempt(
  m: EnrollSessionMut,
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
      targets: buildDetectorEmbedderModelLoadTargets(opts.detector, opts.embedder),
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
        void runEnrollmentStartAttempt(
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

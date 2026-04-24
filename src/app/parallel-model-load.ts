import type { ModelLoadStatusController } from './model-load-status-ui';
import { withMeasuredLoad } from './gatekeeper-metrics';

export type ParallelModelLoadTarget = {
  load(): Promise<void>;
};

/**
 * Loads detector + embedder in parallel with optional E11 progress UI and E10 timings.
 */
export async function loadDetectorAndEmbedderParallel(params: {
  detector: ParallelModelLoadTarget;
  embedder: ParallelModelLoadTarget;
  modelLoadUi?: ModelLoadStatusController;
}): Promise<void> {
  const { detector, embedder, modelLoadUi } = params;
  if (!modelLoadUi) {
    await Promise.all([detector.load(), embedder.load()]);
    return;
  }
  modelLoadUi.configure({ showDetector: true, showEmbedder: true });
  modelLoadUi.clearError();
  modelLoadUi.setRetryHandler(null);
  modelLoadUi.showLoading();
  await Promise.all([
    withMeasuredLoad('detector', () => detector.load()).then(() => {
      modelLoadUi.markStageComplete('detector');
    }),
    withMeasuredLoad('embedder', () => embedder.load()).then(() => {
      modelLoadUi.markStageComplete('embedder');
    }),
  ]);
  modelLoadUi.hide();
}

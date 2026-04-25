import type { ModelLoadStatusController } from './model-load-status-ui';
import { createModelLoadOrchestrator } from './model-load-orchestrator';

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
  const orchestrator = createModelLoadOrchestrator({
    targets: [
      { key: 'detector', enabled: true, load: () => params.detector.load() },
      { key: 'embedder', enabled: true, load: () => params.embedder.load() },
    ],
    modelLoadUi: params.modelLoadUi,
    failedMessage: 'Model load failed',
  });
  await orchestrator.run();
}

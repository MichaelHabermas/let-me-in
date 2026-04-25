import type { GateRuntime } from './gate-runtime';
import { mountModelLoadStatusUi, type ModelLoadStatusController } from './model-load-status-ui';

/** Labels + `testIdPrefix` used by both gate and admin enrollment. */
type ModelLoadRuntimeSource = Pick<
  GateRuntime,
  'modelLoadStageDetectorLabel' | 'modelLoadStageEmbedderLabel' | 'modelLoadRetryLabel'
>;

/**
 * Mounts the E11 model-load status UI for any surface that already resolved copy via {@link resolveGateRuntime}.
 */
export function mountModelLoadForRuntime(
  modelLoadRoot: HTMLElement,
  rt: ModelLoadRuntimeSource,
  testIdPrefix: 'gate' | 'enroll',
): ModelLoadStatusController {
  return mountModelLoadStatusUi(modelLoadRoot, {
    strings: {
      stageDetector: rt.modelLoadStageDetectorLabel,
      stageEmbedder: rt.modelLoadStageEmbedderLabel,
      retryLabel: rt.modelLoadRetryLabel,
    },
    testIdPrefix,
  });
}

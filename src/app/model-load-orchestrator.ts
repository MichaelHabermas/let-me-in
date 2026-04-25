import type { ModelLoadStatusController } from './model-load-status-ui';
import { withMeasuredLoad } from './gatekeeper-metrics';

export type ModelLoadTarget = {
  key: 'detector' | 'embedder';
  enabled: boolean;
  load: () => Promise<void>;
};

export type ModelLoadSurface = {
  load(): Promise<void>;
};

/**
 * One place to build detector+embedder parallel targets (gate, enrollment, `parallel-model-load`).
 */
export function buildDetectorEmbedderModelLoadTargets(
  yolo: ModelLoadSurface | undefined,
  face: ModelLoadSurface | undefined,
): ModelLoadTarget[] {
  const out: ModelLoadTarget[] = [];
  if (yolo) {
    out.push({ key: 'detector', enabled: true, load: () => yolo.load() });
  }
  if (face) {
    out.push({ key: 'embedder', enabled: true, load: () => face.load() });
  }
  return out;
}

export type ModelLoadOrchestrator = {
  run(): Promise<boolean>;
  retry(): void;
};

type CreateModelLoadOrchestratorParams = {
  targets: ModelLoadTarget[];
  modelLoadUi?: ModelLoadStatusController;
  loadingMessage?: string;
  failedMessage: string;
  setStatus?: (message: string) => void;
  onReady?: () => void;
  onFailed?: () => void;
  onRetryRequested?: () => void;
};

function configureModelLoadUi(params: CreateModelLoadOrchestratorParams): void {
  if (!params.modelLoadUi) return;
  params.modelLoadUi.configure({
    showDetector: params.targets.some((t) => t.key === 'detector' && t.enabled),
    showEmbedder: params.targets.some((t) => t.key === 'embedder' && t.enabled),
  });
  params.modelLoadUi.clearError();
  params.modelLoadUi.setRetryHandler(null);
  params.modelLoadUi.showLoading();
  params.setStatus?.('');
}

async function runActiveLoads(
  activeTargets: ModelLoadTarget[],
  modelLoadUi?: ModelLoadStatusController,
): Promise<void> {
  await Promise.all(
    activeTargets.map((target) =>
      withMeasuredLoad(target.key, () => target.load()).then(() => {
        modelLoadUi?.markStageComplete(target.key);
      }),
    ),
  );
}

export function createModelLoadOrchestrator(
  params: CreateModelLoadOrchestratorParams,
): ModelLoadOrchestrator {
  let generation = 0;

  const run = async (): Promise<boolean> => {
    generation += 1;
    const myGen = generation;
    const activeTargets = params.targets.filter((t) => t.enabled);
    if (activeTargets.length === 0) return true;
    if (params.modelLoadUi) {
      configureModelLoadUi(params);
    } else if (params.loadingMessage) {
      params.setStatus?.(params.loadingMessage);
    }
    try {
      await runActiveLoads(activeTargets, params.modelLoadUi);
      if (myGen !== generation) return false;
      params.modelLoadUi?.hide();
      params.onReady?.();
      return true;
    } catch {
      if (myGen !== generation) return false;
      params.onFailed?.();
      if (params.modelLoadUi) {
        params.modelLoadUi.showError(params.failedMessage);
        params.modelLoadUi.setRetryHandler(() => {
          params.modelLoadUi?.clearError();
          params.onRetryRequested?.();
          void run();
        });
      } else {
        params.setStatus?.(params.failedMessage);
      }
      return false;
    }
  };

  return {
    run,
    retry() {
      generation += 1;
      params.onRetryRequested?.();
      void run();
    },
  };
}

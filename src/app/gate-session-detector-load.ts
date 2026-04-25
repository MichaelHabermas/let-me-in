import type { Camera } from './camera';
import type { GatePreviewSessionDeps } from './gate-session';
import type { ModelLoadStatusController } from './model-load-status-ui';
import { maybeRecordNavigationToDetectorReady } from './gatekeeper-metrics';
import { createModelLoadOrchestrator } from './model-load-orchestrator';

export type DetectorGateState = {
  loadState: 'none' | 'pending' | 'ready' | 'failed';
  embedderLoadState?: 'none' | 'pending' | 'ready' | 'failed';
  modelsSettled?: Promise<boolean>;
  stopPipeline?: () => void;
};

type LoadElements = {
  statusEl: HTMLElement;
  modelLoadUi?: ModelLoadStatusController;
};

export function beginDetectorLoad(
  deps: GatePreviewSessionDeps,
  camera: Camera,
  elements: LoadElements,
  state: DetectorGateState,
  loadingMsg: string,
  failedMsg: string,
): void {
  const { statusEl, modelLoadUi } = elements;
  state.loadState = deps.yoloDetector ? 'pending' : 'none';
  state.embedderLoadState = deps.faceEmbedder ? 'pending' : 'none';
  const targets = [];
  if (deps.yoloDetector) {
    const detector = deps.yoloDetector;
    targets.push({ key: 'detector' as const, enabled: true, load: () => detector.load() });
  }
  if (deps.faceEmbedder) {
    const embedder = deps.faceEmbedder;
    targets.push({ key: 'embedder' as const, enabled: true, load: () => embedder.load() });
  }
  const orchestrator = createModelLoadOrchestrator({
    targets,
    modelLoadUi,
    loadingMessage: loadingMsg,
    failedMessage: failedMsg,
    setStatus: (message) => {
      statusEl.textContent = message;
    },
    onReady: () => {
      if (deps.yoloDetector) state.loadState = 'ready';
      if (deps.faceEmbedder) state.embedderLoadState = 'ready';
      maybeRecordNavigationToDetectorReady();
      if (!camera.isRunning()) statusEl.textContent = '';
    },
    onFailed: () => {
      console.error('[gate] model load failed');
      if (deps.yoloDetector) state.loadState = 'failed';
      if (deps.faceEmbedder) state.embedderLoadState = 'failed';
    },
  });
  state.modelsSettled = orchestrator.run();
}

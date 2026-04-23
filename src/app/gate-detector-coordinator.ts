import type { Camera } from './camera';
import { createCooldown } from './cooldown';
import { createDetectionPipeline } from './pipeline';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';

type DetectorGateState = {
  loadState: 'none' | 'pending' | 'ready' | 'failed';
  embedderLoadState?: 'none' | 'pending' | 'ready' | 'failed';
  modelsSettled?: Promise<boolean>;
  stopPipeline?: () => void;
};

function beginDetectorLoad(ctx: {
  deps: GatePreviewSessionDeps;
  camera: Camera;
  statusEl: HTMLElement;
  state: DetectorGateState;
  loadingMsg: string;
  failedMsg: string;
}): void {
  const { deps, camera, statusEl, state, loadingMsg, failedMsg } = ctx;
  const promises: Promise<void>[] = [];

  if (deps.yoloDetector) {
    state.loadState = 'pending';
    promises.push(deps.yoloDetector.load());
  } else {
    state.loadState = 'none';
  }

  if (deps.faceEmbedder) {
    state.embedderLoadState = 'pending';
    promises.push(deps.faceEmbedder.load());
  } else {
    state.embedderLoadState = 'none';
  }

  if (promises.length === 0) {
    return;
  }

  statusEl.textContent = loadingMsg;
  state.modelsSettled = (async (): Promise<boolean> => {
    try {
      await Promise.all(promises);
      if (deps.yoloDetector) state.loadState = 'ready';
      if (deps.faceEmbedder) state.embedderLoadState = 'ready';
      if (!camera.isRunning()) statusEl.textContent = '';
      return true;
    } catch (e) {
      console.error('[gate] model load failed', e);
      if (deps.yoloDetector) state.loadState = 'failed';
      if (deps.faceEmbedder) state.embedderLoadState = 'failed';
      statusEl.textContent = failedMsg;
      return false;
    }
  })();
}

async function waitForDetectorReady(ctx: {
  deps: GatePreviewSessionDeps;
  statusEl: HTMLElement;
  state: DetectorGateState;
  loadingMsg: string;
}): Promise<boolean> {
  const { deps, statusEl, state, loadingMsg } = ctx;
  if (!deps.yoloDetector && !deps.faceEmbedder) return true;
  if (!state.modelsSettled) return true;
  statusEl.textContent = loadingMsg;
  return state.modelsSettled;
}

function attachPipeline(ctx: {
  camera: Camera;
  deps: GatePreviewSessionDeps;
  elements: GatePreviewElements;
  state: DetectorGateState;
}): void {
  const { camera, deps, elements, state } = ctx;
  if (!deps.yoloDetector || !elements.overlayCanvas || state.loadState !== 'ready') return;
  if (deps.faceEmbedder && state.embedderLoadState !== 'ready') return;
  const octx = elements.overlayCanvas.getContext('2d');
  if (!octx) return;
  state.stopPipeline?.();
  const cooldown = createCooldown(deps.cooldownMs, () => performance.now());
  state.stopPipeline = createDetectionPipeline({
    camera,
    detector: deps.yoloDetector,
    overlayCtx: octx,
    overlayWidth: elements.overlayCanvas.width,
    overlayHeight: elements.overlayCanvas.height,
    faceEmbedder: deps.faceEmbedder,
    logEmbeddingTimings: deps.logEmbeddingTimings,
    statusEl: elements.statusEl,
    noFaceMessage: deps.noFaceMessage,
    multiFaceMessage: deps.multiFaceMessage,
    cooldown,
    evaluateDecision: deps.evaluateDecision,
  });
}

export type DetectorPipelineCoordinator = {
  beginModelLoad(deps: GatePreviewSessionDeps, loadingMsg: string, failedMsg: string): void;
  waitReady(deps: GatePreviewSessionDeps, loadingMsg: string): Promise<boolean>;
  attachRunningPipeline(deps: GatePreviewSessionDeps): void;
  stopPipeline(): void;
};

/** Owns model load promise + pipeline stop handle for one preview session. */
export function createDetectorPipelineCoordinator(ctx: {
  elements: GatePreviewElements;
  camera: Camera;
  statusEl: HTMLElement;
}): DetectorPipelineCoordinator {
  const state: DetectorGateState = { loadState: 'none' };

  return {
    beginModelLoad(deps, loadingMsg, failedMsg) {
      beginDetectorLoad({
        deps,
        camera: ctx.camera,
        statusEl: ctx.statusEl,
        state,
        loadingMsg,
        failedMsg,
      });
    },
    waitReady(deps, loadingMsg) {
      return waitForDetectorReady({ deps, statusEl: ctx.statusEl, state, loadingMsg });
    },
    attachRunningPipeline(deps) {
      attachPipeline({ camera: ctx.camera, deps, elements: ctx.elements, state });
    },
    stopPipeline() {
      state.stopPipeline?.();
      state.stopPipeline = undefined;
    },
  };
}

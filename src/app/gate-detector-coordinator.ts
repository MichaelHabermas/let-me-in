import type { Camera } from './camera';
import { createCooldown } from './cooldown';
import { createDetectionPipeline } from './pipeline';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';

export type DetectorGateState = {
  loadState: 'none' | 'pending' | 'ready' | 'failed';
  /** Mirrors detector lifecycle when an embedder is mounted (E4). */
  embedderLoadState?: 'none' | 'pending' | 'ready' | 'failed';
  /** Started in `beginDetectorLoad`; await in `waitForDetectorReady` (no polling). */
  modelsSettled?: Promise<boolean>;
  stopPipeline?: () => void;
};

export function beginDetectorLoad(ctx: {
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

export async function waitForDetectorReady(ctx: {
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

export function attachPipeline(ctx: {
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

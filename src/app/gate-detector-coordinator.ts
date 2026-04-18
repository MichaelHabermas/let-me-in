import type { Camera } from './camera';
import { createDetectionPipeline } from './pipeline';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';

export type DetectorGateState = {
  loadState: 'none' | 'pending' | 'ready' | 'failed';
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
  if (!deps.yoloDetector) {
    state.loadState = 'none';
    return;
  }
  state.loadState = 'pending';
  statusEl.textContent = loadingMsg;
  void deps.yoloDetector
    .load()
    .then(() => {
      state.loadState = 'ready';
      if (!camera.isRunning()) statusEl.textContent = '';
    })
    .catch((e) => {
      console.error('[gate] detector load failed', e);
      state.loadState = 'failed';
      statusEl.textContent = failedMsg;
    });
}

export async function waitForDetectorReady(ctx: {
  deps: GatePreviewSessionDeps;
  statusEl: HTMLElement;
  state: DetectorGateState;
  loadingMsg: string;
  failedMsg: string;
  sleep: (ms: number) => Promise<void>;
}): Promise<boolean> {
  const { deps, statusEl, state, loadingMsg, failedMsg, sleep } = ctx;
  if (!deps.yoloDetector) return true;
  while (state.loadState === 'pending') {
    statusEl.textContent = loadingMsg;
    await sleep(50);
  }
  if (state.loadState === 'failed') {
    statusEl.textContent = failedMsg;
    return false;
  }
  return true;
}

export function attachPipeline(ctx: {
  camera: Camera;
  deps: GatePreviewSessionDeps;
  elements: GatePreviewElements;
  state: DetectorGateState;
}): void {
  const { camera, deps, elements, state } = ctx;
  if (!deps.yoloDetector || !elements.overlayCanvas || state.loadState !== 'ready') return;
  const octx = elements.overlayCanvas.getContext('2d');
  if (!octx) return;
  state.stopPipeline?.();
  state.stopPipeline = createDetectionPipeline({
    camera,
    detector: deps.yoloDetector,
    overlayCtx: octx,
    overlayWidth: elements.overlayCanvas.width,
    overlayHeight: elements.overlayCanvas.height,
  });
}

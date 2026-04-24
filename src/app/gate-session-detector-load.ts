import type { Camera } from './camera';
import type { GatePreviewSessionDeps } from './gate-session';
import { maybeRecordNavigationToDetectorReady, withMeasuredLoad } from './gatekeeper-metrics';

export type DetectorGateState = {
  loadState: 'none' | 'pending' | 'ready' | 'failed';
  embedderLoadState?: 'none' | 'pending' | 'ready' | 'failed';
  modelsSettled?: Promise<boolean>;
  stopPipeline?: () => void;
};

export function beginDetectorLoad(
  deps: GatePreviewSessionDeps,
  camera: Camera,
  statusEl: HTMLElement,
  state: DetectorGateState,
  loadingMsg: string,
  failedMsg: string,
): void {
  const promises: Promise<void>[] = [];
  if (deps.yoloDetector) {
    const detector = deps.yoloDetector;
    state.loadState = 'pending';
    promises.push(withMeasuredLoad('detector', () => detector.load()));
  } else {
    state.loadState = 'none';
  }
  if (deps.faceEmbedder) {
    const embedder = deps.faceEmbedder;
    state.embedderLoadState = 'pending';
    promises.push(withMeasuredLoad('embedder', () => embedder.load()));
  } else {
    state.embedderLoadState = 'none';
  }
  if (promises.length === 0) return;

  statusEl.textContent = loadingMsg;
  state.modelsSettled = (async (): Promise<boolean> => {
    try {
      await Promise.all(promises);
      if (deps.yoloDetector) state.loadState = 'ready';
      if (deps.faceEmbedder) state.embedderLoadState = 'ready';
      maybeRecordNavigationToDetectorReady();
      if (!camera.isRunning()) statusEl.textContent = '';
      return true;
    } catch (error) {
      console.error('[gate] model load failed', error);
      if (deps.yoloDetector) state.loadState = 'failed';
      if (deps.faceEmbedder) state.embedderLoadState = 'failed';
      statusEl.textContent = failedMsg;
      return false;
    }
  })();
}

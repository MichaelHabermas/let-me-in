/* eslint-disable max-lines-per-function -- model load, retry, and async settle stay in one module for readability */
import type { Camera } from './camera';
import type { GatePreviewSessionDeps } from './gate-session';
import type { ModelLoadStatusController } from './model-load-status-ui';
import { maybeRecordNavigationToDetectorReady, withMeasuredLoad } from './gatekeeper-metrics';

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
  let generation = 0;

  const runLoadAttempt = (): void => {
    generation += 1;
    const myGen = generation;

    const promises: Promise<void>[] = [];
    if (deps.yoloDetector) {
      const detector = deps.yoloDetector;
      state.loadState = 'pending';
      promises.push(
        withMeasuredLoad('detector', () => detector.load()).then(() => {
          modelLoadUi?.markStageComplete('detector');
        }),
      );
    } else {
      state.loadState = 'none';
    }
    if (deps.faceEmbedder) {
      const embedder = deps.faceEmbedder;
      state.embedderLoadState = 'pending';
      promises.push(
        withMeasuredLoad('embedder', () => embedder.load()).then(() => {
          modelLoadUi?.markStageComplete('embedder');
        }),
      );
    } else {
      state.embedderLoadState = 'none';
    }
    if (promises.length === 0) return;

    if (modelLoadUi) {
      modelLoadUi.configure({
        showDetector: Boolean(deps.yoloDetector),
        showEmbedder: Boolean(deps.faceEmbedder),
      });
      modelLoadUi.clearError();
      modelLoadUi.setRetryHandler(null);
      modelLoadUi.showLoading();
      statusEl.textContent = '';
    } else {
      statusEl.textContent = loadingMsg;
    }

    state.modelsSettled = (async (): Promise<boolean> => {
      try {
        await Promise.all(promises);
        if (myGen !== generation) return false;
        if (deps.yoloDetector) state.loadState = 'ready';
        if (deps.faceEmbedder) state.embedderLoadState = 'ready';
        maybeRecordNavigationToDetectorReady();
        modelLoadUi?.hide();
        if (!camera.isRunning()) statusEl.textContent = '';
        return true;
      } catch (error) {
        console.error('[gate] model load failed', error);
        if (myGen !== generation) return false;
        if (deps.yoloDetector) state.loadState = 'failed';
        if (deps.faceEmbedder) state.embedderLoadState = 'failed';
        if (modelLoadUi) {
          const ui = modelLoadUi;
          ui.showError(failedMsg);
          ui.setRetryHandler(() => {
            ui.clearError();
            runLoadAttempt();
          });
        } else {
          statusEl.textContent = failedMsg;
        }
        return false;
      }
    })();
  };

  runLoadAttempt();
}

import type { Camera } from './camera';
import { createCooldown } from './cooldown';
import { createDetectionPipeline } from './detection-pipeline';
import { syncCameraToggleUi } from './gate-camera-toggle-ui';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';
import { beginDetectorLoad, type DetectorGateState } from './gate-session-detector-load';
import { withLiveAccessDeps } from './gate-session-live-access';

/**
 * Camera + model load + live access pipeline orchestration (deep module boundary).
 */
/* eslint-disable max-lines-per-function -- lifecycle wiring kept in one place for clarity */
export function wireCameraControls(
  camera: Camera,
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
): () => void {
  const { cameraToggleBtn, statusEl } = elements;
  const loadingMsg = deps.detectorLoadingMessage;
  const failedMsg = deps.detectorLoadFailedMessage;
  const state: DetectorGateState = { loadState: 'none' };
  beginDetectorLoad(deps, camera, statusEl, state, loadingMsg, failedMsg);

  const onStart = async () => {
    syncCameraToggleUi(cameraToggleBtn, 'loading');
    try {
      if (state.modelsSettled) {
        statusEl.textContent = loadingMsg;
      }
      if ((await state.modelsSettled) === false) {
        syncCameraToggleUi(cameraToggleBtn, 'idle');
        return;
      }
      statusEl.textContent = '';
      const attachDeps = await withLiveAccessDeps(elements, deps);
      await camera.start();
      if (
        attachDeps.yoloDetector &&
        elements.overlayCanvas &&
        state.loadState === 'ready' &&
        (!attachDeps.faceEmbedder || state.embedderLoadState === 'ready')
      ) {
        const overlayCtx = elements.overlayCanvas.getContext('2d');
        if (overlayCtx) {
          state.stopPipeline?.();
          const cooldown = createCooldown(attachDeps.cooldownMs, () => performance.now());
          state.stopPipeline = createDetectionPipeline({
            camera,
            detector: attachDeps.yoloDetector,
            overlayCtx,
            overlayWidth: elements.overlayCanvas.width,
            overlayHeight: elements.overlayCanvas.height,
            faceEmbedder: attachDeps.faceEmbedder,
            logEmbeddingTimings: attachDeps.logEmbeddingTimings,
            statusEl: elements.statusEl,
            noFaceMessage: attachDeps.noFaceMessage,
            multiFaceMessage: attachDeps.multiFaceMessage,
            cooldown,
            evaluateDecision: attachDeps.evaluateDecision,
            appendAccessLog: attachDeps.appendAccessLog,
          });
        }
      }
      syncCameraToggleUi(cameraToggleBtn, 'running');
    } catch {
      syncCameraToggleUi(cameraToggleBtn, 'idle');
    }
  };

  cameraToggleBtn.addEventListener('click', () => {
    if (camera.isRunning()) {
      state.stopPipeline?.();
      state.stopPipeline = undefined;
      camera.stop();
      syncCameraToggleUi(cameraToggleBtn, 'idle');
    } else {
      void onStart();
    }
  });

  return () => {
    state.stopPipeline?.();
    state.stopPipeline = undefined;
  };
}
/* eslint-enable max-lines-per-function */

import type { Camera } from './camera';
import { createCooldown } from './cooldown';
import { maybeRecordNavigationToDetectorReady, withMeasuredLoad } from './gatekeeper-metrics';
import { createDetectionPipeline } from './pipeline';
import { createAccessAudioCues } from './audio';
import {
  createGateAccessUiController,
  FALLBACK_GATE_ACCESS_UI_STRINGS,
} from './gate-access-ui-controller';
import { createAccessDecisionEvaluator } from './access-decision-engine';
import { syncCameraToggleUi } from './gate-camera-toggle-ui';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';

type DetectorGateState = {
  loadState: 'none' | 'pending' | 'ready' | 'failed';
  embedderLoadState?: 'none' | 'pending' | 'ready' | 'failed';
  modelsSettled?: Promise<boolean>;
  stopPipeline?: () => void;
};

function beginDetectorLoad(
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

async function withLiveAccessDeps(
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
): Promise<GatePreviewSessionDeps> {
  if (deps.evaluateDecision || !deps.persistence || !deps.databaseSeedFallback) {
    return deps;
  }
  const persistence = deps.persistence;
  const uiStrings = deps.accessUiStrings ?? FALLBACK_GATE_ACCESS_UI_STRINGS;
  const accessUi =
    elements.decisionEl && createGateAccessUiController(elements.decisionEl, uiStrings);
  const audioCues = createAccessAudioCues();
  const evaluateDecision = await createAccessDecisionEvaluator(
    deps.persistence,
    deps.databaseSeedFallback,
    {
      onDecision: (event) => {
        accessUi?.present(event);
        audioCues.play(event.policy.decision);
      },
    },
  );
  return {
    ...deps,
    evaluateDecision,
    appendAccessLog:
      deps.appendAccessLog ?? ((payload) => persistence.accessLogRepo.appendDecision(payload)),
  };
}

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

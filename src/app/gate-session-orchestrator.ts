import type { Camera, CameraStartOptions } from './camera';
import { startVideoCameraResilient } from './camera-resilient-start';
import {
  createCameraStartOptionsState,
  refreshVideoInputDeviceListAfterStart,
} from './camera-device-session';
import { createCooldown } from './cooldown';
import { createDetectionPipeline } from './detection-pipeline';
import { readCameraPreference, writeCameraPreference } from './camera-preference-persistence';
import { syncCameraToggleUi } from './gate-camera-toggle-ui';
import { GATE_CAMERA_PREFERENCE_KEY } from '../domain/camera-preference';
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
  const { cameraToggleBtn, statusEl, modelLoadUi, cameraDeviceSelect: deviceSelect } = elements;
  const loadingMsg = deps.detectorLoadingMessage;
  const failedMsg = deps.detectorLoadFailedMessage;
  const state: DetectorGateState = { loadState: 'none' };
  const settingsRepo = deps.persistence?.settingsRepo;
  const prefRead =
    deviceSelect && settingsRepo
      ? readCameraPreference(settingsRepo, GATE_CAMERA_PREFERENCE_KEY)
      : null;
  const startOpts = createCameraStartOptionsState({
    getDefaultFacingMode: () => deps.getDefaultVideoConstraintsForCamera().facingMode,
    getSelectValueTrimmed: () => deviceSelect?.value?.trim() ?? '',
  });

  beginDetectorLoad(deps, camera, { statusEl, modelLoadUi }, state, loadingMsg, failedMsg);

  function getStartOptions(): CameraStartOptions {
    return startOpts.getStartOptions();
  }

  const onStart = async () => {
    syncCameraToggleUi(cameraToggleBtn, 'loading');
    try {
      if (state.modelsSettled && !elements.modelLoadUi) {
        statusEl.textContent = loadingMsg;
      }
      if ((await state.modelsSettled) === false) {
        syncCameraToggleUi(cameraToggleBtn, 'idle');
        return;
      }
      if (!elements.modelLoadUi) statusEl.textContent = '';
      if (prefRead) {
        startOpts.setLoadedPreference((await prefRead) ?? undefined);
      }
      const attachDeps = await withLiveAccessDeps(elements, deps);
      const d = deps.getDefaultVideoConstraintsForCamera();
      await startVideoCameraResilient(camera, getStartOptions, d.facingMode, async (fb) => {
        await startOpts.recoverFromStaleDevice(settingsRepo, GATE_CAMERA_PREFERENCE_KEY, fb);
      });

      if (deviceSelect) {
        const listed = await refreshVideoInputDeviceListAfterStart({
          camera,
          deviceSelect,
          settingsRepo,
          preferenceKey: GATE_CAMERA_PREFERENCE_KEY,
          defaultFacingForPreference: d.facingMode,
          firstSelectOptionLabel: deps.cameraDefaultDeviceOption,
          formatUnnamedForListIndex: (i) => deps.formatUnnamedCamera(i + 1),
        });
        if (listed) {
          startOpts.setListPopulated(true);
        }
      }

      const overlay = elements.overlayCanvas;
      const embedderReady = !attachDeps.faceEmbedder || state.embedderLoadState === 'ready';
      if (attachDeps.yoloDetector && overlay && state.loadState === 'ready' && embedderReady) {
        const overlayCtx = overlay.getContext('2d');
        if (overlayCtx) {
          state.stopPipeline?.();
          const cooldown = createCooldown(attachDeps.cooldownMs, () => performance.now());
          state.stopPipeline = createDetectionPipeline({
            camera,
            detector: attachDeps.yoloDetector,
            overlayCtx,
            overlayWidth: overlay.width,
            overlayHeight: overlay.height,
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

  if (deviceSelect && settingsRepo) {
    deviceSelect.addEventListener('change', () => {
      const d = deps.getDefaultVideoConstraintsForCamera();
      if (!deviceSelect.value) {
        void writeCameraPreference(settingsRepo, GATE_CAMERA_PREFERENCE_KEY, {
          facingMode: d.facingMode,
        });
        startOpts.setLoadedPreference({ facingMode: d.facingMode });
      } else {
        void writeCameraPreference(settingsRepo, GATE_CAMERA_PREFERENCE_KEY, {
          deviceId: deviceSelect.value,
        });
        startOpts.setLoadedPreference({ deviceId: deviceSelect.value });
      }
      if (camera.isRunning()) {
        state.stopPipeline?.();
        state.stopPipeline = undefined;
        camera.stop();
        syncCameraToggleUi(cameraToggleBtn, 'idle');
        void onStart();
      }
    });
  }

  return () => {
    state.stopPipeline?.();
    state.stopPipeline = undefined;
  };
}
/* eslint-enable max-lines-per-function */

import type { Camera, CameraStartOptions } from './camera';
import { startVideoCameraResilient } from './camera-resilient-start';
import { createCooldown } from './cooldown';
import { createDetectionPipeline } from './detection-pipeline';
import { readCameraPreference, writeCameraPreference } from './camera-preference-persistence';
import { fillVideoDeviceSelect } from './gate-video-device-select-ui';
import { syncCameraToggleUi } from './gate-camera-toggle-ui';
import { GATE_CAMERA_PREFERENCE_KEY, type CameraPreference } from '../domain/camera-preference';
import {
  ensureVideoInputDeviceLabels,
  getBrowserMediaDeviceAccess,
  preferenceForTrackSettings,
  resolveCameraStartOptions,
  videoInputDevicesToList,
} from '../infra/camera-devices';
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
  let listPopulated = false;
  let cachedPref: CameraPreference | undefined;
  const settingsRepo = deps.persistence?.settingsRepo;
  const prefRead =
    deviceSelect && settingsRepo
      ? readCameraPreference(settingsRepo, GATE_CAMERA_PREFERENCE_KEY)
      : null;

  beginDetectorLoad(deps, camera, { statusEl, modelLoadUi }, state, loadingMsg, failedMsg);

  function getStartOptions(): CameraStartOptions {
    const d = deps.getDefaultVideoConstraintsForCamera();
    return resolveCameraStartOptions({
      listPopulated,
      selectValue: deviceSelect?.value?.trim() ?? '',
      defaultFacingMode: d.facingMode,
      loadedPreference: cachedPref,
    });
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
        cachedPref = (await prefRead) ?? undefined;
      }
      const attachDeps = await withLiveAccessDeps(elements, deps);
      const d = deps.getDefaultVideoConstraintsForCamera();
      await startVideoCameraResilient(camera, getStartOptions, d.facingMode, async (fb) => {
        if (settingsRepo) {
          await writeCameraPreference(settingsRepo, GATE_CAMERA_PREFERENCE_KEY, { facingMode: fb });
        }
        cachedPref = { facingMode: fb };
        listPopulated = false;
      });

      if (deviceSelect) {
        try {
          const access = getBrowserMediaDeviceAccess();
          if (access) {
            const all = await ensureVideoInputDeviceLabels(access);
            const items = videoInputDevicesToList(all, (i) => deps.formatUnnamedCamera(i + 1));
            const active = camera.getTrackSettings()?.deviceId;
            fillVideoDeviceSelect(
              deviceSelect,
              deps.cameraDefaultDeviceOption,
              items,
              active ?? null,
            );
            listPopulated = true;
            if (settingsRepo) {
              const t = camera.getTrackSettings();
              await writeCameraPreference(
                settingsRepo,
                GATE_CAMERA_PREFERENCE_KEY,
                preferenceForTrackSettings(t, d.facingMode),
              );
            }
          }
        } catch {
          /* list fill is best-effort */
        }
      }

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

  if (deviceSelect && settingsRepo) {
    deviceSelect.addEventListener('change', () => {
      const d = deps.getDefaultVideoConstraintsForCamera();
      if (!deviceSelect.value) {
        void writeCameraPreference(settingsRepo, GATE_CAMERA_PREFERENCE_KEY, {
          facingMode: d.facingMode,
        });
        cachedPref = { facingMode: d.facingMode };
      } else {
        void writeCameraPreference(settingsRepo, GATE_CAMERA_PREFERENCE_KEY, {
          deviceId: deviceSelect.value,
        });
        cachedPref = { deviceId: deviceSelect.value };
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

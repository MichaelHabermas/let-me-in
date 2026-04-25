import type { Camera, CameraStartOptions } from './camera';
import {
  bindCameraDevicePreferenceChange,
  createCameraStartOptionsState,
} from './camera-device-session';
import { createCameraSessionLifecycle } from './camera-session-lifecycle';
import { readCameraPreference } from './camera-preference-persistence';
import { syncCameraToggleUi } from './gate-camera-toggle-ui';
import { GATE_CAMERA_PREFERENCE_KEY } from '../domain/camera-preference';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';
import { beginDetectorLoad, type DetectorGateState } from './gate-session-detector-load';
import {
  runGatePreviewStartSequence,
  type LiveAccessDepsResolver,
} from './gate-preview-start-sequence';
import { withLiveAccessDeps } from './gate-session-live-access';

export type WireCameraControlsOptions = {
  /** Default `withLiveAccessDeps` — inject in tests to avoid live DB. */
  resolveLiveAccess?: LiveAccessDepsResolver;
};

/**
 * Camera + model load + live access pipeline orchestration (deep module boundary).
 */
/* eslint-disable max-lines-per-function -- lifecycle wiring kept in one place for clarity */
export function wireCameraControls(
  camera: Camera,
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
  options?: WireCameraControlsOptions,
): () => void {
  const resolveLiveAccess = options?.resolveLiveAccess ?? withLiveAccessDeps;
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
      await runGatePreviewStartSequence(
        {
          camera,
          elements,
          deps,
          state,
          getStartOptions,
          startOpts,
          prefRead,
          deviceSelect,
          settingsRepo,
        },
        resolveLiveAccess,
      );
      syncCameraToggleUi(cameraToggleBtn, 'running');
    } catch {
      syncCameraToggleUi(cameraToggleBtn, 'idle');
    }
  };

  const lifecycle = createCameraSessionLifecycle({
    camera,
    onStart,
    onStop: () => {
      state.stopPipeline?.();
      state.stopPipeline = undefined;
      syncCameraToggleUi(cameraToggleBtn, 'idle');
    },
    onStartError: () => {
      syncCameraToggleUi(cameraToggleBtn, 'idle');
    },
  });
  const onToggleClick = () => {
    if (camera.isRunning()) {
      lifecycle.stop();
      return;
    }
    void lifecycle.start();
  };
  cameraToggleBtn.addEventListener('click', onToggleClick);

  const unbindDevicePreferenceChange =
    deviceSelect && settingsRepo
      ? bindCameraDevicePreferenceChange({
          deviceSelect,
          settingsRepo,
          preferenceKey: GATE_CAMERA_PREFERENCE_KEY,
          defaultFacingMode: deps.getDefaultVideoConstraintsForCamera().facingMode,
          isCameraRunning: () => camera.isRunning(),
          restartCamera: () => lifecycle.restart(),
          setLoadedPreference: (preference) => startOpts.setLoadedPreference(preference),
        })
      : undefined;

  return () => {
    cameraToggleBtn.removeEventListener('click', onToggleClick);
    unbindDevicePreferenceChange?.();
    state.stopPipeline?.();
    state.stopPipeline = undefined;
  };
}
/* eslint-enable max-lines-per-function */

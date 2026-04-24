import { getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import { ENROLL_CAMERA_PREFERENCE_KEY } from '../domain/camera-preference';
import {
  createCameraStartOptionsState,
  refreshVideoInputDeviceListAfterStart,
} from './camera-device-session';
import type { ModelLoadProgress } from '../infra/model-load-types';
import type { DexiePersistence } from '../infra/persistence';
import { createFaceEmbedder } from '../infra/embedder-ort';
import { createYoloDetector } from '../infra/detector-ort';
import { createDetectorEmbedderRuntime } from '../infra/inference-runtime';
import { readCameraPreference } from './camera-preference-persistence';
import { createCamera } from './camera';
import type { AdminEnrollmentCaptureMount } from './admin-enrollment-ports';
import { mountModelLoadStatusUi } from './model-load-status-ui';
import { createEnrollmentController, type EnrollmentController } from './enroll';
import {
  createE2eEnrollmentCamera,
  createE2eEnrollmentDetector,
  createE2eEnrollmentEmbedder,
} from './enrollment/enroll-e2e-doubles';
import type { GateRuntime } from './gate-runtime';
import type { Camera } from './camera';

function enrollmentControllerBase(
  dom: AdminEnrollmentCaptureMount,
  rt: GateRuntime,
  persistence: DexiePersistence,
  onStateChange: () => void,
) {
  return {
    video: dom.video,
    frameCanvas: dom.frameCanvas,
    overlayCanvas: dom.overlayCanvas,
    statusEl: dom.statusEl,
    getNoFaceMessage: () => rt.noFaceMessage,
    getMultiFaceMessage: () => rt.multiFaceMessage,
    persistence,
    onStateChange,
  };
}

/* eslint-disable max-lines-per-function -- mirrors gate mount: model load + ORT + device list wiring */
function createAdminEnrollmentWithModelLoad(
  dom: AdminEnrollmentCaptureMount,
  rt: GateRuntime,
  base: ReturnType<typeof enrollmentControllerBase>,
): EnrollmentController {
  const modelLoadUi = mountModelLoadStatusUi(dom.modelLoadRoot, {
    strings: {
      stageDetector: rt.modelLoadStageDetectorLabel,
      stageEmbedder: rt.modelLoadStageEmbedderLabel,
      retryLabel: rt.modelLoadRetryLabel,
    },
    testIdPrefix: 'enroll',
  });
  const onProgress = (p: ModelLoadProgress) => modelLoadUi.onProgress(p);
  const ort = createDetectorEmbedderRuntime({
    createDetector: () =>
      createYoloDetector(getDetectorRuntimeSettings(), {
        onLoadProgress: onProgress,
      }),
    createEmbedder: () =>
      createFaceEmbedder(getEmbedderRuntimeSettings(), {
        onLoadProgress: onProgress,
      }),
  });
  const dc = rt.defaultVideoConstraintsForCamera;
  const startOpts = createCameraStartOptionsState({
    getDefaultFacingMode: () => dc.facingMode,
    getSelectValueTrimmed: () => dom.cameraDeviceSelect.value.trim(),
  });
  void readCameraPreference(base.persistence.settingsRepo, ENROLL_CAMERA_PREFERENCE_KEY).then(
    (p) => {
      startOpts.setLoadedPreference(p);
    },
  );
  return createEnrollmentController({
    ...base,
    defaultVideoConstraints: dc,
    camera: createCamera(dom.video, dom.frameCanvas, {
      defaultConstraints: dc,
    }),
    detector: ort.detector,
    embedder: ort.embedder,
    modelLoadUi,
    modelLoadFailedMessage: rt.detectorLoadFailedMessage,
    getCameraStartOptions: () => startOpts.getStartOptions(),
    onAfterCameraStart: async (cam: Camera) => {
      const ok = await refreshVideoInputDeviceListAfterStart({
        camera: cam,
        deviceSelect: dom.cameraDeviceSelect,
        settingsRepo: base.persistence.settingsRepo,
        preferenceKey: ENROLL_CAMERA_PREFERENCE_KEY,
        defaultFacingForPreference: dc.facingMode,
        firstSelectOptionLabel: rt.runtimeSlices.admin.ui.cameraDefaultDeviceOption,
        formatUnnamedForListIndex: (i) => rt.formatUnnamedCamera(i + 1),
      });
      if (ok) {
        startOpts.setListPopulated(true);
      }
    },
    onRecoverStaleEnrollDevice: async (fb) => {
      await startOpts.recoverFromStaleDevice(
        base.persistence.settingsRepo,
        ENROLL_CAMERA_PREFERENCE_KEY,
        fb,
      );
    },
  });
}
/* eslint-enable max-lines-per-function */

export function createAdminEnrollmentSessionController(params: {
  dom: AdminEnrollmentCaptureMount;
  rt: GateRuntime;
  persistence: DexiePersistence;
  useStubEnrollment: boolean;
  onStateChange: () => void;
}): EnrollmentController {
  const { dom, rt, persistence, useStubEnrollment, onStateChange } = params;
  const base = enrollmentControllerBase(dom, rt, persistence, onStateChange);
  if (useStubEnrollment) {
    dom.cameraDeviceSelect.hidden = true;
    const ort = createDetectorEmbedderRuntime({
      createDetector: () => createE2eEnrollmentDetector(),
      createEmbedder: () => createE2eEnrollmentEmbedder(),
    });
    return createEnrollmentController({
      ...base,
      defaultVideoConstraints: rt.defaultVideoConstraintsForCamera,
      camera: createE2eEnrollmentCamera(dom.frameCanvas.width, dom.frameCanvas.height),
      detector: ort.detector,
      embedder: ort.embedder,
    });
  }
  return createAdminEnrollmentWithModelLoad(dom, rt, base);
}

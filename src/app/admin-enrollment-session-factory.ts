import { getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import type { ModelLoadProgress } from '../infra/model-load-types';
import type { DexiePersistence } from '../infra/persistence';
import { createFaceEmbedder } from '../infra/embedder-ort';
import { createYoloDetector } from '../infra/detector-ort';
import { createDetectorEmbedderRuntime } from '../infra/inference-runtime';
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
  return createEnrollmentController({
    ...base,
    camera: createCamera(dom.video, dom.frameCanvas, {
      defaultConstraints: rt.defaultVideoConstraintsForCamera,
    }),
    detector: ort.detector,
    embedder: ort.embedder,
    modelLoadUi,
    modelLoadFailedMessage: rt.detectorLoadFailedMessage,
  });
}

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
    const ort = createDetectorEmbedderRuntime({
      createDetector: () => createE2eEnrollmentDetector(),
      createEmbedder: () => createE2eEnrollmentEmbedder(),
    });
    return createEnrollmentController({
      ...base,
      camera: createE2eEnrollmentCamera(dom.frameCanvas.width, dom.frameCanvas.height),
      detector: ort.detector,
      embedder: ort.embedder,
    });
  }
  return createAdminEnrollmentWithModelLoad(dom, rt, base);
}

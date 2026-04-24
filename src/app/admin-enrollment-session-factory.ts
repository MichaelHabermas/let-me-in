import { getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import type { DexiePersistence } from '../infra/persistence';
import { createFaceEmbedder } from '../infra/embedder-ort';
import { createYoloDetector } from '../infra/detector-ort';
import { createCamera } from './camera';
import type { AdminEnrollmentDom } from './admin-enrollment-dom';
import { createEnrollmentController, type EnrollmentController } from './enroll';
import {
  createE2eEnrollmentCamera,
  createE2eEnrollmentDetector,
  createE2eEnrollmentEmbedder,
} from './enroll-e2e-doubles';
import type { GateRuntime } from './runtime-settings';

function enrollmentControllerBase(
  dom: AdminEnrollmentDom,
  rt: GateRuntime,
  persistence: DexiePersistence,
  onStateChange: () => void,
) {
  return {
    video: dom.video,
    frameCanvas: dom.frameCanvas,
    overlayCanvas: dom.overlayCanvas,
    statusEl: dom.statusEl,
    getNoFaceMessage: () => rt.getNoFaceMessage(),
    getMultiFaceMessage: () => rt.getMultiFaceMessage(),
    persistence,
    onStateChange,
  };
}

export function createAdminEnrollmentSessionController(params: {
  dom: AdminEnrollmentDom;
  rt: GateRuntime;
  persistence: DexiePersistence;
  useStubEnrollment: boolean;
  onStateChange: () => void;
}): EnrollmentController {
  const { dom, rt, persistence, useStubEnrollment, onStateChange } = params;
  const base = enrollmentControllerBase(dom, rt, persistence, onStateChange);
  return useStubEnrollment
    ? createEnrollmentController({
        ...base,
        camera: createE2eEnrollmentCamera(dom.frameCanvas.width, dom.frameCanvas.height),
        detector: createE2eEnrollmentDetector(),
        embedder: createE2eEnrollmentEmbedder(),
      })
    : createEnrollmentController({
        ...base,
        camera: createCamera(dom.video, dom.frameCanvas, {
          defaultConstraints: rt.getDefaultVideoConstraintsForCamera(),
        }),
        detector: createYoloDetector(getDetectorRuntimeSettings()),
        embedder: createFaceEmbedder(getEmbedderRuntimeSettings()),
      });
}

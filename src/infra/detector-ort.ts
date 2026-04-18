import type { DetectorRuntimeSettings } from '../config';
import type { YoloDetector } from './detector-core';
import { createYoloWorkerDetector } from './detector-worker-client';
import { createOrtSession, type OrtSessionBundle } from './ort-session-factory';
import { runYoloDetectorInference } from './yolo-ort-inference';

function createYoloMainThreadDetector(
  settings: DetectorRuntimeSettings,
  options?: {
    modelUrl?: string;
    modelBytes?: Uint8Array;
  },
): YoloDetector {
  const modelUrl = options?.modelUrl ?? settings.detectorModelUrl;
  const modelSource = options?.modelBytes ?? modelUrl;
  let bundle: OrtSessionBundle | null = null;

  return {
    async load() {
      if (bundle) return;
      bundle = await createOrtSession(modelSource, undefined, settings.ortWasmBase);
    },

    async infer(imageData: ImageData) {
      if (!bundle) {
        throw new Error('detector.load() must be called before infer()');
      }
      return runYoloDetectorInference(bundle.session, imageData);
    },

    async dispose() {
      if (bundle) {
        await bundle.session.release();
        bundle = null;
      }
    },
  };
}

export type CreateYoloDetectorOptions = {
  modelUrl?: string;
  modelBytes?: Uint8Array;
  /** Disable worker path (debug). Ignored when `modelBytes` is set (tests always use main thread). */
  runOnMainThread?: boolean;
};

/**
 * Production YOLO detector factory. Pass {@link DetectorRuntimeSettings} from the composition root
 * (e.g. `getDetectorRuntimeSettings()`) so infra does not depend on the entire app config object.
 */
export function createYoloDetector(
  settings: DetectorRuntimeSettings,
  options?: CreateYoloDetectorOptions,
): YoloDetector {
  const useWorker =
    typeof Worker !== 'undefined' &&
    settings.detectorUseWorker &&
    !options?.modelBytes &&
    options?.runOnMainThread !== true;

  if (useWorker) {
    return createYoloWorkerDetector({
      modelUrl: options?.modelUrl ?? settings.detectorModelUrl,
      ortWasmBase: settings.ortWasmBase,
    });
  }
  return createYoloMainThreadDetector(settings, options);
}

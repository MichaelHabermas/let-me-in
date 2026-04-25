import type { DetectorRuntimeSettings } from '../config';
import type { YoloDetector } from './detector-core';
import { createYoloWorkerDetector } from './detector-worker-client';
import { fetchModelBytesWithProgress } from './fetch-model-bytes';
import type { ModelLoadProgress } from './model-load-types';
import { createOrtSession, type OrtSessionBundle } from './ort-session-factory';
import { runYoloDetectorInference } from './yolo-ort-inference';
import { createDetectorInferQueue } from './detector-infer-queue';

/* eslint-disable max-lines-per-function -- ORT load + infer + dispose on one surface */
function createYoloMainThreadDetector(
  settings: DetectorRuntimeSettings,
  options?: {
    modelUrl?: string;
    modelBytes?: Uint8Array;
    onLoadProgress?: (p: ModelLoadProgress) => void;
  },
): YoloDetector {
  const modelUrl = options?.modelUrl ?? settings.detectorModelUrl;
  const modelSource = options?.modelBytes ?? modelUrl;
  const onLoadProgress = options?.onLoadProgress;
  let bundle: OrtSessionBundle | null = null;
  /** Same non-reentrancy guarantee as the worker-backed detector. */
  const inferQueue = createDetectorInferQueue();

  return {
    async load() {
      if (bundle) return;
      if (typeof modelSource === 'string' && onLoadProgress) {
        const bytes = await fetchModelBytesWithProgress(modelSource, ({ loaded, total }) =>
          onLoadProgress({ stage: 'detector', loaded, total: total ?? undefined }),
        );
        bundle = await createOrtSession(
          bytes,
          settings.preferredExecutionProviders,
          settings.ortWasmBase,
        );
        return;
      }
      bundle = await createOrtSession(
        modelSource,
        settings.preferredExecutionProviders,
        settings.ortWasmBase,
      );
    },

    async infer(imageData: ImageData) {
      if (!bundle) {
        throw new Error('detector.load() must be called before infer()');
      }
      const session = bundle.session;
      return inferQueue.enqueue(() => runYoloDetectorInference(session, imageData));
    },

    async dispose() {
      await inferQueue.drain();
      if (bundle) {
        await bundle.session.release();
        bundle = null;
      }
      inferQueue.reset();
    },
  };
}
/* eslint-enable max-lines-per-function */

export type CreateYoloDetectorOptions = {
  modelUrl?: string;
  modelBytes?: Uint8Array;
  onLoadProgress?: (p: ModelLoadProgress) => void;
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
      onLoadProgress: options?.onLoadProgress,
    });
  }
  return createYoloMainThreadDetector(settings, options);
}

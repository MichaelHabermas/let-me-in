import * as ort from 'onnxruntime-web';

import { config } from '../config';
import {
  decodeYoloPredictions,
  DETECTOR_INPUT_SIZE,
  preprocessToChwFloat,
  type Detection,
  type LetterboxMeta,
  type YoloDetector,
} from './detector-core';
import { createYoloWorkerDetector } from './detector-worker-client';
import { createOrtSession, type OrtSessionBundle } from './ort-session-factory';

export type { Detection, LetterboxMeta, YoloDetector };
export {
  computeLetterboxMeta,
  decodeYoloPredictions,
  preprocessToChwFloat,
} from './detector-core';

function createYoloMainThreadDetector(options?: {
  modelUrl?: string;
  modelBytes?: Uint8Array;
}): YoloDetector {
  const modelUrl = options?.modelUrl ?? config.modelUrls.detector;
  const modelSource = options?.modelBytes ?? modelUrl;
  let bundle: OrtSessionBundle | null = null;

  return {
    async load() {
      if (bundle) return;
      bundle = await createOrtSession(modelSource);
    },

    async infer(imageData: ImageData) {
      if (!bundle) {
        throw new Error('detector.load() must be called before infer()');
      }
      const { tensorData, meta } = preprocessToChwFloat(imageData);
      const tensor = new ort.Tensor('float32', tensorData, [1, 3, DETECTOR_INPUT_SIZE, DETECTOR_INPUT_SIZE]);
      const outputs = await bundle.session.run({ images: tensor });
      const pred = outputs.predictions as ort.Tensor;
      const data = pred.data as Float32Array;
      if (pred.dims[0] !== 1 || pred.dims[1] !== 84 || pred.dims[2] !== 8400) {
        throw new Error(`Unexpected predictions shape: ${JSON.stringify(pred.dims)}`);
      }
      return decodeYoloPredictions(data, meta);
    },

    async dispose() {
      if (bundle) {
        await bundle.session.release();
        bundle = null;
      }
    },
  };
}

export function createYoloDetector(options?: {
  modelUrl?: string;
  modelBytes?: Uint8Array;
  /** Disable worker path (debug). Ignored when `modelBytes` is set (tests always use main thread). */
  runOnMainThread?: boolean;
}): YoloDetector {
  const useWorker =
    typeof Worker !== 'undefined' &&
    config.detectorUseWorker &&
    !options?.modelBytes &&
    options?.runOnMainThread !== true;

  if (useWorker) {
    return createYoloWorkerDetector({
      modelUrl: options?.modelUrl ?? config.modelUrls.detector,
      ortWasmBase: config.ortWasmBase,
    });
  }
  return createYoloMainThreadDetector(options);
}

/**
 * Single ORT path for YOLO: preprocess → session.run → shape check → decode.
 * Used on the main thread and inside the YOLO worker (DRY).
 */

import * as ort from 'onnxruntime-web/all';

import {
  decodeYoloPredictions,
  DETECTOR_INPUT_SIZE,
  preprocessToChwFloat,
  type Detection,
} from './detector-core';

export async function runYoloDetectorInference(
  session: ort.InferenceSession,
  imageData: ImageData,
): Promise<Detection[]> {
  const { tensorData, meta } = preprocessToChwFloat(imageData);
  const tensor = new ort.Tensor('float32', tensorData, [
    1,
    3,
    DETECTOR_INPUT_SIZE,
    DETECTOR_INPUT_SIZE,
  ]);
  const outputs = await session.run({ images: tensor });
  const pred = outputs.predictions as ort.Tensor;
  const data = pred.data as Float32Array;
  if (pred.dims[0] !== 1 || pred.dims[1] !== 84 || pred.dims[2] !== 8400) {
    throw new Error(`Unexpected predictions shape: ${JSON.stringify(pred.dims)}`);
  }
  return decodeYoloPredictions(data, meta);
}

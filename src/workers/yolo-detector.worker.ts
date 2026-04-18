/// <reference lib="webworker" />

import * as ort from 'onnxruntime-web/all';

import {
  decodeYoloPredictions,
  DETECTOR_INPUT_SIZE,
  preprocessToChwFloat,
} from '../infra/detector-core';
import {
  configureOrtWasmAssets,
  createOrtSession,
  type OrtSessionBundle,
} from '../infra/ort-session-factory';

let bundle: OrtSessionBundle | null = null;

self.onmessage = async (ev: MessageEvent) => {
  const m = ev.data as {
    type: string;
    id: number;
    ortWasmBase?: string;
    modelUrl?: string;
    width?: number;
    height?: number;
    rgba?: ArrayBuffer;
  };

  if (m.type === 'init') {
    try {
      configureOrtWasmAssets(m.ortWasmBase!);
      bundle = await createOrtSession(m.modelUrl!);
      self.postMessage({ type: 'init-ok', id: m.id });
    } catch (e) {
      self.postMessage({
        type: 'init-err',
        id: m.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return;
  }

  if (m.type === 'infer') {
    if (!bundle) {
      self.postMessage({ type: 'infer-err', id: m.id, error: 'detector not loaded' });
      return;
    }
    try {
      const data = new Uint8ClampedArray(m.rgba!);
      const imageData = {
        width: m.width!,
        height: m.height!,
        data,
        colorSpace: 'srgb',
      } as ImageData;
      const { tensorData, meta } = preprocessToChwFloat(imageData);
      const tensor = new ort.Tensor('float32', tensorData, [
        1,
        3,
        DETECTOR_INPUT_SIZE,
        DETECTOR_INPUT_SIZE,
      ]);
      const outputs = await bundle.session.run({ images: tensor });
      const pred = outputs.predictions as ort.Tensor;
      const arr = pred.data as Float32Array;
      if (pred.dims[0] !== 1 || pred.dims[1] !== 84 || pred.dims[2] !== 8400) {
        throw new Error(`Unexpected predictions shape: ${JSON.stringify(pred.dims)}`);
      }
      const dets = decodeYoloPredictions(arr, meta);
      self.postMessage({ type: 'infer-ok', id: m.id, dets });
    } catch (e) {
      self.postMessage({
        type: 'infer-err',
        id: m.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
};

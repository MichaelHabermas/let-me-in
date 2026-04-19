/**
 * InsightFace `w600k_mbf` ONNX embedder — same `{ load, infer, dispose }` lifecycle shape as YOLO.
 */

import * as ort from 'onnxruntime-web/all';

import type { EmbedderRuntimeSettings } from '../config';
import { createOrtSession, type OrtSessionBundle } from './ort-session-factory';

export const EMBEDDER_INPUT_SIZE = 112;
export const EMBEDDER_DIM = 512;

const INPUT_NAME = 'input.1';
const OUTPUT_NAME = '516';

export type FaceEmbedder = {
  load(): Promise<void>;
  /** Runs ORT on a CHW float32 buffer shaped logically as `[1,3,112,112]`. */
  infer(chwFloat32: Float32Array): Promise<Float32Array>;
  dispose(): Promise<void>;
};

/**
 * NCHW RGB float32, `(pixel - 127.5) / 127.5` per PRE-WORK [PROVEN].
 */
export function toEmbedderTensor(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  if (width !== EMBEDDER_INPUT_SIZE || height !== EMBEDDER_INPUT_SIZE) {
    throw new Error(
      `toEmbedderTensor: expected ${EMBEDDER_INPUT_SIZE}×${EMBEDDER_INPUT_SIZE}, got ${width}×${height}`,
    );
  }
  const plane = EMBEDDER_INPUT_SIZE * EMBEDDER_INPUT_SIZE;
  const out = new Float32Array(3 * plane);
  for (let y = 0; y < EMBEDDER_INPUT_SIZE; y++) {
    for (let x = 0; x < EMBEDDER_INPUT_SIZE; x++) {
      const i = (y * EMBEDDER_INPUT_SIZE + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const idx = y * EMBEDDER_INPUT_SIZE + x;
      out[idx] = (r - 127.5) / 127.5;
      out[plane + idx] = (g - 127.5) / 127.5;
      out[2 * plane + idx] = (b - 127.5) / 127.5;
    }
  }
  return out;
}

export type CreateFaceEmbedderOptions = {
  modelUrl?: string;
  modelBytes?: Uint8Array;
};

export function createFaceEmbedder(
  settings: EmbedderRuntimeSettings,
  options?: CreateFaceEmbedderOptions,
): FaceEmbedder {
  const modelUrl = options?.modelUrl ?? settings.embedderModelUrl;
  const modelSource = options?.modelBytes ?? modelUrl;
  let bundle: OrtSessionBundle | null = null;

  return {
    async load() {
      if (bundle) return;
      bundle = await createOrtSession(modelSource, undefined, settings.ortWasmBase);
    },

    async infer(chwFloat32: Float32Array) {
      if (!bundle) {
        throw new Error('embedder.load() must be called before infer()');
      }
      const expected = 1 * 3 * EMBEDDER_INPUT_SIZE * EMBEDDER_INPUT_SIZE;
      if (chwFloat32.length !== expected) {
        throw new Error(`embedder.infer: expected ${expected} floats, got ${chwFloat32.length}`);
      }
      const tensor = new ort.Tensor('float32', chwFloat32, [
        1,
        3,
        EMBEDDER_INPUT_SIZE,
        EMBEDDER_INPUT_SIZE,
      ]);
      const outputs = await bundle.session.run({ [INPUT_NAME]: tensor });
      const out = outputs[OUTPUT_NAME] as ort.Tensor | undefined;
      if (!out || out.dims[0] !== 1 || out.dims[1] !== EMBEDDER_DIM) {
        throw new Error(
          `Unexpected embedder output shape: ${out ? JSON.stringify(out.dims) : 'missing'}`,
        );
      }
      const raw = out.data as Float32Array;
      return Float32Array.from(raw);
    },

    async dispose() {
      if (bundle) {
        await bundle.session.release();
        bundle = null;
      }
    },
  };
}

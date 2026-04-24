/**
 * InsightFace `w600k_mbf` ONNX embedder — same `{ load, infer, dispose }` lifecycle shape as YOLO.
 */

import * as ort from 'onnxruntime-web/all';

import type { EmbedderRuntimeSettings } from '../config';
import { EMBEDDER_INPUT_SIZE } from './embedder-preprocess';
import { fetchModelBytesWithProgress } from './fetch-model-bytes';
import type { ModelLoadProgress } from './model-load-types';
import { createOrtSession, type OrtSessionBundle } from './ort-session-factory';

export { EMBEDDER_INPUT_SIZE, toEmbedderTensor } from './embedder-preprocess';

export const EMBEDDER_DIM = 512;

const INPUT_NAME = 'input.1';
const OUTPUT_NAME = '516';

export type FaceEmbedder = {
  load(): Promise<void>;
  /** Runs ORT on a CHW float32 buffer shaped logically as `[1,3,112,112]`. */
  infer(chwFloat32: Float32Array): Promise<Float32Array>;
  dispose(): Promise<void>;
};

export type CreateFaceEmbedderOptions = {
  modelUrl?: string;
  modelBytes?: Uint8Array;
  onLoadProgress?: (p: ModelLoadProgress) => void;
};

/* eslint-disable max-lines-per-function -- single factory returning load/infer/dispose */
export function createFaceEmbedder(
  settings: EmbedderRuntimeSettings,
  options?: CreateFaceEmbedderOptions,
): FaceEmbedder {
  const modelUrl = options?.modelUrl ?? settings.embedderModelUrl;
  const modelSource = options?.modelBytes ?? modelUrl;
  const onLoadProgress = options?.onLoadProgress;
  let bundle: OrtSessionBundle | null = null;

  return {
    async load() {
      if (bundle) return;
      if (typeof modelSource === 'string' && onLoadProgress) {
        const bytes = await fetchModelBytesWithProgress(modelSource, ({ loaded, total }) =>
          onLoadProgress({ stage: 'embedder', loaded, total: total ?? undefined }),
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
/* eslint-enable max-lines-per-function */

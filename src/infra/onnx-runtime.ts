/**
 * Approved ONNX Runtime surface for **app** and **ui** code (see ESLint `no-restricted-imports`
 * on `onnxruntime-web` / `onnxruntime-web/all`).
 *
 * - **Session creation** is implemented in `ort-session-factory.ts`, which imports
 *   `onnxruntime-web/all` so WebGL/WebGPU execution providers register in the browser bundle.
 * - **Live YOLO detection** does not use this file for inference: use `createYoloDetector` from
 *   `detector-ort.ts`, which delegates to `ort-session-factory` (main thread) or the YOLO worker.
 * - **Face embedder sessions** are created in `embedder-ort.ts` via `createFaceEmbedder` (same
 *   `createOrtSession` factory as the detector).
 *
 * Infra and tests may import `ort-session-factory` directly; app/ui should prefer this module
 * when they need `createOrtSession` without pulling `onnxruntime-web` through the bundle boundary.
 */

export {
  configureOrtWasmAssets,
  createOrtSession,
  OrtSessionError,
  resetOrtWasmConfigForTests,
  type OrtSessionBundle,
} from './ort-session-factory';

export type OnnxRuntimeStatus = 'disabled' | 'ready';

export type OnnxRuntimeHandle = {
  status: OnnxRuntimeStatus;
  dispose(): Promise<void>;
};

/**
 * Placeholder until the embedding/detector pipeline is wired.
 * Callers get a stable handle for lifecycle symmetry without loading WASM.
 */
export async function createOnnxRuntimePlaceholder(): Promise<OnnxRuntimeHandle> {
  return {
    status: 'disabled',
    async dispose() {},
  };
}

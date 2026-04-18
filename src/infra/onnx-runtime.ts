/**
 * Sole approved ONNX Runtime entry from app/ui (see eslint `no-restricted-imports`).
 * Session creation uses `onnxruntime-web/all` in `ort-session-factory.ts` so the WebGL EP is registered in the browser bundle.
 */

export { createOrtSession, OrtSessionError, type OrtSessionBundle } from './ort-session-factory';

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

/**
 * Sole approved entry point for `onnxruntime-web` from app/ui (see eslint `no-restricted-imports`).
 * Session creation lives in `ort-session-factory.ts` and is re-exported here for a single import seam.
 */

export {
  createOrtSession,
  OrtSessionError,
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

/**
 * Sole approved entry point for `onnxruntime-web` (see eslint `no-restricted-imports`).
 * Wire detection / embedding sessions here when the ML pipeline lands.
 */

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

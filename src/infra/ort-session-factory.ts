import * as ort from 'onnxruntime-web';

import { config } from '../config';

let wasmBaseConfigured = false;

/** Idempotent: sets jsDelivr (or vendored) WASM asset path before first ORT session. */
export function configureOrtWasmAssets(wasmBaseUrl: string = config.ortWasmBase): void {
  if (wasmBaseConfigured) return;
  ort.env.wasm.wasmPaths = wasmBaseUrl;
  console.info(`ORT WASM base: ${wasmBaseUrl}`);
  wasmBaseConfigured = true;
}

export type OrtSessionBundle = {
  session: ort.InferenceSession;
  executionProvider: string;
};

export class OrtSessionError extends Error {
  readonly name = 'OrtSessionError';

  constructor(
    message: string,
    readonly modelUrl: string,
    readonly attempts: ReadonlyArray<{ ep: string; message: string }>,
  ) {
    super(message);
  }
}

/**
 * Create an ONNX Runtime inference session, trying execution providers in order.
 */
export async function createOrtSession(
  modelUrl: string,
  preferredEPs: string[] = ['webgl', 'wasm'],
): Promise<OrtSessionBundle> {
  configureOrtWasmAssets();
  const attempts: { ep: string; message: string }[] = [];
  const createOptionsBase = { graphOptimizationLevel: 'all' as const };

  for (const ep of preferredEPs) {
    try {
      const session = await ort.InferenceSession.create(modelUrl, {
        ...createOptionsBase,
        executionProviders: [ep],
      });
      return { session, executionProvider: ep };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attempts.push({ ep, message });
      console.warn(`[ORT] EP "${ep}" failed for ${modelUrl}: ${message}`);
    }
  }

  throw new OrtSessionError(
    `Failed to create ORT session for ${modelUrl} with providers [${preferredEPs.join(', ')}]`,
    modelUrl,
    attempts,
  );
}

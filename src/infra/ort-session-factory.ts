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

/** Vitest / Node: reset so `configureOrtWasmAssets(fileBase)` can run before first session. */
export function resetOrtWasmConfigForTests(): void {
  wasmBaseConfigured = false;
}

export type OrtSessionBundle = {
  session: ort.InferenceSession;
  executionProvider: string;
};

export type OrtModelSource = string | Uint8Array;

export class OrtSessionError extends Error {
  readonly name = 'OrtSessionError';

  constructor(
    message: string,
    readonly modelLabel: string,
    readonly attempts: ReadonlyArray<{ ep: string; message: string }>,
  ) {
    super(message);
  }
}

function describeModelSource(source: OrtModelSource): string {
  return typeof source === 'string' ? source : '<binary>';
}

/**
 * Create an ONNX Runtime inference session, trying execution providers in order.
 */
export async function createOrtSession(
  modelSource: OrtModelSource,
  preferredEPs: string[] = ['webgl', 'wasm'],
): Promise<OrtSessionBundle> {
  configureOrtWasmAssets();
  const label = describeModelSource(modelSource);
  const attempts: { ep: string; message: string }[] = [];
  const createOptionsBase = { graphOptimizationLevel: 'all' as const };

  for (const ep of preferredEPs) {
    try {
      const session = await ort.InferenceSession.create(modelSource, {
        ...createOptionsBase,
        executionProviders: [ep],
      });
      return { session, executionProvider: ep };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attempts.push({ ep, message });
      console.warn(`[ORT] EP "${ep}" failed for ${label}: ${message}`);
    }
  }

  throw new OrtSessionError(
    `Failed to create ORT session for ${label} with providers [${preferredEPs.join(', ')}]`,
    label,
    attempts,
  );
}

/**
 * Default `onnxruntime-web` resolves to a slim bundle without the WebGL EP
 * ("[webgl] backend not found"). Use `/all` so `executionProviders: ['webgl']` is available.
 * @see https://github.com/microsoft/onnxruntime/tree/main/js/onnxruntime-web#usage
 *
 * **WASM ownership:** main-thread detectors/embedders call `configureOrtWasmAssets` via
 * `createOrtSession`. The YOLO dedicated worker (`yolo-detector.worker.ts`) configures WASM
 * and sessions **in the worker global** — separate from the main thread.
 */
import * as ort from 'onnxruntime-web/all';

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
 * @param preferredEPs - Caller supplies order (e.g. {@link ORT_EP_ORDER_BROWSER} from `ort-execution-defaults`).
 */
export async function createOrtSession(
  modelSource: OrtModelSource,
  preferredEPs: string[],
  /** When set, configures WASM paths before session creation (falls back to `config.ortWasmBase`). */
  wasmAssetsBaseUrl?: string,
): Promise<OrtSessionBundle> {
  configureOrtWasmAssets(wasmAssetsBaseUrl);
  const label = describeModelSource(modelSource);
  const attempts: { ep: string; message: string }[] = [];
  const createOptionsBase = { graphOptimizationLevel: 'all' as const };

  for (const ep of preferredEPs) {
    try {
      // Ort accepts URL string or Uint8Array; overload typing is narrowed per call site.
      const session =
        typeof modelSource === 'string'
          ? await ort.InferenceSession.create(modelSource, {
              ...createOptionsBase,
              executionProviders: [ep],
            })
          : await ort.InferenceSession.create(modelSource, {
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

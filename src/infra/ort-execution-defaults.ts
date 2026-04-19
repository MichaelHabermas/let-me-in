/**
 * Default ONNX Runtime execution provider **order** (caller passes into `createOrtSession`).
 * No `process.env` — composition root / tests choose explicitly.
 */

/** Real browsers: WebGPU when available, else WASM (see ort-session-factory for YOLO/WebGL notes). */
export const ORT_EP_ORDER_BROWSER = ['webgpu', 'wasm'] as const;

/** Vitest / Node: WASM first; WebGL second for EP fallback in the slim `onnxruntime-web` test bundle. */
export const ORT_EP_ORDER_NODE_TEST = ['wasm', 'webgl'] as const;

/**
 * Epic 4 embedding path (ORT + w600k_mbf) for Epic 6.
 */

const ort = globalThis.ort;

const ORT_CDN_VER = "1.22.0";
const ORT_DIST = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_CDN_VER}/dist`;
const MODEL_URL = new URL("./models/w600k_mbf.onnx", import.meta.url).href;

export const INPUT_NAME = "input.1";
export const EMBED_DIM = 512;

export function configureOrtEnv() {
  ort.env.logLevel = "warning";
  ort.env.wasm.wasmPaths = {
    mjs: `${ORT_DIST}/ort-wasm-simd-threaded.mjs`,
    wasm: `${ORT_DIST}/ort-wasm-simd-threaded.wasm`,
  };
  ort.env.wasm.numThreads = 1;
}

export async function createEmbedSession() {
  configureOrtEnv();
  const createOpts = {
    executionProviders: ["webgl", "wasm"],
    graphOptimizationLevel: "all",
  };
  try {
    return await ort.InferenceSession.create(MODEL_URL, createOpts);
  } catch {
    return await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
  }
}

export function imageDataToNCHW112InsightFace(img) {
  const { data, width, height } = img;
  if (width !== 112 || height !== 112) {
    throw new Error(`Expected 112×112 ImageData, got ${width}×${height}`);
  }
  const out = new Float32Array(1 * 3 * 112 * 112);
  const plane = 112 * 112;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const idx = y * width + x;
      out[idx] = (r - 127.5) / 127.5;
      out[plane + idx] = (g - 127.5) / 127.5;
      out[2 * plane + idx] = (b - 127.5) / 127.5;
    }
  }
  return new ort.Tensor("float32", out, [1, 3, 112, 112]);
}

export function l2NormalizeFlat(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

/**
 * @param {import("onnxruntime-web").InferenceSession} session
 * @param {ImageData} imageData112
 * @returns {Promise<Float32Array>} L2-normalized 512-d
 */
export async function embedImageData(session, imageData112) {
  const input = imageDataToNCHW112InsightFace(imageData112);
  const out = await session.run({ [INPUT_NAME]: input });
  const name = session.outputNames[0];
  const pred = out[name];
  const flat = Float32Array.from(pred.data);
  return l2NormalizeFlat(flat);
}

export async function loadImageUrl(url) {
  const im = new Image();
  im.crossOrigin = "anonymous";
  im.decoding = "async";
  im.src = url;
  await im.decode();
  return im;
}

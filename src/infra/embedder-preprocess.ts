/** InsightFace 112² RGB input — no ONNX / ORT imports. */

export const EMBEDDER_INPUT_SIZE = 112;

/**
 * NCHW RGB float32, `(pixel - 127.5) / 127.5` per PRE-WORK [PROVEN].
 */
export function toEmbedderTensor(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  if (width !== EMBEDDER_INPUT_SIZE || height !== EMBEDDER_INPUT_SIZE) {
    throw new Error(
      `toEmbedderTensor: expected ${EMBEDDER_INPUT_SIZE}×${EMBEDDER_INPUT_SIZE}, got ${width}×${height}`,
    );
  }
  const plane = EMBEDDER_INPUT_SIZE * EMBEDDER_INPUT_SIZE;
  const out = new Float32Array(3 * plane);
  for (let y = 0; y < EMBEDDER_INPUT_SIZE; y++) {
    for (let x = 0; x < EMBEDDER_INPUT_SIZE; x++) {
      const i = (y * EMBEDDER_INPUT_SIZE + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const idx = y * EMBEDDER_INPUT_SIZE + x;
      out[idx] = (r - 127.5) / 127.5;
      out[plane + idx] = (g - 127.5) / 127.5;
      out[2 * plane + idx] = (b - 127.5) / 127.5;
    }
  }
  return out;
}

import * as ort from 'onnxruntime-web';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
ort.env.wasm.wasmPaths = path.join(root, 'node_modules/onnxruntime-web/dist/');
const buf = readFileSync(path.join(root, 'public/models/yolov9t.onnx'));
const s = await ort.InferenceSession.create(buf, {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
});
const rnd = new Float32Array(1 * 3 * 640 * 640);
for (let k = 0; k < rnd.length; k++) rnd[k] = Math.random();
const input = new ort.Tensor('float32', rnd, [1, 3, 640, 640]);
const out = await s.run({ images: input });
const d = out.predictions.data;
let minC = 1e9,
  maxC = -1e9;
for (let o = 4 * 8400; o < 84 * 8400; o++) {
  const v = d[o];
  if (v < minC) minC = v;
  if (v > maxC) maxC = v;
}
console.log('class channels raw min', minC, 'max', maxC);
await s.release();

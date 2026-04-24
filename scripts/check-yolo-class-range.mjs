import * as ort from 'onnxruntime-web';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
ort.env.wasm.wasmPaths = path.join(root, 'node_modules/onnxruntime-web/dist/');
const buf = readFileSync(path.join(root, 'public/models/yolov8n-face.onnx'));
const s = await ort.InferenceSession.create(buf, {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
});
const on = s.outputNames[0];
if (on !== 'output0') console.warn('expected output0, got', on);
const rnd = new Float32Array(1 * 3 * 640 * 640);
for (let k = 0; k < rnd.length; k++) rnd[k] = Math.random();
const input = new ort.Tensor('float32', rnd, [1, 3, 640, 640]);
const out = await s.run({ images: input });
const t = out[on];
const d = t.data;
let minC = 1e9,
  maxC = -1e9;
// Single face-class channel: row index 4 in [1,5,8400]
for (let o = 4 * 8400; o < 5 * 8400; o++) {
  const v = d[o];
  if (v < minC) minC = v;
  if (v > maxC) maxC = v;
}
console.log('face class channel raw min', minC, 'max', maxC);
await s.release();

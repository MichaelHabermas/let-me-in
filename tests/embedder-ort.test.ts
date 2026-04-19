import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import { getEmbedderRuntimeSettings } from '../src/config';
import {
  createFaceEmbedder,
  EMBEDDER_DIM,
  EMBEDDER_INPUT_SIZE,
  toEmbedderTensor,
} from '../src/infra/embedder-ort';
import { configureOrtWasmAssets, resetOrtWasmConfigForTests } from '../src/infra/ort-session-factory';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('toEmbedderTensor (E4.S1.F2.T3)', () => {
  it('produces CHW length 1*3*112*112 with values in roughly [-1, 1]', () => {
    const data = new Uint8ClampedArray(EMBEDDER_INPUT_SIZE * EMBEDDER_INPUT_SIZE * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 0;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
    const img = {
      width: EMBEDDER_INPUT_SIZE,
      height: EMBEDDER_INPUT_SIZE,
      data,
      colorSpace: 'srgb',
    } as unknown as ImageData;
    const t = toEmbedderTensor(img);
    const plane = EMBEDDER_INPUT_SIZE * EMBEDDER_INPUT_SIZE;
    expect(t.length).toBe(1 * 3 * plane);
    expect(t[0]).toBeCloseTo((255 - 127.5) / 127.5, 5);
    expect(t[plane]).toBeCloseTo((0 - 127.5) / 127.5, 5);
    expect(t[2 * plane]).toBeCloseTo((128 - 127.5) / 127.5, 5);
  });
});

describe('createFaceEmbedder integration (E4.S1.F3.T1)', () => {
  beforeAll(() => {
    resetOrtWasmConfigForTests();
    const dist = path.join(repoRoot, 'node_modules/onnxruntime-web/dist');
    configureOrtWasmAssets(pathToFileURL(`${dist}/`).href);
  });

  it(
    'loads w600k_mbf and infer returns 512-d float32',
    { timeout: 120_000 },
    async () => {
      const modelPath = path.join(repoRoot, 'public/models/w600k_mbf.onnx');
      const modelBytes = new Uint8Array(readFileSync(modelPath));
      const emb = createFaceEmbedder(getEmbedderRuntimeSettings(), { modelBytes });
      await emb.load();
      const chw = new Float32Array(3 * EMBEDDER_INPUT_SIZE * EMBEDDER_INPUT_SIZE);
      const out = await emb.infer(chw);
      expect(out.length).toBe(EMBEDDER_DIM);
      expect(out.every((x) => Number.isFinite(x))).toBe(true);
      await emb.dispose();
    },
  );
});

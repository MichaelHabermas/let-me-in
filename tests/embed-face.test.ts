import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import { embedFace } from '../src/app/pipeline';
import { getEmbedderRuntimeSettings } from '../src/config';
import { createFaceEmbedder } from '../src/infra/embedder-ort';
import { configureOrtWasmAssets, resetOrtWasmConfigForTests } from '../src/infra/ort-session-factory';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('embedFace (E4.S1.F3.T3)', () => {
  beforeAll(() => {
    resetOrtWasmConfigForTests();
    const dist = path.join(repoRoot, 'node_modules/onnxruntime-web/dist');
    configureOrtWasmAssets(pathToFileURL(`${dist}/`).href);
  });

  it(
    'returns L2-normalized 512-d vector from live ONNX',
    { timeout: 120_000 },
    async () => {
      const modelPath = path.join(repoRoot, 'public/models/w600k_mbf.onnx');
      const modelBytes = new Uint8Array(readFileSync(modelPath));
      const emb = createFaceEmbedder(getEmbedderRuntimeSettings(), { modelBytes });
      await emb.load();
      const frame = new ImageData(256, 256);
      for (let i = 0; i < frame.data.length; i += 4) {
        frame.data[i] = 120;
        frame.data[i + 1] = 90;
        frame.data[i + 2] = 70;
        frame.data[i + 3] = 255;
      }
      const out = await embedFace(frame, [80, 80, 200, 200], emb);
      expect(out.length).toBe(512);
      let sumSq = 0;
      for (let i = 0; i < out.length; i++) sumSq += out[i]! * out[i]!;
      expect(sumSq).toBeCloseTo(1, 4);
      await emb.dispose();
    },
  );
});

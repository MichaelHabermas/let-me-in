import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import { getEmbedderRuntimeSettings } from '../src/config';
import { createFaceEmbedder, EMBEDDER_DIM } from '../src/infra/embedder-ort';
import { EMBEDDER_INPUT_SIZE } from '../src/infra/embedder-preprocess';
import { ORT_EP_ORDER_NODE_TEST } from '../src/infra/ort-execution-defaults';
import { configureOrtWasmAssets, resetOrtWasmConfigForTests } from '../src/infra/ort-session-factory';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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
      const emb = createFaceEmbedder(
        {
          ...getEmbedderRuntimeSettings(),
          preferredExecutionProviders: [...ORT_EP_ORDER_NODE_TEST],
        },
        { modelBytes },
      );
      await emb.load();
      const chw = new Float32Array(3 * EMBEDDER_INPUT_SIZE * EMBEDDER_INPUT_SIZE);
      const out = await emb.infer(chw);
      expect(out.length).toBe(EMBEDDER_DIM);
      expect(out.every((x) => Number.isFinite(x))).toBe(true);
      await emb.dispose();
    },
  );
});

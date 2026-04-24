import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import { getDetectorRuntimeSettings } from '../src/config';
import {
  computeLetterboxMeta,
  decodeYoloPredictions,
  preprocessToChwFloat,
} from '../src/infra/detector-core';
import { createYoloDetector } from '../src/infra/detector-ort';
import { ORT_EP_ORDER_NODE_TEST } from '../src/infra/ort-execution-defaults';
import { configureOrtWasmAssets, resetOrtWasmConfigForTests } from '../src/infra/ort-session-factory';
import { minimalImageDataStub } from './support/synthetic-image-data';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('preprocessToChwFloat (E3.S1.F2.T2)', () => {
  it('1280×720 ImageData yields CHW tensor length 1*3*640*640', () => {
    const img = minimalImageDataStub(1280, 720);
    const { tensorData, meta } = preprocessToChwFloat(img);
    expect(tensorData.length).toBe(3 * 640 * 640);
    expect(meta.srcW).toBe(1280);
    expect(meta.srcH).toBe(720);
    expect(meta.ratio).toBeCloseTo(0.5, 5);
    expect(meta.padY).toBeCloseTo(140, 5);
    expect(meta.padX).toBe(0);
  });
});

describe('decodeYoloPredictions (E3 / E13 YOLOv8n-face [1,5,8400])', () => {
  it('returns no boxes when face class logit is low for every anchor', () => {
    const meta = computeLetterboxMeta(1280, 720);
    const buf = new Float32Array(5 * 8400);
    for (let j = 0; j < 8400; j++) {
      buf[0 * 8400 + j] = 100;
      buf[1 * 8400 + j] = 100;
      buf[2 * 8400 + j] = 20;
      buf[3 * 8400 + j] = 20;
      buf[4 * 8400 + j] = -10;
    }
    expect(decodeYoloPredictions(buf, meta).length).toBe(0);
  });

  it('returns one face box in source space for synthetic high-confidence anchor', () => {
    const meta = computeLetterboxMeta(1280, 720);
    const buf = new Float32Array(5 * 8400);
    for (let j = 0; j < 8400; j++) {
      buf[4 * 8400 + j] = -10;
    }
    const i = 4200;
    buf[4 * 8400 + i] = 10;
    buf[0 * 8400 + i] = 320;
    buf[1 * 8400 + i] = 320;
    buf[2 * 8400 + i] = 200;
    buf[3 * 8400 + i] = 400;

    const dets = decodeYoloPredictions(buf, meta);
    expect(dets.length).toBe(1);
    const [x1, y1, x2, y2] = dets[0]!.bbox;
    expect(dets[0]!.classId).toBe(0);
    expect(dets[0]!.confidence).toBeGreaterThan(0.35);
    expect(x1).toBeGreaterThanOrEqual(0);
    expect(y1).toBeGreaterThanOrEqual(0);
    expect(x2).toBeLessThanOrEqual(1280);
    expect(y2).toBeLessThanOrEqual(720);
  });
});

describe('createYoloDetector integration (E3.S1.F2.T3)', () => {
  beforeAll(() => {
    resetOrtWasmConfigForTests();
    const dist = path.join(repoRoot, 'node_modules/onnxruntime-web/dist');
    configureOrtWasmAssets(pathToFileURL(`${dist}/`).href);
  });

  it(
    'loads yolov8n-face and infer returns finite bboxes',
    { timeout: 120_000 },
    async () => {
      const modelPath = path.join(repoRoot, 'public/models/yolov8n-face.onnx');
      const modelBytes = new Uint8Array(readFileSync(modelPath));
      const det = createYoloDetector(
        {
          ...getDetectorRuntimeSettings(),
          preferredExecutionProviders: [...ORT_EP_ORDER_NODE_TEST],
        },
        { modelBytes },
      );
      await det.load();
      const img = minimalImageDataStub(640, 480);
      for (let p = 0; p < img.data.length; p += 4) {
        img.data[p] = 40;
        img.data[p + 1] = 80;
        img.data[p + 2] = 120;
        img.data[p + 3] = 255;
      }
      const out = await det.infer(img);
      expect(Array.isArray(out)).toBe(true);
      for (const d of out) {
        expect(Number.isFinite(d.bbox[0])).toBe(true);
        expect(d.confidence).toBeGreaterThanOrEqual(0);
        expect(d.confidence).toBeLessThanOrEqual(1);
      }
      await det.dispose();
    },
  );
});

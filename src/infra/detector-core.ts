/**
 * Pure YOLO preprocess + decode (no ORT). Safe to import from a Web Worker.
 */

import { sampleRgbBilinear888 } from './sample-rgb-bilinear';
import { f32At } from './typed-index';

/** Model-space bbox [x1,y1,x2,y2] on letterboxed 640 input, then mapped to source pixels. */
export type Detection = {
  bbox: [number, number, number, number];
  confidence: number;
  classId: number;
};

/** ONNX-backed face/person detector (main thread or worker). */
export type YoloDetector = {
  load(): Promise<void>;
  infer(imageData: ImageData): Promise<Detection[]>;
  dispose(): Promise<void>;
};

const INPUT_SIZE = 640;
const PERSON_CLASS = 0;
const CONF_THRESHOLD = 0.35;
const TOP_CLASS_MARGIN = 0.08;
const NMS_IOU = 0.45;
const HEAD_BAND = 1 / 3;
/** Skip COCO “person” boxes that are extreme slivers (often background false positives). */
const MAX_PERSON_ASPECT = 4;

export type LetterboxMeta = {
  ratio: number;
  padX: number;
  padY: number;
  srcW: number;
  srcH: number;
};

export function computeLetterboxMeta(srcW: number, srcH: number): LetterboxMeta {
  const ratio = Math.min(INPUT_SIZE / srcW, INPUT_SIZE / srcH);
  const nw = Math.round(srcW * ratio);
  const nh = Math.round(srcH * ratio);
  const padX = (INPUT_SIZE - nw) / 2;
  const padY = (INPUT_SIZE - nh) / 2;
  return { ratio, padX, padY, srcW, srcH };
}

const PAD_COLOR = 114 / 255;
const INV_RGB = 1 / 255;

export function preprocessToChwFloat(imageData: ImageData): {
  tensorData: Float32Array;
  meta: LetterboxMeta;
} {
  const { width: srcW, height: srcH, data } = imageData;
  const meta = computeLetterboxMeta(srcW, srcH);
  const { ratio, padX, padY } = meta;
  const out = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const plane = INPUT_SIZE * INPUT_SIZE;

  for (let gy = 0; gy < INPUT_SIZE; gy++) {
    for (let gx = 0; gx < INPUT_SIZE; gx++) {
      const xs = (gx - padX) / ratio;
      const ys = (gy - padY) / ratio;
      let r: number;
      let g: number;
      let b: number;
      if (xs < 0 || ys < 0 || xs >= srcW - 0.001 || ys >= srcH - 0.001) {
        r = g = b = PAD_COLOR;
      } else {
        const [br, bg, bb] = sampleRgbBilinear888(data, srcW, srcH, xs, ys);
        r = br * INV_RGB;
        g = bg * INV_RGB;
        b = bb * INV_RGB;
      }
      const idx = gy * INPUT_SIZE + gx;
      out[idx] = r;
      out[plane + idx] = g;
      out[2 * plane + idx] = b;
    }
  }

  return { tensorData: out, meta };
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function classProbability(raw: number): number {
  if (raw > 1 || raw < 0) return sigmoid(raw);
  return Math.min(1, Math.max(0, raw));
}

type BoxModel = { x1: number; y1: number; x2: number; y2: number; score: number; classId: number };

function modelToSource(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  meta: LetterboxMeta,
): [number, number, number, number] {
  const { ratio, padX, padY, srcW, srcH } = meta;
  const sx1 = Math.max(0, (x1 - padX) / ratio);
  const sy1 = Math.max(0, (y1 - padY) / ratio);
  const sx2 = Math.min(srcW, (x2 - padX) / ratio);
  const sy2 = Math.min(srcH, (y2 - padY) / ratio);
  return [sx1, sy1, sx2, sy2];
}

function iou(a: BoxModel, b: BoxModel): number {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  return inter / (areaA + areaB - inter + 1e-9);
}

function nms(boxes: BoxModel[], iouThresh: number): BoxModel[] {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const keep: BoxModel[] = [];
  const suppressed = new Set<number>();
  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    const cur = sorted[i];
    if (!cur) continue;
    keep.push(cur);
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      const other = sorted[j];
      if (other && iou(cur, other) >= iouThresh) suppressed.add(j);
    }
  }
  return keep;
}

function applyHeadBand(box: BoxModel): BoxModel {
  const h = box.y2 - box.y1;
  const ny2 = box.y1 + h * HEAD_BAND;
  return { ...box, y2: ny2 };
}

function personBoxAspectOk(cx: number, cy: number, w: number, h: number): boolean {
  const bw = Math.abs(w);
  const bh = Math.abs(h);
  if (bw < 1e-3 || bh < 1e-3) return false;
  const ar = bw / bh;
  const inv = bh / bw;
  return ar <= MAX_PERSON_ASPECT && inv <= MAX_PERSON_ASPECT;
}

export function decodeYoloPredictions(predictions: Float32Array, meta: LetterboxMeta): Detection[] {
  const numAnchors = 8400;
  const numClasses = 80;
  const boxes: BoxModel[] = [];

  function decodePersonBoxForAnchor(i: number): BoxModel | null {
    const cx = f32At(predictions, i);
    const cy = f32At(predictions, numAnchors + i);
    const w = f32At(predictions, 2 * numAnchors + i);
    const h = f32At(predictions, 3 * numAnchors + i);

    if (!personBoxAspectOk(cx, cy, w, h)) return null;

    let bestC = 0;
    let bestScore = -Infinity;
    let secondScore = -Infinity;
    for (let c = 0; c < numClasses; c++) {
      const raw = f32At(predictions, (4 + c) * numAnchors + i);
      const s = classProbability(raw);
      if (s > bestScore) {
        secondScore = bestScore;
        bestScore = s;
        bestC = c;
      } else if (s > secondScore) {
        secondScore = s;
      }
    }

    if (bestC !== PERSON_CLASS || bestScore < CONF_THRESHOLD) return null;
    if (bestScore - secondScore < TOP_CLASS_MARGIN) return null;

    const x1 = cx - w / 2;
    const y1 = cy - h / 2;
    const x2 = cx + w / 2;
    const y2 = cy + h / 2;

    const person: BoxModel = { x1, y1, x2, y2, score: bestScore, classId: PERSON_CLASS };
    const banded = applyHeadBand(person);
    const [sx1, sy1, sx2, sy2] = modelToSource(banded.x1, banded.y1, banded.x2, banded.y2, meta);
    return {
      x1: sx1,
      y1: sy1,
      x2: sx2,
      y2: sy2,
      score: bestScore,
      classId: PERSON_CLASS,
    };
  }

  for (let i = 0; i < numAnchors; i++) {
    const box = decodePersonBoxForAnchor(i);
    if (box) boxes.push(box);
  }

  const kept = nms(boxes, NMS_IOU);
  return kept.map((b) => {
    const bbox: [number, number, number, number] = [b.x1, b.y1, b.x2, b.y2];
    return {
      bbox,
      confidence: b.score,
      classId: b.classId,
    };
  });
}

export const DETECTOR_INPUT_SIZE = INPUT_SIZE;

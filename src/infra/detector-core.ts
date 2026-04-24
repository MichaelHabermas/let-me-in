/**
 * Pure YOLO preprocess + decode (no ORT). Safe to import from a Web Worker.
 */

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

function sampleRgb(
  data: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  x: number,
  y: number,
): [number, number, number] {
  const x0 = Math.max(0, Math.min(srcW - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(srcH - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(srcW - 1, Math.ceil(x)));
  const y1 = Math.max(0, Math.min(srcH - 1, Math.ceil(y)));
  const fx = x - x0;
  const fy = y - y0;
  const i00 = (y0 * srcW + x0) * 4;
  const i10 = (y0 * srcW + x1) * 4;
  const i01 = (y1 * srcW + x0) * 4;
  const i11 = (y1 * srcW + x1) * 4;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const r = lerp(lerp(data[i00], data[i10], fx), lerp(data[i01], data[i11], fx), fy) / 255;
  const g =
    lerp(lerp(data[i00 + 1], data[i10 + 1], fx), lerp(data[i01 + 1], data[i11 + 1], fx), fy) / 255;
  const b =
    lerp(lerp(data[i00 + 2], data[i10 + 2], fx), lerp(data[i01 + 2], data[i11 + 2], fx), fy) / 255;
  return [r, g, b];
}

const PAD_COLOR = 114 / 255;

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
        [r, g, b] = sampleRgb(data, srcW, srcH, xs, ys);
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

  for (let i = 0; i < numAnchors; i++) {
    const cx = predictions[0 * numAnchors + i];
    const cy = predictions[1 * numAnchors + i];
    const w = predictions[2 * numAnchors + i];
    const h = predictions[3 * numAnchors + i];

    if (!personBoxAspectOk(cx, cy, w, h)) continue;

    let bestC = 0;
    let bestScore = -Infinity;
    let secondScore = -Infinity;
    for (let c = 0; c < numClasses; c++) {
      const raw = predictions[(4 + c) * numAnchors + i];
      const s = classProbability(raw);
      if (s > bestScore) {
        secondScore = bestScore;
        bestScore = s;
        bestC = c;
      } else if (s > secondScore) {
        secondScore = s;
      }
    }

    if (bestC !== PERSON_CLASS || bestScore < CONF_THRESHOLD) continue;
    if (bestScore - secondScore < TOP_CLASS_MARGIN) continue;

    const x1 = cx - w / 2;
    const y1 = cy - h / 2;
    const x2 = cx + w / 2;
    const y2 = cy + h / 2;

    const person: BoxModel = { x1, y1, x2, y2, score: bestScore, classId: PERSON_CLASS };
    const banded = applyHeadBand(person);
    const [sx1, sy1, sx2, sy2] = modelToSource(banded.x1, banded.y1, banded.x2, banded.y2, meta);
    boxes.push({
      x1: sx1,
      y1: sy1,
      x2: sx2,
      y2: sy2,
      score: bestScore,
      classId: PERSON_CLASS,
    });
  }

  const kept = nms(boxes, NMS_IOU);
  return kept.map((b) => ({
    bbox: [b.x1, b.y1, b.x2, b.y2] as [number, number, number, number],
    confidence: b.score,
    classId: b.classId,
  }));
}

export const DETECTOR_INPUT_SIZE = INPUT_SIZE;

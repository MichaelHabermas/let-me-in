/**
 * YOLOv8n-face output decode + NMS (no ORT). Safe for Web Worker.
 * Model head: [1, 5, 8400] = cx, cy, w, h, face class logit; input `images` 640×640.
 */

import type { Detection, LetterboxMeta } from './detector-core-types';
import {
  DETECTOR_NUM_ANCHORS,
  DETECTOR_OUTPUT_CHANNELS,
  FACE_CLASS_ID,
} from './detector-core-types';
import { f32At } from './typed-index';

const CONF_THRESHOLD = 0.35;
const NMS_IOU = 0.45;
/** Reject person-shaped slivers; face boxes are usually not extreme bars. */
const MAX_FACE_ASPECT = 3;

type BoxModel = { x1: number; y1: number; x2: number; y2: number; score: number; classId: number };

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function classProbability(raw: number): number {
  if (raw > 1 || raw < 0) return sigmoid(raw);
  return Math.min(1, Math.max(0, raw));
}

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

function faceBoxShapeOk(w: number, h: number): boolean {
  const bw = Math.abs(w);
  const bh = Math.abs(h);
  if (bw < 1e-3 || bh < 1e-3) return false;
  const ar = bw / bh;
  const inv = bh / bw;
  return ar <= MAX_FACE_ASPECT && inv <= MAX_FACE_ASPECT;
}

function decodeFaceBoxForAnchor(
  predictions: Float32Array,
  meta: LetterboxMeta,
  i: number,
  numAnchors: number,
): BoxModel | null {
  const cx = f32At(predictions, i);
  const cy = f32At(predictions, numAnchors + i);
  const w = f32At(predictions, 2 * numAnchors + i);
  const h = f32At(predictions, 3 * numAnchors + i);
  if (!faceBoxShapeOk(w, h)) return null;
  const raw = f32At(predictions, (4 + FACE_CLASS_ID) * numAnchors + i);
  const bestScore = classProbability(raw);
  if (bestScore < CONF_THRESHOLD) return null;
  const x1 = cx - w / 2;
  const y1 = cy - h / 2;
  const x2 = cx + w / 2;
  const y2 = cy + h / 2;
  const face: BoxModel = { x1, y1, x2, y2, score: bestScore, classId: FACE_CLASS_ID };
  const [sx1, sy1, sx2, sy2] = modelToSource(face.x1, face.y1, face.x2, face.y2, meta);
  return {
    x1: sx1,
    y1: sy1,
    x2: sx2,
    y2: sy2,
    score: bestScore,
    classId: FACE_CLASS_ID,
  };
}

/**
 * Decodes a YOLOv8 single-class face head `float32 [5, 8400]` in row order (5×8400) — same
 * memory layout as ONNX `[1,5,8400]`.
 */
export function decodeYoloPredictions(predictions: Float32Array, meta: LetterboxMeta): Detection[] {
  const numAnchors = DETECTOR_NUM_ANCHORS;
  if (predictions.length < numAnchors * DETECTOR_OUTPUT_CHANNELS) {
    throw new Error(
      `detector head too short: length ${predictions.length}, need ${numAnchors * DETECTOR_OUTPUT_CHANNELS}`,
    );
  }
  const boxes: BoxModel[] = [];
  for (let i = 0; i < numAnchors; i++) {
    const box = decodeFaceBoxForAnchor(predictions, meta, i, numAnchors);
    if (box) boxes.push(box);
  }
  const kept = nms(boxes, NMS_IOU);
  return kept.map((b) => {
    const bbox: [number, number, number, number] = [b.x1, b.y1, b.x2, b.y2];
    return { bbox, confidence: b.score, classId: b.classId };
  });
}

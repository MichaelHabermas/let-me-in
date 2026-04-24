import type { Detection } from '../infra/detector-core';

const INSET_FRACTION = 0.12;

/** One high-confidence face box inset from the frame edges (stable for crop/embed in E2E stubs). */
export function e2eSingleFaceDetections(frame: ImageData): Detection[] {
  const { width: w, height: h } = frame;
  const inset = Math.round(Math.min(w, h) * INSET_FRACTION);
  const bbox: [number, number, number, number] = [inset, inset, w - inset, h - inset];
  return [{ bbox, confidence: 0.99, classId: 0 }];
}

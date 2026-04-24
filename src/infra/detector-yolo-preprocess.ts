/**
 * Letterbox + CHW float preprocess for YOLO input. No ORT — safe for Web Worker.
 */

import { sampleRgbBilinear888 } from './sample-rgb-bilinear';
import { DETECTOR_INPUT_SIZE, type LetterboxMeta } from './detector-core-types';

const PAD_COLOR = 114 / 255;
const INV_RGB = 1 / 255;

export function computeLetterboxMeta(srcW: number, srcH: number): LetterboxMeta {
  const ratio = Math.min(DETECTOR_INPUT_SIZE / srcW, DETECTOR_INPUT_SIZE / srcH);
  const nw = Math.round(srcW * ratio);
  const nh = Math.round(srcH * ratio);
  const padX = (DETECTOR_INPUT_SIZE - nw) / 2;
  const padY = (DETECTOR_INPUT_SIZE - nh) / 2;
  return { ratio, padX, padY, srcW, srcH };
}

export function preprocessToChwFloat(imageData: ImageData): {
  tensorData: Float32Array;
  meta: LetterboxMeta;
} {
  const { width: srcW, height: srcH, data } = imageData;
  const meta = computeLetterboxMeta(srcW, srcH);
  const { ratio, padX, padY } = meta;
  const out = new Float32Array(3 * DETECTOR_INPUT_SIZE * DETECTOR_INPUT_SIZE);
  const plane = DETECTOR_INPUT_SIZE * DETECTOR_INPUT_SIZE;

  for (let gy = 0; gy < DETECTOR_INPUT_SIZE; gy++) {
    for (let gx = 0; gx < DETECTOR_INPUT_SIZE; gx++) {
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
      const idx = gy * DETECTOR_INPUT_SIZE + gx;
      out[idx] = r;
      out[plane + idx] = g;
      out[2 * plane + idx] = b;
    }
  }

  return { tensorData: out, meta };
}

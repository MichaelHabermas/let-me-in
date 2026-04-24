/**
 * Face crop utilities — canvas pixel space, origin top-left (matches detector bboxes).
 */

import { u8At } from '../infra/typed-index';

export type Bbox = [number, number, number, number];

/**
 * Square crop centered on `bbox` using `max(w,h)` with symmetric margin on that extent.
 * Origin is clamped to image bounds; crop side is clamped so the region fits the frame.
 */
export function squareCropWithMargin(imageData: ImageData, bbox: Bbox, marginPct = 0.1): ImageData {
  const { width: W, height: H, data: src } = imageData;
  const [x1, y1, x2, y2] = bbox;
  const bw = Math.max(0, x2 - x1);
  const bh = Math.max(0, y2 - y1);
  const base = Math.max(bw, bh);
  if (base < 1e-6) {
    return new ImageData(1, 1);
  }

  let side = base * (1 + 2 * marginPct);
  side = Math.min(side, W, H);

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  let left = Math.round(cx - side / 2);
  let top = Math.round(cy - side / 2);

  left = Math.max(0, Math.min(left, W - side));
  top = Math.max(0, Math.min(top, H - side));

  const iSide = Math.max(1, Math.floor(side));
  const out = new ImageData(iSide, iSide);
  const dst = out.data;

  for (let y = 0; y < iSide; y++) {
    for (let x = 0; x < iSide; x++) {
      const sx = Math.min(W - 1, Math.max(0, Math.floor(left + x)));
      const sy = Math.min(H - 1, Math.max(0, Math.floor(top + y)));
      const si = (sy * W + sx) * 4;
      const di = (y * iSide + x) * 4;
      dst[di] = u8At(src, si);
      dst[di + 1] = u8At(src, si + 1);
      dst[di + 2] = u8At(src, si + 2);
      dst[di + 3] = 255;
    }
  }

  return out;
}

function sampleRgbBilinear(
  data: Uint8ClampedArray,
  sw: number,
  sh: number,
  x: number,
  y: number,
): [number, number, number] {
  const x0 = Math.max(0, Math.min(sw - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(sh - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(sw - 1, Math.ceil(x)));
  const y1 = Math.max(0, Math.min(sh - 1, Math.ceil(y)));
  const fx = x - x0;
  const fy = y - y0;
  const i00 = (y0 * sw + x0) * 4;
  const i10 = (y0 * sw + x1) * 4;
  const i01 = (y1 * sw + x0) * 4;
  const i11 = (y1 * sw + x1) * 4;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const r = lerp(
    lerp(u8At(data, i00), u8At(data, i10), fx),
    lerp(u8At(data, i01), u8At(data, i11), fx),
    fy,
  );
  const g = lerp(
    lerp(u8At(data, i00 + 1), u8At(data, i10 + 1), fx),
    lerp(u8At(data, i01 + 1), u8At(data, i11 + 1), fx),
    fy,
  );
  const b = lerp(
    lerp(u8At(data, i00 + 2), u8At(data, i10 + 2), fx),
    lerp(u8At(data, i01 + 2), u8At(data, i11 + 2), fx),
    fy,
  );
  return [r, g, b];
}

const EMBED = 112;

/** Uniform bilinear scale to 112×112 (InsightFace embedder input). Pure pixels — no Canvas 2D dependency. */
export function resizeTo112(imageData: ImageData): ImageData {
  const { width: sw, height: sh, data: src } = imageData;
  const out = new ImageData(EMBED, EMBED);
  const dst = out.data;
  for (let y = 0; y < EMBED; y++) {
    for (let x = 0; x < EMBED; x++) {
      const sx = ((x + 0.5) * sw) / EMBED - 0.5;
      const sy = ((y + 0.5) * sh) / EMBED - 0.5;
      const [r, g, b] = sampleRgbBilinear(src, sw, sh, sx, sy);
      const di = (y * EMBED + x) * 4;
      dst[di] = Math.round(r);
      dst[di + 1] = Math.round(g);
      dst[di + 2] = Math.round(b);
      dst[di + 3] = 255;
    }
  }
  return out;
}

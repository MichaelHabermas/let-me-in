/**
 * Epic 3 crop helpers (copied for Epic 6 spike).
 */

export const EMBED_HW = 112;
export const MARGIN_FRAC = 0.1;

export function clampCropToImageBounds(b, imgW, imgH) {
  let x = Math.round(b.x);
  let y = Math.round(b.y);
  let w = Math.round(b.w);
  let h = Math.round(b.h);

  if (w <= 0 || h <= 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  if (x < 0) {
    w += x;
    x = 0;
  }
  if (y < 0) {
    h += y;
    y = 0;
  }
  if (x >= imgW || y >= imgH) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  w = Math.min(w, imgW - x);
  h = Math.min(h, imgH - y);
  if (w <= 0 || h <= 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  return { x, y, w, h };
}

export function applyMarginFrac(inner, imgW, imgH, frac) {
  const m = frac * Math.max(inner.w, inner.h);
  const cx = inner.x + inner.w / 2;
  const cy = inner.y + inner.h / 2;
  const nw = inner.w + 2 * m;
  const nh = inner.h + 2 * m;
  return clampCropToImageBounds(
    { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh },
    imgW,
    imgH,
  );
}

export function squareCropFromRect(inner, imgW, imgH) {
  if (inner.w <= 0 || inner.h <= 0) {
    return { x: 0, y: 0, side: 0 };
  }

  let side = Math.max(inner.w, inner.h);
  const cx = inner.x + inner.w / 2;
  const cy = inner.y + inner.h / 2;

  side = Math.min(side, imgW, imgH);

  let x0 = Math.round(cx - side / 2);
  let y0 = Math.round(cy - side / 2);

  if (x0 < 0) x0 = 0;
  if (y0 < 0) y0 = 0;
  if (x0 + side > imgW) x0 = imgW - side;
  if (y0 + side > imgH) y0 = imgH - side;

  return { x: x0, y: y0, side };
}

/**
 * @param {HTMLCanvasElement | OffscreenCanvas} sourceCanvas
 * @param {number} sx
 * @param {number} sy
 * @param {number} sw
 * @param {number} sh
 * @param {HTMLCanvasElement} destCanvas
 */
export function resizeToEmbedCanvas(sourceCanvas, sx, sy, sw, sh, destCanvas) {
  destCanvas.width = EMBED_HW;
  destCanvas.height = EMBED_HW;
  const dctx = destCanvas.getContext("2d");
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = "high";
  dctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, EMBED_HW, EMBED_HW);
}

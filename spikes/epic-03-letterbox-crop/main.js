/**
 * Epic 3 — synthetic bbox → margin → clamp → square crop → resize → normalize → Float32 CHW.
 * Placeholder embedder H×W until Epic 4 freezes the winner (re-run E3-T4 after).
 */

/** @type {HTMLCanvasElement} */
const canvasSrc = document.getElementById("canvas-src");
/** @type {HTMLCanvasElement} */
const canvasCrop = document.getElementById("canvas-crop");
/** @type {HTMLCanvasElement} */
const canvasEmbed = document.getElementById("canvas-embed");
const logEl = document.getElementById("log");
const fileInput = document.getElementById("file-input");

const ctxSrc = canvasSrc.getContext("2d", { willReadFrequently: true });
const ctxCrop = canvasCrop.getContext("2d", { willReadFrequently: true });
const ctxEmbed = canvasEmbed.getContext("2d", { willReadFrequently: true });

/** PLACEHOLDER — Epic 4 embedder input; re-run E3-T4 when final H×W is known. */
const EMBED_HW = 112;

/** Frozen for this spike: margin as fraction of max(w,h) before square step. */
const MARGIN_FRAC = 0.1;

function log(line) {
  const t = new Date().toISOString();
  logEl.textContent += `[${t}] ${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
  console.log(`[E3] ${line}`);
}

/**
 * Integer pixel rect, half-open style: valid indices x..x+w-1, y..y+h-1.
 * @param {{ x: number, y: number, w: number, h: number }} b
 * @param {number} imgW
 * @param {number} imgH
 */
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

/**
 * @param {{ x: number, y: number, w: number, h: number }} inner
 * @param {number} imgW
 * @param {number} imgH
 */
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

/**
 * Square crop: expand shorter side to match longer, centered on bbox center.
 * If the ideal square exceeds image bounds, reduce side to min(imgW, imgH) and clamp position.
 * @returns {{ x: number, y: number, side: number }}
 */
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
 * Resize source square to EMBED_HW×EMBED_HW (uniform scale; placeholder is square).
 */
export function resizeToEmbedCanvas(srcCanvas, sx, sy, sw, sh, destCanvas) {
  destCanvas.width = EMBED_HW;
  destCanvas.height = EMBED_HW;
  const dctx = destCanvas.getContext("2d");
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = "high";
  dctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, EMBED_HW, EMBED_HW);
}

/**
 * RGBA ImageData → Float32 CHW, RGB, [0,1] via /255.
 * Layout: R plane [0, HW), G [HW, 2HW), B [2HW, 3HW), row-major per plane.
 * @returns {{ tensor: Float32Array, chwShape: [number, number, number] }}
 */
export function imageDataToFloat32CHW(imageData) {
  const { width, height, data } = imageData;
  const hw = width * height;
  const tensor = new Float32Array(3 * hw);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const idx = y * width + x;
      tensor[idx] = data[i] / 255;
      tensor[hw + idx] = data[i + 1] / 255;
      tensor[2 * hw + idx] = data[i + 2] / 255;
    }
  }
  return { tensor, chwShape: [3, height, width] };
}

/** Optional Epic 4 hook: replace with model mean/std when known. */
export function normalizeForEmbedder(chwTensor, _shape) {
  return chwTensor;
}

export function tensorStats(chw, shape) {
  const [C, H, W] = shape;
  let minV = Infinity;
  let maxV = -Infinity;
  let sum = 0;
  const n = C * H * W;
  for (let i = 0; i < n; i++) {
    const v = chw[i];
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
    sum += v;
  }
  const mean = sum / n;
  let varSum = 0;
  for (let i = 0; i < n; i++) {
    const d = chw[i] - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / n);
  return { min: minV, max: maxV, mean, std, n };
}

/** Simple 32-bit FNV-1a hash of RGB bytes (alpha stripped) for reproducibility check. */
export function hashImageDataRGB(imageData) {
  const { data, width, height } = imageData;
  let h = 0x811c9dc5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      for (let k = 0; k < 3; k++) {
        h ^= data[i + k];
        h = Math.imul(h, 0x01000193);
      }
    }
  }
  return h >>> 0;
}

/** Primary demo bbox (non-square) in image pixel space. */
const DEMO_BBOX = { x: 10, y: 12, w: 28, h: 18 };

function runPipeline(imgW, imgH, bbox, label) {
  log(`--- ${label} ---`);
  const clamped = clampCropToImageBounds(bbox, imgW, imgH);
  log(
    `[E3-T2] clamped bbox: x=${clamped.x} y=${clamped.y} w=${clamped.w} h=${clamped.h}`,
  );

  const withMargin = applyMarginFrac(clamped, imgW, imgH, MARGIN_FRAC);
  log(
    `[margin ${MARGIN_FRAC * 100}%] after margin: x=${withMargin.x} y=${withMargin.y} w=${withMargin.w} h=${withMargin.h}`,
  );

  const sq = squareCropFromRect(withMargin, imgW, imgH);
  log(
    `[E3-T3] square: x=${sq.x} y=${sq.y} side=${sq.side} (centered expand shorter→longer; side capped by image)`,
  );

  if (sq.side <= 0) {
    log("[pipeline] degenerate square (side 0) — skip draw/tensor");
    return { clamped, withMargin, sq, stats: null };
  }

  canvasCrop.width = sq.side;
  canvasCrop.height = sq.side;
  ctxCrop.drawImage(
    canvasSrc,
    sq.x,
    sq.y,
    sq.side,
    sq.side,
    0,
    0,
    sq.side,
    sq.side,
  );

  resizeToEmbedCanvas(canvasSrc, sq.x, sq.y, sq.side, sq.side, canvasEmbed);
  log(
    `[E3-T4] embed canvas: ${canvasEmbed.width}×${canvasEmbed.height} (placeholder ${EMBED_HW}×${EMBED_HW})`,
  );

  const id = ctxEmbed.getImageData(0, 0, EMBED_HW, EMBED_HW);
  let { tensor, chwShape } = imageDataToFloat32CHW(id);
  tensor = normalizeForEmbedder(tensor, chwShape);
  const stats = tensorStats(tensor, chwShape);
  log(
    `[E3-T6] after norm: min=${stats.min.toFixed(6)} max=${stats.max.toFixed(6)} mean=${stats.mean.toFixed(6)} std=${stats.std.toFixed(6)}`,
  );
  log(
    `[E3-T5] Float32Array length=${tensor.length} CHW shape=[${chwShape.join(",")}] RGB planar CHW (provisional until Epic 4)`,
  );

  return { clamped, withMargin, sq, stats };
}

function runEdgeCaseTests(imgW, imgH) {
  log("=== E3-T2 edge cases (must not throw) ===");
  const cases = [
    { x: 0, y: 0, w: imgW, h: imgH },
    { x: -5, y: -5, w: 20, h: 20 },
    { x: imgW - 5, y: imgH - 5, w: 20, h: 20 },
    { x: 0, y: 0, w: imgW + 100, h: imgH + 100 },
    { x: 30, y: 30, w: 0, h: 10 },
    { x: 100, y: 100, w: 10, h: 10 },
  ];
  for (let i = 0; i < cases.length; i++) {
    const b = cases[i];
    const c = clampCropToImageBounds(b, imgW, imgH);
    log(`  case ${i}: in (${b.x},${b.y},${b.w},${b.h}) → (${c.x},${c.y},${c.w},${c.h})`);
  }
}

async function loadImageToCanvas(url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  canvasSrc.width = img.naturalWidth;
  canvasSrc.height = img.naturalHeight;
  ctxSrc.drawImage(img, 0, 0);
  return { w: img.naturalWidth, h: img.naturalHeight };
}

async function main() {
  log("Epic 3 spike — bbox → crop → tensor");
  let imgW;
  let imgH;

  try {
    ({ w: imgW, h: imgH } = await loadImageToCanvas(
      new URL("./test-image.png", import.meta.url).href,
    ));
  } catch (e) {
    log(`[E3-T1] FAIL: could not load test-image.png: ${e}`);
    throw e;
  }

  const srcId = ctxSrc.getImageData(0, 0, imgW, imgH);
  const h0 = hashImageDataRGB(srcId);
  log(`[E3-T1] loaded baked asset ${imgW}×${imgH}; RGB hash (FNV-1a)=0x${h0.toString(16)}`);

  runEdgeCaseTests(imgW, imgH);
  runPipeline(imgW, imgH, DEMO_BBOX, "primary pipeline");

  const srcId2 = ctxSrc.getImageData(0, 0, imgW, imgH);
  const h1 = hashImageDataRGB(srcId2);
  log(
    `[E3-T1] reproducibility: second read hash 0x${h1.toString(16)} ${h1 === h0 ? "MATCH" : "MISMATCH"}`,
  );

  fileInput?.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    try {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      canvasSrc.width = img.naturalWidth;
      canvasSrc.height = img.naturalHeight;
      ctxSrc.drawImage(img, 0, 0);
      log(`[file] loaded ${img.naturalWidth}×${img.naturalHeight} (not used for FINDINGS hash)`);
      runPipeline(img.naturalWidth, img.naturalHeight, DEMO_BBOX, "file input pipeline");
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  log("Done — see FINDINGS.md for task pass/fail and frozen conventions.");
}

main().catch((err) => {
  log(`FATAL: ${err?.message ?? err}`);
  console.error(err);
});

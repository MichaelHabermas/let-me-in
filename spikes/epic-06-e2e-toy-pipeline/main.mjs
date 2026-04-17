/**
 * Epic 6 — chain detect → crop → embed → match; timing + scores for FINDINGS.
 */

import {
  letterboxDrawImage,
  preprocessImageDataToNCHW01,
  decodeYoloV8PersonBoxes,
  nms_xyxy,
  mapBox640ToSource,
  xyxyToXywh,
  createDetectorSession,
} from "./detect.mjs";
import {
  createEmbedSession,
  embedImageData,
  loadImageUrl,
} from "./embed.mjs";
import {
  clampCropToImageBounds,
  applyMarginFrac,
  squareCropFromRect,
  resizeToEmbedCanvas,
  MARGIN_FRAC,
} from "./crop.mjs";
import { bestMatch, bandFromSimilarity01 } from "./matching.mjs";

const ort = globalThis.ort;

const logEl = document.getElementById("log");
const timingEl = document.getElementById("timing");
const canvasSrc = document.getElementById("src");
const canvasLb = document.getElementById("lb");
const canvasEmb = document.getElementById("emb");
const ctxSrc = canvasSrc.getContext("2d", { willReadFrequently: true });
const ctxLb = canvasLb.getContext("2d", { willReadFrequently: true });
const ctxEmb = canvasEmb.getContext("2d", { willReadFrequently: true });

const URL_ENROLL = new URL("./assets/same_base.jpg", import.meta.url).href;
const URL_STRANGER = new URL("./assets/person_c.jpg", import.meta.url).href;

function log(...args) {
  const line = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
  console.log(line);
  logEl.textContent += line + "\n";
}

function clearLog() {
  logEl.textContent = "";
}

function drawImageToSourceCanvas(im) {
  const w = im.naturalWidth || im.width;
  const h = im.naturalHeight || im.height;
  canvasSrc.width = w;
  canvasSrc.height = h;
  ctxSrc.drawImage(im, 0, 0);
  return { w, h };
}

function centerFallbackBox(w, h) {
  const side = Math.floor(Math.min(w, h) * 0.55);
  const cx = w / 2;
  const cy = h / 2;
  return {
    x: Math.round(cx - side / 2),
    y: Math.round(cy - side / 2),
    w: side,
    h: side,
  };
}

/**
 * COCO "person" boxes are often full-body; the face model expects a face-sized crop.
 * Use the upper ~42% of the person box as a cheap stand-in for "head area" (spike only).
 */
function headBandFromPersonXywh(box, imgW, imgH) {
  const x1 = box.x;
  const y1 = box.y;
  const bw = box.w;
  const bh = box.h;
  const nh = Math.max(8, bh * 0.42);
  return clampCropToImageBounds({ x: x1, y: y1, w: bw, h: nh }, imgW, imgH);
}

/** Slightly different crop of the same head band for Path B (same person). */
function jitterHeadBand(inner, imgW, imgH) {
  const dw = inner.w * 0.08;
  const dh = inner.h * 0.08;
  return clampCropToImageBounds(
    {
      x: inner.x + dw,
      y: inner.y + dh,
      w: inner.w - 2 * dw,
      h: inner.h - 2 * dh,
    },
    imgW,
    imgH,
  );
}

function cropPipelineTo112(imgW, imgH, bbox) {
  const inner = clampCropToImageBounds(bbox, imgW, imgH);
  const withMargin = applyMarginFrac(inner, imgW, imgH, MARGIN_FRAC);
  const sq = squareCropFromRect(withMargin, imgW, imgH);
  if (sq.side <= 0) return null;
  resizeToEmbedCanvas(canvasSrc, sq.x, sq.y, sq.side, sq.side, canvasEmb);
  return ctxEmb.getImageData(0, 0, 112, 112);
}

async function runDetectTimed(detSession, im) {
  const tLetter0 = performance.now();
  const lb = letterboxDrawImage(ctxLb, im);
  const img640 = ctxLb.getImageData(0, 0, 640, 640);
  const prep = preprocessImageDataToNCHW01(img640);
  const tInfer0 = performance.now();
  const inputName = detSession.inputNames[0];
  const feeds = {
    [inputName]: new ort.Tensor("float32", prep.tensorData, prep.shape),
  };
  const results = await detSession.run(feeds);
  const tInfer1 = performance.now();
  const outNames = detSession.outputNames;
  const pred = results.predictions ?? results[outNames[0]];
  const raw = decodeYoloV8PersonBoxes(pred, 0.52);
  const kept = nms_xyxy(raw, 0.5);
  let xywh;
  if (kept.length === 0) {
    const w = im.naturalWidth || im.width;
    const h = im.naturalHeight || im.height;
    xywh = centerFallbackBox(w, h);
    log("[detect] no COCO person above threshold — using center fallback box");
  } else {
    const best = kept[0];
    const src = mapBox640ToSource(best, lb);
    xywh = xyxyToXywh(src);
  }
  const tEnd = performance.now();
  return {
    xywh,
    lb,
    ms: {
      letterboxPrep: tInfer0 - tLetter0,
      detectorInfer: tInfer1 - tInfer0,
      decodeMap: tEnd - tInfer1,
      detectTotal: tEnd - tLetter0,
    },
  };
}

async function embedTimed(embedSession, imageData112) {
  const t0 = performance.now();
  const vec = await embedImageData(embedSession, imageData112);
  const t1 = performance.now();
  return { vec, ms: t1 - t0 };
}

function matchTimed(query, gallery) {
  const t0 = performance.now();
  const m = bestMatch(query, gallery);
  const t1 = performance.now();
  return { m, ms: t1 - t0 };
}

async function runFullPipeline() {
  clearLog();
  timingEl.textContent = "Running…";
  log("=== Epic 6 E2E ===");

  const tLoad0 = performance.now();
  const detSession = await createDetectorSession();
  const embedSession = await createEmbedSession();
  const tLoad1 = performance.now();
  const loadMs = tLoad1 - tLoad0;
  log("Cold model load (detector + embedder) ms:", loadMs.toFixed(2));

  const imA = await loadImageUrl(URL_ENROLL);
  const imC = await loadImageUrl(URL_STRANGER);
  const { w: wA, h: hA } = drawImageToSourceCanvas(imA);

  // Path A — enroll: detect → person bbox → head band → Epic 3 crop → embed
  const detA = await runDetectTimed(detSession, imA);
  log("Path A detect breakdown ms:", JSON.stringify(detA.ms));
  const headA = headBandFromPersonXywh(detA.xywh, wA, hA);
  let idA = cropPipelineTo112(wA, hA, headA);
  if (!idA) {
    log("crop A failed — center fallback");
    const fb = centerFallbackBox(wA, hA);
    idA = cropPipelineTo112(wA, hA, fb);
  }
  const embA = await embedTimed(embedSession, idA);
  const enrolled = embA.vec;
  log("Path A embed ms:", embA.ms.toFixed(3));

  // Path B — second crop same person (jitter inside same head band; no second detect)
  drawImageToSourceCanvas(imA);
  const headB = jitterHeadBand(headA, wA, hA);
  const idB =
    cropPipelineTo112(wA, hA, headB) ||
    cropPipelineTo112(wA, hA, headA);
  const embB = await embedTimed(embedSession, idB);
  const matchB = matchTimed(embB.vec, [enrolled]);
  const bandB = bandFromSimilarity01(matchB.m.score);
  log(
    "Path B same-person similarity01:",
    matchB.m.score.toFixed(4),
    "band:",
    bandB,
    "embed ms:",
    embB.ms.toFixed(3),
    "match ms:",
    matchB.ms.toFixed(4),
  );

  // Path C — stranger image
  const { w: wC, h: hC } = drawImageToSourceCanvas(imC);
  const detC = await runDetectTimed(detSession, imC);
  log("Path C detect breakdown ms:", JSON.stringify(detC.ms));
  const headC = headBandFromPersonXywh(detC.xywh, wC, hC);
  let idC = cropPipelineTo112(wC, hC, headC);
  if (!idC) {
    const fb = centerFallbackBox(wC, hC);
    idC = cropPipelineTo112(wC, hC, fb);
    log("[Path C] used center fallback for crop");
  }
  const embC = await embedTimed(embedSession, idC);
  const matchC = matchTimed(embC.vec, [enrolled]);
  const bandC = bandFromSimilarity01(matchC.m.score);
  log(
    "Path C stranger similarity01:",
    matchC.m.score.toFixed(4),
    "band:",
    bandC,
    "embed ms:",
    embC.ms.toFixed(3),
    "match ms:",
    matchC.ms.toFixed(4),
  );

  const steadyDetect =
    detA.ms.detectTotal + detC.ms.detectTotal;
  const steadyEmbed = embA.ms + embB.ms + embC.ms;
  const steadyMatch = matchB.ms + matchC.ms;
  const steadyTotal = steadyDetect + steadyEmbed + steadyMatch;

  const rows = [
    ["Stage", "ms (notes)"],
    ["Cold load (both ONNX sessions)", loadMs.toFixed(2)],
    ["Path A — detect (letterbox+infer+decode)", detA.ms.detectTotal.toFixed(2)],
    ["  └ letterbox + NCHW prep", detA.ms.letterboxPrep.toFixed(2)],
    ["  └ detector session.run", detA.ms.detectorInfer.toFixed(2)],
    ["  └ decode + NMS + map", detA.ms.decodeMap.toFixed(2)],
    ["Path A — embed (112 + ORT)", embA.ms.toFixed(2)],
    ["Path B — detect", "(0 — reuses Path A head band)"],
    ["Path B — embed", embB.ms.toFixed(2)],
    ["Path B — match (JS)", matchB.ms.toFixed(4)],
    ["Path C — detect total", detC.ms.detectTotal.toFixed(2)],
    ["Path C — embed", embC.ms.toFixed(2)],
    ["Path C — match (JS)", matchC.ms.toFixed(4)],
    ["---", "---"],
    [
      "Steady-state total (A detect + C detect + all embeds + matches)",
      steadyTotal.toFixed(2),
    ],
    ["  (subset) detect A+C", steadyDetect.toFixed(2)],
    ["  (subset) embed A+B+C", steadyEmbed.toFixed(2)],
    ["  (subset) match B+C", steadyMatch.toFixed(6)],
  ];

  timingEl.textContent = rows.map((r) => r.join("\t")).join("\n");

  log("Steady-state total ms (no cold load):", steadyTotal.toFixed(2));
  if (steadyTotal > 3000) {
    const parts = [
      ["detect A+C", steadyDetect],
      ["embed A+B+C", steadyEmbed],
      ["match B+C", steadyMatch],
    ];
    parts.sort((a, b) => b[1] - a[1]);
    log(
      "E6-T6: steady-state > 3s — dominant:",
      parts[0][0],
      "=",
      parts[0][1].toFixed(2),
      "ms. STOP for supervisor before large mitigations.",
    );
    log(
      "Mitigations (plain): shrink JPEG dimensions before letterbox; WASM-only skip WebGL retry; smaller detector ONNX; run embedder once if demo allows.",
    );
  } else {
    log("E6-T6: steady-state total ≤ 3s (target band for this spike).");
  }

  log("=== Done ===");
}

document.getElementById("btn-run").addEventListener("click", () => {
  runFullPipeline().catch((e) => {
    log("ERROR:", e?.message ?? String(e), e?.stack ?? "");
    timingEl.textContent = String(e);
  });
});

log("Epic 6 page ready — click Run (HTTP only).");

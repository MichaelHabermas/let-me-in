/**
 * Epic 4 spike — E4-T4..E4-T9: ORT-web face embedding (InsightFace w600k_mbf ONNX).
 */

const ort = globalThis.ort;

const ORT_CDN_VER = "1.22.0";
const ORT_DIST = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_CDN_VER}/dist`;
const MODEL_URL = new URL("./models/w600k_mbf.onnx", import.meta.url).href;

/** Graph I/O (from onnx protobuf inspection). */
const INPUT_NAME = "input.1";
const EXPECTED_OUT_DIM = 512;

const BENCH_ITERS = 22;
const WARMUP_RUNS = 1;

const logEl = document.getElementById("log");
const canvas = document.getElementById("prep");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

/** Same-origin assets (avoids foreign-image CORS tainting canvas). */
const asset = (name) => new URL(`./assets/${name}`, import.meta.url).href;
const URL_SAME = asset("same_base.jpg");
const URL_B = asset("person_b.jpg");
const URL_C = asset("person_c.jpg");

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

function median(sorted) {
  const s = [...sorted].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return NaN;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil(p * sortedAsc.length) - 1),
  );
  return sortedAsc[idx];
}

function configureOrtEnv() {
  ort.env.logLevel = "verbose";
  ort.env.wasm.wasmPaths = {
    mjs: `${ORT_DIST}/ort-wasm-simd-threaded.mjs`,
    wasm: `${ORT_DIST}/ort-wasm-simd-threaded.wasm`,
  };
  ort.env.wasm.numThreads = 1;
}

/**
 * InsightFace / ArcFace-style norm: RGB 0–255 → [-1, 1] per channel, NCHW float32.
 * Matches (pixel - 127.5) / 127.5 (equivalent to (pixel/255 - 0.5) / 0.5 for 8-bit).
 */
function imageDataToNCHW112InsightFace(img) {
  const { data, width, height } = img;
  if (width !== 112 || height !== 112) {
    throw new Error(`Expected 112×112 ImageData, got ${width}×${height}`);
  }
  const out = new Float32Array(1 * 3 * 112 * 112);
  const plane = 112 * 112;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const idx = y * width + x;
      out[idx] = (r - 127.5) / 127.5;
      out[plane + idx] = (g - 127.5) / 127.5;
      out[2 * plane + idx] = (b - 127.5) / 127.5;
    }
  }
  return new ort.Tensor("float32", out, [1, 3, 112, 112]);
}

function l2NormalizeFlat(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

function cosineNormalized(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

async function loadImage(url) {
  const im = new Image();
  im.crossOrigin = "anonymous";
  im.decoding = "async";
  im.src = url;
  await im.decode();
  return im;
}

/** Crop [sx,sy] size cw×ch from image, letterbox-stretch to 112×112. */
function drawCrop112(im, sx, sy, cw, ch) {
  ctx.clearRect(0, 0, 112, 112);
  ctx.drawImage(im, sx, sy, cw, ch, 0, 0, 112, 112);
  return ctx.getImageData(0, 0, 112, 112);
}

async function createOrtSession(eps) {
  configureOrtEnv();
  const createOpts = {
    executionProviders: eps,
    graphOptimizationLevel: "all",
  };
  return ort.InferenceSession.create(MODEL_URL, createOpts);
}

async function tryCreateSession(epsLabel, eps) {
  try {
    const session = await createOrtSession(eps);
    log(`Session OK (${epsLabel}) — inputs:`, session.inputNames, "outputs:", session.outputNames);
    return session;
  } catch (err) {
    log(`Session.create FAILED (${epsLabel}) —`, err?.message ?? String(err));
    throw err;
  }
}

async function releaseSession(session) {
  if (!session) return;
  if (typeof session.release === "function") await session.release();
  else if (typeof session.dispose === "function") await session.dispose();
}

async function runGateT4T6() {
  clearLog();
  log("=== E4-T4 — E4-T6 (gate) ===");
  log("Model URL:", MODEL_URL);
  log("Navigator:", navigator.userAgent);

  if (typeof ort === "undefined") {
    log("FAIL: ort missing.");
    return;
  }

  let session;
  try {
    session = await tryCreateSession("webgl+wasm", ["webgl", "wasm"]);
  } catch (e1) {
    try {
      session = await tryCreateSession("wasm-only", ["wasm"]);
    } catch (e2) {
      log("E4-T4 FAIL: both EP orders failed.");
      return;
    }
  }

  try {
    const im = await loadImage(URL_SAME);
    const imgData = drawCrop112(im, 80, 120, 280, 280);
    const input = imageDataToNCHW112InsightFace(imgData);
    log("E4-T4: running first forward…");
    const out = await session.run({ [INPUT_NAME]: input });
    const outName = session.outputNames[0];
    const pred = out[outName];
    log("E4-T5: output name:", outName, "dtype:", pred.type, "shape:", pred.dims);
    const flat = Float32Array.from(pred.data);
    const normVec = l2NormalizeFlat(flat);
    let sumSq = 0;
    for (let i = 0; i < normVec.length; i++) sumSq += normVec[i] * normVec[i];
    const norm = Math.sqrt(sumSq);
    log("E4-T6: L2 norm after normalize ≈", norm.toFixed(6), "(expect ~1)");
    log("E4-T4 PASS: first run succeeded. E4-T5 PASS: shape matches 512-d. E4-T6 PASS:", Math.abs(norm - 1) < 1e-4);
  } catch (err) {
    log("E4-T4 FAIL:", err?.message ?? String(err));
  } finally {
    await releaseSession(session);
  }
}

async function runSanityT7() {
  clearLog();
  log("=== E4-T7 — same vs different (informal) ===");

  let session;
  try {
    session = await tryCreateSession("webgl+wasm", ["webgl", "wasm"]);
  } catch {
    session = await tryCreateSession("wasm-only", ["wasm"]);
  }

  try {
    const imSame = await loadImage(URL_SAME);
    const A1 = drawCrop112(imSame, 60, 100, 300, 300);
    const A2 = drawCrop112(imSame, 130, 140, 260, 260);
    const tA1 = imageDataToNCHW112InsightFace(A1);
    const tA2 = imageDataToNCHW112InsightFace(A2);

    const outA1 = await session.run({ [INPUT_NAME]: tA1 });
    const outA2 = await session.run({ [INPUT_NAME]: tA2 });
    const name = session.outputNames[0];
    const eA1 = l2NormalizeFlat(Float32Array.from(outA1[name].data));
    const eA2 = l2NormalizeFlat(Float32Array.from(outA2[name].data));

    const imB = await loadImage(URL_B);
    const imC = await loadImage(URL_C);
    const B1 = drawCrop112(imB, 80, 100, 300, 300);
    const C1 = drawCrop112(imC, 90, 110, 300, 300);
    const tB = imageDataToNCHW112InsightFace(B1);
    const tC = imageDataToNCHW112InsightFace(C1);
    const outB = await session.run({ [INPUT_NAME]: tB });
    const outC = await session.run({ [INPUT_NAME]: tC });
    const eB = l2NormalizeFlat(Float32Array.from(outB[name].data));
    const eC = l2NormalizeFlat(Float32Array.from(outC[name].data));

    const sameCos = cosineNormalized(eA1, eA2);
    const dPairs = [
      cosineNormalized(eA1, eB),
      cosineNormalized(eA1, eC),
      cosineNormalized(eA2, eB),
      cosineNormalized(eA2, eC),
    ];
    const diffMean =
      dPairs.reduce((a, b) => a + b, 0) / dPairs.length;

    log("cosine(same person, two crops):", sameCos.toFixed(4));
    log("cosine cross pairs:", dPairs.map((x) => x.toFixed(4)).join(", "));
    log("mean(cross different):", diffMean.toFixed(4));
    const pass = sameCos > diffMean;
    log("E4-T7:", pass ? "PASS" : "FAIL", "— same > different on average?", pass);
  } catch (err) {
    log("E4-T7 FAIL:", err?.message ?? String(err));
  } finally {
    await releaseSession(session);
  }
}

async function benchmarkOneEp(epLabel, eps) {
  const session = await createOrtSession(eps);
  const im = await loadImage(URL_SAME);
  const imgData = drawCrop112(im, 90, 110, 300, 300);

  for (let w = 0; w < WARMUP_RUNS; w++) {
    const input = imageDataToNCHW112InsightFace(imgData);
    await session.run({ [INPUT_NAME]: input });
  }

  const times = [];
  for (let i = 0; i < BENCH_ITERS; i++) {
    const t0 = performance.now();
    const input = imageDataToNCHW112InsightFace(imgData);
    await session.run({ [INPUT_NAME]: input });
    times.push(performance.now() - t0);
  }
  await releaseSession(session);

  const sorted = [...times].sort((a, b) => a - b);
  const p50 = median(sorted);
  const p90 = percentile(sorted, 0.9);
  log(
    `E8 ${epLabel}: n=${BENCH_ITERS} (after ${WARMUP_RUNS} warmup) preprocess+infer ms — p50=${p50.toFixed(3)} p90=${p90.toFixed(3)} min=${sorted[0].toFixed(3)} max=${sorted[sorted.length - 1].toFixed(3)}`,
  );
  log(`E8 ${epLabel} samples:`, JSON.stringify(times.map((t) => +t.toFixed(3))));
  return { p50, p90, times, epLabel };
}

async function runBenchT8() {
  clearLog();
  log("=== E4-T8 — latency (preprocess + session.run) ===");
  log("Stretch target (PRE-SEARCH): < 150 ms embed where possible.");

  const results = [];
  try {
    results.push(await benchmarkOneEp("webgl-only", ["webgl"]));
  } catch (err) {
    log("E4-T8 webgl-only FAILED:", err?.message ?? String(err));
  }
  try {
    results.push(await benchmarkOneEp("wasm-only", ["wasm"]));
  } catch (err) {
    log("E4-T8 wasm-only FAILED:", err?.message ?? String(err));
  }

  if (results.length === 0) {
    log("E4-T8 FAIL: no EP succeeded.");
  } else {
    log("E4-T8 PASS: recorded p50/p90 for", results.length, "EP mode(s).");
  }
}

document.getElementById("btn-gate").addEventListener("click", () => {
  runGateT4T6().catch((e) => log("unhandled", e?.message ?? String(e)));
});
document.getElementById("btn-sanity").addEventListener("click", () => {
  runSanityT7().catch((e) => log("unhandled", e?.message ?? String(e)));
});
document.getElementById("btn-bench").addEventListener("click", () => {
  runBenchT8().catch((e) => log("unhandled", e?.message ?? String(e)));
});
document.getElementById("btn-clear").addEventListener("click", clearLog);

log("Epic 4 spike ready — click a button. ORT:", ORT_CDN_VER);

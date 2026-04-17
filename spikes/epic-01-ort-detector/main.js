/**
 * Epic 1 spike — E1-T1..E1-T8 static gate zero + E1-T9 live-frame timing (Epic 2 path).
 */

const ort = globalThis.ort;

const ORT_CDN_VER = "1.22.0";
const ORT_DIST = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_CDN_VER}/dist`;
const MODEL_URL = new URL("./models/yolov9t.onnx", import.meta.url).href;

const E1T9_N = 12;

const logEl = document.getElementById("log");
const canvas = document.getElementById("prep");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const video = document.getElementById("cam");
const btnCam = document.getElementById("btn-cam");
const btnE1t9 = document.getElementById("btn-e1t9");

let cameraStream = null;
let cachedSession = null;

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

function median(sortedOrValues) {
  const s = Array.isArray(sortedOrValues)
    ? [...sortedOrValues].sort((a, b) => a - b)
    : sortedOrValues;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** ImageData RGBA → float32 NCHW [0,1] */
function preprocessImageDataToNCHW01(img) {
  const { data, width, height } = img;
  const out = new Float32Array(1 * 3 * width * height);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      min = Math.min(min, r, g, b);
      max = Math.max(max, r, g, b);
      const c0 = y * width + x;
      out[c0] = r;
      out[width * height + c0] = g;
      out[2 * width * height + c0] = b;
    }
  }
  return { tensorData: out, min, max, shape: [1, 3, height, width] };
}

/** SPECS sample: float32 [1,3,640,640], values in [0,1] — synthetic still */
function preprocessStillImageToNCHW01() {
  ctx.fillStyle = "#4466aa";
  ctx.fillRect(0, 0, 640, 640);
  ctx.fillStyle = "#ffcc66";
  ctx.beginPath();
  ctx.arc(320, 240, 140, 0, Math.PI * 2);
  ctx.fill();
  const img = ctx.getImageData(0, 0, 640, 640);
  return preprocessImageDataToNCHW01(img);
}

/** Letterbox live frame to 640×640 (PRE-SEARCH / pipeline; black bars = 0 in [0,1]). */
function drawVideoLetterbox640(v) {
  const vw = v.videoWidth;
  const vh = v.videoHeight;
  if (!vw || !vh) return false;
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(0, 0, 640, 640);
  const scale = Math.min(640 / vw, 640 / vh);
  const nw = vw * scale;
  const nh = vh * scale;
  const dx = (640 - nw) / 2;
  const dy = (640 - nh) / 2;
  ctx.drawImage(v, 0, 0, vw, vh, dx, dy, nw, nh);
  return true;
}

function preprocessVideoFrameToNCHW01() {
  if (!drawVideoLetterbox640(video)) {
    return null;
  }
  const img = ctx.getImageData(0, 0, 640, 640);
  return preprocessImageDataToNCHW01(img);
}

function stubPostprocessForFutureNms(predictionsTensor) {
  const d = predictionsTensor.data;
  const len = d.length;
  let bad = 0;
  const sample = Math.min(5000, len);
  for (let i = 0; i < sample; i++) {
    if (!Number.isFinite(d[i])) bad++;
  }
  let maxAbs = 0;
  const lim = Math.min(200, len);
  for (let i = 0; i < lim; i++) maxAbs = Math.max(maxAbs, Math.abs(d[i]));
  return {
    ok: bad === 0,
    checked: sample,
    nonFiniteInSample: bad,
    sampleMaxAbs200: maxAbs,
    note: "NMS / decode / mAP not validated in this spike — outputs usable as raw head for future NMS.",
  };
}

function captureEpHintsFromSession(session) {
  return {
    inputNames: session.inputNames,
    outputNames: session.outputNames,
    note:
      "ORT Web JS does not expose a stable public 'activeExecutionProvider' on InferenceSession. " +
      "Use verbose env logs during create + WebGL availability below.",
  };
}

function configureOrtEnv() {
  ort.env.logLevel = "verbose";
  ort.env.wasm.wasmPaths = {
    mjs: `${ORT_DIST}/ort-wasm-simd-threaded.mjs`,
    wasm: `${ORT_DIST}/ort-wasm-simd-threaded.wasm`,
  };
  ort.env.wasm.numThreads = 1;
}

async function createOrtSession() {
  configureOrtEnv();
  const createOpts = {
    executionProviders: ["webgl", "wasm"],
    graphOptimizationLevel: "all",
  };
  try {
    return await ort.InferenceSession.create(MODEL_URL, createOpts);
  } catch (err) {
    log("E1-T4: primary session.create FAILED —", err?.message ?? String(err));
    try {
      return await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    } catch (err2) {
      log("E1-T4: WASM-only also FAILED:", err2?.message ?? String(err2));
      throw err2;
    }
  }
}

async function getOrCreateSession() {
  if (cachedSession) return cachedSession;
  cachedSession = await createOrtSession();
  return cachedSession;
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  video.srcObject = null;
  btnE1t9.disabled = true;
  btnCam.textContent = "Start camera (Epic 2 path)";
}

async function startCamera() {
  if (cameraStream) {
    stopCamera();
    return;
  }
  if (!window.isSecureContext) {
    log("Camera needs secure context (localhost or HTTPS).");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    log("getUserMedia not available.");
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        ideal: { width: 1280, height: 720 },
        facingMode: "user",
      },
    });
    video.srcObject = cameraStream;
    await video.play();
    log(
      "[E1-T9 prereq] Camera OK; videoSize=",
      video.videoWidth,
      "x",
      video.videoHeight,
    );
    btnE1t9.disabled = false;
    btnCam.textContent = "Stop camera";
  } catch (e) {
    log("Camera error:", e?.name, e?.message ?? String(e));
  }
}

/**
 * E1-T9: preprocess + session.run per frame, N≥10, report median vs 500 ms MVP.
 * Includes letterbox + getImageData in timed loop (wall-clock per “frame” path).
 */
async function runE1T9() {
  log("=== E1-T9 live-frame benchmark ===");
  if (!cameraStream || !video.videoWidth) {
    log("E1-T9 FAIL: start camera first.");
    return;
  }

  if (typeof ort === "undefined") {
    log("FAIL: global `ort` missing.");
    return;
  }

  const session = await getOrCreateSession();
  const inputName = session.inputNames[0];
  log("E1-T9 session I/O:", JSON.stringify(captureEpHintsFromSession(session)));

  const warmupPrep = preprocessVideoFrameToNCHW01();
  if (!warmupPrep) {
    log("E1-T9 FAIL: could not read video frame.");
    return;
  }
  const warmupFeeds = {
    [inputName]: new ort.Tensor("float32", warmupPrep.tensorData, warmupPrep.shape),
  };
  await session.run(warmupFeeds);
  log("E1-T9 warmup: 1x session.run complete (excluded from median).");

  const times = [];
  for (let i = 0; i < E1T9_N; i++) {
    const t0 = performance.now();
    const prep = preprocessVideoFrameToNCHW01();
    if (!prep) {
      log("E1-T9 FAIL at iteration", i);
      return;
    }
    const feeds = {
      [inputName]: new ort.Tensor("float32", prep.tensorData, prep.shape),
    };
    await session.run(feeds);
    times.push(performance.now() - t0);
  }

  const med = median(times);
  const sorted = [...times].sort((a, b) => a - b);
  const p90Idx = Math.min(sorted.length - 1, Math.ceil(0.9 * sorted.length) - 1);
  const p90 = sorted[p90Idx];
  log("E1-T9 samples ms (n=" + E1T9_N + "):", JSON.stringify(times));
  log(
    "E1-T9 median preprocess+infer ms:",
    med.toFixed(2),
    "min:",
    sorted[0].toFixed(2),
    "max:",
    sorted[sorted.length - 1].toFixed(2),
    "~p90:",
    p90.toFixed(2),
  );
  log("MVP target: detection < 500 ms/frame — median", med < 500 ? "PASSES" : "FAILS", "threshold.");

  if (med >= 500) {
    log(
      "STOP — supervisor (PRE-PRD): median ≥ 500 ms — approve smaller input, INT8 artifact, or PRE-SEARCH detector fallback row before changing production story.",
    );
  }

  const prepLast = preprocessVideoFrameToNCHW01();
  if (!prepLast) {
    log("E1-T9: last-frame stub skipped (no frame).");
    return;
  }
  const last = await session.run({
    [inputName]: new ort.Tensor("float32", prepLast.tensorData, prepLast.shape),
  });
  const pred = last.predictions ?? last[session.outputNames[0]];
  log("E1-T9 last frame stub:", JSON.stringify(stubPostprocessForFutureNms(pred)));
  log("=== E1-T9 done ===");
}

async function gateZero() {
  clearLog();
  log("=== Epic 1 gate zero ===");
  log("Navigator:", navigator.userAgent);
  log("Model URL:", MODEL_URL);

  if (typeof ort === "undefined") {
    log("FAIL: global `ort` missing (script load order).");
    return;
  }

  log("ORT CDN:", ORT_DIST, "wasmPaths: explicit mjs+wasm under /dist/");

  const webglLikely =
    typeof document !== "undefined" &&
    document.createElement("canvas").getContext("webgl2") != null;
  log("WebGL2 context creatable:", webglLikely);

  let session;
  try {
    log(
      "E1-T3: Creating InferenceSession (ordered EPs per PRE-PRD)…",
      JSON.stringify({ executionProviders: ["webgl", "wasm"], graphOptimizationLevel: "all" }),
    );
    session = await createOrtSession();
    cachedSession = session;
    log(
      "Session.create resolved (options requested webgl,wasm). Check console for EP removal lines.",
    );
    log("Session I/O:", JSON.stringify(captureEpHintsFromSession(session)));
  } catch (err) {
    log("E1-T4: all session.create attempts FAILED —", err?.message ?? String(err));
    log("E1-T4 stack:", err?.stack ?? "(no stack)");
    log(
      "STOP — supervisor: next PRE-SEARCH detector fallback row is 2 (smaller v9 / INT8) then 3 (YOLOv8-face ONNX).",
    );
    return;
  }

  const prep = preprocessStillImageToNCHW01();
  log(
    "E1-T5 preprocess: shape",
    JSON.stringify(prep.shape),
    "min/max",
    prep.min,
    prep.max,
  );
  if (prep.shape.join(",") !== "1,3,640,640") {
    log("E1-T5 FAIL: shape mismatch");
    return;
  }
  if (!(prep.min >= 0 && prep.max <= 1 && Number.isFinite(prep.min))) {
    log("E1-T5 FAIL: range not in [0,1] or non-finite");
    return;
  }

  const inputName = session.inputNames[0];
  log("E1-T6: session.inputNames[0] =", JSON.stringify(session.inputNames));
  if (inputName !== "images") {
    log("WARN: expected `images`; got", inputName, "— using session name.");
  }

  const feeds = { [inputName]: new ort.Tensor("float32", prep.tensorData, prep.shape) };

  let results;
  try {
    const t0 = performance.now();
    results = await session.run(feeds);
    const ms = performance.now() - t0;
    log("E1-T3/T7: session.run OK in", ms.toFixed(2), "ms (single static run, not E1-T9 median).");
  } catch (err) {
    log("E1-T4 run FAIL:", err?.message ?? String(err));
    log("E1-T4 stack:", err?.stack ?? "(no stack)");
    return;
  }

  const outNames = session.outputNames;
  log("E1-T7 output names:", JSON.stringify(outNames));
  for (const name of outNames) {
    const t = results[name];
    log(
      "E1-T7 tensor",
      name,
      "dtype:",
      t.type,
      "dims:",
      JSON.stringify(t.dims),
      "dataLength:",
      t.data.length,
    );
  }

  const pred = results.predictions ?? results[outNames[0]];
  const stub = stubPostprocessForFutureNms(pred);
  log("E1-T8 stub postprocess:", JSON.stringify(stub));

  log("=== Done: E1-T1..E1-T8 static path ===");
  log("For E1-T9: start camera, then run N=12 benchmark.");
  log(
    "EP note: inspect DevTools console for ORT verbose lines; WebGL2 creatable:",
    webglLikely,
  );
}

document.getElementById("btn-run").addEventListener("click", () => {
  gateZero().catch((e) => log("Unhandled:", e?.message, e?.stack));
});
document.getElementById("btn-clear").addEventListener("click", clearLog);
btnCam.addEventListener("click", () => {
  if (cameraStream) stopCamera();
  else startCamera().catch((e) => log("Unhandled:", e?.message));
});
btnE1t9.addEventListener("click", () => {
  runE1T9().catch((e) => log("Unhandled:", e?.message, e?.stack));
});

log("Ready. Gate zero = static; E1-T9 = camera + N=" + E1T9 + " (serve over HTTP).");

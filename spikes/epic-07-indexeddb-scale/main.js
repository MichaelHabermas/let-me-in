/**
 * Epic 7 — IndexedDB scale (throwaway). Raw IndexedDB only; no Dexie.
 * Fingerprint compare math aligned with spikes/epic-05-matching-js/matching.mjs (L2 + dot).
 */

const DB_NAME = "epic07_scale_spike";
const DB_VERSION = 1;
const STORE = "users";
const EMBED_DIM = 512;
const USER_COUNT = 50;
const BENCH_RUNS = 25;
/** Repeat the same normalize+50-scan inside one timer sample so ms is not stuck at 0 (timer quanta). */
const INNER_REPEATS_PER_SAMPLE = 200;
const EPS = 1e-5;

/** @param {Float32Array} v */
function l2Normalize(v) {
  let sq = 0;
  for (let i = 0; i < v.length; i++) sq += v[i] * v[i];
  const n = Math.sqrt(sq);
  if (n < EPS) throw new RangeError("l2Normalize: zero vector");
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

/** @param {Float32Array} a @param {Float32Array} b */
function dot(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d;
}

/** Deterministic raw vector before normalization (simulates model output). */
function rawEmbeddingForId(id) {
  const v = new Float32Array(EMBED_DIM);
  for (let i = 0; i < EMBED_DIM; i++) {
    v[i] = Math.sin((i + 1) * 0.01 + id * 0.7) * 0.5 + Math.cos((i + 1) * 0.03 + id) * 0.3;
  }
  return v;
}

/** 16×16 PNG data URL — small per-user thumbnail (unique color per id). */
function tinyThumbDataUrl(id) {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext("2d");
  if (!ctx) return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  ctx.fillStyle = `hsl(${(id * 47) % 360}, 55%, 45%)`;
  ctx.fillRect(0, 0, 16, 16);
  return c.toDataURL("image/png");
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

/** @param {IDBDatabase} db */
function clearStore(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).clear();
  });
}

/** @param {IDBDatabase} db */
async function seed50(db) {
  await clearStore(db);
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (let id = 0; id < USER_COUNT; id++) {
    const raw = rawEmbeddingForId(id);
    const embedding = l2Normalize(raw);
    store.put({
      id,
      embedding,
      thumbDataUrl: tinyThumbDataUrl(id),
    });
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** @param {IDBDatabase} db @returns {Promise<Float32Array[]>} */
function readAllEmbeddings(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const rows = req.result;
      rows.sort((a, b) => a.id - b.id);
      /** @type {Float32Array[]} */
      const gallery = [];
      for (const r of rows) {
        const e = r.embedding;
        if (!(e instanceof Float32Array) || e.length !== EMBED_DIM) {
          reject(new Error(`Bad row id=${r.id} len=${e?.length}`));
          return;
        }
        gallery.push(e);
      }
      resolve(gallery);
    };
  });
}

/**
 * One timed iteration (E7-T4): copy random stored row → L2-normalize query → 50 dot-products.
 * Timed region: normalize + full list scan (IDB read excluded — gallery already in memory).
 * @param {Float32Array[]} gallery
 * @param {number} queryIdx index into gallery (random stored person)
 */
function oneCompareLoopMs(gallery, queryIdx) {
  let bestIdx = 0;
  const t0 = performance.now();
  for (let rep = 0; rep < INNER_REPEATS_PER_SAMPLE; rep++) {
    const query = l2Normalize(new Float32Array(gallery[queryIdx]));
    let best = -Infinity;
    bestIdx = 0;
    for (let i = 0; i < gallery.length; i++) {
      const s = dot(query, gallery[i]);
      if (s > best) {
        best = s;
        bestIdx = i;
      }
    }
  }
  const t1 = performance.now();
  const msPerScan = (t1 - t0) / INNER_REPEATS_PER_SAMPLE;
  return { ms: msPerScan, bestIdx };
}

function median(sorted) {
  const n = sorted.length;
  if (n % 2 === 1) return sorted[(n - 1) / 2];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

async function storageEstimate() {
  if (!navigator.storage?.estimate) {
    return { available: false, reason: "navigator.storage.estimate not available" };
  }
  const est = await navigator.storage.estimate();
  return {
    available: true,
    usage: est.usage,
    quota: est.quota,
    persisted: est.persisted,
  };
}

function thumbPayloadBytesEstimate(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      let bytes = 0;
      for (const r of req.result) {
        if (typeof r.thumbDataUrl === "string") bytes += r.thumbDataUrl.length * 2;
      }
      resolve(bytes);
    };
  });
}

/**
 * Full spike run for UI + headless scraper.
 * @param {{ log: (s: string) => void }} hooks
 */
export async function runFullSpike(hooks) {
  const log = hooks.log;
  const lines = [];

  function append(msg) {
    lines.push(msg);
    log(msg);
  }

  append(`UA: ${navigator.userAgent}`);
  if (navigator.userAgentData?.platform) {
    append(`platform (UA-CH): ${navigator.userAgentData.platform}`);
  }

  let db;
  try {
    db = await openDb();
  } catch (e) {
    append(`IndexedDB open FAILED: ${String(e)}`);
    throw e;
  }

  try {
    await seed50(db);
    append(`Seed: ${USER_COUNT} records written OK.`);
  } catch (e) {
    const name = e?.name ?? "";
    const msg = String(e?.message ?? e);
    append(`Seed FAILED (${name}): ${msg}`);
    if (name === "QuotaExceededError") {
      append("STOP: QuotaExceededError — supervisor approval needed before shrinking thumbnails or dropping images.");
    }
    throw e;
  }

  const thumbChars = await thumbPayloadBytesEstimate(db);
  append(`Thumbnail UTF-16 string payload (rough): ~${(thumbChars / 1024).toFixed(2)} KiB (chars×2 upper bound)`);

  const gallery = await readAllEmbeddings(db);
  if (gallery.length !== USER_COUNT) {
    throw new Error(`Expected ${USER_COUNT} rows, got ${gallery.length}`);
  }
  append(
    `Warm read: ${gallery.length} fingerprints in memory. Timed step = L2-normalize query copy + ${gallery.length} dot-products (no IDB inside timer); each outer sample averages ${INNER_REPEATS_PER_SAMPLE} identical scans for sub-ms resolution.`,
  );

  const timings = [];
  const runMeta = [];
  for (let r = 0; r < BENCH_RUNS; r++) {
    const queryIdx = Math.floor(Math.random() * USER_COUNT);
    const { ms, bestIdx } = oneCompareLoopMs(gallery, queryIdx);
    timings.push(ms);
    runMeta.push({ run: r + 1, queryIdx, ms: Number(ms.toFixed(4)), bestIdx });
  }

  const sorted = [...timings].sort((a, b) => a - b);
  const med = median(sorted);
  append(`Compare-loop timings (ms), n=${BENCH_RUNS}: min=${sorted[0].toFixed(4)} max=${sorted[sorted.length - 1].toFixed(4)} typical-middle-ms=${med.toFixed(4)}`);

  const est = await storageEstimate();
  if (est.available) {
    append(
      `storage.estimate: usage=${est.usage} bytes (~${(est.usage / 1024 / 1024).toFixed(3)} MiB), quota=${est.quota} bytes (~${(est.quota / 1024 / 1024).toFixed(1)} MiB), persisted=${est.persisted}`,
    );
  } else {
    append(`storage.estimate: ${est.reason}`);
  }

  const embeddingBytes = USER_COUNT * EMBED_DIM * 4;
  append(`Embeddings alone (theory): ${USER_COUNT} × ${EMBED_DIM} × 4 = ${embeddingBytes} bytes (~${(embeddingBytes / 1024).toFixed(1)} KiB)`);

  append("=== Done ===");

  return {
    userAgent: navigator.userAgent,
    platform: navigator.userAgentData?.platform ?? null,
    seedCount: USER_COUNT,
    embedDim: EMBED_DIM,
    benchRuns: BENCH_RUNS,
    innerRepeatsPerSample: INNER_REPEATS_PER_SAMPLE,
    timingsMs: timings,
    sortedTimingsMs: sorted,
    typicalMiddleMs: med,
    runMeta,
    storageEstimate: est,
    embeddingBytesTheoretical: embeddingBytes,
    thumbStringBytesEstimate: thumbChars,
    logText: lines.join("\n"),
  };
}

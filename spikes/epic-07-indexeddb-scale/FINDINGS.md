# Findings — Epic 7 (IndexedDB scale headroom)

**Spike folder:** `spikes/epic-07-indexeddb-scale/`  
**Date:** 2026-04-17  
**IndexedDB API:** **Raw IndexedDB** only (no Dexie). PRE-PRD reserves Dexie for the production app; Epic 7 allows either — this spike uses the lighter option and avoids a dependency.

**Fingerprint dimension (E7-T2):** **512** floats per user, matching Epic 4 winner `w600k_mbf.onnx` output shape `[1, 512]` — see [spikes/epic-04-embedding-onnx/FINDINGS.md](../epic-04-embedding-onnx/FINDINGS.md) § Tensor contract (winner).

---

## Task pass/fail

| Task | Pass? | Notes |
| --- | --- | --- |
| E7-T1 | **PASS** | Disposable `index.html` + `main.js`; 50 `put` operations succeed. |
| E7-T2 | **PASS** | Each record `embedding`: `Float32Array` length **512**; gallery rows L2-normalized before store (same geometry as Epic 5). |
| E7-T3 | **PASS** | Per-user **16×16** PNG `data:` URL thumbnail; ~15.4 KiB UTF-16 string upper bound for all thumbs; embeddings ~100 KiB theory. |
| E7-T4 | **PASS** | Random stored row → copy → **L2-normalize** → 50 dot-products; **25** outer runs (≥20); **typical middle** (median) **~0.017 ms** per full scan on verify run; min/max spread recorded below. |
| E7-T5 | **PASS** | `navigator.storage.estimate()` returned usage + quota (headless Chromium). |
| E7-T6 | **PASS** | This file + PRE-PRD index row. |

---

## Measurement method (E7-T4)

1. Seed **50** users into IndexedDB (`users` store: `id`, `embedding`, `thumbDataUrl`).
2. **Warm read:** load all embeddings into RAM once (**not** timed).
3. Each benchmark sample: pick random `queryIdx`, time **L2-normalize(copy of gallery[queryIdx]) + 50 dot-products** (best-match index verified as self-match).
4. **Timer resolution:** a single pass often rounds to **0 ms** in Chromium; each reported sample is **(wall time for 200 identical passes) / 200**, so the table is **per-one-scan** milliseconds.
5. **Typical middle-of-the-pack time:** median of the 25 per-scan samples.

---

## Automated run (headless Chromium)

**Command:** `node verify-browser.mjs` (see [README.md](./README.md)) after local `npm install playwright` + `playwright install chromium`.

**Browser / OS string (verbatim UA):**

```text
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.6778.33 Safari/537.36
```

**Platform (UA-CH):** `macOS`  
**Hardware inference:** arm64 Playwright bundle on Apple host (repo path under `/Users/...`).

**Console / stderr:** no `[browser console]` lines during verify (no warnings captured).

---

## Timing — 50-way compare (25 runs)

| Stat | ms (per single normalize + 50-dot scan) |
| --- | ---: |
| min | 0.0160 |
| max | 0.0265 |
| **median (typical middle)** | **~0.0170** |
| n | 25 |
| inner repeats / sample | 200 |

Per-run samples (ms): 0.0265, 0.0185, 0.0175, 0.0165, 0.0170, 0.0175, 0.0180, 0.0160, 0.0165, 0.0165, 0.0170, 0.0175, 0.0175, 0.0170, 0.0165, 0.0175, 0.0175, 0.0175, 0.0165, 0.0180, 0.0160, 0.0170, 0.0170, 0.0165, 0.0170.

---

## Storage (`navigator.storage.estimate`)

Recorded on the same headless run (values vary slightly per run):

| Field | Value |
| --- | ---: |
| `usage` | 123 218 bytes (~**0.118 MiB**) |
| `quota` | ~4.23 × 10⁹ bytes (~**4230 MiB** reported in log) |
| `persisted` | `undefined` (not reported in this environment) |

**Interpretation:** after seeding 50 synthetic users, the browser-reported **origin usage** stayed **well under** the **allowed** budget; **no `QuotaExceededError`** occurred.

---

## Footprint estimate (E7-T3)

| Component | Estimate |
| --- | ---: |
| Embeddings only (50 × 512 × 4 B) | **102 400 B** (~100 KiB) |
| Thumbnail strings (rough upper bound: UTF-16 code units × 2) | **~15.4 KiB** |
| IndexedDB `usage` (includes object overhead + DB) | **~123 KiB** (measured) |

---

## Errors / quota gate

**None.** Seed completed without storage errors.

---

## Files

- `index.html` — UI + module entry  
- `main.js` — raw IDB, seed, benchmark, `storage.estimate`  
- `verify-browser.mjs` — Playwright headless repro  
- `README.md` — manual + automated run  

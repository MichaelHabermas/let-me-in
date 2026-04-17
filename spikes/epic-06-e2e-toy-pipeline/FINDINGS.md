# Findings — Epic 6 (End-to-end toy pipeline)

**Artifact:** `spikes/epic-06-e2e-toy-pipeline/`  
**Date:** 2026-04-17  
**Tasks:** E6-T1–E6-T7

## How to run (technical)

1. `cd spikes/epic-06-e2e-toy-pipeline`
2. `python3 -m http.server 8766` (or any static server)
3. Open `http://localhost:8766/` in **Chrome** (or another Chromium browser).

**Do not** open `index.html` as `file://` — ES modules + ORT WASM expect HTTP(S).

**Camera:** This spike uses **baked JPEGs only** (`assets/*.jpg`). No `getUserMedia`; no HTTPS requirement beyond normal localhost.

## Score scale (plain English)

1. Each 112×112 face crop is turned into a **fixed list of 512 numbers** (a “fingerprint”) by the small ONNX model `w600k_mbf.onnx`.
2. Fingerprints are scaled so their **combined strength** is 1 (unit length), then we compare two fingerprints with a **dot-style match** in the range **-1 to 1** (identical direction = 1, opposite = -1).
3. For the **0 to 1 “how similar” score** used in project rules ([PRE-SEARCH §3](../../docs/PRE-SEARCH.md)), we use **`(1 + dot) / 2`**. So **1.0 = perfect match**, **0.5 = neutral**, **0.0 = opposite**.
4. **Decision bands** on that 0–1 score: **strong** ≥ **0.80**; **weak** **[0.65, 0.80)**; **reject** **&lt; 0.65** (same numbering style as Epic 5).

## Pipeline behavior (what the page does)

1. **Detect:** Letterbox source image to 640×640, run `yolov9t.onnx`, decode `[1, 84, 8400]`, NMS, keep best **COCO class 0 (person)** box, map coordinates back to original pixels.
2. **Head band (spike heuristic):** Person boxes are often full-body. We crop only the **top ~42% of box height** as a stand-in for “head area” so the face fingerprint model sees sensible input. **Not** a production rule — document if product wants a real face detector.
3. **Crop:** Epic 3-style margin + square + resize to **112×112** (`crop.mjs`).
4. **Embed:** Epic 4 InsightFace-style preprocess + ORT (`embed.mjs`), L2-normalize 512-d output.
5. **Match:** Epic 5 `bestMatch` against **one** stored fingerprint (`matching.mjs`).

**Path A (enroll):** `same_base.jpg` → detect → head band → crop → embed → store.  
**Path B (same person):** Same image, **jittered** head band (no second detect) → embed → match vs stored.  
**Path C (stranger):** `person_c.jpg` → detect → head band → crop → embed → match vs stored.

## Recorded similarity numbers

**Offline sanity (Python + same ONNX files, same head + jitter logic):**

| Check | similarity01 `(1+dot)/2` | Band |
| --- | --- | --- |
| Same person (enroll vs jitter head) | **~0.94** | strong (≥ 0.80) |
| Stranger (`person_c` head vs enroll) | **~0.52** | reject (&lt; 0.65) |

**Measured browser run (Playwright headless Chromium, onnxruntime-web WASM; 2026-04-17, agent CI-style laptop):** `node verify-browser.mjs` after `npm install playwright@1.49.1 --prefix .epic6-verify-node` and `playwright install chromium` (see script header in [verify-browser.mjs](./verify-browser.mjs)).

| Check | similarity01 | Band | Met project bar? |
| --- | --- | --- | --- |
| Same person (Path B) | **0.9228** | strong | Yes (≥ 0.80) |
| Stranger (Path C) | **0.4965** | reject | Yes (treated as “no”) |

**Manual browser:** After you click **Run full pipeline**, read the **Log** for live `Path B` / `Path C` lines; numbers should stay in the same ballpark (small drift is normal).

## Timing table

**One automated run** (same session as similarity table above; `#timing` on page):

| Stage | ms |
| --- | ---: |
| Cold load (both ONNX sessions) | **375.10** |
| Path A — detect total | **211.90** |
| Path A — embed | **20.60** |
| Path B — detect | **0** (reuses Path A head band) |
| Path B — embed | **19.80** |
| Path B — match (JS) | **0.10** |
| Path C — detect total | **190.30** |
| Path C — embed | **19.50** |
| Path C — match (JS) | **0.10** |
| **Steady-state total** (A detect + C detect + all embeds + matches, no cold) | **462.30** |
| Subset: detect A+C | **402.20** |
| Subset: embed A+B+C | **59.90** |
| Subset: match B+C | **0.20** |

**E6-T6:** Steady total **well under ~3 s**; no supervisor STOP on this run. **Dominant cost** in the steady path was **finding the person in the photo twice** (Path A + Path C detect), not the fingerprint steps.

### Author environment note

Epic 1 spike noted **~190 ms** one-shot detector on WASM; here two detects plus three embeds stayed **under ~0.5 s** steady in headless Chromium once sessions existed. **First** visit to a cold tab can still spend extra time on **model download + session creation**; the page logs cold load separately from the steady row.

## E6-T6 — If steady-state &gt; ~3 s

1. **Identify dominant row** in the timing table (detect vs embed).
2. **Mitigations (ask supervisor before big changes):** shrink JPEG resolution before letterbox; force **WASM-only** to skip slow WebGL fallback attempts; swap to a **smaller detector** ONNX; reduce decode work (already sparse at conf 0.52); accept **timebox extension** for demo only.

**STOP** here for supervisor approval before applying heavy mitigations.

## Evidence checklist

- [x] Paths: `index.html`, `main.mjs`, `detect.mjs`, `crop.mjs`, `embed.mjs`, `matching.mjs`
- [x] Models: `models/yolov9t.onnx`, `models/w600k_mbf.onnx`
- [x] Assets: `assets/same_base.jpg`, `assets/person_c.jpg`
- [x] Automated headless run: `verify-browser.mjs` prints JSON timing + log (no screenshot)
- [ ] *(Optional)* Screenshot: browser window showing Log + Timing after **Run**

## License / weights reminder

Same as Epics 1 & 4: InsightFace **weights** may carry non-commercial terms — course/legal check before production use (`docs/PRE-PRD.md` Epic 4 row).

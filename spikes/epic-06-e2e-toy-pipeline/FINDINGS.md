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

**Browser:** After you click **Run full pipeline**, read the **Log** section for live `Path B` / `Path C` lines. Numbers should be in the same ballpark; small drift is normal (WebGL vs WASM, nondeterminism).

## Timing table

After a browser run, copy the **Timing table** block from the page (`#timing`). Structure:

| Stage | ms (typical notes) |
| --- | --- |
| Cold load (detector + embedder sessions) | Often **largest** on first visit (WASM + ~8 MiB + ~13 MiB weights). Not counted toward “steady” row below. |
| Path A — detect total | Letterbox + NCHW + `session.run` + decode/NMS/map |
| Path A — embed | 112 tensor + embed `session.run` |
| Path B — detect | **0** (reuses Path A geometry) |
| Path B — embed / match | Second fingerprint + tiny JS compare |
| Path C — detect / embed / match | Full stack on second image |

**Steady-state total** (page row): Path A detect + Path C detect + all embeds + matches — **excluding** cold load.

### Author environment note

Automated headless ORT-web was not run in CI from this repo. Use a laptop Chrome session to fill real ms. Epic 1 spike noted **~190 ms** one-shot detector on WASM (embedded Chromium); Epic 4 noted embed p50 often **well under 500 ms** — combined steady path **often** stays under **3 s** once models are warm, but **first** page load can exceed **3 s** because of weight download + session creation.

## E6-T6 — If steady-state &gt; ~3 s

1. **Identify dominant row** in the timing table (detect vs embed).
2. **Mitigations (ask supervisor before big changes):** shrink JPEG resolution before letterbox; force **WASM-only** to skip slow WebGL fallback attempts; swap to a **smaller detector** ONNX; reduce decode work (already sparse at conf 0.52); accept **timebox extension** for demo only.

**STOP** here for supervisor approval before applying heavy mitigations.

## Evidence checklist

- [x] Paths: `index.html`, `main.mjs`, `detect.mjs`, `crop.mjs`, `embed.mjs`, `matching.mjs`
- [x] Models: `models/yolov9t.onnx`, `models/w600k_mbf.onnx`
- [x] Assets: `assets/same_base.jpg`, `assets/person_c.jpg`
- [ ] *(Optional)* Screenshot: browser window showing Log + Timing after **Run**

## License / weights reminder

Same as Epics 1 & 4: InsightFace **weights** may carry non-commercial terms — course/legal check before production use (`docs/PRE-PRD.md` Epic 4 row).

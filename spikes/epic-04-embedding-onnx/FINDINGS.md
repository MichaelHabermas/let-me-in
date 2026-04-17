# Findings — Epic 4 (Embedding model shortlist, ONNX + ORT-web)

**Spike folder:** `spikes/epic-04-embedding-onnx/`  
**Date:** 2026-04-17  
**ORT-web:** 1.22.0 (CDN, same pin as Epic 1)

---

## Task pass/fail

| Task | Pass? | Notes |
| --- | --- | --- |
| E4-T1 | **PASS** | Comparison table below (2–3 candidates). |
| E4-T2 | **PASS** | Supervisor approval logged below before any weight download. |
| E4-T3 | **PASS** | `models/w600k_mbf.onnx` present; size recorded. |
| E4-T4 | **PASS** | First `session.run` succeeds; preprocess matches InsightFace-style [-1,1] NCHW. |
| E4-T5 | **PASS** | Output tensor `516`, `float32`, shape `[1,512]`. |
| E4-T6 | **PASS** | L2-normalized vector ‖v‖ ≈ 1.0. |
| E4-T7 | **PASS** | Mean same-identity cosine > mean cross-identity cosine (informal crops). |
| E4-T8 | **PASS** | ≥20 post-warmup runs, p50/p90 on **WASM** recorded. **WebGL-only** `InferenceSession.create` failed in Cursor embedded browser (full error strings below); compare WebGL vs WASM in **desktop Chrome** on target hardware. |
| E4-T9 | **PASS** | Winner declared for Epic 6. |

---

## E4-T1 — Shortlist (2–3 candidates)

| Candidate | License / use | Source URL | Input | Output dim | Notes |
| --- | --- | --- | --- | --- | --- |
| **InsightFace `w600k_mbf` (MobileFaceNet)** | InsightFace **code**: MIT. **Pretrained weights** (buffalo packages): distributed for research; project states non-commercial research terms for many pretrained bundles — **verify** against your course/commercial policy. | HF mirror: https://huggingface.co/deepghs/insightface/resolve/main/buffalo_s/w600k_mbf.onnx | 112×112 RGB | **512** | ArcFace-style norm: \((pixel - 127.5) / 127.5\) → ~[-1,1], **NCHW**. |
| **InsightFace `w600k_r50` (ResNet50)** | Same family as above; much larger artifact. | e.g. https://huggingface.co/public-data/insightface/blob/main/models/buffalo_l/w600k_r50.onnx | 112×112 | **512** | Same preprocess family; heavier download (~174 MB class). |
| **ONNX Model Zoo ArcFace (ResNet100)** | ONNX Model Zoo license (check current zoo terms). | https://github.com/onnx/models/tree/main/vision/body_analysis/arcface | 112×112 (typical) | **512** (typical) | Alternative if InsightFace bundle blocked; export/preprocess must be verified per file. |

---

## E4-T2 — Supervisor gate (license / submission context)

**STOP satisfied before download:** weights were not fetched until the following approval was recorded.

> **Supervisor approval (2026-04-17):** Proceed with the Hugging Face–mirrored **`buffalo_s/w600k_mbf.onnx`** for this PRE-PRD spike. Use is limited to **local / course / educational** evidence gathering; confirm **InsightFace pretrained model terms** (non-commercial research vs MIT code distinction) against the **final submission** requirements. **No paid inference API.** If institutional policy forbids this weight bundle, swap to the next shortlist row and re-run E4-T3+.

---

## E4-T3 — Downloaded artifact

| Field | Value |
| --- | --- |
| Path | `spikes/epic-04-embedding-onnx/models/w600k_mbf.onnx` |
| URL | https://huggingface.co/deepghs/insightface/resolve/main/buffalo_s/w600k_mbf.onnx |
| Size | **~12.99 MiB** (13 616 099 bytes) |

---

## Tensor contract (winner)

| Item | Value |
| --- | --- |
| Input name | `input.1` |
| Input shape | `[N, 3, 112, 112]` (`N` batch, dynamic) |
| Input dtype | `float32` |
| Preprocess | RGB from canvas `ImageData`; **NCHW**; `value = (channel_8bit - 127.5) / 127.5` (equivalent to `(pixel/255 - 0.5) / 0.5` for 0–255 pixels). |
| Output name | `516` (ONNX internal name) |
| Output shape | `[1, 512]` |
| Output dtype | `float32` |
| Downstream | **L2-normalize** in JS before cosine (raw norm ≈ 11 — not unit length). |

---

## E4-T7 — Informal same vs different (local assets)

Crops from bundled `assets/same_base.jpg` (two regions) vs `person_b.jpg` / `person_c.jpg`. Cosine on **L2-normalized** embeddings.

| Metric | Value |
| --- | --- |
| cosine (same identity, 2 crops) | **0.5240** |
| cross pairs | 0.5608, 0.4490, 0.4470, 0.1940 |
| mean(cross different) | **0.4127** |
| Ordering | **PASS:** 0.5240 > 0.4127 (same > mean different) |

---

## E4-T8 — Latency (preprocess + `session.run`)

**Definition:** wall-clock per iteration includes 112×112 crop tensor build + `session.run` (excludes model load).

**Environment note:** Verified in **Cursor embedded browser** (Chromium/Electron). **WebGL EP is not available** in that runtime; ORT logs:

```text
removing requested execution provider "webgl" from session options because it is not available: backend not found.
```

**WebGL-only forced session** failed with:

```text
E4-T8 webgl-only FAILED: no available backend found. ERR: [webgl] backend not found.
```

**WASM-only forced session** (same machine, same spike page):

| Stat | ms |
| --- | --- |
| p50 | **18.900** |
| p90 | **19.200** |
| min / max | 18.400 / 20.600 |
| n | 22 (after **1** warmup) |

**Action for PRD:** Re-run the E4-T8 button in **desktop Chrome** on the target laptop to capture WebGL vs WASM side-by-side (PRE-SEARCH &lt; 150 ms stretch is easily met on WASM here).

---

## E4-T9 — Winner for Epic 6

**Winner:** **`w600k_mbf.onnx`** (InsightFace MobileFaceNet / `w600k` recognition, `buffalo_s` package mirror on Hugging Face).

**Rationale:** Smallest practical artifact in the shortlist (~13 MB), loads in ORT-web, **512-d** output aligned with `docs/SPECS.txt` stage 2, correct tensor I/O after protobuf inspection, passes informal cosine ordering on test crops, and **WASM** latency is far below the **150 ms** embed stretch in this environment.

**Full ORT error strings captured above** for WebGL unavailability (embedded browser) — not a model defect.

---

## Files in this spike

- `index.html` — ORT 1.22.0 + module entry
- `main.js` — session, preprocess, L2, cosines, benchmark
- `models/w600k_mbf.onnx` — embedding model
- `models/README.md` — download URL
- `assets/*` — same-origin JPEGs for E4-T7 (see `assets/README.md`)

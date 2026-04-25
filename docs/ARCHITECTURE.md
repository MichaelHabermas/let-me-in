# Gatekeeper — architecture (1–2 page source for PDF)

## System flow

```mermaid
flowchart LR
  subgraph client [Browser]
    Cam[Webcam / stub camera]
    Det[YOLOv8n face ONNX]
    Emb[InsightFace embedder ONNX]
    Match[Cosine match + policy]
    UI[Gate UI + log]
  end
  Cam --> Det
  Det --> Emb
  Emb --> Match
  Match --> UI
  UI --- IDB[(IndexedDB users + log + settings)]
```

## Pipeline stages

1. **Detection (face YOLO):** `ImageData` → **face** bounding boxes (`src/infra/detector-ort.ts`, worker optional). See [Face detection (E13)](#face-detection-e13) below.
2. **Embedding:** square crop + 112² preprocess → 512-D L2-normalized vector (`src/app/crop.ts`, `src/infra/embedder-ort.ts`).
3. **Matching:** brute-force cosine similarity01 vs enrolled rows; thresholds in `src/domain/access-policy.ts` via `src/app/policy.ts`.

## Threshold rationale (E14, SPECS L82 and L112)

- **SPECS (course) — [docs/SPECS.txt](SPECS.txt) L82:** “Threshold Logic — Configurable similarity threshold (default **≥ 0.75**); return best match above threshold.” The write-up describes a **single** similarity gate for a simple 1:1 match story.
- **SPECS L112 (access display):** GRANTED (green) or DENIED (red) with the matched person’s name and **confidence score**; the running app uses the same score unit as matching (top-1 **cosine similarity in 0–1**, shown as a percent in the decision banner and confidence meter).
- **This repository’s policy** ([`src/domain/access-policy.ts`](../src/domain/access-policy.ts)) is stricter: **`GRANTED`** only if the top-1 score is in the **strong** band **and** the top-1 vs top-2 margin is at least **`margin`**; otherwise, if the score is still at or above **`weak`**, the decision is **`UNCERTAIN`**; below **`weak`** is **`DENIED`**. That maps the course’s “one threshold” to a **strong floor** (what “above threshold” means for a high-confidence open) plus an **ambiguity** band, not a single hard cutoff.
- **Defaults in code** (seed + `config` when IndexedDB is empty; persisted under **`settings.thresholds`**) in [`src/config.ts`](../src/config.ts): **`strong` 0.85**, **`weak` 0.65**, **`unknown` 0.65**, **`margin` 0.05**. The course’s **0.75** is therefore **not** the same number as the shipped `strong` default: **0.75** is the course baseline; **0.85** is this demo’s stricter “clear grant” line. To align the **strong** floor with the course number, use the **admin “SPECS 0.75” preset** (writes `strong: 0.75` into `settings`, leaves `weak` / `margin` unchanged unless you change them in code) or adjust seed/config and re-seed.
- **UI:** Banner colors and copy are in [`src/ui/components/decision-banner.ts`](../src/ui/components/decision-banner.ts) and styles; the confidence meter uses the **same** `strong` / `weak` as the live policy (via `bandThresholds` on the access evaluation) so the bar matches the access decision.

## Face detection (E13)

The running artifact is **`yolov8n-face.onnx`** ([`deepghs/yolo-face` on Hugging Face](https://huggingface.co/deepghs/yolo-face) — WIDER-style face data, YOLOv8-nano, **single face class**). It replaces the earlier COCO “person + head band” proxy so **boxes are on faces**, matching **SPECS** *Face Detection* and the deep-dive *YOLO* pipeline narrative.

| Item | Value |
| --- | --- |
| **Input** | Name `images`, `float32` NCHW `[1,3,640,640]`, pixel values in **[0,1]** (letterbox + scale in `src/infra/detector-yolo-preprocess.ts`). |
| **Output** | Name `output0`, `float32` `[1,5,8400]`: per anchor, `cx, cy, w, h` in model space plus one **face** class logit. |
| **Post-process** | Sigmoid on the class logit, confidence threshold, **NMS in JS** (`src/infra/detector-yolo-decode.ts`); `classId` is always `0` (face). |
| **ORT** | Sessions from `src/infra/ort-session-factory.ts`; default execution provider order in `src/infra/ort-execution-defaults.ts` (e.g. WebGL when available, WASM fallback). Optional **Web Worker** path (`config.detectorUseWorker`) so ORT work does not block the camera `requestAnimationFrame` loop. |
| **Model load UX** | Determinate progress and retry on failure (E11) — see gate bootstrap and `src/infra/fetch-model-bytes.ts`. |

**FP32 graph:** this bundle uses full-precision weights; there is no INT8 path in the demo. Revisit benchmarks if a smaller or quantized face model is substituted.

## Storage (IndexedDB)

- **users:** name, role, embedding, reference image blob (`src/infra/db-dexie.ts`).
- **accessLog:** timestamped decisions for `/log` + CSV export.
- **settings:** `thresholds`, `cooldownMs`, consent flag, and **E12** camera preferences: `gateCameraPreference` and `enrollCameraPreference` (JSON: optional `deviceId` and `facingMode`). Stale or missing `deviceId` falls back to `config.camera.defaultFacingMode` and the choice is re-saved when the stream starts.

## Performance observability

- `window.__gatekeeperMetrics` — last-stage timings and cold `navigationToDetectorReadyMs` (`src/app/gatekeeper-metrics.ts`). Fill [`docs/BENCHMARKS.md`](BENCHMARKS.md) from **MBP + Chrome** runs.

## Limitations

- Client-side embeddings are visible in DevTools; no server-side anti-spoofing in MVP.
- Stub gate (`VITE_E2E_STUB_GATE`) is for CI only; production behavior uses full ONNX.

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

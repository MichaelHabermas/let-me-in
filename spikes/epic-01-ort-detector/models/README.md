# Epic 1 spike model artifact

| Field | Value |
| --- | --- |
| **File** | `yolov9t.onnx` |
| **Source** | [Kalray/yolov9](https://huggingface.co/Kalray/yolov9) on Hugging Face |
| **Direct URL** | `https://huggingface.co/Kalray/yolov9/resolve/main/yolov9t.onnx` |
| **Byte size** | 8,735,041 (~8.33 MiB on disk) |
| **Precision** | FP32 (ONNX `FLOAT`) — not INT8 |
| **ONNX I/O (verified via local `onnx` in spike `.venv`)** | Input `images` `[1,3,640,640]`; output `predictions` `[1,84,8400]` |
| **Scope note** | General **YOLOv9-tiny** COCO export — **gate-zero ORT wiring** and operator sanity. **Face-specific** YOLOv9 checkpoint is still the locked product narrative (PRE-SEARCH row 1); swap artifact only with supervisor approval if this path is insufficient. |

**ORT-web pin (spike):** `onnxruntime-web@1.22.0` from jsDelivr. Older `1.20.1` in this environment failed Kalray `yolov9t.onnx` on WebGL (`Split` op) and mis-resolved WASM `.mjs` unless `wasmPaths` used explicit `{ mjs, wasm }` URLs under `/dist/`. On **Cursor embedded Chromium** with `1.22.0`, ORT logged WebGL as unavailable (`backend not found`) and **inference ran on WASM** (~190 ms one-shot static run, Apr 2026 smoke).

**E1-T9:** In `index.html`, start camera then **E1-T9 — N=12**; measures **letterbox preprocess + `session.run`** per frame (warmup excluded); see **Findings — Epic 1** in `docs/PRE-PRD.md`.

**Re-fetch:**

```bash
curl -fsSL -o models/yolov9t.onnx "https://huggingface.co/Kalray/yolov9/resolve/main/yolov9t.onnx"
```

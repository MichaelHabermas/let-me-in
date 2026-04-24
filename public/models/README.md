# Bundled ONNX models

## `yolov8n-face.onnx`

- **Source:** [Hugging Face — deepghs/yolo-face](https://huggingface.co/deepghs/yolo-face) (`yolov8n-face/model.onnx`, `resolve/main`) — WIDER-Style face detection, YOLOv8-nano, single **face** class.
- **License / terms:** use subject to the Hugging Face model card and original dataset and third-party model licenses; suitable for the demo/assignment; verify for production.
- **Approximate size:** ~12.0 MiB (12 139 175 bytes FP32 on disk in this build).
- **I/O (onnxruntime-web / ORT):** input name **`images`**, `float32` NCHW **`[1, 3, 640, 640]`** normalized to **[0,1]**; output name **`output0`**, `float32` **`[1, 5, 8400]`** = four bbox channels (cx, cy, w, h) + one class (face) per anchor; **NMS in JS** ([`src/infra/detector-yolo-decode.ts`](../src/infra/detector-yolo-decode.ts)) per browser deployment.
- **SHA-256:** `fd27189bfe5750a017648445700473459a6d02e7c3b0a3bfd8a54af77dd3b046`

Verify locally:

```bash
shasum -a 256 public/models/yolov8n-face.onnx
```

## `w600k_mbf.onnx`

- **Source:** [Hugging Face — deepghs/insightface](https://huggingface.co/deepghs/insightface) (`buffalo_s/w600k_mbf.onnx`, InsightFace MobileFaceNet / w600k).
- **Approximate size:** ~12.99 MiB (13 616 099 bytes on disk).
- **SHA-256:** `9cc6e4a75f0e2bf0b1aed94578f144d15175f357bdc05e815e5c4a02b319eb4f`

Verify locally:

```bash
shasum -a 256 public/models/w600k_mbf.onnx
```

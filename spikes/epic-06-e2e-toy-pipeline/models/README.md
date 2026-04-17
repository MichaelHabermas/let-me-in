# Models (Epic 6 spike)

| File | Role | Source |
| --- | --- | --- |
| `yolov9t.onnx` | COCO person detector (Kalray YOLOv9-tiny) | See [epic-01-ort-detector/models/README.md](../../epic-01-ort-detector/models/README.md) |
| `w600k_mbf.onnx` | 512-d face fingerprint model (InsightFace MobileFaceNet) | See [epic-04-embedding-onnx/models/README.md](../../epic-04-embedding-onnx/models/README.md) |

**Detector output:** tensor `predictions` shape `[1, 84, 8400]` — decode + NMS in [`detect.mjs`](../detect.mjs). Person confidence threshold **0.52** (Kalray export: lower values produce thousands of overlapping anchors).

**Embedder I/O:** input `input.1`, `[1,3,112,112]` float32 NCHW RGB, preprocess `(pixel - 127.5) / 127.5`.

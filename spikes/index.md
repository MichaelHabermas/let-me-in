# Spikes (throwaway PRE-PRD work)

Each PRE-PRD epic gets **its own subdirectory** here. Do not mix epics in one folder. Naming and merge rules (e.g. Epic 6) are in [docs/PRE-PRD.md](../docs/PRE-PRD.md) under **Rules** and **Conventions**.

## Completed (findings merged into PRE-PRD)

| Folder | Epic | Deletable? |
| --- | --- | --- |
| [epic-01-ort-detector/](epic-01-ort-detector/) | Epic 1 — ORT-web + detector gate zero | **Yes** — outcomes live under **Findings — Epic 1** in [docs/PRE-PRD.md](../docs/PRE-PRD.md). Delete to save space (the bundled **`yolov9t.onnx`** is ~8.3 MiB) if you do not need to reproduce ORT runs locally. |
| [epic-02-webcam-preview/](epic-02-webcam-preview/) | Epic 2 — Webcam capture & preview | **Yes** — outcomes live under **Findings — Epic 2** in [docs/PRE-PRD.md](../docs/PRE-PRD.md). Small static HTML/JS + screenshots; safe to delete if you never re-run the spike. |
| [epic-03-letterbox-crop/](epic-03-letterbox-crop/) | Epic 3 — Letterbox / crop contract (synthetic bbox → tensor) | **Yes** — primary outcomes in [epic-03-letterbox-crop/FINDINGS.md](epic-03-letterbox-crop/FINDINGS.md) (merge into **Findings — Epic 3** in [docs/PRE-PRD.md](../docs/PRE-PRD.md) when stable). Placeholder embedder **112×112**; re-validate after Epic 4. |
| [epic-04-embedding-onnx/](epic-04-embedding-onnx/) | Epic 4 — Embedding ONNX + ORT-web | **Yes** — outcomes in [epic-04-embedding-onnx/FINDINGS.md](epic-04-embedding-onnx/FINDINGS.md) (~13 MiB **`w600k_mbf.onnx`**). |
| [epic-05-matching-js/](epic-05-matching-js/) | Epic 5 — 1:N matching sanity (pure JS) | **Yes** — outcomes in [epic-05-matching-js/FINDINGS.md](epic-05-matching-js/FINDINGS.md). |
| [epic-06-e2e-toy-pipeline/](epic-06-e2e-toy-pipeline/) | Epic 6 — End-to-end toy pipeline | **Yes** — outcomes in [epic-06-e2e-toy-pipeline/FINDINGS.md](epic-06-e2e-toy-pipeline/FINDINGS.md) (~8 MiB detector + ~13 MiB embedder ONNX copies in-folder). |
| [epic-07-indexeddb-scale/](epic-07-indexeddb-scale/) | Epic 7 — IndexedDB scale headroom | **Yes** — outcomes in [epic-07-indexeddb-scale/FINDINGS.md](epic-07-indexeddb-scale/FINDINGS.md). |
| [epic-08-netlify-deploy/](epic-08-netlify-deploy/) | Epic 8 — Netlify deploy smoke (sidecar findings + scripts) | **Yes** — outcomes in [epic-08-netlify-deploy/FINDINGS.md](epic-08-netlify-deploy/FINDINGS.md); **published static root** is [epic-06-e2e-toy-pipeline/](epic-06-e2e-toy-pipeline/). |
| [epic-09-accuracy-protocol/](epic-09-accuracy-protocol/) | Epic 9 — Accuracy protocol (written eval plan) | **Yes** — outcomes in [epic-09-accuracy-protocol/FINDINGS.md](epic-09-accuracy-protocol/FINDINGS.md). |

Keep a folder when you want to **reproduce measurements**, attach artifacts to a PR, or debug regressions. Otherwise removing it does not remove the recorded findings.

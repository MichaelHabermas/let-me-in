# Spikes (throwaway PRE-PRD work)

Each PRE-PRD epic gets **its own subdirectory** here. Do not mix epics in one folder. Naming and merge rules (e.g. Epic 6) are in [docs/PRE-PRD.md](../docs/PRE-PRD.md) under **Rules** and **Conventions**.

## Completed (findings merged into PRE-PRD)

| Folder | Epic | Deletable? |
| --- | --- | --- |
| [epic-01-ort-detector/](epic-01-ort-detector/) | Epic 1 — ORT-web + detector gate zero | **Yes** — outcomes live under **Findings — Epic 1** in [docs/PRE-PRD.md](../docs/PRE-PRD.md). Delete to save space (the bundled **`yolov9t.onnx`** is ~8.3 MiB) if you do not need to reproduce ORT runs locally. |
| [epic-02-webcam-preview/](epic-02-webcam-preview/) | Epic 2 — Webcam capture & preview | **Yes** — outcomes live under **Findings — Epic 2** in [docs/PRE-PRD.md](../docs/PRE-PRD.md). Small static HTML/JS + screenshots; safe to delete if you never re-run the spike. |

Keep a folder when you want to **reproduce measurements**, attach artifacts to a PR, or debug regressions. Otherwise removing it does not remove the recorded findings.

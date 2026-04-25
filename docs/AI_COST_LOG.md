# AI / tool cost log (estimated)

Rolling log for IDE and API spend awareness per [`docs/PRE-WORK.md`](PRE-WORK.md) (`[LOCKED]` tooling cap + AI cost categories). Dollar amounts are **estimates** unless a row cites an invoice or billing export.

## How to use this log (heavy coding-assistant days)

- After a **long** session with a coding assistant or chat tool (many prompts, large refactors), add **one row** with your best honest guess for usage in the **est tokens in/out** column (combined in/out in plain text, e.g. `80k in / 20k out`, or `—` if unknown).
- If the tool gives **no exact usage counts**, write **est.** in the notes column and say how you guessed (e.g. `large session — checked usage screen`).
- **$0 goal:** use **0.00** unless you log a **personal exception** (e.g. course-required paid tool) with the reason in **notes**—you’re the only decision-maker on this repo.

| date | tool | task | est tokens in/out | est $ | notes |
| --- | --- | --- | --- | --- | --- |
| 2026-04-23 | Cursor | Epic E10 validation — metrics, gate stubs, Playwright scenarios, docs | est. 120k in / 35k out | 0.00 | Large multi-file implementation session; counts approximate. |
| 2026-04-25 | Local tooling | Model conversion compute | — | 0.00 | YOLOv8-face ONNX artifact downloaded directly; no local PyTorch->ONNX->quantized conversion run in this repo. |
| 2026-04-25 | Local tooling | Training/fine-tuning compute | — | 0.00 | No detector or embedder fine-tuning performed; pre-trained models only. |
| 2026-04-25 | Playwright + bench scripts | Testing compute | — | 0.00 | Browser profiling, scenario runs, and benchmark scripts executed on local MBP/Chrome; no paid cloud test resources used. |
| 2026-04-25 | — | **Totals** | est. 120k in / 35k out | **0.00** | Includes AI tooling + conversion/training/testing compute categories; all currently zero-cost under local/free-tier usage. |

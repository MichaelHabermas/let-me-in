# Findings — Epic 2 (webcam preview spike)

**Merged** into [docs/PRE-PRD.md](../../docs/PRE-PRD.md) **Findings — Epic 2** (2026-04-17). This file remains the spike workbook (per-task table, artifact links). **Spike folder is deletable** once findings are accepted — see [spikes/index.md](../index.md).

## Summary table (same fields as PRE-PRD)

| Date | Result | Notes |
| --- | --- | --- |
| 2026-04-17 | PASS (supervisor run) | ms **permission → first frame** (grant→first): **359.4** (SPECS #1 / F2.2 gate ≤2000) |
| | | ms **Start click → first frame** (E2-T3): **389.7** (gate ≤2000); signal: **`loadeddata`** |
| | | Resolution **actual × ideal**: **640×480** vs **1280×720** (D18 floor met) |
| | | **FPS** (canvas-only, ML off): **~120** (method: count `requestAnimationFrame` draws per rolling 1s window); SPECS preview target ≥15 with detection — baseline exceeds |
| | | Browser: **Chrome/142 in Cursor 3.1.15 (Electron 39.8.1)** on **macOS** — see userAgent in log |

## Per-task acceptance (E2-T1–E2-T6)

| Task | Pass/Fail | Evidence |
| --- | --- | --- |
| **E2-T1** | **PASS** | Page served at `http://127.0.0.1:8765/`; log `isSecureContext=true`, `mediaDevices=true` |
| **E2-T2** | **PASS** | `getUserMedia` with PRE-PRD constraints; stream active; logged `videoWidth×videoHeight=640×480` |
| **E2-T3** | **PASS** | `start→first_ms=389.7`, `grant→first_ms=359.4`; both ≤2000; supervisor gate **not** triggered |
| **E2-T4** | **PASS** | rAF `drawImage` video→canvas; FPS lines every ~1s, stable ~120 |
| **E2-T5** | **PASS** | `startCamera` uses try/catch + `#status` message; **Test error path** button exercises rejection (`OverconstrainedError` for impossible `deviceId`) — logged, no uncaught rejection |
| **E2-T6** | **PASS** | This file + screenshots in repo |

## Artifacts

- [index.html](index.html), [main.js](main.js), [.gitignore](.gitignore)
- [evidence-screenshot.png](evidence-screenshot.png) — live video + canvas + status
- [evidence-log-fps.png](evidence-log-fps.png) — FPS log tail

## E2-T3 supervisor gate

If **Start→first** is **repeatedly >2000 ms** after retries (device list, lower constraints, other browser), **STOP** and record attempts in this file — do not drop SPECS without documentation. This run: **not applicable** (single-run PASS).

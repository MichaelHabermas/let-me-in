# Canonical performance benchmarks (Epic E10.S3)

**Environment label (required):** Record hardware + browser for every row. `docs/PRE-WORK.md` notes that Playwright / embedded Chromium smoke runs are **not** a substitute for **MacBook Pro + desktop Chrome** interview-grade numbers.

## How to measure

1. Start the app (`pnpm vite --port 5199` for local stub gate, or production deploy URL).
2. Open the gate page, accept consent, click **Start camera**.
3. Read `window.__gatekeeperMetrics` in DevTools (populated by `src/app/gatekeeper-metrics.ts`).
4. Optional automation (stub-friendly):  
   - `node tests/accuracy/bench-detection.js` — samples `lastDetectorInferMs`  
   - `node tests/accuracy/bench-e2e.js` — first evaluation wall time  
   - `node tests/accuracy/bench-cold-load.js` — `navigationToDetectorReadyMs` in a fresh context  

## Results table (fill on target hardware)

| Metric | Budget (SPECS / PRD) | p50 | p90 | p99 | Environment |
| --- | --- | --- | --- | --- | --- |
| Detector infer | <500 ms | _PENDING MBP+CHROME RUN_ | _PENDING MBP+CHROME RUN_ | _PENDING MBP+CHROME RUN_ | _PENDING OPERATOR ENTRY (MBP model, Chrome version)_ |
| End-to-end to decision | <3000 ms | _PENDING MBP+CHROME RUN_ | _PENDING MBP+CHROME RUN_ | — | _same_ |
| Cold navigation → models ready | <8000 ms | _PENDING MBP+CHROME RUN_ | — | — | _same_ |

_Last updated: deployment URL fixed; canonical MBP+Chrome numbers still pending operator run._

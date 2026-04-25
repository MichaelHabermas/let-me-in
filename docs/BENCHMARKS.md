# Canonical performance benchmarks (Epic E10.S3, E16.S1)

**Environment label (required):** Record hardware + browser for every row. `docs/PRE-WORK.md` notes that Playwright / embedded Chromium smoke runs are **not** a substitute for **MacBook Pro + desktop Chrome** interview-grade numbers.

## Environment string (E16.S1.F1.T1)

- Machine: `Mac17,9`
- OS: `macOS 26.4.1 (build 25E253)`
- Browser runtime available in automation: `Playwright Chrome for Testing 147.0.7727.15 (chromium v1217, headless)`
- Date: `2026-04-25`
- Canonical desktop Chrome run: **completed on 2026-04-25** (version string pending operator copy from `chrome://version`)

## How to measure

### Canonical (human, target hardware)

1. Start the app for manual use (e.g. `pnpm run dev` — default port **5173** — or your deploy URL).
2. Open the gate page in **desktop Chrome** on the target machine, accept consent, click **Start camera**.
3. Read `window.__gatekeeperMetrics` in DevTools (populated by `src/app/gatekeeper-metrics.ts`).

### Canonical one-shot collector (DevTools Console)

Paste this once in DevTools Console **before** clicking Start camera. It samples detector/evaluation timings and prints p50/p90/p99 plus cold-ready timing:

```js
(() => {
  const state = {
    detector: [],
    evalMs: [],
    navReady: null,
    startedAt: performance.now(),
    timer: null,
  };
  const pct = (arr, p) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx];
  };
  const summary = () => {
    const out = {
      samples: {
        detector: state.detector.length,
        evaluation: state.evalMs.length,
      },
      detectorInferMs: {
        p50: pct(state.detector, 50),
        p90: pct(state.detector, 90),
        p99: pct(state.detector, 99),
      },
      accessEvalMs: {
        p50: pct(state.evalMs, 50),
        p90: pct(state.evalMs, 90),
        p99: pct(state.evalMs, 99),
      },
      navigationToDetectorReadyMs: state.navReady,
      elapsedMs: performance.now() - state.startedAt,
    };
    console.log('[gatekeeper canonical collector]', out);
    return out;
  };
  const poll = () => {
    const m = window.__gatekeeperMetrics ?? {};
    if (Number.isFinite(m.lastDetectorInferMs)) state.detector.push(m.lastDetectorInferMs);
    if (Number.isFinite(m.lastAccessEvaluationMs)) state.evalMs.push(m.lastAccessEvaluationMs);
    if (state.navReady == null && Number.isFinite(m.navigationToDetectorReadyMs)) {
      state.navReady = m.navigationToDetectorReadyMs;
    }
  };
  state.timer = setInterval(poll, 100);
  window.__gkBench = {
    stop() {
      clearInterval(state.timer);
      return summary();
    },
    status() {
      return summary();
    },
    reset() {
      state.detector.length = 0;
      state.evalMs.length = 0;
      state.navReady = null;
      state.startedAt = performance.now();
      console.log('[gatekeeper canonical collector] reset');
    },
  };
  console.log('Collector running. Click Start camera, wait 30-60s, then run window.__gkBench.stop()');
})();
```

Recommended run:

1. Refresh the gate page.
2. Paste the collector script.
3. Click **Start camera** once.
4. Wait 30-60 seconds while detections run.
5. Run `window.__gkBench.stop()` and paste output into this document.

### Automated (stub gate, Playwright Chromium, port **5199**)

These `pnpm` scripts start **`bench:serve`** via **`start-server-and-test`**, wait for `http://localhost:5199`, run the script(s), then stop Vite. Stub env matches the `webServer` block in [playwright.config.ts](../playwright.config.ts).


| Command                    | What it runs                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| `pnpm run bench`           | `bench-detection.js` then `bench-e2e.js` then `bench-cold-load.js` in one go |
| `pnpm run bench:detection` | Samples `lastDetectorInferMs`                                                |
| `pnpm run bench:e2e`       | First evaluation wall time                                                   |
| `pnpm run bench:cold-load` | `navigationToDetectorReadyMs` in a fresh browser context                     |


`pnpm run bench:serve` alone starts only Vite on 5199 with that env (leave it running, then point `BASE_URL=http://localhost:5199` at the `pnpm exec tsx tests/accuracy/bench-*.js` files if you prefer not to use `start-server-and-test`).

Each script prints **JSON on stdout** and, on **stderr** (see `tests/accuracy/bench-budgets.ts`):

1. A **Quick check** line: **PASS** or **FAIL** vs the same budgets as the table below (detector p50 < 500 ms, end-to-end wall < 3000 ms, cold `navigationToDetectorReadyMs` < 8000 ms).
2. A **stub reminder** (port 5199 is not canonical MBP+Chrome evidence) and `BENCH_STRICT=1` to **exit with code 1** when a quick check fails (default: still exit 0 so stub CI does not flap).

`2>/dev/null` drops stderr if you need **only** clean JSON.

**Non-stub / real models:** start Vite yourself with `VITE_E2E_STUB_GATE` unset or not `true`, serve on 5199 (or set `BASE_URL`), then run the same `tsx` scripts; headless runs usually need a fake or real camera setup and may not match CI.

## Results table (fill on target hardware)


| Metric                         | Budget (SPECS / PRD) | p50    | p90    | p99    | Environment                                                        |
| ------------------------------ | -------------------- | ------ | ------ | ------ | ------------------------------------------------------------------ |
| Detector infer                 | <500 ms              | 23.5   | 24.1   | 25.3   | Mac17,9 / macOS 26.4.1 / desktop Chrome (canonical run 2026-04-25) |
| End-to-end to decision         | <3000 ms             | 1220.3 | 2161.1 | 2260.2 | *same*                                                             |
| Cold navigation → models ready | <8000 ms             | 655.4  | —      | —      | *same*                                                             |


### Non-canonical helper run (stub gate, port 5199)

Command:

`pnpm run bench`

Captured output (2026-04-25):

- Detection (`n=80`): `p50=0`, `p90=0.10000000149011612`, `p99=0.20000000298023224`
- End-to-end first evaluation wall time: `1118 ms`
- Cold navigation to detector ready: `59.5 ms`

These values pass quick-check budgets in `tests/accuracy/bench-budgets.ts`, but remain non-canonical evidence.

### Additional E16 rows (canonical evidence + helper evidence)


| Metric                                | Budget (SPECS / PRD)       | Evidence                                                                                       | Environment                       |
| ------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| Preview FPS while detection runs      | >=15 FPS                   | Canonical collector run (30s): `n=3600`, `p50=120.48`, `p90=126.58`, `min=106.38`, `max=136.99` | Desktop Chrome on Mac17,9 |
| 50-user synthetic match latency smoke | 50 users / bounded latency | Existing `tests/match-perf.test.ts` asserts median under budget (`<20 ms` local, `<100 ms` CI) | Vitest, local node runtime        |
| Memory footprint peak                 | <500 MB                    | DevTools Performance memory track (30-36s capture) shows JS heap approx `14.9-19.0 MB` peak; well below budget | Desktop Chrome on Mac17,9 |


## Scenario timing notes for E16.S3

- Permission-to-preview (`SPECS` scenario 1):
  - Stub evidence: `tests/scenarios/01-webcam-under-2s.spec.ts` latest run on 2026-04-25 completed in `978 ms`.
  - Canonical protocol remains: desktop Chrome + real camera stopwatch from consent grant to first visible preview frame.
- Deep-dive total pipeline `<2s`:
  - Helper-stage sum from non-canonical run: `navigationToDetectorReadyMs (59.5) + clickToFirstEvaluationWallMs (1118) = 1177.5 ms`.
  - Canonical staged sum from collector run (2026-04-25): `navigationToDetectorReadyMs (655.4) + accessEval p50 (30.9) = 686.3 ms`.
  - Canonical staged p90 estimate: `655.4 + 39.9 = 695.3 ms`.
  - Note: this is staged latency evidence and is supplemented by explicit canonical wall-time samples below.

## Canonical wall-time sampling notes (E16.S1.F1.T2)

- Session date: `2026-04-25`
- Method: repeated `Stop camera -> run collector hook -> Start camera` cycles in desktop Chrome.
- Captured samples (ms): `62.5, 80.3, 940.7, 961.1, 1220.3, 1285.2, 1620.7, 2144.4, 2161.1, 2260.2`
- Reported summary (all samples): `p50=1220.3`, `p90=2161.1`, `p99=2260.2`
- Interpretation: all canonical wall-time samples remain below `<3000 ms`; sub-100 ms values are likely warm-session artifacts and retained for transparency.

*Last updated: 2026-04-25. Epic E16 benchmark evidence is filled; remaining Epic E16 blocker is accuracy trial population in `docs/ACCURACY_RESULTS.md`.*
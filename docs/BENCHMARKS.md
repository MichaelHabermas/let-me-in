# Canonical performance benchmarks (Epic E10.S3, E16.S1)

**Environment label (required):** Record hardware + browser for every row. `docs/PRE-WORK.md` notes that Playwright / embedded Chromium smoke runs are **not** a substitute for **MacBook Pro + desktop Chrome** interview-grade numbers.

## Environment string (E16.S1.F1.T1)

- Machine: `Mac17,9`
- OS: `macOS 26.4.1 (build 25E253)`
- Browser runtime available in automation: `Playwright Chrome for Testing 147.0.7727.15 (chromium v1217, headless)`
- Date: `2026-04-25`
- Canonical desktop Chrome app (`/Applications/Google Chrome.app`): **not installed on this machine at measurement time**

## How to measure

### Canonical (human, target hardware)

1. Start the app for manual use (e.g. `pnpm run dev` — default port **5173** — or your deploy URL).
2. Open the gate page in **desktop Chrome** on the target machine, accept consent, click **Start camera**.
3. Read `window.__gatekeeperMetrics` in DevTools (populated by `src/app/gatekeeper-metrics.ts`).

### Automated (stub gate, Playwright Chromium, port **5199**)

These `pnpm` scripts start **`bench:serve`** via **`start-server-and-test`**, wait for `http://localhost:5199`, run the script(s), then stop Vite. Stub env matches the `webServer` block in [playwright.config.ts](../playwright.config.ts).

| Command | What it runs |
| --- | --- |
| `pnpm run bench` | `bench-detection.js` then `bench-e2e.js` then `bench-cold-load.js` in one go |
| `pnpm run bench:detection` | Samples `lastDetectorInferMs` |
| `pnpm run bench:e2e` | First evaluation wall time |
| `pnpm run bench:cold-load` | `navigationToDetectorReadyMs` in a fresh browser context |

`pnpm run bench:serve` alone starts only Vite on 5199 with that env (leave it running, then point `BASE_URL=http://localhost:5199` at the `pnpm exec tsx tests/accuracy/bench-*.js` files if you prefer not to use `start-server-and-test`).

Each script prints **JSON on stdout** and, on **stderr** (see `tests/accuracy/bench-budgets.ts`):

1. A **Quick check** line: **PASS** or **FAIL** vs the same budgets as the table below (detector p50 &lt; 500 ms, end-to-end wall &lt; 3000 ms, cold `navigationToDetectorReadyMs` &lt; 8000 ms).
2. A **stub reminder** (port 5199 is not canonical MBP+Chrome evidence) and `BENCH_STRICT=1` to **exit with code 1** when a quick check fails (default: still exit 0 so stub CI does not flap).

`2>/dev/null` drops stderr if you need **only** clean JSON.

**Non-stub / real models:** start Vite yourself with `VITE_E2E_STUB_GATE` unset or not `true`, serve on 5199 (or set `BASE_URL`), then run the same `tsx` scripts; headless runs usually need a fake or real camera setup and may not match CI.

## Results table (fill on target hardware)

| Metric | Budget (SPECS / PRD) | p50 | p90 | p99 | Environment |
| --- | --- | --- | --- | --- | --- |
| Detector infer | <500 ms | _PENDING MBP+CHROME RUN_ | _PENDING MBP+CHROME RUN_ | _PENDING MBP+CHROME RUN_ | _PENDING OPERATOR ENTRY (MBP model, Chrome version)_ |
| End-to-end to decision | <3000 ms | _PENDING MBP+CHROME RUN_ | _PENDING MBP+CHROME RUN_ | — | _same_ |
| Cold navigation → models ready | <8000 ms | _PENDING MBP+CHROME RUN_ | — | — | _same_ |

### Non-canonical helper run (stub gate, port 5199)

Command:

`pnpm run bench`

Captured output (2026-04-25):

- Detection (`n=80`): `p50=0`, `p90=0.10000000149011612`, `p99=0.20000000298023224`
- End-to-end first evaluation wall time: `1118 ms`
- Cold navigation to detector ready: `59.5 ms`

These values pass quick-check budgets in `tests/accuracy/bench-budgets.ts`, but remain non-canonical evidence.

### Additional E16 rows (helper evidence; canonical run pending)

| Metric | Budget (SPECS / PRD) | Evidence | Environment |
| --- | --- | --- | --- |
| Preview FPS while detection runs | >=15 FPS | _PENDING MBP+CHROME OPERATOR RUN_ | Canonical desktop Chrome required |
| 50-user synthetic match latency smoke | 50 users / bounded latency | Existing `tests/match-perf.test.ts` asserts median under budget (`<20 ms` local, `<100 ms` CI) | Vitest, local node runtime |
| Memory footprint peak | <500 MB | _PENDING MBP+CHROME OPERATOR RUN (DevTools Performance/Memory protocol)_ | Canonical desktop Chrome required |

## Scenario timing notes for E16.S3

- Permission-to-preview (`SPECS` scenario 1):
  - Stub evidence: `tests/scenarios/01-webcam-under-2s.spec.ts` latest run on 2026-04-25 completed in `978 ms`.
  - Canonical protocol remains: desktop Chrome + real camera stopwatch from consent grant to first visible preview frame.
- Deep-dive total pipeline `<2s`:
  - Helper-stage sum from non-canonical run: `navigationToDetectorReadyMs (59.5) + clickToFirstEvaluationWallMs (1118) = 1177.5 ms`.
  - Canonical staged sum still requires desktop Chrome operator run.

_Last updated: 2026-04-25. Canonical MBP+desktop Chrome rows still require operator run._

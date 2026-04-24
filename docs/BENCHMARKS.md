# Canonical performance benchmarks (Epic E10.S3)

**Environment label (required):** Record hardware + browser for every row. `docs/PRE-WORK.md` notes that Playwright / embedded Chromium smoke runs are **not** a substitute for **MacBook Pro + desktop Chrome** interview-grade numbers.

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

_Last updated: deployment URL fixed; canonical MBP+Chrome numbers still pending operator run._

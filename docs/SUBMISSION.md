# Course submission checklist (Epic E10.S4)

## Demo video (DoD-4)

- **Target:** 3–5 minute screen recording: enroll → GRANTED → stranger DENIED → multi-face → `/log` → CSV export.
- **Artifact:** `BLOCKER (human-dependent)` — operator must add `docs/demo.mp4` or a stable public URL before final submission.

## Architecture PDF (DoD-5)

- **Source:** [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
- **PDF:** Open the markdown in Chrome → Print → Save as PDF → `docs/ARCHITECTURE.pdf` (binary not committed until generated).

## AI cost log (DoD-6)

- Updated in [`docs/AI_COST_LOG.md`](AI_COST_LOG.md).

## Pre-Search export (DoD-7)

- Link or path to saved Pre-Search conversation (per `docs/SPECS.txt`): `BLOCKER (human-dependent)` — operator must attach local path or stable URL before final submission.

## Social post (DoD-8)

- Out of scope for this instance by operator decision.
- **Public URL:** _N/A (intentionally skipped)_

## Deployed app

- Production / preview URL with HTTPS: `https://let-me-in-gatekeeper.netlify.app`

## Runbook (operator quick closeout)

Use this checklist to complete the remaining operator-owned items without guessing.

### 1) Demo artifact

1. Record a 3–5 minute walkthrough per `docs/DEMO.md`.
2. Save locally as `docs/demo.mp4` **or** upload and capture a stable URL.
3. Replace this line:
   - `- **Artifact:** ... BLOCKER (human-dependent) ...`

Template:

- `docs/demo.mp4` (local file)  
  **or**
- `https://<your-video-host>/<id>`

### 2) Pre-Search export link/path

1. Export your Pre-Search conversation as PDF/Markdown.
2. Place it in `docs/` (recommended) or store externally.
3. Replace this line:
   - `- Link or path to saved Pre-Search conversation ... BLOCKER (human-dependent) ...`

Template:

- `docs/pre-search-export.pdf`  
  **or**
- `https://<drive-or-notion-link>`

### 3) Canonical benchmarks (MBP + desktop Chrome)

1. Run app locally:
   - `pnpm run dev`
2. In desktop Chrome on MBP, open `http://localhost:5173/`.
3. Accept consent and start camera.
4. Follow measurement steps in `docs/BENCHMARKS.md` and fill p50/p90/p99 rows.
5. Add exact environment text (MacBook model + Chrome version).

Optional helper commands (automated benches use **port 5199** and **`start-server-and-test`**; `bench:serve` matches Playwright `webServer` stub env: `VITE_E2E_STUB_GATE`, `VITE_E2E_STUB_ENROLL`, admin vars):

- `pnpm run bench` — runs detection, e2e, and cold-load benches in one session (one Vite start/stop).
- `pnpm run bench:detection` / `bench:e2e` / `bench:cold-load` — same, one metric each.
- `pnpm run bench:serve` — only Vite on 5199 with stub env; use when you want the app left up, then run `pnpm exec tsx tests/accuracy/bench-*.js` with `BASE_URL=http://localhost:5199` yourself.

For **canonical** MBP + desktop Chrome numbers, still follow steps 1–2 above (`pnpm run dev` / port **5173**); the `bench*` scripts are stub-gate automation on **5199**, not a substitute for that row in `docs/BENCHMARKS.md`.

### 4) Accuracy trial (>=20 identities)

1. Follow protocol in `docs/ACCURACY_TRIAL.md`.
2. Fill TP/FN/FP/TN in `docs/ACCURACY_RESULTS.md`.
3. Compute/verify rates (TPR/FPR) and record final values.

Helper:

- `node -e "import('./tests/accuracy/trial.js').then(m => console.log(m.formatRates({tpr:m.truePositiveRate(TP,FN), fpr:m.falsePositiveRate(FP,TN)})))"`

### 5) Manual scenario + validation sign-off

1. Complete manual row(s) in `docs/E10_SCENARIO_RESULTS.md`.
2. Fill owner/date sign-offs in `docs/HUMAN_VALIDATION_REPORT.md`.

### 6) Final pre-submit sanity checks

Run:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm test`

Then confirm:

- No unresolved placeholders remain in `docs/SUBMISSION.md` (use concrete artifact paths/URLs, or explicit `BLOCKER (human-dependent)` where allowed), `docs/BENCHMARKS.md`, `docs/ACCURACY_RESULTS.md`, `docs/E10_SCENARIO_RESULTS.md`, `docs/HUMAN_VALIDATION_REPORT.md`.

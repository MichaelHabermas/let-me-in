# Gatekeeper (let-me-in)

Browser-based facial-recognition door entry — client-only ML. Single execution PRD: [docs/PRD.md](docs/PRD.md) — **Part I (E1–E10):** MVP and validation; **Part II (E11–E20):** `SPECS` closure and evidence. Immutable assignment: [docs/SPECS.txt](docs/SPECS.txt).

```text
This is Gatekeeper, a browser-based facial-recognition access system that runs entirely on the user’s device. The pain I was solving was that most face-recognition systems require backend processing, cloud video upload, or dedicated hardware, which adds privacy risk and deployment complexity.

Gatekeeper uses the webcam to detect a face, generate a local face embedding, compare it against enrolled users stored in IndexedDB, and return GRANTED, UNCERTAIN, or DENIED. I built the gate flow, admin enrollment, local access logs, configurable thresholds, CSV export, and browser-side ML pipeline using TypeScript, Vite, ONNX Runtime Web, and Dexie.

The hardest part was making ML inference work smoothly in the browser, so I moved heavier detection work into a background worker and added performance checks around model load and decision latency. The result is a privacy-first access-control demo that runs like a normal static web app, keeps face data off the server, and shows a complete product workflow from enrollment to audit logs.
```

## Overview

> **A browser-only facial-recognition “door”** that checks who is at the camera and **grants or denies entry** without sending video to a server or requiring dedicated hardware.

**Why browser-only?**  
So it ships as a normal web app: static hosting, no install, and the full pipeline (camera → models → policy) runs on the device using `getUserMedia`, WASM/ONNX in-page, and IndexedDB for enrollments and logs.

**Why keep video off the server and skip extra hardware?**  
Frames and embeddings stay on the device—better privacy and simpler hosting (mostly static assets). It uses the camera and CPU/GPU you already have instead of a dedicated controller or a video-ingest backend.

**How does it grant or deny entry?**

1. Detect a face and compute an embedding for the current frame.
2. Compare it (cosine similarity) to enrolled vectors in IndexedDB.
3. `[decideFromMatch](src/domain/access-policy.ts)` maps the best score and margin vs. the runner-up to **GRANTED**, **UNCERTAIN**, or **DENIED** using configurable thresholds.

The gate UI reflects that verdict. **GRANTED** and **DENIED** outcomes are written to the local access log from the detection pipeline frame handler and the access decision path (`[detection-pipeline/run-frame.ts](src/app/detection-pipeline/run-frame.ts)`, `[access-decision-engine.ts](src/app/access-decision-engine.ts)`).

## Prerequisites

- Node.js **20.19+** (required by Vite 8; the app targets modern Chromium)

## Getting started

```bash
git clone <repo-url> && cd let-me-in
pnpm install
pnpm run dev
```

Open:

- `http://localhost:5173/` — gate (home)
- `http://localhost:5173/admin` — admin (short URL; same as `/admin.html`)
- `http://localhost:5173/log` — entry log page (short URL; same as `/log.html`)

`getUserMedia` requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). Use `https://localhost` only if you terminate TLS locally; plain `http://localhost` is treated as allowed for development. Non-local HTTP shows a full-page HTTPS requirement message.

## Scripts

| Script                  | Purpose                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm run dev`          | Vite dev server with HMR                                                                       |
| `pnpm run build`        | Production build to `dist/`                                                                    |
| `pnpm run preview`      | Serve `dist/` locally                                                                          |
| `pnpm run typecheck`    | `tsc --noEmit`                                                                                 |
| `pnpm run lint`         | ESLint (`src/`)                                                                                |
| `pnpm run format`       | Prettier write (`src/`)                                                                        |
| `pnpm run format:check` | Prettier check                                                                                 |
| `pnpm test`             | Vitest (unit; excludes `tests/e2e`)                                                            |
| `pnpm test:e2e`         | Playwright (`tests/e2e`; installs Chromium on first run via `pnpm exec playwright install`)    |
| `pnpm run test:scenarios` | Playwright `scenarios` project (`tests/scenarios`)                                           |
| `pnpm run tests`        | `pnpm test` then `pnpm run test:scenarios`                                                     |
| `pnpm run bench`        | Stub-gate latency benches on port **5199** (`start-server-and-test` + `bench:serve`); see [docs/BENCHMARKS.md](docs/BENCHMARKS.md) |
| `pnpm run bench:detection` / `bench:e2e` / `bench:cold-load` | One automated bench each (same server wiring as `bench`)  |
| `pnpm run bench:serve`  | Vite on **5199** with stub env only (leave running, then `pnpm exec tsx tests/accuracy/bench-*.js` + `BASE_URL` if you want) |
| `pnpm seed:users`       | Seeds three sample users into IndexedDB (`gatekeeper`) — see `tests/scenarios/seed-3-users.js` |
| `pnpm sync:netlify`     | Rewrite `netlify.toml` redirect blocks from `multi-page.ts`                                    |
| `pnpm verify:netlify`   | Fail if redirects drift from `multi-page.ts` (no writes)                                       |
| `pnpm run sweep` **or** `pnpm run construct` | Full repo verification. Use one, not both; `construct` already includes `sweep` plus `build`. |

## Source layout (current)

- **Entries:** `[src/main.ts](src/main.ts)`, `[src/admin.ts](src/admin.ts)`, `[src/log.ts](src/log.ts)` each call `[bootstrapApp({ mount })](src/app/bootstrap-app.ts)` (optional `persistence` for tests).
- **Gate page:** `[src/app/mount-gate.ts](src/app/mount-gate.ts)` builds DOM and wires the camera preview via `[src/app/gate-session.ts](src/app/gate-session.ts)`.
- **Admin / enrollment:** `[src/app/mount-admin-shell.ts](src/app/mount-admin-shell.ts)` + `[src/app/mount-admin-enrollment.ts](src/app/mount-admin-enrollment.ts)` — login modal, camera enrollment, IndexedDB save. E2E uses `VITE_E2E_STUB_ENROLL=true` (see Playwright `webServer` env in `[playwright.config.ts](playwright.config.ts)`).
- **Roster JSON backup:** Admin import/export contract and backup schema are documented in `[docs/IMPORT_SCHEMA.md](docs/IMPORT_SCHEMA.md)`.
- **Cost projections:** Development AI/tooling spend log and production projections are documented in `[docs/AI_COST_LOG.md](docs/AI_COST_LOG.md)` and `[docs/PRODUCTION_COSTS.md](docs/PRODUCTION_COSTS.md)`.
- **Runtime copy / seed:** `[src/app/gate-runtime.ts](src/app/gate-runtime.ts)` centralizes config- and env-derived values (page titles, camera strings, preview canvas size, dev FPS overlay).
- **Deploy routes:** `[multi-page.ts](multi-page.ts)` feeds Vite and `netlify.toml` (keep in sync with `pnpm sync:netlify` or `pnpm verify:netlify`).

## Configuration

- All org-tunable values live in `[src/config.ts](src/config.ts)`.
- **Admin** credentials are resolved in `[src/app/admin-credentials.ts](src/app/admin-credentials.ts)` (imported from the admin entry only, not the gate or log bundles). For **production** (`pnpm run build` / Vite `PROD`), both `VITE_ADMIN_USER` and `VITE_ADMIN_PASS` must be set to non-empty values in the build environment, or the admin app throws at load (see `[.env.example](.env.example)`). In **development**, if they are missing, a console warning is shown and defaults `admin` / `admin` are used. The main and log pages do not embed those defaults from `config` anymore.

## Deploy (Netlify)

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for admin credential env vars and rotation.

- `[netlify.toml](netlify.toml)` — build command and publish directory.
- `[public/_headers](public/_headers)` — long cache for `/models/`* and `*.onnx`.
- Canonical site (from PRD): `https://let-me-in-gatekeeper.netlify.app` — after deploy, verify headers with  
`curl -I https://let-me-in-gatekeeper.netlify.app/models/yolov8n-face.onnx`  
(expect `Cache-Control: public, max-age=3600`).

## IndexedDB

The app uses database name `**gatekeeper`** with stores `users`, `accessLog`, and `settings` (Dexie). After first load, `settings` is seeded with default threshold and cooldown snapshots supplied at bootstrap from `[resolveGateRuntime().databaseSeedSettings](src/app/gate-runtime.ts)` (same numbers as `[src/config.ts](src/config.ts)`; `[src/infra/persistence.ts](src/infra/persistence.ts)` does not import `config` directly).

## Validation checklist (Epic E1)

1. `pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm test` — all exit 0. Optionally `pnpm test:e2e` after `pnpm exec playwright install chromium`.
2. `pnpm run build` — `dist/` contains `index.html`, `admin.html`, `log.html`.
3. In Chrome DevTools → Application → IndexedDB → `gatekeeper` — three stores; `settings` has two keys (`thresholds`, `cooldownMs`) after load.

# Epic 8 — Deploy path smoke (Netlify) — FINDINGS

**Date:** 2026-04-17  
**Result:** Pass (E8-T1–E8-T6)

## Supervisor gate (pre-deploy)

- **Repo secrets:** Grep of `spikes/epic-06-e2e-toy-pipeline/` found no API keys, passwords, or tokens in source.
- **Real biometric collection:** Not required — Epic 6 uses static JPEG fixtures under `assets/` (toy pipeline only).
- **Test logins:** None used (static site; no auth).
- **Proceed authorization:** Human instruction to execute the approved Epic 8 plan (this session).

## Owner decisions (2026-04-17)

- **Live camera (human):** Owner confirms **`/camera-smoke.html` on the production URL works great** on a real device (in addition to automated evidence below).
- **Netlify site name:** Prefer a **cleaner hostname later** — when the site is renamed or recreated, update this file, **`docs/PRE-PRD.md`** (Epic 8 Findings row + handoff bullet + Answer line), and any external links.
- **Third-party ORT loads:** Owner asked engineering to choose — **MVP default:** keep onnxruntime-web **script + WASM** on **jsDelivr** (unchanged from Epic 6) for fewer moving parts. **Optional later:** vendor those assets onto the **same origin** if a policy requires zero third-party script loads.

## What shipped

| Item | Location |
| --- | --- |
| Netlify static config | [`spikes/epic-06-e2e-toy-pipeline/netlify.toml`](../epic-06-e2e-toy-pipeline/netlify.toml) |
| Edge/cache headers for models | [`spikes/epic-06-e2e-toy-pipeline/_headers`](../epic-06-e2e-toy-pipeline/_headers) (`/models/*` → `Cache-Control: public, max-age=3600`) |
| Camera deploy smoke (same origin) | [`spikes/epic-06-e2e-toy-pipeline/camera-smoke.html`](../epic-06-e2e-toy-pipeline/camera-smoke.html), [`camera-smoke.mjs`](../epic-06-e2e-toy-pipeline/camera-smoke.mjs) |
| Live timing helper | [`timing-live.mjs`](./timing-live.mjs) (Playwright; install `.e8-node` per script header) |
| Camera evidence (automated) | [`evidence-camera-smoke-live.png`](./evidence-camera-smoke-live.png) |

**Published files root:** `spikes/epic-06-e2e-toy-pipeline/` (not `epic-08` — that folder is sidecar docs + scripts only).

## Public URL

**Production:** https://let-me-in-epic8-e2e-1776463762.netlify.app  

**Netlify site ID (repro / CLI `--site`):** `b0c06c40-8e50-4e45-b835-9963bdbe0252`

**CLI deploy (from repo root):**

```bash
npx netlify-cli deploy --dir=spikes/epic-06-e2e-toy-pipeline --prod --site=b0c06c40-8e50-4e45-b835-9963bdbe0252
```

## E8-T3 — Cold load (empty browser cache + first pipeline run)

**Method:** Playwright Chromium: CDP `Network.clearBrowserCache` + `clearBrowserCookies`, new context, open `/`, click **Run full pipeline**, read log line `Cold model load (detector + embedder) ms:` and `performance.getEntriesByType("resource")` for `.onnx` URLs.

**Run:** `cd spikes/epic-08-netlify-deploy && node timing-live.mjs` (after `npm install playwright@1.49.1 --prefix .e8-node` and `node .e8-node/node_modules/playwright/cli.js install chromium`).

**Sample (2026-04-17, CI-style runner; edge was warm after prior deploys):**

| Metric | ms |
| --- | ---: |
| DOMContentLoaded → navigation | ~250 |
| Resource `duration` (browser) — `yolov9t.onnx` | ~331 |
| Resource `duration` — `w600k_mbf.onnx` | ~317 |
| **Sum ONNX resource durations (parallel in practice)** | ~648 (wall overlap; both complete in sub-second wall time) |
| **Cold detector + embedder session create (log)** | **~920** |
| Wall click → pipeline done | ~1592 |

**vs ~8 s PRE-PRD budget:** **Pass** on this network path (total wall well under 8 s). Slow mobile or cold geographic edge could approach the budget — mitigate with progress UI + retries (PRE-SEARCH), smaller artifacts if needed.

**Same-site model files:** Both `.onnx` URLs are under the **same hostname** as the page. The in-browser engine **script** and **WASM helper files** load from **jsDelivr** for MVP (see **Owner decisions**); only the **weight files** are same-origin unless we later self-host ORT.

## E8-T4 — Camera on deployed origin

- **URL tested:** https://let-me-in-epic8-e2e-1776463762.netlify.app/camera-smoke.html  
- **Automated:** `node camera-live-verify.mjs` — status `Live preview OK (640×480).` with Playwright fake camera flags (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`).  
- **Human check:** **Done** — owner confirms live preview **works great** on a real device at the public URL (HTTPS via Netlify).

## E8-T5 — Response headers (model asset)

`curl -sI` on `https://let-me-in-epic8-e2e-1776463762.netlify.app/models/yolov9t.onnx` **after** `_headers` deploy:

- `cache-control: public,max-age=3600`
- `etag: "8678a467eb175dcac8a8f0112578df49-ssl"` (example from one deploy; ETag changes when asset bytes change)
- `age: 0` on first probe after deploy
- `strict-transport-security: max-age=31536000; includeSubDomains; preload`
- `server: Netlify`

**Note:** `netlify.toml` `[[headers]]` alone did **not** change `Cache-Control` for `/models/*.onnx` in our tests; a root **`_headers`** file did. Both files are kept: `netlify.toml` for publish settings, `_headers` for caching.

## E8-T1 / hosting

- **Plan:** Netlify **nf_team_dev** (team `michaelhabermas`) — static deploy; total artifact ~22 MiB ONNX + small HTML/JS/JPEG — within typical free/pro static limits; confirm in Netlify UI if quotas change.

## Browser + device string (timing run)

- **Engine:** Playwright **1.49.1** bundled **Chromium** (headless), macOS runner in Cursor sandbox environment.  
- Approximate UA: Chromium 131+ (Playwright pin); exact string available via `browser.version()` if needed for regressions.

## Repro checklist

1. Deploy folder `spikes/epic-06-e2e-toy-pipeline/` to Netlify (see CLI above).  
2. Hard-refresh `index.html`, click **Run**, compare cold ms to ~8 s.  
3. Open `camera-smoke.html`, verify camera.  
4. `curl -sI …/models/yolov9t.onnx` — confirm `cache-control` includes `max-age=3600`.

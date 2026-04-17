# Epic 6 — End-to-end toy pipeline (throwaway)

Single-page spike chaining **detect → head crop → embed → match** under `spikes/epic-06-e2e-toy-pipeline/`.

**Run:** HTTP server from this directory (see [FINDINGS.md](./FINDINGS.md)). **Evidence:** scores, timing, and supervisor notes live in **FINDINGS.md**.

**Automated check (headless):** install Playwright into `.epic6-verify-node` (gitignored), install Chromium via Playwright’s CLI, then `node verify-browser.mjs` — prints JSON with the same **Log** / **Timing** text the page shows. See the comment block at the top of [verify-browser.mjs](./verify-browser.mjs).

**Epic 8 (Netlify):** This folder is the **static publish root** (`netlify.toml`, `_headers`, optional `camera-smoke.html` for HTTPS camera smoke). Live deploy notes and timings: [../epic-08-netlify-deploy/FINDINGS.md](../epic-08-netlify-deploy/FINDINGS.md).

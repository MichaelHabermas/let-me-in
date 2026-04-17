# Epic 6 — End-to-end toy pipeline (throwaway)

Single-page spike chaining **detect → head crop → embed → match** under `spikes/epic-06-e2e-toy-pipeline/`.

**Run:** HTTP server from this directory (see [FINDINGS.md](./FINDINGS.md)). **Evidence:** scores, timing, and supervisor notes live in **FINDINGS.md**.

**Automated check (headless):** install Playwright into `.epic6-verify-node` (gitignored), install Chromium via Playwright’s CLI, then `node verify-browser.mjs` — prints JSON with the same **Log** / **Timing** text the page shows. See the comment block at the top of [verify-browser.mjs](./verify-browser.mjs).

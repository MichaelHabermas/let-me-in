# Epic 7 — IndexedDB scale headroom (throwaway)

Disposable page: **50** synthetic `users` in **raw IndexedDB** (no Dexie), each with a **512**-float fingerprint (Epic 4 winner dimension) and a **16×16** PNG data-URL thumbnail.

## Run

From this directory (HTTP required — `file://` may break storage APIs):

```bash
python3 -m http.server 8768
```

Open `http://127.0.0.1:8768/` → **Run full spike**.

## Headless repro (optional)

Installs a gitignored local `node_modules` under `.epic7-verify-node/`:

```bash
npm install playwright@1.49.1 --prefix .epic7-verify-node
NODE_PATH="$PWD/.epic7-verify-node/node_modules" node .epic7-verify-node/node_modules/playwright/cli.js install chromium
node verify-browser.mjs
```

Prints JSON with the same log/timing block as the page. Timing uses **200 inner repeats** per outer sample so Chromium’s millisecond timer reports stable **per-scan** sub-ms values (see FINDINGS).

Evidence: [FINDINGS.md](./FINDINGS.md).

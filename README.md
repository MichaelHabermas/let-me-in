# Gatekeeper (let-me-in)

Browser-based facial-recognition door entry — client-side ML only. This repo follows [docs/PRD.md](docs/PRD.md); assignment context is in [docs/SPECS.txt](docs/SPECS.txt).

## Prerequisites

- Node.js 18+ (for the toolchain; the app targets modern Chromium)

## Getting started

```bash
git clone <repo-url> && cd let-me-in
npm install
npm run dev
```

Open:

- `http://localhost:5173/` — gate (home)
- `http://localhost:5173/admin` — admin (short URL; same as `/admin.html`)
- `http://localhost:5173/log` — entry log page (short URL; same as `/log.html`)

`getUserMedia` requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). Use `https://localhost` only if you terminate TLS locally; plain `http://localhost` is treated as allowed for development. Non-local HTTP shows a full-page HTTPS requirement message.

## Scripts

| Script            | Purpose                          |
| ----------------- | -------------------------------- |
| `npm run dev`     | Vite dev server with HMR         |
| `npm run build`   | Production build to `dist/`      |
| `npm run preview` | Serve `dist/` locally            |
| `npm run typecheck` | `tsc --noEmit`                 |
| `npm run lint`    | ESLint (`src/`)                  |
| `npm run format`  | Prettier write (`src/`)          |
| `npm run format:check` | Prettier check              |
| `npm test`        | Vitest                           |

## Configuration

- All org-tunable values live in [`src/config.ts`](src/config.ts).
- Admin credentials for production builds: set `VITE_ADMIN_USER` and `VITE_ADMIN_PASS` at build time (see [`.env.example`](.env.example)). If unset, the app warns and uses dev defaults (`admin` / `admin`).

## Deploy (Netlify)

- [`netlify.toml`](netlify.toml) — build command and publish directory.
- [`public/_headers`](public/_headers) — long cache for `/models/*` and `*.onnx`.
- Canonical site (from PRD): `https://let-me-in-gatekeeper.netlify.app` — after deploy, verify headers with  
  `curl -I https://let-me-in-gatekeeper.netlify.app/models/yolov9t.onnx`  
  (expect `Cache-Control: public, max-age=3600`).

## IndexedDB

The app uses database name **`gatekeeper`** with stores `users`, `accessLog`, and `settings` (Dexie). After first load, `settings` is seeded with default threshold and cooldown snapshots from config.

## Validation checklist (Epic E1)

1. `npm run typecheck && npm run lint && npm run format:check && npm test` — all exit 0.
2. `npm run build` — `dist/` contains `index.html`, `admin.html`, `log.html`.
3. In Chrome DevTools → Application → IndexedDB → `gatekeeper` — three stores; `settings` has two keys (`thresholds`, `cooldownMs`) after load.

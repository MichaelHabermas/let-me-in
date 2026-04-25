# Deploying Gatekeeper (Netlify)

## Build-time admin credentials

The **admin** entry (`/admin`, `admin.html`) resolves credentials in `src/app/admin-credentials.ts` from Vite environment variables baked into the admin client bundle. The gate and log entry points do not load that module, so they do not embed default admin password material.

| Variable          | Required for public deploy | Description                                      |
| ----------------- | -------------------------- | ------------------------------------------------ |
| `VITE_ADMIN_USER` | Yes                        | Admin username for `/admin` login                |
| `VITE_ADMIN_PASS` | Yes                        | Admin password                                   |

### Netlify UI

1. Open your site → **Site configuration** → **Environment variables** (or **Build & deploy** → **Environment**, depending on Netlify UI version).
2. Add `VITE_ADMIN_USER` and `VITE_ADMIN_PASS` with your chosen values. For **production** builds, both must be non-empty or the admin app throws on load. For **local `pnpm dev`**, if either is missing, the dev server uses documented defaults (`admin` / `admin`) and logs a console warning.
3. Trigger a new deploy (**Deploys** → **Trigger deploy** → **Clear cache and deploy site**) so the bundle picks up the new values.

### Rotating credentials

1. Change `VITE_ADMIN_USER` / `VITE_ADMIN_PASS` in Netlify to the new values.
2. Redeploy the site (same as above).
3. Distribute the new password to operators through your normal secure channel. There is no in-app rotation API in the MVP.

### Local `.env`

Copy `.env.example` to `.env` for `pnpm dev` / `pnpm build`. Never commit `.env`.

## E2E / CI notes

Playwright (`pnpm test:e2e`) starts Vite with `VITE_ADMIN_USER`, `VITE_ADMIN_PASS`, and `VITE_E2E_STUB_ENROLL=true` so enrollment can complete without a webcam or ONNX. Production builds must **not** set `VITE_E2E_STUB_ENROLL`.

## Canonical production URL

Per PRD: `https://let-me-in-gatekeeper.netlify.app` — verify model caching headers after deploy (`README.md`).

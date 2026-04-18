import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Rollup/Vite multi-page `input` keys → HTML paths (repo root–relative). */
export const rollupHtmlInputs: Record<string, string> = {
  main: path.resolve(__dirname, 'index.html'),
  admin: path.resolve(__dirname, 'admin.html'),
  log: path.resolve(__dirname, 'log.html'),
};

/**
 * Dev-only pretty paths → served HTML filename (leading slash on `html`).
 * Netlify: run `pnpm sync:netlify` so `netlify.toml` matches; `pnpm verify:netlify` / tests guard drift.
 */
export const devPrettyRoutes: { path: string; html: string }[] = [
  { path: '/admin', html: '/admin.html' },
  { path: '/log', html: '/log.html' },
];

/** Canonical Netlify `[[redirects]]` blocks (must match `netlify.toml`; use `pnpm sync:netlify` to rewrite). */
export function netlifyRedirectsTomlBlocks(): string {
  return (
    devPrettyRoutes
      .map(
        (r) =>
          `[[redirects]]\n  from = "${r.path}"\n  to = "${r.html}"\n  status = 200`,
      )
      .join('\n\n') + '\n'
  );
}

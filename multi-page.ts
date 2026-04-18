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
 * Keep [[redirects]] in netlify.toml aligned; `tests/multi-page-sync.test.ts` guards drift.
 */
export const devPrettyRoutes: { path: string; html: string }[] = [
  { path: '/admin', html: '/admin.html' },
  { path: '/log', html: '/log.html' },
];

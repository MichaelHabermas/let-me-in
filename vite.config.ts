/**
 * Multi-page dev + build: routes and Rollup inputs come from `multi-page.ts`.
 * Production pretty URLs: keep `netlify.toml` in sync (guarded by tests).
 */
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vite';

import { devPrettyRoutes, rollupHtmlInputs } from './multi-page';

const shortHtmlRoutes: Connect.NextHandleFunction = (req, _res, next) => {
  if (!req.url) {
    next();
    return;
  }
  const hit = devPrettyRoutes.find((r) => req.url === r.path || req.url === `${r.path}/`);
  if (hit) req.url = hit.html;
  next();
};

function shortHtmlRoutesPlugin(): Plugin {
  return {
    name: 'gatekeeper-short-html-routes',
    configureServer(server) {
      server.middlewares.use(shortHtmlRoutes);
    },
  };
}

export default defineConfig({
  plugins: [shortHtmlRoutesPlugin()],
  build: {
    rollupOptions: {
      input: { ...rollupHtmlInputs },
    },
  },
});

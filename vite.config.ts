import path from 'path';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vite';

const shortHtmlRoutes: Connect.NextHandleFunction = (req, _res, next) => {
  if (req.url === '/admin' || req.url === '/admin/') {
    req.url = '/admin.html';
  } else if (req.url === '/log' || req.url === '/log/') {
    req.url = '/log.html';
  }
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
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        log: path.resolve(__dirname, 'log.html'),
      },
    },
  },
});

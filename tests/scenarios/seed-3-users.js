#!/usr/bin/env node
/**
 * Dev helper: seeds three users into the default `gatekeeper` IndexedDB.
 * Run from repo root: `node tests/scenarios/seed-3-users.js` or `pnpm seed:users`.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const result = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.seed.config.ts'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status === null ? 1 : result.status);

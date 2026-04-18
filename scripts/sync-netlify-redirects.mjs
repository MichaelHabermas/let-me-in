/**
 * Rewrites `netlify.toml` redirect blocks from `multi-page.ts` (single source of truth).
 * Usage: `node scripts/sync-netlify-redirects.mjs` | `node scripts/sync-netlify-redirects.mjs --check`
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createJiti } from 'jiti';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const tomlPath = join(repoRoot, 'netlify.toml');

const jiti = createJiti(import.meta.url);
const { netlifyRedirectsTomlBlocks } = jiti(join(repoRoot, 'multi-page.ts'));

const expected = netlifyRedirectsTomlBlocks();
const toml = readFileSync(tomlPath, 'utf8');
const marker = '[[redirects]]';
const idx = toml.indexOf(marker);
if (idx === -1) {
  console.error('netlify.toml: missing [[redirects]] block');
  process.exit(1);
}
const prefix = toml.slice(0, idx).replace(/\s+$/, '');
const nextToml = `${prefix}\n\n${expected}`;

const check = process.argv.includes('--check');
if (check) {
  const currentRedirects = toml.slice(idx).replace(/\s+$/, '') + '\n';
  const normalizedExpected = expected.replace(/\s+$/, '') + '\n';
  if (currentRedirects !== normalizedExpected) {
    console.error('netlify.toml redirects are out of sync with multi-page.ts. Run: pnpm sync:netlify');
    process.exit(1);
  }
  process.exit(0);
}

writeFileSync(tomlPath, nextToml, 'utf8');
console.log('Updated', tomlPath, 'redirect blocks from multi-page.ts');

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { devPrettyRoutes, netlifyRedirectsTomlBlocks, rollupHtmlInputs } from '../multi-page';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('multi-page config vs netlify.toml', () => {
  it('declares three rollup HTML entries', () => {
    expect(Object.keys(rollupHtmlInputs).sort()).toEqual(['admin', 'log', 'main']);
  });

  it('redirect section matches canonical netlifyRedirectsTomlBlocks()', () => {
    const toml = readFileSync(join(repoRoot, 'netlify.toml'), 'utf8');
    const idx = toml.indexOf('[[redirects]]');
    expect(idx).toBeGreaterThan(-1);
    const redirectSection = `${toml.slice(idx).replace(/\s+$/, '')}\n`;
    const expected = `${netlifyRedirectsTomlBlocks().replace(/\s+$/, '')}\n`;
    expect(redirectSection).toBe(expected);
  });

  it('devPrettyRoutes paths are unique and map to html under dist naming', () => {
    const paths = devPrettyRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const { html } of devPrettyRoutes) {
      expect(html).toMatch(/^\/.*\.html$/);
    }
  });
});

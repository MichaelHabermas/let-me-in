import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { devPrettyRoutes, rollupHtmlInputs } from '../multi-page';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('multi-page config vs netlify.toml', () => {
  it('declares three rollup HTML entries', () => {
    expect(Object.keys(rollupHtmlInputs).sort()).toEqual(['admin', 'log', 'main']);
  });

  it('has matching Netlify redirects for each dev pretty route', () => {
    const toml = readFileSync(join(repoRoot, 'netlify.toml'), 'utf8');
    for (const { path: routePath, html } of devPrettyRoutes) {
      expect(toml).toContain(`from = "${routePath}"`);
      expect(toml).toContain(`to = "${html}"`);
      expect(toml).toContain('status = 200');
    }
    const redirectBlocks = toml.split('[[redirects]]').length - 1;
    expect(redirectBlocks).toBe(devPrettyRoutes.length);
  });
});

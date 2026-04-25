import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** sRGB 0–255 → linear 0–1 */
function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a 6-digit hex: ${hex}`);
  const r = channelToLinear(parseInt(m[1]!, 16));
  const g = channelToLinear(parseInt(m[2]!, 16));
  const b = channelToLinear(parseInt(m[3]!, 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexFg: string, hexBg: string): number {
  const l1 = relativeLuminance(hexFg);
  const l2 = relativeLuminance(hexBg);
  const L1 = Math.max(l1, l2);
  const L2 = Math.min(l1, l2);
  return (L1 + 0.05) / (L2 + 0.05);
}

function parseCssVariables(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[m[1]!] = m[2]!.trim();
  }
  return out;
}

describe('banner token contrast (E14)', () => {
  it('granted, uncertain, denied pairs meet WCAG AA (4.5:1) for body text', () => {
    const text = readFileSync(join(__dirname, '../src/styles/tokens.css'), 'utf8');
    const v = parseCssVariables(text);
    const pairs: Array<{ name: string; fg: string; bg: string }> = [
      { name: 'granted', fg: v['color-banner-granted-fg']!, bg: v['color-banner-granted-bg']! },
      { name: 'uncertain', fg: v['color-banner-uncertain-fg']!, bg: v['color-banner-uncertain-bg']! },
      { name: 'denied', fg: v['color-banner-denied-fg']!, bg: v['color-banner-denied-bg']! },
    ];
    for (const p of pairs) {
      const ratio = contrastRatio(p.fg, p.bg);
      expect(
        ratio,
        `${p.name} fg ${p.fg} on ${p.bg} = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

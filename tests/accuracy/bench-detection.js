#!/usr/bin/env node
/**
 * E10.S3.F1.T1 — sample `lastDetectorInferMs` from a running gate tab.
 * Usage: `pnpm vite --port 5199` then `node tests/accuracy/bench-detection.js`
 */
import { chromium } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:5199';
const samples = Number(process.env.BENCH_SAMPLES ?? 80);
const intervalMs = Number(process.env.BENCH_POLL_MS ?? 50);

function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
const consent = page.getByRole('button', { name: /understand/i });
if (await consent.isVisible().catch(() => false)) await consent.click();
await page.getByTestId('gate-camera-toggle').waitFor({ state: 'visible' });
await page.getByTestId('gate-camera-toggle').click();

const values = [];
const deadline = Date.now() + samples * intervalMs + 5000;
while (values.length < samples && Date.now() < deadline) {
  const v = await page.evaluate(() => window.__gatekeeperMetrics?.lastDetectorInferMs ?? null);
  if (v != null) values.push(v);
  await page.waitForTimeout(intervalMs);
}
await browser.close();

if (values.length === 0) {
  console.error('No samples — start the gate camera with models or stub gate (E10).');
  process.exit(1);
}

values.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    { n: values.length, p50: percentile(values, 50), p90: percentile(values, 90), p99: percentile(values, 99) },
    null,
    2,
  ),
);

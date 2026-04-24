#!/usr/bin/env node
/** E10.S3.F1.T2 — wall time from navigation + Start camera until first `lastAccessEvaluationMs`. */
import { chromium } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:5199';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const t0 = Date.now();
await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
const consent = page.getByRole('button', { name: /understand/i });
if (await consent.isVisible().catch(() => false)) await consent.click();
await page.getByTestId('gate-camera-toggle').click();
await page.waitForFunction(
  () => (window.__gatekeeperMetrics?.lastAccessEvaluationMs ?? 0) > 0,
  null,
  { timeout: 60_000 },
);
const dt = Date.now() - t0;
const m = await page.evaluate(() => window.__gatekeeperMetrics);
await browser.close();
console.log(JSON.stringify({ clickToFirstEvaluationWallMs: dt, metrics: m }, null, 2));

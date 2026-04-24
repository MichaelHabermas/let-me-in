#!/usr/bin/env node
/** E10.S3.F1.T3 — `navigationToDetectorReadyMs` after cold context + Start camera. */
import { chromium } from '@playwright/test';

import {
  exitIfBenchStrictAndFailed,
  printBenchStubFooter,
  reportColdLoadBudget,
} from './bench-budgets.ts';
import { prepareGatePage } from './bench-gate-consent.ts';

const baseURL = process.env.BASE_URL ?? 'http://localhost:5199';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
await prepareGatePage(page, baseURL, { clearE2eScenario: true });
await page.getByTestId('gate-camera-toggle').click();
await page.waitForFunction(
  () => window.__gatekeeperMetrics?.navigationToDetectorReadyMs != null,
  null,
  { timeout: 120_000 },
);
const navMs = await page.evaluate(() => window.__gatekeeperMetrics?.navigationToDetectorReadyMs);
await browser.close();
console.log(JSON.stringify({ navigationToDetectorReadyMs: navMs }, null, 2));
const ok = reportColdLoadBudget(navMs);
printBenchStubFooter('cold-load');
exitIfBenchStrictAndFailed('cold-load', ok);

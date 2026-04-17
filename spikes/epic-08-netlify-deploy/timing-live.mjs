/**
 * Epic 8 — cold timing against deployed HTTPS site (Playwright).
 * Run from repo root:
 *   cd spikes/epic-08-netlify-deploy && npm install playwright@1.49.1 --prefix .e8-node
 *   node .e8-node/node_modules/playwright/cli.js install chromium
 *   node timing-live.mjs
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const LIVE =
  process.env.E8_LIVE_URL ?? "https://let-me-in-epic8-e2e-1776463762.netlify.app";
const pwLocal = path.join(__dirname, ".e8-node/node_modules/playwright");
const { chromium } = existsSync(pwLocal)
  ? require(pwLocal)
  : require("playwright");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
// Simulate first visit: no service worker; ignore HTTP cache for document + assets.
await context.addInitScript(() => {
  try {
    caches?.keys?.().then((ks) => ks.forEach((k) => caches.delete(k)));
  } catch {
    /* ignore */
  }
});
const page = await context.newPage();
const client = await context.newCDPSession(page);
await client.send("Network.clearBrowserCookies");
await client.send("Network.clearBrowserCache");

const tNav0 = performance.now();
await page.goto(`${LIVE}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
const tNav1 = performance.now();

await page.click("#btn-run");
await page.waitForFunction(
  () => document.getElementById("log")?.textContent?.includes("=== Done ==="),
  { timeout: 180000 },
);
const tDone = performance.now();

const log = (await page.textContent("#log"))?.trim() ?? "";
const coldMatch = log.match(/Cold model load \(detector \+ embedder\) ms:\s*([\d.]+)/);
const coldSessionMs = coldMatch ? Number(coldMatch[1]) : null;

const onnxResources = await page.evaluate(() =>
  performance
    .getEntriesByType("resource")
    .filter((r) => r.name.endsWith(".onnx"))
    .map((r) => ({
      name: r.name.split("/").pop(),
      durationMs: Math.round(r.duration),
      transferSize: r.transferSize,
      decodedBodySize: r.decodedBodySize,
    })),
);

await browser.close();

const out = {
  liveUrl: LIVE,
  domcontentloadedMs: Math.round(tNav1 - tNav0),
  onnxResourceEntries: onnxResources,
  coldDetectorPlusEmbedderSessionMs: coldSessionMs,
  wallClickToDoneMs: Math.round(tDone - tNav1),
};
console.log(JSON.stringify(out, null, 2));

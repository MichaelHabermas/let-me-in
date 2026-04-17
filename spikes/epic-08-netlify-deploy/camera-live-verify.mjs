/**
 * Epic 8 — verify camera-smoke page on live HTTPS (Playwright + fake camera).
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

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});
const page = await browser.newPage();
await page.goto(`${LIVE}/camera-smoke.html`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.click("#btn-start");
await page.waitForSelector("#status.ok", { timeout: 30000 });
const status = (await page.textContent("#status"))?.trim() ?? "";
const vw = await page.evaluate(() => document.getElementById("video")?.videoWidth);
const vh = await page.evaluate(() => document.getElementById("video")?.videoHeight);
await browser.close();
console.log(JSON.stringify({ status, videoWidth: vw, videoHeight: vh }, null, 2));

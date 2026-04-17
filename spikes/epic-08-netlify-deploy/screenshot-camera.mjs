import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const LIVE =
  process.env.E8_LIVE_URL ?? "https://let-me-in-epic8-e2e-1776463762.netlify.app";
const outPng = path.join(__dirname, "evidence-camera-smoke-live.png");
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
await page.goto(`${LIVE}/camera-smoke.html`, { waitUntil: "networkidle", timeout: 60000 });
await page.click("#btn-start");
await page.waitForSelector("#status.ok", { timeout: 30000 });
await page.screenshot({ path: outPng, fullPage: true });
await browser.close();
console.log(outPng);

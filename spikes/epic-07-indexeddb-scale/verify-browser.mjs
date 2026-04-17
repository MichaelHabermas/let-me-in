/**
 * Headless one-shot for Epic 7. From this directory:
 *   npm install playwright@1.49.1 --prefix .epic7-verify-node
 *   NODE_PATH="$PWD/.epic7-verify-node/node_modules" node .epic7-verify-node/node_modules/playwright/cli.js install chromium
 *   node verify-browser.mjs
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pwLocal = path.join(__dirname, ".epic7-verify-node/node_modules/playwright");
const { chromium } = existsSync(pwLocal)
  ? require(pwLocal)
  : require("playwright");

const PORT = 8768;

const server = spawn("python3", ["-m", "http.server", String(PORT)], {
  cwd: __dirname,
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 800));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (msg) => process.stderr.write(`[browser console] ${msg.text()}\n`));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.click("#btn-run");
  await page.waitForFunction(
    () => document.getElementById("log")?.textContent?.includes("=== Done ==="),
    { timeout: 60000 },
  );
  const timing = (await page.textContent("#timing"))?.trim() ?? "";
  const log = (await page.textContent("#log"))?.trim() ?? "";
  process.stdout.write(JSON.stringify({ timing, log }, null, 2) + "\n");
} finally {
  await browser?.close().catch(() => {});
  server.kill("SIGTERM");
}

import { chromium } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "garden-update-"));
const app = path.join(root, "little-mandarin-garden");
fs.mkdirSync(app);
for (const file of [
  "index.html",
  "app.js",
  "core.js",
  "style.css",
  "manifest.webmanifest",
  "sw.js",
  "assets",
  "data",
])
  fs.cpSync(new URL("../" + file, import.meta.url), path.join(app, file), {
    recursive: true,
  });
const server = spawn(
  "python3",
  ["-m", "http.server", "4175", "--bind", "127.0.0.1", "--directory", root],
  { stdio: "ignore" },
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (let i = 0; i < 30; i++) {
    try {
      await fetch("http://127.0.0.1:4175");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const p = await browser.newPage();
  await p.goto("http://127.0.0.1:4175/little-mandarin-garden/");
  await p.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) =>
        navigator.serviceWorker.addEventListener("controllerchange", r, {
          once: true,
        }),
      );
  });
  await p.locator('[data-action="go:lessons"]').first().click();
  await p.locator('[data-action="intro:g001"]').click();
  await p.locator('[data-action="start:g001"]').click();
  await p.locator("[data-token]").first().click();
  const before = await p.evaluate(() =>
    localStorage.getItem("mandarin-garden-v1"),
  );
  fs.writeFileSync(
    path.join(app, "app.js"),
    fs
      .readFileSync(path.join(app, "app.js"), "utf8")
      .replace("little mandarin<br>", "little mandarin UPDATED<br>"),
  );
  fs.writeFileSync(
    path.join(app, "sw.js"),
    fs
      .readFileSync(path.join(app, "sw.js"), "utf8")
      .replace(/mandarin-garden-([a-f0-9]+)/, "mandarin-garden-updated-$1"),
  );
  await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r.update();
  });
  await p.locator("#update button").waitFor();
  await p.locator("#update button").click();
  assert.match(await p.locator("#notice").textContent(), /学習を閉じて/);
  assert.equal(await p.locator("#answer [data-token]").count(), 1);
  await p.locator('[data-action="go:home"]').click();
  await p.locator("#update button").click();
  await p.waitForFunction(() =>
    document.querySelector(".brand")?.textContent.includes("UPDATED"),
  );
  assert.equal(
    await p.evaluate(() => localStorage.getItem("mandarin-garden-v1")),
    before,
  );
  console.log(
    "PASS: subdirectory scope, staged cache update, no update during learning, explicit activation, progress retained.",
  );
} finally {
  await browser.close();
  server.kill();
  fs.rmSync(root, { recursive: true, force: true });
}

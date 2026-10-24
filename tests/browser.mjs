import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
const base = process.env.TEST_URL || "http://127.0.0.1:4173/";
const click = (a) => page.locator(`[data-action="${a}"]`).first().click();
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("mandarin-garden-v1")));
const curriculum = JSON.parse(
  fs.readFileSync(new URL("../data/curriculum.json", import.meta.url)),
);
const qs = curriculum.lessons.flatMap((l) => l.questions);
async function seed(qid) {
  const q = qs.find((q) => q.id === qid),
    l = curriculum.lessons.find((l) => l.questions.includes(q));
  await page.evaluate(
    ({ q, l }) => {
      const state = JSON.parse(localStorage.getItem("mandarin-garden-v1"));
      state.session = {
        lessonId: l.id,
        questionId: q.id,
        queue: [q.id],
        index: 0,
        score: 0,
        mistakes: [],
        answerTokenIds: [],
        bankTokenIds: q.canonical_order.slice().reverse(),
        result: null,
      };
      localStorage.setItem("mandarin-garden-v1", JSON.stringify(state));
    },
    { q, l },
  );
  await page.reload();
  await click("resume");
  return q;
}
async function dragToken(id, x, y) {
  const el = page.locator(`[data-token="${id}"]`),
    b = await el.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(340);
  await page.mouse.move(x, y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(550);
}
try {
  await page.goto(base);
  await click("go:lessons");
  assert.equal(await page.locator(".lesson-card").count(), 72);
  await page.locator("#search").fill("得");
  assert.ok((await page.locator(".lesson-card").count()) > 0);
  await page.locator("#search").fill("");
  await click("filter:3");
  assert.equal(await page.locator(".lesson-card").count(), 26);
  await click("filter:0");
  await click("intro:g001");
  await click("start:g001");
  await click("check");
  assert.equal(Object.keys((await saved()).progress).length, 0);
  assert.match(await page.locator("#remaining").textContent(), /あと3語/);
  let q = qs[0];
  for (const id of q.canonical_order)
    await page.locator(`[data-token="${id}"]`).click();
  await click("go:settings");
  await click("script:simplified");
  await click("resume");
  assert.deepEqual((await saved()).session.answerTokenIds, q.canonical_order);
  await page.reload();
  await click("resume");
  assert.deepEqual((await saved()).session.answerTokenIds, q.canonical_order);
  await click("check");
  assert.equal((await saved()).progress[q.id].correctFirstTry, true);
  assert.equal(await page.locator("tbody tr").count(), q.tokens.length);
  await click("next");
  assert.equal((await saved()).session.index, 1);
  // Complete a whole ten-question run, preserving result view and final history.
  for (let n = 1; n < 10; n++) {
    q = qs[n];
    for (const id of q.canonical_order)
      await page.locator(`[data-token="${id}"]`).click();
    await click("check");
    await click("next");
  }
  assert.match(await page.locator(".score").textContent(), /10/);
  assert.equal((await saved()).history.at(-1).correct, 10);
  await click("finish");
  // Insert a missing particle between two selected words by a real long press.
  q = await seed("g006-q01");
  console.log("drag question", q.sentence.simplified);
  const first = q.canonical_order[0],
    third = q.canonical_order[2],
    second = q.canonical_order[1];
  await page.locator(`[data-token="${first}"]`).click();
  await page.locator(`[data-token="${third}"]`).click();
  let b = await page.locator(`#answer [data-token="${third}"]`).boundingBox();
  await dragToken(second, b.x + 2, b.y + b.height / 2);
  assert.deepEqual((await saved()).session.answerTokenIds, [
    first,
    second,
    third,
  ]);
  // Reorder an answer token to the front, then drop outside without losing IDs.
  b = await page.locator(`#answer [data-token="${first}"]`).boundingBox();
  await dragToken(third, b.x + 1, b.y + b.height / 2);
  assert.deepEqual((await saved()).session.answerTokenIds, [
    third,
    first,
    second,
  ]);
  await dragToken(third, 1, 1);
  assert.deepEqual((await saved()).session.answerTokenIds, [
    third,
    first,
    second,
  ]);
  // pointercancel and backgrounding must not mutate the token partition.
  const before = (await saved()).session;
  await page
    .locator(`[data-token="${first}"]`)
    .dispatchEvent("pointerdown", {
      pointerId: 9,
      clientX: 80,
      clientY: 200,
      button: 0,
    });
  await page
    .locator(`[data-token="${first}"]`)
    .dispatchEvent("pointercancel", { pointerId: 9 });
  assert.deepEqual((await saved()).session, before);
  // Wrong answer, review correct, first result remains false.
  for (const id of (await saved()).session.bankTokenIds)
    await page.locator(`[data-token="${id}"]`).click();
  await click("check");
  assert.equal((await saved()).progress[q.id].correctFirstTry, false);
  await click("next");
  await click("session-review");
  for (const id of q.canonical_order)
    await page.locator(`[data-token="${id}"]`).click();
  await click("check");
  assert.equal((await saved()).progress[q.id].correctFirstTry, false);
  assert.equal((await saved()).progress[q.id].mastered, true);
  // Invalid import keeps current record; valid export round trips.
  await click("go:home");
  await click("go:settings");
  const stored = await saved();
  await page
    .locator("#import")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"saveVersion":99}'),
    });
  assert.deepEqual(await saved(), stored);
  const downloadPromise = page.waitForEvent("download");
  await click("export");
  const download = await downloadPromise;
  const path = await download.path();
  assert.deepEqual(JSON.parse(fs.readFileSync(path)), stored);
  page.once("dialog", (d) => d.accept());
  await page
    .locator("#import")
    .setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(stored)),
    });
  await page.waitForTimeout(100);
  assert.deepEqual((await saved()).progress, stored.progress);
  // Longest question at four iPhone sizes: main has no outer scrolling and grade stays visible.
  q = await seed(
    qs.reduce((a, b) => (a.tokens.length > b.tokens.length ? a : b)).id,
  );
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [393, 852],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(30);
    const metrics = await page.evaluate(() => {
      const main = document.querySelector("main"),
        button = document.querySelector('[data-action="check"]'),
        r = button.getBoundingClientRect();
      return {
        scroll: main.scrollHeight > main.clientHeight + 1,
        bottom: r.bottom,
        width: document.documentElement.scrollWidth,
      };
    });
    assert.equal(metrics.scroll, false, JSON.stringify(metrics));
    assert.ok(metrics.bottom <= height);
    assert.ok(metrics.width <= width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  fs.mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/question.png" });
  await click("go:home");
  await page.screenshot({ path: "test-results/home.png" });
  // First complete offline cache, then reload and run a new lesson without network.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await click("go:lessons");
  assert.equal(await page.locator(".lesson-card").count(), 72);
  await click("intro:g072");
  await click("start:g072");
  assert.ok((await page.locator("[data-token]").count()) > 0);
  assert.equal(await page.locator(".hero-bear").count(), 0);
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 72 lessons, full 10-question flow, insertion/reorder/cancel, persistence, script, import/export, responsive layouts, offline.",
  );
} finally {
  await browser.close();
}

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

// Pi Hub amendment A10 (2.9.0): type and space grow with the window on one curve, and layouts flow, drawn in the demo page.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = pathToFileURL(path.join(root, 'demo/page.html')).href;
let browser;
before(() => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return chromium.launch().then(b => { browser = b; });
});
after(() => browser?.close());
const measure = async (width) => {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(demo);
  const r = await page.evaluate(() => {
    const px = (el, p = 'fontSize') => parseFloat(getComputedStyle(el)[p]);
    const plate = document.querySelector('.ui-faceplate--aside');
    const [main, aside] = [plate.querySelector('.ui-faceplate__main'), plate.querySelector('.ui-faceplate__aside')]
      .map(el => el.getBoundingClientRect());
    return { root: px(document.documentElement), title: px(document.querySelector('.ui-page__title')),
      body: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-fs-3')) * px(document.documentElement),
      beside: Math.abs(main.top - aside.top) < 1 && aside.left > main.left,
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  await page.close();
  return r;
};

test('the root is 16 px on a 360 px phone, grows smoothly, and stops at 20 px from 1920 px', async () => {
  const at = {};
  for (const w of [320, 360, 390, 820, 1140, 1440, 1920, 2560]) at[w] = await measure(w);
  assert.equal(at[320].root, 16);
  assert.equal(at[360].root, 16);
  assert.ok(Math.abs(at[1140].root - 18) < 0.05, at[1140].root);
  assert.ok(Math.abs(at[1920].root - 20) < 0.05, at[1920].root);
  assert.ok(Math.abs(at[2560].root - 20) < 0.05, at[2560].root);
  // Never smaller than 2.8.0 (body 14 px), and monotonic: no step down anywhere.
  const widths = Object.keys(at).map(Number);
  for (const w of widths) assert.ok(at[w].body >= 14 - 0.01, `${w}: ${at[w].body}`);
  for (let i = 1; i < widths.length; i++) assert.ok(at[widths[i]].root >= at[widths[i - 1]].root);
});

test('the page title grows from fs6 on a phone to fs7, with no jump between 560 and 640 px', async () => {
  const phone = await measure(360), wide = await measure(1024);
  assert.equal(phone.title, 26);
  assert.ok(wide.title >= 34, wide.title);
  let last = (await measure(550)).title;
  for (let w = 560; w <= 640; w += 10) {
    const { title } = await measure(w);
    assert.ok(title >= last && title - last < 3, `${w}: ${last} -> ${title}`);
    last = title;
  }
});

test('the faceplate aside sits beside the main part where both fit and under it where they don\'t, never overflowing', async () => {
  for (const [w, beside] of [[390, false], [700, false], [1024, true], [1920, true]]) {
    const r = await measure(w);
    assert.equal(r.beside, beside, `${w}`);
    assert.equal(r.overflow, false, `${w}`);
  }
});

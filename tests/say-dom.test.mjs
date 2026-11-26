// ui-say and ApplianceSay.render in a real browser (2.32.0, Pi Hub A37; spec 2026-11-25-spoken-readout-design S1).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = pathToFileURL(path.join(root, 'tests/fixtures/say.html')).href;
let browser;
before(async () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  browser = await chromium.launch();
});
after(() => browser?.close());

async function open(width = 1280, height = 800) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(fixture);
  await page.evaluate(() => document.fonts.ready);
  return page;
}
const say = (page, composed) => page.evaluate(c => window.ApplianceSay.render(document.getElementById('say'), c), composed);
const two = { label: 'Printer', sentences: ['A.', 'B.'], loading: false };

test('render writes the hidden label and one span per sentence', async () => {
  const page = await open();
  assert.equal(await say(page, two), true);
  const got = await page.evaluate(() => {
    const h = document.getElementById('say'), vh = h.querySelector('.ui-vh').getBoundingClientRect();
    return { text: h.textContent, spans: [...h.querySelectorAll('.ui-say__s')].map(s => s.textContent), vh: [vh.width, vh.height],
      live: h.getAttribute('aria-live'), busy: h.getAttribute('aria-busy'), tag: h.tagName };
  });
  assert.deepEqual(got, { text: 'Printer: A.B.', spans: ['A.', 'B.'], vh: [1, 1], live: null, busy: null, tag: 'H1' });
  await page.close();
});

test('each sentence is its own line', async () => {
  const page = await open();
  await say(page, two);
  const tops = await page.evaluate(() => [...document.querySelectorAll('.ui-say__s')].map(s => s.getBoundingClientRect().top));
  assert.ok(tops[1] > tops[0], JSON.stringify(tops));
  await page.close();
});

test('unchanged writes nothing, and focus stays where it was', async () => {
  const page = await open();
  await say(page, two);
  await page.focus('#b');
  const got = await page.evaluate(async c => {
    const h = document.getElementById('say');
    let records = 0;
    const mo = new MutationObserver(l => { records += l.length; });
    mo.observe(h, { childList: true, subtree: true, attributes: true, characterData: true });
    const wrote = window.ApplianceSay.render(h, c);
    await new Promise(r => setTimeout(r, 0));
    mo.disconnect();
    return { wrote, records, focus: document.activeElement.id };
  }, two);
  assert.deepEqual(got, { wrote: false, records: 0, focus: 'b' });
  assert.equal(await say(page, { ...two, sentences: ['A.', 'C.'] }), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'b');
  await page.close();
});

test('markup job: text is never parsed as HTML', async () => {
  const page = await open();
  await say(page, { label: '<b>P</b>', sentences: ['The X2D is 1% through <img src=x onerror=window.__x=1>.'], loading: false });
  await page.waitForTimeout(50);
  const got = await page.evaluate(() => ({ imgs: document.querySelectorAll('#say img, #say b').length, x: window.__x ?? null,
    s: document.querySelector('.ui-say__s').textContent }));
  assert.deepEqual(got, { imgs: 0, x: null, s: 'The X2D is 1% through <img src=x onerror=window.__x=1>.' });
  await page.close();
});

test("loading draws a skeleton in the sentence's shape, then the text replaces it", async () => {
  const page = await open();
  await say(page, { label: 'Printer', sentences: [], loading: true });
  const wait = await page.evaluate(() => { const h = document.getElementById('say'); const w = [...h.querySelectorAll('.ui-say__wait')];
    return { n: w.length, busy: h.getAttribute('aria-busy'), hidden: w.every(x => x.getAttribute('aria-hidden') === 'true'),
      tall: w.every(x => x.getBoundingClientRect().height > 20), label: h.querySelector('.ui-vh')?.textContent }; });
  assert.deepEqual(wait, { n: 2, busy: 'true', hidden: true, tall: true, label: 'Printer: ' });
  await say(page, two);
  assert.deepEqual(await page.evaluate(() => { const h = document.getElementById('say');
    return [h.querySelectorAll('.ui-say__wait').length, h.getAttribute('aria-busy'), h.querySelectorAll('.ui-say__s').length]; }), [0, null, 2]);
  await page.close();
});

test('no sentences shows the page name, visibly', async () => {
  const page = await open();
  await say(page, { label: 'Printer', sentences: [], loading: false });
  const got = await page.evaluate(() => { const h = document.getElementById('say');
    return { text: h.textContent, vh: h.querySelectorAll('.ui-vh').length, w: h.getBoundingClientRect().width > 40 }; });
  assert.deepEqual(got, { text: 'Printer', vh: 0, w: true });
  await page.close();
});

test('render refuses what is not an element or a composed reading', async () => {
  const page = await open();
  const got = await page.evaluate(() => [window.ApplianceSay.render(null, { label: 'x', sentences: [], loading: false }),
    window.ApplianceSay.render(document.getElementById('say'), null), document.getElementById('say').childNodes.length]);
  assert.deepEqual(got, [false, false, 0]);
  await page.close();
});

test('fits from 320 px and at 200% text, with a long unbroken sentence', async () => {
  const long = { label: 'Printer', sentences: ['The X2D is 45% through its print.', 'x'.repeat(80)], loading: false };
  for (const [width, big] of [[320, false], [390, false], [1024, false], [1440, false], [320, true]]) {
    const page = await open(width);
    if (big) await page.addStyleTag({ content: 'html{font-size:200%}' });
    await say(page, long);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `${width}${big ? ' at 200%' : ''}: ${over}px over`);
    await page.close();
  }
});

test('the computed type is the readout face: narrow, heavy, 34 px on a 360 px window', async () => {
  const page = await open(360);
  await say(page, two);
  const cs = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('say'));
    return [c.fontStretch, c.fontWeight, c.fontSize, c.fontVariantNumeric]; });
  assert.deepEqual(cs, ['75%', '700', '34px', 'tabular-nums']);
  await page.close();
});

test('the tools row sits above the sentence, at the right', async () => {
  const page = await open(1280);
  await say(page, two);
  const g = await page.evaluate(() => { const t = document.querySelector('.ui-page__tools .ui-btn').getBoundingClientRect(),
    h = document.getElementById('say').getBoundingClientRect(), head = document.querySelector('.ui-page__head').getBoundingClientRect();
    return { above: t.bottom <= h.top, right: Math.abs(t.right - head.right) < 1 }; });
  assert.deepEqual(g, { above: true, right: true });
  await page.close();
});

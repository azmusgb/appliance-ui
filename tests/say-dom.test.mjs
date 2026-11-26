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

// ---- demo/say.html: the grid rows with a figure, and the plate (spec S3 and S5, as opt-in modifiers) ----
const demo = pathToFileURL(path.join(root, 'demo/say.html')).href;
async function openDemo(width, height = 900, colorScheme = 'dark') {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme, reducedMotion: 'reduce' });
  await page.goto(demo);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

test('demo/say.html has no overflow from 320 to 1440 px, dark and light', async () => {
  for (const scheme of ['dark', 'light']) for (const width of [320, 390, 820, 1024, 1366, 1440]) {
    const page = await openDemo(width, 900, scheme);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `${width} ${scheme}: ${over}px over`);
    await page.close();
  }
});

test("demo: the head is the Printer's composed sentences", async () => {
  const page = await openDemo(1440);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#say .ui-say__s')].map(s => s.textContent)),
    ['The X2D is 45% through Rift10 pair70.', 'About 11 h 24 min left, done around 10:30 AM.']);
  await page.close();
});

test("first screen at 390 × 844 holds the sentence and the plate's first action", async () => {
  const page = await openDemo(390, 844);
  const b = await page.evaluate(() => [document.querySelector('.ui-say').getBoundingClientRect().bottom,
    document.querySelector('.ui-faceplate__actions .ui-btn').getBoundingClientRect().bottom]);
  assert.ok(b[0] <= 844 && b[1] <= 844, JSON.stringify(b));
  await page.close();
});

test('grid rows: one column of names from 36 rem, the figure at the right', async () => {
  const wide = await openDemo(1440);
  const w = await wide.evaluate(() => {
    const list = document.querySelector('.ui-rows--grid'), R = e => e.getBoundingClientRect();  // the first list has a row with no figure
    return { names: [...list.querySelectorAll('.ui-row__name')].map(e => [Math.round(R(e).left), Math.round(R(e).width)].join()),
      details: [...list.querySelectorAll('.ui-row__detail')].map(e => Math.round(R(e).left)),
      figures: [...list.querySelectorAll('.ui-row__figure')].map(e => Math.round(R(list).right - R(e).right)),
      sameLine: [...list.querySelectorAll('.ui-row')].every(r => { const n = r.querySelector('.ui-row__title'), d = r.querySelector('.ui-row__detail');
        return R(d).left > R(n).right; }) };
  });
  assert.equal(new Set(w.names).size, 1, JSON.stringify(w.names));
  assert.equal(new Set(w.details).size, 1, JSON.stringify(w.details));
  assert.ok(w.figures.length >= 2 && w.figures.every(d => d === 0), JSON.stringify(w.figures));
  assert.equal(w.sameLine, true);
  await wide.close();
  const phone = await openDemo(390);
  const p = await phone.evaluate(() => [...document.querySelectorAll('.ui-rows--grid .ui-row')].filter(r => r.querySelector('.ui-row__figure')).map(r => {
    const R = e => e.getBoundingClientRect(), t = r.querySelector('.ui-row__title'), d = r.querySelector('.ui-row__detail'), f = r.querySelector('.ui-row__figure');
    return { under: R(d).top >= R(t).bottom - 1, right: R(f).left >= R(t).right, inRow: R(f).top >= R(r).top && R(f).bottom <= R(r).bottom };
  }));
  assert.ok(p.length >= 2 && p.every(x => x.under && x.right && x.inRow), JSON.stringify(p));
  await phone.close();
});

test('a row with no figure draws nothing in its place', async () => {
  const page = await openDemo(1440);
  const bare = await page.evaluate(() => [...document.querySelectorAll('.ui-rows--grid .ui-row')].filter(r => !r.querySelector('.ui-row__figure'))
    .map(r => r.textContent));
  assert.ok(bare.length >= 1);
  for (const t of bare) assert.ok(!/—|\b0\b/.test(t), t);
  await page.close();
});

test('the lamp follows the name, and an unknown reading is a hollow lamp with a word', async () => {
  const page = await openDemo(1440);
  const got = await page.evaluate(() => ({ every: [...document.querySelectorAll('.ui-rows--grid .ui-row__name')].every(n => n.querySelector('.ui-row__title + .ui-chip')),
    unknown: [...document.querySelectorAll('.ui-rows--grid .ui-chip--unknown')].map(c => c.textContent) }));
  assert.deepEqual(got, { every: true, unknown: ['Not reported', 'Asleep'] });
  await page.close();
});

test('the plate has no big readout and its actions sit beside the readings from 38 rem', async () => {
  const wide = await openDemo(1440);
  const w = await wide.evaluate(() => { const R = s => document.querySelector(s).getBoundingClientRect();
    const dd = [...document.querySelectorAll('.ui-faceplate--plate .ui-faceplate__readings > div')].at(-1).getBoundingClientRect();
    return { readouts: document.querySelectorAll('.ui-faceplate--plate .ui-readout, .ui-faceplate--plate .ui-faceplate__caption').length,
      below: R('.ui-faceplate__actions .ui-btn').top >= R('.ui-faceplate--plate .ui-meter').bottom, beside: R('.ui-faceplate__actions .ui-btn').left >= dd.right,
      jobRight: R('.ui-faceplate__job').left > R('.ui-faceplate--plate .ui-chip').right && Math.abs(R('.ui-faceplate__job').top - R('.ui-faceplate--plate .ui-chip').top) < 8,
      dd: getComputedStyle(document.querySelector('.ui-faceplate--plate dd')).fontStretch };
  });
  assert.deepEqual(w, { readouts: 0, below: true, beside: true, jobRight: true, dd: '75%' });
  await wide.close();
  const phone = await openDemo(390);
  const p = await phone.evaluate(() => { const R = s => document.querySelector(s).getBoundingClientRect();
    return { jobBelow: R('.ui-faceplate__job').top >= R('.ui-faceplate--plate .ui-chip').bottom - 1,
      actsBelow: R('.ui-faceplate__actions').top >= R('.ui-faceplate--plate .ui-faceplate__readings').bottom - 1,
      target: R('.ui-faceplate__actions .ui-btn').height >= 40 }; });
  assert.deepEqual(p, { jobBelow: true, actsBelow: true, target: true });
  await phone.close();
  // With a camera --aside beside __main, at 820 px the outer plate is >= 38 rem but __main is ~23 rem: actions stay
  // below readings until the plate reaches 64 rem (where __main itself is >= 32 rem).
  const tablet = await openDemo(820);
  const t = await tablet.evaluate(() => {
    const plate = document.querySelector('.ui-faceplate--plate');
    plate.classList.add('ui-faceplate--aside');
    const aside = document.createElement('div');
    aside.className = 'ui-faceplate__aside';
    aside.textContent = 'Camera';
    plate.append(aside);
    const R = s => plate.querySelector(s).getBoundingClientRect();
    return { actsBelowAt820: R('.ui-faceplate__actions').top >= R('.ui-faceplate__readings').bottom - 1 };
  });
  assert.deepEqual(t, { actsBelowAt820: true });
  await tablet.close();
});

test('a linked row is one link with a visible focus ring', async () => {
  const page = await openDemo(1440);
  await page.focus('.ui-rows--grid a.ui-row');
  const o = await page.evaluate(() => { const c = getComputedStyle(document.activeElement); return [c.outlineStyle, parseFloat(c.outlineWidth) >= 2, document.activeElement.querySelectorAll('a').length]; });
  assert.deepEqual(o, ['solid', true, 0]);
  await page.close();
});

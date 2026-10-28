import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = pathToFileURL(path.join(root, 'tests/fixtures/needs.html')).href;
let browser;
before(async () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  browser = await chromium.launch();
});
after(() => browser?.close());

async function open(width = 1280) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.goto(fixture);
  return page;
}
const resolve = l => (l === 'bambuddy' ? 'https://bambuddy.home.arpa/' : l);
const here = 'http://10.0.0.30/';

test('the build writes needs.js and needs.css', () => {
  assert.ok(fs.existsSync(path.join(root, 'dist/needs.js')));
  assert.ok(fs.existsSync(path.join(root, 'dist/needs.css')));
});

test('item text is set as text, never markup; tone sets data-tone', async () => {
  const page = await open();
  const r = await page.evaluate(([res, h]) => {
    const resolve = l => (l === 'bambuddy' ? 'https://bambuddy.home.arpa/' : l);
    const li = window.ApplianceNeeds.render({ id: 'a', source: 'print<b>', tone: 'bad', title: '<script>window.x=1</script>', detail: '<img src=x onerror=window.x=2>' },
      { resolve, here: new URL(h) });
    document.getElementById('host').append(li);
    return { tone: li.dataset.tone, title: li.querySelector('.ui-need__title').textContent, scripts: li.querySelectorAll('script,img,b').length, x: window.x, tag: li.tagName, link: !!li.querySelector('a') };
  }, [null, here]);
  assert.equal(r.tone, 'bad');
  assert.equal(r.title, '<script>window.x=1</script>');
  assert.equal(r.scripts, 0);
  assert.equal(r.x, undefined);
  assert.equal(r.tag, 'LI');
  assert.equal(r.link, false);
  await page.close();
});

test('an external link gets the arrow, target=_blank and rel=noopener; a local one does not', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const resolve = l => (l === 'bambuddy' ? 'https://bambuddy.home.arpa/' : l);
    const o = { resolve, here: new URL(h) };
    const N = window.ApplianceNeeds;
    const ext = N.render({ id: 'e', source: 'bambuddy', tone: 'attention', title: 't', detail: 'd', link: 'bambuddy', action: { key: 'open_bambuddy', link: 'bambuddy' } }, { ...o, self: 'home' });
    const loc = N.render({ id: 'l', source: 'home', tone: 'warn', title: 't', detail: 'd', link: '/workshop', action: { key: 'look', link: '/workshop' } }, { ...o, self: 'home' });
    const bad = N.render({ id: 'b', source: 'home', tone: 'warn', title: 't', detail: 'd', link: 'javascript:x' }, { ...o, self: 'home' });
    const a = ext.querySelector('a'), b = loc.querySelector('a');
    return { href: a.getAttribute('href'), target: a.target, rel: a.rel, action: ext.querySelector('.ui-need__action').textContent,
      meta: ext.querySelector('.ui-need__meta')?.textContent, lhref: b.getAttribute('href'), ltarget: b.getAttribute('target'),
      laction: loc.querySelector('.ui-need__action').textContent, lmeta: loc.querySelector('.ui-need__meta'), badLink: !!bad.querySelector('a') };
  }, here);
  assert.equal(r.href, 'https://bambuddy.home.arpa/');
  assert.equal(r.target, '_blank');
  assert.equal(r.rel, 'noopener noreferrer');
  assert.equal(r.action, 'Open Bambuddy ↗');
  assert.equal(r.meta, 'bambuddy');
  assert.equal(r.lhref, 'http://10.0.0.30/workshop');
  assert.equal(r.ltarget, null);
  assert.equal(r.laction, 'Look at the printer');
  assert.equal(r.lmeta, null);
  assert.equal(r.badLink, false);
  await page.close();
});

test('renderList caps at max, adds the more link; empty shows the phrase', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds;
    const items = [1, 2, 3, 4].map(i => ({ id: 'i' + i, source: 'home', tone: 'warn', title: 'T' + i, detail: 'd' }));
    const o = { resolve: l => l, here: new URL(h), self: 'home' };
    const ul = N.renderList(items, { ...o, max: 2, more: { href: '/needs', label: 'See all 4' } });
    const full = N.renderList(items.slice(0, 2), { ...o, max: 2, more: { href: '/needs', label: 'See all' } });
    const e = N.renderList([], o), e2 = N.renderList([], { ...o, empty: 'All quiet.' });
    return { tag: ul.tagName, cls: ul.className, n: ul.querySelectorAll('.ui-need').length, more: ul.querySelector('.ui-needs__more a')?.textContent,
      moreHref: ul.querySelector('.ui-needs__more a')?.getAttribute('href'), fullMore: !!full.querySelector('.ui-needs__more'),
      empty: e.textContent, emptyCls: e.className, emptyTag: e.tagName, empty2: e2.textContent };
  }, here);
  assert.equal(r.tag, 'UL'); assert.equal(r.cls, 'ui-needs');
  assert.equal(r.n, 2);
  assert.equal(r.more, 'See all 4'); assert.equal(r.moreHref, 'http://10.0.0.30/needs');
  assert.equal(r.fullMore, false);
  assert.equal(r.empty, 'Nothing needs you right now.');
  assert.equal(r.emptyTag, 'P'); assert.equal(r.emptyCls, 'ui-needs__empty');
  assert.equal(r.empty2, 'All quiet.');
  await page.close();
});

test('the stripe uses the tone token; the action sits right on desktop and below on a phone', async () => {
  for (const [width, below] of [[1280, false], [390, true]]) {
    const page = await open(width);
    const r = await page.evaluate(h => {
      const N = window.ApplianceNeeds;
      const ul = N.renderList([{ id: 'a', source: 'home', tone: 'bad', title: 'A title', detail: 'Some detail', link: '/x', action: { key: 'look', link: '/x' } }],
        { resolve: l => l, here: new URL(h), self: 'home' });
      document.getElementById('host').append(ul);
      const li = ul.firstChild, t = li.querySelector('.ui-need__title').getBoundingClientRect(), a = li.querySelector('.ui-need__action').getBoundingClientRect();
      return { h: li.getBoundingClientRect().height, stripe: getComputedStyle(li).borderLeftColor, bad: (() => { const d = document.createElement('i'); d.style.color = 'var(--ui-bad)'; document.body.append(d); return getComputedStyle(d).color; })(),
        below: a.top >= t.bottom - 1 };
    }, here);
    assert.ok(r.h >= 44, `${width}: ${r.h}`);
    assert.equal(r.stripe, r.bad);
    assert.equal(r.below, below, String(width));
    await page.close();
  }
});

test('needs.css has no literal colours and only gated --ui-* colour tokens', () => {
  const css = fs.readFileSync(path.join(root, 'dist/needs.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /\brgba?\(|\bhsla?\(/i);
  const allowed = new Set(['--ui-bad', '--ui-warn', '--ui-muted', '--ui-text', '--ui-surface', '--ui-line', '--ui-fs-1', '--ui-fs-2']);
  const nonColour = /^--ui-(space|r-\d+|font)$/;
  for (const [, v] of css.matchAll(/var\((--ui-[a-z0-9-]+)/g)) {
    if (nonColour.test(v)) continue;
    assert.ok(allowed.has(v), v);
  }
});

test('odd keys and tones do not crash render; they fall back', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds, o = { resolve: l => l, here: new URL(h), self: 'home' };
    return ['constructor', '__proto__', 'toString'].map(k => {
      const li = N.render({ id: 'a', source: 'home', tone: k, title: 't', detail: 'd', link: '/x', action: { key: k, link: '/x' } }, o);
      return { tone: li.dataset.tone, action: li.querySelector('.ui-need__action')?.textContent ?? null };
    }).concat([(() => { const li = N.render({ id: 'a', source: '', tone: 'bad', title: 't', detail: 'd', action: { key: 'not_answering' } }, o); return { tone: li.dataset.tone, action: li.querySelector('.ui-need__action')?.textContent ?? null }; })()]);
  }, here);
  for (const x of r) assert.equal(x.action, null);
  assert.deepEqual(r.map(x => x.tone), ['warn', 'warn', 'warn', 'bad']);
  await page.close();
});

test('an unsafe more.href drops the more link', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const items = [1, 2].map(i => ({ id: 'i' + i, source: 'home', tone: 'warn', title: 'T', detail: 'd' }));
    return window.ApplianceNeeds.renderList(items, { here: new URL(h), max: 1, more: { href: 'javascript:x', label: 'More' } }).querySelectorAll('.ui-needs__more').length;
  }, here);
  assert.equal(r, 0);
  await page.close();
});

test('tricky more.href values never produce a link off the origin', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const items = [1, 2].map(i => ({ id: 'i' + i, source: 'home', tone: 'warn', title: 'T', detail: 'd' }));
    return ['/..//evil.com', '/%2e%2e//evil.com', '/needs'].map(href => {
      const a = window.ApplianceNeeds.renderList(items, { here: new URL(h), max: 1, more: { href, label: 'More' } }).querySelector('.ui-needs__more a');
      return a ? new URL(a.getAttribute('href'), h).origin : null;
    });
  }, here);
  assert.deepEqual(r, [null, null, 'http://10.0.0.30']);
  await page.close();
});

test('dense lists add the class, hide the source line, keep rows 44px+ and keep the action and arrow', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds;
    const items = [{ id: 'a', source: 'Printer', tone: 'warn', title: 'Clear the plate', detail: 'Finished hex-tile E-021 · 1 h 4 min', link: '/workshop', action: { key: 'look', link: '/workshop' } },
      { id: 'b', source: 'Bambuddy', tone: 'bad', title: 'Judge the print', detail: 'x'.repeat(200), link: 'tool:b' }];
    const o = { resolve: l => (l === 'tool:b' ? 'https://b.example/' : l), here: new URL(h), self: 'Pi Hub' };
    const plain = N.renderList(items, o), dense = N.renderList(items, { ...o, dense: true });
    document.getElementById('host').append(dense);
    const li = [...dense.querySelectorAll('.ui-need')];
    return { plain: plain.className, dense: dense.className, metaShown: li.map(x => getComputedStyle(x.querySelector('.ui-need__meta') || x).display),
      hasMeta: li.map(x => !!x.querySelector('.ui-need__meta')), heights: li.map(x => x.getBoundingClientRect().height), rowW: dense.getBoundingClientRect().width,
      linkW: li.map(x => x.querySelector('.ui-need__link').scrollWidth - x.querySelector('.ui-need__link').clientWidth),
      actions: li.map(x => x.querySelector('.ui-need__action')?.textContent) };
  }, here);
  assert.equal(r.plain, 'ui-needs'); assert.equal(r.dense, 'ui-needs ui-needs--dense');
  assert.deepEqual(r.metaShown.map((d, i) => r.hasMeta[i] ? d : 'none'), ['none', 'none']);
  assert.ok(r.heights.every(h => h >= 44 && h < 60), r.heights.join());
  assert.ok(r.linkW.every(w => w <= 0), 'long detail ellipsizes, no overflow');
  assert.equal(r.actions[0], 'Look at the printer'); assert.equal(r.actions[1], '↗');
  await page.close();
});

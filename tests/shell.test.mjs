// ui-shell (2.29.0): the shared rail and tab bar. The pure part (areaLinks) from the page list, then the shell in a real
// browser at desktop and phone widths: selected state, keyboard, badges, no overflow at 200% text, the tab bar above the
// on-screen keyboard.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const mod = { exports: {} };
new Function('module', read('src/shell.js'))(mod);
const { areaLinks } = mod.exports;
const list = JSON.parse(read('pages.json'));

test('areaLinks: one link per area, in order, to the landing page; a missing or unbuilt landing is left out', () => {
  const links = areaLinks(list.areas, list.pages);
  assert.deepEqual(links.map((l) => l.id), list.areas.map((a) => a.id));
  for (const l of links) assert.equal(l.href, list.pages.find((p) => p.id === list.areas.find((a) => a.id === l.id).landing).path);
  const a = [{ id: 'x', label: 'X', order: 2, landing: 'gone' }, { id: 'y', label: 'Y', order: 1, landing: 'p' }, { id: 'z', label: 'Z', order: 3, landing: 'q' }];
  const p = [{ id: 'p', path: '/p' }, { id: 'q', path: '/q', built: false }];
  assert.deepEqual(areaLinks(a, p).map((l) => l.id), ['y']);
});

test('areaLinks: bad input yields no links, never a throw', () => {
  for (const bad of [undefined, null, 'x', {}, [null, 1, {}]]) assert.deepEqual(areaLinks(bad, bad), []);
  assert.deepEqual(areaLinks([{ id: 'a', label: 'A', landing: 'p' }], [{ id: 'p', path: '' }]), []);
});

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function open(width, { text = 1 } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,viewport-fit=cover"><body></body>');
  await page.addStyleTag({ content: read('dist/tokens.css') + read('dist/components.css') + read('dist/shell.css') + `html{font-size:${text * 100}%}` });
  await page.addScriptTag({ content: read('dist/shell.js') });
  await page.evaluate(({ areas, pages }) => {
    document.body.innerHTML = '<div class="ui-shell"><div class="ui-shell-stage"><header class="ui-shell-head" data-ui-shell-head>Title</header><main class="ui-shell-main"><input id="f"><div style="height:3000px"></div></main></div></div>';
    const nav = ApplianceShell.build(document, { areas, pages, current: 'workshop', badges: { home: 3 }, icon: () => document.createElementNS('http://www.w3.org/2000/svg', 'svg') });
    document.querySelector('.ui-shell').prepend(nav);
  }, list);
  return page;
}

test('desktop: the selected area is marked by aria-current and more than colour; one link is current', async () => {
  const page = await open(1280);
  assert.equal(await page.locator('.ui-rail a[aria-current="page"]').count(), 1);
  assert.equal(await page.locator('.ui-rail a[aria-current="page"]').getAttribute('data-area'), 'workshop');
  const [bar, weight] = await page.$eval('.ui-rail a[aria-current="page"]', (e) => [getComputedStyle(e, '::before').width, getComputedStyle(e).fontWeight]);
  assert.notEqual(bar, 'auto'); assert.ok(parseFloat(bar) > 0, 'a bar on the selected link'); assert.equal(weight, '700');
  assert.equal(await page.$eval('.ui-rail', (e) => getComputedStyle(e).position), 'sticky');
  await page.close();
});

test('keyboard: arrows, Home and End move focus between areas', async () => {
  const page = await open(1280);
  await page.focus('.ui-rail a[data-area="home"]');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.area), 'workshop');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.area), 'system');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.area), 'home');
  await page.close();
});

test('badge: shown with a name for assistive tech, capped at 99+, removed at zero or a non-number', async () => {
  const page = await open(1280);
  const get = () => page.evaluate(() => { const b = document.querySelector('[data-area="home"] .ui-rail-badge'); return b && [b.textContent, b.getAttribute('aria-label')]; });
  assert.deepEqual(await get(), ['3', '3 items need you']);
  for (const [n, want] of [[250, '99+'], [0, null], [3, '3'], [NaN, null], ['5', null], [-1, null]]) {
    await page.evaluate((n) => ApplianceShell.setBadge(document.querySelector('.ui-rail'), 'home', n), n);
    const g = await get();
    assert.equal(g && g[0], want, String(n));
  }
  await page.close();
});

test('setCurrent: an unknown area clears every mark', async () => {
  const page = await open(1280);
  await page.evaluate(() => ApplianceShell.setCurrent(document.querySelector('.ui-rail'), 'nowhere'));
  assert.equal(await page.locator('.ui-rail [aria-current]').count(), 0);
  await page.close();
});

for (const text of [1, 2]) {
  test(`phone at ${text * 100}% text: tab bar fixed at the bottom, labels inside their tabs, no horizontal scroll`, async () => {
    const page = await open(360, { text });
    assert.equal(await page.$eval('.ui-rail', (e) => getComputedStyle(e).position), 'fixed');
    const r = await page.$$eval('.ui-rail a', (as) => as.map((a) => { const b = a.getBoundingClientRect(), l = a.querySelector('.ui-rail-label').getBoundingClientRect(); return [b.left, b.right, l.left, l.right]; }));
    for (const [bl, br, ll, lr] of r) assert.ok(ll >= bl - 0.5 && lr <= br + 0.5, 'label inside its tab');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll');
    const bottom = await page.$eval('.ui-rail', (e) => e.getBoundingClientRect().bottom);
    assert.equal(Math.round(bottom), 800);
    await page.close();
  });
}

test('watch: head height and keyboard inset are published as variables, and stop when asked', async () => {
  const page = await open(360);
  const stop = await page.evaluateHandle(() => ApplianceShell.watch(window));
  const head = await page.evaluate(() => document.documentElement.style.getPropertyValue('--ui-shell-head-h'));
  assert.match(head, /^\d+px$/);
  assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--ui-kb-inset')), '0px');
  await page.evaluate((s) => s(), stop);
  assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--ui-shell-head-h')), '');
  await page.close();
});

test('keyboard: the nav is one tab stop; Tab leaves it in one step, and the stop follows focus and the current area', async () => {
  const page = await open(1280);
  const stops = () => page.$$eval('.ui-rail a[data-area]', (l) => l.filter((a) => a.tabIndex === 0).map((a) => a.dataset.area));
  assert.deepEqual(await stops(), ['workshop'], 'the current area is the one tab stop');
  await page.focus('.ui-rail a[data-area="workshop"]');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('.ui-rail')), false, 'Tab leaves the nav');
  await page.focus('.ui-rail a[data-area="home"]');
  assert.deepEqual(await stops(), ['home'], 'the stop follows focus');
  await page.evaluate(() => ApplianceShell.setCurrent(document.querySelector('.ui-rail'), 'system'));
  assert.deepEqual(await stops(), ['system'], 'and the current area after setCurrent');
  await page.evaluate(() => ApplianceShell.setCurrent(document.querySelector('.ui-rail'), 'nowhere'));
  assert.deepEqual(await stops(), ['home'], 'no current area: the first link');
  await page.close();
});

test('phone: at 320 to 430 px and 100% to 200% text, a tab\'s label, icon and count are inside it and never touch one another', async () => {
  for (const width of [320, 360, 390, 430]) for (const text of [1, 1.3, 2]) {
    const page = await open(width, { text });
    await page.evaluate(() => { const n = document.querySelector('.ui-rail'); ApplianceShell.setBadge(n, 'home', 3); ApplianceShell.setBadge(n, 'workshop', 12); ApplianceShell.setBadge(n, 'network', 250); });
    const r = await page.$$eval('.ui-rail a[data-area]', (links) => links.map((a) => {
      const rect = (e) => e.getBoundingClientRect(), box = rect(a), l = rect(a.querySelector('.ui-rail-label')), i = rect(a.querySelector('.ui-rail-icon')), bd = a.querySelector('.ui-rail-badge'), b = bd && rect(bd);
      const hit = (p, q) => p.left < q.right - 0.5 && p.right > q.left + 0.5 && p.top < q.bottom - 0.5 && p.bottom > q.top + 0.5;
      const lab = a.querySelector('.ui-rail-label');
      const inside = (r2) => r2.left >= box.left - 0.5 && r2.right <= box.right + 0.5 && r2.top >= box.top - 0.5 && r2.bottom <= box.bottom + 0.5;
      return { area: a.dataset.area, lines: Math.round(l.height / parseFloat(getComputedStyle(lab).lineHeight)), label: inside(l), icon: inside(i), badge: !b || inside(b), badgeOnIcon: !!b && hit(b, i), badgeOnLabel: !!b && hit(b, l), iconOnLabel: hit(i, l) };
    }));
    for (const x of r) {
      const at = `${width}px ×${text} ${x.area}`;
      assert.equal(x.lines, 1, `${at}: the label is one line`);
      assert.ok(x.label && x.icon && x.badge, `${at}: label, icon and count inside the tab`);
      assert.equal(x.badgeOnIcon, false, `${at}: the count does not touch the icon`);
      assert.equal(x.badgeOnLabel, false, `${at}: the count does not touch the label`);
      assert.equal(x.iconOnLabel, false, `${at}: the icon does not touch the label`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px ×${text}: no sideways scroll`);
    await page.close();
  }
});

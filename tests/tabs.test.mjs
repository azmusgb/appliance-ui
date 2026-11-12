import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { contrast } from '../scripts/lib/color.mjs';

// 2.16.0: the web's tabs, as the display's Tabs (2.12): two to five equal segments in a bordered well, 48 px high,
// 16 px labels, the selected one marked by a wash, accent text and an accent bar.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = pathToFileURL(path.join(root, 'demo/page.html')).href;
let browser;
before(() => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return chromium.launch().then(b => { browser = b; });
});
after(() => browser?.close());
const open = async (width, colorScheme = 'dark', hasTouch = false) => {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, hasTouch });
  const page = await ctx.newPage();
  await page.goto(demo);
  return page;
};
const read = (page) => page.evaluate(() => {
  const strip = document.getElementById('adjust-tabs');
  const tabs = [...strip.querySelectorAll('[role="tab"]')];
  const s = (el) => getComputedStyle(el);
  const sel = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
  const other = tabs.find((t) => t !== sel);
  const box = (el) => el.getBoundingClientRect();
  return {
    role: strip.getAttribute('role'), count: tabs.length,
    heights: tabs.map((t) => Math.round(box(t).height)), widths: tabs.map((t) => Math.round(box(t).width)),
    font: parseFloat(s(sel).fontSize), root: parseFloat(s(document.documentElement).fontSize),
    sel: { bg: s(sel).backgroundColor, color: s(sel).color, bar: s(sel).borderBottomWidth, barColor: s(sel).borderBottomColor },
    other: { bg: s(other).backgroundColor, color: s(other).color, barColor: s(other).borderBottomColor },
    well: s(strip).backgroundColor, overflow: document.documentElement.scrollWidth > innerWidth,
    stripRight: box(strip).right, lastRight: box(tabs.at(-1)).right,
  };
});

test('tabs: one strip of equal segments, 48 px high, 16 px labels at a phone width, nothing wider than the screen', async () => {
  for (const width of [320, 390]) {
    const page = await open(width);
    const r = await read(page);
    assert.equal(r.role, 'tablist');
    assert.equal(r.count, 3);
    assert.ok(r.heights.every((h) => h >= 48), JSON.stringify(r.heights));
    assert.ok(Math.max(...r.widths) - Math.min(...r.widths) <= 1, `equal shares: ${r.widths}`);
    assert.equal(r.font, r.root, 'fs4: the body size, 16 px on a phone');
    assert.equal(r.overflow, false);
    assert.ok(r.lastRight <= r.stripRight + 0.5);
  }
});

test('tabs: at 320 px a label with a count beside it is never cut: the count drops under the label', async () => {
  const page = await open(320);
  const r = await page.evaluate(() => {
    const strip = document.getElementById('list-tabs');
    return [...strip.querySelectorAll('[role="tab"]')].map((t) => ({ cut: t.scrollWidth > t.clientWidth + 1, h: Math.round(t.getBoundingClientRect().height) }));
  });
  assert.ok(r.every((t) => !t.cut), JSON.stringify(r));
  assert.ok(r.every((t) => t.h >= 48));
});

test('tabs: the selected one is marked three ways, never by colour alone, and its text passes 4.5:1 in both themes', async () => {
  for (const scheme of ['dark', 'light']) {
    const page = await open(1024, scheme);
    const r = await read(page);
    assert.notEqual(r.sel.bg, r.other.bg, 'a wash');
    assert.notEqual(r.sel.color, r.other.color, 'accent text');
    assert.equal(r.sel.bar, '3px', 'a bar along its foot');
    assert.notEqual(r.sel.barColor, r.other.barColor);
    // The wash is a translucent tint over the well: measure the text over what shows through.
    const wash = await page.evaluate(() => {
      const t = document.querySelector('#adjust-tabs [aria-selected="true"]');
      const c = document.createElement('canvas').getContext('2d');
      const mix = (fg, bg) => { c.fillStyle = bg; c.fillRect(0, 0, 1, 1); c.fillStyle = fg; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
      const hex = (a) => '#' + a.map((n) => n.toString(16).padStart(2, '0')).join('');
      const toHex = (css) => { c.fillStyle = css; return c.fillStyle; };
      return { text: toHex(getComputedStyle(t).color), bg: hex(mix(getComputedStyle(t).backgroundColor, getComputedStyle(t.parentElement).backgroundColor)) };
    });
    assert.ok(contrast(wash.text, wash.bg) >= 4.5, `${scheme}: ${wash.text} on ${wash.bg}`);
  }
});

test('tabs: focus shows a ring that is not hidden under the next tab', async () => {
  const page = await open(390);
  await page.focus('#adjust-tabs [aria-selected="true"]');
  const r = await page.evaluate(() => {
    const t = document.activeElement, s = getComputedStyle(t);
    return { outline: s.outlineStyle, width: s.outlineWidth, z: s.zIndex, pos: s.position };
  });
  assert.deepEqual(r, { outline: 'solid', width: '2px', z: '1', pos: 'relative' });
});

// 2.18.0 (Pi Hub A22 2.1: Settings' six groups): ui-tabs--rows. Six equal segments don't fit a phone, so they wrap onto
// full rows by the strip's own width: two to a row, then three, then all six.
const rows = (page) => page.evaluate(() => {
  const strip = document.getElementById('settings-tabs');
  const tabs = [...strip.querySelectorAll('[role="tab"]')];
  const box = (el) => el.getBoundingClientRect();
  const tops = [...new Set(tabs.map((t) => Math.round(box(t).top)))];
  return {
    count: tabs.length, perRow: tops.map((top) => tabs.filter((t) => Math.round(box(t).top) === top).length),
    widths: tabs.map((t) => Math.round(box(t).width)), heights: tabs.map((t) => Math.round(box(t).height)),
    cut: tabs.filter((t) => t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1).map((t) => t.textContent),
    overflow: document.documentElement.scrollWidth > innerWidth,
    inside: tabs.every((t) => box(t).right <= box(strip).right + 0.5 && box(t).bottom <= box(strip).bottom + 0.5),
  };
});

test('six tabs wrap onto full rows by the strip\'s width: two to a row on a phone, then three, then all six', async () => {
  for (const [width, perRow] of [[320, [2, 2, 2]], [390, [2, 2, 2]], [600, [3, 3]], [820, [3, 3]], [1024, [6]], [1920, [6]]]) {
    for (const scheme of ['dark', 'light']) {
      const page = await open(width, scheme);
      const r = await rows(page);
      assert.equal(r.count, 6);
      assert.deepEqual(r.perRow, perRow, `${width} px: rows are full, no tab is left alone`);
      assert.ok(Math.max(...r.widths) - Math.min(...r.widths) <= 1, `${width} px, equal shares: ${r.widths}`);
      assert.ok(r.heights.every((h) => h >= 48), `${width} px: ${r.heights}`);
      assert.deepEqual(r.cut, [], `${width} px: no label is cut`);
      assert.equal(r.overflow, false, `${width} px: nothing wider than the screen`);
      assert.ok(r.inside, `${width} px: every tab is inside the strip`);
      await page.context().close();
    }
  }
});

test('six tabs follow the strip, not the window: a narrow column on a wide screen still gets two to a row', async () => {
  const page = await open(1440);
  await page.evaluate(() => { document.getElementById('settings-tabs').parentElement.style.maxWidth = '20rem'; });
  assert.deepEqual((await rows(page)).perRow, [2, 2, 2]);
});

test('six tabs: a label too long for its segment wraps inside it and is never cut', async () => {
  const page = await open(320);
  await page.evaluate(() => { document.querySelector('#settings-tabs [role="tab"]:nth-child(3)').textContent = 'Weather, calendar and the morning digest'; });
  const r = await rows(page);
  assert.deepEqual(r.cut, []);
  assert.equal(r.overflow, false);
  assert.deepEqual(r.perRow, [2, 2, 2]);
});

test('six tabs: the focus ring is drawn inside the tab, because the strip clips to its rounded corners', async () => {
  const page = await open(390);
  await page.focus('#settings-tabs [role="tab"]:nth-child(4)');
  const r = await page.evaluate(() => {
    const t = document.activeElement, s = getComputedStyle(t);
    return { outline: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, clip: getComputedStyle(t.parentElement).overflow };
  });
  assert.deepEqual(r, { outline: 'solid', width: '2px', offset: '-2px', clip: 'hidden' });
});

test('six tabs: the selected one is still marked three ways', async () => {
  const page = await open(390);
  const r = await page.evaluate(() => {
    const s = (el) => getComputedStyle(el);
    const sel = document.querySelector('#settings-tabs [aria-selected="true"]'), other = document.querySelector('#settings-tabs [aria-selected="false"]');
    return { bg: s(sel).backgroundColor !== s(other).backgroundColor, color: s(sel).color !== s(other).color, bar: s(sel).borderBottomWidth, barColor: s(sel).borderBottomColor !== s(other).borderBottomColor };
  });
  assert.deepEqual(r, { bg: true, color: true, bar: '3px', barColor: true });
});

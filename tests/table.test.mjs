import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { contrast } from '../scripts/lib/color.mjs';

// 2.7.0 (DESIGN.md open differences 2 and 3): the table and the icon-only button, drawn in the demo page.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = pathToFileURL(path.join(root, 'demo/page.html')).href;
let browser;
before(() => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return chromium.launch().then(b => { browser = b; });
});
after(() => browser?.close());
const open = async (width, colorScheme = 'dark') => {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme });
  await page.goto(demo);
  return page;
};
const hex = (rgb) => '#' + rgb.match(/\d+/g).slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('');

test('wide: a real table, numbers right-aligned and tabular', async () => {
  const page = await open(1024);
  const r = await page.evaluate(() => {
    const t = document.getElementById('prints'), num = t.querySelector('td.ui-table__num'), cap = t.querySelector('caption');
    return { display: getComputedStyle(t.querySelector('tr')).display, align: getComputedStyle(num).textAlign,
      nums: getComputedStyle(num).fontVariantNumeric, head: getComputedStyle(t.querySelector('thead')).position, cap: getComputedStyle(cap).textAlign,
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  assert.deepEqual(r, { display: 'table-row', align: 'right', nums: 'tabular-nums', head: 'static', cap: 'left', overflow: false });
});

test('phone: each row stands alone, each value beside its column name, nothing wider than the screen', async () => {
  const page = await open(390);
  const r = await page.evaluate(() => {
    const t = document.getElementById('prints'), td = t.querySelectorAll('td')[2];
    const longCell = t.querySelectorAll('tbody tr')[1].querySelector('td');
    return { display: getComputedStyle(t.querySelector('tr')).display, label: getComputedStyle(td, '::before').content,
      captionFull: t.querySelector('caption').getBoundingClientRect().width >= t.getBoundingClientRect().width - 1,
      labelWhole: getComputedStyle(longCell, '::before').whiteSpace === 'nowrap',
      headHidden: t.querySelector('thead').getBoundingClientRect().width <= 1, role: t.getAttribute('role'),
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  assert.deepEqual(r, { display: 'block', label: '"Time"', captionFull: true, labelWhole: true, headHidden: true, role: 'table', overflow: false });
});

test('icon-only button: a name, square 40 px (44 on touch), and an outline at 3:1 or more in both themes', async () => {
  for (const scheme of ['dark', 'light']) {
    const page = await open(1024, scheme);
    const r = await page.evaluate(() => {
      const b = document.getElementById('refresh'), s = getComputedStyle(b), box = b.getBoundingClientRect();
      return { name: b.getAttribute('aria-label'), w: box.width, h: box.height, border: s.borderTopColor,
        behind: getComputedStyle(document.body).backgroundColor };
    });
    assert.ok(r.name);
    assert.equal(r.w, 40);
    assert.equal(r.h, 40);
    assert.ok(contrast(hex(r.border), hex(r.behind)) >= 3, `${scheme}: ${r.border} on ${r.behind}`);
  }
  const touch = await browser.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  await touch.goto(demo);
  const size = await touch.evaluate(() => { const b = document.getElementById('refresh').getBoundingClientRect(); return [b.width, b.height]; });
  assert.deepEqual(size, [44, 44]);
});

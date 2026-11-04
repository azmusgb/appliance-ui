// The palette in the kit demo, in a real browser: how it opens, the keys, focus, the down line, motion and the dialog.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = pathToFileURL(path.join(root, 'demo/index.html')).href;
let browser;
before(async () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  browser = await chromium.launch();
});
after(() => browser?.close());

async function open(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, ...opts });
  await page.goto(demo);
  return page;
}
const isOpen = page => page.evaluate(() => document.querySelector('dialog.ui-palette').open);
const labels = page => page.$$eval('.ui-palette__option .ui-palette__label', els => els.map(e => e.textContent));
// Wait for the search to settle: the status says how many results only once every provider has answered.
const settled = (page, q) => page.waitForFunction(q => {
  const d = [...document.querySelectorAll('dialog.ui-palette')].find(x => x.open);
  return d && d.querySelector('input').value === q && !/Searching/.test(d.querySelector('.ui-palette__status').textContent);
}, q);

for (const [name, keys] of [['⌘K', 'Meta+k'], ['Ctrl+K', 'Control+k'], ['"/"', '/']]) {
  test(`${name} opens it as a modal dialog with the input focused`, async () => {
    const page = await open();
    await page.keyboard.press(keys);
    assert.equal(await isOpen(page), true);
    const r = await page.evaluate(() => {
      const d = document.querySelector('dialog.ui-palette'), i = d.querySelector('input');
      return { modal: d.matches(':modal'), focused: document.activeElement === i, role: i.getAttribute('role'),
        controls: i.getAttribute('aria-controls'), listRole: document.getElementById(i.getAttribute('aria-controls'))?.getAttribute('role') };
    });
    assert.deepEqual(r, { modal: true, focused: true, role: 'combobox', controls: r.controls, listRole: 'listbox' });
    await page.close();
  });
}

test('"/" while typing in a field types a slash and leaves the palette shut', async () => {
  const page = await open();
  await page.click('#shop');
  await page.keyboard.press('/');
  assert.equal(await isOpen(page), false);
  assert.equal(await page.inputValue('#shop'), '/');
  await page.close();
});

test('arrows move the active option, Enter runs it, and the page goes there', async () => {
  const page = await open();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('ed');
  await settled(page, 'ed');
  assert.deepEqual(await labels(page), ['Needs you', 'Filament loaded']);
  const active = () => page.evaluate(() => document.getElementById(document.querySelector('.ui-palette input').getAttribute('aria-activedescendant'))?.textContent);
  assert.match(await active(), /^Needs you/);
  await page.keyboard.press('ArrowDown');
  assert.match(await active(), /^Filament loaded/);
  await page.keyboard.press('ArrowDown');
  assert.match(await active(), /^Needs you/);  // wraps
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#materials-h');
  assert.equal(await isOpen(page), false);
  await page.close();
});

test('Esc closes and focus returns to what opened it', async () => {
  const page = await open();
  await page.focus('#search');
  await page.keyboard.press('Enter');  // the phone header's search button
  assert.equal(await isOpen(page), true);
  await page.keyboard.press('Escape');
  assert.equal(await isOpen(page), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'search');
  await page.close();
});

test('a provider that throws shows its one line, never an empty list, and the others still answer', async () => {
  const page = await open();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('zzz');
  await settled(page, 'zzz');
  const r = await page.evaluate(() => [...document.querySelectorAll('.ui-palette__list > li')].map(li => [li.className, li.textContent, li.getAttribute('aria-disabled')]));
  assert.deepEqual(r, [['ui-palette__down', "Paperless isn't answering", 'true']]);
  await page.fill('.ui-palette input', 'work');
  await settled(page, 'work');
  assert.deepEqual(await labels(page), ['Workshop']);
  assert.equal(await page.locator('.ui-palette__down').count(), 1);
  await page.close();
});

test('a slow provider is cut off after its timeout and shows its line', async () => {
  const page = await open();
  await page.evaluate(() => {
    const p = AppliancePalette.create({ providers: [{ name: 'Slow', timeout: 200, find: () => new Promise(() => {}) }] });
    window.slow = p;
    p.open('x');
  });
  await page.waitForSelector('.ui-palette__down >> text=Slow isn\'t answering', { timeout: 2000 });
  await page.close();
});

test('an action that confirms asks first; No keeps it from running, Yes runs it', async () => {
  const page = await open();
  const answers = [false, true];
  const asked = [];
  page.on('dialog', d => { asked.push(d.message()); d[answers.shift() ? 'accept' : 'dismiss'](); });
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('Control+k');
    await page.keyboard.type('pause');
    await settled(page, 'pause');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    if (i === 0) {
      assert.equal(await page.textContent('#palette-done'), '');
      assert.equal(await isOpen(page), true);
      await page.keyboard.press('Escape');
    }
  }
  assert.deepEqual(asked, ['Pause the print on the X2D?', 'Pause the print on the X2D?']);
  assert.equal(await page.textContent('#palette-done'), 'Paused the print.');
  assert.equal(await isOpen(page), false);
  await page.close();
});

test('an empty query shows recent pages first', async () => {
  const page = await open();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('states');
  await settled(page, 'states');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#states-h');
  await page.keyboard.press('Control+k');
  await settled(page, '');
  assert.equal((await labels(page))[0], 'States');
  await page.close();
});

test('labels go in as text', async () => {
  const page = await open();
  await page.evaluate(() => {
    window.x = 0;
    AppliancePalette.create({ providers: [{ name: 'Bad', find: () => [{ kind: 'go', label: '<img src=x onerror="window.x=1">', href: '/' }] }] }).open('');
  });
  await page.waitForFunction(() => document.querySelectorAll('.ui-palette__option').length > 0);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.ui-palette img').length), 0);
  assert.equal(await page.evaluate(() => window.x), 0);
  await page.close();
});

test('motion: the open animation runs only without reduced motion', async () => {
  for (const [reducedMotion, want] of [['reduce', 'none'], ['no-preference', 'ui-palette-in']]) {
    const page = await open({ reducedMotion });
    await page.keyboard.press('Control+k');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('dialog.ui-palette')).animationName), want);
    await page.close();
  }
});

test('focus is visible: the input has an outline and the active option a border', async () => {
  const page = await open();
  await page.keyboard.press('Control+k');
  await settled(page, '');
  const r = await page.evaluate(() => {
    const i = document.querySelector('.ui-palette input'), o = document.querySelector('.ui-palette__option[aria-selected="true"]');
    return { outline: getComputedStyle(i).outlineStyle, border: getComputedStyle(o).borderTopColor !== 'rgba(0, 0, 0, 0)' };
  });
  assert.deepEqual(r, { outline: 'solid', border: true });
  await page.close();
});

test('on a phone an empty query shows at most eight and the sheet fits the screen', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(demo);
  await page.evaluate(() => {
    const many = Array.from({ length: 20 }, (_, i) => ({ kind: 'go', label: `Page ${i}`, href: `#p${i}` }));
    AppliancePalette.create({ providers: [{ name: 'Many', find: () => many }] }).open('');
  });
  await settled(page, '');
  const r = await page.evaluate(() => {
    const d = [...document.querySelectorAll('dialog.ui-palette')].pop(), b = d.getBoundingClientRect();
    return { n: d.querySelectorAll('.ui-palette__option').length, fits: b.left >= 0 && b.right <= innerWidth };
  });
  assert.deepEqual(r, { n: 8, fits: true });
  await page.close();
});

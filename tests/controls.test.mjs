import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const browser = await chromium.launch();
after(() => browser.close());

// 2.35.3: a control looks like a control, and the loud one is never the destructive one.
test('a Needs-you action is drawn as a link without hover: accent text, underlined', () => {
  const rule = read('dist/needs.css').match(/\.ui-need__action\{([^}]*)\}/);
  assert.ok(rule, 'the action rule exists');
  assert.match(rule[1], /color:var\(--ui-accent-text\)/);
  assert.match(rule[1], /text-decoration:underline/);
});

test('a danger button is the well with its word in bad at rest; the tint is for hover and the confirm step', () => {
  const css = read('dist/components.css');
  const rest = css.match(/\.ui-btn--danger\{([^}]*)\}/);
  assert.ok(rest, 'the danger rule exists');
  assert.match(rest[1], /color:var\(--ui-bad\)/);
  assert.doesNotMatch(rest[1], /background|border/, 'no tint at rest');
  assert.match(css, /\.ui-btn--danger:not\(:disabled,\[aria-disabled="true"\]\):hover,\.ui-confirm \.ui-btn--danger\{background:color-mix\(in srgb,var\(--ui-bad\) 16%,transparent\)/);
  assert.match(read('docs/contrast.md'), /bad on surface2 \| 4\.5:1/, 'the resting pair is measured');
});

test('the current strip item is accent text, the notice edge matches the need edge, and the kit has three weights', () => {
  const css = read('dist/components.css');
  assert.match(css, /\.ui-strip a\[aria-current="page"\],\.ui-strip a\[aria-current="true"\]\{color:var\(--ui-accent-text\)/);
  assert.match(css, /\.ui-notice\{[^}]*border-left:3px solid/);
  assert.match(read('dist/needs.css'), /\.ui-need\{[^}]*border-left:3px solid/);
  for (const f of ['components.css', 'needs.css', 'shell.css', 'palette.css']) {
    const weights = [...read('dist/' + f).matchAll(/font(?:-weight)?:(\d{3})\b/g)].map(m => m[1]);
    assert.deepEqual([...new Set(weights)].filter(w => !['400', '600', '700'].includes(w)), [], f);
  }
});

test('ui-swatch is a square filled from --ui-swatch, and an empty outline without one', () => {
  const rule = read('dist/components.css').match(/\.ui-swatch\{([^}]*)\}/);
  assert.ok(rule, 'the swatch rule exists');
  assert.match(rule[1], /--ui-swatch:transparent/);
  assert.match(rule[1], /background:var\(--ui-swatch\)/);
  assert.match(rule[1], /border-radius:var\(--ui-r-1\)/, 'square, never a lamp');
  assert.match(rule[1], /border:1px solid var\(--ui-field-line\)/);
});

test('in the demo page: tools share a centre line, and every answer is an outlined button with the recommended one heavier', async () => {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(pathToFileURL(path.join(root, 'demo/page.html')).href);
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const mid = e => { const b = e.getBoundingClientRect(); return b.top + b.height / 2; };
      const tools = [...document.querySelectorAll('.ui-page__tool .ui-btn')].map(mid);
      const row = document.querySelector('.ui-decision__options:not(.ui-decision__multi)');
      const opts = [...row.querySelectorAll('.ui-btn')].map(b => { const s = getComputedStyle(b); return { rec: !!b.querySelector('.ui-decision__rec'), ghost: b.classList.contains('ui-btn--ghost'), border: parseFloat(s.borderTopWidth), bg: s.backgroundColor, justify: s.justifyContent, w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height }; });
      return { tools, opts, rowW: row.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    await page.close();
    assert.ok(r.tools.length >= 2 && Math.max(...r.tools) - Math.min(...r.tools) <= 1, `${width}: tools ${r.tools}`);
    assert.ok(r.opts.length >= 2 && r.opts.every(o => o.ghost && o.justify === 'center' && o.h >= 44), `${width}: ${JSON.stringify(r.opts)}`);
    const rec = r.opts.find(o => o.rec), other = r.opts.find(o => !o.rec);
    assert.ok(rec && other && rec.border > other.border, `${width}: the recommended border is heavier`);
    assert.equal(rec.bg, other.bg, `${width}: the recommended answer is not the one filled button`);
    if (width === 1440) assert.ok(r.opts.every(o => o.w < r.rowW / 2), 'side by side, an answer is as wide as its label, not stretched like a field');
    assert.equal(r.overflow, false, `${width}: no horizontal overflow`);
  }
});

// 2.35.4: found by demo/chat.html and demo/shell.html#palette.
test('a summary takes the kit ring, a disabled checkbox is told from a live one, and the palette list is not a tab stop', async () => {
  const css = read('dist/components.css');
  assert.match(css, /:where\(\.ui-btn,\.ui-field,a,button,summary\):focus-visible\{outline:2px solid var\(--ui-accent\)/);
  assert.match(css, /\.ui-disclosure__summary:focus-visible\{outline-offset:-2px\}/, 'inside the clipped disclosure');
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(pathToFileURL(path.join(root, 'demo/chat.html')).href);
  const r = await page.evaluate(() => {
    const [live, , off] = [...document.querySelectorAll('.ui-check')].map(e => { const s = getComputedStyle(e); return s.borderTopColor + s.backgroundColor; });
    document.querySelector('.ui-disclosure__summary').focus();
    return { live, off, disabled: document.querySelectorAll('.ui-check:disabled').length };
  });
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return [document.activeElement.tagName, s.outlineStyle, s.outlineWidth].join(' '); });
  await page.goto(pathToFileURL(path.join(root, 'demo/shell.html')).href + '#palette');
  await page.keyboard.press('Tab');
  const after = await page.evaluate(() => document.activeElement.className);
  await page.close();
  assert.equal(r.disabled, 1);
  assert.notEqual(r.off, r.live, 'a disabled box is drawn differently');
  assert.equal(ring, 'SUMMARY solid 2px');
  assert.doesNotMatch(after, /ui-palette__list/, 'Tab from the box does not stop on the list');
});

// 2.36.0: one token for a touch target, a checkbox that can be pressed, and one phone width.
test('the 44 px target is one token: built into tokens.css, and no kit stylesheet writes the number', () => {
  assert.match(read('dist/tokens.css'), /--ui-target:44px;/);
  assert.equal(JSON.parse(read('tokens.json')).target, 44);
  for (const f of ['components.css', 'needs.css', 'shell.css', 'palette.css']) {
    const css = read('dist/' + f).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /[:\s]44px/, f);
  }
  assert.match(read('dist/components.css'), /@media \(pointer:coarse\)\{\.ui-btn,\.ui-field\{min-height:var\(--ui-target\)\}\}/);
  assert.doesNotMatch(read('dist/tokens.h'), /TARGET/, 'the display keeps its own 48 px');
});

test('on a touch screen a checkbox takes a press 10 px outside its box, labelled or bare; with a mouse it does not', async () => {
  for (const hasTouch of [true, false]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(path.join(root, 'demo/chat.html')).href);
    const r = await page.evaluate(() => {
      const bare = document.createElement('input'); bare.type = 'checkbox'; bare.className = 'ui-check'; bare.setAttribute('aria-label', 'Bare'); bare.style.margin = '40px';
      document.querySelector('main').append(bare);
      bare.scrollIntoView({ block: 'center' });
      const b = bare.getBoundingClientRect();
      const at = (x, y) => document.elementFromPoint(x, y) === bare;
      return { size: b.width, left: at(b.left - 10, b.top + b.height / 2), above: at(b.left + b.width / 2, b.top - 10), far: at(b.left - 16, b.top + b.height / 2) };
    });
    await ctx.close();
    assert.equal(Math.round(r.size), 20, 'the box itself stays 20 px');
    assert.equal(r.left && r.above, hasTouch, `hasTouch ${hasTouch}: a press beside the box`);
    assert.equal(r.far, false, 'and not past 44 px');
  }
});

test('the palette and the shell agree on the width of a phone', () => {
  const shell = read('src/shell.css').match(/A10 D2: shell switch[^*]*\*\/\s*@media \(max-width:(\d+)px\)/);
  const palette = read('src/palette.js').match(/function phone\(\) \{[^}]*max-width: (\d+)px/);
  assert.ok(shell && palette);
  assert.equal(palette[1], shell[1]);
});

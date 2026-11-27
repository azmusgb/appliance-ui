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

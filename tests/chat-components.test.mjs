import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('components.css defines conversation-first chat components (Amendment A30 Phase 2)', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-chat-comp-'));
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs'), '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const css = fs.readFileSync(path.join(out, 'components.css'), 'utf8');

  // Verify chat classes are present
  const chatClasses = [
    'ui-chat-thread',
    'ui-chat-msg',
    'ui-chat-msg--user',
    'ui-chat-msg--assistant',
    'ui-chat-msg--streaming',
    'ui-chat-composer',
    'ui-chat-composer__input',
    'ui-chat-composer__action',
    'ui-disclosure',
    'ui-disclosure__summary',
    'ui-disclosure__body',
    'ui-result-card',
    'ui-result-card--loading',
    'ui-result-card--error',
    'ui-result-card--disabled'
  ];

  for (const cls of chatClasses) {
    assert.match(css, new RegExp(`\\.${cls}[\\s{.,:>]`), `Missing expected chat class .${cls}`);
  }

  // Verify touch target compliance (44px)
  assert.match(css, /@media \(pointer:coarse\)\{\.ui-chat-composer__action\{min-height:44px/,
    'composer action button is at least 44px on touch screens');

  // Verify no literal colours in components.css
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b/i, 'no literal hex colours');
  assert.doesNotMatch(code, /\brgba?\(/i, 'no literal rgb colours');
});

// Audit rank 7 (2.35.0): a disabled card is not a control, so the 4.5:1 rule applies. Opacity .5 took its text to 3.46:1
// (light) and 4.32:1 (dark); it now uses --ui-muted on --ui-surface-2. The blend follows the audit's opac.mjs.
test('ui-result-card--disabled keeps its text at 4.5:1 or more in light and dark (no opacity dimming)', async () => {
  assert.equal(spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' }).status, 0);
  const browser = await chromium.launch();
  try {
    for (const scheme of ['light', 'dark']) {
      const page = await browser.newPage({ colorScheme: scheme });
      await page.goto(pathToFileURL(path.join(root, 'tests/fixtures/needs.html')).href);
      const ratio = await page.evaluate(() => {
        const host = document.getElementById('host');
        host.innerHTML = '<div class="ui-result-card ui-result-card--disabled" aria-disabled="true"><span>Not available while the PC sleeps.</span></div>';
        const el = host.firstElementChild;
        const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
        const mix = (a, b, al) => a.map((v, i) => v * al + b[i] * (1 - al));
        const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
        const bg = rgb(getComputedStyle(document.body).backgroundColor);
        const cs = getComputedStyle(el); const op = Number(cs.opacity);
        const text = mix(rgb(cs.color), bg, op), card = mix(rgb(cs.backgroundColor), bg, op);
        const x = lum(text), y = lum(card);
        return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
      });
      assert.ok(ratio >= 4.5, `${scheme}: disabled card text is ${ratio.toFixed(2)}:1`);
      await page.close();
    }
  } finally { await browser.close(); }
});

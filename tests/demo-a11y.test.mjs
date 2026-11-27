// Automated accessibility & responsive layout sweep across every demo page (DESIGN.md, "Before a screen is done").
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demos = ['index.html', 'page.html', 'outside.html', 'say.html'];
let browser;

before(async () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  browser = await chromium.launch();
});
after(() => browser?.close());

for (const file of demos) {
  test(`demo/${file}: accessible names, unique ids, landmarks, focus rings, and zero horizontal overflow across viewports and themes`, async () => {
    const url = pathToFileURL(path.join(root, 'demo', file)).href;
    for (const width of [320, 390, 1024, 1440]) {
      for (const scheme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: scheme, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await page.goto(url);
        await page.evaluate(() => document.fonts.ready);

        const audit = await page.evaluate(() => {
          const nameOf = el => {
            const label = el.getAttribute('aria-label');
            if (label && label.trim()) return label.trim();
            const by = el.getAttribute('aria-labelledby');
            if (by) {
              const joined = by.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
              if (joined) return joined;
            }
            if (el.id) {
              const forLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
              if (forLabel && forLabel.textContent.trim()) return forLabel.textContent.trim();
            }
            const wrapLabel = el.closest('label');
            if (wrapLabel && wrapLabel.textContent.trim()) return wrapLabel.textContent.trim();
            return (el.textContent || '').trim();
          };

          const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
          const seen = new Set(), dupIds = [];
          for (const id of ids) { if (seen.has(id)) dupIds.push(id); seen.add(id); }

          const unnamed = [];
          for (const el of document.querySelectorAll('button, a[href], input, textarea, select, dialog, [role="progressbar"], [role="meter"]')) {
            if (!nameOf(el)) unnamed.push(el.outerHTML.slice(0, 80));
          }

          return {
            lang: document.documentElement.getAttribute('lang'),
            title: document.title.trim(),
            hasMain: !!document.querySelector('main'),
            hasH1: document.querySelectorAll('h1').length === 1,
            dupIds,
            unnamed,
            overflow: document.documentElement.scrollWidth > window.innerWidth,
          };
        });

        const tag = `demo/${file} @ ${width}px (${scheme})`;
        assert.equal(audit.lang, 'en', `${tag}: html[lang="en"]`);
        assert.ok(audit.title.length > 0, `${tag}: non-empty <title>`);
        assert.equal(audit.hasMain, true, `${tag}: has <main> landmark`);
        assert.equal(audit.hasH1, true, `${tag}: has exactly one <h1>`);
        assert.deepEqual(audit.dupIds, [], `${tag}: no duplicate ids`);
        assert.deepEqual(audit.unnamed, [], `${tag}: every control and meter/dialog has an accessible name`);
        assert.equal(audit.overflow, false, `${tag}: no horizontal overflow`);

        await page.keyboard.press('Tab');
        const ring = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const s = getComputedStyle(el);
          return { style: s.outlineStyle, width: s.outlineWidth };
        });
        assert.ok(ring, `${tag}: Tab focuses an interactive control`);
        assert.equal(ring.style, 'solid', `${tag}: visible focus ring`);
        assert.equal(ring.width, '2px', `${tag}: 2px focus ring`);

        await ctx.close();
      }
    }
  });
}

// Audit ranks 5 and 10 (kit 2.35.0): on a coarse pointer the area's tools and the sources links are 44 px high, and
// short strip links and chips buttons are 44 px wide (DESIGN.md: 44 x 44 px on touch).
test('demo/page.html on a touch screen: tools, sources, strip links and chips are at least 44 px', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(root, 'demo', 'page.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const size = sel => [...document.querySelectorAll(sel)].map(e => { const b = e.getBoundingClientRect(); return { el: sel + ' ' + e.textContent.trim().slice(0, 20), w: Math.round(b.width), h: Math.round(b.height) }; });
    return { high: [...size('.ui-tools a'), ...size('.ui-sources a')].filter(x => x.h < 44), wide: [...size('.ui-strip a'), ...size('.ui-chips button')].filter(x => x.w < 44), n: document.querySelectorAll('.ui-tools a,.ui-sources a,.ui-strip a,.ui-chips button').length };
  });
  assert.ok(r.n >= 4, 'the demo draws these parts');
  assert.deepEqual(r.high, [], 'links are 44 px high');
  assert.deepEqual(r.wide, [], 'short links and buttons are 44 px wide');
  await ctx.close();
});

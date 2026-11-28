// Forced colours (Windows contrast themes): the system replaces the kit's colours, so a state the kit shows by a fill
// or a tint has to survive on system colours. Design-system audit, 27 Nov 2026: the meter's fill matched its track, a
// lamp's dot matched the page, and a selected chip, tab and strip link were drawn like their neighbours.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let browser;

before(async () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  browser = await chromium.launch();
});
after(() => browser?.close());

for (const scheme of ['dark', 'light']) {
  test(`forced colours (${scheme}): the meter, the lamps, the swatch and every selected state can still be told apart`, async () => {
    const ctx = await browser.newContext({ viewport: { width: 820, height: 900 }, forcedColors: 'active', colorScheme: scheme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(path.join(root, 'demo/page.html')).href);
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const one = (sel, pseudo) => { const el = document.querySelector(sel); return el && getComputedStyle(el, pseudo || null); };
      const look = s => s && [s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.borderBottomStyle, s.color].join(' ');
      const pair = (on, off) => ({ on: look(one(on)), off: look(one(off)) });
      const canvas = getComputedStyle(document.body).backgroundColor;
      const swatch = document.createElement('span');
      swatch.className = 'ui-swatch'; swatch.style.setProperty('--ui-swatch', 'rgb(46, 143, 134)'); document.body.append(swatch);
      return {
        canvas,
        fill: one('.ui-meter > i')?.backgroundColor, track: one('.ui-meter')?.backgroundColor,
        trackEdge: one('.ui-meter') && one('.ui-meter').borderTopStyle + ' ' + one('.ui-meter').borderTopWidth,
        dot: one('.ui-chip', '::before')?.backgroundColor,
        unknownDot: one('.ui-chip--unknown', '::before')?.backgroundColor,
        unknownRing: one('.ui-chip--unknown', '::before')?.borderTopStyle,
        live: one('.ui-prov[data-level="live"]', '::before')?.backgroundColor,
        swatch: getComputedStyle(swatch).backgroundColor,
        chip: pair('.ui-chips [aria-pressed="true"]', '.ui-chips [aria-pressed="false"]'),
        tab: pair('.ui-tabs [aria-selected="true"]', '.ui-tabs [aria-selected="false"]'),
        strip: pair('.ui-strip a[aria-current="page"]', '.ui-strip a:not([aria-current])'),
        stripOffBar: one('.ui-strip a:not([aria-current])')?.borderBottomColor,
        tabOffBar: one('.ui-tabs [aria-selected="false"]')?.borderBottomColor,
        tabOnBar: one('.ui-tabs [aria-selected="true"]')?.borderBottomColor,
      };
    });
    for (const k of ['fill', 'track', 'dot', 'live']) assert.ok(r[k], `demo/page.html draws ${k}`);
    assert.notEqual(r.fill, r.track, 'the meter\'s fill is not its track\'s colour');
    assert.equal(r.trackEdge, 'solid 1px', 'the meter\'s track has an edge, so an empty meter is still a meter');
    assert.notEqual(r.dot, r.canvas, 'a lamp\'s dot is not the page\'s colour');
    assert.equal(r.unknownDot, r.canvas, 'an unknown lamp stays hollow, never drawn like a known one');
    assert.equal(r.unknownRing, 'solid', 'and keeps its ring');
    assert.notEqual(r.live, r.canvas, 'the Live mark is filled');
    assert.equal(r.swatch, 'rgb(46, 143, 134)', 'a swatch keeps the thing\'s own colour: it is data');
    for (const k of ['chip', 'tab', 'strip']) {
      assert.ok(r[k].on && r[k].off, `demo/page.html has a selected and an unselected ${k}`);
      assert.notEqual(r[k].on, r[k].off, `a selected ${k} is drawn differently from an unselected one`);
    }
    // The bar under the current strip link and the selected tab is the mark: the others must not show one.
    assert.equal(r.stripOffBar, r.canvas, 'an unselected strip link has no visible bar');
    assert.notEqual(r.tabOffBar, r.tabOnBar, 'an unselected tab\'s bar is not the selected one\'s');
    await ctx.close();
  });
}

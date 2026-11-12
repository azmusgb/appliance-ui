// ui-backbar (2.21.0, Pi Hub amendment A22 6.4 and 9.5 O3): the "← Pi Hub" bar on the platform's own pages outside the
// frame. Where its link goes (src/backbar.js), and the bar itself in a real browser (demo/outside.html).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mod = { exports: {} };
new Function('module', fs.readFileSync(path.join(root, 'src/backbar.js'), 'utf8'))(mod);
const { target, apply } = mod.exports;
const HOME = 'https://hub.example.test/';

test('a visitor who came from a Pi Hub page goes back to that page', () => {
  assert.equal(target(HOME, 'https://hub.example.test/workshop?e=E-021#lab'), 'https://hub.example.test/workshop?e=E-021#lab');
  assert.equal(target(HOME, 'https://hub.example.test/'), HOME);
});

test('anything else leaves the link on Pi Hub\'s home: another site, no referrer, an address that can\'t be read', () => {
  for (const from of ['', undefined, null, 'not an address', 'https://assistant.example.test/work', 'https://hub.example.test.evil.test/',
    'http://hub.example.test/', 'https://hub.example.test:8443/', 'javascript:alert(1)', 'data:text/html,x', '//hub.example.test/x']) {
    assert.equal(target(HOME, from), HOME, String(from));
  }
  assert.equal(target('not an address', 'https://hub.example.test/x'), 'not an address', 'a home that can\'t be read is left alone');
});

test('apply sets each bar link from the document\'s referrer, and only bar links', () => {
  const a = { href: HOME }, b = { href: 'https://other.example.test/' };
  const doc = { referrer: 'https://hub.example.test/papers', querySelectorAll: sel => { assert.equal(sel, '.ui-backbar a[href]'); return [a, b]; } };
  apply(doc);
  assert.equal(a.href, 'https://hub.example.test/papers');
  assert.equal(b.href, 'https://other.example.test/', 'a bar link to another site keeps its address');
  assert.doesNotThrow(() => apply(null));
});

let browser;
before(async () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  browser = await chromium.launch();
});
after(() => browser?.close());
const demo = pathToFileURL(path.join(root, 'demo/outside.html')).href;

for (const [name, viewport] of [['phone', { width: 320, height: 640 }], ['desktop', { width: 1440, height: 900 }]]) {
  test(`the bar on a ${name}: first in the document, 44 px, not sticky, named "Back to Pi Hub"`, async () => {
    const page = await browser.newPage({ viewport });
    await page.goto(demo);
    const m = await page.evaluate(() => {
      const nav = document.querySelector('.ui-backbar'), a = nav.querySelector('a'), arrow = a.querySelector('span');
      const r = nav.getBoundingClientRect(), l = a.getBoundingClientRect(), cs = getComputedStyle(nav);
      return { first: document.body.firstElementChild === nav, tag: nav.tagName, navName: nav.getAttribute('aria-label'), links: nav.querySelectorAll('a').length,
        name: a.getAttribute('aria-label'), text: a.textContent, arrowHidden: arrow.getAttribute('aria-hidden'), arrow: arrow.textContent,
        top: r.top, height: r.height, linkHeight: l.height, linkWidth: l.width, position: cs.position, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    assert.deepEqual({ first: m.first, tag: m.tag, navName: m.navName, links: m.links }, { first: true, tag: 'NAV', navName: 'Pi Hub', links: 1 });
    assert.equal(m.name, 'Back to Pi Hub');
    assert.ok(m.name.includes(m.text.replace(m.arrow, '').trim()), 'the name contains the words on screen (WCAG 2.5.3)');
    assert.deepEqual([m.arrow, m.arrowHidden], ['←', 'true']);
    assert.equal(m.top, 0);
    assert.ok(m.height >= 44 && m.linkHeight >= 44 && m.linkWidth >= 44, JSON.stringify(m));
    assert.equal(m.position, 'static', 'never sticky: it can\'t cover content or a focus ring');
    assert.ok(m.overflow <= 0, 'no sideways scroll');
    await page.close();
  });
}

test('the bar is the first stop for the keyboard, and its focus ring is inside the bar', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(demo);
  await page.keyboard.press('Tab');
  const f = await page.evaluate(() => {
    const a = document.activeElement, cs = getComputedStyle(a), r = a.getBoundingClientRect(), nav = a.closest('.ui-backbar').getBoundingClientRect();
    return { inBar: !!a.closest('.ui-backbar'), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), offset: parseFloat(cs.outlineOffset),
      // The ring's outer edge is offset + width outside the link's box; at or under zero it is drawn within the box.
      outer: parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth), inside: r.top >= nav.top - 0.5 && r.bottom <= nav.bottom + 0.5 && r.left >= 0 };
  });
  assert.equal(f.inBar, true);
  assert.equal(f.style, 'solid'); assert.equal(f.width, 2);
  assert.ok(f.outer <= 0 && f.inside, `the ring is drawn inside the link, and the link inside the bar, so the window's top edge does not clip it: ${JSON.stringify(f)}`);
  await page.close();
});

test('the bar uses bar and accentText, the pair docs/contrast.md already measures', () => {
  const css = fs.readFileSync(path.join(root, 'src/components.css'), 'utf8');
  const bar = css.match(/\.ui-backbar\{[^}]*\}/)[0], link = css.match(/\.ui-backbar a\{[^}]*\}/)[0];
  assert.match(bar, /background:var\(--ui-bar\)/); assert.match(link, /color:var\(--ui-accent-text\)/);
  assert.doesNotMatch(bar, /position:\s*(sticky|fixed)/);
  assert.match(fs.readFileSync(path.join(root, 'docs/contrast.md'), 'utf8'), /accentText on bar \(header\) \| 4\.5:1/);
});

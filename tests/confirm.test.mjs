import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

// 2.6.0 (Pi Hub amendment A7 P7): a risky action asks in place, repeats its verb, and gives focus back.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = pathToFileURL(path.join(root, 'tests/fixtures/page.html')).href;
let browser;
before(() => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return chromium.launch().then(b => { browser = b; });
});
after(() => browser?.close());
const open = async () => { const page = await browser.newPage(); await page.goto(fixture); return page; };

test('ask opens a line in the row saying what will happen, with the verb again, and focuses it', async () => {
  const page = await open();
  const r = await page.evaluate(() => {
    const b = document.getElementById('plex');
    window.answer = ApplianceConfirm.ask(b, { what: 'Plex stops for about a minute. <b>x</b>' });
    const box = document.querySelector('.ui-confirm');
    return { inRow: box.parentElement.id, what: box.querySelector('.ui-confirm__what').textContent, bold: box.querySelectorAll('b').length,
      yes: box.querySelectorAll('button')[0].textContent, yesCls: box.querySelectorAll('button')[0].className, no: box.querySelectorAll('button')[1].textContent,
      focused: document.activeElement.textContent, expanded: b.getAttribute('aria-expanded'), label: document.getElementById(box.getAttribute('aria-labelledby'))?.textContent };
  });
  assert.equal(r.inRow, 'row');
  assert.equal(r.what, 'Plex stops for about a minute. <b>x</b>');
  assert.equal(r.bold, 0, 'text, never markup');
  assert.equal(r.yes, 'Restart Plex');
  assert.match(r.yesCls, /ui-btn--primary/);
  assert.equal(r.no, 'Cancel');
  assert.equal(r.focused, 'Restart Plex');
  assert.equal(r.expanded, 'true');
  assert.equal(r.label, r.what);
  await page.click('.ui-confirm .ui-btn--primary');
  assert.equal(await page.evaluate(() => window.answer), true);
  assert.equal(await page.evaluate(() => [document.querySelectorAll('.ui-confirm').length, document.activeElement.id, document.getElementById('plex').hasAttribute('aria-expanded')].join()), '0,plex,false');
  await page.close();
});

test('Cancel and Escape resolve false, close the line and return focus', async () => {
  const page = await open();
  await page.evaluate(() => { window.a = ApplianceConfirm.ask(document.getElementById('plex'), { what: 'x' }); });
  await page.click('.ui-confirm .ui-btn--ghost');
  assert.deepEqual(await page.evaluate(async () => [await window.a, document.querySelectorAll('.ui-confirm').length, document.activeElement.id]), [false, 0, 'plex']);
  await page.evaluate(() => { window.b = ApplianceConfirm.ask(document.getElementById('plex'), { what: 'x' }); });
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(async () => [await window.b, document.querySelectorAll('.ui-confirm').length, document.activeElement.id]), [false, 0, 'plex']);
  await page.close();
});

test('a danger trigger gets a danger confirm; a trigger outside a row gets the line after it; custom words', async () => {
  const page = await open();
  const r = await page.evaluate(() => {
    ApplianceConfirm.ask(document.getElementById('pi'), { what: 'Everything here goes down for about 2 minutes.' });
    const pi = document.querySelector('.ui-confirm .ui-btn').className;
    ApplianceConfirm.ask(document.getElementById('loose'), { what: 'This Mac stops being an owner device.', confirm: 'Sign out of this Mac', cancel: 'Keep me signed in', danger: true });
    const loose = document.getElementById('loose').nextElementSibling;
    return { pi, looseCls: loose.className, yes: loose.querySelector('button').textContent, yesCls: loose.querySelector('button').className, no: loose.querySelectorAll('button')[1].textContent };
  });
  assert.match(r.pi, /ui-btn--danger/);
  assert.equal(r.looseCls, 'ui-confirm');
  assert.equal(r.yes, 'Sign out of this Mac');
  assert.match(r.yesCls, /ui-btn--danger/);
  assert.equal(r.no, 'Keep me signed in');
  await page.close();
});

test('asking again while open reuses the line; no what means no line and false', async () => {
  const page = await open();
  const r = await page.evaluate(async () => {
    const b = document.getElementById('plex');
    const p1 = ApplianceConfirm.ask(b, { what: 'x' }), p2 = ApplianceConfirm.ask(b, { what: 'x' });
    const lines = document.querySelectorAll('.ui-confirm').length;
    const none = await ApplianceConfirm.ask(document.getElementById('pi'), {});
    const blank = await ApplianceConfirm.ask(document.getElementById('pi'), { what: '  ' });
    const missing = await ApplianceConfirm.ask(null, { what: 'x' });
    return { same: p1 === p2, lines, none, blank, missing, after: document.querySelectorAll('.ui-confirm').length };
  });
  assert.deepEqual(r, { same: true, lines: 1, none: false, blank: false, missing: false, after: 1 });
  await page.close();
});

test('the line fits a phone: no horizontal overflow at 320 px', async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
  await page.goto(fixture);
  await page.evaluate(() => { ApplianceConfirm.ask(document.getElementById('plex'), { what: 'Plex stops for about a minute while it restarts; the TVs reconnect by themselves.' }); });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.close();
});

test('askTyped requires matching exact typed challenge before confirming (A30 Phase 4 D3)', async () => {
  const page = await open();
  const r = await page.evaluate(async () => {
    const b = document.getElementById('pi');
    window.typedAnswer = ApplianceConfirm.askTyped(b, {
      what: 'Reboot the home server?',
      challenge: 'REBOOT',
      confirm: 'Reboot now'
    });
    const box = document.querySelector('.ui-confirm');
    const input = box.querySelector('input.ui-field');
    const yes = box.querySelector('button.ui-btn--danger');
    const initialDisabled = yes.disabled;

    input.value = 'REB';
    input.dispatchEvent(new Event('input'));
    const partialDisabled = yes.disabled;

    input.value = 'REBOOT';
    input.dispatchEvent(new Event('input'));
    const matchedDisabled = yes.disabled;

    yes.click();
    const resolved = await window.typedAnswer;
    return { hasInput: !!input, initialDisabled, partialDisabled, matchedDisabled, resolved };
  });

  assert.equal(r.hasInput, true);
  assert.equal(r.initialDisabled, true);
  assert.equal(r.partialDisabled, true);
  assert.equal(r.matchedDisabled, false);
  assert.equal(r.resolved, true);
  await page.close();
});

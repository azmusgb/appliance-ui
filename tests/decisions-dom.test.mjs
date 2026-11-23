// A33 P1 (kit 2.27.0): the Decisions group and its row, in a real browser.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = pathToFileURL(path.join(root, 'tests/fixtures/needs.html')).href;
let browser;
before(async () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  browser = await chromium.launch();
});
after(() => browser?.close());

async function open(width = 390, scheme = 'light', reducedMotion = 'no-preference') {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme, reducedMotion });
  const page = await ctx.newPage();
  await page.goto(fixture);
  // A fake onAnswer the test settles by hand: window.calls records each call, window.settle(ok|fail|value) ends the oldest.
  await page.evaluate(() => {
    window.calls = [];
    window.pending = [];
    window.onAnswer = (id, answer) => new Promise((res, rej) => { window.calls.push([id, answer]); window.pending.push({ res, rej }); });
    window.mount = (list, opts) => {
      document.getElementById('host').replaceChildren(window.ApplianceNeeds.renderDecisions(list, { here: new URL('http://10.0.0.80/'), onAnswer: window.onAnswer, ...opts }));
    };
  });
  return page;
}
const choice = { id: 'a27-shape', question: 'Which Activity shape?', options: ['Feed', 'Table', 'Cards'], recommended: 'Table', link: '/spec', kind: 'choice' };
const text = { id: 'a30-line', question: 'Write the A30 line', options: [], link: '', kind: 'text' };

test('empty, missing and fully answered lists draw no group', async () => {
  const page = await open();
  const r = await page.evaluate(([c]) => {
    const out = [];
    for (const l of [[], undefined, null, 'x', [{ ...c, answered_at: '2026-11-21T10:00:00Z', answer: 'Feed' }], [{ id: '', question: 'q' }, { id: 'z' }, null]]) {
      window.mount(l);
      out.push(document.getElementById('host').children.length);
    }
    return out;
  }, [choice]);
  assert.deepEqual(r, [0, 0, 0, 0, 0, 0]);
  await page.close();
});

test('renders the heading with a count, option buttons, the recommended mark in words, and the link', async () => {
  const page = await open();
  const r = await page.evaluate(([c, t]) => {
    window.mount([c, t]);
    const sec = document.querySelector('.ui-decisions');
    const rows = [...sec.querySelectorAll('.ui-decision')];
    const btns = [...rows[0].querySelectorAll('button')].map(b => ({ text: b.textContent, primary: b.classList.contains('ui-btn--primary') }));
    return { heading: sec.querySelector('h3').textContent, labelled: sec.getAttribute('aria-labelledby') === sec.querySelector('h3').id, n: rows.length,
      q: rows[0].querySelector('.ui-decision__q').textContent, btns, link: rows[0].querySelector('a')?.getAttribute('href'),
      textarea: rows[1].querySelector('textarea')?.maxLength, send: rows[1].querySelector('button')?.textContent, rowButtons: rows[1].querySelectorAll('button').length,
      tone: rows[0].dataset.tone, group: rows[0].querySelector('[role=group]')?.getAttribute('aria-labelledby') === rows[0].querySelector('.ui-decision__q').id };
  }, [choice, text]);
  assert.equal(r.heading, 'Decisions (2)');
  assert.ok(r.labelled && r.group);
  assert.equal(r.n, 2);
  assert.equal(r.q, 'Which Activity shape?');
  assert.deepEqual(r.btns, [{ text: 'Feed', primary: false }, { text: 'TableRecommended', primary: true }, { text: 'Cards', primary: false }]);
  assert.equal(r.link, 'http://10.0.0.80/spec');
  assert.equal(r.textarea, 500);
  assert.equal(r.send, 'Send');
  assert.equal(r.rowButtons, 1);
  assert.equal(r.tone, 'attention');
  await page.close();
});

test('question, options and answers are text, never markup', async () => {
  const page = await open();
  const r = await page.evaluate(() => {
    const evil = { id: 'x', question: '<img src=x onerror=window.x=1><b>q</b>', options: ['<script>window.x=2</script>', '<i>b</i>'], recommended: '<i>b</i>', kind: 'choice' };
    window.mount([evil]);
    const host = document.getElementById('host');
    return { markup: host.querySelectorAll('img,script,b,i').length, q: host.querySelector('.ui-decision__q').textContent, first: host.querySelector('button').textContent, x: window.x };
  });
  assert.equal(r.markup, 0);
  assert.equal(r.q, '<img src=x onerror=window.x=1><b>q</b>');
  assert.equal(r.first, '<script>window.x=2</script>');
  assert.equal(r.x, undefined);
  await page.close();
});

test('a double tap calls onAnswer once; the row is disabled and says so while pending', async () => {
  const page = await open();
  await page.evaluate(([c]) => window.mount([c]), [choice]);
  await page.locator('button', { hasText: 'Feed' }).dblclick();
  const r = await page.evaluate(() => ({ calls: window.calls, disabled: [...document.querySelectorAll('.ui-decision button')].map(b => b.disabled),
    note: document.querySelector('.ui-decision__note').textContent, busy: document.querySelector('.ui-decision').getAttribute('aria-busy'),
    state: document.querySelector('.ui-decision').dataset.state }));
  assert.deepEqual(r.calls, [['a27-shape', 'Feed']]);
  assert.deepEqual(r.disabled, [true, true, true]);
  assert.equal(r.note, 'Recording your answer');
  assert.equal(r.busy, 'true');
  assert.equal(r.state, 'pending');
  await page.close();
});

test('success removes the row and says what was recorded; the count drops; the last row leaves only the line', async () => {
  const page = await open();
  await page.evaluate(([c, t]) => window.mount([c, t]), [choice, text]);
  await page.locator('button', { hasText: 'Cards' }).click();
  await page.evaluate(() => window.pending[0].res(true));
  await page.waitForFunction(() => document.querySelectorAll('.ui-decision').length === 1);
  let r = await page.evaluate(() => ({ heading: document.querySelector('h3').textContent, status: document.querySelector('.ui-decisions__status').textContent,
    focus: document.activeElement.tagName }));
  assert.equal(r.heading, 'Decisions (1)');
  assert.equal(r.status, 'Recorded: Cards');
  assert.equal(r.focus, 'TEXTAREA');
  await page.fill('textarea', '  ship it  ');
  await page.locator('.ui-decision__send').click();
  await page.evaluate(() => window.pending[1].res('ship it (stored)'));
  await page.waitForFunction(() => document.querySelectorAll('.ui-decision').length === 0);
  r = await page.evaluate(() => ({ calls: window.calls, status: document.querySelector('.ui-decisions__status').textContent,
    heading: document.querySelector('h3').hidden, list: document.querySelector('ul').hidden, focus: document.activeElement.className }));
  assert.deepEqual(r.calls, [['a27-shape', 'Cards'], ['a30-line', 'ship it']]);
  assert.equal(r.status, 'Recorded: ship it (stored)');
  assert.ok(r.heading && r.list);
  assert.equal(r.focus, 'ui-decisions__status');
  await page.close();
});

test('a rejection or a resolved false keeps the row, says Not recorded, re-enables it and returns focus; a retry can succeed', async () => {
  const page = await open();
  await page.evaluate(([c]) => window.mount([c]), [choice]);
  for (const fail of ['rej', 'false']) {
    await page.locator('button', { hasText: 'Feed' }).click();
    await page.evaluate(f => (f === 'rej' ? window.pending.shift().rej(new Error('503')) : window.pending.shift().res(false)), fail);
    await page.waitForFunction(() => document.querySelector('.ui-decision').dataset.state === 'failed');
    const r = await page.evaluate(() => ({ rows: document.querySelectorAll('.ui-decision').length, note: document.querySelector('.ui-decision__note').textContent,
      kind: document.querySelector('.ui-decision__note').dataset.kind, disabled: [...document.querySelectorAll('.ui-decision button')].map(b => b.disabled),
      focus: document.activeElement.textContent, recorded: document.body.textContent.includes('Recorded') }));
    assert.equal(r.rows, 1, fail);
    assert.equal(r.note, 'Not recorded. Try again.');
    assert.equal(r.kind, 'failed');
    assert.deepEqual(r.disabled, [false, false, false]);
    assert.equal(r.focus, 'Feed');
    assert.equal(r.recorded, false);
  }
  await page.locator('button', { hasText: 'Feed' }).click();
  await page.evaluate(() => window.pending.shift().res({}));
  await page.waitForFunction(() => document.querySelectorAll('.ui-decision').length === 0);
  assert.equal(await page.evaluate(() => window.calls.length), 3);
  await page.close();
});

test('a synchronous throw from onAnswer is a failure, not a crash', async () => {
  const page = await open();
  await page.evaluate(([c]) => window.mount([c], { onAnswer: () => { throw new Error('x'); } }), [choice]);
  await page.locator('button', { hasText: 'Feed' }).click();
  await page.waitForFunction(() => document.querySelector('.ui-decision').dataset.state === 'failed');
  assert.equal(await page.evaluate(() => document.querySelector('.ui-decision__note').textContent), 'Not recorded. Try again.');
  await page.close();
});

test('without onAnswer, a one-option choice or an unknown kind the row is disabled and says it cannot be answered here', async () => {
  const page = await open();
  const r = await page.evaluate(([c]) => {
    const out = [];
    for (const [d, o] of [[c, { onAnswer: null }], [{ ...c, options: ['Only'] }, {}], [{ ...c, kind: 'weird' }, {}]]) {
      window.mount([d], o);
      out.push({ disabled: [...document.querySelectorAll('.ui-decision button')].every(b => b.disabled), note: document.querySelector('.ui-decision__note').textContent });
    }
    return out;
  }, [choice]);
  for (const x of r) assert.deepEqual(x, { disabled: true, note: "This decision can't be answered here" });
  await page.close();
});

test('an empty text answer is not sent', async () => {
  const page = await open();
  await page.evaluate(([t]) => window.mount([t]), [text]);
  await page.fill('textarea', '   ');
  await page.locator('.ui-decision__send').click();
  const r = await page.evaluate(() => ({ calls: window.calls.length, note: document.querySelector('.ui-decision__note').textContent }));
  assert.equal(r.calls, 0);
  assert.equal(r.note, 'Write an answer first');
  await page.close();
});

test('loading and error states draw the group line, not rows and not an empty group', async () => {
  const page = await open();
  const r = await page.evaluate(() => {
    const out = [];
    for (const s of ['loading', 'error']) {
      window.mount(undefined, { state: s });
      out.push({ status: document.querySelector('.ui-decisions__status').textContent, title: document.querySelector('h3').hidden, rows: document.querySelectorAll('.ui-decision').length });
    }
    return out;
  });
  assert.deepEqual(r, [{ status: 'Loading decisions', title: true, rows: 0 }, { status: "Decisions couldn't be read", title: true, rows: 0 }]);
  await page.close();
});

test('spec links: same-origin kept, allowed https origin external, others dropped', async () => {
  const page = await open();
  const r = await page.evaluate(([c]) => {
    const href = (link, o) => { window.mount([{ ...c, link }], o); const a = document.querySelector('.ui-decision__link'); return a && { href: a.getAttribute('href'), target: a.target, rel: a.rel, text: a.textContent }; };
    return [href('/spec'), href('https://github.com/azmusgb/pi-hub/x.md', { allowOrigins: ['https://github.com'] }), href('https://github.com/x'), href('javascript:x', { allowOrigins: ['https://github.com'] }), href('http://github.com/x', { allowOrigins: ['https://github.com'] })];
  }, [choice]);
  assert.deepEqual(r[0], { href: 'http://10.0.0.80/spec', target: '', rel: '', text: 'Open the spec' });
  assert.deepEqual(r[1], { href: 'https://github.com/azmusgb/pi-hub/x.md', target: '_blank', rel: 'noopener noreferrer', text: 'Open the spec ↗' });
  assert.deepEqual(r.slice(2), [null, null, null]);
  await page.close();
});

test('keyboard only: Tab reaches each option, the link, the text box and Send in order, and Enter on an option answers', async () => {
  const page = await open();
  await page.evaluate(([c, t]) => window.mount([c, t]), [choice, text]);
  const seen = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); seen.push(await page.evaluate(() => document.activeElement.textContent || document.activeElement.tagName)); }
  assert.deepEqual(seen, ['Feed', 'TableRecommended', 'Cards', 'Open the spec', 'TEXTAREA', 'Send']);
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(() => window.calls), [['a27-shape', 'Table']]);
  await page.close();
});

test('every control has a visible focus ring and is at least 44px high, at phone and desktop, light and dark, with a long question', async () => {
  for (const [width, scheme] of [[390, 'light'], [390, 'dark'], [1366, 'light'], [1366, 'dark']]) {
    const page = await open(width, scheme, 'reduce');
    const long = { ...choice, question: 'Which shape should the Activity page take when the answer needs a very long and unbroken description ' + 'x'.repeat(120), options: ['A rather long option label that has to wrap on a narrow phone screen without clipping', 'Short'], recommended: 'Short' };
    await page.evaluate(([c, t, l]) => window.mount([c, t, l]), [choice, text, long]);
    const r = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.ui-decision button, .ui-decision textarea, .ui-decision a')];
      return { small: els.filter(e => e.getBoundingClientRect().height < 44).map(e => e.textContent), overflow: document.documentElement.scrollWidth > innerWidth,
        rows: [...document.querySelectorAll('.ui-decision')].map(li => li.scrollWidth <= li.clientWidth) };
    });
    assert.deepEqual(r.small, [], `${width} ${scheme}`);
    assert.equal(r.overflow, false, `${width} ${scheme}`);
    assert.ok(r.rows.every(Boolean), `${width} ${scheme}`);
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, w: s.outlineWidth }; });
    assert.equal(ring.style, 'solid'); assert.equal(ring.w, '2px');
    await page.close();
  }
});

test('the failed note is the bad colour and the question the text colour, in both themes (pairs docs/contrast.md measures)', async () => {
  for (const scheme of ['light', 'dark']) {
    const page = await open(390, scheme);
    await page.evaluate(([c]) => window.mount([c], { onAnswer: () => Promise.resolve(false) }), [choice]);
    await page.locator('button', { hasText: 'Feed' }).click();
    await page.waitForFunction(() => document.querySelector('.ui-decision').dataset.state === 'failed');
    const r = await page.evaluate(() => {
      const c = v => { const d = document.createElement('i'); d.style.color = `var(${v})`; document.body.append(d); return getComputedStyle(d).color; };
      return { note: getComputedStyle(document.querySelector('.ui-decision__note')).color, bad: c('--ui-bad') };
    });
    assert.equal(r.note, r.bad, scheme);
    await page.close();
  }
});

test('needs.css draws no animation or transition for the group (nothing for reduced motion to switch off)', async () => {
  const css = (await import('node:fs')).readFileSync(path.join(root, 'dist/needs.css'), 'utf8');
  assert.doesNotMatch(css, /animation|transition|@keyframes/);
});

// The recommended tag is drawn in its button's own label colour, a pair docs/contrast.md measures (onAccent on accent for
// a primary button); fading it would make an unmeasured pair (DESIGN.md: a new pairing gets a row before it ships).
test('the recommended tag is not faded: it keeps its button label colour', async () => {
  const css = (await import('node:fs')).readFileSync(path.join(root, 'dist/needs.css'), 'utf8');
  const rule = css.match(/\.ui-decision__rec\{[^}]*\}/)?.[0];
  assert.ok(rule, 'the .ui-decision__rec rule exists');
  assert.doesNotMatch(rule, /opacity|color/);
});

// Plan decision 5 (pi-hub docs/superpowers/plans/2026-11-21-a33-owner-decisions.md): a failed refresh keeps the last rows,
// marked not current, never an empty group and never rows passed off as fresh.
test('stale: the last rows stay with a Not current line; with no rows it says it could not be read', async () => {
  const page = await open();
  const r = await page.evaluate(() => {
    const list = [{ id: 'a27-activity', question: 'Activity shape?', options: ['List', 'Cards'], recommended: 'List', kind: 'choice' }];
    window.mount(list, { state: 'stale' });
    const withRows = { status: document.querySelector('.ui-decisions__status').textContent, kind: document.querySelector('.ui-decisions__status').dataset.kind, rows: document.querySelectorAll('.ui-decision').length, title: document.querySelector('h3').textContent };
    window.mount([], { state: 'stale' });
    const none = { status: document.querySelector('.ui-decisions__status')?.textContent, rows: document.querySelectorAll('.ui-decision').length };
    return { withRows, none };
  });
  assert.deepEqual(r.withRows, { status: "Not current: couldn't refresh the decisions", kind: 'stale', rows: 1, title: 'Decisions (1)' });
  assert.deepEqual(r.none, { status: "Decisions couldn't be read", rows: 0 });
  await page.close();
});

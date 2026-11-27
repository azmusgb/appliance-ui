import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
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

async function open(width = 1280) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.goto(fixture);
  return page;
}
const resolve = l => (l === 'bambuddy' ? 'https://bambuddy.home.arpa/' : l);
const here = 'http://10.0.0.80/';

test('the build writes needs.js and needs.css', () => {
  assert.ok(fs.existsSync(path.join(root, 'dist/needs.js')));
  assert.ok(fs.existsSync(path.join(root, 'dist/needs.css')));
});

test('item text is set as text, never markup; tone sets data-tone', async () => {
  const page = await open();
  const r = await page.evaluate(([res, h]) => {
    const resolve = l => (l === 'bambuddy' ? 'https://bambuddy.home.arpa/' : l);
    const li = window.ApplianceNeeds.render({ id: 'a', source: 'print<b>', tone: 'bad', title: '<script>window.x=1</script>', detail: '<img src=x onerror=window.x=2>' },
      { resolve, here: new URL(h) });
    document.getElementById('host').append(li);
    return { tone: li.dataset.tone, title: li.querySelector('.ui-need__title').textContent, scripts: li.querySelectorAll('script,img,b').length, x: window.x, tag: li.tagName, link: !!li.querySelector('a') };
  }, [null, here]);
  assert.equal(r.tone, 'bad');
  assert.equal(r.title, '<script>window.x=1</script>');
  assert.equal(r.scripts, 0);
  assert.equal(r.x, undefined);
  assert.equal(r.tag, 'LI');
  assert.equal(r.link, false);
  await page.close();
});

test('an external link gets the arrow, target=_blank and rel=noopener; a local one does not', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const resolve = l => (l === 'bambuddy' ? 'https://bambuddy.home.arpa/' : l);
    const o = { resolve, here: new URL(h) };
    const N = window.ApplianceNeeds;
    const ext = N.render({ id: 'e', source: 'bambuddy', tone: 'attention', title: 't', detail: 'd', link: 'bambuddy', action: { key: 'open_bambuddy', link: 'bambuddy' } }, { ...o, self: 'home' });
    const loc = N.render({ id: 'l', source: 'home', tone: 'warn', title: 't', detail: 'd', link: '/workshop', action: { key: 'look', link: '/workshop' } }, { ...o, self: 'home' });
    const bad = N.render({ id: 'b', source: 'home', tone: 'warn', title: 't', detail: 'd', link: 'javascript:x' }, { ...o, self: 'home' });
    const a = ext.querySelector('a'), b = loc.querySelector('a');
    return { href: a.getAttribute('href'), target: a.target, rel: a.rel, action: ext.querySelector('.ui-need__action').textContent,
      meta: ext.querySelector('.ui-need__meta')?.textContent, lhref: b.getAttribute('href'), ltarget: b.getAttribute('target'),
      laction: loc.querySelector('.ui-need__action').textContent, lmeta: loc.querySelector('.ui-need__meta'), badLink: !!bad.querySelector('a') };
  }, here);
  assert.equal(r.href, 'https://bambuddy.home.arpa/');
  assert.equal(r.target, '_blank');
  assert.equal(r.rel, 'noopener noreferrer');
  assert.equal(r.action, 'Open Bambuddy ↗');
  assert.equal(r.meta, 'bambuddy');
  assert.equal(r.lhref, 'http://10.0.0.80/workshop');
  assert.equal(r.ltarget, null);
  assert.equal(r.laction, 'Look at the printer');
  assert.equal(r.lmeta, null);
  assert.equal(r.badLink, false);
  await page.close();
});

test('renderList caps at max, adds the more link; empty shows the phrase', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds;
    const items = [1, 2, 3, 4].map(i => ({ id: 'i' + i, source: 'home', tone: 'warn', title: 'T' + i, detail: 'd' }));
    const o = { resolve: l => l, here: new URL(h), self: 'home' };
    const ul = N.renderList(items, { ...o, max: 2, more: { href: '/needs', label: 'See all 4' } });
    const full = N.renderList(items.slice(0, 2), { ...o, max: 2, more: { href: '/needs', label: 'See all' } });
    const e = N.renderList([], o), e2 = N.renderList([], { ...o, empty: 'All quiet.' });
    return { tag: ul.tagName, cls: ul.className, n: ul.querySelectorAll('.ui-need').length, more: ul.querySelector('.ui-needs__more a')?.textContent,
      moreHref: ul.querySelector('.ui-needs__more a')?.getAttribute('href'), fullMore: !!full.querySelector('.ui-needs__more'),
      empty: e.textContent, emptyCls: e.className, emptyTag: e.tagName, empty2: e2.textContent };
  }, here);
  assert.equal(r.tag, 'UL'); assert.equal(r.cls, 'ui-needs');
  assert.equal(r.n, 2);
  assert.equal(r.more, 'See all 4'); assert.equal(r.moreHref, 'http://10.0.0.80/needs');
  assert.equal(r.fullMore, false);
  assert.equal(r.empty, 'Nothing needs you right now.');
  assert.equal(r.emptyTag, 'P'); assert.equal(r.emptyCls, 'ui-needs__empty');
  assert.equal(r.empty2, 'All quiet.');
  await page.close();
});

test('the stripe uses the tone token; the action sits right on desktop and below on a phone', async () => {
  for (const [width, below] of [[1280, false], [390, true]]) {
    const page = await open(width);
    const r = await page.evaluate(h => {
      const N = window.ApplianceNeeds;
      const ul = N.renderList([{ id: 'a', source: 'home', tone: 'bad', title: 'A title', detail: 'Some detail', link: '/x', action: { key: 'look', link: '/x' } }],
        { resolve: l => l, here: new URL(h), self: 'home' });
      document.getElementById('host').append(ul);
      const li = ul.firstChild, t = li.querySelector('.ui-need__title').getBoundingClientRect(), a = li.querySelector('.ui-need__action').getBoundingClientRect();
      return { h: li.getBoundingClientRect().height, stripe: getComputedStyle(li).borderLeftColor, bad: (() => { const d = document.createElement('i'); d.style.color = 'var(--ui-bad)'; document.body.append(d); return getComputedStyle(d).color; })(),
        below: a.top >= t.bottom - 1 };
    }, here);
    assert.ok(r.h >= 44, `${width}: ${r.h}`);
    assert.equal(r.stripe, r.bad);
    assert.equal(r.below, below, String(width));
    await page.close();
  }
});

test('a warn need is drawn in the warn lamp colour, not the muted grey (2.11.1)', async () => {
  const page = await open(1280);
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds, colour = v => { const d = document.createElement('i'); d.style.color = `var(${v})`; document.body.append(d); return getComputedStyle(d).color; };
    const stripe = tone => { const ul = N.renderList([{ id: 'a', source: 'home', tone, title: 't', detail: 'd' }], { here: new URL(h), self: 'home' }); document.getElementById('host').append(ul); return getComputedStyle(ul.firstChild).borderLeftColor; };
    return { warn: stripe('warn'), attention: stripe('attention'), bad: stripe('bad'), fallback: stripe('nonsense'), lamp: colour('--ui-warn'), muted: colour('--ui-muted'), red: colour('--ui-bad') };
  }, here);
  assert.equal(r.warn, r.lamp);
  assert.equal(r.attention, r.lamp);
  assert.equal(r.fallback, r.lamp);
  assert.equal(r.bad, r.red);
  assert.notEqual(r.warn, r.muted);
  await page.close();
});

test('needs.css has no literal colours and only gated --ui-* colour tokens', () => {
  const css = fs.readFileSync(path.join(root, 'dist/needs.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /\brgba?\(|\bhsla?\(/i);
  const allowed = new Set(['--ui-bad', '--ui-warn', '--ui-muted', '--ui-text', '--ui-surface', '--ui-line', '--ui-fs-1', '--ui-fs-2', '--ui-fs-3', '--ui-fs-5', '--ui-stretch-heading', '--ui-accent']);
  const nonColour = /^--ui-(space|r-\d+|font|mono)$/;
  for (const [, v] of css.matchAll(/var\((--ui-[a-z0-9-]+)/g)) {
    if (nonColour.test(v)) continue;
    assert.ok(allowed.has(v), v);
  }
});

test('odd keys and tones do not crash render; they fall back', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds, o = { resolve: l => l, here: new URL(h), self: 'home' };
    return ['constructor', '__proto__', 'toString'].map(k => {
      const li = N.render({ id: 'a', source: 'home', tone: k, title: 't', detail: 'd', link: '/x', action: { key: k, link: '/x' } }, o);
      return { tone: li.dataset.tone, action: li.querySelector('.ui-need__action')?.textContent ?? null };
    }).concat([(() => { const li = N.render({ id: 'a', source: '', tone: 'bad', title: 't', detail: 'd', action: { key: 'not_answering' } }, o); return { tone: li.dataset.tone, action: li.querySelector('.ui-need__action')?.textContent ?? null }; })()]);
  }, here);
  for (const x of r) assert.equal(x.action, null);
  assert.deepEqual(r.map(x => x.tone), ['warn', 'warn', 'warn', 'bad']);
  await page.close();
});

test('an unsafe more.href drops the more link', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const items = [1, 2].map(i => ({ id: 'i' + i, source: 'home', tone: 'warn', title: 'T', detail: 'd' }));
    return window.ApplianceNeeds.renderList(items, { here: new URL(h), max: 1, more: { href: 'javascript:x', label: 'More' } }).querySelectorAll('.ui-needs__more').length;
  }, here);
  assert.equal(r, 0);
  await page.close();
});

test('tricky more.href values never produce a link off the origin', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const items = [1, 2].map(i => ({ id: 'i' + i, source: 'home', tone: 'warn', title: 'T', detail: 'd' }));
    return ['/..//evil.com', '/%2e%2e//evil.com', '/needs'].map(href => {
      const a = window.ApplianceNeeds.renderList(items, { here: new URL(h), max: 1, more: { href, label: 'More' } }).querySelector('.ui-needs__more a');
      return a ? new URL(a.getAttribute('href'), h).origin : null;
    });
  }, here);
  assert.deepEqual(r, [null, null, 'http://10.0.0.80']);
  await page.close();
});

test('dense lists add the class, hide the source line, keep rows 44px+ and keep the action and arrow', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds;
    const items = [{ id: 'a', source: 'Printer', tone: 'warn', title: 'Clear the plate', detail: 'Finished hex-tile E-021 · 1 h 4 min', link: '/workshop', action: { key: 'look', link: '/workshop' } },
      { id: 'b', source: 'Bambuddy', tone: 'bad', title: 'Judge the print', detail: 'x'.repeat(200), link: 'tool:b' }];
    const o = { resolve: l => (l === 'tool:b' ? 'https://b.example/' : l), here: new URL(h), self: 'Pi Hub' };
    const plain = N.renderList(items, o), dense = N.renderList(items, { ...o, dense: true });
    document.getElementById('host').append(dense);
    const li = [...dense.querySelectorAll('.ui-need')];
    return { plain: plain.className, dense: dense.className, metaShown: li.map(x => getComputedStyle(x.querySelector('.ui-need__meta') || x).display),
      hasMeta: li.map(x => !!x.querySelector('.ui-need__meta')), heights: li.map(x => x.getBoundingClientRect().height), rowW: dense.getBoundingClientRect().width,
      linkW: li.map(x => x.querySelector('.ui-need__link').scrollWidth - x.querySelector('.ui-need__link').clientWidth),
      actions: li.map(x => x.querySelector('.ui-need__action')?.textContent) };
  }, here);
  assert.equal(r.plain, 'ui-needs'); assert.equal(r.dense, 'ui-needs ui-needs--dense');
  assert.deepEqual(r.metaShown.map((d, i) => r.hasMeta[i] ? d : 'none'), ['none', 'none']);
  assert.ok(r.heights.every(h => h >= 44 && h < 60), r.heights.join());
  assert.ok(r.linkW.every(w => w <= 0), 'long detail ellipsizes, no overflow');
  assert.equal(r.actions[0], 'Look at the printer'); assert.equal(r.actions[1], '↗');
  await page.close();
});

test('2.23.1: a dense list with a long detail stays inside a narrow parent and keeps its action in view', async () => {
  const page = await open(1440);
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds;
    const items = [{ id: 'a', source: 'Printer', tone: 'warn', title: 'Clear the plate', detail: 'Finished hex-tile E-021 on the X2D, plate 3 of 4, '.repeat(8), link: '/workshop', action: { key: 'look', link: '/workshop' } }];
    const box = document.createElement('div');
    box.style.width = '300px';
    document.getElementById('host').append(box);
    box.append(N.renderList(items, { resolve: l => l, here: new URL(h), self: 'Pi Hub', dense: true }));
    const edge = box.getBoundingClientRect().right, li = box.querySelector('.ui-need'), act = li.querySelector('.ui-need__action'), det = li.querySelector('.ui-need__detail');
    return { edge, row: li.getBoundingClientRect().right, action: act.getBoundingClientRect().right, actionW: act.getBoundingClientRect().width,
      text: act.textContent, cut: det.scrollWidth > det.clientWidth };
  }, here);
  assert.ok(r.row <= r.edge + 0.5, `row ends at ${r.row}, parent at ${r.edge}`);
  assert.ok(r.action <= r.edge + 0.5 && r.actionW > 0, `action ends at ${r.action}, parent at ${r.edge}`);
  assert.equal(r.text, 'Look at the printer');
  assert.ok(r.cut, 'the detail is ellipsized, not the row widened');
  await page.close();
});

test('2.6.0: the meta line is "since <as_of> · <area>", the area else a foreign source; bad times are left out', async () => {
  const page = await open();
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds, here = new URL(h), now = '2026-11-04T15:00:00';
    const meta = (item, o = {}) => N.render({ id: 'x', tone: 'warn', title: 't', detail: 'd', ...item }, { here, self: 'Pi Hub', now, ...o }).querySelector('.ui-need__meta')?.textContent ?? null;
    return {
      today: meta({ source: 'Pi Hub', area: 'Network', as_of: '2026-11-04T04:29:00' }),
      before: meta({ source: 'Local AI', as_of: '2026-11-03T22:10:00' }),
      self: meta({ source: 'Pi Hub' }),
      selfSince: meta({ source: 'Pi Hub', as_of: '2026-11-04T09:05:00' }),
      bad: meta({ source: 'Local AI', as_of: 'not a time' }),
      custom: meta({ source: 'Pi Hub', area: 'Workshop', as_of: '2026-11-04T09:05:00' }, { when: () => '2 h ago' }),
      verb: N.render({ id: 'v', source: 'Pi Hub', tone: 'attention', title: 't', detail: 'd', link: '/lab', action: { key: 'judge_it', link: '/lab' } }, { here, self: 'Pi Hub' }).querySelector('.ui-need__action').textContent,
    };
  }, here);
  assert.equal(r.today, 'since 4:29 AM · Network');
  assert.equal(r.before, 'since 3 Nov · Local AI');
  assert.equal(r.self, null);
  assert.equal(r.selfSince, 'since 9:05 AM');
  assert.equal(r.bad, 'Local AI');
  assert.equal(r.custom, 'since 2 h ago · Workshop');
  assert.equal(r.verb, 'Judge it');
  await page.close();
});

// ---- Acknowledge (2.28.0) ----
const ackItems = `[
  { id: 'hms:1', source: 'Pi Hub', tone: 'bad', title: 'Printer needs attention (0x2000b)', detail: 'Alert 0x2000b.', link: '/workshop', ack: true },
  { id: 'hms:2', source: 'Pi Hub', tone: 'warn', title: 'Printer needs attention (0x3000a)', detail: 'Alert 0x3000a.', link: '/workshop', ack: true },
  { id: 'pi', source: 'Pi Hub', tone: 'warn', title: 'Raspberry Pi', detail: 'Running hot.', link: '/system' },
]`;

test('acknowledge: a button only for ack items with an id, only with onAck, never in a dense list', async () => {
  const page = await open();
  const r = await page.evaluate(([items, h]) => {
    const N = window.ApplianceNeeds, list = eval(items), o = { here: new URL(h), self: 'Pi Hub' };
    const count = (ul) => ul.querySelectorAll('button.ui-need__ack').length;
    const withAck = N.renderList(list, { ...o, onAck: async () => true });
    document.getElementById('host').append(withAck);
    const b = withAck.querySelector('button.ui-need__ack');
    return { withAck: count(withAck), none: count(N.renderList(list, o)), dense: count(N.renderList(list, { ...o, dense: true, onAck: async () => true })),
      noId: count(N.renderList([{ ...list[0], id: '' }], { ...o, onAck: async () => true })),
      truthy: count(N.renderList([{ ...list[0], ack: 'yes' }], { ...o, onAck: async () => true })),
      label: b.getAttribute('aria-label'), text: b.textContent, type: b.type, insideLink: !!b.closest('a'),
      height: b.getBoundingClientRect().height };
  }, [ackItems, here]);
  assert.deepEqual({ withAck: r.withAck, none: r.none, dense: r.dense, noId: r.noId, truthy: r.truthy }, { withAck: 2, none: 0, dense: 0, noId: 0, truthy: 0 });
  assert.equal(r.text, 'Acknowledge');
  assert.equal(r.label, 'Acknowledge: Printer needs attention (0x2000b)');
  assert.equal(r.type, 'button');
  assert.equal(r.insideLink, false);
  assert.ok(r.height >= 44, `button is ${r.height}px high`);
  await page.close();
});

test('acknowledge: one call per row while pending, success removes the row and moves the focus on', async () => {
  const page = await open();
  const r = await page.evaluate(async ([items, h]) => {
    const N = window.ApplianceNeeds, calls = [];
    let finish;
    const ul = N.renderList(eval(items), { here: new URL(h), self: 'Pi Hub', onAck: (id) => { calls.push(id); return new Promise(res => { finish = res; }); } });
    document.getElementById('host').append(ul);
    const b = ul.querySelector('button.ui-need__ack'), li = b.closest('li');
    b.focus(); b.click(); b.click();
    await new Promise(res => setTimeout(res, 0));
    const during = { busy: li.getAttribute('aria-busy'), disabled: b.getAttribute('aria-disabled'), note: li.querySelector('.ui-need__note').textContent, focused: document.activeElement === b };
    finish(true);
    await new Promise(res => setTimeout(res, 0));
    return { calls, during, rows: ul.querySelectorAll('li.ui-need').length, gone: !li.isConnected,
      focus: document.activeElement.closest('li')?.querySelector('.ui-need__title')?.textContent || document.activeElement.tagName };
  }, [ackItems, here]);
  assert.deepEqual(r.calls, ['hms:1']);
  assert.deepEqual(r.during, { busy: 'true', disabled: 'true', note: 'Acknowledging', focused: true });
  assert.equal(r.rows, 2);
  assert.equal(r.gone, true);
  assert.equal(r.focus, 'Printer needs attention (0x3000a)');
  await page.close();
});

test('acknowledge: a rejection, a resolved false and a throw keep the row, say so, and allow another try', async () => {
  const page = await open();
  const r = await page.evaluate(async ([items, h]) => {
    const N = window.ApplianceNeeds, out = [];
    const fails = [() => Promise.reject(new Error('x')), async () => false, () => { throw new Error('sync'); }];
    for (const fail of fails) {
      let n = 0;
      const ul = N.renderList(eval(items), { here: new URL(h), onAck: () => (++n === 1 ? fail() : Promise.resolve()) });
      document.getElementById('host').replaceChildren(ul);
      const b = ul.querySelector('button.ui-need__ack'), li = b.closest('li'), note = li.querySelector('.ui-need__note');
      b.click();
      await new Promise(res => setTimeout(res, 0));
      const failed = { kept: li.isConnected, note: note.textContent, kind: note.dataset.kind, role: note.getAttribute('role'), enabled: !b.hasAttribute('aria-disabled'), busy: li.hasAttribute('aria-busy'), focused: document.activeElement === b };
      b.click();
      await new Promise(res => setTimeout(res, 0));
      out.push({ failed, calls: n, goneAfterRetry: !li.isConnected });
    }
    return out;
  }, [ackItems, here]);
  for (const x of r) {
    assert.deepEqual(x.failed, { kept: true, note: 'Not acknowledged. Try again.', kind: 'failed', role: 'status', enabled: true, busy: false, focused: true });
    assert.equal(x.calls, 2);
    assert.equal(x.goneAfterRetry, true);
  }
  await page.close();
});

test('acknowledge: the last row leaves the empty line, focused; the button sits beside the text on a wide list and under it on a phone', async () => {
  const wide = await open(1280);
  const r = await wide.evaluate(async ([items, h]) => {
    const N = window.ApplianceNeeds;
    const ul = N.renderList([eval(items)[0]], { here: new URL(h), onAck: async () => undefined });
    document.getElementById('host').append(ul);
    const b = ul.querySelector('button.ui-need__ack'), a = ul.querySelector('a.ui-need__link');
    const beside = b.getBoundingClientRect().left >= a.getBoundingClientRect().right - 1;
    b.click();
    await new Promise(res => setTimeout(res, 0));
    const p = document.querySelector('#host > p.ui-needs__empty');
    return { beside, empty: p?.textContent, focused: document.activeElement === p, list: !!document.querySelector('#host ul') };
  }, [ackItems, here]);
  assert.deepEqual(r, { beside: true, empty: 'Nothing needs you right now.', focused: true, list: false });
  await wide.close();
  const phone = await open(360);
  const s = await phone.evaluate(([items, h]) => {
    const ul = window.ApplianceNeeds.renderList(eval(items), { here: new URL(h), onAck: async () => true });
    document.getElementById('host').append(ul);
    const b = ul.querySelector('button.ui-need__ack'), a = ul.querySelector('a.ui-need__link');
    return { under: b.getBoundingClientRect().top >= a.getBoundingClientRect().bottom - 1, overflow: document.documentElement.scrollWidth > innerWidth };
  }, [ackItems, here]);
  assert.deepEqual(s, { under: true, overflow: false });
  await phone.close();
});

// ---- Spoken readout kit release two (2.34.0, Pi Hub A37 S4 & A36 D5): rows, more disclosure, heads_up ----
test('2.34.0: ui-need is a row with a 3px left bar, no box fill or radius; more draws a closed mono Details disclosure; heads_up uses the muted bar and until', async () => {
  const page = await open(1280);
  const r = await page.evaluate(h => {
    const N = window.ApplianceNeeds, here = new URL(h), now = '2026-11-26T04:00:00';
    const colour = v => { const d = document.createElement('i'); d.style.color = `var(${v})`; document.body.append(d); return getComputedStyle(d).color; };
    const ul = N.renderList([
      { id: 'e28', source: 'Print lab', area: 'Workshop', tone: 'warn', title: 'E-028: the plan needs fixing',
        detail: "Its test mesh differs from E-026-A's.", more: 'geometry mesh differs (E-026-A vs E-028-ANCHOR) <b>raw</b>',
        as_of: '2026-11-26T01:40:00', link: '/lab', action: { key: 'fix_plan', link: '/lab' } },
      { id: 'wind', source: 'Pi Hub', area: 'Weather', kind: 'heads_up', tone: 'warn', title: 'Wind advisory',
        detail: 'National Weather Service.', as_of: '2026-11-26T01:14:00', until: '2026-11-26T10:00:00',
        link: '/weather', action: { key: 'open_network', link: '/weather' } },
    ], { here, self: 'Pi Hub', now });
    document.getElementById('host').replaceChildren(ul);
    const [ask, hu] = [...ul.querySelectorAll('li.ui-need')];
    const askStyle = getComputedStyle(ask), huStyle = getComputedStyle(hu), ulStyle = getComputedStyle(ul);
    const det = ask.querySelector('details.ui-need__details');
    return {
      ulTop: parseFloat(ulStyle.borderTopWidth),
      gap: ulStyle.rowGap,
      bg: askStyle.backgroundColor,
      radius: askStyle.borderTopLeftRadius,
      leftW: askStyle.borderLeftWidth,
      bottomW: askStyle.borderBottomWidth,
      topW: askStyle.borderTopWidth,
      rightW: askStyle.borderRightWidth,
      titleWeight: getComputedStyle(ask.querySelector('.ui-need__title')).fontWeight,
      hasDetails: !!det,
      open: det?.open,
      summary: det?.querySelector('summary')?.textContent,
      summaryH: det?.querySelector('summary')?.getBoundingClientRect().height,
      moreText: det?.querySelector('.ui-need__more')?.textContent,
      moreHtml: det?.querySelectorAll('b').length,
      insideLink: !!det?.closest('a'),
      huDetails: !!hu.querySelector('details'),
      huKind: hu.dataset.kind,
      huTone: hu.dataset.tone,
      huBar: huStyle.borderLeftColor,
      muted: colour('--ui-muted'),
      huAction: hu.querySelector('.ui-need__action'),
      huMeta: hu.querySelector('.ui-need__meta')?.textContent,
      huHref: hu.querySelector('a.ui-need__link')?.getAttribute('href'),
    };
  }, here);
  assert.equal(r.ulTop, 1);
  assert.equal(r.gap, '0px');
  assert.equal(r.bg, 'rgba(0, 0, 0, 0)');
  assert.equal(r.radius, '0px');
  assert.equal(r.leftW, '3px');
  assert.equal(r.bottomW, '1px');
  assert.equal(r.topW, '0px');
  assert.equal(r.rightW, '0px');
  assert.equal(r.titleWeight, '700');
  assert.equal(r.hasDetails, true);
  assert.equal(r.open, false);
  assert.equal(r.summary, 'Details');
  assert.ok(r.summaryH >= 44, `Details summary meets 44px touch target (got ${r.summaryH})`);
  assert.equal(r.moreText, 'geometry mesh differs (E-026-A vs E-028-ANCHOR) <b>raw</b>');
  assert.equal(r.moreHtml, 0, 'more is inserted as text, never HTML');
  assert.equal(r.insideLink, false, 'details disclosure sits outside the anchor');
  assert.equal(r.huDetails, false, 'an item without more draws no disclosure');
  assert.equal(r.huKind, 'heads_up');
  assert.equal(r.huTone, 'info');
  assert.equal(r.huBar, r.muted, 'heads-up row draws a muted stripe');
  assert.equal(r.huAction, null, 'heads-up row draws no action button phrase');
  assert.equal(r.huMeta, 'since 1:14 AM · until 10:00 AM · Weather');
  assert.equal(r.huHref, 'http://10.0.0.80/weather');
  await page.close();
});

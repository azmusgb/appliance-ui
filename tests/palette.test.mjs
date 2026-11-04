import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// package.json is "type": "module", so require() would load the classic script as ESM; run it with a CommonJS-style module.
const mod = { exports: {} };
new Function('module', fs.readFileSync(path.join(root, 'src/palette.js'), 'utf8'))(mod);
const { order, clean, KINDS } = mod.exports;
const here = new URL('https://hub.rahe-home.duckdns.org/workshop');

test('the five result kinds of spec section 8.2', () => {
  assert.deepEqual(KINDS, ['go', 'do', 'find', 'ask', 'search']);
});

test('order: an exact action match, then pages, then records, then content; ties by recency, then as given', () => {
  const r = (kind, label, at) => ({ kind, label, at });
  const got = order([
    r('search', 'Search the Assistant for pause'), r('find', 'Printer: printing', 10), r('find', 'Pause log', 20),
    r('go', 'Workshop'), r('do', 'Pause print'), r('ask', 'Ask the Assistant: pause print'), r('do', 'Pause all lights'),
  ], 'Pause print');
  assert.deepEqual(got.map(x => x.label), [
    'Pause print', 'Workshop', 'Pause all lights', 'Pause log', 'Printer: printing',
    'Ask the Assistant: pause print', 'Search the Assistant for pause',
  ]);
});

test('order with an empty query puts no action first; ISO dates count as recency', () => {
  const got = order([{ kind: 'do', label: 'x' }, { kind: 'go', label: 'old', at: '2026-11-01T00:00:00Z' }, { kind: 'go', label: 'new', at: '2026-11-03T00:00:00Z' }], '');
  assert.deepEqual(got.map(x => x.label), ['new', 'old', 'x']);
});

test('clean keeps a same-origin path or an http(s) URL, and marks another origin external', () => {
  assert.deepEqual(clean({ kind: 'go', label: 'Lab', href: '/lab?p=hex' }, here),
    { kind: 'go', label: 'Lab', hint: '', area: '', href: 'https://hub.rahe-home.duckdns.org/lab?p=hex', external: false });
  assert.equal(clean({ kind: 'go', label: 'Paperless', href: 'https://paperless.rahe-home.duckdns.org/' }, here).external, true);
  assert.equal(clean({ kind: 'go', label: 'Top', href: '#needs' }, here).href, 'https://hub.rahe-home.duckdns.org/workshop#needs');
});

test('clean drops scripts, protocol-relative and scheme-less links, unknown kinds, empty labels and userinfo', () => {
  for (const href of ['javascript:alert(1)', '//evil.example/', '/\\evil.example/', 'tool:bambuddy', 'lab', 'data:text/html,x', '']) {
    assert.equal(clean({ kind: 'go', label: 'x', href }, here), null, href);
  }
  assert.equal(clean({ kind: 'approve', label: 'x', href: '/x' }, here), null);
  assert.equal(clean({ kind: 'go', label: '  ', href: '/x' }, here), null);
  assert.equal(clean({ kind: 'go', label: 'x' }, here), null);
  assert.equal(clean({ kind: 'go', label: 'x', href: 'https://a:b@hub.rahe-home.duckdns.org/x' }, here).href, 'https://hub.rahe-home.duckdns.org/x');
});

test('clean keeps run and confirm for an action, and run wins over href', () => {
  const run = () => {};
  const r = clean({ kind: 'do', label: 'Stop print', run, href: 'javascript:x', confirm: 'Stop the print?' }, here);
  assert.equal(r.run, run);
  assert.equal(r.confirm, 'Stop the print?');
  assert.equal(r.href, undefined);
});

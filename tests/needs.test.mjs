import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// package.json is "type": "module", so require() would load the classic script as ESM; run it with a CommonJS-style module.
const mod = { exports: {} };
new Function('module', fs.readFileSync(path.join(root, 'src/needs.js'), 'utf8'))(mod);
const { PHRASES, safeLink } = mod.exports;
const here = new URL('http://10.0.0.30/home');
const resolve = l => (l === 'bambuddy' ? 'https://bambuddy.home.arpa/' : l);

test('PHRASES has the eight keys and texts', () => {
  assert.deepEqual(PHRASES, {
    judge: 'Judge the print', approve: 'Approve or drop', send: 'Send it to the printer', fix_plan: 'Fix the plan',
    look: 'Look at the printer', open_bambuddy: 'Open Bambuddy', check_pc: 'Check the PC', not_answering: "{name} isn't answering",
  });
});

const trim = l => l.trim();
const norm = l => l.replace(/[\t\n\r]/g, '').trim();
const resolveTool = l => (l === 'tool:bambuddy' ? 'https://bambuddy.home.arpa/' : l);

test('safeLink keeps same-origin paths, hashes, same-origin absolutes and resolver-produced URLs', () => {
  assert.deepEqual(safeLink('/workshop', { resolve, here }), { href: 'http://10.0.0.30/workshop', external: false });
  assert.deepEqual(safeLink('#printLab?e=E-1', { resolve, here }), { href: 'http://10.0.0.30/home#printLab?e=E-1', external: false });
  assert.deepEqual(safeLink('http://10.0.0.30/x?a=1#h', { resolve, here }), { href: 'http://10.0.0.30/x?a=1#h', external: false });
  assert.deepEqual(safeLink('bambuddy', { resolve, here }), { href: 'https://bambuddy.home.arpa/', external: true });
  assert.deepEqual(safeLink('tool:bambuddy', { resolve: resolveTool, here }), { href: 'https://bambuddy.home.arpa/', external: true });
});

test('safeLink drops anything else', () => {
  for (const l of ['javascript:x', 'data:x', '//evil.com', 'https://evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '/\r\\evil.com',
    ' https://evil.com', '\t//evil.com', 'HTTPS://evil.com', '', null, undefined]) {
    for (const r of [resolve, trim, norm]) assert.equal(safeLink(l, { resolve: r, here }), null, JSON.stringify(l));
  }
  assert.equal(safeLink('x', { resolve: () => 'javascript:alert(1)', here }), null);
  assert.equal(safeLink('x', { resolve: () => 42, here }), null);
});

const tricks = ['/..//evil.com', '/.//evil.com', '/x/..//evil.com', '/./\\evil.com', '\\..\\\\evil.com', '/%2e%2e//evil.com', '/%2e//evil.com',
  'http://10.0.0.30//evil.com/x', '#', ' # '];

test('dot-segment and double-slash tricks never yield a link that leaves the origin', () => {
  for (const l of tricks) {
    for (const r of [resolve, trim, norm]) {
      const out = safeLink(l, { resolve: r, here });
      assert.ok(out === null || new URL(out.href, here).origin === here.origin, JSON.stringify(l));
      assert.ok(out === null || !/^\/[\/\\]/.test(new URL(out.href, here).pathname), JSON.stringify(l));
    }
  }
  assert.equal(safeLink('#', { resolve, here }), null);
});

test('a throwing resolver means no link', () => {
  assert.equal(safeLink('tool:x', { resolve: () => { throw new Error('boom'); }, here }), null);
});

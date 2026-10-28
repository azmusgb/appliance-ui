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

test('safeLink keeps same-origin paths, hashes and resolver-produced URLs', () => {
  assert.deepEqual(safeLink('/workshop', { resolve, here }), { href: '/workshop', external: false });
  assert.deepEqual(safeLink('#printLab?e=E-1', { resolve, here }), { href: '#printLab?e=E-1', external: false });
  assert.deepEqual(safeLink('bambuddy', { resolve, here }), { href: 'https://bambuddy.home.arpa/', external: true });
});

test('safeLink drops anything else', () => {
  for (const l of ['javascript:x', 'data:x', '//evil.com', 'https://evil.com', '/\\evil.com', '', null, undefined]) {
    assert.equal(safeLink(l, { resolve, here }), null, String(l));
  }
  assert.equal(safeLink('x', { resolve: () => 'javascript:alert(1)', here }), null);
  assert.equal(safeLink('x', { resolve: () => 42, here }), null);
});

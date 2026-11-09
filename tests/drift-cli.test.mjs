import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseChangelog } from '../scripts/lib/changelog.mjs';
import { main } from '../scripts/drift.mjs';

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const changelog = parseChangelog('<!-- classified-from: 2.7.0 -->\n# Changelog\n\n## 2.10.0 — skippable\n## 2.9.0 — skippable\n');
const consumers = [
  { name: 'alpha', repo: 'o/alpha', folder: 'ui', kit: 'web', check: null },
  { name: 'beta', repo: 'o/beta', folder: 'ui', kit: 'display', check: null },
];
const version = (v, files) => JSON.stringify({ version: v, files: Object.fromEntries(Object.entries(files).map(([n, b]) => [n, sha(b)])) });
const stub = repos => async (repo, file) => {
  const r = repos[repo];
  if (r instanceof Error) throw r;
  return file in (r || {}) ? Buffer.from(r[file]) : null;
};

async function run(repos, argv = [], extra = {}) {
  const lines = [], errs = [];
  const code = await main(argv, { fetchFile: stub(repos), out: l => lines.push(l), err: l => errs.push(l), consumers, changelog, kitVersion: '2.10.0', ...extra });
  return { code, text: lines.join('\n'), errs: errs.join('\n') };
}
const clean = { 'ui/VERSION': version('2.10.0', { 'a.css': 'x' }), 'ui/a.css': 'x' };

test('a clean consumer is current, exit 0', async () => {
  const r = await run({ 'o/alpha': clean, 'o/beta': clean });
  assert.equal(r.code, 0);
  assert.match(r.text, /alpha\tcurrent/);
});

test('a changed file is modified and named, exit 1', async () => {
  const r = await run({ 'o/alpha': { ...clean, 'ui/a.css': 'edited' }, 'o/beta': clean });
  assert.equal(r.code, 1);
  assert.match(r.text, /alpha\tmodified.*a\.css/);
  assert.match(r.text, /beta\tcurrent/);
});

test('an unreachable consumer is unreachable, exit 0', async () => {
  const r = await run({ 'o/alpha': new Error('offline'), 'o/beta': clean });
  assert.equal(r.code, 0);
  assert.match(r.text, /alpha\tunreachable/);
});

test('a VERSION that is not JSON is unknown-copy, exit 1', async () => {
  const r = await run({ 'o/alpha': { 'ui/VERSION': 'not json' }, 'o/beta': clean });
  assert.equal(r.code, 1);
  assert.match(r.text, /alpha\tunknown-copy/);
});

test('a missing VERSION is unknown-copy, exit 1', async () => {
  const r = await run({ 'o/alpha': {}, 'o/beta': clean });
  assert.equal(r.code, 1);
  assert.match(r.text, /alpha\tunknown-copy/);
});

test('a file VERSION lists but the consumer lacks is modified', async () => {
  const r = await run({ 'o/alpha': { 'ui/VERSION': version('2.10.0', { 'gone.css': 'x' }) }, 'o/beta': clean });
  assert.equal(r.code, 1);
  assert.match(r.text, /alpha\tmodified.*gone\.css/);
});

test('--only reports one consumer', async () => {
  const r = await run({ 'o/alpha': clean, 'o/beta': { 'ui/VERSION': 'not json' } }, ['--only', 'alpha']);
  assert.equal(r.code, 0);
  assert.match(r.text, /alpha/);
  assert.doesNotMatch(r.text, /beta/);
});

test('--only with an unknown name exits 64 and lists the names', async () => {
  const r = await run({}, ['--only', 'nope']);
  assert.equal(r.code, 64);
  assert.match(r.errs, /alpha, beta/);
});

test('a malformed kit version exits 1 without throwing', async () => {
  const r = await run({ 'o/alpha': clean, 'o/beta': clean }, [], { kitVersion: 'banana' });
  assert.equal(r.code, 1);
  assert.match(r.errs, /banana/);
});

test('drift.mjs run through a symlinked path still runs (Node realpaths the entry; so must the guard)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-link-'));
  try {
    const link = path.join(dir, 'drift.mjs');
    fs.symlinkSync(fileURLToPath(new URL('../scripts/drift.mjs', import.meta.url)), link);
    const r = spawnSync(process.execPath, [link, '--only', 'nope'], { encoding: 'utf8' });
    assert.equal(r.status, 64);
    assert.match(r.stderr, /known consumers: pi-hub/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('anything thrown outside the consumer fetch exits 2, not 1 (a hook reads above 1 as unavailable)', async () => {
  const r = await run({}, [], { consumers: [null] });
  assert.equal(r.code, 2);
  assert.ok(r.errs.length > 0);
});

test('a consumer with no kit named is still classified (nothing is skipped by audience)', async () => {
  const r = await run({ 'o/alpha': { ...clean, 'ui/VERSION': version('2.9.0', { 'a.css': 'x' }) } }, ['--only', 'alpha'],
    { consumers: [{ name: 'alpha', repo: 'o/alpha', folder: 'ui', check: null }], changelog: parseChangelog('<!-- classified-from: 2.7.0 -->\n## 2.10.0 — needs consumer change (display): x\n## 2.9.0 — skippable\n') });
  assert.equal(r.code, 1);
});

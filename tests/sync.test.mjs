import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = (args, opts = {}) => spawnSync(process.execPath, args, { encoding: 'utf8', ...opts });
const py = args => spawnSync('python3', ['-I', ...args], { encoding: 'utf8' });
const target = () => { const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-app-')); return { repo, dir: path.join(repo, 'web/ui') }; };

test('sync copies dist, fonts and both checkers, and writes VERSION with checksums', () => {
  assert.equal(node([path.join(root, 'scripts/build.mjs')]).status, 0);
  const { repo, dir } = target();
  const r = node([path.join(root, 'scripts/sync.mjs'), repo, '--dir', 'web/ui']);
  assert.equal(r.status, 0, r.stderr);
  const v = JSON.parse(fs.readFileSync(path.join(dir, 'VERSION'), 'utf8'));
  assert.equal(v.version, JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'))).version);
  for (const f of ['tokens.css', 'components.css', 'tools.js', 'tools.h', 'tokens.h', 'tokens.json', 'verify.mjs', 'verify.py', 'archivo-latin-ui.woff2', 'OFL-Archivo.txt']) {
    assert.ok(fs.existsSync(path.join(dir, f)), f);
  }
  assert.match(v.files['tokens.css'], /^[0-9a-f]{64}$/);
  assert.equal(node([path.join(dir, 'verify.mjs'), dir]).status, 0);
  assert.equal(py([path.join(dir, 'verify.py'), dir]).status, 0);
});

test('a hand edit to a copied file fails both checkers, naming the file', () => {
  const { repo, dir } = target();
  assert.equal(node([path.join(root, 'scripts/sync.mjs'), repo, '--dir', 'web/ui']).status, 0);
  fs.appendFileSync(path.join(dir, 'tokens.css'), ':root{--ui-accent:red}');
  const a = node([path.join(dir, 'verify.mjs'), dir]);
  const b = py([path.join(dir, 'verify.py'), dir]);
  assert.equal(a.status, 1); assert.match(a.stderr, /tokens\.css/);
  assert.equal(b.status, 1); assert.match(b.stderr, /tokens\.css/);
  fs.rmSync(path.join(dir, 'components.css'));
  assert.match(node([path.join(dir, 'verify.mjs'), dir]).stderr, /components\.css/);
});

test('sync refuses to replace a newer copy', () => {
  const { repo, dir } = target();
  assert.equal(node([path.join(root, 'scripts/sync.mjs'), repo, '--dir', 'web/ui']).status, 0);
  const v = JSON.parse(fs.readFileSync(path.join(dir, 'VERSION'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'VERSION'), JSON.stringify({ ...v, version: '9.0.0' }));
  const r = node([path.join(root, 'scripts/sync.mjs'), repo, '--dir', 'web/ui']);
  assert.equal(r.status, 2); assert.match(r.stderr, /9\.0\.0/);
});

test('--status lists each copy against this version', () => {
  const { repo } = target();
  node([path.join(root, 'scripts/sync.mjs'), repo, '--dir', 'web/ui']);
  const r = node([path.join(root, 'scripts/sync.mjs'), '--status', `${repo}:web/ui`, `${repo}:missing`]);
  assert.equal(r.status, 0, r.stderr);
  const v = JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'), 'utf8')).version.replace(/\./g, '\\.');
  assert.match(r.stdout, new RegExp(`web/ui\\s+${v}\\s+${v}`));
  assert.match(r.stdout, new RegExp(`missing\\s+none\\s+${v}`));
});

test('a file the last copy shipped and this version does not is removed; other app files stay', () => {
  const { repo, dir } = target();
  assert.equal(node([path.join(root, 'scripts/sync.mjs'), repo, '--dir', 'web/ui']).status, 0);
  const v = JSON.parse(fs.readFileSync(path.join(dir, 'VERSION'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'figtree-latin-wght-normal.woff2'), 'old font');
  fs.writeFileSync(path.join(dir, 'app-own.css'), 'mine');
  v.files['figtree-latin-wght-normal.woff2'] = '0'.repeat(64);
  v.files['../escape.txt'] = '0'.repeat(64);
  v.version = '1.0.0';
  fs.writeFileSync(path.join(dir, 'VERSION'), JSON.stringify(v));
  fs.writeFileSync(path.join(repo, 'web/escape.txt'), 'outside');
  const r = node([path.join(root, 'scripts/sync.mjs'), repo, '--dir', 'web/ui']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /removed figtree-latin-wght-normal\.woff2/);
  assert.ok(!fs.existsSync(path.join(dir, 'figtree-latin-wght-normal.woff2')));
  assert.ok(fs.existsSync(path.join(dir, 'app-own.css')), 'files the kit never listed are left alone');
  assert.ok(fs.existsSync(path.join(repo, 'web/escape.txt')), 'a listed name with a path is never followed');
  assert.equal(node([path.join(dir, 'verify.mjs'), dir]).status, 0);
});

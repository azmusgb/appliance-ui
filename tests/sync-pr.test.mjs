import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrBody, planSync } from '../scripts/lib/sync-pr.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = args => spawnSync(process.execPath, args, { encoding: 'utf8' });
const sync = path.join(root, 'scripts/sync.mjs');
const entries = [
  { version: '2.8.0', skip: true, note: '' },
  { version: '2.9.0', skip: false, note: 'rename `Row` to `ListRow` in your screens' },
];
const pi = { name: 'pi-hub', repo: 'azmusgb/pi-hub', folder: 'hub/static/ui', check: 'python3 -I hub/static/ui/verify.py hub/static/ui' };

test('buildPrBody lists the releases in order and keeps a needs-change note verbatim', () => {
  const body = buildPrBody({ name: 'pi-hub', from: '2.7.0', to: '2.9.0', entries });
  assert.match(body, /^#+ .*pi-hub.*2\.7\.0.*2\.9\.0/m);
  assert.ok(body.indexOf('- 2.8.0') < body.indexOf('- 2.9.0'));
  assert.match(body, /2\.8\.0.*skippable/);
  assert.ok(body.includes('rename `Row` to `ListRow` in your screens'));
  assert.match(body, /2\.9\.0.*needs consumer change/);
});

test('buildPrBody marks a needs-change release for the other kit as not this consumer\'s, and keeps its own and all-kit ones', () => {
  const mixed = [
    { version: '2.13.0', skip: false, note: 'new firmware font', audience: 'display' },
    { version: '2.14.0', skip: false, note: 'rename `Row`', audience: 'web' },
    { version: '2.15.0', skip: false, note: 'new token', audience: 'all' },
  ];
  const web = buildPrBody({ name: 'pi-hub', from: '2.12.0', to: '2.15.0', entries: mixed, kit: 'web' });
  assert.match(web, /2\.13\.0: display kit only, nothing for this consumer to change/);
  assert.doesNotMatch(web, /2\.13\.0.*needs consumer change/);
  assert.match(web, /2\.14\.0: needs consumer change: rename `Row`/);
  assert.match(web, /2\.15\.0: needs consumer change: new token/);
  const none = buildPrBody({ name: 'x', from: '2.12.0', to: '2.15.0', entries: mixed });
  assert.match(none, /2\.13\.0: needs consumer change/);
});

test('buildPrBody says an unclassified release is unclassified, and ends with the Claude Code line', () => {
  const body = buildPrBody({ name: 'x', from: '2.1.0', to: '2.2.0', entries: [{ version: '2.2.0', skip: null, note: '' }] });
  assert.match(body, /2\.2\.0.*unclassified/);
  assert.ok(body.trimEnd().endsWith('🤖 Generated with [Claude Code](https://claude.com/claude-code)'));
});

test('the "Check: not run on the Mac" line appears only when the consumer has no check', () => {
  const none = buildPrBody({ name: 'bambuhelper-smart-display', from: '2.7.0', to: '2.9.0', entries, check: null });
  assert.match(none, /^Check: not run on the Mac$/m);
  const some = buildPrBody({ name: 'pi-hub', from: '2.7.0', to: '2.9.0', entries, check: pi.check });
  assert.doesNotMatch(some, /not run on the Mac/);
});

test('planSync names the branch kit-sync-<to>, orders the steps, and never merges or pushes main', () => {
  const p = planSync(pi, '2.7.0', '2.15.0');
  assert.equal(p.branch, 'kit-sync-2.15.0');
  const joined = p.steps.join('\n');
  const at = s => p.steps.findIndex(x => x.includes(s));
  assert.ok(at('wt new pi-hub kit-sync-2.15.0') === 0);
  assert.ok(at('sync.mjs') > at('wt new') && at('verify.py') > at('sync.mjs') && at(' commit -m') > at('verify.py'));
  assert.ok(at(' push -u origin kit-sync-2.15.0') > at(' commit -m') && at('gh pr create --base main') > at('git push'));
  assert.doesNotMatch(joined, /merge/);
  assert.doesNotMatch(joined, /push origin main/);
  assert.match(joined, /Co-Authored-By: Claude Sonnet 5\.5 <noreply@anthropic\.com>/);
});

test('planSync without a check says so instead of a check step', () => {
  const p = planSync({ ...pi, check: null }, null, '2.15.0');
  assert.ok(p.steps.some(s => /Check: not run on the Mac/.test(s)));
  assert.ok(!p.steps.some(s => /verify\./.test(s)));
});

test('planSync rejects a name or version that would be unsafe in a branch or command', () => {
  assert.throws(() => planSync({ ...pi, name: 'a b; rm -rf /' }, '2.7.0', '2.15.0'), /name/);
  assert.throws(() => planSync(pi, '2.7.0', '2.15.0; x'), /version/);
  assert.throws(() => planSync(pi, 'latest', '2.15.0'), /version/);
  assert.throws(() => planSync({ ...pi, folder: '../x' }, '2.7.0', '2.15.0'), /folder/);
});

const tmpRepo = (name = 'ui-app') => fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
const listing = dir => fs.readdirSync(dir, { recursive: true }).sort();

test('sync.mjs --pr --dry-run prints the steps, exits 0 and leaves the repo unchanged', () => {
  assert.equal(node([path.join(root, 'scripts/build.mjs')]).status, 0);
  const repo = tmpRepo();
  const before = listing(repo);
  const r = node([sync, repo, '--dir', 'web/ui', '--pr', '--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /wt new .* kit-sync-\d+\.\d+\.\d+/);
  assert.match(r.stdout, /<worktree>/);
  assert.match(r.stdout, /gh pr create --base main/);
  assert.doesNotMatch(r.stdout, /merge|push origin main/);
  assert.deepEqual(listing(repo), before);
});

test('--dry-run without --pr is a usage error', () => {
  const repo = tmpRepo();
  const r = node([sync, repo, '--dir', 'web/ui', '--dry-run']);
  assert.equal(r.status, 64);
  assert.deepEqual(listing(repo), []);
});

test('--pr refuses a repo basename that is not safe, and a newer copy (exit 2)', () => {
  const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'x-'));
  const odd = path.join(bad, 'my repo;x');
  fs.mkdirSync(odd);
  assert.equal(node([sync, odd, '--dir', 'web/ui', '--pr', '--dry-run']).status, 64);
  const repo = tmpRepo();
  fs.mkdirSync(path.join(repo, 'web/ui'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'web/ui/VERSION'), JSON.stringify({ version: '9.0.0', files: {} }));
  const r = node([sync, repo, '--dir', 'web/ui', '--pr', '--dry-run']);
  assert.equal(r.status, 2); assert.match(r.stderr, /9\.0\.0/);
});

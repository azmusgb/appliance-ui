import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseChangelog, releasesBetween } from '../scripts/lib/changelog.mjs';

const fixture = `<!-- classified-from: 2.7.0 -->
# Changelog

## 2.9.0 — needs consumer change: use the container layouts
Type is rem now.

## 2.8.0 — skippable
A new phrase.
`;

const audiences = `<!-- classified-from: 2.7.0 -->
## 2.12.0 — needs consumer change (display): drop Back
## 2.11.0 — needs consumer change (web): use containers
## 2.10.0 — needs consumer change: everyone rewires
## 2.9.0 — needs consumer change (web)
## 2.8.0 — skippable
`;

test('parseChangelog reads each heading into skip and note', () => {
  const { entries, classifiedFrom } = parseChangelog(fixture);
  assert.equal(classifiedFrom, '2.7.0');
  assert.deepEqual([...entries], [
    ['2.9.0', { skip: false, note: 'use the container layouts', audience: 'all' }],
    ['2.8.0', { skip: true, note: '', audience: 'all' }],
  ]);
});

test('a needs-change heading may name its audience: (web), (display), or none meaning everyone', () => {
  const { entries } = parseChangelog(audiences);
  assert.deepEqual([...entries].map(([v, e]) => [v, e.audience, e.note]), [
    ['2.12.0', 'display', 'drop Back'],
    ['2.11.0', 'web', 'use containers'],
    ['2.10.0', 'all', 'everyone rewires'],
    ['2.9.0', 'web', ''],
    ['2.8.0', 'all', ''],
  ]);
});

test('an unknown audience throws, naming the version', () => {
  assert.throws(() => parseChangelog('<!-- classified-from: 2.7.0 -->\n## 2.8.0 — needs consumer change (tv): x\n'), /2\.8\.0/);
});

test('releasesBetween is exclusive of from, inclusive of to, ascending', () => {
  const log = parseChangelog(fixture);
  assert.deepEqual(releasesBetween(log, '2.7.0', '2.9.0').map(r => r.version), ['2.8.0', '2.9.0']);
  assert.deepEqual(releasesBetween(log, '2.8.0', '2.9.0').map(r => r.version), ['2.9.0']);
  assert.deepEqual(releasesBetween(log, '2.9.0', '2.9.0'), []);
});

test('a version past the newest entry is unclassified (skip null)', () => {
  const log = parseChangelog(fixture);
  assert.deepEqual(releasesBetween(log, '2.8.0', '2.10.0'), [
    { version: '2.9.0', skip: false, note: 'use the container layouts', audience: 'all' },
    { version: '2.10.0', skip: null, note: '', audience: 'all' },
  ]);
});

test('a from below classified-from is unclassified (skip null)', () => {
  const log = parseChangelog(fixture);
  assert.deepEqual(releasesBetween(log, '2.5.0', '2.8.0'), [
    { version: '2.5.0', skip: null, note: '', audience: 'all' },
    { version: '2.8.0', skip: true, note: '', audience: 'all' },
  ]);
});

test('a heading with neither verdict throws, naming the version', () => {
  assert.throws(() => parseChangelog('<!-- classified-from: 2.7.0 -->\n## 2.8.0 — maybe\n'), /2\.8\.0/);
});

test('a missing classified-from marker or a bad version throws', () => {
  assert.throws(() => parseChangelog('## 2.8.0 — skippable\n'), /classified-from/);
  assert.throws(() => parseChangelog('<!-- classified-from: 2.7.0 -->\n## 2.x — skippable\n'), /2\.x/);
  assert.throws(() => releasesBetween(parseChangelog(fixture), 'nope', '2.9.0'), /nope/);
});

test('the real CHANGELOG.md has an entry for every 2.x.0 from 2.8.0 to the current kit version', () => {
  const { entries, classifiedFrom } = parseChangelog(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'));
  const { version } = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
  assert.equal(classifiedFrom, '2.7.0');
  const minor = Number(version.split('.')[1]);
  for (let m = 8; m <= minor; m++) assert.ok(entries.has(`2.${m}.0`), `no entry for 2.${m}.0`);
  assert.ok(entries.has(version), `no entry for ${version}`);
});

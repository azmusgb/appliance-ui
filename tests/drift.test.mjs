import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChangelog } from '../scripts/lib/changelog.mjs';
import { classifyCopy } from '../scripts/lib/drift.mjs';

const log = parseChangelog(`<!-- classified-from: 2.7.0 -->
# Changelog

## 2.11.0 — needs consumer change (display): drop level-one Back
## 2.10.0 — skippable
## 2.9.0 — needs consumer change (web): use the container layouts
## 2.8.0 — skippable
`);

const base = { copyVersion: '2.10.0', kitVersion: '2.10.0', kit: 'web', modified: [], unreachable: false };

const rows = [
  ['unreachable', { unreachable: true, copyVersion: null }, 'unreachable', 0, []],
  ['unknown copy (no VERSION)', { copyVersion: null }, 'unknown-copy', 1, ['2.10.0']],
  ['unknown copy (not semver)', { copyVersion: 'banana' }, 'unknown-copy', 1, ['banana', '2.10.0']],
  ['modified', { copyVersion: '2.9.0', modified: ['a.css', 'b.js'] }, 'modified', 1, ['2.9.0', '2.10.0', 'a.css', 'b.js']],
  ['modified beats current', { modified: ['a.css'] }, 'modified', 1, ['a.css']],
  ['current', {}, 'current', 0, ['2.10.0']],
  ['ahead', { copyVersion: '2.11.0' }, 'ahead', 0, ['2.11.0', '2.10.0']],
  ['behind, needs change', { copyVersion: '2.8.0' }, 'behind-needs-change', 1, ['2.8.0', '2.10.0', 'use the container layouts']],
  ['behind, skippable', { copyVersion: '2.9.0' }, 'behind-skippable', 0, ['2.9.0', '2.10.0']],
  ['behind, unclassified', { copyVersion: '2.9.0', kitVersion: '2.12.0' }, 'unclassified', 0, ['2.9.0', '2.12.0']],
  ['behind below classified-from', { copyVersion: '2.6.0' }, 'behind-needs-change', 1, ['2.6.0', '2.10.0']],
  ['needs change beats unclassified', { copyVersion: '2.8.0', kitVersion: '2.12.0' }, 'behind-needs-change', 1, ['2.8.0', '2.12.0', 'use the container layouts']],
  ['display-only release is skippable for a web consumer', { copyVersion: '2.10.0', kitVersion: '2.11.0' }, 'behind-skippable', 0, ['2.10.0', '2.11.0']],
  ['display-only release needs a change for the display', { copyVersion: '2.10.0', kitVersion: '2.11.0', kit: 'display' }, 'behind-needs-change', 1, ['2.11.0', 'drop level-one Back']],
  ['web-only release is skippable for the display', { copyVersion: '2.8.0', kitVersion: '2.10.0', kit: 'display' }, 'behind-skippable', 0, ['2.8.0', '2.10.0']],
  ['no kit named: nothing is skipped by audience', { copyVersion: '2.10.0', kitVersion: '2.11.0', kit: undefined }, 'behind-needs-change', 1, ['2.11.0']],
  ['every needs-change release is named, not only the first', { copyVersion: '2.8.0', kitVersion: '2.11.0', kit: undefined }, 'behind-needs-change', 1, ['2.9.0, 2.11.0 need a consumer change', 'first: use the container layouts']],
];

for (const [name, over, state, exit, parts] of rows) {
  test(`classifyCopy: ${name}`, () => {
    const r = classifyCopy({ ...base, ...over }, log);
    assert.equal(r.state, state);
    assert.equal(r.exit, exit);
    for (const p of parts) assert.ok(r.line.includes(p), `"${r.line}" should include "${p}"`);
  });
}

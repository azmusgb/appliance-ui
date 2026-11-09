import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChangelog } from '../scripts/lib/changelog.mjs';
import { classifyCopy } from '../scripts/lib/drift.mjs';

const log = parseChangelog(`<!-- classified-from: 2.7.0 -->
# Changelog

## 2.10.0 — skippable
## 2.9.0 — needs consumer change: use the container layouts
## 2.8.0 — skippable
`);

const base = { copyVersion: '2.10.0', kitVersion: '2.10.0', modified: [], unreachable: false };

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
  ['behind, unclassified', { copyVersion: '2.9.0', kitVersion: '2.11.0' }, 'unclassified', 0, ['2.9.0', '2.11.0']],
  ['behind below classified-from', { copyVersion: '2.6.0' }, 'behind-needs-change', 1, ['2.6.0', '2.10.0']],
  ['needs change beats unclassified', { copyVersion: '2.8.0', kitVersion: '2.11.0' }, 'behind-needs-change', 1, ['2.8.0', '2.11.0', 'use the container layouts']],
];

for (const [name, over, state, exit, parts] of rows) {
  test(`classifyCopy: ${name}`, () => {
    const r = classifyCopy({ ...base, ...over }, log);
    assert.equal(r.state, state);
    assert.equal(r.exit, exit);
    for (const p of parts) assert.ok(r.line.includes(p), `"${r.line}" should include "${p}"`);
  });
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVersion, compareVersions, newer } from '../scripts/lib/versions.mjs';

test('compareVersions orders numerically, not as text', () => {
  assert.equal(compareVersions('2.10.0', '2.9.0'), 1);
  assert.equal(compareVersions('2.7.0', '2.7.0'), 0);
  assert.equal(compareVersions('2.7.0', '2.15.0'), -1);
});

test('parseVersion accepts only major.minor.patch', () => {
  assert.deepEqual(parseVersion('2.7.0'), [2, 7, 0]);
  assert.equal(parseVersion('2.x.0'), null);
  assert.equal(parseVersion(undefined), null);
});

test('newer is false when either side is not a version', () => {
  assert.equal(newer('2.10.0', '2.9.0'), true);
  assert.equal(newer('2.9.0', '2.10.0'), false);
  assert.equal(newer('2.x.0', '2.9.0'), false);
});

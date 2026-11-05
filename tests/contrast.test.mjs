import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contrastReport, failures } from '../scripts/lib/contrast-report.mjs';

const t = JSON.parse(fs.readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));

test('docs/contrast.md is the measured table for the current tokens (npm run contrast)', () => {
  assert.equal(fs.readFileSync(new URL('../docs/contrast.md', import.meta.url), 'utf8'), contrastReport(t));
});

test('every text pair is at least 4.5:1 and every non-text indicator at least 3:1, in both modes', () => {
  assert.deepEqual(failures(t), []);
});

test('a non-text indicator below 3:1 is caught', () => {
  const dim = structuredClone(t);
  dim.color.ok.light = '#c9d6c2';
  assert.ok(failures(dim).some((f) => f.startsWith('light ok lamp dot on bg')));
});

test('the contract names every token it rules on, and the measured table', () => {
  const contract = fs.readFileSync(new URL('../DESIGN.md', import.meta.url), 'utf8');
  for (const name of Object.keys(t.color)) assert.ok(contract.includes(`\`${name}\``), `DESIGN.md doesn't name ${name}`);
  assert.ok(contract.includes('docs/contrast.md'));
});

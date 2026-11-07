import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { contrastReport, failures } from '../scripts/lib/contrast-report.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

// K2 of the display-kit spec: the display column is measured on the RGB565 values the panel shows.
test('panel() is the RGB565 the panel shows: truncated to 5/6/5 as tokens.h packs it, expanded by bit replication', async () => {
  const { panel, rgb565 } = await import('../scripts/lib/color.mjs');
  assert.equal(panel('#000000'), '#000000');
  assert.equal(panel('#ffffff'), '#ffffff');
  assert.equal(panel('#0a111c'), '#081018');  // 0x0883: r 1, g 4, b 3 → 8, 16, 24 (bit replication)
  assert.equal(panel('#f8fcf8'), '#ffffff');
  // Whatever the colour, the panel shows what rgb565 packs: the same 16 bits.
  for (const hex of ['#3fc1c9', '#8bcf6b', '#fca4ad', '#123456']) assert.equal(rgb565(panel(hex)), rgb565(hex));
});

test('docs/contrast.md has a display column, and every shipped pair holds its minimum after rounding to RGB565', () => {
  const md = fs.readFileSync(new URL('../docs/contrast.md', import.meta.url), 'utf8');
  assert.match(md, /\| Use \| Pair \| Needs \| Dark \| Light \| Display \(RGB565\) \|/);
  assert.deepEqual(failures(t).filter((f) => f.startsWith('display')), []);
  assert.doesNotMatch(md, /✗/);
});

test('a pair that passes on the 24-bit value but drops under after RGB565 is caught, and the build refuses it', () => {
  const dim = structuredClone(t);
  dim.color.unknown.dark = '#aeb6b0';
  assert.deepEqual(failures(dim).filter((f) => !f.startsWith('display')), []);
  assert.deepEqual(failures(dim), ['display unknown chip (18% tint) on surface2: 4.48 < 4.5']);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-display-'));
  fs.writeFileSync(path.join(dir, 'tokens.json'), JSON.stringify(dim));
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs'), '--tokens', path.join(dir, 'tokens.json'), '--out', path.join(dir, 'dist')], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /display unknown chip \(18% tint\) on surface2: 4\.48 < 4\.5/);
});

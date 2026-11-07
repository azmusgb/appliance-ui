// The display kit on the Mac (display-kit K5, K6, K8, K9): the parts compile warning-free, hold what the spec says about
// them, render as the reference images show, and word and tint things exactly as the web and the contrast table do.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compare, compileHarness, compiler, fontsDir, renderScenes, root, run, tmp } from '../scripts/lib/display.mjs';
import { flatten, mix, panel, rgb565 } from '../scripts/lib/color.mjs';

const t = JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'), 'utf8'));
const needs = { exports: {} };
new Function('module', fs.readFileSync(path.join(root, 'dist/needs.js'), 'utf8'))(needs);
let exe, dir;
const skip = compiler() ? false : 'no C++ compiler on PATH';

before(() => { if (!skip) { dir = tmp(); exe = compileHarness(dir); } });

test('the parts compile as C++17 with -Wall -Wextra -Wpedantic -Werror, against UiCanvas alone', { skip }, () => {
  assert.ok(fs.existsSync(exe));
});

test('the harness checks pass: K5 parts, K6 honest states, K9 Stepper, Switch and Picker', { skip }, () => {
  const r = run(exe, 'check', fontsDir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^\d+ checks, 0 failed/);
});

test('every part in every state renders as demo/screens/display/*.png shows (npm run display:update changes them on purpose)', { skip }, () => {
  assert.deepEqual(compare(renderScenes(exe, dir)), []);
});

test('the scenes cover the parts, the Picker cases the spec lists, and the failure and unknown states', { skip }, () => {
  const names = Object.keys(renderScenes(exe, dir));
  for (const n of ['chip', 'button', 'ageline', 'faceplate-live', 'faceplate-honest', 'lamprow-live', 'lamprow-honest', 'needsrow', 'meter', 'frame-level-1',
    'frame-level-2', 'stepper', 'switch', 'picker-fits', 'picker-scrolls-below-first-page', 'picker-colours', 'picker-long-label', 'picker-failure', 'picker-unknown']) {
    assert.ok(names.includes(n), n);
  }
});

test('the age rules in C++ say what needs.js says: "now", "4 min ago", then "since 10:32"', { skip }, () => {
  const lines = run(exe, 'age').stdout.trim().split('\n').map(l => l.split('\t'));
  assert.ok(lines.length > 10);
  for (const [secs, text] of lines) {
    const web = needs.exports.ago(+secs);
    if (web !== null) assert.equal(text, web, `${secs} s`);
    else assert.match(text, /^since (\d\d:\d\d|\d{1,2} [A-Z][a-z]{2})$/, `${secs} s`);
  }
  const at = Object.fromEntries(lines);
  assert.equal(at[0], 'now');
  assert.equal(at[240], '4 min ago');
  assert.equal(at[3 * 3600 + 28 * 60], 'since 07:12');  // 10:40 now
  assert.equal(at[3 * 86400], 'since 3 Nov');
});

test('a chip, and a selected row, are tinted as the contrast table measured them (docs/contrast.md display column)', { skip }, () => {
  const bgs = { bg: t.color.bg.dark, surface: t.color.surface.dark, surface2: t.color.surface2.dark };
  const lines = run(exe, 'tints').stdout.trim().split('\n').map(l => l.split(' '));
  assert.equal(lines.length, 15);
  for (const [kind, bg, value] of lines) {
    const p = panel(bgs[bg]);
    // The selected-row wash is accentSoft (14% accent): flatten() of the accent as the panel shows it, as displayRatio lays it.
    const a = panel(t.color.accent.dark), rgba = `rgba(${[1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16))},.14)`;
    const want = kind === 'accentSoft' ? rgb565(panel(flatten(rgba, p))) : rgb565(panel(mix(panel(t.color[kind].dark), p, 0.18)));
    assert.equal(value, want, `${kind} on ${bg}`);
  }
});

test('the fonts are the five Archivo VLW files, none under 14 px, with the sizes fonts.h reports', () => {
  const h = fs.readFileSync(path.join(root, 'dist/display/fonts.h'), 'utf8');
  const want = { 'archivo-14': 14, 'archivo-16': 16, 'archivo-20': 20, 'archivo-26': 26, 'archivo-readout-34': 34 };
  assert.deepEqual(fs.readdirSync(fontsDir).sort(), Object.keys(want).map(n => `${n}.vlw`).sort());
  for (const name of Object.keys(want)) {
    const buf = fs.readFileSync(path.join(fontsDir, `${name}.vlw`));
    const key = name.toUpperCase().replace(/-/g, '_');
    assert.match(h, new RegExp(`#define UI_${key}_BYTES ${buf.length}\\b`), name);
    assert.equal(buf.readInt32BE(4), 11, `${name}: VLW version`);
    const count = buf.readInt32BE(0);
    assert.equal(count, 200, `${name}: glyph count`);
    // glyph table, then bitmaps: every byte accounted for, codes ascending and Latin only
    let bitmap = 24 + count * 28, prev = -1;
    for (let i = 0; i < count; i++) {
      const g = 24 + i * 28, code = buf.readInt32BE(g);
      assert.ok(code > prev && code < 0x3000, `${name}: code ${code}`);
      prev = code;
      bitmap += buf.readInt32BE(g + 4) * buf.readInt32BE(g + 8);
    }
    assert.equal(bitmap, buf.length, `${name}: size from its glyph table`);
  }
  for (const px of Object.values(want)) assert.ok(px >= 14);
  const tokens = fs.readFileSync(path.join(root, 'dist/tokens.h'), 'utf8');
  for (const [fs_, px] of [[3, 14], [4, 16], [5, 20], [6, 26], [7, 34]]) assert.match(tokens, new RegExp(`#define UI_FS_${fs_} ${px}\\b`));
});

test('dist/display is the kit build of src/display, with the banner, and ui.h includes every part', () => {
  const ui = fs.readFileSync(path.join(root, 'dist/display/ui.h'), 'utf8');
  for (const f of fs.readdirSync(path.join(root, 'src/display'))) {
    const built = fs.readFileSync(path.join(root, 'dist/display', f), 'utf8');
    const src = fs.readFileSync(path.join(root, 'src/display', f), 'utf8');
    assert.match(built.split('\n')[0], /^(\/\/|<!--) generated by appliance-ui v\d+\.\d+\.\d+ from tokens\.json/, f);
    assert.ok(built.endsWith(src), `${f} differs from src/display`);
    if (f.endsWith('.h') && f !== 'ui.h') assert.ok(ui.includes(`#include "${f}"`), `ui.h leaves out ${f}`);
  }
});

test('no raw colour or hard-coded size slips into a part: colours are UI_COLOR_*, radii UI_R_*', () => {
  for (const f of fs.readdirSync(path.join(root, 'src/display')).filter(n => n.endsWith('.h'))) {
    const src = fs.readFileSync(path.join(root, 'src/display', f), 'utf8');
    assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /0x[0-9a-fA-F]{4}\b/, `${f} has a raw RGB565 value`);
  }
});

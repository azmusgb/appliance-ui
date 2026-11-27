import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// 2.35.1: one idiom for "selected" across chips and tabs, a spaced provenance group, and a gap above Decisions.
test('a pressed or current chip takes the accent wash, as a selected tab does', () => {
  const css = read('dist/components.css');
  const chip = css.match(/\.ui-chips :is\(a,button\):is\(\[aria-pressed="true"\][^{]*\)\{([^}]*)\}/);
  assert.ok(chip, 'the selected-chip rule exists');
  assert.match(chip[1], /background:var\(--ui-accent-soft\)/);
  assert.match(chip[1], /border-color:var\(--ui-accent\)/);
  assert.match(chip[1], /color:var\(--ui-accent-text\)/);
  assert.doesNotMatch(chip[1], /var\(--ui-bg\)/, 'no inverted fill');
  const tab = css.match(/\.ui-tabs>:is\(button,a\):is\(\[aria-selected="true"\][^{]*\)\{([^}]*)\}/);
  assert.ok(tab && /background:var\(--ui-accent-soft\)/.test(tab[1]) && /color:var\(--ui-accent-text\)/.test(tab[1]), 'tabs keep the same wash');
});

test('ui-provs keeps labels apart: the gap between labels is wider than the mark-to-words gap', () => {
  const css = read('dist/components.css');
  const g = css.match(/\.ui-provs\{[^}]*display:flex;flex-wrap:wrap;gap:calc\(var\(--ui-space\)\*1\) calc\(var\(--ui-space\)\*(\d+(?:\.\d+)?)\)/);
  assert.ok(g, 'ui-provs is a wrapping flex group');
  const markGap = Number(css.match(/\.ui-prov\{[^}]*gap:calc\(var\(--ui-space\)\*(\d+(?:\.\d+)?)\)/)[1]);
  assert.ok(Number(g[1]) >= markGap * 2, 'labels sit at least twice as far from each other as a mark from its words');
  assert.match(css, /\.ui-provs\{[^}]*margin:calc\(var\(--ui-space\)\*3\) 0 0/, 'a group does not tuck under the block above it');
});

test('the Decisions group is set off from the Needs list above it', () => {
  const css = read('dist/needs.css');
  assert.match(css, /\.ui-decisions\{[^}]*margin-block-start:calc\(var\(--ui-space\)\*6\)/);
});

// 2.35.2: disabled primary, medium readout unit, empty state in a card.
test('2.35.2 state rules use measured pairs', () => {
  const css = fs.readFileSync(path.join(root, 'dist/components.css'), 'utf8');
  assert.match(css, /\.ui-btn--primary:is\(:disabled,\[aria-disabled="true"\]\)\{background:var\(--ui-surface-2\);color:var\(--ui-muted\);opacity:1\}/);
  assert.match(css, /\.ui-readout--md \.ui-readout__unit\{font-size:var\(--ui-fs-3\)\}/);
  assert.match(css, /\.ui-card \.ui-empty\{padding-block:calc\(var\(--ui-space\)\*4\)\}/);
});

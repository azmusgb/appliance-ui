// The primary button's hover fill is read from the stylesheet itself, so a CSS edit that brings back a low-contrast
// mix fails here, not only a token change (docs/contrast.md measures the same mix in its "hovered primary" row).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, mix } from '../scripts/lib/color.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const t = JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'src/components.css'), 'utf8');
const token = name => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

test('the hovered primary button keeps its label at 4.5:1 in both themes, as the stylesheet lays it', () => {
  const rule = css.match(/\.ui-btn--primary:not\([^)]*\):hover\{background:color-mix\(in srgb,var\(--ui-([a-z0-9-]+)\) (\d+)%,var\(--ui-([a-z0-9-]+)\)\)\}/);
  assert.ok(rule, 'src/components.css has a .ui-btn--primary hover rule of the form color-mix(in srgb,var(--ui-a) N%,var(--ui-b))');
  const [, over, pct, under] = rule;
  assert.equal(token(under), 'accent', 'the hover is mixed into the primary fill');
  for (const mode of ['dark', 'light']) {
    const fill = mix(t.color[token(over)][mode], t.color.accent[mode], Number(pct) / 100);
    const r = contrast(t.color.onAccent[mode], fill);
    assert.ok(r >= 4.5, `${mode}: onAccent on the hovered primary is ${r.toFixed(2)}:1`);
  }
});

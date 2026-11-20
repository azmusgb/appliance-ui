import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('components.css defines conversation-first chat components (Amendment A30 Phase 2)', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-chat-comp-'));
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs'), '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const css = fs.readFileSync(path.join(out, 'components.css'), 'utf8');

  // Verify chat classes are present
  const chatClasses = [
    'ui-chat-thread',
    'ui-chat-msg',
    'ui-chat-msg--user',
    'ui-chat-msg--assistant',
    'ui-chat-msg--streaming',
    'ui-chat-composer',
    'ui-chat-composer__input',
    'ui-chat-composer__action',
    'ui-disclosure',
    'ui-disclosure__summary',
    'ui-disclosure__body',
    'ui-result-card',
    'ui-result-card--loading',
    'ui-result-card--error',
    'ui-result-card--disabled'
  ];

  for (const cls of chatClasses) {
    assert.match(css, new RegExp(`\\.${cls}[\\s{.,:>]`), `Missing expected chat class .${cls}`);
  }

  // Verify touch target compliance (44px)
  assert.match(css, /@media \(pointer:coarse\)\{\.ui-chat-composer__action\{min-height:44px/,
    'composer action button is at least 44px on touch screens');

  // Verify no literal colours in components.css
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b/i, 'no literal hex colours');
  assert.doesNotMatch(code, /\brgba?\(/i, 'no literal rgb colours');
});

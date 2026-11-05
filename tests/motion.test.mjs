import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 2.5.0: a reading that changes counts to its new value once, briefly (Number Ticker, calm): never with reduced motion,
// never from a value that isn't a number, and a newer value replaces one still counting.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mod = { exports: {} };
new Function('module', fs.readFileSync(path.join(root, 'src/motion.js'), 'utf8'))(mod);
const { countTo } = mod.exports;

function world({ reduce = false } = {}) {
  let t = 0; const queue = [];
  const env = {
    now: () => t,
    frame: (fn) => { queue.push(fn); return queue.length; },
    reduce: () => reduce,
    run(ms) { const end = t + ms; while (queue.length && t < end) { t += 16; queue.splice(0).forEach((fn) => fn(t)); } },
  };
  return env;
}
const el = (text = '0') => ({ textContent: text, dataset: {} });

test('it counts from the shown number to the new one and ends exactly on it', () => {
  const env = world(), e = el('10');
  countTo(e, 110, { duration: 400, env });
  env.run(100);
  const mid = Number(e.textContent);
  assert.ok(mid > 10 && mid < 110, `mid ${mid}`);
  env.run(1000);
  assert.equal(e.textContent, '110');
});

test('with reduced motion, or from text that is not a number, the value is set at once', () => {
  const r = world({ reduce: true }), a = el('3');
  countTo(a, 9, { env: r });
  assert.equal(a.textContent, '9');
  const n = world(), b = el('—');
  countTo(b, 42, { env: n });
  assert.equal(b.textContent, '42');
});

test('a newer value replaces one still counting; a bad value is shown as given, never NaN', () => {
  const env = world(), e = el('0');
  countTo(e, 100, { duration: 400, env });
  env.run(50);
  countTo(e, 5, { duration: 400, env });
  env.run(1000);
  assert.equal(e.textContent, '5');
  countTo(e, 'n/a', { env });
  assert.equal(e.textContent, 'n/a');
  assert.doesNotThrow(() => countTo(null, 3, { env }));
});

test('it keeps the format it was given: decimals and a formatter', () => {
  const env = world(), e = el('1.5');
  countTo(e, 2.25, { duration: 100, env, decimals: 2 });
  env.run(500);
  assert.equal(e.textContent, '2.25');
  const f = el('0');
  countTo(f, 1234, { duration: 100, env, format: (v) => Math.round(v).toLocaleString('en-US') });
  env.run(500);
  assert.equal(f.textContent, '1,234');
});

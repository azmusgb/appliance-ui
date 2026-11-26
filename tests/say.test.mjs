// say.js (2.32.0, Pi Hub A37; spec 2026-11-25-spoken-readout-design S2): a page's reading as one or two sentences.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// package.json is "type": "module", so require() would load the classic script as ESM; run it with a CommonJS-style module.
const mod = { exports: {} };
new Function('module', fs.readFileSync(path.join(root, 'dist/say.js'), 'utf8'))(mod);
const { compose, count, duration, PHRASES } = mod.exports;

// A fixed clock: 26 Nov 2026 04:06 UTC. `clock` reads UTC so the expected times don't depend on the machine's zone.
const now = Date.UTC(2026, 10, 26, 4, 6);
const clock = ms => new Date(ms).toISOString().slice(11, 16);
const ago = s => Math.round(s / 60) + ' min ago';
const P = (reading, o = {}) => compose({ page: 'printer', label: 'Printer', reading }, { now, clock, ago, ...o }).sentences;

const fixtures = [
  { state: 'live', status: 'printing', percent: 45.4, job: 'Rift10 pair70', left_min: 684, done_at: now + 684 * 60000 },
  { state: 'live', status: 'printing', percent: 45, job: 'Rift10 pair70 clean x2d with hbs and a much longer name' },
  { state: 'live', status: 'printing', percent: 45, job: 'Clip', left_min: 24 },
  { state: 'live', status: 'printing', percent: 45, job: 'Clip', done_at: now + 60000 },
  { state: 'live', status: 'paused', percent: 12 },
  { state: 'live', status: 'failed', percent: 80 },
  { state: 'live', status: 'idle', finished_at: now - 3600000 },
  { state: 'live', status: 'finished', job: 'A job whose name is long enough to push the sentence past sixty', finished_at: now - 60000, plate_ask: true },
  { state: 'stale', status: 'printing', percent: 45, job: 'A job whose name is long enough to push the sentence past sixty', as_of: now - 720000, source: 'Bambuddy' },
  { state: 'stale', status: 'paused', percent: 45, as_of: now - 720000, source: 'A source with a very long name indeed, far too long to fit' },
  { state: 'unavailable' }, { state: 'unknown' }, { state: 'loading' },
];

test('printing with both estimates', () => assert.deepEqual(
  P(fixtures[0]),
  ['The X2D is 45% through Rift10 pair70.', 'About 11 h 24 min left, done around 15:30.']));

test('printing with one estimate says only that one', () => {
  assert.deepEqual(P(fixtures[2]), ['The X2D is 45% through Clip.', 'About 24 min left.']);
  assert.deepEqual(P(fixtures[3]), ['The X2D is 45% through Clip.', 'Done around 04:07.']);
});

test('long job: a name that would pass 60 characters becomes "its print"', () => assert.equal(
  P(fixtures[1])[0], 'The X2D is 45% through its print.'));

test('a missing or blank job is "its print"', () => {
  for (const job of [undefined, '', '   ', 42, null])
    assert.equal(P({ state: 'live', status: 'printing', percent: 45, job })[0], 'The X2D is 45% through its print.');
});

test('bad percent: the clause is dropped, never NaN% or 0%', () => {
  for (const percent of [NaN, null, -3, 140, '45', undefined, Infinity])
    assert.equal(P({ state: 'live', status: 'printing', percent, job: 'Clip' })[0], 'The X2D is printing Clip.');
  assert.deepEqual(P({ state: 'live', status: 'paused', percent: NaN }), ['The X2D is paused.']);
  assert.deepEqual(P({ state: 'live', status: 'failed', percent: 80 }), ['The X2D stopped at 80%.']);
  assert.equal(P({ state: 'live', status: 'printing', percent: 0, job: 'Clip' })[0], 'The X2D is 0% through Clip.');
});

test('past eta: a finish time that has passed is not an estimate', () => assert.deepEqual(
  P({ state: 'live', status: 'printing', percent: 99, job: 'Clip', done_at: now - 60000 }), ['The X2D is 99% through Clip.']));

test('paused, failed, idle, finished', () => {
  assert.deepEqual(P({ state: 'live', status: 'paused', percent: 12 }), ['The X2D is paused at 12%.']);
  assert.deepEqual(P({ state: 'live', status: 'failed' }), ['The X2D stopped.']);
  assert.deepEqual(P({ state: 'live', status: 'idle', finished_at: now - 3600000 }), ['The X2D is idle.', 'Its last print finished at 03:06.']);
  assert.deepEqual(P({ state: 'live', status: 'idle', finished_at: now - 3 * 86400000 }), ['The X2D is idle.']);
  assert.deepEqual(P({ state: 'live', status: 'idle' }), ['The X2D is idle.']);
  assert.deepEqual(P({ state: 'live', status: 'finished', job: 'Clip', finished_at: now - 60000, plate_ask: true }),
    ['The X2D finished Clip at 04:05.', 'Clear the plate.']);
  assert.deepEqual(P({ state: 'live', status: 'finished', job: 'Clip' }), ['The X2D finished Clip.']);
  assert.deepEqual(P({ state: 'live', status: 'finished', job: 'Clip', plate_ask: 'yes' }), ['The X2D finished Clip.']);
});

test('the reading may name the printer', () => assert.deepEqual(
  P({ state: 'live', status: 'idle', name: 'H2S' }), ['The H2S is idle.']));

test('stale is past tense, with its age and source', () => assert.deepEqual(
  P({ state: 'stale', status: 'printing', percent: 45, job: 'Clip', as_of: now - 720000, source: 'Bambuddy' }),
  ['The X2D was 45% through Clip 12 min ago.', "Bambuddy hasn't answered since 03:54."]));

test('stale never uses the present tense, whatever the status', () => {
  for (const [status, word] of [['idle', 'idle'], ['paused', 'paused'], ['finished', 'finished'], ['failed', 'stopped'], ['printing', 'printing']])
    assert.deepEqual(P({ state: 'stale', status, as_of: now - 720000 }), [`The X2D was ${word} 12 min ago.`]);
  assert.deepEqual(P({ state: 'stale', as_of: now - 720000 }), ["The X2D hasn't reported yet."]);
});

test('stale without age says "earlier", never "now"', () => {
  assert.deepEqual(P({ state: 'stale', status: 'idle' }, { ago: undefined }), ['The X2D was idle earlier.']);
  assert.deepEqual(P({ state: 'stale', status: 'idle' }), ['The X2D was idle earlier.']);
  assert.deepEqual(P({ state: 'stale', status: 'idle', as_of: now - 720000 }, { ago: () => null }), ['The X2D was idle earlier.']);
  assert.deepEqual(P({ state: 'stale', status: 'idle', as_of: 'yesterday' }), ['The X2D was idle earlier.']);
});

test('unavailable, unknown, loading', () => {
  assert.deepEqual(P({ state: 'unavailable' }), ["The X2D isn't answering."]);
  assert.deepEqual(P({ state: 'unknown' }), ["The X2D hasn't reported yet."]);
  assert.deepEqual(P({ state: 'live' }), ["The X2D hasn't reported yet."]);
  assert.deepEqual(P({ state: 'live', status: 'melting' }), ["The X2D hasn't reported yet."]);
  assert.deepEqual(P({ state: 'sideways', status: 'idle' }), ["The X2D hasn't reported yet."]);
  assert.deepEqual(compose({ page: 'printer', label: 'Printer', reading: { state: 'loading' } }, { now }),
    { label: 'Printer', sentences: [], loading: true });
});

test('empty input never throws: an unknown page is empty, a printer with no reading is unknown', () => {
  assert.deepEqual(compose(undefined, { now }), { label: '', sentences: [], loading: false });
  assert.deepEqual(compose({}, { now }), { label: '', sentences: [], loading: false });
  assert.deepEqual(compose({ page: 'nope', label: 'X' }), { label: 'X', sentences: [], loading: false });
  assert.deepEqual(compose({ page: 'printer' }).sentences, ["The X2D hasn't reported yet."]);
  assert.deepEqual(compose({ page: 'printer', reading: null }, null).sentences, ["The X2D hasn't reported yet."]);
});

test('every sentence is at most 60 characters, and the same input gives the same string', () => {
  for (const f of fixtures) {
    const a = P(f), b = P(f);
    assert.deepEqual(a, b);
    assert.ok(a.length <= 2, JSON.stringify(a));
    for (const s of a) assert.ok(s.length <= 60, `${s.length}: ${s}`);
  }
});

test('count and duration', () => {
  assert.deepEqual([1, 2, 12, 13, 100, 0, 1.5, -1, NaN, '3'].map(count), ['One', 'Two', 'Twelve', '13', '100', '', '', '', '', '']);
  assert.deepEqual([24, 60, 684, 59.6, 0, NaN, -5, '24'].map(duration), ['24 min', '1 h', '11 h 24 min', '1 h', '', '', '', '']);
});

test('PHRASES is frozen and every sentence template ends in a full stop', () => {
  assert.ok(Object.isFrozen(PHRASES));
  for (const [k, v] of Object.entries(PHRASES)) if (!['job_generic', 'age_unknown'].includes(k)) assert.ok(v.endsWith('.'), k);
});

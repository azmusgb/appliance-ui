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
  for (const [k, v] of Object.entries(PHRASES)) if (!['job_generic', 'name_generic', 'age_unknown', 'age_moment'].includes(k)) assert.ok(v.endsWith('.'), k);
});

// ---- Home (spec S2; Pi Hub A36 D7, A33) ----
const H = (i, o = {}) => compose({ page: 'home', label: 'Home', ...i }, { now, clock, ago, ...o }).sentences;
const printing = { state: 'live', status: 'printing', percent: 45, job: 'Rift10', done_at: now + 684 * 60000 };

test('home: asks and the printer', () => assert.deepEqual(H({ asks: 1, printer: printing }),
  ['One thing needs you.', 'The X2D is 45% through its print, done about 15:30.']));
test('home: calm', () => assert.deepEqual(H({ asks: 0 }), ['Nothing needs you.']));
test('home: thirteen', () => assert.equal(H({ asks: 13 })[0], '13 things need you.'));
test('home: unreadable list says so and nothing else', () => assert.deepEqual(
  H({ asks: null, printer: printing, unread: ['Local AI'] }), ["Couldn't read what needs you."]));
test('home: a count that is not a whole number of asks is unreadable, never "nothing"', () => {
  for (const asks of [undefined, NaN, -1, 1.5, '3', {}]) assert.deepEqual(H({ asks }), ["Couldn't read what needs you."]);
});
test('home: part unread', () => {
  assert.deepEqual(H({ asks: 0, unread: ['Local AI'], printer: printing }), ['Nothing needs you here.', "Local AI wasn't read."]);
  assert.deepEqual(H({ asks: 2, unread: ['Local AI'], printer: printing }), ['Two things need you.', "Local AI wasn't read."]);
  assert.deepEqual(H({ asks: 0, unread: ['', null, 7] }), ['Nothing needs you.']);
});
test('home: decisions when there are no asks', () => {
  assert.equal(H({ asks: 0, decisions: 2 })[0], 'Two decisions are waiting.');
  assert.equal(H({ asks: 0, decisions: 1 })[0], 'One decision is waiting.');
  assert.equal(H({ asks: 3, decisions: 2 })[0], 'Three things need you.');
  assert.equal(H({ asks: 0, decisions: undefined })[0], 'Nothing needs you.');
});
test('home: bad beats running, running beats warn, a stale printer is not "running"', () => {
  const c = [{ tone: 'warn', title: 'The Pi ran hot' }, { tone: 'bad', title: 'The internet is down.' }];
  assert.equal(H({ asks: 0, conditions: c, printer: printing })[1], 'The internet is down.');
  assert.equal(H({ asks: 0, conditions: [c[0]], printer: printing })[1], 'The X2D is 45% through its print, done about 15:30.');
  assert.equal(H({ asks: 0, conditions: [c[0]], printer: { ...printing, state: 'stale' } })[1], 'The Pi ran hot.');
  assert.equal(H({ asks: 0, conditions: [c[0]], printer: { ...printing, status: 'paused' } })[1], 'The Pi ran hot.');
});
test('home: the printer without a finish time, or without a usable percent', () => {
  assert.equal(H({ asks: 0, printer: { ...printing, done_at: now - 1 } })[1], 'The X2D is 45% through its print.');
  assert.deepEqual(H({ asks: 0, printer: { ...printing, percent: NaN } }), ['Nothing needs you.']);
});
test('home: an over-long condition is skipped, not cut', () => {
  assert.deepEqual(H({ asks: 0, conditions: [{ tone: 'bad', title: 'x'.repeat(70) }] }), ['Nothing needs you.']);
  assert.deepEqual(H({ asks: 0, conditions: [{ tone: 'bad', title: 'x'.repeat(70) }, { tone: 'warn', title: 'The Pi ran hot' }] }),
    ['Nothing needs you.', 'The Pi ran hot.']);
  assert.deepEqual(H({ asks: 0, conditions: [null, { tone: 'bad' }, { tone: 'bad', title: '  ' }, 'x'] }), ['Nothing needs you.']);
});
test('home: empty input', () => assert.deepEqual(H({}), ["Couldn't read what needs you."]));

// ---- Found by the branch review (25 Nov 2026) ----
const needsMod = { exports: {} };
new Function('module', fs.readFileSync(path.join(root, 'dist/needs.js'), 'utf8'))(needsMod);
const realAgo = needsMod.exports.ago;

test('review 1: a stale reading never says "now", with the real ApplianceNeeds.ago', () => {
  const st = (as_of, status = 'paused') => P({ state: 'stale', status, as_of }, { ago: realAgo })[0];
  assert.equal(st(now - 20000), 'The X2D was paused a moment ago.');
  assert.equal(st(now - 59000), 'The X2D was paused a moment ago.');
  assert.equal(st(now), 'The X2D was paused a moment ago.');
  assert.equal(st(now + 60000), 'The X2D was paused earlier.');            // a reading from the future has no age
  assert.equal(st(now - 720000), 'The X2D was paused 12 min ago.');
  assert.equal(st(now - 3 * 3600000), 'The X2D was paused earlier.');       // past the last age rule, ago() is null
  for (const s of [20, 59, 0, 720, 7200]) assert.ok(!/\bnow\b/.test(st(now - s * 1000, 'printing')), String(s));
});

test('review 2: a long name never drops the subject or passes 60 characters', () => {
  const long = 'A printer with a name far too long to fit in any sentence at all';
  for (const name of [long, 'x'.repeat(41), 'Seventeen chars!!']) {
    assert.deepEqual(P({ state: 'unavailable', name }), ["The printer isn't answering."]);
    assert.deepEqual(P({ state: 'unknown', name }), ["The printer hasn't reported yet."]);
    assert.deepEqual(P({ state: 'live', status: 'idle', name }), ['The printer is idle.']);
    assert.deepEqual(P({ state: 'live', status: 'printing', percent: 45, job: 'Clip', left_min: 20, name }),
      ['The printer is 45% through Clip.', 'About 20 min left.']);
    assert.equal(H({ asks: 0, printer: { state: 'live', status: 'printing', percent: 45, name } })[1], 'The printer is 45% through its print.');
  }
  assert.deepEqual(P({ state: 'live', status: 'idle', name: 'Sixteen chars!!!' }), ['The Sixteen chars!!! is idle.']);
});

test('review 2: no second sentence without a first, whatever the clock, the age or the source say', () => {
  const wordy = { clock: () => 'half past ten in the morning, Eastern Standard Time, more or less', ago: () => 'a very long while ago, longer than anyone could say exactly' };
  const cases = [
    { state: 'live', status: 'printing', percent: 100, job: 'j'.repeat(80), left_min: 9999, done_at: now + 1000 },
    { state: 'live', status: 'finished', job: 'Clip', finished_at: now - 1000, plate_ask: true },
    { state: 'live', status: 'idle', finished_at: now - 1000 },
    { state: 'stale', status: 'printing', percent: 100, job: 'Clip', as_of: now - 720000, source: 'Bambuddy' },
    { state: 'stale', status: 'failed', as_of: now - 720000, source: 's'.repeat(70) },
  ];
  for (const name of ['X2D', 'Sixteen chars!!!']) for (const c of cases) for (const o of [{}, wordy]) {
    const out = P({ ...c, name }, o);
    assert.ok(out.length >= 1 && out.length <= 2, JSON.stringify(out));
    assert.ok(out[0].startsWith(`The ${name} `), JSON.stringify(out));
    for (const s of out) assert.ok(s.length <= 60, `${s.length}: ${s}`);
  }
  for (const i of [{ asks: 1, unread: ['u'.repeat(70)], conditions: [{ tone: 'bad', title: 'b'.repeat(70) }], printer: { ...cases[0], name: 'Sixteen chars!!!' } }])
    for (const s of H(i, wordy)) assert.ok(s.length <= 60, s);
});

test('review 3: a time on another day, or in the future, is not said as a time today', () => {
  assert.deepEqual(P({ state: 'live', status: 'finished', job: 'Clip', finished_at: now - 3 * 86400000, plate_ask: true }),
    ['The X2D finished Clip.', 'Clear the plate.']);
  assert.deepEqual(P({ state: 'live', status: 'finished', job: 'Clip', finished_at: now + 3600000 }), ['The X2D finished Clip.']);
  assert.deepEqual(P({ state: 'live', status: 'idle', finished_at: now + 3600000 }), ['The X2D is idle.']);
  assert.deepEqual(P({ state: 'stale', status: 'idle', as_of: now - 40 * 86400000, source: 'Bambuddy' }, { ago: realAgo }), ['The X2D was idle earlier.']);
  assert.deepEqual(compose({ page: 'printer', reading: { state: 'live', status: 'finished', job: 'Clip', finished_at: now - 1000 } }, { clock }).sentences,
    ['The X2D finished Clip.']);   // no now: nothing to compare the time with
});

test('review 4: Home has a loading state, and decisions that could not be read are not "nothing"', () => {
  assert.deepEqual(compose({ page: 'home', label: 'Home', loading: true }, { now }), { label: 'Home', sentences: [], loading: true });
  assert.deepEqual(compose({ page: 'home', label: 'Home', loading: true, asks: 3 }, { now }).loading, true);
  for (const decisions of [null, NaN, -1, 1.5, '2', {}]) assert.deepEqual(H({ asks: 0, decisions }), ['Nothing needs you here.'], String(decisions));
  assert.deepEqual(H({ asks: 0, decisions: 0 }), ['Nothing needs you.']);
  assert.equal(H({ asks: 2, decisions: null })[0], 'Two things need you.');
});

test('review: a time that is not a date is no time, and a print under way is never "100%"', () => {
  assert.deepEqual(P({ state: 'live', status: 'printing', percent: 45, job: 'Clip', done_at: 1e20 }), ['The X2D is 45% through Clip.']);
  assert.deepEqual(H({ asks: 0, printer: { state: 'live', status: 'printing', percent: 45, done_at: 1e20 } }), ['Nothing needs you.', 'The X2D is 45% through its print.']);
  assert.equal(P({ state: 'live', status: 'printing', percent: 99.6, job: 'Clip' })[0], 'The X2D is 99% through Clip.');
  assert.equal(P({ state: 'live', status: 'printing', percent: 100, job: 'Clip' })[0], 'The X2D is 100% through Clip.');
});

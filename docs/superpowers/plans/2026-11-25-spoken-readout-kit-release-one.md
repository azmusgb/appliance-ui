# Spoken readout, kit release one (2.32.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the additive kit parts a page needs to open with its reading as a sentence: `say.js`, `ui-say`, `ui-vh`, the grid row with a figure, and the faceplate without a readout.

**Architecture:** `src/say.js` is a classic script in the pattern of `src/needs.js`: one IIFE exporting `ApplianceSay` on `window` and `module.exports`, pure `compose` functions and one small DOM writer. The CSS is new classes and modifiers in `src/components.css`; no existing rule changes, so a page that does not opt in looks the same after a sync.

**Tech Stack:** Vanilla ES2022, plain CSS with container queries, `node --test`, Playwright 1.63 (already a dev dependency). No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-25-spoken-readout-design.md` (S1, S2, S3 without the meter, S5 as an opt-in modifier), Rollout step 2. Pi Hub amendment A37. **Do not start until appliance-ui#58 and pi-hub#344 are merged.**

## Global Constraints

- This release is additive: no existing selector's declarations change. `ui-meter`, `ui-need`, `ui-rail-badge` and `ui-row--lamp` are untouched (they are release two).
- Colours, sizes, spaces, radii and durations come only from `--ui-*` tokens; `npm run literals` must not grow.
- Sentence case. No all-caps. Tabular numerals on anything that changes.
- Text reaches the DOM through `textContent` only.
- A sentence is at most 60 characters after substitution. At most two sentences.
- The same input always gives the same string. No randomness, no `Date.now()` inside `compose` (the caller passes `now`).
- A failed, stale, unknown or loading read is its own output, never the live wording.
- Counts one to twelve are words; 13 and up are digits.
- `dist/` is written only by `npm run build` and is committed with the change.
- Version `2.32.0` in `tokens.json` and `package.json` together; one `CHANGELOG.md` entry, `## 2.32.0 — skippable`.
- Branch off `main`; open a PR; never push to `main`. `npm ci && npm test` before the PR, counts pasted.

## Review Focus

1. **A job name that is long, unbroken or markup** (`<img onerror=…>`, 80 characters, no spaces): it is replaced by "its print" when the sentence would pass 60 characters, never injected as HTML, and never overflows at 320 px. Tests: Task 1 step 1 (`long job`), Task 3 step 1 (`markup job`).
2. **A percent that is not a usable number** (`NaN`, `null`, `-3`, `140`, `"45"`): the clause is dropped, never drawn as `NaN%` or `0%`. Test: Task 1 step 1 (`bad percent`).
3. **A finish time that has already passed, or a reading with no `as_of` while stale:** the estimate clause is dropped; a stale reading without an age says "earlier", never "now". Test: Task 1 step 1 (`past eta`, `stale without age`).
4. **`compose` given nothing usable** (`undefined`, `{}`, a `reading` with no `state`, an unknown `page`): returns the unknown wording or an empty result, never throws. Tests: Task 1 and Task 2 step 1 (`empty input`).
5. **A refresh that redraws the head every few seconds:** the DOM is written only when the text changed, so a text selection, the focus and a screen reader's place survive. Test: Task 3 step 1 (`unchanged writes nothing`).

---

### Task 1: `say.js`, the Printer's sentences

**Files:**
- Create: `src/say.js`
- Modify: `scripts/build.mjs` (write `dist/say.js` with the banner, beside the `backbar.js` line; add `say.js` to the `built …` log line)
- Test: `tests/say.test.mjs` (loads `dist/say.js` with `new Function('module', …)`, as `tests/needs.test.mjs` does)

**Interfaces:**
- Produces:
  - `ApplianceSay.PHRASES` (frozen object of the templates below)
  - `ApplianceSay.count(n: number) → string` ("One" … "Twelve", then digits; not a finite integer ≥ 1 → `""`)
  - `ApplianceSay.duration(minutes: number) → string` (`24` → "24 min", `60` → "1 h", `684` → "11 h 24 min"; not finite or < 1 → `""`)
  - `ApplianceSay.compose(input, opts?) → { label: string, sentences: string[], loading: boolean }`
  - `input = { page: "printer", label: string, reading }`
  - `reading = { state: "live"|"stale"|"unavailable"|"unknown"|"loading", as_of?: number (ms), source?: string, name?: string (default "X2D"), status?: "printing"|"paused"|"finished"|"failed"|"idle", percent?: number, job?: string, left_min?: number, done_at?: number (ms), finished_at?: number (ms), plate_ask?: boolean }`
  - `opts = { now: number (ms), clock?: (ms) → string, ago?: (seconds) → string }`. `clock` defaults to `toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })`. `ago` has no default; without it a stale age reads "earlier".

Exact copy (`PHRASES`). `{job}` falls back to "its print" when the job is missing or the sentence would pass 60 characters:

| Key | Text |
|---|---|
| `printing` | `The {name} is {p}% through {job}.` |
| `printing_nop` | `The {name} is printing {job}.` |
| `eta_both` | `About {left} left, done around {time}.` |
| `eta_left` | `About {left} left.` |
| `eta_time` | `Done around {time}.` |
| `paused` | `The {name} is paused at {p}%.` |
| `paused_nop` | `The {name} is paused.` |
| `finished_at` | `The {name} finished {job} at {time}.` |
| `finished` | `The {name} finished {job}.` |
| `clear_plate` | `Clear the plate.` |
| `failed` | `The {name} stopped at {p}%.` |
| `failed_nop` | `The {name} stopped.` |
| `idle` | `The {name} is idle.` |
| `idle_last` | `Its last print finished at {time}.` |
| `stale_printing` | `The {name} was {p}% through {job} {age}.` |
| `stale_other` | `The {name} was {word} {age}.` (`word`: idle, paused, finished, stopped, printing) |
| `stale_source` | `{source} hasn't answered since {time}.` |
| `unavailable` | `The {name} isn't answering.` |
| `unknown` | `The {name} hasn't reported yet.` |
| `job_generic` | `its print` |
| `age_unknown` | `earlier` |

Rules the tests pin: `percent` is used only when it is a finite number from 0 to 100, rounded to an integer. `done_at` is used only when it is after `opts.now`. `idle_last` only when `finished_at` is on the same local date as `now`. `clear_plate` only when `plate_ask === true`. `stale_source` only when both `source` and `as_of` exist. A missing or unknown `status` on a live reading is `unknown`. `loading` returns `{ sentences: [], loading: true }`.

- [ ] **Step 1: Write the failing tests** in `tests/say.test.mjs`. Fixed clock for all: `const now = Date.UTC(2026, 10, 26, 4, 6)`, `const clock = ms => new Date(ms).toISOString().slice(11, 16)`, `const ago = s => Math.round(s / 60) + ' min ago'`.

```js
const P = (reading, o = {}) => compose({ page: 'printer', label: 'Printer', reading }, { now, clock, ago, ...o }).sentences;
test('printing with both estimates', () => assert.deepEqual(
  P({ state: 'live', status: 'printing', percent: 45.4, job: 'Rift10 pair70', left_min: 684, done_at: now + 684 * 60000 }),
  ['The X2D is 45% through Rift10 pair70.', 'About 11 h 24 min left, done around 15:30.']));
test('long job', () => assert.deepEqual(
  P({ state: 'live', status: 'printing', percent: 45, job: 'Rift10 pair70 clean x2d with hbs and a much longer name' })[0],
  'The X2D is 45% through its print.'));
test('bad percent', () => { for (const percent of [NaN, null, -3, 140, '45'])
  assert.equal(P({ state: 'live', status: 'printing', percent, job: 'Clip' })[0], 'The X2D is printing Clip.'); });
test('past eta', () => assert.deepEqual(
  P({ state: 'live', status: 'printing', percent: 99, job: 'Clip', done_at: now - 60000 }), ['The X2D is 99% through Clip.']));
test('paused, failed, idle, finished', () => {
  assert.deepEqual(P({ state: 'live', status: 'paused', percent: 12 }), ['The X2D is paused at 12%.']);
  assert.deepEqual(P({ state: 'live', status: 'failed' }), ['The X2D stopped.']);
  assert.deepEqual(P({ state: 'live', status: 'idle', finished_at: now - 3600000 }), ['The X2D is idle.', 'Its last print finished at 03:06.']);
  assert.deepEqual(P({ state: 'live', status: 'idle', finished_at: now - 3 * 86400000 }), ['The X2D is idle.']);
  assert.deepEqual(P({ state: 'live', status: 'finished', job: 'Clip', finished_at: now - 60000, plate_ask: true }),
    ['The X2D finished Clip at 04:05.', 'Clear the plate.']);
});
test('stale is past tense, with its age and source', () => assert.deepEqual(
  P({ state: 'stale', status: 'printing', percent: 45, job: 'Clip', as_of: now - 720000, source: 'Bambuddy' }),
  ['The X2D was 45% through Clip 12 min ago.', "Bambuddy hasn't answered since 03:54."]));
test('stale without age', () => assert.deepEqual(
  P({ state: 'stale', status: 'idle' }, { ago: undefined }), ['The X2D was idle earlier.']));
test('unavailable, unknown, loading', () => {
  assert.deepEqual(P({ state: 'unavailable' }), ["The X2D isn't answering."]);
  assert.deepEqual(P({ state: 'unknown' }), ["The X2D hasn't reported yet."]);
  assert.deepEqual(P({ state: 'live' }), ["The X2D hasn't reported yet."]);
  assert.deepEqual(compose({ page: 'printer', label: 'Printer', reading: { state: 'loading' } }, { now }), { label: 'Printer', sentences: [], loading: true });
});
test('empty input', () => { for (const input of [undefined, {}, { page: 'printer' }, { page: 'nope', label: 'X' }])
  assert.deepEqual(compose(input, { now }).sentences.length <= 2, true); });
test('every sentence is at most 60 characters, and the same input gives the same string', () => { /* loop the fixtures above twice */ });
test('count and duration', () => {
  assert.deepEqual([1, 12, 13, 0, 1.5].map(count), ['One', 'Twelve', '13', '', '']);
  assert.deepEqual([24, 60, 684, 0, NaN].map(duration), ['24 min', '1 h', '11 h 24 min', '', '']);
});
```

- [ ] **Step 2: Run** `node scripts/build.mjs && node --test tests/say.test.mjs`. Expected: FAIL, `dist/say.js` not found.
- [ ] **Step 3: Implement** `src/say.js` (the IIFE, `PHRASES`, `count`, `duration`, `compose` for `page: "printer"`; an unknown page returns `{ label: input?.label ?? "", sentences: [], loading: false }`) and the `build.mjs` line. Open the file with a comment block in the style of `needs.js` naming the spec and the reading's shape.
- [ ] **Step 4: Run** the same command. Expected: all pass.
- [ ] **Step 5: Commit** `git add src/say.js scripts/build.mjs tests/say.test.mjs dist && git commit -m "say.js: the Printer's reading as a sentence"`

### Task 2: Home's sentences

**Files:**
- Modify: `src/say.js`
- Test: `tests/say.test.mjs`

**Interfaces:**
- Consumes: `compose`, `count`, `PHRASES` from Task 1.
- Produces: `compose({ page: "home", label, asks: number | null, unread?: string[], decisions?: number, conditions?: { tone: "bad"|"warn", title: string }[], printer?: reading }, opts)`. `asks: null` means the list could not be read.

Added copy:

| Key | Text |
|---|---|
| `asks_none` | `Nothing needs you.` |
| `asks_none_here` | `Nothing needs you here.` |
| `asks_one` | `One thing needs you.` |
| `asks_many` | `{N} things need you.` |
| `asks_unreadable` | `Couldn't read what needs you.` |
| `decisions_one` | `One decision is waiting.` |
| `decisions_many` | `{N} decisions are waiting.` |
| `not_read` | `{name} wasn't read.` |
| `home_printing_eta` | `The {name} is {p}% through its print, done about {time}.` |
| `home_printing` | `The {name} is {p}% through its print.` |

Sentence one: `asks === null` → `asks_unreadable`; `asks ≥ 1` → `asks_one`/`asks_many`; `asks === 0` and `decisions ≥ 1` → `decisions_*`; `asks === 0` and `unread` non-empty → `asks_none_here`; else `asks_none`. Sentence two, first match wins, skipping any candidate over 60 characters: `unread[0]` → `not_read`; the first `bad` condition's title plus a full stop (unless it already ends in one); a live printing `printer` with a usable percent → `home_printing_eta` or `home_printing`; the first `warn` condition's title; else none. With `asks_unreadable` there is no second sentence.

- [ ] **Step 1: Write the failing tests**

```js
const H = (i, o = {}) => compose({ page: 'home', label: 'Home', ...i }, { now, clock, ago, ...o }).sentences;
const printing = { state: 'live', status: 'printing', percent: 45, job: 'Rift10', done_at: now + 684 * 60000 };
test('home: asks and the printer', () => assert.deepEqual(H({ asks: 1, printer: printing }),
  ['One thing needs you.', 'The X2D is 45% through its print, done about 15:30.']));
test('home: calm', () => assert.deepEqual(H({ asks: 0 }), ['Nothing needs you.']));
test('home: thirteen', () => assert.equal(H({ asks: 13 })[0], '13 things need you.'));
test('home: unreadable list says so and nothing else', () => assert.deepEqual(H({ asks: null, printer: printing }), ["Couldn't read what needs you."]));
test('home: part unread', () => assert.deepEqual(H({ asks: 0, unread: ['Local AI'], printer: printing }), ['Nothing needs you here.', "Local AI wasn't read."]));
test('home: decisions when there are no asks', () => {
  assert.equal(H({ asks: 0, decisions: 2 })[0], 'Two decisions are waiting.');
  assert.equal(H({ asks: 3, decisions: 2 })[0], 'Three things need you.');
});
test('home: bad beats running, running beats warn, a stale printer is not "running"', () => {
  const c = [{ tone: 'warn', title: 'The Pi ran hot' }, { tone: 'bad', title: 'The internet is down.' }];
  assert.equal(H({ asks: 0, conditions: c, printer: printing })[1], 'The internet is down.');
  assert.equal(H({ asks: 0, conditions: [c[0]], printer: printing })[1], 'The X2D is 45% through its print, done about 15:30.');
  assert.equal(H({ asks: 0, conditions: [c[0]], printer: { ...printing, state: 'stale' } })[1], 'The Pi ran hot.');
});
test('home: an over-long condition is skipped, not cut', () => assert.deepEqual(
  H({ asks: 0, conditions: [{ tone: 'bad', title: 'x'.repeat(70) }] }), ['Nothing needs you.']));
test('home: empty input', () => assert.deepEqual(H({}), ["Couldn't read what needs you."]));
```

(`asks` missing is treated as `null`: an unread count is never "nothing".)

- [ ] **Step 2: Run** `node scripts/build.mjs && node --test tests/say.test.mjs`. Expected: the nine new tests FAIL.
- [ ] **Step 3: Implement** the `home` branch of `compose`.
- [ ] **Step 4: Run** again. Expected: all pass.
- [ ] **Step 5: Commit** `git commit -am "say.js: Home's sentences count what Home draws"` (include `dist`).

### Task 3: `ui-say`, `ui-vh` and `ApplianceSay.render`

**Files:**
- Modify: `src/say.js`, `src/components.css`
- Create: `tests/fixtures/say.html` (links `../../dist/tokens.css`, `components.css`, `say.js`; body is `<main class="ui-page"><div class="ui-page__head ui-page__head--say"><div class="ui-page__tools"><button class="ui-btn">Search</button></div><h1 class="ui-say" id="say"></h1></div><button id="b">x</button></main>`)
- Test: `tests/say-dom.test.mjs` (Playwright, in the shape of `tests/needs-dom.test.mjs`); add the new classes to the list in `tests/components.test.mjs`

**Interfaces:**
- Consumes: `compose` result `{ label, sentences, loading }`.
- Produces: `ApplianceSay.render(h1: HTMLElement, composed) → boolean` (true when it wrote). Markup written: `<span class="ui-vh">{label}: </span>` then one `<span class="ui-say__s">` per sentence; when `loading`, two `<span class="ui-skeleton ui-say__wait" aria-hidden="true">` after the label and `aria-busy="true"` on the `h1`. With no sentences and not loading it writes the label alone as visible text (the page then reads as a plain title). It stores the last written key on `h1.dataset.say` and returns false without touching the DOM when the key is unchanged.
- CSS classes: `ui-vh` (clip-path visually hidden); `ui-say` (weight 700, `font-stretch: var(--ui-stretch-readout)`, `font-size: clamp(var(--ui-fs-7), 1.45rem + 2.4vw, calc(var(--ui-fs-7) * 1.5))`, `line-height: 1.04`, `max-width: 30ch`, `text-wrap: balance`, `overflow-wrap: anywhere`, tabular numerals, `margin: 0`, colour `text`); `ui-say__s` (block; `+ .ui-say__s` gets `margin-top: .18em`); `ui-say__wait` (height `1em`, widths 18ch and 26ch capped at 100%, `margin-top: .18em`); `ui-page__head--say` (one column: tools row first, the `h1` under it); `ui-page__tools` (flex, right-aligned, gap `--ui-s-2`).

- [ ] **Step 1: Write the failing tests**

```js
test('render writes the hidden label and one span per sentence', async () => { /* render({label:'Printer',sentences:['A.','B.'],loading:false}) →
  h1.innerText === 'A.\nB.' (the label is not visible), h1.textContent === 'Printer: A.B.', 2 × .ui-say__s, no aria-live, no aria-busy */ });
test('unchanged writes nothing', async () => { /* render twice with the same value: second returns false and a MutationObserver on the h1 saw 0 records;
  focus on #b before both renders is still on #b after */ });
test('markup job', async () => { /* sentences: ['The X2D is 1% through <img src=x onerror=window.__x=1>.'] → no img element, window.__x undefined */ });
test('loading draws a skeleton in the sentence’s shape, then the text replaces it', async () => { /* 2 × .ui-say__wait, aria-busy="true"; then render text: 0 waits, no aria-busy */ });
test('no sentences shows the page name', async () => { /* innerText === 'Printer' */ });
test('fits from 320 px and at 200% text', async () => { /* widths 320, 390, 1024, 1440; and html{font-size:200%} at 320: scrollWidth <= innerWidth,
  with an 80-character unbroken second sentence */ });
test('the computed type is the readout face', async () => { /* font-stretch 75%, weight 700, font-size 34px at a 360 px window */ });
```

- [ ] **Step 2: Run** `node --test tests/say-dom.test.mjs tests/components.test.mjs`. Expected: FAIL (`render` is not a function; classes missing).
- [ ] **Step 3: Implement** `render` in `src/say.js` and the classes in `src/components.css`, in one block headed by a comment naming the spec's S1.
- [ ] **Step 4: Run** again, then `npm run literals`. Expected: tests pass; the literals count does not grow.
- [ ] **Step 5: Commit** `git commit -am "ui-say: the head is the reading; ui-vh"` (include `dist`).

### Task 4: The grid row with a figure, and the plate

**Files:**
- Modify: `src/components.css`
- Create: `demo/say.html` (the Printer page from the spec's mockup, built only from kit classes and `dist/`; "Sample data" in its tools row; a second section with the grid rows from the mockup's Home, including a row with no figure and one `ui-chip--unknown`)
- Modify: `scripts/screens.mjs` (add `['say', 'say.html']` to its list)
- Test: `tests/say-dom.test.mjs`, `tests/components.test.mjs` (class list)

**Interfaces:**
- Produces (CSS only, all opt-in):
  - `ui-rows--grid` on a `ui-rows` list, with `container-type: inline-size`. Its `ui-row` children become a grid: under 36 rem of the list's width, columns `1fr auto`, with `ui-row__name` (title and chip on one line, wrapping) over `ui-row__detail`, and `ui-row__figure` at the right across both lines; from 36 rem, columns `13rem 1fr auto`, with the chip under the title inside `ui-row__name`. Min height 3.5 rem. A row that is an `<a>` is one link: no underline at rest, the title underlined on hover and focus.
  - `ui-row__name`, `ui-row__figure` (readout face, weight 700, `--ui-fs-6`, tabular, right-aligned, line height 1; its `<small>` is a block at `--ui-fs-2`, weight 400, normal width, `muted`).
  - `ui-faceplate--plate`, with `container-type: inline-size` on the faceplate: `ui-faceplate__job` (`muted`, `--ui-fs-3`; full line under 38 rem, pushed right on the nameplate's line from 38 rem); its `ui-faceplate__readings dd` at `--ui-fs-5` in the readout face; from 38 rem `ui-faceplate__readings` and `ui-faceplate__actions` share a row, actions at the right, bottom-aligned. A plate holds no `ui-readout` and no `ui-faceplate__caption`.
- The meter keeps its `accent` fill in this release.

- [ ] **Step 1: Write the failing tests** against `demo/say.html`

```js
test('demo/say.html has no overflow from 320 to 1440 px, dark and light', async () => { /* 320, 390, 820, 1024, 1366, 1440 × both schemes */ });
test('first screen at 390 × 844 holds the sentence and the plate’s first action', async () => {
  /* bottom of .ui-say and of .ui-faceplate__actions .ui-btn:first-child are both <= 844 */ });
test('grid rows: one column of names from 36 rem, the figure at the right', async () => {
  /* at 1440: every .ui-row__name has the same left and the same width; every .ui-row__figure’s right edge equals the list’s right edge;
     at 390: the figure’s top is within 4 px of its row’s title’s top */ });
test('a row with no figure draws nothing in its place', async () => { /* the row has no .ui-row__figure and no text "—" or "0" */ });
test('the plate has no big readout and its actions sit beside the readings from 38 rem', async () => {
  /* 0 × .ui-readout inside .ui-faceplate--plate; at 1440 the first action’s top is below the meter and its left is right of the last reading */ });
test('axe: no serious or critical findings on demo/say.html', async () => { /* only if the repo already runs axe in a test; otherwise leave this out and say so in the PR */ });
```

- [ ] **Step 2: Run** `node --test tests/say-dom.test.mjs`. Expected: the new tests FAIL (no `demo/say.html`).
- [ ] **Step 3: Implement** the CSS and `demo/say.html`; the demo's head is filled by `ApplianceSay.render(h1, ApplianceSay.compose(…))` from an inline script with a fixed `now`, so the page is the same on every run.
- [ ] **Step 4: Run** `npm test && npm run literals && npm run screens`. Expected: all pass; six new files `demo/screens/say-{phone,desktop}-{dark,light}.png` (four) and no change to any existing screen. Look at the four new screens.
- [ ] **Step 5: Commit** `git add -A && git commit -m "Grid rows with a figure, and the plate: a faceplate without a readout"`

### Task 5: Release 2.32.0

**Files:**
- Modify: `tokens.json` and `package.json` (`version` → `2.32.0`), `package-lock.json` (by `npm install --package-lock-only`), `CHANGELOG.md`, `README.md`

- [ ] **Step 1:** Raise both versions and refresh the lock file.
- [ ] **Step 2:** Add at the top of `CHANGELOG.md`:

```markdown
## 2.32.0 — skippable
The spoken readout's parts (Pi Hub A37; spec 2026-11-25-spoken-readout-design), all opt-in: `say.js` (`ApplianceSay.compose` turns a page's structured reading into one or two sentences, with stale, unavailable, unknown and loading as their own wording; `render` writes them into the page's `h1` and touches the DOM only when the text changed), `ui-say`, `ui-vh`, `ui-page__head--say` with `ui-page__tools`, `ui-rows--grid` with `ui-row__name` and `ui-row__figure`, and `ui-faceplate--plate` with `ui-faceplate__job`. No existing rule changes, so a page that adopts none of them is the same after the sync. `demo/say.html` shows them.
```

- [ ] **Step 3:** Add a short `README.md` section, "The spoken readout (2.32)", after the Needs-you section: the `compose` and `render` signatures, the reading's shape, and the markup for a grid row and a plate, each as one code block.
- [ ] **Step 4: Run** `npm ci && npm test`. Expected: every test passes, including `versions.test.mjs` and `changelog.test.mjs`. Record the counts.
- [ ] **Step 5: Commit** `git add -A && git commit -m "Kit 2.32.0: the spoken readout's parts"` and open the PR with the counts, the four new screens, and what was not checked.

## After this plan

Pi Hub's Printer pilot is its own plan in pi-hub (`docs/superpowers/plans/`), written after 2.32.0 is synced: map `/api/now` into the reading, draw the head and the plate on `/workshop`, and stop at the owner's gate.

# Spoken readout: the page says its reading

Date: 2026-11-25 · Status: **proposed** (approved when the owner merges this PR) · Kit: 2.31.3 (`ed87d83`) · Pi Hub read
at `61a824e`, live on 25 Nov 2026 at 390, 1024 and 1440 px.

Keeps: Faceplate's colours, Archivo, the lamps and every token value
([2026-11-01-faceplate-design.md](2026-11-01-faceplate-design.md)); the shell (2.29); the fluid scale and "layouts flow"
(Pi Hub A10); the Today band (A8 D1, A9, A11); the workshop display; A36's split of asks from heads-up.

Changes, and so needs a Pi Hub amendment before anything is built (see Rollout, step 1): A7 P1 (the page anatomy's
title and purpose lines, and the faceplate's readout), A7 P2 as drawn (Needs-you items as boxes), A7 P3 (the lamp on
the right of a row, for every list), A8 D3 (the rack's lamp on the left and its warn wash), and `DESIGN.md`'s "The
page", "Home" and colour table (the meter's fill).

Depends on: Pi Hub A36 (proposed 25 Nov; `hub/needs.py` has no `kind` yet). Home cannot move until A36's `kind` and
asks-only `count` are live (Rollout, step 5). Where this spec and A36 differ, A36 wins.

The owner's direction, 25 Nov 2026: the design is for the owner alone, on an iPhone, an iPad and a laptop; "go as far
as you recommend"; then "Yes, write it up" to the mockup of approach B below. Under the frozen baseline nothing here is
built or approved by being said.

Mockup (throwaway, sample data copied from the hub that night): `2026-11-25-spoken-readout/`
(`home-phone-dark.png`, `home-ipad-light.png`, `home-laptop-dark.png`, `printer-laptop-dark.png`,
`printer-phone-light.png`, and `mockup-src.html`, which needs the kit's `tokens.css` inlined to open).

## Why

Faceplate fixed the paint. The composition is still weak. Seen on the live hub on 25 Nov:

1. **The answer comes late on a phone.** Home's first screen at 390 × 844 is three bordered boxes of text. The printer,
   45% through an 11-hour print, starts below the fold, and its Pause button is a second screen down.
2. **The page head reports nothing.** "Home / Your home at a glance" and "Printer / The X2D: what it's doing and what it
   needs" take the best space on every page and never change. The reading is one or two blocks lower.
3. **Everything has the same weight.** Needs-you boxes, the rack and the faceplate are all `surface` panels with a
   `line` border. On Home each rack row also has its own column layout, so nothing lines up down the page.
4. **The accent does five jobs.** `DESIGN.md` reserves `accent` for the primary button, selection and focus. On the
   hub it also fills every meter and the rail's count badges. The System badge reads "99+" (a count of alerts, not of
   things waiting on the owner).
5. **Raw detail is the first thing read.** E-028's Needs-you text is the plan checker's output ("geometry mesh differs
   (E-026-A vs E-028-ANCHOR) … 95.5 / 45 min per test"). A7 finding 5 and A8 finding 2 named the same fault.

## Goals, non-goals, anti-goals

**Goals**
- On each device the first screen answers "what is the state, and what can I do about it" without scrolling.
- One loud element per page, and it carries information.
- A page reads top to bottom as: the reading, the one thing running, what needs the owner, the rest.
- `accent` means "you can act here" and nothing else.

**Non-goals**
- New colours, a new typeface, new tokens, or any change to `dist/display/` or `tokens.h`.
- New pages, new data sources, new keyboard shortcuts, a theme switch (the mockup's Light button is a review aid).
- The wall display (`/wall`), the Today band's drawing, and Local AI's framed pages (Agent World, chat).
- Changing what counts as an ask (A36 owns that).

**Anti-goals** (a failure even if it works)
- A sentence that states something the hub did not read just now as if it had: a stale reading in the present tense, a
  down source reported as fine, "Nothing needs you" when the list could not be read.
- A sentence whose wording varies for charm. The same state always produces the same words.
- A sentence long enough to push the page's action off the first phone screen.
- Two loud elements on one page (the sentence and a 51 px readout of the same number).
- A page whose name a screen-reader or keyboard user can no longer find.

## Constraints

- This repo is the source. Every part below is a kit change, synced to each app in its own PR. No app writes its own
  sentence text, row style or badge.
- No new colour pairing ships without a row in `docs/contrast.md` (`npm run contrast`).
- A failed, timed-out or unknown read is its own state everywhere it is shown, including in the sentence, and each new
  read gets a failed-source test.
- Layouts flow by container width (A10 D2). The shell's rail-or-tab-bar switch stays the only window switch.
- Sentence case, no all-caps labels, tabular numerals for numbers that change (`DESIGN.md`, Type).

## Approaches

**A. Tune.** Keep A7's anatomy; fix the badge, the meter colour and the Needs-you text. A day's work and no amendment,
but faults 1 to 3 stay: the head still says nothing and the phone still answers late.

**B. Recompose (picked).** Keep every token and the look; change the page's anatomy so the head is the reading. It
fixes all five faults, costs no colour, font or display work, and can ship page by page because a page that has not
moved keeps working.

**C. New identity.** A new face and palette as well. Faceplate is three weeks old, measured, and not what is wrong.
This spends the most on the part that needs it least and reopens the contrast table and the display's images.

The owner handed the choice over ("go as far as you recommend") and approved the mockup of B.

## Design

### S1. The head is the reading (amends A7 P1)

The page opens with one or two sentences that state its reading, in the readout face. The static title and the
one-line purpose leave the page.

```
 [Sample data]                    Search ⌘K   Assistant      tools row
 One thing needs you.                                         .ui-say (the h1)
 The X2D is 45% through its print, done about 10:30 AM.
 ─ strip: the area's pages ──────────────────────────
 [notice: only when a source is stale or down]
 ┌ Plate: nameplate · lamp        job, checked 20 s ago ┐     only while something runs
 │ ━━━━━━━━━━━━──────────────                          │     or is held (S3)
 │ Layer 506/1306  Nozzle 216°  Bed 55°   [Pause the print] │
 └─────────────────────────────────────────────────────┘
 Needs you here (asks)   ·   Heads up        rows (S4)
 Sections                rows on one grid (S5)
 Open in …   Sources …   Site map
```

- **Markup.** `<h1 class="ui-say">` holds a visually hidden page label and a colon (`<span class="ui-vh">Printer: </span>`),
  then one `<span>` per sentence. `document.title` and the strip's `aria-current` entry keep the page's name, from
  `pages.json` as today. The page's `purpose` stays in the palette and the Site map and is no longer drawn on the page.
- **Type.** Weight 700, `font-stretch: var(--ui-stretch-readout)`, line height 1.04, `text-wrap: balance`,
  `max-width: 30ch`, tabular numerals. Size
  `clamp(var(--ui-fs-7), 1.45rem + 2.4vw, calc(var(--ui-fs-7) * 1.5))`: 34 px on a 360 px phone to about 64 px on a
  1920 px screen. Each sentence is its own block, 0.18 em apart. All of it is `text`; no word is coloured or lighter.
- **Tools row.** Search and the Assistant button sit in a row above the sentence, right-aligned. Under 30 rem the
  `⌘K` hint and the words "Ask the" are hidden. "Sample data" (Honest states, Demonstration) sits at the row's left.
- **A page with no reading keeps its title.** Settings, Site map, the Privacy note, a form page and any page not yet
  moved draw `ui-page__title` as today, without the purpose line. A page never invents a sentence to have one.
- **It does not announce.** `ui-say` has no `aria-live`. Its text node is replaced only when the string changes, and a
  redraw never moves focus. Changes that need announcing keep their existing live regions (Needs you, toasts).

### S2. How a sentence is made

A new kit module, `src/say.js` (`ApplianceSay`), turns a structured reading into the text. Pages pass data; they never
write sentence text. The words live in one table in `say.js`, in the pattern of `PHRASES` in `needs.js`.

```
ApplianceSay.compose({ page, reading, asks }) → { label, sentences: [string, string?] }
ApplianceSay.render(h1, composed)             → void   (writes the spans; no-op when unchanged)
```

- `reading` is `{ state: "live" | "stale" | "unavailable" | "unknown" | "loading", as_of, source, ...facts }`: the
  four honest states of `DESIGN.md`, plus loading. `say.js` defines this shape and each page's facts; the app maps its
  own data into it (Pi Hub from `/api/now`), and `say.js` never fetches. Printer's facts, each optional except
  `status`: `status` (`printing | paused | finished | failed | idle`), `percent`, `job`, `left_min`, `done_at`,
  `finished_at`, `plate_ask` (boolean). A missing fact drops its clause (rule 3); a missing `status` is `unknown`.
- **Rules, for every page:**
  1. At most two sentences, each at most 60 characters after substitution. A name that would break that (a job, a
     file) is replaced by a generic noun ("its print") and shown in full in the plate.
  2. Counts up to twelve are words ("One thing", "Three things"); above that, digits.
  3. An estimate says "about" or "around" and is only used when its source gave one. A missing fact drops its clause;
     a target of 0 is no target.
  4. `stale`: past tense plus the age ("The X2D was 45% through its print 12 min ago."), and the second sentence
     names the source ("Bambuddy hasn't answered since 10:41 PM.").
  5. `unavailable`: the phrase table's words (`{name} isn't answering`; a sleeping PC or Mac is "asleep").
  6. `unknown`: "{name} hasn't reported yet."
  7. `loading`: no text; `ui-say` shows a two-line `ui-skeleton` in the sentence's shape.
- **Home.** Sentence one counts the rows drawn under "Needs you" on that page: the page passes `asks`, the same
  number its list renderer drew, so the sentence, the list and the badge cannot disagree. After A36 that is the asks
  (`kind: "ask"`); record conditions with no owner step are heads-up and are not counted. "Nothing needs you." /
  "One thing needs you." / "{N} things need you."
  - The whole list unreadable: "Couldn't read what needs you."
  - Part unread (today, Local AI while the PC sleeps), no asks read: "Nothing needs you here." and the second
    sentence is "Local AI wasn't read." (A36 D7). With asks read, the count stands and the second sentence is the same.
  - No asks, and open decisions (A33, never in the count): "{N} decisions are waiting." (one: "One decision is
    waiting.") in place of "Nothing needs you."
  - Sentence two, first match wins: a source that wasn't read; a `bad` condition; work that is running (the
    printer); a `warn` heads-up; otherwise none. "Nothing needs you." alone is the calm state.
- **Printer.** Printing: "The X2D is {p}% through {job}." + "About {left} left, done around {time}." Paused: "The X2D
  is paused at {p}%." Finished: "The X2D finished {job} at {time}." + "Clear the plate." only when the plate ask
  exists. Failed: "The X2D stopped at {p}%." Idle: "The X2D is idle." + "Its last print finished {when}." when known.
- **Other pages** get their sentence in the PR that moves them, written to rules 1 to 7 and shown in that PR's
  screenshots. Starting points (my call, not decided): Health "The Pi is at 71 °C and slowed itself at 5:47 PM.";
  Backups "The last backup finished at 3:02 AM."; Internet "The internet is fine and ad blocking is on."; Lists
  "Twelve things to buy, three to do."

### S3. The plate: what is running, and its one action (amends A7 P1's faceplate)

`ui-faceplate` stays the page's one panel and keeps its tokens. Two changes:

- **No big readout when the sentence carries the number.** On a page with `ui-say`, the faceplate drops `ui-readout`
  and its caption. It keeps: nameplate and lamp, the job name and "checked {age}" (right-aligned from 38 rem of its own
  width, on its own line below that), the meter, the readings as a wrapping `dl` (label in `fs2` `muted`, value in the
  readout face at `fs5`), and the actions. From 38 rem the actions sit to the right of the readings.
- **Home draws it only while something runs or is held.** Idle, Home has no panel; the sentence says so.
- **The meter's fill is `text`, not `accent`.** `ui-meter > i` changes for every consumer. Measure `text` on
  `surface-2` in both modes and add the row to `docs/contrast.md`.

### S4. Needs you is rows (amends A7 P2 as drawn; draws A36's Heads up)

`ui-need` loses its `surface` fill, border and radius. A list is a top rule and one rule under each item.

- **An item:** a 3 px tone bar on the left (`bad` red, `warn`/`attention` amber, as 2.11.1), the title at weight 700,
  one line of plain text (`detail`, `muted`, at most 60 ch wide), the meta line ("Since 7:40 AM, Print lab"), and its
  action. The action sits under the text, left-aligned and its own width, and moves to the right of the text when the
  list is at least 34 rem wide (unchanged).
- **Technical text goes behind "Details".** An item may carry `more`: a string drawn in `--ui-mono` inside a closed
  `<details>` with the summary "Details". The source decides what is `detail` and what is `more`; the kit never splits
  a string. An item with no `more` draws no disclosure. Nothing emits `more` today (`hub/needs.py` sends a clipped
  `detail`), so fault 5 is fixed only by Rollout step 5a: Local AI's `/api/needs` writes a plain `detail` and moves
  the checker's output to `more` for lab items, and `hub/needs.py` passes `more` through.
- **One primary.** The first ask's action is `ui-btn--primary` when the page has no other primary; every other ask's
  action is the default button.
- **Heads up (A36 D5, D6).** The same row with a `muted` bar (A36's "muted stripe"; the kit has no `--ui-text-2`) and
  no button; the row's link is its title. Where it shows and whether it is open is A36 D6's: on Home it is collapsed
  to one line ("2 heads up: Wind advisory, Pi warm") that opens on tap, so the mockup's open group is what it looks
  like once opened. If A36's kit variant lands first, this spec restyles it; if this lands first, A36 uses these rows.
- **Decisions (2.27), Acknowledge (2.28), the dense list and the `unread`/error states keep their behaviour.** Only
  the box goes.

### S5. Rows share one grid (amends A8 D3)

`ui-row--lamp` gains a figure and becomes what Home's rack, Filament loaded and Health's services are drawn with. Home's
own rack CSS in `home-dashboard.css` is deleted when Home moves.

- **Columns, from 36 rem of the list's own width:** name with its lamp under it (13 rem) · one line of text (`1fr`,
  `muted`) · figure (auto, right-aligned). **Below 36 rem:** name and lamp on one line, the text under them, the
  figure at the right across both lines.
- **The figure** (`ui-row__figure`) is optional: one number in the readout face at `fs6`, with a `fs2` `muted` caption
  under it ("done 10:30 AM", "slows at 80°", "GB free"). A row with no number leaves the column empty; it never shows
  a dash or a zero.
- **The lamp follows the name** in every list (this reverses A7 P3's lamp on the right, and A8 D3's lamp on the left
  for Home), and Home's warn wash goes. Names still line up down a list, which was P3's reason. A row that needs a
  look is found by its lamp's word and colour. A8 D2's order (Needs you first, Systems beside it) is unchanged.
- **No reading is shown twice.** While Home's plate shows the printer, the X2D row keeps its name, lamp and line and
  drops its figure.
- A row that links to a page is one link (the whole row, min height 3.5 rem); a row is not also given an "Open …" link.

### S6. The accent only acts

- Meters: S3.
- **Rail and tab-bar counts.** `ui-rail-badge` loses its `accent` fill and becomes a bare number in `warn` at weight
  700, beside the icon's top right. What a badge counts is A36 D6's rule, not the kit's: asks only, so System stops counting
  unread alerts and "99+" goes. Which area an ask badges is Pi Hub's to map (an ask with an `area` badges that area and
  Home; one without badges Home), in `navigation.js`, in the Home PR. `setBadge`'s API, the 99+ cap and the short form
  are unchanged.
  Measure `warn` on `bar` in both modes (text, 4.5:1) and add the row; if either mode fails, the number keeps `text`
  and gains a `warn` dot.
- Links keep `accentText` as today. (The first draft made row links plain `text`; dropped, because an underline on
  hover alone gives a touch screen nothing to see.)

### S7. By device

No device breakpoints; these are what the flowing layout produces, and what to check.

| | First screen must show | Layout |
|---|---|---|
| iPhone (390 × 844) | The sentence, and either the plate's action or the first ask's action | One column: sentence, plate, Needs you, Heads up, Systems, Today |
| iPad (1024 × 1366, 1366 × 1024) | The sentence, the plate, and the top of Needs you | Needs you and Systems side by side where each gets 24 rem; rows on three columns |
| Laptop (1440 × 900) | The sentence, the plate, and the first ask with its action | The same two columns; the page's width cap stays Pi Hub's (A10 D3) |

Home's order below the plate is Needs you and Heads up, Systems, then the Today band unchanged.

## What is left to the builder

- The exact wording of each page's sentences beyond Home and Printer, within S2's rules, shown in that page's PR.
- How `say.js` is split internally, and whether Home's "most notable system" pick lives in `say.js` or is passed in.
- The kit has no visually hidden utility today; add `ui-vh` to `components.css` and run `npm run literals`.
- Icon weights, exact paddings and gaps, using the space steps.

## Rollout

1. **Pi Hub amendment A37** (docs PR in pi-hub): restates S1, S3, S4 and S5 as changes to A7 P1, P2 and P3 and A8 D3
   and points here. Nothing below starts until it merges.
2. **Kit release one, additive (skippable):** `say.js`, `ui-say`, `ui-vh`, the row figure, and the faceplate without
   a readout. Nothing existing changes, so a page that has not moved looks the same after the sync. `demo/page.html`
   redrawn; `npm run screens`.
3. **Pilot: Printer on Pi Hub,** one PR after the sync (it needs nothing from A36).
   - **Gate.** The owner uses the live Printer page on the phone, the iPad and the laptop, then says go or stop.
     Stopping costs one page's revert; nothing else has changed yet.
4. **Kit release two, the restyle (skippable, but every page changes at its sync):** the Needs-you rows, the meter's
   fill, the badge; `npm run contrast`; `DESIGN.md` updated in the same PR.
5. **Pi Hub, one PR per page:** Home once A36's `kind` and asks-only `count` are live, then the rest in the rail's
   order. Home's PR also maps badges by area (S6) and deletes the rack's own CSS (S5).
   - **5a. `more`** (S4): one Local AI PR and one Pi Hub PR, any time after step 4; Home does not wait for it.
6. **Local AI's own pages** after Pi Hub's, the same way.

## Checks

- `say.js`: a unit test per state per page, including stale, unavailable, unknown, loading and the unread needs list;
  the 60-character limit; the same input always gives the same string.
- DOM tests: the `h1` holds the hidden label; no `aria-live`; an unchanged string writes nothing; focus survives a
  redraw.
- The width sweep (320 to 2560 px, both modes) and axe on the demo pages, and S7's first-screen table asserted at the
  three sizes.
- Not checked on the mockup: axe, a keyboard pass, and any real state other than "printing".

## Calls made (mine, for the owner to check)

1. The design lives here and the amendment in pi-hub points at it, rather than the reverse.
2. Sentences are composed in the kit from structured readings, not written by each page or by the server.
3. The page name stays for assistive tech and in the tab title, but is not drawn on a page that has a sentence.
4. Home shows the plate only while something runs or is held.
5. The lamp follows the name on Home too, and the warn wash goes (reverses A8 D3).
6. The kit ships in two releases with a go-or-stop gate after the Printer pilot, so the restyle of every page waits
   on the owner seeing one real page.
7. The mockup was redrawn after A36 was proposed, so it shows one ask and two heads-up, not "Three things need you".
   It draws Heads up open; on Home A36 D6 keeps it collapsed.
8. With no asks and open decisions, Home says "{N} decisions are waiting." rather than "Nothing needs you."
9. The lamp-by-the-name row applies to every list, so A7 P3 is amended, not only A8 D3.
10. Printer moves before Home, because Home waits on A36.

A fresh reviewer read the first draft against the kit and Pi Hub (25 Nov). Its eight questions and four contradictions
are answered above: what the Home count counts, the A36 dependency, who emits `more`, badges by area, the partial
read, Heads up collapsed, decisions, the reading's shape, the page cap, and the Heads up bar's colour.

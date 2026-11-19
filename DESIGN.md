# Home Platform design contract

The rules every screen follows: Pi Hub, the Assistant (Local AI) and the Workshop (the display and Workshop OS). A new
screen should look and behave like part of the same product. Agents building UI in any of these repos read this file
first.

**What wins when sources disagree.** The platform baseline and its approved amendments
(`pi-hub/docs/superpowers/specs/2026-11-01-platform-product-architecture-design.md`, notably A6, A7, and A8 and A9 for
Home) come first. The
kit's specs come next (`docs/superpowers/specs/`, Faceplate). This contract comes after both. It restates their rules in
working form and adds the ones they leave open. A rule here that changes what an approved spec says needs an amendment.
Changing this file is not enough. Where this contract and the shipped kit differ today, the difference is listed under
"Decided differences" at the end, and nothing else is assumed.

## The product

Pi Hub is the household front door. The Assistant provides intelligence and engineering tools, and opens inside Pi
Hub's shell at `/assistant` (A4 step 7a). The Workshop is for hands-on work: the printer, filament and Print lab on Pi
Hub, and the 480 × 320 workshop display. They share one look (this kit), one vocabulary (the spec's section 9 and the
phrase table in `src/needs.js`) and one set of interaction patterns. Each adapts to its user and device.

The feel is calm, dependable and easy to understand: a well-made instrument, not a wall of tiles. Home is the one
dashboard (A8), and it reads like an instrument panel: one bold band, then lamps and meters.

## Principles

- Make the current situation and the next useful action clear.
- Give each screen one dominant purpose and one primary action.
- Use spacing and type before borders, panels or colour.
- Show what matters first. Put technical detail (ids, paths, raw codes) in a detail line or a "Details" disclosure.
- Keep live, stale, unavailable, unknown and demonstration data distinct (see "Honest states").
- Keep navigation, words and interaction patterns the same everywhere.
- Use motion only to explain a change, and give it a reduced-motion alternative.
- Design every state: loading, empty, error, offline, stale, pending and success.

## Tokens

Use the kit's tokens (`tokens.json`, built to `dist/tokens.css` as `--ui-*`). Never set a colour, space, radius or
shadow on a single screen. If a token is missing, propose a small addition to `tokens.json` in this repo, say what it is
for, and sync it into each app. Never edit an app's copy.

A check holds each app to this (2.20): `literals.mjs`, copied with the kit, counts the colours, sizes, spacings, radii,
shadows, durations, layers and private names an app wrote by hand, and fails a change that adds one. README, "The
literals check", says how to run it.

### Colour

| Token | Use |
|---|---|
| `bg` | The page. |
| `bar` | The header and the rail. |
| `surface` | The faceplate, sheets and dialogs. |
| `surface2` | The well: behind default buttons, meters and inputs at rest. |
| `line`, `line2` | Dividers and frames. Decoration only: measured at 1.2–2.1:1, so they must never be the only thing that shows a control or a state. |
| `fieldLine` | A field's border (3:1). |
| `text`, `muted` | Primary and secondary text. Both pass 4.5:1 on every background. Hierarchy never comes from fainter text. |
| `accent` | The primary button's fill, selection and the focus ring. Nothing else. |
| `accentText` | Accent-coloured text: a link, or the current strip item. |
| `onAccent` | Text on an `accent` fill. |
| `accentSoft` | The tint behind a selected chip or row. |
| `ok`, `warn`, `bad` | Fine, needs a look, broken or blocking. Always shown with a word (a lamp: dot plus word). |
| `unknown` | Not known: never answered, can't be read, or out of date. Never drawn as `ok`. |

- A Needs-you item's bar is the lamp colour of its tone: `bad` is red, `attention` and `warn` are amber. A problem is
  never grey (2.11.1: `warn` was drawn muted, so a real problem such as "Ad blocking is off" read as information). Only
  an item with no problem tone (info, ok, busy) keeps the muted bar (2.13: `NeedTone::Info` on the display). The web
  (`ui-need`) and the display (`NeedsRow`) agree.
- The kit has no "information" colour. Neutral facts use `text` and `muted`. A notice that isn't a warning is plain text.
- Decorative gradients and glows stay out of anything operational. The one exception is `ui-beam` (2.5): one item that
  needs a look, never on a list.
- **Contrast is measured, never assumed.** `docs/contrast.md` is generated from the tokens (`npm run contrast`), and the
  build refuses any text pair below 4.5:1 and any focus ring, field border or lamp dot below 3:1, in both modes. Call a
  pair legible only as far as its number in that table says. A new pairing (a new tint, or text on a new background)
  gets a row there before it ships.

### Type

- **Typefaces:** Archivo for everything, and the system monospace (`--ui-mono`) for code, commands, hashes and paths in
  technical detail only.
- **Narrow widths** (`--ui-stretch-heading` 87.5%, `--ui-stretch-readout` 75%) are for headings and readouts. They carry
  the look; nothing else is condensed.
- **One fluid scale (A10 D1).** `tokens.css` sets the root's size on one curve: 100% of the browser's text size on a
  360 px window, growing smoothly to 125% at 1920 px, then stopping. The type, space and header tokens are `rem`, so they
  follow it. Nothing is smaller on a phone than it was, and a reader's own larger text setting still scales everything.
  An app never sets its own curve or a type size in px; it uses the tokens or `rem`. `tokens.h` keeps the px sizes:
  the workshop display is a fixed screen.
- **Scale** (`fs1`–`fs7`: 12, 13, 14, 16, 20, 26, 34 px on a 360 px window, about 1.25× that from 1920 px):

  | Role | Size |
  |---|---|
  | Page title | `fs6`–`fs7` |
  | Section heading | `fs5` |
  | Body | `fs3`–`fs4` |
  | Label | `fs2` |
  | Supporting text | `fs2` |
  | Readout | `ui-readout` sizes |

  `fs1` (12 px on a phone) is the floor, for meta lines only.
- **Writing:** sentence case everywhere. No all-caps labels and no tracked-out eyebrows above headings.
- **Numbers that change** (temperatures, progress, counts in columns) use tabular numerals.
- **Words:** the spec's section 9 names (Filament, Assistant status, In progress, Print lab, …), the page list's
  labels and the phrase-table keys. A screen never invents its own term for a platform thing.

### Space and shape

- **Spacing:** the eight steps `--ui-s-1` to `--ui-s-8` (4, 8, 12, 16, 24, 32, 48, 64 px on a 360 px window, growing
  with the type). Related things are close (`s-1`, `s-2`), groups are separated (`s-4`, `s-5`), and sections are
  separated more (`s-6` and up). `--ui-space` (the 4 px unit) stays for the kit's own `calc()`; a screen uses a step.
- **Radii:**
  - `r2` (6) for the faceplate and panels
  - `r3` (9) for controls
  - `r1` (4) for small marks
  - `r4` (14) for sheets

  Controls are rounder than the panels they sit in.
- **Control heights:** 40 px, and 44 px on a coarse pointer (`ui-btn` and `ui-field` do this). Icons are 16 or 20 px.
- **The pill** (`--ui-r-pill`) is for a fully rounded end: a chip, a toggle's track. It is not a fifth step of the
  radius scale.
- **Shadows** only for things above the page: `--ui-shadow-1` for a toast or a popover, `--ui-shadow-2` for a sheet, a
  dialog or the palette. Each has a dark and a light value. Nothing on the page itself casts one.
- **The backdrop** behind a dialog or a sheet is `--ui-backdrop`, the same in both modes.
- **Layers:** `--ui-z-bar` (the header, the rail, the tab bar), `--ui-z-toast`, `--ui-z-sheet` (sheets and dialogs
  that are not in the top layer), `--ui-z-palette`, in that order. A part that only needs to sit above its neighbour
  uses `0`, `1` or `-1`; no screen writes another number.
- **Motion:** `--ui-dur-1` (120 ms: a press, a tint) and `--ui-dur-2` (220 ms: a sheet, the palette, anything that
  moves), both on `--ui-ease`. A loop that shows waiting (the skeleton) keeps its own period.
- **No panel inside a panel.** A heading and spacing say what belongs together.

## Layout

### The page (A7 P1)

Every page in Pi Hub and the Assistant except Home (next section) is drawn in this order, and nothing else
(`ui-page`, `demo/page.html`):

```
 Title                                   Search ⌘K
 One-line purpose
 ─ strip: the area's pages (underlined) ─────────
 [notice: only when a source is stale or down]
 ┌ Faceplate: nameplate · lamp ───────────────────┐
 │ readout, caption, readings, actions  (aside)   │
 └────────────────────────────────────────────────┘
 Needs you here      (this area's items; hidden when none)
 Sections            (heading + rows, no card; at most six, the rest in More)
 Open in  Tool ↗ …
 Sources: name: state …                Site map
```

- **One panel per page:** the faceplate. It holds the page's one reading and its primary action.
- **Sections** are headings and rows on the page.
- **A form page** (Print, Make an automation) keeps its form as a section.

### Home (A8, A9)

Home is the one page that leaves the A7 anatomy. It is drawn by Pi Hub's `home-dashboard.js` and `home-dashboard.css`
with the kit's tokens, not by a new kit component.

- **Today band (the hero):** the house's day as one lane per system, marks for what happened, a Now line, and the
  hours still to come hatched. Four counts sit above it in the readout face. It shows the whole day when an hour gets
  at least 24 px, and otherwise midnight to an hour after Now, at least six hours (A9's rule as a measure, A10 D4).
- **Needs you beside Systems:** the kit's Needs-you list on the left (first on narrow screens), and a rack on the right
  with one row per system. A rack row's lamp is on the left (A8 D3 amends P3 for Home only), with a faint wash on a row
  that needs a look.
- **No camera on Home.** Workshop keeps it.
- **Sizes (A10 D4):** Needs you and Systems sit side by side where Needs you gets about 22 rem and Systems about
  36 rem, and stack where they don't. Rack rows arrange by their own width. The band's rows, bars and name column scale
  with it. No zoom on the TV: the fluid scale and the `rem` page cap do that.
- **The wall display** (`/wall`) keeps its own board.

### Order and density

- **Summary first,** then the exceptions that need action, then detail.
- **No KPI tiles, charts or feeds** unless they support a decision the owner actually makes on that page. Home's Today
  band is the one approved chart (A8); another needs the same case made in a spec.
- **Anything drawn against time keeps a readable density at its narrowest width.** Work out the pixels per unit (an
  hour, a day) at 320 px. If neighbouring marks would touch, show a shorter span, not smaller marks. Phone and desktop
  may show different spans of the same data (A9). Fitting isn't enough: at that width every label is readable without
  zoom, neighbouring events can be told apart, and each mark you can act on is a full-size target.
- **Rows** (`ui-row--lamp`) suit lists of things.
- **Tables** suit comparison: many records with the same columns (Versions, Alerts history, filament spools). Use
  `ui-table` (2.7) on a `<table>` with a `<caption>` and `<th scope="col">`, and `ui-table__num` on number columns
  (right-aligned, tabular). With `ui-table--stack`, a phone shows each row on its own, each value beside its column
  name (`data-label` on each cell). Keep `role="table"`, `row`, `cell` and `columnheader` in that markup: some browsers
  drop table semantics once CSS changes a table's display.
- **Household pages are approachable** (plain words, few numbers). **Engineering pages** (Print lab, Assistant runs) are
  precise: exact values and units, with the technical detail one click away.

### Navigation

- **The shell is constant:** the rail (or the phone tab bar), the page head and the strip.
- **One name per page, written once.** A page's name, its one-line purpose and its address come from the kit's page
  list (`pages.json`, kit 2.17; Pi Hub amendment A22). The strip entry, the title, the ⌘K entry and the Site map row
  are that one `label`. A screen never writes a page's name itself; a new page, or a new name, is a change to the list.
- **Pages in the shell** are links. Only another product's tool opens with "↗".
- **A page of ours outside the shell** (the Assistant on its own address, Camera fit, the Privacy note) starts with
  `ui-backbar`: one link, "← Pi Hub", named "Back to Pi Hub". With `backbar.js` loaded it returns a visitor to the Pi Hub
  page they came from. Another product's page never gets it.
- **Selection carries between related views.** The selected project, experiment, device or run carries in the URL
  (`?p=`, `?e=`, `#lab-E-025`), so Back, refresh and a shared link land in the same place.
- **Layouts flow; they don't switch (A10 D2, D3).** A grid sets its columns by the smallest width its content can live
  with (`repeat(auto-fit, minmax(…))`, `fr`, `min()`), and a component rearranges by its container's width (container
  queries), never the window's. The only window switch is the shell's: rail or tab bar, marked in the stylesheet as
  such. No breakpoints named after devices, no fixed pixel widths for content, and the page's width cap is in `rem`.
  In the kit:
  - **The faceplate's aside** sits beside it where both get 20 rem, and under it where they don't.
  - **Needs you** puts each item's action beside its text when the list is at least 34 rem wide.
  - **`ui-table--stack`** goes row by row when its container is under about 37.5 rem; put it in a `ui-cq` (or any
    element with `container-type`).
  - **The page title, readout and faceplate padding** grow from their phone size to their full size between a 360 and
    a 600 px window, without a step.

### The workshop display (480 × 320, touch)

It has its own layouts, not a shrunken page:

- one reading or one decision per screen
- 48 px or larger targets, with 8 px or more between them
- labels of one to three words
- at most two levels deep, with Back and Home always in the same place: Back at the top left of a level-two screen, Home the tab bar's Home tab
- no hover, no tables, and no text under 14 px

The display is built from `dist/display/` (kit 2.13), not by hand: header-only C++ parts that draw through a small
`UiCanvas` (see `dist/display/README.md`).

- **Parts:** `Faceplate`, `LampRow`, `Chip`, `Button`, `NeedsRow`, `AgeLine`, `Meter` and `Frame`, and the controls
  for changing a setting: a number is a `Stepper`, a named choice or a colour or a clock time is a `Picker`, on or off is
  a `Switch`. The views of one screen (the Printer's Status, AMS, Control and Camera) are `Tabs`: two to five tabs, 48 px
  high, 16 px labels, the selected one marked by a wash, accent text and an accent bar, never colour alone. A screen never draws its own lamp, row, button or header.
- **Colours** come only from `tokens.h` (`UI_COLOR_*`, RGB565), measured after rounding to RGB565 in the display column
  of `docs/contrast.md`. **Words** come from `words.h` and `needs.h`, the same text as the web.
- **Type** is Archivo in five VLW sizes (14, 16, 20, 26, and a 34 px readout at 75% width). Nothing is smaller than 14 px.
- **Honest states are in the parts.** A part that shows a value takes a `Reading` (live, stale, unavailable or never
  read) and draws the age or "Unknown" itself, so a screen can't draw an unknown reading as ok.
- **Back and Home:** `Frame` draws Back at the top left of a level-two screen; Home is the tab bar's Home tab. A level-one (top-level) screen has neither in its header. Two levels at most.

## Components

Reuse the kit and the app's existing components. Read the implementation before adding anything. A new shared pattern
is added to this kit, never to one app.

| Need | Use |
|---|---|
| Page head, strip, filters | `ui-page__head`, `ui-strip`, `ui-chips` |
| The views of one area (two to five) | `ui-tabs` (2.16): `role="tablist"`, arrow keys move between tabs |
| Six views of one area (Settings' groups) | `ui-tabs ui-tabs--rows` (2.18): the same tabs on full rows, two to a row on a phone, then three, then all six, by the strip's own width. Six is the most; a seventh view means the page is two pages |
| The page's state and main action | `ui-faceplate` with `ui-readout`, `ui-chip`, `ui-btn--primary` |
| Lists of things | `ui-rows` / `ui-row--lamp` (lamp, value, one action on the right) |
| Comparing records | `ui-table`, `ui-table__num`, `ui-table--stack` (2.7) |
| An icon-only control | `ui-btn--icon` (2.7) with `aria-label` |
| What needs the owner | `ApplianceNeeds.renderList` (`ui-needs`), the only Needs-you list |
| Status | `ui-chip--ok/warn/bad/unknown`, with `--live` for something running now |
| Progress | `ui-meter`, only with a real fraction |
| Loading | `ui-skeleton` in the shape of what is coming |
| Empty | `ui-empty`: what's missing, and what to do next |
| An error or warning | `ui-notice--bad/warn`, beside what it affects |
| A risky action | `ApplianceConfirm.ask` (`ui-confirm`, inline) |
| Search and go | `AppliancePalette` (⌘K) |
| Foot | `ui-tools` (Open in), `ui-sources` |
| The way back from one of the platform's own pages outside the frame | `ui-backbar` (2.21): `<nav class="ui-backbar" aria-label="Pi Hub">` with one link, "← Pi Hub", the first thing in the document. Not sticky. Never on another product's page |

- **Buttons:**
  - One primary per area.
  - Labels are specific verbs ("Clear the plate", "Judge it"), never "Submit", "OK" or "Open" alone. The toast uses the
    same verb in the past tense ("Restarted Plex").
  - An icon-only control is `ui-btn--icon`: square (40 px, 44 on touch), outlined in `fieldLine` (3:1), with an
    `aria-label`. Its label also has to be visible somewhere that doesn't depend on hover (beside it at wider sizes, or
    in the palette). A familiar icon (search, refresh, close) is the only kind that goes without words.
- **Status:** colour always comes with a word or an icon that means it. Unknown is never shown as Off, Healthy, Idle or
  Complete.
- **Risky actions** (a restart, sign-out, deleting, dropping an experiment) ask inline with `confirm.js`. The ask says
  what will happen to which thing, and repeats the verb on a danger button. Routine and reversible actions don't ask. A
  modal dialog or sheet is for a focused task (record a verdict, add a movie): it traps focus, closes with Escape, and
  returns focus to the control that opened it.
- **Feedback:**
  - A toast is for light confirmation.
  - An unresolved failure or blocking condition stays visible beside the thing it affects until it is resolved.

## Honest states

| State | Means | Shown as |
|---|---|---|
| Live | Read just now from its source | `ok`/`warn`/`bad` lamp; `--live` while running |
| Stale | The last good reading, too old to trust | `unknown` lamp, "last seen 12m ago", and a `ui-notice--warn` above the faceplate saying how old and why |
| Unavailable | The source isn't answering now | The phrase table's words (`source_down`, `pc_off`, `pc_waking`, `assistant_down`). A sleeping PC is normal, so `pc_off` says "asleep", never "down". Never an empty list: a list from a down source says it couldn't be read |
| Unknown | Never read, or unreadable | `unknown` lamp, "Not reported" (`unknown_release`) or "Unknown" |
| Demonstration | Sample data, a prototype, a dry run | Labelled "Sample data" in the head, and never mixed with live data on one screen |

- **Never invent a number.** A progress fraction, an estimate or a healthy state only comes from a source that gave it.
  An estimate says "about" and where it came from. A target of 0 is no target.
- **Freshness shows where trust depends on it:** the sources line always shows it, and a reading shows it once it is old.
- **Actions have three steps:** sent, accepted, done. While an action is pending, its control is disabled and says
  what it is waiting for ("Waiting for the Mac…"). A request a device hasn't picked up says so (`mac_waiting`), and
  never shows a success it didn't get.
- **A failed request keeps what the owner typed,** says what went wrong, and offers the way out (Try again, Sign in).
- **An unavailable action** stays visible but disabled, with the reason beside it ("Only the owner can …").
- **Device actions** follow the app's control and safety rules (owner-only printer actions, confirm on stop).

## Accessibility

- **Contrast:** 4.5:1 for text and 3:1 for large text, focus rings, field borders and status marks, measured in
  `docs/contrast.md`. Any new pairing is measured before it ships.
- **More contrast:** when the person asks their device for more contrast (`prefers-contrast: more`), the kit's values
  answer, so every part that reads them follows without a rule of its own: `muted` is drawn as `text`, `line` as `line2`
  and `line2` as `fieldLine`, in both themes (2.22; `contrastMore` in `tokens.json`). Each is a colour the kit already
  measures. An app never writes its own more-contrast colours; a part that needs more than this is a kit change.
- **Focus:** a visible ring (`2px` accent, offset `2px`) that is never clipped or covered. Check it in strips, inside
  overflow containers and under sticky headers. A page that refreshes itself puts focus back where it was. A redraw
  never drops a keyboard user to the top.
- **Keyboard:**
  - Tab order follows the reading order, and native controls keep their native keys.
  - A scrolling region either can take focus or doesn't scroll (prefer wrapping).
- **Meaning:** never by colour, hover or motion alone.
- **Markup:**
  - Semantic HTML first: buttons for actions, links for places, `<label>`s and accessible names.
  - ARIA only where native semantics fall short.
- **Targets:** 44 × 44 px on touch; 48 px on the workshop display.
- **Motion:** `prefers-reduced-motion` turns animations into instant changes.
- **Dialogs:** they trap focus and return it to the control that opened them.

## Before a screen is done

Sweep it from 320 to 2560 px in 20 px steps, in dark and light, with real data (A10 D6): no horizontal overflow, no
clipped text, no control under its target, and no two neighbouring marks or labels overlapping. Take screenshots at
320, 390, 820, 1024, 1366, 1440 and 1920 px for a person to look at (and 480 × 320 for the display):

- **Content:** long names, missing values and a target of 0. Anything drawn against time is checked with a busy day's
  data across the sweep: marks don't merge, and labels don't touch or wrap.
- **States:** a stale source, a down source, a pending action, a failed action, loading and empty.
- **Keyboard and focus:** keyboard only, with focus visible throughout.
- **Automated checks:** axe with no serious or critical findings, and no horizontal overflow.
- **Differences:** say which component, token or interaction differs from this contract, and why.

## References

- **Token stylesheet:** `dist/tokens.css` (built from `tokens.json`) and `dist/components.css`.
- **Measured contrast:** `docs/contrast.md`.
- **Reference screens** (`npm run screens` retakes them):
  - `demo/screens/page-{desktop,phone}-{dark,light}.png`: the A7 page.
  - `demo/screens/demo-{desktop,phone}-{dark,light}.png`: every component.
- **The interactive prototype** of every page: https://claude.ai/artifact/9iRwv9Pe7zMabRZFKtec9V.
- **The look's rationale:** `docs/superpowers/specs/2026-11-01-faceplate-design.md`.

## Decided differences

These were open in the first draft of this contract. They were settled on 5 Nov 2026 as recommended:

1. **Running work's lamp** stays as the kit draws it: `ok` with `--live` (green, pulsing) means "running and fine".
   Queued or waiting work that needs nothing from the owner is `unknown` (neutral). Anything that needs the owner is
   `warn` or `bad`. This keeps the Faceplate spec as approved, with no amendment.
2. **Tables** are `ui-table` (kit 2.7.0).
3. **Icon-only buttons** are `ui-btn--icon` (kit 2.7.0), with a `fieldLine` outline at 3:1.
4. **The workshop display** doesn't load the kit yet (`assets/ui` is staged). Since 2.11 the kit ships the display's
   parts (`dist/display/`); its screens move onto them in the display repo's own steps (display-kit rollout 3 to 5), and
   follow the display rules above by hand until they do.

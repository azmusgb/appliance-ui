# Home Platform design contract

The rules every screen follows: Pi Hub, the Assistant (Local AI) and the Workshop (the display and Workshop OS). A new
screen should look and behave like part of the same product. Agents building UI in any of these repos read this file
first.

**What wins when sources disagree.** The platform baseline and its approved amendments
(`pi-hub/docs/superpowers/specs/2026-11-01-platform-product-architecture-design.md`, notably A6 and A7) come first. The
kit's specs come next (`docs/superpowers/specs/`, Faceplate). This contract comes after both. It restates their rules in
working form and adds the ones they leave open. A rule here that changes what an approved spec says needs an amendment.
Changing this file is not enough. Where this contract and the shipped kit differ today, the difference is listed under
"Open differences" at the end, and nothing else is assumed.

## The product

Pi Hub is the household front door. The Assistant provides intelligence and engineering tools, and opens inside Pi
Hub's shell at `/assistant` (A4 step 7a). The Workshop is for hands-on work: the printer, filament and Print lab on Pi
Hub, and the 480 × 320 workshop display. They share one look (this kit), one vocabulary (the spec's section 9 and the
phrase table in `src/needs.js`) and one set of interaction patterns. Each adapts to its user and device.

The feel is calm, dependable and easy to understand: a well-made instrument, not a dashboard.

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
- **Scale** (`fs1`–`fs7`: 12, 13, 14, 16, 20, 26, 34 px):

  | Role | Size |
  |---|---|
  | Page title | `fs6`–`fs7` |
  | Section heading | `fs5` |
  | Body | `fs3`–`fs4` |
  | Label | `fs2` |
  | Supporting text | `fs2` |
  | Readout | `ui-readout` sizes |

  `fs1` (12 px) is the floor, for meta lines only.
- **Writing:** sentence case everywhere. No all-caps labels and no tracked-out eyebrows above headings.
- **Numbers that change** (temperatures, progress, counts in columns) use tabular numerals.
- **Words:** the spec's section 9 names (Filament, Assistant status, In progress, Print lab, …) and the phrase-table
  keys. A screen never invents its own term for a platform thing.

### Space and shape

- **Spacing:** 4 px steps (`--ui-space` × n). Related things are close (4–8), groups are separated (16–24), and sections
  are separated more (32+).
- **Radii:**
  - `r2` (6) for the faceplate and panels
  - `r3` (9) for controls
  - `r1` (4) for small marks
  - `r4` (14) for sheets

  Controls are rounder than the panels they sit in.
- **Control heights:** 40 px, and 44 px on a coarse pointer (`ui-btn` and `ui-field` do this). Icons are 16 or 20 px.
- **Shadows** only for things above the page: sheets, dialogs, the palette, toasts.
- **No panel inside a panel.** A heading and spacing say what belongs together.

## Layout

### The page (A7 P1)

Every page in Pi Hub and the Assistant is drawn in this order, and nothing else (`ui-page`, `demo/page.html`):

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

### Order and density

- **Summary first,** then the exceptions that need action, then detail.
- **No KPI tiles, charts or feeds** unless they support a decision the owner actually makes on that page.
- **Rows** (`ui-row--lamp`) suit lists of things.
- **Tables** suit comparison: many records with the same columns (Versions, Alerts history, filament spools). Use a
  semantic `<table>` with a caption and header cells, and numeric columns right-aligned with tabular numerals. On a
  phone a table becomes rows. The kit has no table component yet (see "Open differences").
- **Household pages are approachable** (plain words, few numbers). **Engineering pages** (Print lab, Assistant runs) are
  precise: exact values and units, with the technical detail one click away.

### Navigation

- **The shell is constant:** the rail (or the phone tab bar), the page head and the strip.
- **Pages in the shell** are links. Only another product's tool opens with "↗".
- **Selection carries between related views.** The selected project, experiment, device or run carries in the URL
  (`?p=`, `?e=`, `#lab-E-025`), so Back, refresh and a shared link land in the same place.
- **Layouts adapt to the width.** They never shrink the desktop design:
  - **Under 560 px:** the strip wraps, readings stack, and tables become rows.
  - **From 760 px:** the faceplate's aside sits beside it.

### The workshop display (480 × 320, touch)

It has its own layouts, not a shrunken page:

- one reading or one decision per screen
- 48 px or larger targets, with 8 px or more between them
- labels of one to three words
- at most two levels deep, with Back and Home always visible in the same place
- no hover, no tables, and no text under 14 px

Colours come from the same tokens (`tokens.h` RGB565 from the build). The same honest states apply: a reading the
display can't refresh says how old it is.

## Components

Reuse the kit and the app's existing components. Read the implementation before adding anything. A new shared pattern
is added to this kit, never to one app.

| Need | Use |
|---|---|
| Page head, strip, filters | `ui-page__head`, `ui-strip`, `ui-chips` |
| The page's state and main action | `ui-faceplate` with `ui-readout`, `ui-chip`, `ui-btn--primary` |
| Lists of things | `ui-rows` / `ui-row--lamp` (lamp, value, one action on the right) |
| What needs the owner | `ApplianceNeeds.renderList` (`ui-needs`), the only Needs-you list |
| Status | `ui-chip--ok/warn/bad/unknown`, with `--live` for something running now |
| Progress | `ui-meter`, only with a real fraction |
| Loading | `ui-skeleton` in the shape of what is coming |
| Empty | `ui-empty`: what's missing, and what to do next |
| An error or warning | `ui-notice--bad/warn`, beside what it affects |
| A risky action | `ApplianceConfirm.ask` (`ui-confirm`, inline) |
| Search and go | `AppliancePalette` (⌘K) |
| Foot | `ui-tools` (Open in), `ui-sources` |

- **Buttons:**
  - One primary per area.
  - Labels are specific verbs ("Clear the plate", "Judge it"), never "Submit", "OK" or "Open" alone. The toast uses the
    same verb in the past tense ("Restarted Plex").
  - An icon-only control has an accessible name and a visible label or tooltip that also works without hover (a long
    press, or a label at the larger sizes).
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
| Unavailable | The source isn't answering now | The phrase table's words (`source_down`, `pc_off`, `assistant_down`). Never an empty list: a list from a down source says it couldn't be read |
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
- **Focus:** a visible ring (`2px` accent, offset `2px`) that is never clipped or covered. Check it in strips, inside
  overflow containers and under sticky headers.
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

Check it at 390, 1024 and 1440 px (and 480 × 320 for the display), in dark and light, with real data:

- **Content:** long names, missing values and a target of 0.
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

## Open differences

These are differences between this contract and what ships today. Each needs the owner's decision or a kit change
before a screen relies on it:

1. **Running work's lamp.** This contract says running and queued work are neutral unless they need the owner. The kit
   draws something running as `ok` with `--live` (a pulse). Keeping the green live lamp says "running and fine". The
   alternative is a neutral `--live` lamp, and green only for "done and fine". Changing it touches the Faceplate spec,
   so it needs an amendment.
2. **Tables.** No `ui-table` component yet. Until one exists, a table uses the rules above with the app's own styles,
   and is a candidate for the kit.
3. **Icon-only buttons.** A ghost button's border (`line2`, 1.5–2.1:1) is decoration: fine for a labelled button,
   too faint to be the only outline of an icon. An icon-only control uses the well (`surface2`) or a `fieldLine` border
   (3:1+). A `ui-btn--icon` would make this the default.
4. **The workshop display** doesn't load the kit yet (`assets/ui` is staged). Its layouts follow the display rules above,
   by hand, until it does.

# appliance-ui

The home appliance's shared look — colours, type, components, the Needs-you renderer — and the house's one list of
tools, as one source that is copied into each app: Home (Pi Hub), Assistant (Local AI) and Workshop (Workshop OS).

2.0.0 retired the `<appliance-header>` (platform D3: the shared header is not navigation; no app loaded it). Its useful
half, the list of tools, is now the registry below, and the next sync removes each app's header copy.

Design: [`docs/superpowers/specs/2026-10-24-shared-look-design.md`](docs/superpowers/specs/2026-10-24-shared-look-design.md),
with the look replaced in 1.4.0 by [Faceplate](docs/superpowers/specs/2026-11-01-faceplate-design.md): graphite and
coolant teal, Archivo with narrow readouts and headings, status lamps, low-radius panels under rounder controls.

**Building a screen?** Read [`DESIGN.md`](DESIGN.md), the design contract for every app, and
[`docs/contrast.md`](docs/contrast.md), the measured contrast of every colour pair (generated; `npm run contrast`).

## Components (1.4)

| Class | Use |
|---|---|
| `ui-card` | A panel: something you work in. Lists and readings sit on the page without one. |
| `ui-title` | A section or panel heading (narrow). |
| `ui-readout`, `--md`, `--sm`, `__unit` | A reading: `<p class="ui-readout">42<span class="ui-readout__unit">%</span></p>`. |
| `ui-chip`, `--ok`/`--warn`/`--bad`/`--unknown`, `--live` | A status lamp: dot plus word. `--live` for something running now. |
| `ui-btn`, `--primary`/`--ghost`/`--danger` | Buttons; one primary per panel. |
| `ui-field` | Text input; `aria-invalid="true"` and `disabled` are styled. |
| `ui-meter` | Progress: `<span class="ui-meter"><i style="width:42%"></i></span>`. |
| `ui-row` | A list row; its last child sits at the end. |
| `ui-notice`, `--bad`/`--warn` | An error or warning, said where it happened. |
| `ui-skeleton` | A loading placeholder. |
| `ui-empty` | An empty list, with what to do next. |
| `ui-beam`, `--bad` (2.5) | The one card that needs a look: a faint edge in the warn (or bad) colour; with motion welcome a slow light turns along it. Never on a list or more than one card. |

On a touch screen (`pointer: coarse`) `ui-btn` and `ui-field` are 44 px tall (2.5).

## One page (2.6)

Pi Hub amendment A7: every page in every app is drawn in this order, and nothing else. `demo/page.html` shows it.

| Class | Use |
|---|---|
| `ui-page` | The page: head, strip, [notice], one faceplate, Needs you here, at most six sections, Open in, sources. |
| `ui-page__head`, `__title`, `__purpose`, `__tool` | The title, one line of purpose, and the search button beside them. |
| `ui-strip` | Level 2: an underlined strip of the area's pages; the current one has `aria-current="page"`. |
| `ui-chips` | Filters and settings groups: buttons with `aria-pressed`, or links with `aria-current`. |
| `ui-faceplate`, `--aside` | The page's only panel. `__main` holds `__nameplate` (name and lamp), the `ui-readout`, `__caption`, `__readings` (a `dl`) and `__actions`; `__aside` (a camera) sits beside it from 760 px. |
| `ui-section`, `__note` | A heading (`h2`) and rows on the page, no card. |
| `ui-rows`, `ui-row--lamp`, `ui-row__title`/`__detail`/`__value` | A row with its text first, then lamp, value and one action on the right, so titles line up. |
| `ui-tools` | "Open in": the area's tools. |
| `ui-sources` | The foot: each source with its lamp, and the Site map link. |
| `ui-confirm`, `__what` | The inline confirm that `confirm.js` draws. |

`confirm.js`: `ApplianceConfirm.ask(button, {what})` resolves `true` or `false`. It opens a line under the button's row
saying what will happen, with the button's own words again (danger if the button is) and Cancel. Escape cancels, and focus
comes back to the button. The app runs the action and says it in the past tense ("Restarted Plex").

`needs.js` (2.6) adds verb actions (`judge_it`, `open_printer`, `open_network`, `see_usage`) and a meta line
`since <as_of> · <area>`, where the area falls back to the source when the item isn't this app's own.

## Tables and icon buttons (2.7)

| Class | Use |
|---|---|
| `ui-table`, `__num` | A `<table>` for comparing records: caption and column heads muted, number columns right-aligned and tabular. |
| `ui-table--stack` | On a phone (under 600 px) each row stands alone, each cell's `data-label` beside its value. Keep the `role="table"`/`row`/`cell`/`columnheader` markup. |
| `ui-btn--icon` | An icon-only button: 40 px square (44 on touch), outlined in `fieldLine` (3:1), with an `aria-label`. |

`demo/page.html` shows both (History, and the refresh button in the head).

`npm run screens` rebuilds and retakes `demo/screens/`.

## The display's measure and words (2.10)

The Workshop display is the third surface (display-kit spec, K2 and K4); 2.10 changes no token, class or phrase the web
apps use.

- `docs/contrast.md` has a **Display (RGB565)** column: each dark colour truncated to 5/6/5 bits as `tokens.h` packs it,
  expanded back to 8 by bit replication, tints mixed from those and rounded again, then measured. The build and
  `npm test` refuse a pair that drops under its minimum (4.5:1 text, 3:1 lamps, rings and fields) after rounding.
- `words.h` (C and C++): `UI_WORD_UP`, `_DOWN`, `_UNKNOWN`, `_RUNNING`, `_WAITING`, and the age rules
  (`UI_AGE_RULES`, `UI_AGE_SINCE_FMT`): "now" under a minute, "4 min ago" under an hour, then "since 10:32".
- `needs.h` (C and C++): `UI_NEED_<KEY>` per phrase and `UI_NEED_PHRASES` (`key`, `text`); `{name}` stays in the text.
- Both come from one table with the web: the state words and age rules are `src/words.json`, which the build also puts
  into `dist/needs.js` (`ApplianceNeeds.WORDS`, `ApplianceNeeds.ago(seconds)`; the meta line reads its "since …" from
  it), and the phrases are `ApplianceNeeds.PHRASES`. `dist/needs.js` is the file to run; `src/needs.js` holds a
  placeholder the build fills.

## The display kit (2.11)

`dist/display/` is the workshop display's parts: header-only C++17 that draws through a small `UiCanvas` the display repo
implements over LovyanGFX. `Faceplate`, `LampRow`, `Chip`, `Button`, `NeedsRow`, `AgeLine`, `Meter` and `Frame` (K5); a
`Reading` that makes "Unknown" impossible to draw as ok (K6); `Stepper`, `Switch` and `Picker` (K9); `Tabs` (2.12, the strip of a screen's views); and the Archivo VLW
fonts (K3). Read [`dist/display/README.md`](dist/display/README.md) (source: `src/display/README.md`) for the API.

- `npm run display` compiles the parts on the Mac, runs their checks, renders every part in every state and compares
  with `demo/screens/display/*.png`; `npm run display:update` rewrites those images on purpose. It is part of `npm test`.
- `npm run fonts` regenerates `dist/display/fonts/*.vlw` and `fonts.h` from `fonts/archivo-latin-ui.woff2`. It needs
  Python with Pillow, a dev-only dependency of that script; the files are committed, so nothing else needs it.
- `node scripts/sync.mjs <repo> --dir <folder> --display` copies the display kit with the rest (the web apps' sync leaves it out).
- 2.11 also adds `UI_TEXT_*` control words to `words.h` (Back, Home, On, Off, Previous, Next, "Current setting unknown",
  "Not saved", "Nothing to choose") and measures text on `bar` (the header) in `docs/contrast.md`.

## Values changed from the spec

The build refuses text/background pairs below WCAG AA (4.5:1). Light-mode values the spec listed that failed, and what
ships instead:

| Token | Spec | Ships | Why |
|---|---|---|---|
| `ok` (light) | `#1f8a5b` | `#17784e` | 4.04 on the canvas |
| `warn` (light) | `#a96500` | `#946000` | 4.30 on the canvas |
| `accent` (light) | `#1f7fd6` | `#1a6fc4` | white label on it was 4.15 |

Since 1.1.0 the gate also checks status text on its own tint (chips and the header badge at 18%, the danger button at 16%)
at 4.5:1, and field borders (`fieldLine`) at 3:1. Light values that changed in 1.1.0:

| Token | 1.0 | 1.1 | Why |
|---|---|---|---|
| `ok` (light) | `#17784e` | `#126a45` | chip on the canvas was 3.99 |
| `warn` (light) | `#946000` | `#815300` | chip on the canvas was 3.91 |
| `bad` (light) | `#c9372c` | `#b02a20` | chip 3.68, danger button 3.80 |
| `unknown` (light) | `#5b6878` | `#505c6b` | chip on the canvas was 4.18 |
| `accentText` (light, 1.1.1) | `#1a6dba` | `#1866b0` | a selected tab on its accent tint was 4.45 |
| `fieldLine` (new) | `line2` | dark `#5b6c82`, light `#7f8b9b` | field borders were 1.45–1.71 |

In 1.4.0 the whole palette changed (Faceplate); every value passes the same gate, and the older gate tests run on the
1.3 backgrounds they were measured on.

Since 1.2.0 every check also runs on the well (`surface2`, behind buttons and meters), and accent text is checked on
`accentSoft` as the apps lay it (an rgba over the background), not only on a 14% accent mix. Values that changed:

| Token | 1.1 | 1.2 | Why |
|---|---|---|---|
| `accentText` (light) | `#1866b0` | `#1761a7` | on `accentSoft` over the well was 4.47 |
| `ok` (light) | `#126a45` | `#126743` | chip on the well was 4.33 |
| `warn` (light) | `#815300` | `#7d5100` | chip on the well was 4.34 |
| `bad` (light) | `#b02a20` | `#a7281e` | chip on the well 4.20, danger button 4.34 |
| `fieldLine` (light) | `#7f8b9b` | `#7d8999` | on the well was 2.94 |
| `bad` (dark) | `#ff6b63` | `#ff736c` | chip on the well was 4.33, danger button 4.49 |
| `unknown` (dark) | `#93a1b3` | `#97a5b6` | chip on the well was 4.33 |
| `fieldLine` (dark) | `#5b6c82` | `#5d6e84` | on the well was 2.92 |

`--ui-header-total` is the header's height plus the notch (`env(safe-area-inset-top)`): offset sticky content by it.

## Use

```sh
npm ci && npm test                      # build dist/ and run every check
node scripts/sync.mjs <app-repo> --dir <folder>   # copy into an app (writes <folder>/VERSION)
node scripts/sync.mjs --status ~/dev/pi-hub:hub/static/ui ~/dev/ai-harness/LocalAI:app/public/ui \
  ~/dev/bambuhelper-smart-display:assets/ui ~/dev/print-lab:tools/ui
```

| App | Folder | Its test runs |
|---|---|---|
| Home (Pi Hub) | `hub/static/ui` | `python3 hub/static/ui/verify.py hub/static/ui` |
| Assistant (Local AI) | `app/public/ui` | `node app/public/ui/verify.mjs app/public/ui` |
| Workshop OS | `assets/ui` | `python3 assets/ui/verify.py assets/ui` (staged: the portal and firmware don't load it yet) |
| print-lab | `tools/ui` | `python3 tools/ui/verify.py tools/ui` (Camera fit serves it at `/ui/`; the Fusion panel links it by a relative path) |

In a page: load `tokens.css` and `components.css` from that folder.

## The literals check (2.20)

`literals.mjs` is copied into each app beside `verify.mjs`. It counts what the app wrote by hand instead of taking from
the kit (Pi Hub amendment A22 1.5) and holds each file to the count in the app's baseline:

```sh
node <folder>/literals.mjs <the app's interface folder>…    # 0: every count matches; 1: one rose or fell
node <folder>/literals.mjs <…> --list                       # every finding: path:line, category, text
node <folder>/literals.mjs <…> --write-baseline             # the first baseline, or lower counts; never a higher one
node <folder>/literals.mjs <…> --remeasure                  # after a sync that changed the rules: measure again
```

| Category | Rejected | Use instead |
|---|---|---|
| `colour` | hex, `rgb()`, `hsl()` and the other colour functions, a named colour | `var(--ui-*)`, `color-mix()` of kit values, `transparent`, `currentColor` |
| `type` | `font-size` or `font` with a px, rem or em number | `var(--ui-fs-N)` |
| `space` | `margin*`, `padding*`, `gap`, `inset*` with a non-zero px, rem or em number | `var(--ui-s-N)`, `calc()` of kit values, `0`, `auto`, `env()` |
| `radius` | a radius with a number | `var(--ui-r-N)`, `var(--ui-r-pill)`, `0`, `50%` |
| `shadow` | a literal `box-shadow` | `var(--ui-shadow-N)`, `none` |
| `motion` | a literal duration or easing in `transition*` or `animation*` | `var(--ui-dur-N)`, `var(--ui-ease)` |
| `layer` | a `z-index` other than `0`, `1`, `-1` | `var(--ui-z-*)` |
| `name` | a custom property that is not `--ui-*` | a kit value, or a per-instance name in the allow list |

- **The baseline** (`.kit-literals-baseline.json`, in the app's root) holds the kit version that measured it and a
  count per file and category. A count that rises fails. A count that falls fails until the baseline is lowered in the
  same change. A new file starts at zero. A file that is gone must leave the baseline. A renamed file is a new file:
  move its counts by hand, where the diff shows it.
- **The allow list** (`.kit-literals-allow.json`): `files` are paths (`*` within a folder, `**` across folders) that
  are art or third-party code, not interface; `names` are per-instance custom properties (`--pct`, `--wall-*`). Adding
  to either needs a sentence in the PR saying why. An allowed name may still not carry a literal colour.
- **What it reads:** a `.css` file, a `<style>` block and a `style="…"` attribute in every category; a script for
  colour literals, and its `style="…"` attributes for the rest; a page's `fill`, `stroke`, `color`, `stop-color`,
  `flood-color`, `bgcolor` and `content` attributes for colours. The kit's own folder is skipped.
- **What it cannot see:** a size a script sets through `element.style`, and a colour a script builds from numbers. It
  is a text scan, so in a script an element id such as `'#fed'` reads as a colour.
- The kit holds itself to the same check: `npm run literals` over `src/`, in `npm test`.

## Keeping copies current

`npm run drift` reads each consumer's `main` on GitHub (with `gh`; the list is `consumers.json`) and prints one
tab-separated line per consumer: name, state, a sentence. `node scripts/drift.mjs --only <name>` prints just that
consumer, which is what a consumer's own preflight calls.

| State | Meaning | Exit |
|---|---|---|
| `current` | the copy is this kit's version | 0 |
| `ahead` | the copy is newer than this kit | 0 |
| `behind-skippable` | behind, and every release between is marked skippable | 0 |
| `unclassified` | behind, and a release between has no CHANGELOG entry (or predates the classified-from marker) | 0 |
| `behind-needs-change` | behind across a release marked "needs consumer change"; the line says what to do | 1 |
| `modified` | a file in the copy no longer matches the hash in its `VERSION`; the line names the files | 1 |
| `unknown-copy` | `VERSION` is missing or not a version | 1 |
| `unreachable` | `gh` could not read the consumer; the line reads "unknown" | 0 |

An unreachable consumer never fails the check, so a preflight does not block on the network. An unknown `--only` name
exits 64.

To catch a consumer up, run this from the kit repo, giving the consumer's checkout (`--pr` makes its own worktree):

```sh
node scripts/sync.mjs <consumer checkout> --dir <folder> --pr --dry-run   # print the steps, run nothing
node scripts/sync.mjs <consumer checkout> --dir <folder> --pr             # open the kit-sync PR
```

`--pr` makes a `kit-sync-<version>` branch in a new `wt new` worktree of the consumer, copies the kit in, runs the
consumer's own check from `consumers.json` (the PR body says "Check: not run on the Mac" when there is none), commits,
pushes that branch and opens a PR against `main`. The PR body lists each release from the consumer's version to this one
as skippable, "needs consumer change: ...", or "unclassified: read the diff". It never merges: you do, after reading the
list. If the consumer's `main` already has this version it stops without opening a PR.

`CHANGELOG.md` is where a release is classified. A release author adds one entry per new kit version, newest first:
`## X.Y.Z — skippable` (a consumer can move past it without touching its own code) or
`## X.Y.Z — needs consumer change (web): <what to do>` / `(display): <what to do>`. The audience names the kit whose
consumers must act (each entry in `consumers.json` has `"kit": "web"` or `"display"`); a release for the other kit is
skippable for that consumer. Leave the audience off only when everyone must act, and when unsure write
"needs consumer change" with no audience. The drift check reads this
file, and a missing entry for the kit's current version reads "unclassified". Releases at or below 2.7.0 were never
classified.

## Tools (2.0)

`tools.json` is the one list of the house's tools (platform step 7, Decision 6): per tool an `id`, `name`, `host`,
`area` (a Pi Hub area of `pages.json`: `home`, `workshop`, `household`, `network`, `system`; or `assistant`) and `purpose`. Every host is
`<id>.rahe-home.duckdns.org`, except the display's D4 compatibility boundary (`display`, `ota`), which stays on
`home.arpa` and is marked `"boundary": "D4"` until a firmware release can use the real name. The build refuses a
duplicate id, a host off the real name outside D4 and outside tools, an unknown area or field, and non-ASCII text.
A tool that is not behind the house's gate (Plex, which opens in Plex's own web app) is marked `"external": true` and
keeps its own `host` and `base` path (`app.plex.tv`, `/desktop`); `toolUrl` joins a path onto the base.
A tool reached through the Assistant (n8n, ComfyUI on the PC) has `via`, a `/go/<name>` path on the Assistant's origin,
in place of a host. A tool marked `"retired": true` stays in the list (the Site map's "No longer used") and is in no
"Open in" row.

- `tools.js` (ES module, Pi Hub and Local AI): `TOOLS`, `tool(id)`, `toolUrl(id, path)` (null for an unknown id) and
  `toolsFor(area)`, an area's tools without the D4 hosts and the retired ones.
- `tools.h` (C, the Workshop display; used from step 8): `UI_TOOL_<ID>_HOST` (or `_VIA`), `_NAME`, `_BOUNDARY`, `UI_TOOL_COUNT`.

## Pages (2.17)

`pages.json` is the one list of the site's pages (Pi Hub amendment A22, section 3). A page's name, its one-line
purpose and its address are written there and nowhere else; the rail, strips, ⌘K, the Site map and the old-address
redirects are drawn from it.

- `areas`: the rail's entries in order, each with its `label` and the page it lands on.
- `pages`: per row an `id`, `system` (`hub`, `assistant`, `mac`), `area` (and `section` and `view` for an Assistant
  page), `label`, `purpose`, `path`, `role`, `parent` (for a tab, filter, mode or detail), `reach` (every visible way
  in), `aliases` (old addresses that redirect to it), `tools` (ids in `tools.json`: its "Open in" row) and `needs`
  (`pc` or `mac`). `drawn: "hub"` (2.30, an Assistant page only): see "A page Pi Hub draws" below. `"built": false` marks a row whose page a later step builds; nothing draws it.
### A page Pi Hub draws (`drawn: "hub"`, 2.30)

`drawn: "hub"` says who paints a page, not where it lives. It changes one thing for a consumer: the page opens while the
workstation is asleep, drawn from what Pi Hub last read, with its age. It changes nothing else:
- **Routing is unchanged.** The row keeps its `system: assistant`, its `/assistant/...` path, its `view`, aliases and
  `reach`; the palette, Site map and redirects read it as before. Pi Hub serves the same address itself.
- **Parents are unchanged.** `parent`, `section`, `area` and the card it opens from stay as written (`run` stays a detail of
  `work`; `status` and `models` stay details of `assistant-system`, whose other cards stay framed). That is why the row is
  marked and not moved to `system: hub`: the build requires a page and its parent to share a system.
- **Workstation availability is unchanged.** `needs: pc` is required on a drawn row (the build refuses it without). It now
  means: the page's live data and every action (start, cancel, retry, change a setting) need the workstation. A drawn page
  with the PC asleep shows what it last read with its age, disables each action with the reason, and says "needs the PC"
  for a read it never kept. A page marked `needs: pc` and not drawn is still unavailable while the PC sleeps.
- Today: `status`, `models` and `run` (named Task). A consumer that ignores the field behaves as before.

- Roles: `page` (in its area's strip), `tab`, `filter`, `mode`, `detail` (opened from a card: `card:<page id>`),
  `ambient` (no frame) and `standalone` (outside the frame on purpose). Every row has `palette` and `map` in `reach`.
- `cards` (2.26, on an Assistant page): tools that open in place on that page and are no page of their own, each with
  an `id`, `label`, `purpose`, `path` and `view`. Developer tools holds its five tools this way.
- `redirects` (2.26): a retired page id and where it goes now: `to` (a page), plus `stage` (a stage of Changes to filter
  by) or `card` (a card of that page), and `path` when the old address is no longer a live one. The build refuses a
  redirect whose id is still a page, whose target or card does not exist, or whose path is a live address.

The build refuses a page with no way in, a tab without a parent, two rows on one address (a page and its first tab
may share one), an alias with two owners, a strip of more than six pages (System: eight), and a tool that is not in
`tools.json`, is retired, or is on no page. `tests/pages-words.test.mjs` keeps the names: no two pages share a label,
labels are sentence case, and none is a retired word.

- `pages.json`: the list without its comment, for a server or a test to read.
- `pages.js` (ES module): `AREAS`, `PAGES`, `REDIRECTS`, `page(id)` and `redirect(id)`.

## Decisions and provenance (2.33)

Pi Hub amendment A35. `ApplianceNeeds.renderDecisions` draws `choice`, `text`, `multi` (boxes and one Send; the answer
is a list) and `yesno`; any other kind is drawn disabled with its reason. `ApplianceNeeds.provenance(level, {when,
source})` returns one `ui-prov` label saying where a fact came from: `live`, `reported`, `checked`, `imported`, `owner`
or `unavailable` (A35 §7.1; DESIGN.md "Honest states"). Only `live` draws a lamp.

A hub `detail` row's address may end in one `<value>` (`/missions/<initiative>`), as an Assistant run's does. It has no
⌘K or Site map entry of its own; a consumer matches it as a pattern.

## Palette (2.1)

`palette.js` and `palette.css` are the one ⌘K palette (platform spec section 8.1, step 7 Decision 7). Each app registers
its own providers; there is no central search, so Pi Hub works while the PC sleeps and the Assistant works without the Pi.
Load `palette.css` after `tokens.css` and `components.css`, and `palette.js` as a classic script (it sets
`window.AppliancePalette`):

```js
const palette = AppliancePalette.create({
  providers: [{ name: 'Pi Hub', down: 'The PC is asleep', timeout: 4000, find: (query, { signal }) => results }],
  navigate: href => router.go(href),          // same-origin links; default location.assign
  confirm: (question, result) => askSheet(question),  // default window.confirm
  recentKey: 'pihub.palette.recent',          // localStorage key for "recent pages first"
  label: 'Search and go', placeholder: 'Search or go to…',
});
searchButton.onclick = () => palette.open();  // the phone header's search icon; open(query) prefills
```

- **Opens** with ⌘K or Ctrl+K anywhere and "/" when not typing, in a native modal `<dialog>` (the page behind is inert);
  focus returns to whatever opened it. The input is a `combobox` over a `listbox`.
- **Keys:** arrows move (and wrap), Enter runs, Esc closes. The open animation runs only without `prefers-reduced-motion`.
- **A result** is `{kind, label, hint?, area?, href | run, confirm?, at?}`, `kind` one of `go`, `do`, `find`, `ask`,
  `search`. `href` is a same-origin path or an absolute http(s) URL (another origin opens in a new tab with "↗"); anything
  else is dropped. `run` is a function; `confirm` (true or the question) asks first. Labels go in as text.
- **Order:** an exact `do` match, then `go`, `do`, `find`, `ask`, `search`; ties by `at` (newest first), then as given.
  An empty query shows the recent pages first; on a phone (≤760 px) at most eight rows.
- **A provider that throws, rejects or passes its `timeout`** shows one line, its `down` text or "{name} isn't
  answering", never an empty list. The other providers' results still show.

Approving an Assistant run is never a palette action (spec section 8.2): a provider returns a `go` to the approval sheet.

## Motion (2.5)

`backbar.js` (a classic script; it sets `window.ApplianceBackbar`, 2.21) is optional beside `ui-backbar`: it sends a
visitor who came from a Pi Hub page back to that page, and never anywhere else.

`motion.js` (a classic script; it sets `window.ApplianceMotion`) holds the kit's one bit of number motion.
`ApplianceMotion.countTo(el, to, {duration, decimals, format})` counts `el`'s shown number to `to` once (600 ms,
ease-out) and ends exactly on `format(to)`. Point it at the number's own element, not a readout holding a unit span:
`<p class="ui-readout"><span id="pct">42</span><span class="ui-readout__unit">%</span></p>`. It sets the value at once
with reduced motion, inside an `aria-live` region, or when either value isn't a number (a non-number `to` is shown as
given); a newer call replaces one still counting.

The "Needs you" list is drawn by `needs.js` and `needs.css` (load them after `tokens.css`):
`ApplianceNeeds.renderList(items, {resolve, here, self, max, more, empty})` returns a `<ul class="ui-needs">` and
`ApplianceNeeds.render(item, opts)` one `<li class="ui-need">`. An item is `{id, source, tone: "bad"|"attention"|"warn",
title, detail, link?, action?: {key, link}}` (the bar is red for `bad`, amber for `attention` and `warn`, as the display's `NeedsRow` draws it); `action.key` is a phrase key and the renderer supplies the words
(`ApplianceNeeds.PHRASES`). Since 2.0 the table also holds the platform's terms (spec section 9): `pc_off` "The PC is
asleep", `assistant_down` "The Assistant isn't answering", `source_down` "{name} isn't answering" and
`unknown_release` "Not reported"; 2.8 adds `outside_alarm_quiet` "The outside alarm isn't hearing from the Pi"
(Pi Hub amendment A1: a Healthchecks.io check is Late, Down or Paused). Text goes in as text. Links are judged by the kit: an input starting with `/`, `#` or a backslash, or with `http(s):`, is kept only if it is
same-origin with `opts.here` (default: the page), and is emitted as an absolute URL with any userinfo removed. Any other
input (e.g. `tool:x`, `hub:x`) goes to `opts.resolve(link)`, which must return an absolute http(s) URL; a relative result
gives no link. A resolved link to another origin opens in a new tab and shows "↗".

Since 2.28 an item with `ack: true` gets an Acknowledge button when the list is given `onAck(id, item)` (a promise): the
app does the write and hides the item until it is raised again. A rejection or a resolved `false` keeps the row and
says so; anything else removes it. A dense list draws no button.

Change a colour, a tool or a page's name here, never in an app's copy: `tokens.json`, `tools.json` and `pages.json`, then `npm test`, bump
`version` in `tokens.json` and `package.json` (patch: a value; minor: a new component; major: a renamed variable, a removed file or a registry contract
change), and sync each app. Each app's copy fails its tests if edited by hand.

`demo/index.html` shows every component and the palette (⌘K, with a provider that is down); `demo/screens/` has it at phone and desktop width in both themes.

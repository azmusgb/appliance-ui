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

`npm run screens` rebuilds and retakes `demo/screens/`.

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
  ~/dev/bambuhelper-smart-display:assets/ui
```

| App | Folder | Its test runs |
|---|---|---|
| Home (Pi Hub) | `hub/static/ui` | `python3 hub/static/ui/verify.py hub/static/ui` |
| Assistant (Local AI) | `app/public/ui` | `node app/public/ui/verify.mjs app/public/ui` |
| Workshop OS | `assets/ui` | `python3 assets/ui/verify.py assets/ui` (staged: the portal and firmware don't load it yet) |

In a page: load `tokens.css` and `components.css` from that folder.

## Tools (2.0)

`tools.json` is the one list of the house's tools (platform step 7, Decision 6): per tool an `id`, `name`, `host`,
`area` (`home`, `assistant`, `workshop`, `documents`, `media`, `network`, `system`) and `purpose`. Every host is
`<id>.rahe-home.duckdns.org`, except the display's D4 compatibility boundary (`display`, `ota`), which stays on
`home.arpa` and is marked `"boundary": "D4"` until a firmware release can use the real name. The build refuses a
duplicate id, a host off the real name outside D4 and outside tools, an unknown area or field, and non-ASCII text.
A tool that is not behind the house's gate (Plex, which opens in Plex's own web app) is marked `"external": true` and
keeps its own `host` and `base` path (`app.plex.tv`, `/desktop`); `toolUrl` joins a path onto the base.

- `tools.js` (ES module, Pi Hub and Local AI): `TOOLS`, `tool(id)`, `toolUrl(id, path)` (null for an unknown id) and
  `toolsFor(area)`, an area's "Open in …↗" row without the D4 hosts.
- `tools.h` (C, the Workshop display; used from step 8): `UI_TOOL_<ID>_HOST`, `_NAME`, `_BOUNDARY`, `UI_TOOL_COUNT`.

## Palette (2.1)

`palette.js` and `palette.css` are the one ⌘K palette (platform spec section 8.1, step 7 Decision 7). Each app registers
its own providers; there is no central search, so Pi Hub works while the PC sleeps and the Assistant works without the Pi.
Load `palette.css` after `tokens.css` and `components.css`, and `palette.js` as a classic script (it sets
`window.AppliancePalette`):

```js
const palette = AppliancePalette.create({
  providers: [{ name: 'Pi Hub', down: 'The PC is off or asleep', timeout: 4000, find: (query, { signal }) => results }],
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

`motion.js` (a classic script; it sets `window.ApplianceMotion`) holds the kit's one bit of number motion.
`ApplianceMotion.countTo(el, to, {duration, decimals, format})` counts `el`'s shown number to `to` once (600 ms,
ease-out) and ends exactly on `format(to)`. Point it at the number's own element, not a readout holding a unit span:
`<p class="ui-readout"><span id="pct">42</span><span class="ui-readout__unit">%</span></p>`. It sets the value at once
with reduced motion, inside an `aria-live` region, or when either value isn't a number (a non-number `to` is shown as
given); a newer call replaces one still counting.

The "Needs you" list is drawn by `needs.js` and `needs.css` (load them after `tokens.css`):
`ApplianceNeeds.renderList(items, {resolve, here, self, max, more, empty})` returns a `<ul class="ui-needs">` and
`ApplianceNeeds.render(item, opts)` one `<li class="ui-need">`. An item is `{id, source, tone: "bad"|"attention"|"warn",
title, detail, link?, action?: {key, link}}`; `action.key` is a phrase key and the renderer supplies the words
(`ApplianceNeeds.PHRASES`). Since 2.0 the table also holds the platform's terms (spec section 9): `pc_off` "The PC is
off or asleep", `assistant_down` "The Assistant isn't answering", `source_down` "{name} isn't answering" and
`unknown_release` "Not reported". Text goes in as text. Links are judged by the kit: an input starting with `/`, `#` or a backslash, or with `http(s):`, is kept only if it is
same-origin with `opts.here` (default: the page), and is emitted as an absolute URL with any userinfo removed. Any other
input (e.g. `tool:x`, `hub:x`) goes to `opts.resolve(link)`, which must return an absolute http(s) URL; a relative result
gives no link. A resolved link to another origin opens in a new tab and shows "↗".

Change a colour or a tool here, never in an app's copy: `tokens.json` and `tools.json`, then `npm test`, bump
`version` in `tokens.json` and `package.json` (patch: a value; minor: a new component; major: a renamed variable, a removed file or a registry contract
change), and sync each app. Each app's copy fails its tests if edited by hand.

`demo/index.html` shows every component and the palette (⌘K, with a provider that is down); `demo/screens/` has it at phone and desktop width in both themes.

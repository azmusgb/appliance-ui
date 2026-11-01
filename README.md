# appliance-ui

The home appliance's shared look — colours, type, components and the `<appliance-header>` — as one source that is
copied into each app: Home (Pi Hub), Assistant (Local AI), Workshop (Workshop OS) and Materials (Filament Inventory).

Design: [`docs/superpowers/specs/2026-10-24-shared-look-design.md`](docs/superpowers/specs/2026-10-24-shared-look-design.md),
with the look replaced in 1.4.0 by [Faceplate](docs/superpowers/specs/2026-11-01-faceplate-design.md): graphite and
coolant teal, Archivo with narrow readouts and headings, status lamps, low-radius panels under rounder controls.

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
  ~/dev/filamentinventory:ui ~/dev/bambuhelper-smart-display:assets/ui
```

| App | Folder | Its test runs |
|---|---|---|
| Home (Pi Hub) | `hub/static/ui` | `python3 hub/static/ui/verify.py hub/static/ui` |
| Assistant (Local AI) | `app/public/ui` | `node app/public/ui/verify.mjs app/public/ui` |
| Materials | `ui` | `node ui/verify.mjs ui` |
| Workshop OS | `assets/ui` | `python3 assets/ui/verify.py assets/ui` |

In a page: load `tokens.css`, `components.css` and `appliance-header.js` from that folder, then put
`<appliance-header app="home|assistant|workshop|materials"></appliance-header>` first in `<body>`. Set the app's
"needs a look" count with the `attention` attribute or property. `appliance-header.lite.js` is links only (no phone
sheet), for the Workshop display's flash-served portal.

The "Needs you" list is drawn by `needs.js` and `needs.css` (load them after `tokens.css`):
`ApplianceNeeds.renderList(items, {resolve, here, self, max, more, empty})` returns a `<ul class="ui-needs">` and
`ApplianceNeeds.render(item, opts)` one `<li class="ui-need">`. An item is `{id, source, tone: "bad"|"attention"|"warn",
title, detail, link?, action?: {key, link}}`; `action.key` is a phrase key and the renderer supplies the words
(`ApplianceNeeds.PHRASES`). Text goes in as text. Links are judged by the kit: an input starting with `/`, `#` or a backslash, or with `http(s):`, is kept only if it is
same-origin with `opts.here` (default: the page), and is emitted as an absolute URL with any userinfo removed. Any other
input (e.g. `tool:x`, `hub:x`) goes to `opts.resolve(link)`, which must return an absolute http(s) URL; a relative result
gives no link. A resolved link to another origin opens in a new tab and shows "↗".

Change a colour or a link here, never in an app's copy: `tokens.json` and `suite.json`, then `npm test`, bump
`version` in `tokens.json` (patch: a value; minor: a new component; major: a renamed variable or a header contract
change), and sync each app. Each app's copy fails its tests if edited by hand.

`demo/index.html` shows every component; `demo/screens/` has it at phone and desktop width in both themes.

# One shared look for the home appliance

Date: 2026-10-24. Status: design approved in conversation, spec awaiting the owner's review.

## Why

Four web apps and one touchscreen make up the household's appliance, and they look like four products:

| | Pi Hub | Local AI | Materials | Workshop OS portal | Workshop OS screen (480×320) |
|---|---|---|---|---|---|
| Canvas | warm near-black / paper light | navy `#0a111c` | navy `#0a111c` | near-black | navy (`assets/tokens.json`) |
| Accent | amber | blue `#6cb6ff` | teal / cyan | teal | blue |
| Navigation | own sidebar + "App Suite" page | Suite bar + own rail (logo twice) | Suite bar + own sidebar | none | Home · Printer · Tools · Settings |
| In the Suite bar | no | yes, as "Hub" | yes | as "Terminal" | n/a |

Two "suites" exist that don't know about each other (Local AI's Suite bar; Pi Hub's App Suite page), "Hub" names Local
AI while "Pi Hub" is another app, and the Suite bar (pushed to Local AI's `main` on 2026-10-23) has dead links and
broke Local AI's browser suites. The display repo already holds a "LocalAI Appliance Design System" token file
(`bambuhelper-smart-display/assets/tokens.json`, with RGB565 values) that Local AI and Materials largely follow; Pi Hub
does not.

**Goal:** it feels like one appliance. Same colours, type and components; one header that reaches every app; consistent
names; one token source each codebase (firmware included) takes its values from, so they can't drift again. Each app
keeps its own pages and features.

**Success:** from any app, any other app is one tap away from a header that is identical everywhere; a screenshot of
any page doesn't reveal which codebase drew it; a hand edit to a shared file fails that repo's tests.

## Decisions

- **D1 Look: "Slate + Sky".** Blue-grey surfaces, one sky-blue accent, green / amber / red kept for status only. Dark
  is the default; light follows the device (`prefers-color-scheme`), with `data-theme="light|dark"` to override.
- **D2 Navigation: one shared header, apps on top.** The header is each app's top bar; each app keeps its own sidebar
  (computer) and bottom tabs (phone) below it.
- **D3 Names in the header:** **Home** (Pi Hub), **Assistant** (Local AI), **Workshop** (Workshop OS display),
  **Materials** (Filament Inventory).
- **D4 Distribution: one source, copied into each repo, with a drift check.** A new repo `azmusgb/appliance-ui` owns the
  tokens and the header; `sync` copies a versioned `dist/` into each app; each app's tests verify the copy. No runtime
  dependency on another machine.

## `appliance-ui` contents

| Path | What | Used by |
|---|---|---|
| `tokens.json` | Source of truth: colour, type, spacing, radii, shadows, motion. Each colour has `dark`, `light` and `rgb565` (from `dark`). Seeded from `bambuhelper-smart-display/assets/tokens.json`, retuned to D1 | all |
| `suite.json` | The four apps: `id`, `name`, `icon` (inline SVG), `lan` URL, `tailnet` URL or `null` | header |
| `dist/tokens.css` | Generated `--ui-*` custom properties: dark on `:root`, light under `@media (prefers-color-scheme: light)` (unless `[data-theme="dark"]`) and on `[data-theme="light"]` | web apps |
| `dist/components.css` | `ui-` classes: `ui-btn` (`--primary`, `--ghost`, `--danger`), `ui-card`, `ui-chip` (`--ok`, `--warn`, `--bad`, `--unknown`), `ui-field`, `ui-meter`, `ui-row`, `ui-empty`, focus ring | web apps |
| `dist/appliance-header.js` | `<appliance-header>` web component (below); `suite.json` is built into it | web apps |
| `dist/tokens.h` | Generated C: `UI_COLOR_*` RGB565 constants, font sizes, radii, spacing | display firmware |
| `fonts/` | Figtree (variable, latin subset) and a monospace for figures, as woff2 | all |
| `scripts/build.mjs` | `tokens.json` + `suite.json` → `dist/`; fails on contrast below WCAG AA (4.5:1 body, 3:1 large text and icons) in either mode | — |
| `scripts/sync.mjs` | `sync <repo-path> [--dir <folder>]`: copies `dist/` and writes `VERSION` (version + SHA-256 of each file); refuses to downgrade; `sync --status` lists apps behind | — |
| `check/verify.mjs`, `check/verify.py` | Used in each app's tests: fails when a copied file's checksum doesn't match `VERSION` | each repo |
| `demo/index.html` | Every component, dark and light, and the header at phone and computer widths | review |

No runtime dependencies. Node ≥ 22 for the scripts; the Python check uses the standard library only.

### Tokens (initial values)

Neutrals (dark / light): canvas `#0b1118` / `#f5f7fa`; header and sidebar `#0e151e` / `#ffffff`; surface `#121a24` /
`#ffffff`; raised `#1a2431` / `#e8edf3`; line `#1f2a38` / `#dfe5ec`; strong line `#2e3d50` / `#c6d0dc`; text `#e9eef4` /
`#111821`; muted `#93a1b3` / `#5b6878`.
Accent: `#5ab4ff` / `#1f7fd6`; accent text `#7cc4ff` / `#1a6dba`; on-accent `#03111f` / `#ffffff`; accent soft 14% / 10%.
Status: ok `#3ecf8e` / `#1f8a5b`; warn `#f5b03d` / `#a96500`; bad `#ff6b63` / `#c9372c`; unknown = muted.
Type: Figtree; sizes 12, 13, 14, 16, 20, 26, 34 px; weights 400, 600, 700. Radii 6, 9, 12, 18 px. Spacing 4-px steps.
The build's contrast check may nudge these; the nudged values are what ships.

## The header

**Layout.** One bar, 48 px on a computer and 44 px on a phone (breakpoint 720 px); apps reserve it with
`--ui-header-h`. Computer: logo once, then Home · Assistant · Workshop · Materials with the current one highlighted,
the current app's attention count on the right. Phone: logo, the current app's name and ⌄; tapping opens a sheet with
the four apps as large tiles; the app's own bottom tabs stay underneath.

**Use.** `<appliance-header app="home"></appliance-header>` as the first element of `<body>`, after loading
`tokens.css`, `components.css` and `appliance-header.js`. The app sets its count with the `attention` attribute or
property (`0` or absent hides it). The header renders nothing else from the app.

**Links.** From `suite.json`:

| App | Home network | Away (Tailscale) |
|---|---|---|
| Home (Pi Hub) | `http://10.0.0.30/` | `http://pi.tailfa018e.ts.net/` |
| Assistant (Local AI) | `https://10.0.0.21/` | `https://bill-hpdesktop.tailfa018e.ts.net/` |
| Workshop | `http://10.0.0.124/` | none: shown dimmed, with "Home network only" |
| Materials | `https://filamentinventory.netlify.app/` | same |

The header picks the Tailscale set when its own page's host ends in `.ts.net` or is a `100.64.0.0/10` address, else the
home-network set. The current app links to `/`.

**Behaviour.** A `<header>` landmark containing `<nav aria-label="Apps">`, links as real `<a href>` with
`aria-current="page"` on the current app; keyboard-reachable with a visible focus ring; the sheet traps focus while open
and closes on Esc, outside tap or choosing an app. No network calls of its own. Target size: header JS + `tokens.css`
+ `components.css` ≤ 12 KB gzipped (the display portal serves from flash). If it doesn't fit there, the portal uses a
`lite` variant: links only, no sheet.

**Removed with it.** Local AI's `appliance-nav.js` and its duplicate rail logo; Pi Hub's "App Suite" page (its Bambuddy,
Grafana and Status links move to Home › System); the "LAN Active" light; the Suite bar copies in Materials and the
display repo.

## Adoption per app

Each web app keeps its existing CSS variable names as aliases of the shared ones (e.g. `--ds-accent: var(--ui-accent)`),
so existing styles recolour without being rewritten; old names are retired page by page later.

| App | Repo, folder | Changes |
|---|---|---|
| Home (Pi Hub) | `pi-hub`, `hub/static/ui/` | Largest recolour: amber → sky; dark and light from tokens. Header added; App Suite page removed. Offline shell lists the new files and its version is bumped. A pytest runs `check/verify.py` |
| Assistant (Local AI) | `LocalAI`, `app/public/ui/` | `--ds-*` aliased (values mostly unchanged). Header replaces `appliance-nav.js`; rail logo removed. Unused `materialsClient` removed (lint). Screenshot baselines regenerated once; size budget updated to the measured header. Replaces the bar part of PR #377; its link fixes live in `suite.json` |
| Materials | `filamentinventory`, `ui/` | `--color-*` aliased, teal → sky. Header replaces `appliance-nav.js`. CI and post-deploy screenshot baselines updated |
| Workshop portal | `bambuhelper-smart-display`, `assets/ui/` | Tokens, components and header (or `lite`) in the flash-served portal; teal → sky; size measured in the PR |
| Workshop screen | `bambuhelper-smart-display`, firmware include | `tokens.h` replaces hard-coded RGB565 values; layout untouched; only the accent and a few greys shift. Needs that repo's physical acceptance |

Not changed: any app's pages, routes, data or features.

## Rollout

Each step is its own pull request in its own repo and ships through that repo's normal process.

1. `appliance-ui` v1.0.0: tokens, `suite.json`, build, sync, checks, header, demo, and its tests (contrast, header
   keyboard and screen-reader behaviour, away-from-home detection).
2. Local AI (smallest visual change; makes its `main` green again). Then PR #378 (sign-in) and #379 (deploy gate) ship.
3. Pi Hub (largest visual change), checked in the browser at 390, 1024 and 1440 px.
4. Materials.
5. Workshop portal, then the Workshop screen (physical acceptance).

**Versions.** Semver: a colour tweak is a patch; a new component, minor; a renamed property or a header contract change,
major. Each app records what it copied in `ui/VERSION`.

**Testing per app.** The drift check in its tests; screenshot baselines regenerated once in the adopting PR, with
before/after images in the PR; Local AI's axe and a11y-sweep suites pass with the header (they fail on today's bar);
Pi Hub gets an axe pass over its main pages.

## Risks

| Risk | Handling |
|---|---|
| Header too big for the display's flash | `lite` variant; size measured in that PR |
| Pi Hub's look changes most | Same browser checks as its other releases; one PR, revertible in one step |
| A copied file is hand-edited | The drift check fails that repo's tests; fix in `appliance-ui` and sync |
| Tailscale detection wrong | Falls back to home-network links; worst case a link doesn't open away from home |
| Local AI's `--ds-*` styles | Kept as aliases; nothing breaks while names migrate |
| Materials' and the display's current values differ slightly from D1 | Aliasing applies D1 everywhere at once; screenshots show the difference in each PR |

## Not in version 1

A whole-house attention count (Materials on HTTPS can't read Pi Hub on plain HTTP; needs Pi Hub on HTTPS); one sign-in
for every app; changes to page layouts or features; serving all apps under one address; a shared icon set beyond the
four app icons.

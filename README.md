# appliance-ui

The home appliance's shared look — colours, type, components and the `<appliance-header>` — as one source that is
copied into each app: Home (Pi Hub), Assistant (Local AI), Workshop (Workshop OS) and Materials (Filament Inventory).

Design: [`docs/superpowers/specs/2026-10-24-shared-look-design.md`](docs/superpowers/specs/2026-10-24-shared-look-design.md).

## Values changed from the spec

The build refuses text/background pairs below WCAG AA (4.5:1). Light-mode values the spec listed that failed, and what
ships instead:

| Token | Spec | Ships | Why |
|---|---|---|---|
| `ok` (light) | `#1f8a5b` | `#17784e` | 4.04 on the canvas |
| `warn` (light) | `#a96500` | `#946000` | 4.30 on the canvas |
| `accent` (light) | `#1f7fd6` | `#1a6fc4` | white label on it was 4.15 |

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

Change a colour or a link here, never in an app's copy: `tokens.json` and `suite.json`, then `npm test`, bump
`version` in `tokens.json` (patch: a value; minor: a new component; major: a renamed variable or a header contract
change), and sync each app. Each app's copy fails its tests if edited by hand.

`demo/index.html` shows every component; `demo/screens/` has it at phone and desktop width in both themes.

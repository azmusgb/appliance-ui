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

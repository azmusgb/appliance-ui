# Faceplate: the kit's look from 1.4.0

Status: approved 1 November 2026 ("Do all as recommended"). Replaces D1 (Slate + Sky) and the Figtree type of
[2026-10-24-shared-look-design.md](2026-10-24-shared-look-design.md); D2–D4 (the shared header, names, copy and drift
check) stand. Token names and the header contract don't change, so this is a minor version.

## Why

1.3 was a near-black blue slate with one bright sky accent and every block the same rounded card. That is the generic
look of a generated dashboard. Nothing in it says household appliance or workshop, and identical cards give a printer
and a one-line status the same weight.

## Subject

The household's appliance: Home, Assistant, Workshop and Materials, on a phone, the iPad wall and the desk. Its first
job is "is anything wrong, and what is running?" at a glance. The vernacular is equipment: a printer's housing, filament
spools, a labelled panel, indicator lamps.

## Decisions

| | Choice | Notes |
|---|---|---|
| F1 Colour | Graphite page `#1a1d1c`, housing surface `#242927`, seam lines `#343b38`; light: `#f2f3f1`, white, `#d9ddda` | A slightly green powder-coat grey; no blue. |
| F2 Accent | Coolant teal: dark `#3fc1c9`, light `#0b7a83` | Only for what you can act on and the current tab. At least 40° of hue from the ok lamp (a test). |
| F3 Status | Lamp green `#8fcc6c`, amber `#f0b43c`, red `#ff957f` (dark); `#29610f`, `#775000`, `#9c2b1b` (light) | Green leans yellow so it never reads as the accent. |
| F4 Type | Archivo, variable, cut to weights 400–750 and widths 75–100% (57 KB, OFL) | Body at 100%; headings (`.ui-title`) at 87.5%; readouts at 75%. `--ui-stretch-heading`, `--ui-stretch-readout`. |
| F5 Readout | `.ui-readout` (51 px), `--md` (34), `--sm` (20), `__unit` | The one loud element: narrow, heavy, tabular figures. |
| F6 Lamp | `.ui-chip` is a dot and a word in the status colour; `--live` adds a static halo; unknown is a hollow dot | Never colour alone. No pulsing. |
| F7 Hierarchy | Panels (`.ui-card`) at radius r2 6 px; controls (buttons, fields) rounder at r3 9 px; lists and readings sit on the page | Radii are r1 4, r2 6, r3 9, r4 14. |
| F8 States | `.ui-notice` (`--bad`, `--warn`), `.ui-skeleton` (pulses only without reduced motion), `aria-invalid` and disabled fields, hover on every button | |

## Rejected

- Signal orange accent: too close to the stock terracotta, and fights the amber lamp.
- A monospace face for figures: the stock "data label" look; Archivo's narrow width does the job in the same family.
- All-caps labels above sections.

## Rollout

1.4.0 syncs to Pi Hub (`hub/static/ui`, reads `--ui-*` directly) and Local AI (`app/public/ui`; its `--ds-*` values are
copies of the kit's dark values and move with it, and its own font moves to Archivo). The Workshop display
(`tokens.h`) and Materials pick it up at their next firmware or app release. Sync now removes files an older copy
shipped that this version doesn't (the Figtree files).

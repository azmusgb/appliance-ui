# Measured contrast (appliance-ui 2.16.1)

Generated from `tokens.json` by `npm run contrast`; do not edit. Ratios are WCAG 2 contrast. Tints are measured as the
components lay them. A pair is legible only as far as its number here says.

- **Text** needs 4.5:1 (WCAG 1.4.3). The build refuses any text pair below it.
- **Non-text** needs 3:1 (WCAG 1.4.11): the focus ring, a field's or icon-only button's border (`fieldLine`), a lamp's dot.
  The build refuses these too.
- **Display** is the Workshop display's own measure (K2 of the display-kit spec): the dark value of each colour taken to
  RGB565 as `tokens.h` packs it (5, 6 and 5 bits, truncated), expanded back to 8 bits by bit replication (the top bits
  repeat into the low ones, so a full channel is 255), and measured. A tint is mixed from those rounded colours and
  rounded again. It is dark only, and it needs the same minimum as the web column. The build refuses a pair that
  drops under it after rounding.
- **Decoration** has no minimum and must never be the only thing that shows a control or a state: `line` and `line2`
  divide and frame; a ghost button is identified by its label, never by its border alone.

| Use | Pair | Needs | Dark | Light | Display (RGB565) |
|---|---|---|---|---|---|
| Text | text on bg | 4.5:1 | 14.64 | 15.79 | 14.99 |
| Text | text on surface | 4.5:1 | 12.73 | 17.57 | 13.14 |
| Text | text on surface2 | 4.5:1 | 11.61 | 14.79 | 11.79 |
| Text | muted on bg | 4.5:1 | 7.74 | 6.61 | 8.00 |
| Text | muted on surface | 4.5:1 | 6.73 | 7.36 | 7.01 |
| Text | muted on surface2 | 4.5:1 | 6.13 | 6.19 | 6.29 |
| Text | accentText on bg | 4.5:1 | 9.41 | 6.02 | 9.70 |
| Text | accentText on surface | 4.5:1 | 8.18 | 6.71 | 8.50 |
| Text | accentText on surface2 | 4.5:1 | 7.46 | 5.64 | 7.63 |
| Text | ok on bg | 4.5:1 | 8.91 | 6.71 | 9.24 |
| Text | ok on surface | 4.5:1 | 7.75 | 7.47 | 8.09 |
| Text | ok on surface2 | 4.5:1 | 7.07 | 6.29 | 7.26 |
| Text | warn on bg | 4.5:1 | 9.14 | 6.43 | 9.61 |
| Text | warn on surface | 4.5:1 | 7.95 | 7.16 | 8.42 |
| Text | warn on surface2 | 4.5:1 | 7.25 | 6.03 | 7.56 |
| Text | bad on bg | 4.5:1 | 7.97 | 6.80 | 8.13 |
| Text | bad on surface | 4.5:1 | 6.93 | 7.57 | 7.12 |
| Text | bad on surface2 | 4.5:1 | 6.32 | 6.37 | 6.39 |
| Text | unknown on bg | 4.5:1 | 8.37 | 6.72 | 8.75 |
| Text | unknown on surface | 4.5:1 | 7.28 | 7.48 | 7.67 |
| Text | unknown on surface2 | 4.5:1 | 6.64 | 6.29 | 6.88 |
| Text | text on bar (header) | 4.5:1 | 13.71 | 16.97 | 14.41 |
| Text | muted on bar (header) | 4.5:1 | 7.24 | 7.11 | 7.69 |
| Text | accentText on bar (header) | 4.5:1 | 8.81 | 6.48 | 9.33 |
| Text | unknown on bar (header) | 4.5:1 | 7.83 | 7.22 | 8.41 |
| Text | onAccent on accent (primary button label) | 4.5:1 | 7.03 | 5.09 | 7.39 |
| Text | ok chip (18% tint) on bg | 4.5:1 | 6.05 | 5.12 | 6.38 |
| Text | ok chip (18% tint) on surface | 4.5:1 | 5.28 | 5.64 | 5.59 |
| Text | ok chip (18% tint) on surface2 | 4.5:1 | 4.83 | 4.81 | 4.94 |
| Text | warn chip (18% tint) on bg | 4.5:1 | 6.23 | 4.94 | 6.47 |
| Text | warn chip (18% tint) on surface | 4.5:1 | 5.39 | 5.45 | 5.66 |
| Text | warn chip (18% tint) on surface2 | 4.5:1 | 4.93 | 4.64 | 5.14 |
| Text | bad chip (18% tint) on bg | 4.5:1 | 5.63 | 5.06 | 5.87 |
| Text | bad chip (18% tint) on surface | 4.5:1 | 4.93 | 5.58 | 5.00 |
| Text | bad chip (18% tint) on surface2 | 4.5:1 | 4.51 | 4.75 | 4.55 |
| Text | unknown chip (18% tint) on bg | 4.5:1 | 5.77 | 5.15 | 6.12 |
| Text | unknown chip (18% tint) on surface | 4.5:1 | 4.98 | 5.69 | 5.36 |
| Text | unknown chip (18% tint) on surface2 | 4.5:1 | 4.61 | 4.85 | 4.71 |
| Text | bad danger button (16% tint) on bg | 4.5:1 | 5.90 | 5.23 | 6.08 |
| Text | accentText on accentSoft over bg | 4.5:1 | 7.27 | 5.30 | 7.85 |
| Text | bad danger button (16% tint) on surface | 4.5:1 | 5.12 | 5.78 | 5.41 |
| Text | accentText on accentSoft over surface | 4.5:1 | 6.29 | 5.87 | 6.68 |
| Text | bad danger button (16% tint) on surface2 | 4.5:1 | 4.69 | 4.93 | 4.73 |
| Text | accentText on accentSoft over surface2 | 4.5:1 | 5.76 | 4.99 | 5.84 |
| Non-text | accent focus ring and primary fill on bg | 3:1 | 7.83 | 4.57 | 8.10 |
| Non-text | fieldLine (field border) on bg | 3:1 | 4.21 | 3.47 | 4.28 |
| Non-text | ok lamp dot on bg | 3:1 | 8.91 | 6.71 | 9.24 |
| Non-text | warn lamp dot on bg | 3:1 | 9.14 | 6.43 | 9.61 |
| Non-text | bad lamp dot on bg | 3:1 | 7.97 | 6.80 | 8.13 |
| Non-text | unknown lamp dot on bg | 3:1 | 8.37 | 6.72 | 8.75 |
| Non-text | accent focus ring and primary fill on surface | 3:1 | 6.81 | 5.09 | 7.10 |
| Non-text | fieldLine (field border) on surface | 3:1 | 3.66 | 3.86 | 3.75 |
| Non-text | ok lamp dot on surface | 3:1 | 7.75 | 7.47 | 8.09 |
| Non-text | warn lamp dot on surface | 3:1 | 7.95 | 7.16 | 8.42 |
| Non-text | bad lamp dot on surface | 3:1 | 6.93 | 7.57 | 7.12 |
| Non-text | unknown lamp dot on surface | 3:1 | 7.28 | 7.48 | 7.67 |
| Non-text | accent focus ring and primary fill on surface2 | 3:1 | 6.21 | 4.28 | 6.37 |
| Non-text | fieldLine (field border) on surface2 | 3:1 | 3.34 | 3.25 | 3.36 |
| Non-text | ok lamp dot on surface2 | 3:1 | 7.07 | 6.29 | 7.26 |
| Non-text | warn lamp dot on surface2 | 3:1 | 7.25 | 6.03 | 7.56 |
| Non-text | bad lamp dot on surface2 | 3:1 | 6.32 | 6.37 | 6.39 |
| Non-text | unknown lamp dot on surface2 | 3:1 | 6.64 | 6.29 | 6.88 |
| Decoration | line on bg | — | 1.48 | 1.23 | 1.44 |
| Decoration | line on surface | — | 1.29 | 1.37 | 1.26 |
| Decoration | line on surface2 | — | 1.17 | 1.15 | 1.13 |
| Decoration | line2 on bg | — | 2.07 | 1.54 | 2.11 |
| Decoration | line2 on surface | — | 1.80 | 1.72 | 1.85 |
| Decoration | line2 on surface2 | — | 1.64 | 1.45 | 1.66 |

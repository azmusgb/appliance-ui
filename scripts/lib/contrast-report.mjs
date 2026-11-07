// The measured contrast of the kit's colour pairs, as the Markdown table in docs/contrast.md. Every number here is
// computed from tokens.json (WCAG 2 relative luminance), never claimed: `npm run contrast` rewrites the file, and a test
// fails when it is out of date.
import { contrast, flatten, mix, panel, isHex } from './color.mjs';

const BGS = ['bg', 'surface', 'surface2'];
const STATUS = ['ok', 'warn', 'bad', 'unknown'];

// [group, label, need, (colours, mode) → [fg, bg]] per row; `need` is the WCAG AA minimum for that use.
export function pairs() {
  const rows = [];
  for (const fg of ['text', 'muted', 'accentText', ...STATUS]) {
    for (const bg of BGS) rows.push(['Text', `${fg} on ${bg}`, 4.5, (c, m) => [c[fg][m], c[bg][m]]]);
  }
  rows.push(['Text', 'onAccent on accent (primary button label)', 4.5, (c, m) => [c.onAccent[m], c.accent[m]]]);
  for (const fg of STATUS) for (const bg of BGS) {
    rows.push(['Text', `${fg} chip (18% tint) on ${bg}`, 4.5, (c, m) => [c[fg][m], mix(c[fg][m], c[bg][m], 0.18)]]);
  }
  for (const bg of BGS) {
    rows.push(['Text', `bad danger button (16% tint) on ${bg}`, 4.5, (c, m) => [c.bad[m], mix(c.bad[m], c[bg][m], 0.16)]]);
    rows.push(['Text', `accentText on accentSoft over ${bg}`, 4.5, (c, m) => [c.accentText[m], flatten(c.accentSoft[m], c[bg][m])]]);
  }
  for (const bg of BGS) {
    rows.push(['Non-text', `accent focus ring and primary fill on ${bg}`, 3, (c, m) => [c.accent[m], c[bg][m]]]);
    rows.push(['Non-text', `fieldLine (field border) on ${bg}`, 3, (c, m) => [c.fieldLine[m], c[bg][m]]]);
    for (const s of STATUS) rows.push(['Non-text', `${s} lamp dot on ${bg}`, 3, (c, m) => [c[s][m], c[bg][m]]]);
  }
  for (const line of ['line', 'line2']) for (const bg of BGS) {
    rows.push(['Decoration', `${line} on ${bg}`, 0, (c, m) => [c[line][m], c[bg][m]]]);
  }
  return rows;
}

// K2: the same pair as the panel shows it. The display is dark only, so this is the dark value of each colour taken to
// RGB565 (panel()), the tint or overlay laid on those, and the result taken to RGB565 again, since the part blends and
// then stores a 16-bit value. accentSoft is an rgba and stays so until it is laid over its background.
export function displayRatio(t, at) {
  const shown = {};
  for (const [k, v] of Object.entries(t.color)) shown[k] = { dark: isHex(v.dark) ? panel(v.dark) : v.dark };
  const [fg, bg] = at(shown, 'dark');
  return contrast(panel(fg), panel(bg));
}

// Every pair below its minimum, as "mode label: ratio < need"; empty when all pass. The display column is mode "display".
export function failures(t) {
  const out = [];
  for (const mode of ['dark', 'light']) for (const [, label, need, at] of pairs()) {
    const r = contrast(...at(t.color, mode));
    if (r < need) out.push(`${mode} ${label}: ${r.toFixed(2)} < ${need}`);
  }
  for (const [, label, need, at] of pairs()) {
    const r = displayRatio(t, at);
    if (r < need) out.push(`display ${label}: ${r.toFixed(2)} < ${need}`);
  }
  return out;
}

export function contrastReport(t) {
  const fmt = (r, need) => `${r.toFixed(2)}${need && r < need ? ' ✗' : ''}`;
  const lines = [
    `# Measured contrast (appliance-ui ${t.version})`,
    '',
    'Generated from `tokens.json` by `npm run contrast`; do not edit. Ratios are WCAG 2 contrast. Tints are measured as the',
    'components lay them. A pair is legible only as far as its number here says.',
    '',
    '- **Text** needs 4.5:1 (WCAG 1.4.3). The build refuses any text pair below it.',
    '- **Non-text** needs 3:1 (WCAG 1.4.11): the focus ring, a field\'s or icon-only button\'s border (`fieldLine`), a lamp\'s dot.',
    '  The build refuses these too.',
    '- **Display** is the Workshop display\'s own measure (K2 of the display-kit spec): the dark value of each colour taken to',
    '  RGB565 as `tokens.h` packs it (5, 6 and 5 bits, truncated), expanded back to 8 bits by bit replication (the top bits',
    '  repeat into the low ones, so a full channel is 255), and measured. A tint is mixed from those rounded colours and',
    '  rounded again. It is dark only, and it needs the same minimum as the web column. The build refuses a pair that',
    '  drops under it after rounding.',
    '- **Decoration** has no minimum and must never be the only thing that shows a control or a state: `line` and `line2`',
    '  divide and frame; a ghost button is identified by its label, never by its border alone.',
    '',
    '| Use | Pair | Needs | Dark | Light | Display (RGB565) |',
    '|---|---|---|---|---|---|',
  ];
  for (const [group, label, need, at] of pairs()) {
    lines.push(`| ${group} | ${label} | ${need ? need + ':1' : '—'} | ${fmt(contrast(...at(t.color, 'dark')), need)} | ${fmt(contrast(...at(t.color, 'light')), need)} | ${fmt(displayRatio(t, at), need)} |`);
  }
  return lines.join('\n') + '\n';
}

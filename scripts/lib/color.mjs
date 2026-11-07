// Colour helpers for the build: WCAG contrast and RGB565 for the Workshop display.

function channels(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex) {
  const [r, g, b] = channels(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function rgb565(hex) {
  const [r, g, b] = channels(hex);
  return '0x' + (((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)).toString(16).toUpperCase().padStart(4, '0');
}

// The colour the panel shows for a #rrggbb: truncated to 5/6/5 bits exactly as rgb565 (and so tokens.h) packs it, then
// expanded back to 8 bits by bit replication (the top bits repeat into the low ones, so 0x1F is 255 and 0 stays 0), the
// way the display driver's colour converters do. Display contrast (K2) is measured on this value.
export function panel(hex) {
  const [r, g, b] = channels(hex);
  const x = (v, bits) => { const n = v >> (8 - bits); return (n << (8 - bits)) | (n >> (2 * bits - 8)); };
  return '#' + [x(r, 5), x(g, 6), x(b, 5)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// CSS color-mix(in srgb, a p%, b) over an opaque b: the tint a chip or button sits on.
export function mix(a, b, p) {
  const [x, y] = [channels(a), channels(b)];
  return '#' + x.map((v, i) => Math.round(v * p + y[i] * (1 - p)).toString(16).padStart(2, '0')).join('');
}

export const isHex = v => /^#[0-9a-f]{6}$/i.test(v);

// An rgba(r,g,b,a) colour laid over an opaque background, as #rrggbb; a #rrggbb colour comes back as it is.
export function flatten(color, bg) {
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(color);
  if (!m) return channels(color) && color;
  const top = '#' + m.slice(1, 4).map(v => (+v).toString(16).padStart(2, '0')).join('');
  return mix(top, bg, +m[4]);
}

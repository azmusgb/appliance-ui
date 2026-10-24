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

export const isHex = v => /^#[0-9a-f]{6}$/i.test(v);

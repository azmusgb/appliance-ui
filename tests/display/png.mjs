// A minimal PNG writer and reader for the display render tests: 8-bit RGB, no interlace, filter 0 on every row.
// Enough for the images this kit writes itself; anything else is refused rather than guessed at.
import zlib from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

// RGB565 little-endian pixels (what the harness writes) to 8-bit RGB by bit replication, as the panel shows them.
export function rgb565ToRgb(raw) {
  const out = Buffer.alloc((raw.length / 2) * 3);
  for (let i = 0, o = 0; i < raw.length; i += 2, o += 3) {
    const v = raw[i] | (raw[i + 1] << 8);
    const r = v >> 11, g = (v >> 5) & 63, b = v & 31;
    out[o] = (r << 3) | (r >> 2); out[o + 1] = (g << 2) | (g >> 4); out[o + 2] = (b << 3) | (b >> 2);
  }
  return out;
}

export function encodePng(rgb, width, height) {
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) rgb.copy(rows, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0); head.writeUInt32BE(height, 4); head[8] = 8; head[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function decodePng(png) {
  let pos = 8, width = 0, height = 0;
  const idat = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos), type = png.toString('latin1', pos + 4, pos + 8), data = png.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 2 || data[12] !== 0) throw new Error('only 8-bit RGB, not interlaced');
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    if (raw[y * (width * 3 + 1)] !== 0) throw new Error('only filter 0 rows');
    raw.copy(rgb, y * width * 3, y * (width * 3 + 1) + 1, (y + 1) * (width * 3 + 1));
  }
  return { width, height, rgb };
}

// Generates simple, original placeholder PNG icons (no third-party artwork).
// Output is committed to src/assets/icons; rerun with `npm run icons` if the design changes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { zlibSync } from 'fflate';

const out = new URL('../src/assets/icons/', import.meta.url);
mkdirSync(out, { recursive: true });

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  // Warm "sepia" rounded tile with a lighter inner square: reads as "retro", resembles no brand.
  const rows = [];
  const r = Math.round(size * 0.18);
  const inset = Math.round(size * 0.28);
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      const dx = Math.max(r - x, 0, x - (size - 1 - r));
      const dy = Math.max(r - y, 0, y - (size - 1 - r));
      const outside = dx * dx + dy * dy > r * r;
      const inner = x >= inset && x < size - inset && y >= inset && y < size - inset;
      if (outside) row.push(0, 0, 0, 0);
      else if (inner) row.push(250, 238, 205, 255);
      else row.push(122, 78, 36, 255);
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', Buffer.from(zlibSync(Buffer.concat(rows), { level: 9 }))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 48, 128]) {
  writeFileSync(new URL(`icon-${size}.png`, out), png(size));
}
console.log('icons written');

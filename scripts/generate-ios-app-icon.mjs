import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const outputDir = resolve(argument('--output-dir') || 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
mkdirSync(outputDir, { recursive: true });

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a.map((value, index) => Math.round(value + (b[index] - value) * t));
function segmentDistance(x, y, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const denominator = dx * dx + dy * dy || 1;
  const t = clamp(((x - ax) * dx + (y - ay) * dy) / denominator);
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}
function drawIcon(size) {
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  const aa = 1.5 / size;
  const gold = [220, 190, 127];
  const cyan = [103, 225, 231];
  const nearWhite = [242, 239, 222];

  for (let py = 0; py < size; py += 1) {
    const offset = py * (rowBytes + 1);
    raw[offset] = 0;
    for (let px = 0; px < size; px += 1) {
      const x = (px + 0.5) / size;
      const y = (py + 0.5) / size;
      const dx = x - 0.5;
      const dy = y - 0.49;
      const radius = Math.hypot(dx, dy);
      const glow = Math.max(0, 1 - Math.hypot((x - 0.50) * 1.35, (y - 0.43) * 1.10) / 0.75);
      const vignette = clamp(1 - Math.hypot(dx, dy) / 0.83);
      let color = [
        Math.round(7 + 8 * y + 2 * glow),
        Math.round(9 + 11 * x + 5 * glow),
        Math.round(12 + 13 * (1 - y) + 12 * glow),
      ];
      const edgeWidth = Math.max(aa, 0.001);
      const ringCoverage = smooth(0.314 + edgeWidth, 0.314 - edgeWidth, radius)
        * (1 - smooth(0.245 - edgeWidth, 0.245 + edgeWidth, radius));
      const ringTint = clamp((x - 0.23) / 0.55);
      const metal = mix(gold, cyan, ringTint);
      const highlight = 0.12 + 0.18 * (1 - Math.abs(y - 0.49));
      color = mix(color, metal.map((value) => Math.round(value * (1 + highlight))), ringCoverage);

      // A compact, angular signal shard inside the ring.
      const slashDistance = segmentDistance(x, y, 0.411, 0.612, 0.583, 0.375);
      const slashCoverage = 1 - smooth(0.012 - edgeWidth, 0.012 + edgeWidth, slashDistance);
      const slashTint = clamp((x - 0.39) / 0.22);
      color = mix(color, mix(nearWhite, cyan, slashTint), slashCoverage);

      const counterDistance = segmentDistance(x, y, 0.487, 0.497, 0.614, 0.497);
      const counterCoverage = 1 - smooth(0.008 - edgeWidth, 0.008 + edgeWidth, counterDistance);
      color = mix(color, gold, counterCoverage);

      // Small crown-like cut: three bright edges above the ring.
      const crownA = segmentDistance(x, y, 0.412, 0.310, 0.500, 0.205);
      const crownB = segmentDistance(x, y, 0.500, 0.205, 0.588, 0.310);
      const crownC = segmentDistance(x, y, 0.438, 0.300, 0.562, 0.300);
      const crownCoverage = Math.max(
        1 - smooth(0.006 - edgeWidth, 0.006 + edgeWidth, crownA),
        1 - smooth(0.006 - edgeWidth, 0.006 + edgeWidth, crownB),
        1 - smooth(0.006 - edgeWidth, 0.006 + edgeWidth, crownC),
      ) * (1 - ringCoverage * 0.65);
      color = mix(color, mix(gold, cyan, clamp((x - 0.42) / 0.16)), crownCoverage);

      // Blend in a restrained central glow; the square icon stays opaque.
      color = color.map((value) => Math.round(value * (0.91 + 0.09 * vignette)));
      const position = offset + 1 + px * 4;
      raw[position] = clamp(color[0] / 255, 0, 1) * 255;
      raw[position + 1] = clamp(color[1] / 255, 0, 1) * 255;
      raw[position + 2] = clamp(color[2] / 255, 0, 1) * 255;
      raw[position + 3] = 255;
    }
  }
  return png(size, raw);
}
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let bit = 0; bit < 8; bit += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}
function png(size, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const images = [];
function add(size, idiom, scale, filename, pointSize) {
  const pixelSize = Math.round(pointSize * (scale === '3x' ? 3 : scale === '2x' ? 2 : 1));
  writeFileSync(resolve(outputDir, filename), drawIcon(pixelSize));
  images.push({
    size: pointSize + 'x' + pointSize,
    idiom,
    scale,
    filename,
  });
}
add(20, 'iphone', '2x', 'AppIcon-20@2x.png', 20);
add(20, 'iphone', '3x', 'AppIcon-20@3x.png', 20);
add(29, 'iphone', '2x', 'AppIcon-29@2x.png', 29);
add(29, 'iphone', '3x', 'AppIcon-29@3x.png', 29);
add(40, 'iphone', '2x', 'AppIcon-40@2x.png', 40);
add(40, 'iphone', '3x', 'AppIcon-40@3x.png', 40);
add(60, 'iphone', '2x', 'AppIcon-60@2x.png', 60);
add(60, 'iphone', '3x', 'AppIcon-60@3x.png', 60);
add(20, 'ipad', '1x', 'AppIcon-iPad-20.png', 20);
add(20, 'ipad', '2x', 'AppIcon-iPad-20@2x.png', 20);
add(29, 'ipad', '1x', 'AppIcon-iPad-29.png', 29);
add(29, 'ipad', '2x', 'AppIcon-iPad-29@2x.png', 29);
add(40, 'ipad', '1x', 'AppIcon-iPad-40.png', 40);
add(40, 'ipad', '2x', 'AppIcon-iPad-40@2x.png', 40);
add(76, 'ipad', '1x', 'AppIcon-iPad-76.png', 76);
add(76, 'ipad', '2x', 'AppIcon-iPad-76@2x.png', 76);
add(83.5, 'ipad', '2x', 'AppIcon-iPad-83.5@2x.png', 83.5);
add(1024, 'ios-marketing', '1x', 'AppIcon-1024.png', 1024);
writeFileSync(resolve(outputDir, 'Contents.json'), JSON.stringify({
  images,
  info: { author: 'xcode', version: 1 },
}, null, 2) + '\n');
console.log('Generated opaque OSGARD PLAY icon set:', outputDir);

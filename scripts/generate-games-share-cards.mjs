import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const ROOT = resolve('public/games');
const WIDTH = 1200;
const HEIGHT = 630;
const GAMES = [
  { id: 'null-shift', title: 'NULL//SHIFT', colour: [211, 255, 105], order: '01 / 12' },
  { id: 'time', title: 'Империя времени', cardTitle: 'EMPIRE OF TIME', colour: [220, 195, 132], order: '02 / 12' },
  { id: 'swarm', title: 'SWARM', colour: [255, 151, 103], order: '03 / 12' },
  { id: 'inherit', title: 'INHERIT', colour: [120, 228, 255], order: '04 / 12' },
  { id: 'remix', title: 'REMIX', colour: [186, 150, 255], order: '05 / 12' },
  { id: 'civic-cascade', title: 'CIVIC CASCADE', colour: [133, 189, 255], order: '06 / 12' },
  { id: 'patina', title: 'PATINA Atelier', cardTitle: 'PATINA ATELIER', colour: [241, 168, 191], order: '07 / 12' },
  { id: 'signal-run', title: 'SIGNAL RUN', colour: [112, 246, 216], order: '08 / 12' },
  { id: 'cascade-lab', title: 'CASCADE LAB', colour: [158, 255, 190], order: '09 / 12' },
  { id: 'afterimage-run', title: 'AFTERIMAGE//RUN', colour: [183, 163, 255], order: '10 / 12' },
  { id: 'aether-grid', title: 'AETHER GRID', colour: [119, 233, 230], order: '11 / 12' },
  { id: 'heist-echo', title: 'HEIST//ECHO', colour: [102, 230, 224], order: '12 / 12' },
];
const CATALOG = { id: '', title: 'OSGARD PLAY', colour: [211, 255, 105], order: '12 WORLDS / ONE HUB' };
const CARDS = [...GAMES, CATALOG];

const FONT = {
  A:['01110','10001','10001','11111','10001','10001','10001'],
  B:['11110','10001','10001','11110','10001','10001','11110'],
  C:['01111','10000','10000','10000','10000','10000','01111'],
  D:['11110','10001','10001','10001','10001','10001','11110'],
  E:['11111','10000','10000','11110','10000','10000','11111'],
  F:['11111','10000','10000','11110','10000','10000','10000'],
  G:['01111','10000','10000','10111','10001','10001','01111'],
  H:['10001','10001','10001','11111','10001','10001','10001'],
  I:['11111','00100','00100','00100','00100','00100','11111'],
  J:['00111','00010','00010','00010','00010','10010','01100'],
  K:['10001','10010','10100','11000','10100','10010','10001'],
  L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10101','10001','10001','10001'],
  N:['10001','11001','10101','10011','10001','10001','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'],
  P:['11110','10001','10001','11110','10000','10000','10000'],
  Q:['01110','10001','10001','10001','10101','10010','01101'],
  R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'],
  T:['11111','00100','00100','00100','00100','00100','00100'],
  U:['10001','10001','10001','10001','10001','10001','01110'],
  V:['10001','10001','10001','10001','10001','01010','00100'],
  W:['10001','10001','10001','10101','10101','10101','01010'],
  X:['10001','10001','01010','00100','01010','10001','10001'],
  Y:['10001','10001','01010','00100','00100','00100','00100'],
  Z:['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'],
  '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'],
  '3':['11110','00001','00001','01110','00001','00001','11110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'],
  '5':['11111','10000','10000','11110','00001','00001','11110'],
  '6':['01110','10000','10000','11110','10001','10001','01110'],
  '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'],
  '9':['01110','10001','10001','01111','00001','00001','01110'],
  '/':['00001','00010','00010','00100','01000','01000','10000'],
  '-':['00000','00000','00000','11111','00000','00000','00000'],
  ':':['00000','00100','00100','00000','00100','00100','00000'],
  '.':['00000','00000','00000','00000','00000','00110','00110'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],
};

function blendPixel(data, x, y, colour, alpha = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 3;
  if (alpha >= 255) {
    data[i] = colour[0]; data[i + 1] = colour[1]; data[i + 2] = colour[2];
    return;
  }
  const a = alpha / 255, inv = 1 - a;
  data[i] = Math.round(data[i] * inv + colour[0] * a);
  data[i + 1] = Math.round(data[i + 1] * inv + colour[1] * a);
  data[i + 2] = Math.round(data[i + 2] * inv + colour[2] * a);
}
function disc(data, cx, cy, radius, colour, alpha = 255) {
  const r = Math.max(0, Math.ceil(radius)), r2 = radius * radius;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x*x + y*y <= r2) blendPixel(data, cx + x, cy + y, colour, alpha);
  }
}
function line(data, x0, y0, x1, y1, colour, thickness = 1, alpha = 255) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    disc(data, x0, y0, Math.max(0.55, thickness / 2), colour, alpha);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function ellipse(data, cx, cy, rx, ry, rotation, colour, thickness = 1.5, dashed = false) {
  const cr = Math.cos(rotation), sr = Math.sin(rotation);
  const steps = Math.ceil(Math.PI * 2 * Math.max(rx, ry) / 2.4);
  for (let i = 0; i <= steps; i++) {
    const a = i / steps * Math.PI * 2;
    if (dashed && (Math.floor(a * 16) % 4 === 0)) continue;
    const px = Math.cos(a) * rx, py = Math.sin(a) * ry;
    disc(data, cx + px * cr - py * sr, cy + px * sr + py * cr, thickness, colour, dashed ? 150 : 80);
  }
}
function rect(data, x, y, width, height, colour, alpha = 255) {
  for (let yy = Math.floor(y); yy < Math.ceil(y + height); yy++)
    for (let xx = Math.floor(x); xx < Math.ceil(x + width); xx++)
      blendPixel(data, xx, yy, colour, alpha);
}
function drawText(data, value, x, y, scale, colour, alpha = 255) {
  let cursor = x;
  for (const raw of value.toUpperCase()) {
    const glyph = FONT[raw] || FONT[' '];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === '1') rect(data, cursor + col * scale, y + row * scale, scale, scale, colour, alpha);
      }
    }
    cursor += 6 * scale;
  }
  return cursor - x;
}
function makeCard(game) {
  const data = Buffer.alloc(WIDTH * HEIGHT * 3);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 3;
      const t = x / WIDTH;
      const dx = (x - 950) / 420, dy = (y - 310) / 320;
      const glow = Math.max(0, 1 - Math.sqrt(dx*dx + dy*dy));
      const sweep = Math.max(0, 1 - Math.abs(y - (175 + x * 0.16)) / 250);
      data[i] = Math.min(255, Math.round(7 + 9*t + game.colour[0]*glow*0.105 + 3*sweep));
      data[i+1] = Math.min(255, Math.round(9 + 10*t + game.colour[1]*glow*0.09 + 4*sweep));
      data[i+2] = Math.min(255, Math.round(11 + 14*t + game.colour[2]*glow*0.11 + 5*sweep));
      if (x % 80 === 0 || y % 80 === 0) {
        data[i] += 2; data[i+1] += 3; data[i+2] += 4;
      }
    }
  }
  const muted = [106, 117, 106], mutedBright = [177, 186, 171], lineDark = [49, 65, 53];
  rect(data, 56, 55, 1088, 1, lineDark, 200);
  rect(data, 56, 574, 1088, 1, lineDark, 200);
  line(data, 56, 55, 92, 55, game.colour, 2, 220);
  line(data, 1108, 574, 1144, 574, game.colour, 2, 220);
  ellipse(data, 951, 314, 215, 144, -0.36, game.colour, 1.5);
  ellipse(data, 951, 314, 163, 238, 0.48, [111, 154, 126], 1.1);
  ellipse(data, 951, 314, 257, 191, 0.91, [95, 122, 105], 1.0, true);
  ellipse(data, 951, 314, 120, 120, 0.12, game.colour, 1.1, true);
  line(data, 951, 180, 1065, 314, game.colour, 2.3, 210);
  line(data, 1065, 314, 951, 448, game.colour, 2.3, 210);
  line(data, 951, 448, 837, 314, game.colour, 2.3, 210);
  line(data, 837, 314, 951, 180, game.colour, 2.3, 210);
  line(data, 951, 212, 951, 416, mutedBright, 1.1, 120);
  line(data, 887, 314, 1016, 314, mutedBright, 1.1, 120);
  disc(data, 951, 314, 5, game.colour, 235);
  for (const [x,y,r] of [[830,166,2],[1096,245,2],[1040,463,2],[783,381,2],[1018,128,1.6],[1130,345,1.6]]) disc(data,x,y,r,game.colour,190);
  drawText(data, 'OSGARD PLAY', 74, 94, 4, game.colour, 255);
  drawText(data, 'PERSONAL INVITATION', 76, 151, 2, mutedBright, 230);
  line(data, 76, 190, 400, 190, lineDark, 1.2, 230);
  const titleScale = Math.min(8, Math.floor(640 / ((game.cardTitle || game.title).length * 6)));
  drawText(data, game.cardTitle || game.title, 74, 252, Math.max(5, titleScale), [244, 242, 232], 255);
  drawText(data, 'PLAY TOGETHER', 76, 337, 3, game.colour, 240);
  drawText(data, 'ONE WORLD. YOUR NEXT MOVE.', 76, 382, 2, mutedBright, 210);
  drawText(data, game.order, 76, 526, 2, muted, 230);
  drawText(data, 'OSGARD.WORLD / GAMES', 822, 526, 2, mutedBright, 210);
  return encodePng(data);
}
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([name, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, name, data, crc]);
}
function encodePng(rgb) {
  const stride = WIDTH * 3, scanlines = Buffer.alloc((stride + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    const target = y * (stride + 1);
    scanlines[target] = 0;
    rgb.copy(scanlines, target + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0); ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function escapeHtml(value) {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function invitePage(game) {
  const title = escapeHtml(game.title);
  const description = escapeHtml(game.id
    ? 'Тебя пригласили в ' + game.title + ' в OSGARD PLAY. Прими приглашение, запусти игру и передай свой следующий вызов дальше.'
    : 'Выбери игровой мир OSGARD PLAY, попробуй его и передай приглашение другу.');
  const slug = game.id ? '/games/invite/' + game.id + '/' : '/games/invite/';
  const gameAttribute = game.id ? ' data-game="' + game.id + '"' : '';
  const catalogTarget = game.id ? '/games/?og_game=' + encodeURIComponent(game.id) : '/games/';
  const image = 'https://osgard.world/games/share-cards/' + (game.id || 'catalog') + '.png';
  const lines = [
'<!doctype html>',
'<html lang="ru">',
'<head>',
'<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
'<meta name="theme-color" content="#080a0b">',
'<meta name="robots" content="noindex,follow">',
'<meta name="description" content="' + description + '">',
'<meta property="og:type" content="website">',
'<meta property="og:site_name" content="OSGARD PLAY">',
'<meta property="og:title" content="' + title + ' — OSGARD PLAY">',
'<meta property="og:description" content="' + description + '">',
'<meta property="og:url" content="https://osgard.world' + slug + '">',
'<meta property="og:image" content="' + image + '">',
'<meta property="og:image:secure_url" content="' + image + '">',
'<meta property="og:image:type" content="image/png">',
'<meta property="og:image:width" content="1200">',
'<meta property="og:image:height" content="630">',
'<meta property="og:image:alt" content="OSGARD PLAY — ' + title + ', персональное игровое приглашение">',
'<meta name="twitter:card" content="summary_large_image">',
'<meta name="twitter:title" content="' + title + ' — OSGARD PLAY">',
'<meta name="twitter:description" content="' + description + '">',
'<meta name="twitter:image" content="' + image + '">',
'<meta name="twitter:image:alt" content="OSGARD PLAY — ' + title + ', персональное игровое приглашение">',
'<link rel="canonical" href="https://osgard.world' + slug + '">',
'<link rel="icon" href="/games/favicon.svg" type="image/svg+xml">',
'<title>' + title + ' — OSGARD PLAY / приглашение</title>',
'<style>',
':root{color-scheme:dark;--bg:#080a0b;--panel:#101513;--ink:#f2f0e8;--muted:#a5aaa1;--line:#ffffff24;--acid:#d3ff69;--metal:#d2c9b4}*{box-sizing:border-box}body{margin:0;min-height:100svh;background:radial-gradient(ellipse at 78% 45%,#d3ff6912,transparent 33%),var(--bg);color:var(--ink);font:15px/1.7 Inter,Geist,system-ui,sans-serif}.shell{width:min(1040px,calc(100% - 32px));margin:auto;min-height:100svh;display:flex;flex-direction:column}.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:26px 0;border-bottom:1px solid var(--line);font:10px ui-monospace,monospace;letter-spacing:.12em}.brand{display:flex;gap:10px;align-items:center;color:var(--ink);text-decoration:none}.brand-mark{display:grid;place-items:center;width:30px;height:30px;border:1px solid #d3ff6960;color:var(--acid);font-size:18px}.brand strong{letter-spacing:.1em}.top-tag{color:var(--muted);text-align:right}.main{flex:1;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(260px,.85fr);align-items:center;gap:clamp(30px,7vw,86px);padding:clamp(46px,9vw,100px) 0}.eyebrow{margin:0 0 22px;color:var(--acid);font:10px ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}.eyebrow:before{content:"";display:inline-block;width:6px;height:6px;margin:0 10px 1px 0;border-radius:50%;background:var(--acid);box-shadow:0 0 14px #d3ff6970}.title{max-width:640px;margin:0;font:400 clamp(46px,8vw,90px)/.96 Georgia,serif;letter-spacing:-.065em;overflow-wrap:anywhere}.title em{color:var(--metal);font-weight:400}.copy{max-width:520px;margin:26px 0 0;color:var(--muted);font-size:15px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.cta{display:inline-flex;min-height:48px;align-items:center;justify-content:center;gap:18px;padding:0 18px;background:var(--acid);color:#11150d;font-weight:700;font-size:12px;text-decoration:none}.secondary{display:inline-flex;align-items:center;min-height:48px;padding:0 16px;border:1px solid var(--line);color:var(--ink);text-decoration:none;font-size:12px}.privacy{max-width:510px;margin:18px 0 0;color:#777f76;font-size:11px;line-height:1.65}.art{width:100%;max-width:460px;justify-self:center;filter:drop-shadow(0 18px 48px #0008)}.foot{display:flex;justify-content:space-between;gap:18px;padding:18px 0;border-top:1px solid var(--line);color:#7c837b;font:9px ui-monospace,monospace;letter-spacing:.12em}.cta:focus-visible,.secondary:focus-visible,.brand:focus-visible{outline:2px solid var(--metal);outline-offset:4px}@media(max-width:680px){.main{grid-template-columns:1fr;padding:54px 0 66px;gap:34px}.art{max-width:320px;grid-row:1}.title{font-size:clamp(44px,13vw,66px)}.top{padding:18px 0}.top-tag{max-width:120px;font-size:8px}.actions>*{width:100%}.foot{flex-wrap:wrap}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}',
'</style>',
'</head>',
'<body' + gameAttribute + '>',
'<div class="shell">',
'<header class="top"><a class="brand" href="/games/"><span class="brand-mark" aria-hidden="true">↗</span><strong>OSGARD <span style="color:var(--muted)">PLAY</span></strong></a><span class="top-tag">PERSONAL INVITATION / OSGARD WORLD</span></header>',
'<main class="main">',
'<section><p class="eyebrow">Тебя пригласили в игровой мир</p><h1 class="title">' + title + '</h1><p class="copy">' + description + '</p><div class="actions"><a class="cta" id="play-link" href="' + catalogTarget + '">Принять приглашение <span aria-hidden="true">↗</span></a><a class="secondary" href="/games/">Исследовать все миры</a></div><p class="privacy">Код приглашения используется для аналитики источника только при согласии. Играть можно без регистрации и без согласия на необязательную аналитику.</p></section>',
'<img class="art" src="/games/share-cards/' + (game.id || 'catalog') + '.png" width="1200" height="630" alt="OSGARD PLAY — ' + title + ', персональное игровое приглашение" fetchpriority="high">',
'</main>',
'<footer class="foot"><span>OSGARD.WORLD / GAMES</span><span>PLAY TOGETHER. CREATE YOUR NEXT WORLD.</span></footer>',
'</div>',
'<script src="/games/invite/invite-landing.js" defer></script>',
'</body>',
'</html>',
  ];
  return lines.join('\n') + '\n';
}
async function main() {
  const cardsDir = resolve(ROOT, 'share-cards');
  const inviteDir = resolve(ROOT, 'invite');
  await mkdir(cardsDir, { recursive: true });
  await mkdir(inviteDir, { recursive: true });
  for (const game of CARDS) {
    const id = game.id || 'catalog';
    const png = makeCard(game);
    if (png.length > 300 * 1024) throw new Error('Share card too large for messaging previews: ' + id + ' (' + png.length + ' bytes)');
    await writeFile(resolve(cardsDir, id + '.png'), png);
    const pageDir = game.id ? resolve(inviteDir, game.id) : inviteDir;
    await mkdir(pageDir, { recursive: true });
    await writeFile(resolve(pageDir, 'index.html'), invitePage(game), 'utf8');
    console.log('Generated /games/invite/' + (game.id ? game.id + '/' : '') + ' + ' + id + '.png (' + png.length + ' bytes)');
  }
}
await main();

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = 'public/games';
const html = readFileSync(root + '/index.html', 'utf8');
const luxuryCss = readFileSync(root + '/luxury.css', 'utf8');
const accessibilityJs = readFileSync(root + '/accessibility-center.js', 'utf8');
const routeMatrix = readFileSync('scripts/production-route-matrix.mjs', 'utf8');

const art = [
  { id: 'time', cls: 'time' },
  { id: 'swarm', cls: 'swarm' },
  { id: 'inherit', cls: 'inherit' },
  { id: 'remix', cls: 'remix' },
  { id: 'civic-cascade', cls: 'civic' },
  { id: 'patina', cls: 'patina' },
  { id: 'signal-run', cls: 'signal' },
  { id: 'cascade-lab', cls: 'cascade-lab' },
  { id: 'afterimage-run', cls: 'afterimage' },
  { id: 'aether-grid', cls: 'aether-grid' },
];

assert.equal((html.match(/class="game-art-image"/g) || []).length, art.length,
  'Exactly ten below-the-fold game card illustrations should be external images');
assert.ok(html.includes('<a class="art art-null"') && /<a class="art art-null"[^>]*>[\s\S]*?<svg\b/.test(html),
  'Keep the featured NULL//SHIFT vector inline for the critical first screen');
assert.ok(html.includes('.art svg,.art .game-art-image{'),
  'Inline and external artwork must share the same art sizing and motion rules');
assert.ok(html.includes('.card:hover .art svg,.card:hover .art .game-art-image{'),
  'Hover/focus presentation must support external SVG art');
for (const item of art) {
  const imageTag = new RegExp('<img class="game-art-image" src="/games/card-art/' + item.id + '\\.svg\\?v=__OSGARD_BUILD_VERSION__" alt="" aria-hidden="true" loading="lazy" decoding="async">');
  assert.ok(imageTag.test(html), item.id + ' must be lazy-loaded, decorative, and versioned');
  const card = html.match(new RegExp('<a class="art art-' + item.cls + '"[^>]*>[\\s\\S]*?</a>'));
  assert.ok(card && card[0].includes('class="game-art-image"') && !/<svg\b/.test(card[0]),
    item.id + ' card should not contain an inline SVG subtree');
  const path = root + '/card-art/' + item.id + '.svg';
  assert.ok(existsSync(path), 'Missing artwork asset: ' + path);
  const svg = readFileSync(path, 'utf8');
  assert.match(svg, /^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, item.id + ' SVG needs a namespace for standalone serving');
  assert.match(svg, /\bviewBox="/, item.id + ' SVG must retain a viewBox');
  assert.match(svg, /<\/svg>\s*$/, item.id + ' SVG must be a complete standalone vector image');
  assert.doesNotMatch(svg, /<script\b|\bonload\s*=|href\s*=\s*["']https?:/i,
    item.id + ' SVG must not contain script handlers or remote resources');
  assert.ok(routeMatrix.includes("'/games/card-art/" + item.id + ".svg'"),
    item.id + ' SVG route should be part of the production route matrix');
}
assert.ok(html.includes('id="catalog-share-state" type="button" aria-label="Поделиться подборкой ↗">Поделиться подборкой ↗</button>'),
  'Share button accessible name must match its visible text');
assert.ok(!accessibilityJs.includes("trigger.setAttribute('aria-label', 'Открыть настройки доступности')"),
  'Accessibility control must not override its visible accessible name');
assert.ok(accessibilityJs.includes('<span>Доступность</span>'),
  'Accessibility control must keep its visible text label');
assert.ok(luxuryCss.includes('.card .game-actions{column-gap:32px;row-gap:28px}'),
  'Mobile game actions need safe spacing to satisfy target-size audit');
assert.ok(luxuryCss.includes('.luxury-entertainment .art-patina .game-art-image') &&
          luxuryCss.includes('.luxury-entertainment .art-cascade-lab .game-art-image'),
  'Distinct card-art filters must continue working for external SVG images');
assert.ok(routeMatrix.includes('if (expectedBuild) routes.splice(routes.indexOf(\'/games/share-cards/catalog.png\'), 0, ...CARD_ART_ROUTES)'),
  'New art endpoints should enter the production route matrix only when an expected deployed release is supplied');
assert.ok(routeMatrix.includes("route.startsWith('/games/card-art/')") &&
          routeMatrix.includes("image/svg+xml") &&
          routeMatrix.includes("text.includes('viewBox=')"),
  'Production route matrix must validate external SVG route MIME and payload');
console.log('PASS Games mobile Lighthouse fixes: 10 external card SVGs, mobile target spacing, visible/accessibility label parity, and deployment route contracts.');

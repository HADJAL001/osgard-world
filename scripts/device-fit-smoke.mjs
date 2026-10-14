import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const page = readFileSync('public/games/index.html', 'utf8');
const client = readFileSync('public/games/device-fit.js', 'utf8');
const css = readFileSync('public/games/device-fit.css', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const release = readFileSync('scripts/release-readiness.mjs', 'utf8');
const serviceWorker = readFileSync('public/games/osgard-play-sw.js', 'utf8');
const pwaSmoke = readFileSync('scripts/osgard-play-pwa-smoke.mjs', 'utf8');
const optimizer = readFileSync('scripts/optimize-games-static-assets.mjs', 'utf8');

const gameIds = [
  'null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade',
  'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid',
];
for (const id of gameIds) {
  assert.ok(page.includes('data-game="' + id + '"'), 'catalog is missing game: ' + id);
}
assert.ok(page.includes('/games/device-fit.css?v=__OSGARD_BUILD_VERSION__'), 'device-fit CSS must be versioned with the catalog build');
assert.ok(page.includes('/games/device-fit.js?v=__OSGARD_BUILD_VERSION__'), 'device-fit JS must be versioned with the catalog build');
assert.ok(client.includes("canCreateContext('webgl2')"), 'must check WebGL 2 through the browser runtime');
assert.ok(client.includes('navigator.maxTouchPoints'), 'must detect touch capability without claiming per-game touch support');
assert.ok(client.includes('prefers-reduced-motion: reduce'), 'must respect reduced motion');
assert.ok(client.includes('aria-live="polite"'), 'must announce filter results to assistive technology');
assert.ok(client.includes('data-osgard-fit-hidden'), 'filter must be reversible and scoped to this enhancement');
assert.ok(client.includes('Игры не блокируются автоматически'), 'the advisory must disclose that launch is not blocked');
assert.ok(client.includes('характеристики устройства не отправляются на сервер'), 'privacy statement must be explicit');
for (const forbidden of [
  /\bfetch\s*\(/i, /\bXMLHttpRequest\b/i, /sendBeacon/i,
  /localStorage/i, /sessionStorage/i, /document\.cookie/i, /gtag\s*\(/i,
]) assert.ok(!forbidden.test(client), 'smart launch must remain local-only; forbidden capability matched: ' + forbidden);
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'), 'CSS must honor the reduced-motion preference');
assert.ok(serviceWorker.includes("'/games/device-fit.css'") && serviceWorker.includes("'/games/device-fit.js'"), 'Smart Launch assets must be included in PWA cache');
assert.doesNotThrow(() => new Script(serviceWorker), 'The service worker must parse without syntax errors');
assert.ok(pwaSmoke.includes("'/games/device-fit.css'") && pwaSmoke.includes("'/games/device-fit.js'"), 'PWA smoke must enforce offline eligibility for Smart Launch assets');
assert.ok(optimizer.includes("'device-fit.css'") && optimizer.includes("'device-fit.js'"), 'Smart Launch assets must be optimized and precompressed');
assert.ok(/@media\(max-width:760px\)/.test(css), 'panel must include a mobile layout');
assert.equal(pkg.scripts['qa:device-fit'], 'node scripts/device-fit-smoke.mjs', 'package QA command is missing');
assert.ok(release.includes("check('device-fit-smoke'"), 'release readiness must run the new contract test');
assert.ok(pwaSmoke.includes('new Script(sw)'), 'PWA smoke should validate service worker parser contract');
console.log('PASS OSGARD Smart Launch: 11 catalog entries, local-only capability checks, reversible filtering, PWA syntax, mobile and reduced-motion contracts.');

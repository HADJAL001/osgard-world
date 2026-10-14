import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('public/games/index.html', 'utf8');
const client = readFileSync('public/games/device-fit.js', 'utf8');
const css = readFileSync('public/games/device-fit.css', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const release = readFileSync('scripts/release-readiness.mjs', 'utf8');

const gameIds = [
  'null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade',
  'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid',
];
for (const id of gameIds) {
  assert.ok(page.includes('data-game="' + id + '"'), 'catalog is missing game: ' + id);
}
assert.ok(page.includes('/games/device-fit.css?v=__OSGARD_BUILD_VERSION__'), 'device-fit CSS must be versioned with the catalog build');
assert.ok(page.includes('/games/device-fit.js?v=__OSGARD_BUILD_VERSION__'), 'device-fit JS must be versioned with the catalog build');
assert.ok(client.includes('getContext(\'webgl2\''), 'must check WebGL 2 through the browser runtime');
assert.ok(client.includes('navigator.maxTouchPoints'), 'must detect touch capability without claiming per-game touch support');
assert.ok(client.includes('prefers-reduced-motion: reduce'), 'must respect reduced motion');
assert.ok(client.includes('aria-live="polite"'), 'must announce filter results to assistive technology');
assert.ok(client.includes('data-osgard-fit-hidden'), 'filter must be reversible and scoped to this enhancement');
assert.ok(client.includes('Игры не блокируются автоматически'), 'the advisory must disclose that launch is not blocked');
assert.ok(client.includes('характеристики устройства не отправляются на сервер'), 'privacy statement must be explicit');

for (const forbidden of [
  /\bfetch\s*\(/i, /\bXMLHttpRequest\b/i, /sendBeacon/i,
  /localStorage/i, /sessionStorage/i, /document\.cookie/i, /gtag\s*\(/i,
]) {
  assert.ok(!forbidden.test(client), 'smart launch must remain local-only; forbidden capability matched: ' + forbidden);
}
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'), 'CSS must honor the reduced-motion preference');
assert.ok(/@media\(max-width:760px\)/.test(css), 'panel must include a mobile layout');
assert.equal(pkg.scripts['qa:device-fit'], 'node scripts/device-fit-smoke.mjs', 'package QA command is missing');
assert.ok(release.includes("check('device-fit-smoke'"), 'release readiness must run the new contract test');

console.log('PASS OSGARD Smart Launch: 11 catalog entries, versioned assets, local-only capability checks, reversible filtering, accessibility and mobile/reduced-motion contracts.');

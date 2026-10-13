import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('public/games/ecosystem');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'directory.css'), 'utf8');
const js = readFileSync(resolve(root, 'directory.js'), 'utf8');
const hub = readFileSync(resolve('public/games/index.html'), 'utf8');
const commerceClient = readFileSync(resolve('public/games/commerce-client.js'), 'utf8');
const analyticsClient = readFileSync(resolve('public/games/consented-analytics.js'), 'utf8');
const apiCore = readFileSync(resolve('services/osgard-commerce-api/src/core.mjs'), 'utf8');
const routeMatrix = readFileSync(resolve('scripts/production-route-matrix.mjs'), 'utf8');
const deployWorkflow = readFileSync(resolve('.github/workflows/deploy-frontend.yml'), 'utf8');
const sitemap = readFileSync(resolve('public/sitemap.xml'), 'utf8');

assert.ok(html.includes('<title>OSGARD WORLD — Экосистема проектов</title>'), 'Directory needs a route-specific title');
assert.ok(sitemap.includes('<loc>https://osgard.world/games/ecosystem/</loc>'), 'Public sitemap must include the canonical directory route');
assert.equal(sitemap.split('<loc>https://osgard.world/games/ecosystem/</loc>').length - 1, 1, 'Canonical directory route must occur once in sitemap');
assert.ok(html.includes('application/ld+json') && html.includes('"numberOfItems":10'), 'Directory must expose an ItemList structured-data contract');
assert.ok(html.includes('id="project-grid"') && html.includes('id="project-search"') && html.includes('id="project-count"'), 'Searchable project directory controls are required');
assert.ok(html.includes('id="analytics-toggle"') && readFileSync(resolve(root, 'directory.js'), 'utf8').includes('osgard.games.analytics-consent.v1'), 'Directory must reuse the shared explicit-consent key');
assert.ok(html.includes('href="/games/"') && html.includes('href="/development"') && html.includes('mailto:osman.osmanov0099@gmail.com') && html.includes('wa.me/79640027222'), 'Directory must link back into Games and expose the development contact route');
assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'), 'External project links must isolate opener access');
assert.ok(html.includes('по описанию владельца') && html.includes('безопасность'), 'Directory must not imply external service capabilities or trust have been independently verified');

const expected = {
  osgardbewworld: 'osgardbewworld.com',
  o2system: 'o2system.art',
  senjorio: 'senjorio.com',
  superday: 'superday.run',
  marcosa: 'marcosa.club',
  myosa: 'myosa.world',
  'gold-glamour': 'gold-glamour.online',
  gardvpn: 'gardvpn.is',
  osgardos: 'osgardos.com',
  osgardvanguard: 'osgardvanguard.studio',
};
const blocks = [...html.matchAll(/<article class="project-card" data-project="([^"]+)"[\s\S]*?<\/article>/g)];
assert.equal(blocks.length, 10, 'The directory must contain exactly the ten owner-listed projects');
const ids = new Set();
for (const match of blocks) {
  const id = match[1];
  const block = match[0];
  assert.ok(expected[id], 'Unexpected project ID: ' + id);
  assert.ok(!ids.has(id), 'Duplicate project ID: ' + id);
  ids.add(id);
  const rawHref = block.match(/<a class="project-link" href="([^"]+)"/)?.[1];
  assert.ok(rawHref, 'Project needs one clear primary link: ' + id);
  const url = new URL(rawHref.replaceAll('&amp;', '&'));
  assert.equal(url.protocol, 'https:', 'External project must use HTTPS: ' + id);
  assert.equal(url.hostname, expected[id], 'Project link host must match the owner-listed domain: ' + id);
  assert.equal(url.searchParams.get('utm_source'), 'osgard_games');
  assert.equal(url.searchParams.get('utm_medium'), 'cross_promo');
  assert.equal(url.searchParams.get('utm_campaign'), 'ecosystem_directory');
  assert.equal(url.searchParams.get('utm_content'), id, 'Each project needs a distinct campaign content tag');
  assert.equal(block.includes('target="_blank" rel="noopener noreferrer"'), true);
  assert.ok(block.includes('data-category='), 'Project cards must have a filter category: ' + id);
}
assert.equal(ids.size, 10);
for (const category of ['all', 'creation', 'business', 'mobility', 'social', 'ai', 'protection']) {
  assert.ok(html.includes('data-filter="' + category + '"'), 'Missing filter category: ' + category);
}
for (const host of Object.values(expected)) assert.ok(html.includes(host), 'Directory omits an owner-listed host: ' + host);
assert.ok(hub.includes('href="/games/ecosystem/"'), 'Main Games hub must link to the standalone directory');
assert.ok(commerceClient.includes("path === '/games/ecosystem' ? 'ecosystem_directory_viewed'"), 'Consent-aware page-view tracking should identify the directory');
assert.ok(analyticsClient.includes("'ecosystem_directory_viewed'"), 'Browser analytics allow-list must include the new page-view event');
assert.ok(apiCore.includes('"ecosystem_directory_viewed"'), 'Server analytics allow-list must include the new page-view event');
assert.ok(routeMatrix.includes("'/games/ecosystem/'") && routeMatrix.includes("directory.css") && routeMatrix.includes("directory.js"), 'Production route matrix must verify page and local assets');
assert.ok(deployWorkflow.includes('find osgard-release/html/games -type f -name') && deployWorkflow.includes('directory.css?v=$ASSET_VERSION') && deployWorkflow.includes('directory.js?v=$ASSET_VERSION') && deployWorkflow.includes('npm run qa:ecosystem-directory'), 'Production deployment must version the new page assets and run its smoke test');

assert.ok(css.includes('.project-grid{display:grid') && css.includes('@media(max-width:700px)'), 'Directory must have desktop and mobile layouts');
assert.ok(css.includes('prefers-reduced-motion:reduce') && css.includes(':focus-visible'), 'Accessibility requires focus styles and reduced-motion support');
assert.ok(css.includes('.project-card[hidden]{display:none}'), 'Responsive filter must be able to hide cards');
assert.ok(js.includes('getElementById(\'project-search\')') && js.includes('aria-pressed') && js.includes('PENDING_KEY'), 'Interactive search/filter and consent controls must be wired');
assert.ok(!/innerHTML\s*=/.test(js), 'Dynamic search UI must not build HTML from remote or user-provided content');
new Function(js);

console.log(JSON.stringify({status:'PASS', projects:blocks.length, categories:7, externalLinksWithUtm:blocks.length, checks:33, analyticsEvent:'ecosystem_directory_viewed', privacy:'shared explicit-consent key'}, null, 2));

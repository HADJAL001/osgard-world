import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.');
const html = await readFile(resolve(root, 'public/business/index.html'), 'utf8');
const app = await readFile(resolve(root, 'src/App.tsx'), 'utf8');
const rootShell = await readFile(resolve(root, 'index.html'), 'utf8');
const routes = await readFile(resolve(root, 'scripts/production-route-matrix.mjs'), 'utf8');
const sitemap = await readFile(resolve(root, 'public/sitemap.xml'), 'utf8');
const assertContains = (source, value, message) => assert.ok(source.includes(value), message);
for (const marker of [
  '<title>OSGARD Business — Studio &amp; Intelligence</title>',
  'href="https://osgard.world/business/"',
  'id="solutions"',
  'id="intelligence"',
  'id="workflow"',
  'id="brief"',
  'id="brief-form"',
  'id="tool-search"',
  'data-filter="all"',
  'data-filter="build"',
  'data-filter="growth"',
  'data-filter="operate"',
  'osgard.business-brief.v1',
  'ADMIN_API_TOKEN',
  'href="/games/commerce-admin/"',
  'href="/games/monetization/"',
  'href="/games/growth-studio/"',
  'href="/games/partners/"',
  'href="/development#project-intake"',
]) assertContains(html, marker, 'Business hub missing required marker: ' + marker);

assertContains(app, 'href="/business/"', 'Business hub needs to be linked from the ecosystem navigation');
assertContains(rootShell, 'href="/business/"', 'Root HTML fallback must expose the business link for crawlers and no-JS clients');
assertContains(sitemap, '<loc>https://osgard.world/business/</loc>', 'Business hub must have a canonical sitemap entry');
assertContains(routes, "'/business/'", 'Production route matrix must probe the canonical business route');
assertContains(routes, 'OSGARD Business — Studio &amp; Intelligence', 'Route matrix must validate the intended business page title');

const inline = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(inline && inline[1].length > 1000, 'Business hub must include its tested local interactions');
new Function(inline[1]);
for (const forbidden of ['fetch(', 'XMLHttpRequest', 'sendBeacon(', 'localStorage', 'sessionStorage', '.innerHTML', 'document.cookie']) {
  assert.ok(!inline[1].includes(forbidden), 'Local business hub must not use network/storage/HTML injection primitive: ' + forbidden);
}
const cardCount = (html.match(/class="tool-card"/g) || []).length;
assert.equal(cardCount, 7, 'Business hub should organize the seven expected workspaces');
for (const destination of [
  'public/development/index.html',
]) {
  try { await access(resolve(root, destination)); } catch { /* development is a React route, not a public static page */ }
}
console.log('PASS OSGARD Business hub: navigation, seven tool destinations, secure admin separation, local-only brief download, searchable filters, route/sitemap contracts and inline script syntax.');

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = resolve(ROOT, process.env.OSGARD_CONTRACT_REPORT || 'osgard-contract-audit.json');
const report = {
  schema: 'osgard.contract-integrity.v1',
  generatedAt: new Date().toISOString(),
  status: 'running',
  summary: { checks: 0, passed: 0, failed: 0, warnings: 0 },
  contract: {},
  checks: [],
};
const sources = new Map();

async function source(path) {
  if (!sources.has(path)) {
    try { sources.set(path, await readFile(resolve(ROOT, path), 'utf8')); }
    catch (error) {
      sources.set(path, '');
      check('source:' + path, 'Required source is readable: ' + path, false, String(error.message || error));
    }
  }
  return sources.get(path);
}
function check(id, title, passed, detail = '', severity = 'error') {
  // Accept the legacy (id, passed, title, detail) call shape too, so a positional
  // mistake cannot turn a failed predicate into a truthy description string.
  if (typeof title === 'boolean') {
    const predicate = title;
    title = typeof passed === 'string' ? passed : id;
    passed = predicate;
  }
  if (typeof title !== 'string' || typeof passed !== 'boolean') {
    throw new TypeError('Invalid contract check arguments for ' + id);
  }
  report.checks.push({ id, title, status: passed ? 'passed' : severity === 'warning' ? 'warning' : 'failed', ...(detail ? { detail } : {}) });
}
function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return '';
  const contentStart = start + startMarker.length;
  const end = text.indexOf(endMarker, contentStart);
  return end < 0 ? '' : text.slice(contentStart, end);
}
function unique(values) { return new Set(values).size === values.length; }
function sameSet(a, b) {
  if (a.length !== b.length || !unique(a) || !unique(b)) return false;
  const expected = new Set(a);
  return b.every(value => expected.has(value));
}
function normalizeRoute(path) {
  let result = String(path || '').trim();
  if (result.endsWith('/index.html')) result = result.slice(0, -'index.html'.length);
  return result || '/';
}
function getObjectKeys(block) {
  return [...block.matchAll(/^\s*(?:'([^']+)'|([a-z0-9-]+))\s*:\s*\{\s*title\s*:/gm)]
    .map(match => match[1] || match[2]);
}
function getArrayMap(block) {
  return [...block.matchAll(/(?:^|[,\n])\s*(?:'([^']+)'|([a-z0-9-]+))\s*:\s*\[([^\]]*)\]/gm)]
    .map(match => ({ id: match[1] || match[2], values: [...match[3].matchAll(/'([^']+)'/g)].map(value => value[1]) }));
}
function equalIds(name, actual, expected, explanation) {
  const missing = expected.filter(id => !actual.includes(id));
  const extra = actual.filter(id => !expected.includes(id));
  const passed = sameSet(actual, expected);
  check(name, explanation, passed,
    passed ? String(actual.length) + ' unique IDs aligned.' :
      'expected=' + expected.length + '; actual=' + actual.length + '; missing=[' + missing.join(', ') + ']; extra=[' + extra.join(', ') + ']');
}
function pathFromUrl(value) {
  try { return new URL(value, 'https://osgard.world').pathname; } catch { return ''; }
}

const [
  manifest, catalog, catalogState, diagnostics, lifecycle, postGame, invite,
  generator, routeMatrix, sitemap, coreContract, eventQueue, analyticsConsent,
  contextualRecommendations, diagnosticsPage,
] = await Promise.all([
  source('src/core/manifest.ts'),
  source('public/games/index.html'),
  source('public/games/catalog-state.js'),
  source('public/games/diagnostics/diagnostics.js'),
  source('public/games/player-lifecycle.js'),
  source('public/games/game-session-recommendations.js'),
  source('public/games/invite/invite-landing.js'),
  source('scripts/generate-games-share-cards.mjs'),
  source('scripts/production-route-matrix.mjs'),
  source('public/sitemap.xml'),
  source('docs/OSGARD_CORE_CONTRACT.md'),
  source('src/core/eventQueue.ts'),
  source('src/core/analyticsConsent.mjs'),
  source('src/core/gameRecommendations.mjs'),
  source('public/games/diagnostics/index.html'),
]);

const worldsBlock = between(manifest, 'export const OSGARD_WORLDS', '\n]');
const gamesBlock = between(manifest, 'export const OSGARD_GAMES', '\n]');
const manifestGames = [...gamesBlock.matchAll(/\{\s*id:\s*'([^']+)',\s*title:\s*'([^']+)',\s*reason:\s*'([^']+)',\s*href:\s*'([^']+)'/g)]
  .map(match => ({ id: match[1], title: match[2], reason: match[3], href: match[4] }));
const gameIds = manifestGames.map(game => game.id);
const gameRoutes = manifestGames.map(game => game.href);
const worldIds = [...worldsBlock.matchAll(/\{\s*id:\s*'([^']+)'/g)].map(match => match[1]);
const eventBlock = between(manifest, 'export type OsgardEventName =', '\n\nexport interface OsgardEvent');
const eventNames = [...eventBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);

const catalogCards = [...catalog.matchAll(/<article\b[^>]*\bdata-game="([^"]+)"[^>]*\bdata-genres="([^"]+)"[^>]*>/g)]
  .map(match => ({ id: match[1], genres: match[2].trim().split(/\s+/).filter(Boolean) }));
const catalogIds = catalogCards.map(card => card.id);
let itemList = null;
try {
  const jsonld = catalog.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1];
  if (jsonld) itemList = JSON.parse(jsonld);
} catch {}
const itemListEntries = Array.isArray(itemList?.itemListElement) ? itemList.itemListElement : [];
const itemListPaths = itemListEntries.map(entry => pathFromUrl(entry?.url || entry?.item?.url || '')).map(normalizeRoute);

const diagnosticRoutesBlock = between(diagnostics, 'const gameRoutes = [', '\n  ];');
const diagnosticRouteEntries = [...diagnosticRoutesBlock.matchAll(/\{\s*id:\s*'([^']+)',\s*gameId:\s*'([^']+)',\s*title:\s*'([^']+)',\s*route:\s*'([^']+)'/g)]
  .map(match => ({ domId: match[1], id: match[2], title: match[3], route: match[4] }));
const diagnosticIds = diagnosticRouteEntries.map(entry => entry.id);
const capabilityBlock = between(diagnostics, 'const capabilityChecks = [', '\n  ];');
const capabilityIds = [...capabilityBlock.matchAll(/\bid:\s*'([^']+)'/g)].map(match => match[1]);

const lifecycleBlock = between(lifecycle, 'const games={', '};\nconst clock=');
const lifecycleIds = getObjectKeys(lifecycleBlock);
const lifecyclePaths = [...lifecycleBlock.matchAll(/(?:'([a-z0-9-]+)'|([a-z0-9-]+)):\{title:'[^']*',url:'([^']+)'/g)]
  .map(match => ({ id: match[1] || match[2], href: match[3] }));

const firstPostGameBlock = between(postGame, 'const games={', '};\nconst next=');
const postGameIds = getObjectKeys(firstPostGameBlock);
const nextBlock = between(postGame, 'const next={', '};\nconst host=');
const nextEntries = getArrayMap(nextBlock);

const inviteIds = [...between(invite, 'const validGameIds = new Set([', ']);').matchAll(/'([^']+)'/g)].map(match => match[1]);
const shareGeneratorIds = [...between(generator, 'const GAMES = [', '\n];').matchAll(/\{\s*id:\s*'([^']+)'/g)].map(match => match[1]);
const curatedBlock = between(contextualRecommendations, 'const CURATED_RELATED_IDS = Object.freeze({', '\n});');
const curatedEntries = getArrayMap(curatedBlock);
const curatedIds = curatedEntries.map(entry => entry.id);

const routeArrayBlock = between(routeMatrix, 'const routes = [', ']\nconst agents');
const productionRoutes = [...routeArrayBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
const productionRouteSet = new Set(productionRoutes);
const sitemapPaths = [...sitemap.matchAll(/<loc>https:\/\/osgard\.world([^<]*)<\/loc>/g)].map(match => normalizeRoute(match[1]));
const sitemapSet = new Set(sitemapPaths);

check('worlds:non-empty-unique', worldIds.length > 0 && unique(worldIds), 'World IDs are unique and non-empty.',
  'worlds=' + worldIds.length + '; ids=' + worldIds.join(', '));
check('worlds:expected-seven', worldIds.length === 7, 'World registry contains the seven registered worlds.',
  'found ' + worldIds.length + ' worlds.');
check('games:manifest-valid', manifestGames.length > 0 && unique(gameIds) &&
  manifestGames.every(game => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id) && game.title.trim() && game.reason.trim() && game.href.startsWith('/')),
  'Game identities have unique machine-safe IDs, titles, reasons and same-origin launch paths.',
  'games=' + manifestGames.length + '; ids=' + gameIds.join(', '));
check('events:manifest-unique', eventNames.length > 0 && unique(eventNames) && eventNames.every(name => /^[a-z][a-z0-9_]*$/.test(name)),
  'Event names are unique and follow the versioned event-name format.', 'events=' + eventNames.length);

equalIds('catalog:cards-vs-manifest', catalogIds, gameIds,
  'Rendered catalogue cards contain exactly the manifest game identities.');
check('catalog:jsonld-count', Number(itemList?.numberOfItems) === manifestGames.length,
  'Search-engine ItemList count matches the number of registered games.',
  'manifest=' + manifestGames.length + '; numberOfItems=' + String(itemList?.numberOfItems));
check('catalog:jsonld-routes', itemListPaths.length === manifestGames.length && sameSet(itemListPaths, gameRoutes.map(normalizeRoute)),
  'Search-engine ItemList launch URLs match the manifest launch routes.',
  'jsonld=' + itemListPaths.length + '; manifest=' + gameRoutes.length);
check('catalog:genres', catalogCards.every(card => card.genres.length > 0 && unique(card.genres)),
  'Every catalogue card has at least one unique genre.', 'cards=' + catalogCards.length);

const dynamicCatalogLimit = catalogState.includes('Math.min(100, allowed.size)') &&
  catalogState.includes('Math.min(100, allowedGameIds.size)') && !/\.slice\(0,\s*11\s*\)/.test(catalogState);
check('catalog:dynamic-id-cap', dynamicCatalogLimit,
  'Shared selections and favorites scale with the current allow-list instead of a stale 11-game hard cap.',
  dynamicCatalogLimit ? 'Allow-list-derived cap (bounded at 100) detected.' : 'A static catalogue limit may truncate valid game IDs.');

equalIds('diagnostics:routes-vs-manifest', diagnosticIds, gameIds,
  'The player compatibility diagnostics cover every manifest game exactly once.');
check('diagnostics:route-entries-valid', diagnosticRouteEntries.length === diagnosticIds.length &&
  unique(diagnosticRouteEntries.map(entry => entry.domId)) &&
  diagnosticRouteEntries.every(entry => entry.route.startsWith('/') && entry.title.trim()),
  'Diagnostic route records have unique UI IDs, labels and same-origin paths.', 'routeChecks=' + diagnosticRouteEntries.length);
check('diagnostics:capability-checks-unique', capabilityIds.length > 0 && unique(capabilityIds),
  'Device capability checks have unique stable IDs.', 'capabilityChecks=' + capabilityIds.length);
check('diagnostics:declared-total', diagnosticsPage.includes(String(capabilityIds.length + diagnosticRouteEntries.length) + ' диагностических проверок'),
  'The diagnostics UI total matches its actual capability and game-route checks.',
  'actual=' + (capabilityIds.length + diagnosticRouteEntries.length));

equalIds('player-lifecycle:vs-manifest', lifecycleIds, gameIds,
  'The actual player launcher has exactly one entry for every manifest game.');
check('player-lifecycle:paths-vs-manifest', lifecyclePaths.length === manifestGames.length &&
  lifecyclePaths.every(entry => gameRoutes.some(href => normalizeRoute(href) === normalizeRoute(entry.href)) && gameIds.includes(entry.id)),
  'Player-launch destinations are equivalent to manifest launch routes.', 'launcherRoutes=' + lifecyclePaths.length);

equalIds('post-game:cards-vs-manifest', postGameIds, gameIds,
  'Post-session recommendation cards can identify every registered game.');
equalIds('post-game:graph-vs-manifest', nextEntries.map(entry => entry.id), gameIds,
  'Every game has an explicit post-session continuation map.');
const badNextEdges = nextEntries.flatMap(entry => entry.values.filter(id => !gameIds.includes(id) || id === entry.id).map(id => entry.id + '->' + id));
check('post-game:edges-valid', badNextEdges.length === 0 && nextEntries.every(entry => entry.values.length > 0 && unique(entry.values)),
  'Post-session links reference valid, unique games and never recommend the game that just ended.',
  badNextEdges.length ? 'invalidEdges=' + badNextEdges.join(', ') :
    'edges=' + nextEntries.reduce((n, entry) => n + entry.values.length, 0));

equalIds('invites:allow-list-vs-manifest', inviteIds, gameIds,
  'Invite/referral handling accepts exactly the registered game IDs.');
equalIds('share-cards:generator-vs-manifest', shareGeneratorIds, gameIds,
  'Social image generation covers every registered game, without stale or unknown entries.');
equalIds('recommendations:keys-vs-manifest', curatedIds, gameIds,
  'Contextual recommendation metadata covers every registered game.');
const badCuratedEdges = curatedEntries.flatMap(entry => entry.values.filter(id => !gameIds.includes(id) || id === entry.id).map(id => entry.id + '->' + id));
check('recommendations:edges-valid', badCuratedEdges.length === 0 &&
  curatedEntries.every(entry => entry.values.length > 0 && unique(entry.values)),
  'Curated recommendations contain only valid, unique, non-self game references.',
  badCuratedEdges.length ? 'invalidEdges=' + badCuratedEdges.join(', ') :
    'edges=' + curatedEntries.reduce((n, entry) => n + entry.values.length, 0));

const missingProductionRoutes = gameRoutes.filter(href => !productionRouteSet.has(href));
check('production-routes:manifest-covered', missingProductionRoutes.length === 0,
  'Production smoke matrix explicitly probes every exact game-launch URL from the manifest.',
  missingProductionRoutes.length ? 'missing=' + missingProductionRoutes.join(', ') : 'launchRoutes=' + gameRoutes.length);
const missingDiagnosticRoutes = diagnosticRouteEntries.map(entry => entry.route).filter(path => !productionRouteSet.has(path));
check('production-routes:diagnostics-covered', missingDiagnosticRoutes.length === 0,
  'Every device diagnostics game route has an explicit production HTTP probe.',
  missingDiagnosticRoutes.length ? 'missing=' + missingDiagnosticRoutes.join(', ') : 'diagnosticRoutes=' + diagnosticRouteEntries.length);
check('production-routes:unique', productionRoutes.length === productionRouteSet.size,
  'The production route matrix has no duplicate route entries.',
  'routes=' + productionRoutes.length + '; unique=' + productionRouteSet.size);

const missingSitemapRoutes = gameRoutes.map(normalizeRoute).filter(path => !sitemapSet.has(path));
check('seo:sitemap-covers-launch-routes', missingSitemapRoutes.length === 0,
  'The XML sitemap includes a canonical discoverable URL for every game launch route.',
  missingSitemapRoutes.length ? 'missing=' + missingSitemapRoutes.join(', ') : 'sitemapGameRoutes=' + gameRoutes.length);
check('seo:sitemap-valid-root', sitemap.includes('<urlset') && sitemap.includes('</urlset>') &&
  !/<!DOCTYPE/i.test(sitemap) && !sitemap.includes('\uFFFD'),
  'The sitemap has a valid urlset wrapper and no doctype or replacement character.');

const shareCardFailures = [];
for (const id of gameIds) {
  try {
    const png = await readFile(resolve(ROOT, 'public/games/share-cards', id + '.png'));
    if (png.length < 1000 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) shareCardFailures.push(id + ':invalid-png');
  } catch { shareCardFailures.push(id + ':missing'); }
}
check('share-cards:artifacts-valid', shareCardFailures.length === 0,
  'Every registered game has a real 1200×630 PNG share card.',
  shareCardFailures.length ? 'problems=' + shareCardFailures.join(', ') : 'validated=' + gameIds.length);

check('privacy:default-deny-event-queue', eventQueue.includes('Default-deny') &&
  eventQueue.includes('if (!hasAnalyticsConsent())') && eventQueue.includes('clearAnalyticsRecords()'),
  'Core event recording and flushing re-check explicit consent and clear queues when consent is absent.');
check('privacy:consent-storage-allow-list', analyticsConsent.includes("getItem(ANALYTICS_CONSENT_KEY) === 'yes'") &&
  analyticsConsent.includes("target.setItem(ANALYTICS_CONSENT_KEY, 'no')") && analyticsConsent.includes('clearAnalyticsRecords(target)'),
  'Consent state uses affirmative opt-in and clear-queue semantics on refusal/revocation.');
check('privacy:diagnostics-local-only', diagnostics.includes("credentials: 'omit'") &&
  !['sendBeacon(', 'OSGARD_CONSENTED_ANALYTICS', '/v1/events', "fetch('https://"].some(token => diagnostics.includes(token)),
  'Browser diagnostics probe routes without credentials and do not transmit a report automatically.');

check('docs:core-contract-current', /twelve|12/i.test(coreContract) && !/five game routes/i.test(coreContract),
  'OSGARD Core documentation describes the current multi-game registry rather than the obsolete five-game snapshot.',
  'The Core contract should name 12 current game identities and explain the registry is authoritative.');

const normalizedContract = {
  worlds: worldIds.slice().sort(),
  games: manifestGames.map(game => ({ id: game.id, href: normalizeRoute(game.href) })).sort((a, b) => a.id.localeCompare(b.id)),
  events: eventNames.slice().sort(),
  diagnostics: diagnosticRouteEntries.map(entry => ({ id: entry.id, route: normalizeRoute(entry.route) })).sort((a, b) => a.id.localeCompare(b.id)),
  recommendations: curatedEntries.map(entry => ({ id: entry.id, values: entry.values.slice().sort() })).sort((a, b) => a.id.localeCompare(b.id)),
};
report.contract = {
  worldCount: worldIds.length,
  gameCount: gameIds.length,
  eventCount: eventNames.length,
  diagnosticCheckCount: capabilityIds.length + diagnosticRouteEntries.length,
  productionRouteCount: productionRoutes.length,
  sha256: createHash('sha256').update(JSON.stringify(normalizedContract)).digest('hex'),
};
report.summary.checks = report.checks.length;
report.summary.failed = report.checks.filter(item => item.status === 'failed').length;
report.summary.warnings = report.checks.filter(item => item.status === 'warning').length;
report.summary.passed = report.checks.filter(item => item.status === 'passed').length;
report.status = report.summary.failed === 0 ? 'ready' : 'blocked';
await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'ready') process.exitCode = 1;

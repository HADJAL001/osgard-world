import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const fallback = JSON.parse(read('public/games/game-catalog-fallback.json'));
const catalogIds = fallback.items.map((item) => item.id).sort();

assert.equal(new Set(catalogIds).size, catalogIds.length, 'Fallback catalog game IDs must be unique');
assert.ok(catalogIds.length > 0, 'Fallback catalog must contain games');

const commerceClient = read('public/games/commerce-client.js');
const attributionMatch = commerceClient.match(/const ATTRIBUTION_GAME_IDS = new Set\(\[([^\]]+)\]\);/);
assert.ok(attributionMatch, 'Commerce client attribution allow-list is missing');
const attributionIds = [...attributionMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]).sort();
assert.deepEqual(
  attributionIds,
  catalogIds,
  'Every catalogue game must retain its attribution ID in the commerce client (and no retired IDs may remain)',
);

const manifest = read('src/core/manifest.ts');
const gameTypeMatch = manifest.match(/export type OsgardGameId = ([^\n]+)/);
assert.ok(gameTypeMatch, 'OsgardGameId union is missing');
const frontendIds = [...gameTypeMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
assert.deepEqual(frontendIds, catalogIds, 'Frontend game ID type must match the canonical catalogue');

const backend = read('services/osgard-commerce-api/src/game-catalog.mjs');
const backendStart = backend.indexOf('const DEFAULT_GAME_CATALOG = Object.freeze([');
assert.ok(backendStart >= 0, 'Backend default game catalog is missing');
const backendEnd = backend.indexOf(']);', backendStart);
assert.ok(backendEnd > backendStart, 'Backend default game catalog declaration is malformed');
const backendIds = [...backend.slice(backendStart, backendEnd).matchAll(/\bid:\s*["']([^"']+)["']/g)]
  .map((match) => match[1])
  .sort();
assert.deepEqual(backendIds, catalogIds, 'Backend catalog must match the canonical game IDs');

const consentedAnalytics = read('public/games/consented-analytics.js');
assert.ok(consentedAnalytics.includes("'cross_promo_clicked'"), 'Consent-gated game analytics must allow cross-promotion click events');

const development = read('src/Development.tsx');
assert.ok(development.includes("recordOsgardEvent('cross_promo_clicked'"), 'Ecosystem directory must record cross-promo clicks');
assert.ok(development.includes("destination.searchParams.set('utm_source', 'osgard_world')"), 'Consented ecosystem links must include a source tag');
assert.ok(development.includes("destination.searchParams.set('utm_medium', 'ecosystem_directory')"), 'Consented ecosystem links must include a medium tag');
assert.ok(development.includes("destination.searchParams.set('utm_campaign', 'development_portfolio')"), 'Consented ecosystem links must include a campaign tag');
const trackingStart = development.indexOf('function trackProjectClick(');
const trackingEnd = development.indexOf('\n}', trackingStart);
assert.ok(trackingStart >= 0 && trackingEnd > trackingStart, 'Project click tracking handler is missing');
const trackingBody = development.slice(trackingStart, trackingEnd);
assert.ok(
  trackingBody.indexOf('if (!hasAnalyticsConsent()) return') >= 0 &&
  trackingBody.indexOf('if (!hasAnalyticsConsent()) return') < trackingBody.indexOf('destination.searchParams.set'),
  'Outbound attribution must remain disabled until the user opts in',
);
assert.ok(development.includes('onClick={event => trackProjectClick(event, url, name, index)}'), 'Project cards must wire the consent-gated tracking handler');

console.log(`PASS game attribution contract: ${catalogIds.length} catalogue games match frontend types, backend catalogue and commerce attribution; project tracking stays consent-gated.`);

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const files = {
  core: 'services/osgard-commerce-api/src/core.mjs',
  tests: 'services/osgard-commerce-api/test/core.test.mjs',
  api: 'services/osgard-commerce-api/src/server.mjs',
  admin: 'public/games/commerce-admin/index.html',
  player: 'public/games/game-session-recommendations.js',
};
for (const [name, file] of Object.entries(files)) {
  assert.ok(existsSync(resolve(root, file)), 'Missing OSGARD SELECT config file: ' + name);
}
const read = name => readFileSync(resolve(root, files[name]), 'utf8');
const core = read('core');
const tests = read('tests');
const api = read('api');
const admin = read('admin');
const player = read('player');

assert.ok(core.includes('export const OWNED_PROMO_SERVICE_IDS'), 'Server-controlled promo service allow-list missing');
assert.ok(core.includes('export const DEFAULT_OWNED_PROMO_CONFIG'), 'Safe startup defaults missing');
assert.ok(core.includes('export function validateOwnedPromoConfig'), 'Strict promotion-setting validation missing');
assert.ok(core.includes('export function migrateOwnedPromoConfig'), 'Versioned owned-promo migration missing');
assert.ok(core.includes('OWNED_PROMO_SCHEMA_VERSION_INVALID'), 'Unknown config schema versions must fail closed');
assert.ok(api.includes('migrateOwnedPromoConfig(row.config)'), 'Legacy PostgreSQL settings must be migrated on read');
assert.ok(core.includes('schemaVersion: 2'), 'Current owned-promo schema must be explicitly versioned');

for (const code of [
  'OWNED_PROMO_FREQUENCY_INVALID',
  'OWNED_PROMO_SERVICE_NOT_ALLOWED',
  'OWNED_PROMO_SERVICE_DUPLICATED',
  'OWNED_PROMO_DEFAULT_NOT_ENABLED',
  'OWNED_PROMO_SPOTLIGHT_NOT_ENABLED',
  'OWNED_PROMO_REWARDS_INVALID',
]) assert.ok(core.includes(code), 'Missing validation failure: ' + code);
assert.ok(core.includes('"partner-studio"'), 'Owned-services allow-list must include the commercial Partner Studio entry');
assert.ok(core.slice(core.indexOf('export const OWNED_PROMO_SERVICE_IDS'), core.indexOf(']);', core.indexOf('export const OWNED_PROMO_SERVICE_IDS'))).includes('"gardvpn"'), 'Owner-requested GARD VPN must be available in the managed promotion allow-list');
assert.ok(tests.includes('owned-service promotion settings validate the public service allow-list'), 'Unit tests for owned-promo validation are missing');

assert.ok(api.includes('CREATE TABLE IF NOT EXISTS commerce_owned_promo_config'), 'Persistent PostgreSQL settings table missing');
assert.ok(api.includes('INSERT INTO commerce_owned_promo_config (config_id, config) VALUES (1, $1::jsonb) ON CONFLICT (config_id) DO NOTHING'), 'First-boot default seeding must be idempotent');
assert.ok(api.includes('app.get("/v1/owned-promo/config"'), 'Public configuration endpoint missing');
assert.ok(api.includes('app.get("/v1/admin/owned-promo/config", requireAdmin'), 'Admin configuration read must require server auth');
assert.ok(api.includes('app.post("/v1/admin/owned-promo/config", requireAdmin, ownedPromoConfigWriteLimiter'), 'Admin configuration write must be authenticated and rate-limited');
assert.ok(api.includes('ON CONFLICT (config_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()'), 'Settings must persist in PostgreSQL');
assert.ok(api.includes('Cache-Control", "no-store, private"'), 'Sensitive admin responses must not be cached privately by browsers/proxies');

for (const id of [
  'promo-global-enabled',
  'promo-share-rewards-enabled',
  'promo-default-frequency',
  'promo-spotlight-service',
  'promo-enabled-services',
  'promo-default-services',
  'save-owned-promo-settings',
  'reload-owned-promo-settings',
  'owned-promo-settings-status',
]) assert.ok(admin.includes('id="' + id + '"'), 'Admin settings control missing: ' + id);
assert.ok(admin.includes('/v1/admin/owned-promo/config'), 'Admin page must use protected settings endpoints');
assert.ok(admin.includes("Authorization: 'Bearer ' + token"), 'Admin API token must stay in the authenticated request');
assert.ok(admin.includes("window.addEventListener('pagehide',()=>{token='';$('#token').value='';})"), 'Admin token must be cleared from page memory on exit');
assert.ok(admin.includes('data-promo-enabled') && admin.includes('data-promo-default'), 'Service checkbox groups missing');
assert.ok(admin.includes('updatePromoDefaultChoices()'), 'Default selections must be limited to enabled services');
const adminPage = readFileSync(resolve(root, 'public/games/commerce-admin/index.html'), 'utf8')
const ownedPromoPlayer = readFileSync(resolve(root, 'public/games/game-session-recommendations.js'), 'utf8')
assert.ok(adminPage.includes('<option value="gardvpn">GARD VPN</option>'), 'GARD VPN must be selectable as the admin spotlight')
assert.ok(ownedPromoPlayer.includes("['gardvpn','08','GARD VPN','PRIVACY / VPN','VPN-сервис GARD VPN. Открой официальный сайт, чтобы изучить доступные условия.','https://gardvpn.is/']"), 'GARD VPN must be selectable without claiming that VPN connectivity was independently verified')


assert.ok(player.includes("fetch('/commerce-api/v1/owned-promo/config'"), 'Game intermission must consume the server-published configuration');
assert.ok(player.includes('const legacy=raw.schemaVersion!==2') && player.includes("if(legacy&&!enabledServices.includes('gardvpn'))enabledServices.push('gardvpn')"), 'Old public config responses must migrate GARD VPN into the player chooser');
assert.ok(player.includes("defaultFrequency=legacy?'each'") && player.includes("showShareRewards:legacy?true"), 'Legacy config migration must apply every-session promos and the configured share reward shelf');
assert.ok(player.includes('managedPromoConfig.enabledServices.includes(id)'), 'Global allow-list must filter intermission options');
assert.ok(player.includes('if(!managedPromoConfig.enabled)return false'), 'Global promo off switch must suppress self-promotion');
assert.ok(player.includes('managedPromoConfig.defaultSelectedServices.slice()'), 'Fresh player preferences must use managed defaults');
assert.ok(player.includes('managedPromoConfig.spotlightService!==\'auto\''), 'Admin must be able to choose a spotlight service');
assert.ok(player.includes('if(managedPromoConfig.showShareRewards)panels.push(rewardShelf(id))'), 'Admin reward switch must govern the intermission reward shelf');
assert.ok(player.includes("document.addEventListener('osgard:owned-promo-config-updated'"), 'Open intermission must refresh after configuration arrives');
assert.ok(player.includes('localStorage.getItem(servicePreferencesKey)'), 'Existing individual preferences must be retained');
console.log('PASS OSGARD SELECT managed config: allow-list, validation, PostgreSQL persistence, protected/rate-limited writes, admin controls and player intermission wiring.');

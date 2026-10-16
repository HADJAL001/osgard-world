import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
const read = p => readFileSync(p, 'utf8')
const has = p => assert.ok(existsSync(p), 'Missing release input: ' + p)
const root = 'public/games/cascade-lab'
const html = read(root + '/index.html')
const worker = read(root + '/service-worker.js')
const replay = read(root + '/replay-observatory.js')
const manifest = JSON.parse(read(root + '/manifest.webmanifest'))
const portal = read('public/games/index.html')
const lifecycle = read('public/games/player-lifecycle.js')
const promo = read('public/games/game-session-recommendations.js')
const admin = read('public/games/commerce-admin/index.html')
const commerceConfig = JSON.parse(read('public/games/commerce-config.json'))
const modules = ['delta-lens.js','hypothesis-lab.js?v=0.18.0','engineering-suite.js?v=0.19.0','experiment-studio.js?v=0.20.0','case-passport.js?v=0.21.0','trajectory-xray.js?v=0.22.0','mission-director.js?v=0.24.1','evidence-integrity.js?v=0.25.0','replay-observatory.js?v=0.26.0']
for (const mod of modules) {
  assert.ok(html.includes('./' + mod), 'Game loader missing ' + mod)
  assert.ok(worker.includes('./' + mod), 'Offline precache missing ' + mod)
  has(root + '/' + mod.split('?')[0])
}
assert.ok(html.includes('id="CASCADELAB026"') && html.includes('osgard-game-pwa" content="0.26.0-offline-field-device"'), 'Replay/PWA 0.26 integration missing')
assert.ok(html.includes('data-cascade-lab-ready="true"') && html.includes("notifyOsgardLifecycle('started'") && html.includes("notifyOsgardLifecycle('completed'"), 'Portal lifecycle contract missing')
assert.ok(worker.includes("CACHE='osgard-cascade-lab-shell-v0.26.2'"), 'Offline cache version missing')
assert.ok(manifest.scope === './' && manifest.start_url.startsWith('./'), 'PWA scope must stay in the game folder')
assert.ok(replay.includes('osgard.cascade-lab.replay-observatory.v1') && !/fetch\(|XMLHttpRequest|sendBeacon\(/.test(replay), 'Replay Observatory schema/privacy contract failed')
assert.ok(portal.includes('data-game="cascade-lab"') && portal.includes('/games/cascade-lab/'), 'Catalog card/route missing')
assert.ok(lifecycle.includes('event.origin!==location.origin') && lifecycle.includes('event.source!==frame.contentWindow'), 'Iframe messages must validate origin and source')
assert.ok(promo.includes('OSGARD SELECT / BETWEEN WORLDS') && promo.includes('РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD'), 'Owned-service disclosure missing')
assert.ok(promo.includes('Настроить показ') && promo.includes('every3') && promo.includes("'off'"), 'Frequency controls missing')
assert.ok(promo.includes('MARCOSA') && promo.includes('SENJORIO') && promo.includes('SUPERDAY'), 'Core cross-promo campaigns missing')
assert.ok(promo.includes('dailyReward=50') && promo.includes('function rewardShelf') && promo.includes("localStorage.getItem(selectConsentKey)==='yes'"), 'Share reward / consent boundary missing')
assert.ok(!/doubleclick\.net|googlesyndication\.com|adsbygoogle/.test(promo), 'Unexpected third-party ad SDK')
assert.ok(admin.toLowerCase().includes('<!doctype html>') && commerceConfig && typeof commerceConfig === 'object', 'Commerce admin/config missing')
for (const p of [
 'docs/13_CASCADE_LAB_GAMES_INTEGRATION.md','docs/33_CASCADE_LAB_0.26.0_REPLAY_OBSERVATORY.md','docs/CASCADE_LAB_PWA_0.26.0_OFFLINE_FIELD_DEVICE.md',
 'scripts/cascade-lab-replay-observatory-smoke.mjs','scripts/cascade-lab-pwa-smoke.mjs','scripts/cascade-lab-hypothesis-smoke.mjs',
 'scripts/cascade-lab-engineering-suite-smoke.mjs','scripts/cascade-lab-experiment-studio-smoke.mjs','scripts/cascade-lab-trajectory-xray-smoke.mjs',
 'scripts/cascade-lab-mission-director-smoke.mjs','scripts/cascade-lab-evidence-integrity-smoke.mjs','scripts/games-detail-smoke.mjs',
 'scripts/games-portal-smoke.mjs','scripts/osgard-select-growth-smoke.mjs','scripts/game-intermission-sponsor-smoke.mjs',
 'scripts/game-recommendations-smoke.mjs','public/games/commerce-client.js','services/osgard-commerce-api/package.json','services/osgard-commerce-api/src/server.mjs'
]) has(p)
console.log(JSON.stringify({status:'passed',featureBlocks:5,modules:modules.length,portalLifecycle:true,osgardSelect:true,shareReward:true,consentGatedAnalytics:true,offlinePrecache:true,commerceAdmin:true},null,2))

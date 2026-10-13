import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as core from '../public/games/player-passport-core.js'

const read = (path) => readFileSync(resolve(path), 'utf8')
const hub = read('public/games/index.html')
const luxury = read('public/games/luxury.js')
const moduleSource = read('public/games/player-passport.js')
const css = read('public/games/player-passport.css')
const routes = read('scripts/production-route-matrix.mjs')
const packageJson = JSON.parse(read('package.json'))
const workflow = read('.github/workflows/deploy-frontend.yml')

const cards = [...hub.matchAll(/<article\b[^>]*\bdata-game="([^"]+)"/g)].map(match => match[1]).sort()
const expected = [...core.PASSPORT_GAME_IDS].sort()
assert.equal(cards.length, 11, 'The current Games hub should expose eleven game cards')
assert.deepEqual(cards, expected, 'Player Passport game registry must exactly match the catalogue')
assert.equal(new Set(cards).size, cards.length, 'Catalogue game IDs must be unique')
assert.ok(hub.includes('id="catalog-total">11</b>') && hub.includes('id="catalog-range">01—11</b>'), 'Initial visible catalogue counters must show eleven worlds')
assert.ok(luxury.includes("const catalogCount = Array.from(grid.querySelectorAll('.card[data-game]'))") && luxury.includes("allCountBadge.textContent = String(catalogCount)"), 'Catalogue counters must be derived from real cards')
assert.ok(!hub.includes('Все игры <b>10</b>') && !hub.includes('<b>01—10</b>'), 'Stale ten-game counter must be removed')
assert.ok(hub.includes('<link rel="canonical" href="https://osgard.world/games/">'), 'Games hub canonical URL must remain stable')
for (const meta of [
  'property="og:type" content="website"',
  'property="og:site_name" content="OSGARD WORLD GAMING"',
  'property="og:url" content="https://osgard.world/games/"',
  'name="twitter:card" content="summary_large_image"'
]) assert.ok(hub.includes(meta), 'Missing social/SEO metadata: ' + meta)
assert.ok(hub.includes('https://osgard.world/games/share-cards/catalog.png') && existsSync(resolve('public/games/share-cards/catalog.png')), 'Social image metadata must reference an existing catalogue card')

assert.ok(hub.includes('id="osgard-player-passport"') && hub.includes('data-passport-content hidden'), 'Passport content must start hidden until its module loads')
assert.ok(hub.includes('data-passport-load') && hub.includes('id="passport-loading"'), 'Passport needs an explicit manual loading fallback')
assert.ok(hub.includes("rootMargin: '220px 0px'") && hub.includes('player-passport.js?v=__OSGARD_BUILD_VERSION__'), 'Passport must load lazily near viewport and use release-versioned assets')
assert.ok(hub.includes('/games/player-passport.css?v=__OSGARD_BUILD_VERSION__'), 'Passport CSS should load on demand')
for (const id of ['passport-sessions','passport-worlds','passport-favorites','passport-streak','passport-xp','passport-level','passport-level-progress','passport-shards','passport-missions','passport-badges','passport-resume']) {
  assert.ok(hub.includes('id="' + id + '"'), 'Passport UI target missing: ' + id)
}
for (const action of ['data-passport-share','data-passport-export','data-passport-reset']) assert.ok(hub.includes(action), 'Passport action missing: ' + action)
assert.ok(css.includes('@media(max-width:600px)') && css.includes('prefers-reduced-motion:reduce'), 'Passport must be responsive and honor reduced motion')
assert.ok(css.includes('.og-passport-badge.is-unlocked') && css.includes('.og-passport-mission.is-complete'), 'Badge and mission completion states must be visually distinct')
assert.ok(moduleSource.includes("document.addEventListener('osgard:game-session-ended'") && moduleSource.includes('detail.sessionStarted !== true'), 'Only a confirmed started session return may update passport session history')
assert.ok(moduleSource.includes('window.OSGARDInvite') && moduleSource.includes('navigator.share') && moduleSource.includes('navigator.clipboard.writeText'), 'Invites should reuse OSGARD attribution links with native-share and copy fallbacks')
assert.ok(moduleSource.includes('recordInvite(passport,') && moduleSource.includes('Публичная публикация не проверяется'), 'Invite mission must not claim that a public social post was verified')
assert.ok(moduleSource.includes('passport-export-') && moduleSource.includes('application/json'), 'Player must be able to export the local passport as JSON')
assert.ok(moduleSource.includes('window.confirm') && moduleSource.includes('Избранное, история и SHARDS сохранены отдельно'), 'Reset must be explicit and must not delete favorites/history/wallet')
assert.ok(moduleSource.includes('localStorage') && moduleSource.includes('localStorage.removeItem') === false, 'Passport module should preserve user-controlled local data and avoid bulk deletion')
assert.ok(!moduleSource.includes('fetch(') && !moduleSource.includes('XMLHttpRequest'), 'Player Passport must not send local history or invite data to a server')
assert.ok(!core.derivePassport.toString().includes('fetch('), 'Core model should remain pure and network-free')
assert.ok(routes.includes('/games/player-passport.js') && routes.includes('/games/player-passport-core.js') && routes.includes('/games/player-passport.css'), 'Production route matrix must probe Passport assets')
assert.ok(packageJson.scripts['qa:player-passport'] === 'node scripts/player-passport-smoke.mjs', 'Passport smoke test must have a package command')
assert.ok(workflow.includes('run: npm run qa:player-passport'), 'Direct production deploy must run Passport QA before deploy')
execFileSync(process.execPath, ['--check', 'public/games/player-passport-core.js'], { stdio: 'pipe' })
execFileSync(process.execPath, ['--check', 'public/games/player-passport.js'], { stdio: 'pipe' })
execFileSync(process.execPath, ['--check', 'public/games/luxury.js'], { stdio: 'pipe' })
console.log('PASS OSGARD PLAYER PASSPORT: 30+ contracts for all 11 games, catalogue counters, metadata, lazy assets, local-only progression, missions, invites, reduced motion and deployment gate')

const fixedNow = Date.parse('2026-10-14T10:00:00.000Z')
let data = core.emptyPassport()
assert.equal(data.schemaVersion, 1, 'A new passport must start on supported schema v1')
assert.equal(core.normalizePassport({ schemaVersion: 999, sessions: [] }, fixedNow).sessions.length, 0, 'Unknown schemas must not be interpreted as valid progress')
assert.equal(core.normalizeFavorites(['time','time','bad',null]).join(','), 'time', 'Favorites should be deduplicated and restricted to known game IDs')
assert.equal(core.readLocalShardBalance({balance:55}), 55, 'A valid local SHARDS display balance may be read')
assert.equal(core.readLocalShardBalance({balance:-1}), 0, 'Negative wallet data must not be displayed')
assert.equal(core.readLocalShardBalance({balance:'100'}), 0, 'Wallet balances must be safe integers')
let result = core.recordSession(data, {game:'swarm',sessionStarted:true,sessionId:'session_test_0001',durationSeconds:42,reason:'returned_to_catalog'}, fixedNow)
assert.equal(result.added, true, 'A confirmed launched session should be recorded')
data = result.progress
result = core.recordSession(data, {game:'swarm',sessionStarted:true,sessionId:'session_test_0001',durationSeconds:42}, fixedNow + 1000)
assert.equal(result.added, false, 'A duplicate session ID must be idempotent')
result = core.recordSession(data, {game:'swarm',sessionStarted:false,sessionId:'session_unstarted'}, fixedNow + 2000)
assert.equal(result.added, false, 'An iframe load/unstarted session must not count as play')
result = core.recordSession(data, {game:'not-a-game',sessionStarted:true,sessionId:'session_unknown'}, fixedNow + 3000)
assert.equal(result.added, false, 'Unknown game IDs must not enter a Passport')
result = core.recordSession(data, {game:'time',sessionStarted:true,sessionId:'session_test_0002',durationSeconds:999999}, fixedNow + 86400000)
assert.equal(result.added, true, 'A second game session should be accepted')
assert.equal(result.progress.sessions[1].durationSeconds, 12*60*60, 'Durations must be capped to twelve hours')
const withOld = {schemaVersion:1,sessions:[{gameId:'time',sessionId:'old',at:'2025-01-01T00:00:00.000Z',durationSeconds:10}],invites:[],updatedAt:'2025-01-01T00:00:00.000Z'}
assert.equal(core.normalizePassport(withOld,fixedNow).sessions.length,0, 'Sessions beyond retention must be pruned')
const future = {schemaVersion:1,sessions:[{gameId:'time',sessionId:'future',at:new Date(fixedNow+86400000*40).toISOString(),durationSeconds:10}],invites:[],updatedAt:new Date(fixedNow).toISOString()}
assert.equal(core.normalizePassport(future,fixedNow).sessions.length,0, 'Future-dated sessions must be rejected')
const paddedSessions = Array.from({length:core.PASSPORT_MAX_SESSIONS+20},(_,i)=>({gameId:'time',sessionId:'session_'+i,at:new Date(fixedNow-i*1000).toISOString(),durationSeconds:1,reason:'ended'}))
assert.equal(core.normalizePassport({schemaVersion:1,sessions:paddedSessions,invites:[],updatedAt:new Date(fixedNow).toISOString()},fixedNow).sessions.length,core.PASSPORT_MAX_SESSIONS,'Passport session storage must remain bounded')
assert.equal(core.utcDayKey(fixedNow),'2026-10-14','Daily goals must use UTC calendar dates')
const invalidInvite = core.recordInvite(data,'not-a-share-method',fixedNow)
assert.equal(invalidInvite.added,false,'Unsupported invitation methods must not count')
const inviteA = core.recordInvite(data,'web-share',fixedNow)
assert.equal(inviteA.added,true,'Preparing a native invite should count the daily referral mission')
assert.equal(core.recordInvite(inviteA.progress,'clipboard',fixedNow+1000).added,false,'Invite progress should be capped at one per UTC day')
assert.equal(core.recordInvite(inviteA.progress,'clipboard',fixedNow+86400000).added,true,'Invite progress should reset on the next UTC day')
const snapshots = core.derivePassport(data,['time','time','unknown'],{balance:75},fixedNow+86400000)
assert.equal(snapshots.totalSessions,2,'Passport summary should count recorded local sessions')
assert.equal(snapshots.uniqueGames,2,'Passport should count unique games, not button clicks')
assert.equal(snapshots.favoritesCount,1,'Passport favorite summary should use validated favorites')
assert.equal(snapshots.xp,2*10+2*15+1*3,'XP should be deterministic and only derive from local session/favorite counts')
assert.equal(snapshots.shardBalance,75,'SHARDS readout should be sourced from shared local wallet data')
assert.equal(snapshots.badges.find(b=>b.id==='first-session').unlocked,true,'First-session badge should unlock after a recorded session')
assert.equal(snapshots.badges.find(b=>b.id==='world-explorer').unlocked,false,'Three-game explorer badge should not unlock prematurely')
const badWallet=core.derivePassport(data,[],{balance:-10},fixedNow)
assert.equal(badWallet.shardBalance,0,'Malformed wallet data must render as zero rather than negative progress')
console.log('PASS OSGARD PLAYER PASSPORT CORE: retention, idempotency, UTC missions, share-intent rules and deterministic local profile');

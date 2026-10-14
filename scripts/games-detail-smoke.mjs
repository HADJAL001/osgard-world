import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const detail = read('src/GameDetailPage.tsx')
const app = read('src/main.tsx')
const sectionsSource = read('src/Sections.tsx')
const entertainmentCatalog = read('src/EntertainmentCatalog.tsx')
const hub = read('public/games/index.html')
const godotProject = read('godot/null-shift/project.godot')
const deployWorkflow = read('.github/workflows/deploy-frontend.yml')
const godotSmoke = read('scripts/null-shift-godot-smoke.mjs')
const nginx = read('nginx.conf')
const sitemap = read('public/sitemap.xml')
const css = read('src/games-hub.css')
const routeMatrix = read('scripts/production-route-matrix.mjs')


for (const [label, source] of [['SPA route SEO', app], ['game detail UI', detail], ['legacy game catalogue', entertainmentCatalog]]) {
  assert.ok(!source.includes('�') && !source.includes('пїЅ') && !source.includes('РЎР'), label + ' contains a damaged text-encoding sequence')
}
assert.ok(!app.includes('const seo: Record') && app.includes('const cleanSeo: Record'), 'Only the clean, authoritative SPA SEO registry should remain')


for (const [label, source] of [['SPA route SEO', app], ['legacy section pages', sectionsSource], ['game detail UI', detail], ['game catalogue', read('src/EntertainmentCatalog.tsx')]]) {
  assert.ok(!source.includes('�') && !source.includes('пїЅ') && !source.includes('РЎР') && !source.includes('РР'), label + ' contains a damaged text-encoding sequence')
}
assert.ok(!app.includes('const seo: Record') && app.includes('const cleanSeo: Record'), 'Only the clean, authoritative SPA SEO registry should remain')

const civicGame = read('public/games/civic-cascade/index.html')
const cascadeGame = read('public/games/cascade-lab/index.html')
const afterimageGame = read('public/games/afterimage-run/index.html')
const aetherGame = read('public/games/aether-grid/index.html')

const games = [
  { id: 'time', href: '/games/time' },
  { id: 'swarm', href: '/games/swarm/index.html' },
  { id: 'null-shift', href: '/games/null-shift-godot/index.html' },
  { id: 'inherit', href: '/games/inherit/index.html' },
  { id: 'remix', href: '/games/remix/index.html' },
  { id: 'signal-run', href: '/games/signal-run/' },
  { id: 'civic-cascade', href: '/games/civic-cascade/' },
  { id: 'patina', href: '/games/patina/' },
  { id: 'cascade-lab', href: '/games/cascade-lab/' },
  { id: 'afterimage-run', href: '/games/afterimage-run/' },
  { id: 'aether-grid', href: '/games/aether-grid/' },
]

for (const game of games) {
  assert.ok(detail.includes(`id: '${game.id}'`), `Missing detail definition: ${game.id}`)
  assert.ok(detail.includes(`href: '${game.href}'`), `Unexpected game entry URL: ${game.id}`)
  assert.ok(hub.includes(`href="/game/${game.id}"`), `Missing detail link on catalogue card: ${game.id}`)
  assert.ok(sitemap.includes(`https://osgard.world/game/${game.id}`), `Missing SEO route: ${game.id}`)
  assert.ok(app.includes('GameDetailPage slug=') && app.includes('path.match'), 'React route matcher missing')
}
assert.ok(detail.includes("game.id === 'cascade-lab'") && detail.includes("dataset.cascadeLabReady === 'true'") && detail.includes("game.id === 'civic-cascade'") && detail.includes("querySelector('#cc-game-root')") && detail.includes("game.id === 'patina'") && detail.includes("body.dataset.patinaReady === 'true'") && detail.includes("querySelector('#patina-workbench')") && detail.includes("game.id === 'signal-run'") && detail.includes("querySelector('#arena')"), 'CIVIC CASCADE, PATINA and SIGNAL RUN must wait for their real game DOM readiness markers')
assert.ok(hub.includes('/games/null-shift-godot/'), 'Catalog must use the deployment-generated Godot build as its primary route')
assert.ok(hub.includes('href="/games/null-shift/">WebGL-версия'), 'Browser WebGL alternate is missing')
assert.ok(godotProject.includes('config/name="NULL SHIFT"') && deployWorkflow.includes('--export-release Web') && deployWorkflow.includes('public/games/null-shift-godot/index.html') && godotSmoke.includes("process.argv[2] === '--export-check'")&&deployWorkflow.includes('node scripts/null-shift-godot-smoke.mjs --export-check public/games/null-shift-godot'), 'Godot project export and artifact contract must be verified')
assert.ok(!nginx.includes('return 302 /games/null-shift/;') && nginx.includes('return 301 /games/;'), 'Nginx must not override Godot and must preserve the entertainment canonical redirect')
assert.ok(detail.includes('attempts < 20') && detail.includes('window.setTimeout(validateFrame, 250)'), 'React game mount must have a bounded iframe startup grace period')
assert.ok(detail.includes("querySelector('.time-game')"), 'Strategy-game readiness must use the actual mounted game root')
assert.ok(detail.includes("track('game_opened', { game: game.id, surface: 'game-detail' }, consent)"), 'Detail views are logged once with consent')
assert.ok(detail.includes('isTrustedGameLifecycleMessage') && detail.includes('createSessionClock'), 'GameDetailPage must share the trusted game lifecycle contract')
assert.ok(detail.includes("track('game_session_started'") && detail.includes("track('game_session_completed'"), 'Game detail sessions must have separate, consent-gated start and end events')
assert.ok(detail.includes('endReason: reason') && detail.includes('durationSeconds:'), 'Session completion must preserve actual duration and end reason')
assert.ok(detail.includes("setPauseReason('document-hidden', document.hidden)") && detail.includes("setPauseReason('game-paused', true)"), 'Session time must exclude both hidden-tab and in-game pauses')
assert.ok(detail.includes('frameAttempt') && detail.includes('18_000') && detail.includes('Retry launch'), 'Embedded game launch needs a bounded timeout and an in-page retry action')
assert.ok(detail.includes('aria-pressed={isFullscreen}') && detail.includes('focus({ preventScroll: true })'), 'Fullscreen state and focus movement must remain accessible')
assert.ok(detail.includes('DETAIL_LOCALE_KEY') && detail.includes('KNOWN_GAME_IDS') && detail.includes("track('share_link_copied'"), 'Locale, local lists and share telemetry must use the hardened contracts')
assert.ok(detail.includes("track('share_dialog_opened'") && !detail.includes("track('share_created', { game: game.id, surface: 'game-detail'"), 'Opening/cancelling native share must not be counted as a completed share')

assert.ok(!detail.includes("surface: 'games-iframe'"), 'Iframe load must not duplicate a detail-view event')
assert.ok(!detail.includes("track('game_session_started', { game: game.id, surface: 'games-iframe' }"), 'Iframe HTML load is not proof a session started')
for (const route of ['/games/', '/games/monetization/', '/game/time', '/game/swarm', '/game/null-shift', '/game/inherit', '/game/remix', '/games/signal-run/', '/game/signal-run', '/games/civic-cascade/', '/games/patina/', '/game/civic-cascade', '/game/patina', '/games/cascade-lab/', '/game/cascade-lab', '/games/aether-grid/', '/game/aether-grid']) assert.ok(sitemap.includes(`https://osgard.world${route}`), `Sitemap is missing ${route}`)
assert.ok(css.includes('@media') && css.includes('prefers-reduced-motion'), 'Responsive and reduced-motion styles must be defined')
for (const p of ['public/games/index.html','public/games/cascade-lab/index.html','public/games/afterimage-run/index.html','godot/null-shift/project.godot','public/privacy/index.html','public/terms/index.html','public/osgard-mark.svg']) {
  assert.ok(existsSync(p), `Required publication asset missing: ${p}`)
}
execFileSync(process.execPath, ['--check', 'scripts/production-route-matrix.mjs'], { stdio: 'pipe' })
assert.ok(routeMatrix.includes("const isGodotDirectory = route === '/games/null-shift-godot/'") && routeMatrix.includes("method: isGodotDirectory ? 'HEAD' : 'GET'") && routeMatrix.includes("isGodotDirectory ? '' : await response.text()"), 'Godot directory availability must be checked without downloading its heavy HTML shell')
assert.ok(routeMatrix.includes("route.startsWith('/games/null-shift-godot/index.html')") || routeMatrix.includes("route.startsWith('/games/null-shift-godot')") && routeMatrix.includes("text.includes('data-nullshift-shell=\"premium-v1\"')"), 'Godot content contract and asset checks must remain on the explicit index/asset probes')
console.log('PASS OSGARD GAME DETAIL: eleven routes, details, SEO sitemap, safe legacy fallback, Nginx redirects, asynchronous SPA readiness and honest lifecycle events.')
assert.ok(cascadeGame.includes('id="runButton"') && cascadeGame.includes('id="exportTelemetryButton"') && cascadeGame.includes('id="exportGrowthButton"') && cascadeGame.includes('id="serviceAdDialog"'), 'CASCADE LAB gameplay, diagnostics and promotion controls missing')
assert.ok(cascadeGame.includes('data-cascade-lab-ready="true"') && cascadeGame.includes('content="0.14.0-engineering-console"'), 'CASCADE LAB 0.14.0 version and parent iframe-ready contract missing')
assert.ok(cascadeGame.includes("notifyOsgardLifecycle('ready'") && cascadeGame.includes("notifyOsgardLifecycle('started'") && cascadeGame.includes("notifyOsgardLifecycle('paused'") && cascadeGame.includes("notifyOsgardLifecycle('resumed'"), 'CASCADE LAB must send the parent portal lifecycle handshake')
assert.ok(cascadeGame.includes('function showServiceInterstitial') && cascadeGame.includes('id="serviceAdChoices"') && cascadeGame.includes('id="serviceAdVisitButton"') && cascadeGame.includes('Я поделился — получить +10 LC'), 'CASCADE LAB must expose the selectable OSGARD service intermission and share reward')
assert.ok(cascadeGame.includes("'marcosa': 'https://marcosa.club/'") && cascadeGame.includes("'taxi': 'https://senjorio.com/'") && cascadeGame.includes("'smart-map': 'https://superday.run/'"), 'CASCADE LAB must open the official social, taxi and smart-map services directly')
assert.ok(cascadeGame.includes("'business': OSGARD_OS_URL + '/'") && cascadeGame.includes("'creator-studio': 'https://osgardvanguard.studio/'") && cascadeGame.includes("'project-builder': 'https://osgardbewworld.com/'") && cascadeGame.includes("'worlds': OSGARD_CATALOG_URL") && cascadeGame.includes("'osgard-os': OSGARD_OS_URL + '/'") , 'CASCADE LAB must link the remaining first-party campaigns to destinations used by the OSGARD portal')
assert.ok(cascadeGame.includes('function buildOsgardCampaignUrl') && cascadeGame.includes("destination.searchParams.set('utm_source', 'osgard_games')") && cascadeGame.includes("destination.searchParams.set('utm_medium', medium)") && cascadeGame.includes("destination.searchParams.set('utm_campaign', 'cascade_lab_osgard_select')") && cascadeGame.includes("destination.searchParams.set('utm_content', campaign.id)"), 'First-party campaign and share links must have consistent UTM attribution')
assert.ok(cascadeGame.includes("buildOsgardCampaignUrl(item.id, 'social_share')") && cascadeGame.includes("buildOsgardCampaignUrl(campaign.id, 'between_levels')") && cascadeGame.includes("destination.protocol !== 'https:'"), 'Both social shares and ad CTAs must use HTTPS-only approved campaign destinations')


assert.ok(civicGame.includes('id="cc-save"') && civicGame.includes('id="cc-load"') && civicGame.includes('function saveCheckpoint()') && civicGame.includes('function restoreCheckpoint()'), 'CIVIC CASCADE must provide working local operation checkpoints')
assert.ok(civicGame.includes("osgard-civic-cascade-checkpoint-v1") && civicGame.includes("localStorage.setItem(CHECKPOINT_KEY") && civicGame.includes("schemaVersion!==1"), 'CIVIC CASCADE checkpoint storage must be versioned and validated')
assert.ok(civicGame.includes('id="cc-forecast"') && civicGame.includes('function updateForecast()') && /30\s+игровых\s+секунд/i.test(civicGame), 'CIVIC CASCADE must render its approximate 30-second risk outlook')
assert.ok(hub.includes('11 игровых проектов') && hub.includes('Запустить CIVIC CASCADE') && hub.includes('cc-release-strip') && hub.includes('data-game="afterimage-run"') && hub.includes('data-game="aether-grid"'), 'Entertainment hub must accurately count eleven games and visibly promote AETHER GRID, CIVIC CASCADE and AFTERIMAGE//RUN')
assert.ok(afterimageGame.includes('<title>AFTERIMAGE//RUN — OSGARD PLAY</title>') && afterimageGame.includes('id="runnerCanvas"') && afterimageGame.includes('id="daily-seed"') && afterimageGame.includes("game:'afterimage-run'"), 'AFTERIMAGE//RUN standalone play page must provide its daily game shell and lifecycle identity')
assert.ok(detail.includes("id: 'afterimage-run'") && detail.includes("href: '/games/afterimage-run/'"), 'AFTERIMAGE//RUN needs a dedicated game-detail record with its real launch route')
assert.ok(aetherGame.includes('<title>AETHER GRID — OSGARD WORLD GAMING</title>') && aetherGame.includes('id="board"') && aetherGame.includes('id="challenge-code"') && aetherGame.includes("notify('ready')") && aetherGame.includes("notify('completed'"), 'AETHER GRID must provide its daily puzzle and lifecycle events')
assert.ok(aetherGame.includes('/games/invite/aether-grid/') && aetherGame.includes('utm_campaign'), 'AETHER GRID must preserve the friend-invite funnel')
assert.ok(detail.includes("id: 'aether-grid'") && detail.includes("href: '/games/aether-grid/'"), 'AETHER GRID needs a detail record with the standalone route')
assert.ok(detail.includes("game.id === 'aether-grid'") && detail.includes("querySelector('#challenge-code')"), 'AETHER GRID embedded readiness must verify its actual puzzle DOM')
assert.ok(['undo-button','redo-button','pause-button','sound-button','contrast-button','haptics-button','export-button'].every(id=>aetherGame.includes('id="'+id+'"')), 'AETHER GRID must expose all advanced session controls')
assert.ok(['connected-count','connected-progress','total-solves','win-streak','alltime-best'].every(id=>aetherGame.includes('id="'+id+'"')), 'AETHER GRID must surface connectivity and personal progression')
assert.ok(aetherGame.includes('osgard.aether-grid.progress.v1.')&&aetherGame.includes('function saveRun()')&&aetherGame.includes('function restoreRun()')&&aetherGame.includes('raw.version!==1'), 'AETHER GRID saved runs must be versioned and validated before restore')
assert.ok(aetherGame.includes('function pushHistory()')&&aetherGame.includes('undoStack.length>100')&&aetherGame.includes('function undoMove()')&&aetherGame.includes('function redoMove()'), 'AETHER GRID undo/redo history must be bounded and recoverable')
assert.ok(aetherGame.includes('const elapsed=runSeconds(),hadStarted=runHasStarted')&&aetherGame.includes('History can restore board state, but it must never rewind elapsed time.'), 'Undo/redo must not exploit history to rewind the leaderboard timer')
assert.ok(aetherGame.includes('function runSeconds()')&&aetherGame.includes("document.addEventListener('visibilitychange'")&&aetherGame.includes('visibilityPaused=true'), 'AETHER GRID elapsed timer must pause when the tab becomes hidden')
assert.ok(aetherGame.includes('function consecutiveDayStreak(')&&aetherGame.includes('function writeCompletionStats(')&&aetherGame.includes('completedDays'), 'AETHER GRID daily streak must use validated UTC completion days')
assert.ok(aetherGame.includes("window.confirm('Сбросить текущую попытку AETHER GRID?")&&aetherGame.includes("localStorage.removeItem(runKeyPrefix+day)"), 'AETHER GRID reset must warn about progress loss and clear the saved run')
assert.ok(aetherGame.includes("localStorage.setItem(soundKey,soundEnabled?'yes':'no')")&&aetherGame.includes('function playTone('), 'AETHER GRID sound must be optional and persisted locally')
assert.ok(aetherGame.includes("localStorage.setItem(contrastKey,next?'yes':'no')")&&aetherGame.includes('body.high-contrast'), 'AETHER GRID high-contrast mode must persist and have dedicated styling')
assert.ok(aetherGame.includes("localStorage.setItem(hapticsKey,hapticsEnabled?'yes':'no')")&&aetherGame.includes('function buzz('), 'AETHER GRID haptic feedback must be optional')
assert.ok(aetherGame.includes("event.key.toLowerCase()==='z'")&&aetherGame.includes("event.key.toLowerCase()==='y'")&&aetherGame.includes("event.key==='Escape'"), 'AETHER GRID keyboard shortcuts must include undo, redo and pause')
assert.ok(aetherGame.includes("link.download='aether-grid-'+day+'.json'")&&aetherGame.includes("note:'Личная статистика этого браузера; не является глобальным рейтингом.'"), 'AETHER GRID export must be explicit and avoid fabricated global rankings')
const aetherInlineScripts=[...aetherGame.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(source=>source.trim())
assert.equal(aetherInlineScripts.length,1,'AETHER GRID must have exactly one self-contained game controller')
new Function(aetherInlineScripts[0])

assert.ok(detail.includes("'afterimage-run': /afterimage") && detail.includes("run/i"), 'Embedded readiness must recognize the standalone AFTERIMAGE//RUN page title')
assert.ok(detail.includes('Space, Arrow Up or tap the arena') && detail.includes('Escape pauses the run'), 'AFTERIMAGE detail must document its actual game controls')
assert.ok(afterimageGame.includes("e.code==='Space'||e.code==='ArrowUp'") && afterimageGame.includes("e.code==='ShiftLeft'||e.code==='ShiftRight'") && afterimageGame.includes("e.code==='Escape'"), 'Published controls must match the real keyboard handlers')

assert.ok(sitemap.includes('https://osgard.world/games/afterimage-run/'), 'AFTERIMAGE//RUN must be published in the sitemap')

assert.ok(cascadeGame.includes('data-cascade-lab-upgrades="0.14.0"') && cascadeGame.includes('CASCADELAB014') && cascadeGame.includes('clHistoryControls'), 'CASCADE LAB 0.14.0 engineering console layer missing')
const upgradeScripts = [...cascadeGame.matchAll(/<script\b[^>]*data-cascade-lab-upgrades="0\.14\.0"[^>]*>([\s\S]*?)<\/script>/g)]
assert.equal(upgradeScripts.length, 1, 'CASCADE LAB must install exactly one 0.14.0 upgrade layer')
new Function(upgradeScripts[0][1])
for (const feature of ['HISTORY_LIMIT=50','function undo()','function redo()','function duplicateSelected()','function deleteSelected()','function nudge(','function exportProject()','function validateProject(','128*1024','function importProject()','function fullscreen()','function cycleFrequency()','autoPause','navigator.share','document.visibilityState']) assert.ok(upgradeScripts[0][1].includes(feature), 'CASCADE LAB 0.14.0 feature missing: '+feature)
assert.ok(upgradeScripts[0][1].includes("Object.defineProperty(window,'CASCADELAB014'") && upgradeScripts[0][1].includes('schemaVersion:1'), 'CASCADE LAB upgrade surface and JSON schema must be versioned')

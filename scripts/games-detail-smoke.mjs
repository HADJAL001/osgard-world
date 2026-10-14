import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const detail = read('src/GameDetailPage.tsx')
const app = read('src/main.tsx')
const sectionsSource = read('src/Sections.tsx')
const entertainmentCatalog = read('src/EntertainmentCatalog.tsx')
const hub = read('public/games/index.html')
const entertainmentPage = read('public/entertainment/index.html')
const entertainmentRuntime = read('public/entertainment/entertainment.js')
const inviteRuntime = read('public/games/invite/invite-landing.js')
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
const cascadeDelta = read('public/games/cascade-lab/delta-lens.js')
const cascadeHypothesis = read('public/games/cascade-lab/hypothesis-lab.js')
const cascadeEngineering = read('public/games/cascade-lab/engineering-suite.js')
const cascadeStudio = read('public/games/cascade-lab/experiment-studio.js')
const cascadeCounterfactual = read('public/games/cascade-lab/counterfactual-lab.js')
const cascadePassport = read('public/games/cascade-lab/case-passport.js')
const cascadeXray = read('public/games/cascade-lab/trajectory-xray.js')
const cascadeDirector = read('public/games/cascade-lab/mission-director.js')
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
assert.ok(!nginx.includes('return 302 /games/null-shift/;') && nginx.includes('location = /entertainment {') && nginx.includes('return 301 /entertainment/;') && !nginx.includes('location ^~ /entertainment/'), 'Nginx must not override Godot and must serve the dedicated Entertainment page with only a slash-normalization redirect')
assert.ok(detail.includes('attempts < 20') && detail.includes('window.setTimeout(validateFrame, 250)'), 'React game mount must have a bounded iframe startup grace period')
assert.ok(detail.includes("querySelector('.time-game')"), 'Strategy-game readiness must use the actual mounted game root')
assert.ok(detail.includes("track('game_opened', { game: game.id, surface: 'game-detail' }, consent)"), 'Detail views are logged once with consent')
assert.ok(detail.includes('isTrustedGameLifecycleMessage') && detail.includes('createSessionClock'), 'GameDetailPage must share the trusted game lifecycle contract')
assert.ok(detail.includes("track('game_session_started'") && detail.includes("track('game_session_completed'"), 'Game detail sessions need separate consent-gated start and completion events')
assert.ok(detail.includes('endReason: reason') && detail.includes('durationSeconds:'), 'Session completion must preserve duration and end reason')
assert.ok(detail.includes("setPauseReason('document-hidden', document.hidden)") && detail.includes("setPauseReason('game-paused', true)"), 'Session time must exclude hidden-tab and in-game pause intervals')
assert.ok(detail.includes('frameAttempt') && detail.includes('18_000') && detail.includes('Retry launch'), 'Embedded game launch needs a bounded timeout and an in-page retry action')
assert.ok(detail.includes('aria-pressed={isFullscreen}') && detail.includes('focus({ preventScroll: true })'), 'Fullscreen state and keyboard focus must remain accessible')
assert.ok(detail.includes('DETAIL_LOCALE_KEY') && detail.includes('KNOWN_GAME_IDS') && detail.includes("track('share_link_copied'"), 'Locale, local lists and share telemetry must use the hardened contracts')
assert.ok(detail.includes("track('share_dialog_opened'") && !detail.includes("track('share_created', { game: game.id, surface: 'game-detail'"), 'Opening/cancelling native share must not be counted as a completed share')

assert.ok(!detail.includes("surface: 'games-iframe'"), 'Iframe load must not duplicate a detail-view event')
assert.ok(!detail.includes("track('game_session_started', { game: game.id, surface: 'games-iframe' }"), 'Iframe HTML load is not proof a session started')
for (const route of ['/games/', '/games/monetization/', '/game/time', '/game/swarm', '/game/null-shift', '/game/inherit', '/game/remix', '/games/signal-run/', '/game/signal-run', '/games/civic-cascade/', '/games/patina/', '/game/civic-cascade', '/game/patina', '/games/cascade-lab/', '/game/cascade-lab', '/games/aether-grid/', '/game/aether-grid']) assert.ok(sitemap.includes(`https://osgard.world${route}`), `Sitemap is missing ${route}`)
assert.ok(css.includes('@media') && css.includes('prefers-reduced-motion'), 'Responsive and reduced-motion styles must be defined')
for (const p of ['public/games/index.html','public/games/cascade-lab/index.html','public/games/cascade-lab/manifest.webmanifest','public/games/cascade-lab/service-worker.js','public/games/cascade-lab/lab-icon.svg','public/games/cascade-lab/experiment-studio.js','public/games/afterimage-run/index.html','godot/null-shift/project.godot','public/privacy/index.html','public/terms/index.html','public/osgard-mark.svg']) {
  assert.ok(existsSync(p), `Required publication asset missing: ${p}`)
}
execFileSync(process.execPath, ['--check', 'scripts/production-route-matrix.mjs'], { stdio: 'pipe' })
assert.ok(/src="\/entertainment\/entertainment\.js\?v=[^"]+"/.test(entertainmentPage), 'Entertainment must reference a versioned runtime asset')
assert.ok(routeMatrix.includes("const isGodotDirectory = route === '/games/null-shift-godot/'") && routeMatrix.includes("method: isGodotDirectory ? 'HEAD' : 'GET'") && routeMatrix.includes("isGodotDirectory ? '' : await response.text()"), 'Godot directory availability must be checked without downloading its heavy HTML shell')
assert.ok(routeMatrix.includes("route.startsWith('/games/null-shift-godot/index.html')") || routeMatrix.includes("route.startsWith('/games/null-shift-godot')") && routeMatrix.includes("text.includes('data-nullshift-shell=\"premium-v1\"')"), 'Godot content contract and asset checks must remain on the explicit index/asset probes')
const routeMatrixBackslash=String.fromCharCode(92)
assert.ok(routeMatrix.includes('entertainment'+routeMatrixBackslash+'.js') && routeMatrix.includes(routeMatrixBackslash+'?v=[^"]+'), 'Production route matrix must accept versioned Entertainment script URLs without pinning an obsolete cache version')
console.log('PASS OSGARD GAME DETAIL: eleven routes, details, SEO sitemap, safe legacy fallback, Nginx redirects, asynchronous SPA readiness and honest lifecycle events.')
assert.ok(cascadeGame.includes('id="runButton"') && cascadeGame.includes('id="exportTelemetryButton"') && cascadeGame.includes('id="exportGrowthButton"') && cascadeGame.includes('id="serviceAdDialog"'), 'CASCADE LAB gameplay, diagnostics and promotion controls missing')
assert.ok(cascadeGame.includes('rel="manifest" href="./manifest.webmanifest"') && cascadeGame.includes('id="installLabButton"') && cascadeGame.includes("navigator.serviceWorker.register('./service-worker.js?v=0.27.0'"), 'CASCADE LAB install manifest, control and worker missing')
assert.ok(cascadeGame.includes('data-cascade-lab-ready="true"') && cascadeGame.includes('content="0.27.0-counterfactual-twin"') && cascadeGame.includes('data-cascade-lab-upgrades="0.14.0"') && cascadeGame.includes('id="CASCADELAB021"'), 'CASCADE LAB 0.27.0 release marker, prior engineering layer and parent iframe-ready contract missing')
assert.ok(cascadeGame.includes("navigator.serviceWorker.register('./service-worker.js?v=0.27.0'") && cascadeGame.includes('mission-director.js?v=0.24.1'), 'CASCADE LAB must cache-bust the invite preview bridge and worker shell')
assert.ok(cascadeDirector.includes("https://osgard.world/games/invite/cascade-lab/") && cascadeDirector.includes("host.OSGARDInvite.createLink('cascade-lab')") && !cascadeDirector.includes("https://osgard.world/games/cascade-lab/?clmd="), 'Mission Director must use the branded invite preview and canonical referral bridge')

assert.ok(cascadeGame.includes("notifyOsgardLifecycle('ready'") && cascadeGame.includes("notifyOsgardLifecycle('started'") && cascadeGame.includes("notifyOsgardLifecycle('paused'") && cascadeGame.includes("notifyOsgardLifecycle('resumed'"), 'CASCADE LAB must send the parent portal lifecycle handshake')
assert.ok(routeMatrix.includes("notifyOsgardLifecycle('ready', { version: '0.27.0' })") && !routeMatrix.includes("notifyOsgardLifecycle('ready', { version: '0.20.0' })"), 'Production route matrix must track CASCADE LAB canonical lifecycle v0.21, not the prior studio release')
assert.ok(cascadeGame.includes('function showServiceInterstitial') && cascadeGame.includes('id="serviceAdChoices"') && cascadeGame.includes('id="serviceAdVisitButton"') && cascadeGame.includes('Я поделился — получить +10 LC'), 'CASCADE LAB must expose the selectable OSGARD service intermission and share reward')
assert.ok(cascadeGame.includes("'marcosa': 'https://marcosa.club/'") && cascadeGame.includes("'taxi': 'https://senjorio.com/'") && cascadeGame.includes("'smart-map': 'https://superday.run/'"), 'CASCADE LAB must open the official social, taxi and smart-map services directly')
assert.ok(cascadeGame.includes("'business': OSGARD_OS_URL + '/'") && cascadeGame.includes("'creator-studio': 'https://osgardvanguard.studio/'") && cascadeGame.includes("'project-builder': 'https://osgardbewworld.com/'") && cascadeGame.includes("'worlds': OSGARD_CATALOG_URL") && cascadeGame.includes("'osgard-os': OSGARD_OS_URL + '/'") , 'CASCADE LAB must link the remaining first-party campaigns to destinations used by the OSGARD portal')
assert.ok(cascadeGame.includes('function buildOsgardCampaignUrl') && cascadeGame.includes("destination.searchParams.set('utm_source', 'osgard_games')") && cascadeGame.includes("destination.searchParams.set('utm_medium', medium)") && cascadeGame.includes("destination.searchParams.set('utm_campaign', 'cascade_lab_osgard_select')") && cascadeGame.includes("destination.searchParams.set('utm_content', campaign.id)"), 'First-party campaign and share links must have consistent UTM attribution')
assert.ok(cascadeGame.includes("buildOsgardCampaignUrl(item.id, 'social_share')") && cascadeGame.includes("buildOsgardCampaignUrl(campaign.id, 'between_levels')") && cascadeGame.includes("destination.protocol !== 'https:'"), 'Both social shares and ad CTAs must use HTTPS-only approved campaign destinations')


assert.ok(civicGame.includes('id="cc-save"') && civicGame.includes('id="cc-load"') && civicGame.includes('function saveCheckpoint()') && civicGame.includes('function restoreCheckpoint()'), 'CIVIC CASCADE must provide working local operation checkpoints')
assert.ok(civicGame.includes("osgard-civic-cascade-checkpoint-v1") && civicGame.includes("localStorage.setItem(CHECKPOINT_KEY") && civicGame.includes("schemaVersion:2") && civicGame.includes("![1,2].includes(item.schemaVersion)"), 'CIVIC CASCADE checkpoint storage must preserve the current schema v2 while validating legacy v1 saves')
assert.ok(civicGame.includes('id="cc-forecast"') && civicGame.includes('function updateForecast()') && /30\s+игровых\s+секунд/i.test(civicGame), 'CIVIC CASCADE must render its approximate 30-second risk outlook')

assert.ok(civicGame.includes('id="cc-film-panel"') && civicGame.includes('id="cc-film-profile"') && civicGame.includes('id="cc-film-record"') && civicGame.includes('id="cc-film-download"'), 'CIVIC CASCADE 1.9.0 must expose accessible cinematic recording controls');
assert.ok(civicGame.includes('function setupCinematicCapture()') && civicGame.includes('captureStream(30)') && civicGame.includes('new MediaRecorder(stream') && civicGame.includes('new Blob(chunks'), 'CIVIC CASCADE must implement a real browser MediaRecorder pipeline, not a static export mock');
assert.ok(civicGame.includes('width:1920,height:1080,maxSeconds:30') && civicGame.includes('width:3840,height:2160,maxSeconds:15') && civicGame.includes('width:7680,height:4320,maxSeconds:10'), 'CIVIC CASCADE must bound its Full HD, 4K and 8K recording profiles');
assert.ok(civicGame.includes('не нативная 8K-отрисовка игровых объектов') && civicGame.includes('Запись остаётся на устройстве') && civicGame.includes('микрофон не используется') && civicGame.includes('аудиофайлы не загружаются') && civicGame.includes('АТМОСФЕРНАЯ АУДИОДОРОЖКА'), 'CIVIC CASCADE 2.0.0 must disclose 8K upscaling, local storage, no microphone, and generated audio limitations');
assert.ok(civicGame.includes('id="cc-film-audio"') && civicGame.includes('const audioEnabled=Boolean(filmAudio&&filmAudio.checked)') && civicGame.includes('audioStream.getAudioTracks().forEach(track=>stream.addTrack(track))') && civicGame.includes("const types=audioEnabled?['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'") && civicGame.includes('download.href=lastObjectUrl') && civicGame.includes("lastPaintAt<1000/30"), 'CIVIC CASCADE 2.0.0 must check optional generated audio track, codec fallback, clip download and 30 fps cap');
const civicInlineScripts = [...civicGame.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => !/\btype=["']application\/ld\+json["']/i.test(match[1]));
assert.equal(civicInlineScripts.length, 1, 'CIVIC CASCADE must keep one game runtime script');
new Function(civicInlineScripts[0][2]);

assert.ok(hub.includes('11 игровых проектов') && hub.includes('Запустить CIVIC CASCADE') && hub.includes('cc-release-strip') && hub.includes('data-game="afterimage-run"') && hub.includes('data-game="aether-grid"'), 'Entertainment hub must accurately count eleven games and visibly promote AETHER GRID, CIVIC CASCADE and AFTERIMAGE//RUN')
assert.ok(afterimageGame.includes('<title>AFTERIMAGE//RUN — OSGARD PLAY</title>') && afterimageGame.includes('id="runnerCanvas"') && afterimageGame.includes('id="daily-seed"') && afterimageGame.includes("game:'afterimage-run'"), 'AFTERIMAGE//RUN standalone play page must provide its daily game shell and lifecycle identity')
assert.ok(detail.includes("id: 'afterimage-run'") && detail.includes("href: '/games/afterimage-run/'"), 'AFTERIMAGE//RUN needs a dedicated game-detail record with its real launch route')
assert.ok(detail.includes("supportRu: 'AFTERIMAGE//RUN v1.5.0") && detail.includes("featuresEn: ['v1.5.0 release") && detail.includes('diagnostics export'), 'AFTERIMAGE detail page must identify the shipped v1.5.0 build and current feature contract')
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
assert.ok(aetherGame.includes("window.confirm('Сбросить текущую попытку AETHER GRID?")&&aetherGame.includes("localStorage.removeItem(runStorageKey())"), 'AETHER GRID reset must warn about progress loss and clear the saved run')
assert.ok(aetherGame.includes("localStorage.setItem(soundKey,soundEnabled?'yes':'no')")&&aetherGame.includes('function playTone('), 'AETHER GRID sound must be optional and persisted locally')
assert.ok(aetherGame.includes("localStorage.setItem(contrastKey,next?'yes':'no')")&&aetherGame.includes('body.high-contrast'), 'AETHER GRID high-contrast mode must persist and have dedicated styling')
assert.ok(aetherGame.includes("localStorage.setItem(hapticsKey,hapticsEnabled?'yes':'no')")&&aetherGame.includes('function buzz('), 'AETHER GRID haptic feedback must be optional')
assert.ok(aetherGame.includes("event.key.toLowerCase()==='z'")&&aetherGame.includes("event.key.toLowerCase()==='y'")&&aetherGame.includes("event.key==='Escape'"), 'AETHER GRID keyboard shortcuts must include undo, redo and pause')
assert.ok(aetherGame.includes("link.download='aether-grid-'+day+'.json'")&&aetherGame.includes("note:'Личная статистика этого браузера; не является глобальным рейтингом.'"), 'AETHER GRID export must be explicit and avoid fabricated global rankings')
const aetherInlineScripts=[...aetherGame.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(source=>source.trim())
assert.equal(aetherInlineScripts.length,1,'AETHER GRID must have exactly one self-contained game controller')
new Function(aetherInlineScripts[0])
assert.ok(aetherGame.includes('content="1.2.0-challenge-protocol-forge"') && aetherGame.includes('id="protocol-select"') && aetherGame.includes('id="protocol-apply"') && aetherGame.includes('id="protocol-share"'), 'AETHER GRID challenge protocol forge UI/version missing')
for (const id of ['standard','no-hints','no-undo','iron-circuit']) assert.ok(aetherGame.includes("'"+id+"'") && aetherGame.includes('value="'+id+'"'), 'AETHER GRID missing protocol option '+id)
assert.ok(aetherGame.includes('function applySelectedProtocol()') && aetherGame.includes('function updateProtocolUI()') && aetherGame.includes('function activeProtocol()') && aetherGame.includes('function runStorageKey()'), 'AETHER GRID protocol selection and persistence helpers missing')
assert.ok(aetherGame.includes('activeProtocol().noHints||won||paused') && aetherGame.includes('activeProtocol().noUndo||paused||won') && aetherGame.includes("bestKey='osgard.aether-grid.best.v1.'+day+(protocolId==='standard'?'':'.'+protocolId)"), 'AETHER GRID rules must enforce disabled tools and isolate best scores by protocol')
assert.ok(aetherGame.includes("url.searchParams.set('og_protocol',selected)") && aetherGame.includes('info.description'), 'AETHER GRID share links must carry the selected protocol and human-readable objective')
assert.ok(inviteRuntime.includes('validAetherProtocol') && inviteRuntime.includes("target.pathname = '/games/aether-grid/'") && inviteRuntime.includes("target.searchParams.set('protocol', requestedAetherProtocol)"), 'AETHER GRID friend invitation must preserve valid challenge protocols at the standalone game route')
assert.ok(routeMatrix.includes("CACHE\\s*=\\s*PREFIX") && routeMatrix.includes("\\bmethod\\s*!==\\s*['\"]GET") && routeMatrix.includes("\\bmode\\s*===\\s*['\"]navigate"), 'Production route checks must remain compatible with minified service-worker source while validating semantics')
assert.ok(routeMatrix.includes('1.2.0-challenge-protocol-forge') && !routeMatrix.includes('1.1.0-game-11-premium-session') && routeMatrix.includes("['standard','no-hints','no-undo','iron-circuit']"), 'Production AETHER GRID route contract must track the current challenge-protocol build')

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
assert.ok(cascadeGame.includes('<title>CASCADE LAB — Premium Physics Lab 0.27.0</title>') && cascadeGame.includes('name="osgard-game-version" content="0.27.0-counterfactual-twin"') && (cascadeGame.match(/<meta name="osgard-game-version"/g) || []).length === 1 && cascadeGame.includes('id="CASCADELAB025"') && cascadeGame.includes('data-cascade-lab-evidence="0.25.0"') && cascadeGame.includes('evidence-integrity.js?v=0.25.0'), 'CASCADE LAB 0.27.0 must expose one canonical release identity and its evidence-integrity layer')
assert.ok(cascadeGame.includes('id="CASCADELAB027"') && cascadeGame.includes('data-cascade-lab-counterfactual="0.27.0"') && cascadeGame.includes('counterfactual-lab.js?v=0.27.0'), 'CASCADE LAB Counterfactual Twin loader missing')
assert.ok(cascadeCounterfactual.includes("const VERSION = '0.27.0'") && cascadeCounterfactual.includes("const SCHEMA = 'osgard.cascade-lab.counterfactual-lab.v1'") && cascadeCounterfactual.includes('function analyzeSweep(') && cascadeCounterfactual.includes('engine.simulate('), 'Counterfactual Twin analysis and engine integration missing')
assert.ok(!cascadeCounterfactual.includes('fetch(') && !cascadeCounterfactual.includes('XMLHttpRequest') && !cascadeCounterfactual.includes('sendBeacon') && !cascadeCounterfactual.includes('.innerHTML'), 'Counterfactual Twin must stay local-only and render safely')
new Function(cascadeCounterfactual)
assert.ok(cascadeGame.includes('id="CASCADELAB017"') && cascadeGame.includes('data-cascade-lab-delta="0.17.0"'), 'CASCADE LAB Delta Lens loader marker missing')
assert.ok(cascadeGame.includes('id="CASCADELAB018"') && cascadeGame.includes('data-cascade-lab-experiment="0.18.0"') && cascadeGame.includes('hypothesis-lab.js?v=0.18.0'), 'CASCADE LAB Hypothesis Lab loader marker missing')
assert.ok(cascadeGame.includes('id="CASCADELAB019"') && cascadeGame.includes('data-cascade-lab-engineering="0.19.0"') && cascadeGame.includes('engineering-suite.js?v=0.19.0'), 'CASCADE LAB Engineering OS loader marker missing')
assert.ok(cascadeGame.includes("new CustomEvent('cascade-lab:run-finished'") && cascadeEngineering.includes("const SCHEMA = 'osgard.cascade-lab.engineering-suite.v1'") && cascadeEngineering.includes('const IMPROVEMENTS = Object.freeze(['), 'CASCADE LAB run-summary contract and Engineering OS schema missing')
assert.ok(cascadeGame.includes('id="CASCADELAB020"') && cascadeGame.includes('data-cascade-lab-studio="0.20.0"') && cascadeGame.includes('experiment-studio.js?v=0.20.0'), 'CASCADE LAB Experiment Studio 0.20 must load above the preserved Engineering OS layer')
assert.ok(cascadeGame.includes('id="CASCADELAB021"') && cascadeGame.includes('data-cascade-lab-passport="0.21.0"') && cascadeGame.includes('case-passport.js?v=0.21.0') && cascadePassport.includes("const VERSION='0.21.0'") && cascadePassport.includes("osgard.cascade-lab.case-passport.v1") && cascadePassport.includes('function verifyPassport(') && cascadePassport.includes('fingerprintProject'), 'CASCADE LAB 0.21 passport must load and expose integrity checks')
assert.ok(cascadeGame.includes('content="0.27.0-counterfactual-twin"') && cascadeGame.includes("notifyOsgardLifecycle('ready', { version: '0.27.0' })"), 'the canonical game version and lifecycle handshake must identify v0.25')
assert.ok(cascadeGame.includes('restoreProject,undo') && cascadeGame.includes('dailyDate: activeDailyChallenge?.date || null') && cascadeEngineering.includes('function importRun(raw)') && cascadeEngineering.includes('importRun, exportArchive'), 'Passport restore/import bridge must preserve run provenance')
assert.ok(cascadeGame.includes('id="CASCADELAB022"') && cascadeGame.includes('data-cascade-lab-xray="0.22.0"') && cascadeGame.includes('trajectory-xray.js?v=0.22.0'), 'Trajectory X-Ray loader missing')
assert.ok(cascadeGame.includes('id="CASCADELAB024"') && cascadeGame.includes('data-cascade-lab-director="0.24.0"') && cascadeGame.includes('mission-director.js?v=0.24.1'), 'Adaptive Mission Director loader missing')
assert.ok(cascadeDirector.includes("const VERSION='0.24.0'") && cascadeDirector.includes("const SCHEMA='osgard.cascade-lab.mission-director.v1'") && cascadeDirector.includes('function buildRecommendations') && cascadeDirector.includes('function observeContract'), 'Adaptive Mission Director core missing')
assert.ok(cascadeDirector.includes("const INVITE_SCHEMA='osgard.cascade-lab.mission-invite.v1'") && cascadeDirector.includes('function createInvitation') && cascadeDirector.includes('function parseInvitation') && cascadeDirector.includes("searchParams.delete('clmd')"), 'Shareable contract invitations must validate links and keep acceptance local')
assert.ok(cascadeDirector.includes('Срок действия приглашения') && cascadeDirector.includes('Приглашение истекло') && cascadeDirector.includes('MAX_INVITE_URL_LENGTH'), 'Invite expiry and length limits are required')
assert.ok(!cascadeDirector.includes('fetch(') && !cascadeDirector.includes('XMLHttpRequest') && !cascadeDirector.includes('sendBeacon') && !cascadeDirector.includes('.innerHTML'), 'Mission Director must remain local-first and use safe DOM nodes')
new Function(cascadeDirector)
assert.ok(cascadeGame.includes('trajectory: Array.from({ length: Math.min(420, lastReplay.length) }') && cascadeGame.includes('checkpoints: Array.isArray(p.checkpoints)'), 'Run summaries must expose bounded real replay frames')
assert.ok(cascadeXray.includes("const VERSION = '0.22.0'") && cascadeXray.includes("const SCHEMA = 'osgard.cascade-lab.trajectory-xray.v1'") && cascadeXray.includes('function trajectoryDeviation(') && cascadeXray.includes('function drawSpeedChart('), 'Trajectory X-Ray analysis API missing')
assert.ok(!cascadeXray.includes('fetch(') && !cascadeXray.includes('XMLHttpRequest') && !cascadeXray.includes('sendBeacon') && !cascadeXray.includes('.innerHTML'), 'Trajectory X-Ray must stay local and avoid unsafe HTML interpolation')
new Function(cascadeXray)
const xrayContext = {}; runInNewContext(cascadeXray, xrayContext)
assert.ok(xrayContext.__CASCADELAB022_TEST__ && xrayContext.__CASCADELAB022_TEST__.version === '0.22.0', 'Trajectory X-Ray pure validation API missing')
assert.ok(!cascadePassport.includes('fetch(') && !cascadePassport.includes('XMLHttpRequest') && !cascadePassport.includes('sendBeacon') && !cascadePassport.includes('.innerHTML'), 'Passport must remain local-first and use safe DOM rendering')
new Function(cascadePassport)
const passportContext = {}; runInNewContext(cascadePassport, passportContext)
const passportApi = passportContext.__CASCADELAB021_TEST__
assert.ok(passportApi && passportApi.version === '0.21.0' && passportApi.schema === 'osgard.cascade-lab.case-passport.v1', 'Passport validation API is missing')
const fixtureProject = { app: 'CASCADE LAB', schemaVersion: 1, levelId: 1, dailyDate: null, devices: [{ type: 'belt', x: 120, y: 480, angle: 0 }] }
const fixtureRun = { id: 'passport-fixture', at: '2026-10-14T00:00:00.000Z', status: 'won', levelId: 1, mode: 'campaign', dailyDate: null, devices: [{ type: 'belt', x: 120, y: 480, angle: 0 }] }
const fixturePayload = { game: 'CASCADE LAB', gameVersion: '0.21.0', run: fixtureRun, project: fixtureProject, fingerprint: passportApi.fingerprintProject(fixtureProject), analysis: { title: 'Fixture', evidence: ['Observed'], hypothesis: 'Test', nextTest: 'Repeat' } }
const fixtureEnvelope = { schema: passportApi.schema, schemaVersion: 1, createdAt: '2026-10-14T00:00:00.000Z', payload: fixturePayload, integrity: { algorithm: 'FNV-1A-32', digest: '12345678' } }
assert.ok(passportApi.validateShape(fixtureEnvelope).ok, 'Valid passport should pass structural validation')
fixtureEnvelope.payload.project.devices[0].x = 999
assert.ok(!passportApi.validateShape(fixtureEnvelope).ok, 'Tampering with blueprint must fail fingerprint validation')
assert.ok(cascadeStudio.includes("const VERSION = '0.20.0'") && cascadeStudio.includes("const STUDY_SCHEMA = 'osgard.cascade-lab.experiment-study.v1'") && cascadeStudio.includes('MAX_STUDIES = 40') && cascadeStudio.includes('MAX_OBSERVATIONS = 5') && cascadeStudio.includes('MAX_IMPORT_BYTES = 512 * 1024'), 'Experiment Studio schema, controlled observations and archive bounds are required')
assert.ok(cascadeStudio.includes('function startStudy(input)') && cascadeStudio.includes('function reconcile()') && cascadeStudio.includes('function calculateDelta(') && cascadeStudio.includes('function importArchive(payload)'), 'Experiment Studio must support study creation, same-protocol observations, comparisons and import validation')
assert.ok(cascadeStudio.includes("platform === 'telegram'") && cascadeStudio.includes("platform === 'whatsapp'") && cascadeStudio.includes("platform === 'vk'") && cascadeStudio.includes("platform === 'x'") && cascadeStudio.includes("platform === 'linkedin'"), 'Experiment Studio needs share-intent links for five networks')
assert.ok(!cascadeStudio.includes('fetch(') && !cascadeStudio.includes('XMLHttpRequest') && !cascadeStudio.includes('sendBeacon') && !cascadeStudio.includes('.innerHTML'), 'Experiment Studio must not upload local history and must render imported text safely')
new Function(cascadeStudio)
assert.ok(!cascadeEngineering.includes('fetch(') && !cascadeEngineering.includes('XMLHttpRequest') && !cascadeEngineering.includes('sendBeacon') && !cascadeEngineering.includes('.innerHTML'), 'Engineering OS must remain local-only and render notes with safe text APIs')
new Function(cascadeEngineering)
assert.ok(cascadeHypothesis.includes("const SCHEMA = 'osgard.cascade-lab.next-experiment.v1'") && cascadeHypothesis.includes('function proposalForPair(pair)') && cascadeHypothesis.includes('function reconcilePlan('), 'Hypothesis Lab proposal and observation logic missing')
assert.ok(!cascadeHypothesis.includes('fetch(') && !cascadeHypothesis.includes('XMLHttpRequest') && !cascadeHypothesis.includes('sendBeacon'), 'Hypothesis Lab must not upload local history')
new Function(cascadeHypothesis)
assert.ok(cascadeDelta.includes('function latestSameLevelPair()') && cascadeDelta.includes('function buildComparisonPayload(pair)') && cascadeDelta.includes('cascade-lab-ab-comparison.json') && cascadeDelta.includes('меняй одну переменную за раз'), 'Delta Lens compare/export/interpretation contract missing')
new Function(cascadeDelta)
const ledgerScripts = [...cascadeGame.matchAll(/<script\b[^>]*data-cascade-lab-ledger="0\.15\.0"[^>]*>([\s\S]*?)<\/script>/g)]
assert.equal(ledgerScripts.length, 1, 'CASCADE LAB must install exactly one 0.15.0 experiment-ledger layer')
new Function(ledgerScripts[0][1])
for (const feature of ["osgard.cascade-lab.experiment-ledger.v1", 'MAX_RECORDS = 200', 'MAX_IMPORT_BYTES = 200 * 1024', 'function normalizeRecord', 'function loadRecords', 'function renderKpis', 'function renderChart', 'function achievementData', 'function filteredRecords', 'function downloadJsonArchive', 'function downloadCsvArchive', 'async function importJson', 'function addRecord()', 'new MutationObserver', 'navigator.share', 'navigator.clipboard.writeText', 'window.confirm', 'dialog.showModal()', 'role', 'aria-live', 'escapeCSV', 'CASCADELAB015']) assert.ok(ledgerScripts[0][1].includes(feature), 'CASCADE LAB 0.15.0 ledger feature missing: '+feature)
assert.doesNotMatch(ledgerScripts[0][1], /\.innerHTML\s*=/, 'Personal-ledger dynamic content must not be rendered via innerHTML')
assert.ok(ledgerScripts[0][1].includes('schema: SCHEMA, schemaVersion: 1') && ledgerScripts[0][1].includes('parsed.schema !== SCHEMA') && ledgerScripts[0][1].includes('MAX_IMPORT_BYTES = 200 * 1024'), 'Personal ledger import/export schema and bounds missing')
assert.ok(ledgerScripts[0][1].includes('localStorage.setItem(KEY') && !ledgerScripts[0][1].includes('/api/'), 'Experiment ledger must remain local-first and must not send its history to an API')


const entertainmentBridgeTag = '<script id="games-deep-link-bridge">'
const entertainmentBridgeStart = hub.indexOf(entertainmentBridgeTag)
const entertainmentBridgeEnd = hub.indexOf('</script>', entertainmentBridgeStart)
assert.ok(entertainmentBridgeStart >= 0 && entertainmentBridgeEnd > entertainmentBridgeStart, 'Shared-player deep-link bridge must exist in the Games hub')
const entertainmentBridge = hub.slice(entertainmentBridgeStart + entertainmentBridgeTag.length, entertainmentBridgeEnd)
new Function(entertainmentBridge)
for (const id of ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid']) {
  assert.ok(entertainmentBridge.includes("'" + id + "'"), 'Deep-link bridge allow-list is missing ' + id)
  assert.ok(hub.includes('data-play="' + id + '"'), 'Shared-player launch target is missing ' + id)
}
assert.ok(entertainmentRuntime.includes("target.searchParams.set('play', id)") &&
  entertainmentRuntime.includes("target.searchParams.set('utm_source', 'osgard_entertainment')") &&
  entertainmentRuntime.includes("target.searchParams.set('utm_campaign', 'between_games')"),
  'Entertainment primary game launches must route through OSGARD PLAY with source attribution')
assert.ok(entertainmentRuntime.includes('event.preventDefault()') &&
  entertainmentRuntime.includes('event.metaKey') && entertainmentRuntime.includes('event.ctrlKey'),
  'Modified clicks must retain the original direct game URL instead of forcing the intermission route')
assert.ok(entertainmentRuntime.includes("window.location.assign(target.href)") &&
  entertainmentRuntime.includes('recordRecent(id)'),
  'Entertainment launch must retain local recent-game history and navigate to the unified player')
assert.ok(inviteRuntime.includes("new URL('/games/', location.origin)") &&
  inviteRuntime.includes("target.searchParams.set('play', game)") &&
  inviteRuntime.includes("target.searchParams.set('og_ref', code)"),
  'Canonical invitation landing must open the shared game player and preserve its referral code')
assert.ok(inviteRuntime.includes('const validAetherDay = /^' + String.fromCharCode(92) + 'd{4}-' + String.fromCharCode(92) + 'd{2}-' + String.fromCharCode(92) + 'd{2}$/'),
  'AETHER GRID invite date must be validated as a calendar date before it is forwarded')
assert.ok(entertainmentPage.includes('/entertainment/entertainment.js?v=20261014.4'),
  'Entertainment HTML must pin the changed launch runtime to a new cache version')
execFileSync(process.execPath, ['--check', 'public/entertainment/entertainment.js'], { stdio: 'pipe' })
execFileSync(process.execPath, ['--check', 'public/games/invite/invite-landing.js'], { stdio: 'pipe' })

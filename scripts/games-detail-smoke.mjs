import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const detail = read('src/GameDetailPage.tsx')
const app = read('src/main.tsx')
const hub = read('public/games/index.html')
const godotProject = read('godot/null-shift/project.godot')
const deployWorkflow = read('.github/workflows/deploy-frontend.yml')
const godotSmoke = read('scripts/null-shift-godot-smoke.mjs')
const nginx = read('nginx.conf')
const sitemap = read('public/sitemap.xml')
const css = read('src/games-hub.css')

const civicGame = read('public/games/civic-cascade/index.html')
const cascadeGame = read('public/games/cascade-lab/index.html')
const afterimageGame = read('public/games/afterimage-run/index.html')

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
assert.ok(detail.includes('const GAME_LAUNCH_TIMEOUT_MS = 15000'), 'Game detail must have a bounded wall-clock iframe launch timeout')
assert.ok(detail.includes('setLoadingGame(false)') && detail.includes('setFrameError(true)'), 'A timed-out iframe must leave loading state and show recovery')
assert.ok(detail.includes('const retryPlaying = () =>') && detail.includes('setFrameAttempt(attempt => attempt + 1)') && detail.includes('key={game.id + \' : \' + frameAttempt}'), 'The embedded game error state must allow a true reload retry')

assert.ok(detail.includes("querySelector('.time-game')"), 'Strategy-game readiness must use the actual mounted game root')
assert.ok(detail.includes("track('game_opened', { game: game.id, surface: 'game-detail' }, consent)"), 'Detail views are logged once with consent')
assert.ok(!detail.includes("surface: 'games-iframe'"), 'Iframe load must not duplicate a detail-view event')
assert.ok(!detail.includes("track('game_session_started', { game: game.id, surface: 'games-iframe' }"), 'Iframe HTML load is not proof a session started')
for (const route of ['/games/', '/games/monetization/', '/game/time', '/game/swarm', '/game/null-shift', '/game/inherit', '/game/remix', '/games/signal-run/', '/game/signal-run', '/games/civic-cascade/', '/games/patina/', '/game/civic-cascade', '/game/patina', '/games/cascade-lab/', '/game/cascade-lab']) assert.ok(sitemap.includes(`https://osgard.world${route}`), `Sitemap is missing ${route}`)
assert.ok(css.includes('@media') && css.includes('prefers-reduced-motion'), 'Responsive and reduced-motion styles must be defined')
for (const p of ['public/games/index.html','public/games/cascade-lab/index.html','public/games/afterimage-run/index.html','godot/null-shift/project.godot','public/privacy/index.html','public/terms/index.html','public/osgard-mark.svg']) {
  assert.ok(existsSync(p), `Required publication asset missing: ${p}`)
}
execFileSync(process.execPath, ['--check', 'scripts/production-route-matrix.mjs'], { stdio: 'pipe' })
console.log('PASS OSGARD GAME DETAIL: nine routes, details, SEO sitemap, safe legacy fallback, Nginx redirects, asynchronous SPA readiness and honest lifecycle events.')
assert.ok(cascadeGame.includes('id="runButton"') && cascadeGame.includes('id="exportTelemetryButton"') && cascadeGame.includes('id="exportGrowthButton"') && cascadeGame.includes('id="serviceAdDialog"'), 'CASCADE LAB gameplay, diagnostics and promotion controls missing')
assert.ok(cascadeGame.includes('data-cascade-lab-ready="true"') && cascadeGame.includes('content="0.13.0-osgard-cross-promo"'), 'CASCADE LAB 0.13.0 version and parent iframe-ready contract missing')
assert.ok(cascadeGame.includes("notifyOsgardLifecycle('ready'") && cascadeGame.includes("notifyOsgardLifecycle('started'") && cascadeGame.includes("notifyOsgardLifecycle('paused'") && cascadeGame.includes("notifyOsgardLifecycle('resumed'"), 'CASCADE LAB must send the parent portal lifecycle handshake')
assert.ok(cascadeGame.includes('function showServiceInterstitial') && cascadeGame.includes('id="serviceAdChoices"') && cascadeGame.includes('id="serviceAdVisitButton"') && cascadeGame.includes('Я поделился — получить +10 LC'), 'CASCADE LAB must expose the selectable OSGARD service intermission and share reward')
assert.ok(cascadeGame.includes("'marcosa': 'https://marcosa.club/'") && cascadeGame.includes("'taxi': 'https://senjorio.com/'") && cascadeGame.includes("'smart-map': 'https://superday.run/'"), 'CASCADE LAB must open the official social, taxi and smart-map services directly')
assert.ok(cascadeGame.includes("'business': OSGARD_OS_URL + '/'") && cascadeGame.includes("'creator-studio': 'https://osgardvanguard.studio/'") && cascadeGame.includes("'project-builder': 'https://osgardbewworld.com/'") && cascadeGame.includes("'worlds': OSGARD_CATALOG_URL") && cascadeGame.includes("'osgard-os': OSGARD_OS_URL + '/'") , 'CASCADE LAB must link the remaining first-party campaigns to destinations used by the OSGARD portal')
assert.ok(cascadeGame.includes('function buildOsgardCampaignUrl') && cascadeGame.includes("destination.searchParams.set('utm_source', 'osgard_games')") && cascadeGame.includes("destination.searchParams.set('utm_medium', medium)") && cascadeGame.includes("destination.searchParams.set('utm_campaign', 'cascade_lab_osgard_select')") && cascadeGame.includes("destination.searchParams.set('utm_content', campaign.id)"), 'First-party campaign and share links must have consistent UTM attribution')
assert.ok(cascadeGame.includes("buildOsgardCampaignUrl(item.id, 'social_share')") && cascadeGame.includes("buildOsgardCampaignUrl(campaign.id, 'between_levels')") && cascadeGame.includes("destination.protocol !== 'https:'"), 'Both social shares and ad CTAs must use HTTPS-only approved campaign destinations')


assert.ok(civicGame.includes('id="cc-save"') && civicGame.includes('id="cc-load"') && civicGame.includes('function saveCheckpoint()') && civicGame.includes('function restoreCheckpoint()'), 'CIVIC CASCADE must provide working local operation checkpoints')
assert.ok(civicGame.includes("osgard-civic-cascade-checkpoint-v1") && civicGame.includes("localStorage.setItem(CHECKPOINT_KEY") && civicGame.includes("schemaVersion!==1"), 'CIVIC CASCADE checkpoint storage must be versioned and validated')
assert.ok(civicGame.includes('id="cc-forecast"') && civicGame.includes('function updateForecast()') && /30\s+игровых\s+секунд/i.test(civicGame), 'CIVIC CASCADE must render its approximate 30-second risk outlook')
assert.ok(hub.includes('10 игровых проектов') && hub.includes('Запустить CIVIC CASCADE') && hub.includes('cc-release-strip') && hub.includes('data-game="afterimage-run"'), 'Entertainment hub must accurately count ten games and visibly promote CIVIC CASCADE and AFTERIMAGE//RUN')
assert.ok(afterimageGame.includes('<title>AFTERIMAGE//RUN — OSGARD PLAY</title>') && afterimageGame.includes('id="runnerCanvas"') && afterimageGame.includes('id="daily-seed"') && afterimageGame.includes("game:'afterimage-run'"), 'AFTERIMAGE//RUN standalone play page must provide its daily game shell and lifecycle identity')
assert.ok(sitemap.includes('https://osgard.world/games/afterimage-run/'), 'AFTERIMAGE//RUN must be published in the sitemap')

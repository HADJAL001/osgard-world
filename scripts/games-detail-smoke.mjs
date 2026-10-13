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

const games = [
  { id: 'time', href: '/games/time' },
  { id: 'swarm', href: '/games/swarm/index.html' },
  { id: 'null-shift', href: '/games/null-shift-godot/index.html' },
  { id: 'inherit', href: '/games/inherit/index.html' },
  { id: 'remix', href: '/games/remix/index.html' },
  { id: 'signal-run', href: '/games/signal-run/' },
  { id: 'civic-cascade', href: '/games/civic-cascade/' },
  { id: 'patina', href: '/games/patina/' },
]

for (const game of games) {
  assert.ok(detail.includes(`id: '${game.id}'`), `Missing detail definition: ${game.id}`)
  assert.ok(detail.includes(`href: '${game.href}'`), `Unexpected game entry URL: ${game.id}`)
  assert.ok(hub.includes(`href="/game/${game.id}"`), `Missing detail link on catalogue card: ${game.id}`)
  assert.ok(sitemap.includes(`https://osgard.world/game/${game.id}`), `Missing SEO route: ${game.id}`)
  assert.ok(app.includes('GameDetailPage slug=') && app.includes('path.match'), 'React route matcher missing')
}
assert.ok(detail.includes("game.id === 'civic-cascade'") && detail.includes("querySelector('#cc-game-root')") && detail.includes("game.id === 'patina'") && detail.includes("body.dataset.patinaReady === 'true'") && detail.includes("querySelector('#patina-workbench')") && detail.includes("game.id === 'signal-run'") && detail.includes("querySelector('#arena')"), 'CIVIC CASCADE, PATINA and SIGNAL RUN must wait for their real game DOM readiness markers')
assert.ok(hub.includes('/games/null-shift-godot/'), 'Catalog must use the deployment-generated Godot build as its primary route')
assert.ok(hub.includes('href="/games/null-shift/">WebGL-версия'), 'Browser WebGL alternate is missing')
assert.ok(godotProject.includes('config/name="NULL SHIFT"') && deployWorkflow.includes('--export-release Web') && deployWorkflow.includes('public/games/null-shift-godot/index.html') && godotSmoke.includes("process.argv[2] === '--export-check'")&&deployWorkflow.includes('node scripts/null-shift-godot-smoke.mjs --export-check public/games/null-shift-godot'), 'Godot project export and artifact contract must be verified')
assert.ok(!nginx.includes('return 302 /games/null-shift/;') && nginx.includes('return 301 /games/;'), 'Nginx must not override Godot and must preserve the entertainment canonical redirect')
assert.ok(detail.includes('attempts < 20') && detail.includes('window.setTimeout(validateFrame, 250)'), 'React game mount must have a bounded iframe startup grace period')
assert.ok(detail.includes("querySelector('.time-game')"), 'Strategy-game readiness must use the actual mounted game root')
assert.ok(detail.includes("track('game_opened', { game: game.id, surface: 'game-detail' }, consent)"), 'Detail views are logged once with consent')
assert.ok(!detail.includes("surface: 'games-iframe'"), 'Iframe load must not duplicate a detail-view event')
assert.ok(!detail.includes("track('game_session_started', { game: game.id, surface: 'games-iframe' }"), 'Iframe HTML load is not proof a session started')
for (const route of ['/games/', '/games/monetization/', '/game/time', '/game/swarm', '/game/null-shift', '/game/inherit', '/game/remix', '/games/signal-run/', '/game/signal-run', '/games/civic-cascade/', '/games/patina/', '/game/civic-cascade', '/game/patina']) assert.ok(sitemap.includes(`https://osgard.world${route}`), `Sitemap is missing ${route}`)
assert.ok(css.includes('@media') && css.includes('prefers-reduced-motion'), 'Responsive and reduced-motion styles must be defined')
for (const p of ['public/games/index.html','godot/null-shift/project.godot','public/privacy/index.html','public/terms/index.html','public/osgard-mark.svg']) {
  assert.ok(existsSync(p), `Required publication asset missing: ${p}`)
}
execFileSync(process.execPath, ['--check', 'scripts/production-route-matrix.mjs'], { stdio: 'pipe' })
console.log('PASS OSGARD GAME DETAIL: eight routes, details, SEO sitemap, safe legacy fallback, Nginx redirects, asynchronous SPA readiness and honest lifecycle events.')

assert.ok(civicGame.includes('id="cc-save"') && civicGame.includes('id="cc-load"') && civicGame.includes('function saveCheckpoint()') && civicGame.includes('function restoreCheckpoint()'), 'CIVIC CASCADE must provide working local operation checkpoints')
assert.ok(civicGame.includes("osgard-civic-cascade-checkpoint-v1") && civicGame.includes("localStorage.setItem(CHECKPOINT_KEY") && civicGame.includes("schemaVersion!==1"), 'CIVIC CASCADE checkpoint storage must be versioned and validated')
assert.ok(civicGame.includes('id="cc-forecast"') && civicGame.includes('function updateForecast()') && /30\s+игровых\s+секунд/i.test(civicGame), 'CIVIC CASCADE must render its approximate 30-second risk outlook')
assert.ok(hub.includes('8 игровых проектов') && hub.includes('Запустить CIVIC CASCADE') && hub.includes('cc-release-strip'), 'Entertainment hub must accurately count and visibly promote CIVIC CASCADE')

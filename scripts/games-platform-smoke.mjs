import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = async (path) => readFile(resolve(root, path), 'utf8')
const exists = async (path) => { await access(resolve(root, path)); return true }
const checks = []
function check(name, fn) {
  try { fn(); checks.push({ name, status: 'passed' }) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error?.message || error) }) }
}

const html = await read('public/games/index.html')
const lifecycle = await read('public/games/player-lifecycle.js')
const hub = await read('src/GamesHub.tsx')
const css = await read('src/games-hub.css')
const main = await read('src/main.tsx')
const manifest = await read('src/core/manifest.ts')
const app = await read('src/App.tsx')
const legacyCatalog = await read('src/EntertainmentCatalog.tsx')
const sitemap = await read('public/sitemap.xml')
const nginx = await read('nginx.conf')
const routeMatrix = await read('scripts/production-route-matrix.mjs')
const legacyGodotEntry = await read('public/games/null-shift-godot/index.html')
const privacy = await read('public/privacy/index.html')
const terms = await read('public/terms/index.html')

for (const [name, path] of [
  ['Time strategy', 'src/TimePrototype.tsx'],
  ['SWARM browser entry', 'public/games/swarm/index.html'],
  ['NULL//SHIFT browser entry', 'public/games/null-shift/index.html'],
  ['INHERIT browser entry', 'public/games/inherit/index.html'],
  ['REMIX browser entry', 'public/games/remix/index.html'],
  ['OSGARD SVG favicon', 'public/osgard-mark.svg'],
  ['Games portal favicon', 'public/games/favicon.svg'],
]) {
  try { await exists(path); checks.push({ name, status: 'passed' }) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error?.message || error) }) }
}

check('Static Games portal remains the single /games catalogue', () => {
  for (const token of ['id="games-grid"', 'id="game-search"', 'data-filter="tactical"', 'id="player-dialog"', 'id="player-lifecycle.js"', 'id="analytics-toggle"']) {
    if (token === 'id="player-lifecycle.js"') assert.ok(html.includes('src="./player-lifecycle.js"'), 'player lifecycle asset must be loaded')
    else assert.ok(html.includes(token), token)
  }
  assert.ok(main.includes("const gameMatch = path.match(/^\\\\/game\\\\/([a-z0-9-]+)$/)"), 'React route matcher for per-game pages missing')
  assert.ok(main.includes('<GameDetailPage slug={gameMatch[1]} />'), 'React game detail page is not mounted')
  assert.ok(!main.includes('<GamesHub'), 'Do not create a second React catalogue at /games; static portal owns that route')
})

check('Five games are present in the static catalogue and detail metadata', () => {
  for (const id of ['null-shift', 'time', 'swarm', 'inherit', 'remix']) {
    assert.ok(html.includes('data-game="' + id + '"'), 'Static card missing ' + id)
    assert.ok(hub.includes("id: '" + id + "'"), 'React detail metadata missing ' + id)
    assert.ok(html.includes('href="/game/' + id + '"'), 'Detail link missing for ' + id)
    assert.ok(sitemap.includes('https://osgard.world/game/' + id), 'Sitemap detail URL missing for ' + id)
  }
})

check('NULL//SHIFT launch and manifest use the tracked browser build', () => {
  assert.ok(html.includes('data-play="null-shift"') && html.includes('/games/null-shift/index.html'))
  assert.ok(lifecycle.includes("'null-shift':{title:'NULL//SHIFT',url:'/games/null-shift/index.html'}"))
  assert.ok(manifest.includes("href: '/games/null-shift/index.html'"))
  assert.ok(app.includes('href="/game/null-shift"'))
  assert.ok(!html.includes('/games/null-shift-godot/'))
  assert.ok(!lifecycle.includes('/games/null-shift-godot/'))
  assert.ok(!manifest.includes('/games/null-shift-godot/'))
})

check('Legacy Godot URL forwards to browser build instead of claiming an unshipped export', () => {
  assert.ok(legacyGodotEntry.includes('url=/games/null-shift/index.html'))
  assert.ok(legacyGodotEntry.includes("window.location.replace('/games/null-shift/index.html')"))
  assert.ok(nginx.includes('location = /games/null-shift-godot/index.html'))
  assert.ok(nginx.includes('return 301 /games/null-shift/index.html;'))
  assert.ok(routeMatrix.includes('legacyGodotRoute ? []'))
  assert.ok(!routeMatrix.includes('index.wasm') && !routeMatrix.includes('index.pck'))
})

check('Old entertainment URLs converge on the actual static Games portal', () => {
  for (const location of ['location = /entertainment {', 'location = /entertainment/ {', 'location = /entertainment/index.html {']) {
    assert.ok(nginx.includes(location), location)
  }
  assert.ok(nginx.includes('return 301 /games/;'))
  assert.ok(routeMatrix.includes("'/entertainment/index.html'"))
  assert.ok(routeMatrix.includes("new URL(response.url).pathname === '/games/'"))
})

check('Launch lifecycle detects readiness/failure and prevents duplicate launch', () => {
  assert.ok(lifecycle.includes('function startSession(') && lifecycle.includes('game_session_completed'))
  assert.ok(lifecycle.includes('clientReadyMs') && lifecycle.includes('durationSeconds') && lifecycle.includes('function fail('))
  assert.ok(lifecycle.includes('event.preventDefault();event.stopPropagation();launch(id,link.href,false)'))
  assert.ok(lifecycle.includes("event.origin!==location.origin") && lifecycle.includes('event.source!==frame.contentWindow'))
  assert.ok(lifecycle.includes('if(!consent||!token)return'))
  new Function(lifecycle)
})

check('Analytics requires consent and login; iframe load is not counted as gameplay', () => {
  assert.ok(hub.includes("if (consent !== 'granted') return"))
  assert.ok(hub.includes("track('game_opened'"))
  assert.ok(!hub.includes("track('game_session_started', { game: game.id, surface: 'games-iframe' }, consent)"))
  assert.ok(lifecycle.includes("allowedEvent('game_session_started'"))
  assert.ok(lifecycle.includes("allowedEvent('game_session_completed'"))
})

check('Catalogue search, categories, device filters, favorites and history exist', () => {
  for (const token of ['setQuery', 'setCategory', 'setDevice', 'matchesQuery', 'matchesCategory', 'matchesDevice', 'osgard.games.favorites.v1', 'osgard.games.recent.v1']) {
    assert.ok(hub.includes(token), token)
  }
  for (const token of ['id="game-search"', 'data-filter="tactical"', 'id="clear-filters"']) assert.ok(html.includes(token), token)
})

check('Game details provide controls, compatibility, standalone fallback and fullscreen', () => {
  for (const token of ['gh-detail-info-grid', 'controlsRu', 'supportRu', 'featuresRu', 'requestFullscreen()', 'Open game separately', 'game.href']) assert.ok(hub.includes(token), token)
  assert.ok(hub.includes('setFrameError(true)'))
})

check('SEO and schema exist for catalogue and game detail pages', () => {
  assert.ok(html.includes('type="application/ld+json"') && html.includes('<meta name="description"'))
  assert.ok(hub.includes("'@type': 'CollectionPage'") && hub.includes("'@type': 'VideoGame'"))
  assert.ok(hub.includes('meta[property="og:title"]') && hub.includes('meta[name="twitter:title"]'))
  assert.equal((sitemap.match(/<url>/g) || []).length, (sitemap.match(/<\/url>/g) || []).length)
})

check('Contact form is honest about email handoff and required contacts are wired', () => {
  assert.ok(html.includes('osman.osmanov0099@gmail.com') && html.includes('https://wa.me/79640027222'))
  assert.ok(html.includes('id="project-form"') && html.includes('БЕЗ АВТООТПРАВКИ'))
  assert.ok(html.includes('Форма не отправляет поля на сервер'))
  assert.ok(hub.includes('handleLead') && hub.includes('mailto:'))
  assert.ok(hub.includes('server-side form delivery is not connected yet') && hub.includes('Серверное хранение заявок пока не подключено'))
})

check('Ten ecosystem links have campaign tagging and safe external target behavior', () => {
  for (const host of ['osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio']) {
    assert.ok(html.includes(host), 'Missing project: ' + host)
  }
  assert.ok(html.includes('utm_source=osgard_games'))
  assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'))
})

check('No fake ratings/popularity or unconfigured ad network is presented as active', () => {
  assert.ok(!/playerCount|reviewCount|rating\s*[:=]\s*\d/.test(html + hub))
  assert.ok(html.includes('Рекламная сеть не подключена. Скрытых показов нет.'))
  assert.ok(html.includes('Спонсорский уровень') && html.includes('явно обозначенной'))
  assert.ok(terms.includes('не подключены платёжный процессор') && terms.includes('рекламная сеть'))
})

check('Privacy, legal scope and responsive motion support are present', () => {
  assert.ok(privacy.includes('osgard.games.analytics-consent.v1'))
  assert.ok(terms.includes('рабочим') || terms.includes('прототип') || terms.includes('рабочий черновик'))
  assert.ok(css.includes('@media (max-width: 760px)') && css.includes('@media (max-width: 380px)'))
  assert.ok(css.includes('prefers-reduced-motion: reduce') && css.includes(':focus-visible'))
  assert.ok(html.includes('prefers-reduced-motion:reduce'))
})

check('Static portal inline JavaScript parses and avoids third-party asset CDNs', () => {
  const scripts = Array.from(html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi))
    .filter(match => !/application\/ld\+json/i.test(match[1]))
    .map(match => match[2])
    .filter(source => source.trim())
  assert.ok(scripts.length > 0, 'Inline app script not found')
  for (const source of scripts) new Function(source)
  assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(html))
})

const failed = checks.filter(item => item.status === 'failed')
const report = { status: failed.length ? 'failed' : 'passed', total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }
console.log(JSON.stringify(report, null, 2))
if (failed.length) process.exitCode = 1

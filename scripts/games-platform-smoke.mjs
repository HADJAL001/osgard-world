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

const hub = await read('src/GamesHub.tsx')
const css = await read('src/games-hub.css')
const main = await read('src/main.tsx')
const manifest = await read('src/core/manifest.ts')
const html = await read('index.html')
const legal = await read('src/LegalPage.tsx')
const sitemap = await read('public/sitemap.xml')
const nginx = await read('nginx.conf')
const routeMatrix = await read('scripts/production-route-matrix.mjs')
const legacyGodotEntry = await read('public/games/null-shift-godot/index.html')

for (const [name, path] of [
  ['time strategy', 'src/TimePrototype.tsx'],
  ['SWARM entry point', 'public/games/swarm/index.html'],
  ['NULL//SHIFT entry point', 'public/games/null-shift/index.html'],
  ['INHERIT entry point', 'public/games/inherit/index.html'],
  ['REMIX entry point', 'public/games/remix/index.html'],
  ['OSGARD SVG favicon', 'public/osgard-mark.svg'],
]) {
  try { await exists(path); checks.push({ name, status: 'passed' }) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error?.message || error) }) }
}

check('Five named games included', () => {
  for (const id of ["time", "swarm", "null-shift", "inherit", "remix"]) assert.ok(hub.includes("id: '" + id + "'"), "Missing " + id)
})
check('Shared /games route is registered', () => assert.ok(main.includes("path === '/games'") && main.includes('<GamesHub')))
check('Five /game/:slug pages are routed through a single detail component', () => assert.ok(main.includes("path.match(/^\\/game\\/([a-z0-9-]+)$/)") && main.includes('<GameDetailPage slug=')))
check('Null Shift catalogue URL points to an existing web entry', () => {
  assert.ok(manifest.includes("href: '/games/null-shift/index.html'"))
  assert.ok(hub.includes("href: '/games/null-shift/index.html'"))
  assert.ok(!hub.includes('/games/null-shift-godot/'))
})
check('Catalog search and genre/device filters exist', () => {
  for (const token of ['setQuery', 'setCategory', 'setDevice', 'matchesQuery', 'matchesCategory', 'matchesDevice']) assert.ok(hub.includes(token), token)
})
check('Local favourites and recent-play state are namespaced and guarded', () => {
  assert.ok(hub.includes('osgard.games.favorites.v1') && hub.includes('osgard.games.recent.v1'))
  assert.ok(hub.includes('function readStringList') && hub.includes('catch'))
})
check('Analytics events are consent-gated', () => assert.ok(hub.includes("if (consent !== 'granted') return")))
check('Consent can be changed later', () => assert.ok(hub.includes('setConsentPanelOpen(true)') && hub.includes("chooseConsent('denied')")))
check('Game launch has loading, fullscreen and standalone fallback controls', () => {
  for (const token of ['gh-game-loading', 'requestFullscreen()', 'Open game separately', 'game.href']) assert.ok(hub.includes(token), token)
})
check('Browser share has a clipboard fallback', () => assert.ok(hub.includes('navigator.share') && hub.includes('navigator.clipboard?.writeText')))
check('Search shortcut is wired and failed iframe shell can be detected', () => {
  assert.ok(hub.includes('event.metaKey || event.ctrlKey') && hub.includes('searchRef.current?.focus()'))
  assert.ok(hub.includes('const validTitle') && hub.includes('setFrameError(true)'))
})
check('All ten cross-promotion links are present', () => {
  for (const domain of ['osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio']) assert.ok(hub.includes(domain), domain)
})
check('Project cards open external URLs safely', () => assert.ok(hub.includes('target="_blank" rel="noopener noreferrer"')))
check('Contact addresses and lead form are wired', () => {
  assert.ok(hub.includes('osman.osmanov0099@gmail.com') && hub.includes('https://wa.me/79640027222'))
  assert.ok(hub.includes('handleLead') && hub.includes('mailto:'))
})
check('Lead form states that server delivery is not connected', () => assert.ok(hub.includes('server-side form delivery is not connected yet') && hub.includes('Серверное хранение заявок пока не подключено')))
check('Game detail pages include control/support/features sections', () => {
  for (const token of ['gh-detail-info-grid', 'controlsRu', 'supportRu', 'featuresRu']) assert.ok(hub.includes(token), token)
})
check('Catalog and game pages expose dynamic SEO metadata/schema', () => {
  assert.ok(hub.includes("'@type': 'CollectionPage'") && hub.includes("'@type': 'VideoGame'"))
  assert.ok(hub.includes('meta[property="og:title"]') && hub.includes('meta[name="twitter:title"]'))
})
check('Responsive breakpoints and reduced-motion handling exist', () => {
  assert.ok(css.includes('@media (max-width: 760px)') && css.includes('@media (max-width: 380px)') && css.includes('prefers-reduced-motion: reduce') && css.includes(':focus-visible'))
})
check('Legal routes and honest scope limitations exist', () => {
  assert.ok(main.includes("path === '/privacy'") && main.includes("path === '/terms'"))
  assert.ok(legal.includes('рабочий черновик') && legal.includes('не сохраняет заявку на сервере'))
})
check('Favicon no longer uses a photographic JPG', () => assert.ok(html.includes('/osgard-mark.svg') && !html.includes('rel="icon" href="/assets/hero-mobility.jpg"')))
check('Legacy entertainment URLs resolve to the canonical Games hub', () => {
  assert.ok(main.includes("path === '/games' || path === '/entertainment'"), 'SPA should render GamesHub on both current and legacy paths')
  for (const path of ["location = /entertainment {", "location = /entertainment/ {", "location = /entertainment/index.html {"]) assert.ok(nginx.includes(path), path)
  assert.ok(nginx.includes('return 301 /games;'), 'Legacy route redirects must be permanent and visible')
  assert.ok(routeMatrix.includes("'/entertainment/index.html'") && routeMatrix.includes("response.redirected") && routeMatrix.includes("=== '/games'"), 'Production route matrix must assert redirect target')
})

check('Legacy NULL//SHIFT Godot URL forwards to existing browser build', () => {
  assert.ok(legacyGodotEntry.includes('url=/games/null-shift/index.html'))
  assert.ok(legacyGodotEntry.includes("window.location.replace('/games/null-shift/index.html')"))
  assert.ok(routeMatrix.includes("legacyGodotRoute ? []"), 'Production checks must not require missing Godot export binaries')
})

check('Sitemap lists new catalogue pages and has balanced URL elements', () => {
  assert.ok(sitemap.includes('https://osgard.world/games') && sitemap.includes('https://osgard.world/game/null-shift'))
  assert.equal((sitemap.match(/<url>/g)||[]).length, (sitemap.match(/<\/url>/g)||[]).length)
})

const failed = checks.filter(item => item.status === 'failed')
const report = { status: failed.length ? 'failed' : 'passed', total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }
console.log(JSON.stringify(report, null, 2))
if (failed.length) process.exitCode = 1

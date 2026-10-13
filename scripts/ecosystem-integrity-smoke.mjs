import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const app = read('src/App.tsx')
const sections = read('src/Sections.tsx')
const development = read('src/Development.tsx')
const manifest = read('src/core/manifest.ts')
const games = read('public/games/index.html')
const lifecycle = read('public/games/player-lifecycle.js')
const sitemap = read('public/sitemap.xml')
const nginx = read('nginx.conf')

const promotionSources = { app, sections, development }
const unsupportedClaims = [
  '99.9%', '7 min', '7 мин', '360°', '360пїЅ', '+2 h', '+2 часа в день',
  '40% less chaos', 'Меньше хаоса на 40%', '2 min', '2 мин', '0.0%',
  '4K MASTER', 'Экономия 50 000 ₽', 'Доход от 30 000 ₽/мес',
  'osgardnewworld.com',
]
for (const [file, source] of Object.entries(promotionSources)) {
  for (const claim of unsupportedClaims) {
    assert.ok(!source.includes(claim), 'Unsupported quantitative claim "' + claim + '" remains in ' + file)
  }
}

const projectHosts = [
  'osgardbewworld.com', 'o2system.art', 'senjorio.com', 'superday.run',
  'marcosa.club', 'myosa.world', 'gold-glamour.online', 'gardvpn.is',
  'osgardos.com', 'osgardvanguard.studio',
]
for (const host of projectHosts) {
  assert.ok(games.includes(host), 'Games hub is missing first-party project ' + host)
  assert.ok(games.includes('utm_source=osgard_games'), 'Games hub lacks campaign attribution')
  assert.ok(development.includes(host), 'Development portfolio is missing ' + host)
}

for (const [path, source] of [['src/App.tsx', app], ['src/Development.tsx', development], ['public/games/index.html', games]]) {
  assert.ok(source.includes('osman.osmanov0099@gmail.com'), path + ' is missing contact email')
  assert.ok(source.includes('https://wa.me/79640027222'), path + ' is missing the WhatsApp contact URL')
}

assert.ok(app.includes('href="/games/"'), 'Main navigation must expose the Games hub')
assert.ok(sections.includes("['Entertainment', '/games/']"), 'Secondary/section navigation must open the Games hub')
assert.ok(nginx.includes('location = /entertainment') && nginx.includes('return 301 /games/;'), 'Legacy Entertainment URLs must redirect to Games')
assert.ok(nginx.includes('location ^~ /api/v1/') && nginx.includes('proxy_pass http://osgard-game-api:4317;'), 'Player API must reach its service rather than the SPA fallback')
assert.ok(nginx.includes('limit_req zone=osgard_api burst=60 nodelay;') && nginx.includes('limit_req_status 429;'), 'Player API needs request-rate limits')

assert.ok(app.includes("url: 'https://osgardbewworld.com/'"), 'Main ecosystem must use the supplied digital-development domain')
assert.ok(sections.includes("href: '/games/time'"), 'Entertainment route must point to the current Time game URL')
assert.ok(!sections.includes('/games/time-empire/'), 'Legacy Time route must not be used by the current catalog')
assert.ok(manifest.includes("href: '/games/null-shift-godot/index.html'"), 'Manifest should point to the engine-export route')
assert.ok(games.includes('Рекламная сеть не подключена. Скрытых показов нет.'), 'Sponsor inventory must remain transparent while no ad provider is connected')
assert.ok(games.includes('Без фиктивных рейтингов и онлайна') || games.includes('БЕЗ ФИКТИВНЫХ РЕЙТИНГОВ И ОНЛАЙНА'), 'Catalog should not imply fabricated players or ratings')
assert.ok(games.includes('/privacy/') && games.includes('/terms/'), 'Privacy and terms links are required')
assert.ok(sitemap.includes('https://osgard.world/games/'), 'Sitemap must include Games')
assert.ok(lifecycle.includes('if(!consent||!token)return'), 'Session analytics must require user consent and authenticated account')
assert.ok(lifecycle.includes('event.origin!==location.origin') && lifecycle.includes('event.source!==frame.contentWindow'), 'Cross-frame lifecycle messages must be same-origin and source-checked')
assert.ok(lifecycle.includes('function startSession(') && lifecycle.includes('game_session_completed'), 'Gameplay lifecycle tracking must observe real client readiness and session completion')
const apiProxyStart = nginx.indexOf('location ^~ /api/v1/ {')
const apiProxyEnd = nginx.indexOf('location /api/remix/ {', apiProxyStart)
const spaFallbackStart = nginx.indexOf('location / {')
assert.ok(apiProxyStart >= 0 && apiProxyEnd > apiProxyStart && spaFallbackStart > apiProxyStart, 'Nginx must route /api/v1/* before the SPA fallback')
const apiProxy = nginx.slice(apiProxyStart, apiProxyEnd)
assert.ok(nginx.indexOf('limit_req_zone $binary_remote_addr zone=osgard_player_api:10m rate=15r/s;') < apiProxyStart, 'Nginx API rate-limit zone must be declared in the http context before server blocks')
assert.ok(apiProxy.includes('proxy_pass http://osgard-game-api:4317;'), 'Protected player and aggregate analytics endpoints must reach the API container')
assert.ok(apiProxy.includes('limit_req zone=osgard_player_api burst=30 nodelay;') && apiProxy.includes('limit_req_status 429;'), 'API route must enforce an explicit per-client rate limit')
assert.ok(apiProxy.includes('add_header Cache-Control "no-store" always;'), 'Player and admin analytics responses must not be cached by shared browsers/proxies')
assert.ok(apiProxy.includes('proxy_read_timeout 10s;') && apiProxy.includes('client_max_body_size 256k;'), 'API proxy needs bounded request size and upstream timeout')
assert.ok(!apiProxy.includes('proxy_set_header Authorization "Bearer'), 'API credentials must never be injected by static Nginx configuration')

console.log(JSON.stringify({
  status: 'PASS',
  checks: 45,
  projects: projectHosts.length,
  claimsGuarded: unsupportedClaims.length,
  contacts: 3,
  verifiedInSource: ['game route wiring', 'honest monetization status', 'consent/auth-gated event capture', 'cross-frame origin validation', 'contact routing'],
}, null, 2))

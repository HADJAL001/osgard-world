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
const legalStart = app.indexOf('function Legal(')
const legalEnd = app.indexOf('function PlayGateway(', legalStart)
assert.ok(legalStart >= 0 && legalEnd > legalStart, 'TimeCoin legal component boundaries missing')
const timeCoinLegal = app.slice(legalStart, legalEnd)
assert.ok(!/[�]|РџСЂ|РћРіСЂ|����/.test(timeCoinLegal), 'TimeCoin legal copy contains mojibake')
for (const phrase of ['Правила TimeCoin', '1. Статус единицы', 'Используется исключительно', '3. Ограничения']) {
  assert.ok(timeCoinLegal.includes(phrase), 'TimeCoin legal copy missing readable Russian phrase: ' + phrase)
}

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
assert.ok(apiProxy.includes('resolver 127.0.0.11 valid=30s ipv6=off;') && apiProxy.includes('set $osgard_game_api_host osgard-game-api;') && apiProxy.includes('proxy_pass http://$osgard_game_api_host:4317;'), 'Protected API proxy must use Docker DNS at request time so Nginx can start before the API alias resolves')
const commerce = read('commerce-api/app.py')
const commerceTests = read('commerce-api/test_api.py')
const commerceDockerfile = read('commerce-api/Dockerfile')
const compose = read('docker-compose.production.yml')
const commerceApiStart = nginx.indexOf('location ^~ /commerce-api/')
assert.ok(commerceApiStart >= 0, 'Nginx must route the same-origin commerce API')
const commerceApi = nginx.slice(commerceApiStart, nginx.indexOf('\n  location ', commerceApiStart + 10))
assert.ok(commerceApi.includes('set $osgard_commerce_api_host osgard-commerce-api') && commerceApi.includes('proxy_pass http://$osgard_commerce_api_host:8080'), 'Nginx must proxy commerce only to the private internal service')
assert.ok(commerceApi.includes('client_max_body_size 64k') && commerceApi.includes('limit_req zone=osgard_player_api'), 'Commerce proxy must enforce request-size and rate limits')
assert.ok(compose.includes('container_name: osgard-commerce-api') && compose.includes('build: ./commerce-api') && compose.includes('osgard-commerce-data:/var/lib/osgard-commerce'), 'Production compose must define a persistent private commerce service')
assert.ok(compose.includes('STRIPE_MODE:-disabled') && compose.includes('STRIPE_SECRET_KEY:-') && compose.includes('STRIPE_WEBHOOK_SECRET:-'), 'Checkout must remain disabled when server secrets/config are absent')
assert.ok(compose.includes('osgard-commerce-api:\n        condition: service_healthy'), 'Frontend compose service must wait for a healthy commerce API')
assert.ok(commerceDockerfile.includes('COPY --chown=commerce:commerce app.py /app/app.py') && commerceDockerfile.includes('USER 10001:10001'), 'Commerce container must run the implemented app as a non-root user')
assert.ok(commerce.includes('checkout_disabled') && commerce.includes('verify_stripe_signature') && commerce.includes('stripe-webhook'), 'Checkout is fail-closed and webhook signature verification is implemented')
assert.ok(commerce.includes('checkout_paid') && commerce.includes('amount_refunded') && commerce.includes('partially_refunded'), 'Revenue accounting must derive from server-verified payments and preserve partial-refund amounts')
assert.ok(commerce.includes('hmac.compare_digest') && commerce.includes('ADMIN_API_TOKEN') && commerce.includes('consent_required'), 'Commerce API must verify webhook/admin secrets and require event/lead consent')
assert.ok(commerce.includes('STRIPE_MODE') && commerce.includes('I_UNDERSTAND_LIVE_PAYMENTS') && commerce.includes('SELLER_LEGAL_NAME'), 'Live checkout must require explicit acknowledgement and seller/legal metadata')
assert.ok(commerceTests.includes('test_checkout_uses_server_price_and_stripe_webhook_is_idempotent') && commerceTests.includes('test_products_and_checkout_fail_closed_by_default') && commerceTests.includes('test_referral_funnel_is_stored_and_aggregated'), 'Commerce tests must cover payment failure-safe defaults, server pricing and referral metrics')
assert.ok(!commerceDockerfile.includes('server.py'), 'Container must not refer to a missing service entrypoint')

const activator = read('scripts/activate-frontend-remote.sh')
assert.ok(activator.includes('http://osgard-game-api:4317/health') && activator.includes('NetworkSettings.Networks') && activator.includes('nginx.runtime.conf') && activator.includes('OSGARD game API upstream selected'), 'Activation must verify the API from the frontend container and select a healthy reachable upstream before switching the site')
assert.ok(activator.includes('Detected Docker gateway candidates:') && activator.includes('wget -S -T 3 -O- http://$gateway:4317/health'), 'Activation must log gateway candidates and the failed HTTP probe before refusing activation')
assert.ok(activator.includes("ufw status 2>/dev/null | grep -q '^Status: active'") && activator.includes('ufw allow in on "$bridge_iface" from "$api_container_ip" to "$api_gateway" port 4317 proto tcp'), 'Any firewall adjustment must be limited to active UFW, the current Docker bridge, frontend container IP, gateway IP and TCP/4317')
assert.ok(activator.includes('Cannot safely derive a Docker bridge interface/IP') && activator.includes('refusing frontend activation'), 'Activation must fail closed if the scoped Docker bridge rule cannot be derived or verified')
const deployWorkflow = read('.github/workflows/deploy-frontend.yml')
assert.ok(deployWorkflow.includes('gateway="${gateway_values%% *}"') && !deployWorkflow.includes("awk '{print $1}'"), 'Post-failure diagnostics must extract the Docker gateway without the broken nested awk quoting')
assert.ok(deployWorkflow.includes('iptables -vnL INPUT') && deployWorkflow.includes('iptables -vnL DOCKER-USER') && deployWorkflow.includes('ufw status verbose'), 'Deployment failure diagnostics must inspect host firewall state read-only')
assert.ok(apiProxy.includes('limit_req zone=osgard_player_api burst=30 nodelay;') && apiProxy.includes('limit_req_status 429;'), 'API route must enforce an explicit per-client rate limit')
assert.ok(apiProxy.includes('add_header Cache-Control "no-store" always;'), 'Player and admin analytics responses must not be cached by shared browsers/proxies')
assert.ok(apiProxy.includes('proxy_read_timeout 10s;') && apiProxy.includes('client_max_body_size 256k;'), 'API proxy needs bounded request size and upstream timeout')
assert.ok(!apiProxy.includes('proxy_set_header Authorization "Bearer'), 'API credentials must never be injected by static Nginx configuration')

console.log(JSON.stringify({
  status: 'PASS',
  checks: 50,
  projects: projectHosts.length,
  claimsGuarded: unsupportedClaims.length,
  contacts: 3,
  verifiedInSource: ['game route wiring', 'honest monetization status', 'consent/auth-gated event capture', 'cross-frame origin validation', 'contact routing', 'API bridge diagnostics'],
}, null, 2))

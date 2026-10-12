import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const read = path => readFileSync(path, 'utf8')
const htmlPath = 'public/games/index.html'
const html = read(htmlPath)
const app = read('src/App.tsx')
const manifest = read('src/core/manifest.ts')
const catalog = read('src/EntertainmentCatalog.tsx')
const index = read('index.html')
const sitemap = read('public/sitemap.xml')
assert.ok(html.length > 20000, 'Premium Games hub unexpectedly small')
assert.match(html, /<html lang="ru">/i)
assert.match(html, /name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/)
assert.match(html, /rel="canonical" href="https:\/\/osgard\.world\/games\/"/)
assert.match(html, /id="game-grid"/)
assert.match(html, /id="lead-form"/)
assert.match(html, /id="game-dialog"/)
assert.match(html, /id="consent"/)
assert.match(html, /id="export-events"/)
assert.match(html, /id="manage-consent"/, 'The consent decision must be changeable after first choice')
assert.match(html, /prefers-reduced-motion:reduce/)
assert.ok(!/googletagmanager|google-analytics|doubleclick|adsbygoogle|stripe\.com|paypal\.com/i.test(html), 'Unconfigured ad/analytics/payment script must not be embedded')
assert.ok(!/on(click|load|error)\s*=\s*["']/i.test(html), 'Inline event-handler attributes are not allowed')
assert.ok(index.includes('/assets/osgard-mark.svg'), 'Portal must use the custom favicon')
assert.ok(existsSync('public/assets/osgard-mark.svg'), 'OSGARD brand mark is missing')
const paths = ['/games/time','/games/swarm/index.html','/games/null-shift/index.html','/games/inherit/index.html','/games/remix/index.html']
for (const path of paths) {
  if (path === '/games/time') assert.ok(read('src/main.tsx').includes("path === '/games/time'"), 'Time SPA route missing')
  else assert.ok(existsSync(resolve('public', '.' + path)), 'Missing game launch target: ' + path)
}
const script = html.match(/<script>([\s\S]*?)<\/script>/)
assert.ok(script, 'Hub inline JS not found')
new Function(script[1])
for (const id of ['time','swarm','null-shift','inherit','remix']) {
  assert.ok(html.includes("id:'"+id+"'"), 'Missing catalog game: '+id)
  assert.ok(html.includes("data-play"), 'Game play controls missing')
}
for (const feature of ['data-filter','favoritesKey','recentKey','game_session_started','game_session_completed','game_fullscreen_requested','cross_promo_clicked','utm_source','utm_medium','utm_campaign','navigator.share','requestFullscreen','osgard-games-analytics-local.csv']) assert.ok(html.includes(feature), 'Catalog feature/measurement missing: '+feature)
for (const url of ['https://osgardbewworld.com/','https://o2system.art/','https://senjorio.com/','https://superday.run/','https://marcosa.club/','https://myosa.world/','https://gold-glamour.online/','https://gardvpn.is/','https://osgardos.com/','https://osgardvanguard.studio/']) assert.ok(html.includes(url), 'Missing user-specified ecosystem URL: '+url)
assert.ok(html.includes('osman.osmanov0099@gmail.com'))
assert.ok(html.includes('https://wa.me/79640027222'))
assert.ok(html.includes('mailto:osman.osmanov0099@gmail.com?subject='))
assert.ok(html.includes('Ничего не отправляется автоматически'), 'Lead form must disclose mailto behavior')
assert.ok(html.includes('PARTNER INTEGRATION / RESERVED · INACTIVE'), 'Sponsor inventory must remain explicitly inactive until configured')
assert.ok(html.includes('NO CHECKOUT CONNECTED'), 'No connected payments disclaimer missing')
assert.ok(html.includes('if(!currentConsent())return'), 'Analytics events must require explicit local consent')
assert.ok(html.includes('if(!currentConsent()&&safeRead(consentKey,null)===null)'), 'First-run consent UI missing')
assert.ok(html.includes('/games/privacy.html') && html.includes('/games/terms.html'))
for (const path of ['public/games/privacy.html','public/games/terms.html']) {
  const doc=read(path); assert.match(doc,/<h1>/); assert.match(doc,/проект/i); assert.ok(!doc.includes('Соответствие всем законам гарантировано'))
}
assert.ok(app.includes('href="/games/"'), 'Main OSGARD portal should link to new Games hub')
assert.ok(app.includes('href="/games/null-shift/"'), 'Featured NULL SHIFT route should point to published browser game')
assert.ok(manifest.includes("href: '/games/null-shift/index.html'"), 'Game manifest must point at existing browser build')
assert.ok(catalog.includes("window.location.replace('/games/' + query)"), 'Legacy React route must preserve entry via redirect')
assert.ok(sitemap.includes('https://osgard.world/games/'), 'Sitemap must include Games hub')
const privacyBytes=statSync('public/games/privacy.html').size
const termsBytes=statSync('public/games/terms.html').size
console.log(JSON.stringify({status:'PASS',checks:43,hubBytes:Buffer.byteLength(html),privacyBytes,termsBytes,games:5,ecosystemLinks:10,jsSyntax:'PASS',payments:'disabled',serverAnalytics:'not claimed'},null,2))

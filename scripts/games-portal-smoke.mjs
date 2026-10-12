import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
const root=resolve('public/games')
const html=readFileSync(resolve(root,'index.html'),'utf8')
const required=['data-game="null-shift"','data-game="time"','data-game="swarm"','data-game="inherit"','data-game="remix"','id="games-grid"','id="game-search"','data-filter="tactical"','id="player-dialog"','id="player-share"','id="player-fullscreen"','id="analytics-toggle"','id="project-form"','https://wa.me/79640027222','osman.osmanov0099@gmail.com','osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio','href="/games/monetization/"','/games/favicon.svg','/privacy/','/terms/']
for(const item of required) assert.ok(html.includes(item),'Games hub missing: '+item)
for(const path of ['public/games/index.html','public/games/favicon.svg','public/privacy/index.html','public/terms/index.html','public/games/null-shift-godot/index.html','public/games/monetization/index.html','public/games/monetization/app.js','public/games/monetization/model.js']) assert.ok(existsSync(resolve(path)),'Missing file: '+path)
assert.ok(html.includes('type="application/ld+json"'),'SEO ItemList JSON-LD missing')
const fallback=readFileSync(resolve(root,'null-shift-godot/index.html'),'utf8')
assert.ok(fallback.includes('data-godot-fallback="webgl"')&&fallback.includes('href="/games/null-shift/"'),'Godot route must fail over honestly to the tracked WebGL game when export assets are absent')
const modelPage=readFileSync(resolve(root,'monetization/index.html'),'utf8')
assert.ok(modelPage.includes('data-estimate="not-live-data"')&&modelPage.includes('id="assumptions-form"')&&modelPage.includes('id="scenario-results"')&&modelPage.includes('id="export-json"'),'Financial scenario planner must distinguish its estimates from live analytics')
const modelSource=readFileSync(resolve(root,'monetization/model.js'),'utf8')
assert.ok(modelSource.includes('calculateScenario')&&modelSource.includes('SCENARIOS')&&modelSource.includes('normalizeInputs'),'Finance model calculation functions missing')
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(modelPage),'Monetization page must not depend on remote asset CDNs')
assert.ok(html.includes('<meta name="description"'),'SEO description missing')
assert.ok(html.includes('prefers-reduced-motion:reduce'),'Reduced motion CSS missing')
const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1]||''
assert.ok(css.includes('@media(max-width:760px)'),'Responsive/mobile layout missing')
assert.ok(css.includes('.player-view')&&css.includes('dialog::backdrop'),'Game dialog style missing')
const scripts=Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)).map(m=>m[1]).filter(s=>s.trim()&&!s.trim().startsWith('{'))
assert.ok(scripts.length,'Inline application JavaScript not found')
const js=scripts[scripts.length-1]
new Function(js)
assert.ok(js.includes('osgard.games.favorites.v1')&&js.includes('osgard.games.recent.v1'),'Local favorites/history missing')
assert.ok(js.includes('osgard.games.recommendation.v1')&&js.includes('nextByGame')&&js.includes('ДАЛЬШЕ · '),'Rule-based next-game recommendation must be persisted locally after the game dialog closes')
assert.ok(html.includes('FIELD 01 <b>BROWSER / WEBGL</b>')&&!html.includes('FIELD 01 <b>GODOT / WEB</b>'),'The catalog must not label the fallback as an exported Godot build')
assert.ok(js.includes("localStorage.getItem('osgard.auth.accessToken')")&&js.includes('/api/v1/player/events')&&js.includes('if(!consent)return'),'Analytics must require both explicit consent and login token')
assert.ok(js.includes("eventIfAllowed('share_created',id)"),'Share action event missing')
assert.ok(js.includes('frame.requestFullscreen()'),'Fullscreen action missing')
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(html),'External asset CDN found')
for(const host of ['osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio']) {
  const hostPattern = new RegExp('href="https://' + host.replace(/\./g, '\\.') + '[^"]+"', 'g')
  const links = Array.from(html.matchAll(hostPattern), match => match[0])
  assert.ok(links.some(link => link.includes('utm_source=osgard_games') && link.includes('utm_medium=cross_promo') && link.includes('utm_campaign=games_hub')), 'Cross-promo URL is missing its UTM campaign parameters for ' + host)
}
console.log('PASS OSGARD GAMES HUB: five actual game routes, search/filters, local favorites/history, embedded player/fullscreen/share, consent-gated authenticated analytics, cross-promotion, contact form, SEO, mobile/reduced-motion styling and legal documents.')

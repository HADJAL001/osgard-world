import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
const root=resolve('public/games')
const html=readFileSync(resolve(root,'index.html'),'utf8')
const lifecycle=readFileSync(resolve(root,'player-lifecycle.js'),'utf8')
const required=['data-game="null-shift"','data-game="time"','data-game="swarm"','data-game="inherit"','data-game="remix"','id="games-grid"','id="game-search"','data-filter="tactical"','id="player-dialog"','id="player-share"','id="player-fullscreen"','id="analytics-toggle"','href="/games/growth-lab/"','id="project-form"','https://wa.me/79640027222','osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio','/games/favicon.svg','/privacy/','/terms/']
for(const item of required) assert.ok(html.includes(item),'Games hub missing: '+item)
for(const path of ['public/games/index.html','public/games/favicon.svg','public/games/player-lifecycle.js','public/privacy/index.html','public/terms/index.html']) assert.ok(existsSync(resolve(path)),'Missing file: '+path)
assert.ok(html.includes('type="application/ld+json"'),'SEO ItemList JSON-LD missing')
assert.ok(html.includes('<meta name="description"'),'SEO description missing')
assert.ok(html.includes('prefers-reduced-motion:reduce'),'Reduced motion CSS missing')
const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1]||''
assert.ok(css.includes('@media(max-width:760px)'),'Responsive/mobile layout missing')
assert.ok(css.includes('.player-view')&&css.includes('dialog::backdrop'),'Game dialog style missing')
assert.ok(html.includes('src="./player-lifecycle.js"'),'Self-hosted lifecycle module must be included')
assert.ok(lifecycle.includes('function startSession(')&&lifecycle.includes('game_session_completed'),'Actual session lifecycle tracking missing')
assert.ok(lifecycle.includes('event.preventDefault();event.stopPropagation();launch(id,link.href,false)'),'Launch capture must prevent the legacy card handler from opening the same iframe twice')
assert.ok(lifecycle.includes('clientReadyMs')&&lifecycle.includes('durationSeconds')&&lifecycle.includes('function fail('),'Launch timing and failure recovery missing')
assert.ok(lifecycle.includes('osgard:game-lifecycle')&&lifecycle.includes('event.origin!==location.origin')&&lifecycle.includes('event.source!==frame.contentWindow'),'Lifecycle message must validate same-origin iframe/source')
assert.ok(lifecycle.includes('if(!consent||!token)return'),'Lifecycle analytics must require consent and authentication')
new Function(lifecycle)
assert.ok(lifecycle.includes('dialog#player-dialog{width:100vw'),'Mobile CSS selector must match actual dialog id')
const scripts=Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)).map(m=>m[1]).filter(s=>s.trim()&&!s.trim().startsWith('{'))
assert.ok(scripts.length,'Inline application JavaScript not found')
const js=scripts[scripts.length-1]
new Function(js)
assert.ok(js.includes('osgard.games.favorites.v1')&&js.includes('osgard.games.recent.v1'),'Local favorites/history missing')
assert.ok(js.includes("localStorage.getItem('osgard.auth.accessToken')")&&js.includes('/api/v1/player/events')&&js.includes('if(!consent)return'),'Analytics must require both explicit consent and login token')
assert.ok(js.includes("eventIfAllowed('share_created',id)"),'Share action event missing')
assert.ok(js.includes('frame.requestFullscreen()'),'Fullscreen action missing')
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(html),'External asset CDN found')
for(const host of ['osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio']) assert.ok(html.includes('utm_source=osgard_games')&&html.includes(host),'Cross-promo UTM missing for '+host)
console.log('PASS OSGARD GAMES HUB: five actual game routes, search/filters, local favorites/history, embedded player/fullscreen/share, consent-gated authenticated analytics, cross-promotion, contact form, SEO, mobile/reduced-motion styling and legal documents.')

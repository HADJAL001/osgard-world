import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const page = readFileSync(resolve('public/entertainment/index.html'), 'utf8');
const css = readFileSync(resolve('public/entertainment/entertainment.css'), 'utf8');
const js = readFileSync(resolve('public/entertainment/entertainment.js'), 'utf8');
const app = readFileSync(resolve('src/App.tsx'), 'utf8');
const sections = readFileSync(resolve('src/Sections.tsx'), 'utf8');
const sitemap = readFileSync(resolve('public/sitemap.xml'), 'utf8');
const routes = readFileSync(resolve('scripts/production-route-matrix.mjs'), 'utf8');

const ids = [...page.matchAll(/<article class="world-card [^"]*" data-game="([^"]+)"/g)].map(m => m[1]);
const expectedIds = ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid'];
const checks = [
  ['01 · Replace the old redirect with a real entertainment page', !page.includes('http-equiv="refresh"') && !page.includes('window.location.replace')],
  ['02 · Provide a unique page title', page.includes('<title>OSGARD ENTERTAINMENT — Играй. Исследуй. Передавай вызов.</title>')],
  ['03 · Canonical URL points to /entertainment/', page.includes('href="https://osgard.world/entertainment/"')],
  ['04 · SEO description is present', page.includes('name="description" content="OSGARD ENTERTAINMENT')],
  ['05 · Open Graph and Twitter previews are configured', page.includes('property="og:image"') && page.includes('name="twitter:card" content="summary_large_image"')],
  ['06 · Structured data declares the real eleven-entry collection', page.includes('"@type":"CollectionPage"') && page.includes('"numberOfItems":11')],
  ['07 · Exactly eleven catalogue cards are present', ids.length === 11],
  ['08 · Game card IDs are unique', new Set(ids).size === ids.length],
  ['09 · The cards map to the current eleven-game inventory', expectedIds.every(id => ids.includes(id))],
  ['10 · Every world card has a real launch link', page.includes('data-launch="null-shift"') && expectedIds.every(id => page.includes('data-launch="'+id+'"'))],
  ['11 · Search supports title, tags and description', page.includes('id="game-search"') && js.includes('card.textContent')],
  ['12 · Genre filter buttons have pressed state for accessibility', page.includes('data-genre="tactics"') && js.includes("setAttribute('aria-pressed', String(active))")],
  ['13 · Favorites use the same local-storage key as the Games hub', js.includes("FAVORITES_KEY = 'osgard.games.favorites.v1'")],
  ['14 · Recent-game continuation is local to this device', js.includes("RECENT_KEY = 'osgard.games.recent.v1'") && js.includes('recordRecent(id)')],
  ['15 · Alphabetical and recent sorting are implemented', js.includes("mode === 'az'") && js.includes("mode === 'recent'")],
  ['16 · The surprise-me action chooses from the current filtered set', js.includes("querySelector('#surprise-button')") && js.includes('currentVisibleCards()')],
  ['17 · Empty-state controls can reset the filters', page.includes('id="empty-reset"') && js.includes('function resetFilters()')],
  ['18 · Share dialog includes WhatsApp, Telegram and X', ['share-whatsapp','share-telegram','share-x'].every(id => page.includes('id="'+id+'"'))],
  ['19 · Challenge links use the existing invite route and valid game IDs', js.includes("'/games/invite/' + encodeURIComponent(id) + '/'") && js.includes("url.searchParams.set('og_game', id)")],
  ['20 · Share text includes referral and UTM metadata', js.includes("url.searchParams.set('utm_source', 'osgard_entertainment')") && js.includes("url.searchParams.set('utm_campaign', 'play_with_friends')")],
  ['21 · Analytics is explicitly consent-gated and uses the existing queue', js.includes('if (!analyticsConsent()) return false') && js.includes('window.OSGARD_CONSENTED_ANALYTICS')],
  ['22 · Prepared-share events are not mislabelled as verified posts or rewards', js.includes("track('invite_link_prepared'") && page.includes('социальные сети не подтверждают этот факт автоматически') && js.includes('Само копирование не считается репостом')],
  ['23 · Owned-service offers are disclosed as first-party cross-promotion', page.includes('честное продвижение сервисов OSGARD') && page.includes('data-service="projects"')],
  ['24 · Service buttons include source campaign tags', page.includes('utm_source=osgard_entertainment') && page.includes('utm_campaign=network_discovery')],
  ['25 · All ten owned OSGARD services, their tracking IDs and inter-session promo preferences are discoverable', ['osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio'].every(domain => page.includes(domain)) && ['projects','o2system','senjorio','superday','marcosa','myosa','gold-glamour','gardvpn','osgardos','osgardvanguard'].every(id => page.includes('data-service="'+id+'"')) && page.includes('Настроить предложения между раундами')],
  ['26 · Privacy, terms, support and Games routes are reachable from the footer', ['/privacy/','/terms/','/support/osgard-play/','/games/'].every(path => page.includes('href="'+path+'"'))],
  ['27 · Desktop and mobile navigation stay connected to Entertainment', app.includes('className="nav-entertainment" href="/entertainment/"') && sections.includes("['Entertainment', '/entertainment/']")],
  ['28 · Responsive layout includes tablet, phone and narrow-phone breakpoints', css.includes('@media(max-width:1020px)') && css.includes('@media(max-width:740px)') && css.includes('@media(max-width:400px)')],
  ['29 · Reduced-motion preference is respected', css.includes('prefers-reduced-motion:reduce')],
  ['30 · Production routing and sitemap describe the new non-redirect page', routes.includes("text.includes('<title>OSGARD ENTERTAINMENT — Играй. Исследуй. Передавай вызов.</title>')") && sitemap.includes('https://osgard.world/entertainment/')],
];
assert.equal(checks.length, 30);
for (const [label, pass] of checks) assert.ok(pass, label);
assert.doesNotThrow(() => new Function(js), 'Entertainment controller must parse as browser JavaScript');
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(page), 'The landing page must not depend on remote asset CDNs');
console.log('PASS OSGARD ENTERTAINMENT: ' + checks.length + '/30 product guardrails + JavaScript syntax + no remote asset CDN.');

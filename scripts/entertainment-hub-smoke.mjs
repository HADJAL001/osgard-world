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
const expectedIds = ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid','heist-echo'];
const checks = [
  ['01 · Replace the old redirect with a real entertainment page', !page.includes('http-equiv="refresh"') && !page.includes('window.location.replace')],
  ['02 · Provide a unique page title', page.includes('<title>OSGARD ENTERTAINMENT — Играй. Исследуй. Передавай вызов.</title>')],
  ['03 · Canonical URL points to /entertainment/', page.includes('href="https://osgard.world/entertainment/"')],
  ['04 · SEO description is present', page.includes('name="description" content="OSGARD ENTERTAINMENT')],
  ['05 · Open Graph and Twitter previews are configured', page.includes('property="og:image"') && page.includes('name="twitter:card" content="summary_large_image"')],
  ['06 · Structured data declares the real twelve-entry collection', page.includes('"@type":"CollectionPage"') && page.includes('"numberOfItems":12')],
  ['07 · Exactly twelve catalogue cards are present', ids.length === 12],
  ['08 · Game card IDs are unique', new Set(ids).size === ids.length],
  ['09 · The cards map to the current twelve-game inventory', expectedIds.every(id => ids.includes(id)) && ids.includes('heist-echo')],
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
  ['31 · Expedition builder is linked in desktop/mobile navigation and the hero', page.includes('href="/games/expedition/"') && page.includes('Собрать экспедицию')],
];
assert.equal(checks.length, 31);
for (const [label, pass] of checks) assert.ok(pass, label);
assert.doesNotThrow(() => new Function(js), 'Entertainment controller must parse as browser JavaScript');
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(page), 'The landing page must not depend on remote asset CDNs');

const passStart = js.indexOf('/* OSGARD PLAY PASS 1.0');
const passEnd = js.indexOf("document.querySelector('#footer-year')", passStart);
assert.ok(passStart >= 0 && passEnd > passStart, 'OSGARD PLAY PASS feature block must remain a bounded, separately testable module');
const pass = js.slice(passStart, passEnd);
const passChecks = [
  ['01 · Namespaced, versioned local passport key', pass.includes("PLAY_PASS_KEY = 'osgard.entertainment.play-pass.v1'") && pass.includes('PASS_SCHEMA = 1')],
  ['02 · Anonymous profile uses a non-identifying alias', pass.includes("alias: 'P-' + token(3)") && pass.includes('/^P-[A-F0-9]{6}$/')],
  ['03 · Passport stores no name, email or account field', !/\\b(name|email|accountId|userId)\\s*:/i.test(pass)],
  ['04 · Game IDs are restricted to the real catalogue', pass.includes('new Set(allowedGames.keys())') && pass.includes('knownGameIds.has(id)')],
  ['05 · Launch counts are integer-bounded before import', pass.includes('Number.isSafeInteger(count)') && pass.includes('count <= 100000')],
  ['06 · Invalid calendar dates are rejected', pass.includes('new Date(n).toISOString().slice(0, 10) === key')],
  ['07 · Active history uses UTC date keys', pass.includes("toISOString().slice(0, 10)") && pass.includes('utcDateKey()')],
  ['08 · Active-day history has a fixed upper bound', pass.includes('PASS_MAX_DAYS = 366') && pass.includes('.slice(-PASS_MAX_DAYS)')],
  ['09 · Streak handles the current or previous UTC day only', pass.includes('const start = set.has(today) ? today : today - 1')],
  ['10 · Daily route is deterministic from UTC date and the catalogue', pass.includes('function gameForUtcDay') && pass.includes('list[stable % list.length]')],
  ['11 · Daily-route picker does not use random numbers', !/function gameForUtcDay[\\s\\S]{0,400}Math\\.random/.test(pass)],
  ['12 · Storage-blocked fallback remains functional in memory', pass.includes('passMemoryFallback') && pass.includes('local storage may be blocked')],
  ['13 · Save results expose storage failure rather than hiding it', pass.includes('status.textContent = saved ?') && pass.includes('памяти этой вкладки')],
  ['14 · Passport is inserted into the actual Entertainment page', pass.includes("document.querySelector('#world-catalog')") && pass.includes("catalog.insertAdjacentElement('beforebegin', section)")],
  ['15 · Passport section has a labelled accessible heading', pass.includes("section.setAttribute('aria-labelledby', 'play-pass-title')")],
  ['16 · Total attempts and unique worlds are separate metrics', pass.includes('function passLaunchCount()') && pass.includes('function passUniqueCount()')],
  ['17 · Local progress communicates its limited meaning', pass.includes('Попыток запуска') && pass.includes('Запуск не равен прохождению уровня.')],
  ['18 · Progress bar exposes its role and numeric value', pass.includes('role=\"progressbar\"') && pass.includes("setAttribute('aria-valuenow'")],
  ['19 · Status messages are screen-reader live regions', pass.includes('aria-live=\"polite\"') && pass.includes('id=\"pass-status\"')],
  ['20 · Earned badges are derived from validated local metrics', pass.includes('function passBadgeList()') && pass.includes("id: 'all-worlds'")],
  ['21 · Curator badge reads the shared Games Hub favorites key', pass.includes('const favoriteCount = favorites.size') && js.includes("FAVORITES_KEY = 'osgard.games.favorites.v1'")],
  ['22 · Three-day streak badge uses active launch days', pass.includes("id: 'streak-3'") && pass.includes('streak >= 3')],
  ['23 · Launch tracking listens only to known launch links', pass.includes("querySelectorAll('[data-launch]')") && pass.includes('recordPassLaunch(link.dataset.launch)') && pass.includes('function gameIdForPassLink(link)') && pass.includes("querySelectorAll('.hero-actions a.button-primary, #continue-link')")],
  ['24 · Route-of-day CTA resolves to a real catalogue launch element', pass.includes("document.querySelector('[data-launch=\"' + id + '\"]')")],
  ['25 · Daily route stores an opened route, not a completion', pass.includes('dailyRouteOpened[today] = id') && pass.includes('завершение уровня здесь не подтверждается')],
  ['26 · Sharing discloses local metrics and not a public leaderboard', pass.includes('не публичный рейтинг') && pass.includes('Факт публикации не проверяется')],
  ['27 · Passport share provides native and clipboard fallback', pass.includes('navigator.share') && pass.includes('copyText(message')],
  ['28 · JSON export carries product name and schema version', pass.includes("product: 'OSGARD PLAY PASS'") && pass.includes('schemaVersion: PASS_SCHEMA')],
  ['29 · Import limits file size and validates product/schema', pass.includes('file.size > 250000') && pass.includes("parsed.product !== 'OSGARD PLAY PASS'")],
  ['30 · Reset is confirmed and keeps game saves/favorites intact', pass.includes('window.confirm(') && pass.includes('Избранное и сохранения игр не изменены')],
];
assert.equal(passChecks.length, 30, 'The PLAY PASS regression matrix must keep thirty explicit guardrails');
for (const [label, passCheck] of passChecks) assert.ok(passCheck, label);
assert.ok(!pass.includes('fetch(') && !pass.includes('XMLHttpRequest'), 'Local passport data must not be uploaded to a server');

console.log('PASS OSGARD ENTERTAINMENT: ' + checks.length + '/30 product guardrails + JavaScript syntax + no remote asset CDN + PLAY PASS 30/30.');

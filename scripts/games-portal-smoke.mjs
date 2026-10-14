import { assessReport } from './games-lighthouse-report.mjs'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { resolve } from 'node:path'
const entertainmentAlias = readFileSync(resolve('public/entertainment/index.html'),'utf8')
const rootIndex = readFileSync(resolve('index.html'),'utf8')
const mainSource = readFileSync(resolve('src/main.tsx'),'utf8')
const sectionSource = readFileSync(resolve('src/Sections.tsx'),'utf8')
const entertainmentCatalogSource = readFileSync(resolve('src/EntertainmentCatalog.tsx'),'utf8')
const appSource = readFileSync(resolve('src/App.tsx'),'utf8')
const playSelectSource = readFileSync(resolve('src/PlaySelectLoop.tsx'),'utf8')
const appStyles = readFileSync(resolve('src/styles.css'),'utf8')
const root=resolve('public/games')
execFileSync(process.execPath,[resolve('scripts/generate-games-share-cards.mjs')],{stdio:'ignore'})
const shareCardGenerator=readFileSync(resolve('scripts/generate-games-share-cards.mjs'),'utf8')
assert.ok(shareCardGenerator.includes("id: 'afterimage-run'")&&shareCardGenerator.includes("order: '10 / 11'")&&shareCardGenerator.includes("id: 'aether-grid'")&&shareCardGenerator.includes("order: '11 / 11'")&&shareCardGenerator.includes('11 WORLDS / ONE HUB'),'Share-card/invitation generator must include all eleven game worlds')
const html=readFileSync(resolve(root,'index.html'),'utf8')
const cascadePassport=readFileSync(resolve(root,'cascade-lab/case-passport.js'),'utf8')
const cascadeXray=readFileSync(resolve(root,'cascade-lab/trajectory-xray.js'),'utf8')
const cascadeDirector=readFileSync(resolve(root,'cascade-lab/mission-director.js'),'utf8')
const catalogCards=[...html.matchAll(/<article\b[^>]*\bdata-game="([^"]+)"[^>]*\bdata-genres="([^"]+)"[^>]*>/g)].map(match=>({id:match[1],genres:match[2].trim().split(/\s+/).filter(Boolean)}))
const deployWorkflow=readFileSync(resolve('.github/workflows/deploy-frontend.yml'),'utf8')
const readinessWorkflow=readFileSync(resolve('.github/workflows/release-readiness.yml'),'utf8')
const routeMatrix=readFileSync(resolve('scripts/production-route-matrix.mjs'),'utf8')
assert.ok(routeMatrix.includes("route === '/games/invite/invite-landing.js'") && routeMatrix.includes("name: 'referral_link_opened'") && routeMatrix.includes("osgard.games.referral-attribution.v1"),'Production route matrix must validate invite JavaScript using its own referral-event contract, not the unrelated SkillCred contract')
assert.ok(routeMatrix.includes('const ROUTE_TIMEOUT_MS = 10000') && routeMatrix.includes('const GODOT_ROUTE_TIMEOUT_MS = 20000') && routeMatrix.includes("route === '/games/null-shift-godot/' ? GODOT_ROUTE_TIMEOUT_MS : ROUTE_TIMEOUT_MS") && routeMatrix.includes('signal: AbortSignal.timeout(timeoutMs)'),'Production routes must have bounded timeouts and a bounded allowance for the Godot directory route')
assert.ok(routeMatrix.includes('CASCADE LAB — Premium Physics Lab 0.25.0') && routeMatrix.includes('0.25.0-evidence-integrity') && routeMatrix.includes("'/games/cascade-lab/trajectory-xray.js'") && routeMatrix.includes("'/games/cascade-lab/case-passport.js'") && routeMatrix.includes("'/games/cascade-lab/mission-director.js'") && routeMatrix.includes("'/games/cascade-lab/evidence-integrity.js'") && routeMatrix.includes('data-cascade-lab-director="0.24.0"') && routeMatrix.includes('data-cascade-lab-upgrades="0.14.0"') && routeMatrix.includes('CASCADELAB014') && routeMatrix.includes('data-cascade-lab-ledger="0.15.0"') && routeMatrix.includes('CASCADELAB015') && routeMatrix.includes('id="CASCADELAB017"') && routeMatrix.includes('data-cascade-lab-delta="0.17.0"') && routeMatrix.includes('id="CASCADELAB018"') && routeMatrix.includes('id="CASCADELAB019"') && routeMatrix.includes('data-cascade-lab-engineering="0.19.0"') && routeMatrix.includes('id="CASCADELAB020"') && routeMatrix.includes('data-cascade-lab-studio="0.20.0"') && routeMatrix.includes('id="CASCADELAB021"') && routeMatrix.includes('data-cascade-lab-passport="0.21.0"') && routeMatrix.includes('id="CASCADELAB025"') && routeMatrix.includes('data-cascade-lab-evidence="0.25.0"') && (routeMatrix.includes("SCHEMA = 'osgard.cascade-lab.evidence-integrity.v1'") || (routeMatrix.includes("SCHEMA\\s*=") && routeMatrix.includes("osgard\\.cascade-lab\\.evidence-integrity\\.v1"))), 'Production route matrix must validate CASCADE LAB 0.25.0 while retaining historical upgrade layers and the new evidence asset');
assert.ok(routeMatrix.includes('content="1.2.0-challenge-protocol-forge"') && routeMatrix.includes("['standard','no-hints','no-undo','iron-circuit']") && routeMatrix.includes('protocol-select'), 'Production route matrix must validate AETHER GRID 1.2 challenge protocols')
assert.ok(['/games/swarm/','/games/swarm/index.html','/games/inherit/','/games/inherit/index.html','/games/remix/','/games/remix/index.html'].every(route => routeMatrix.includes("'"+route+"'")), 'Production route matrix must cover the direct static entry and index URLs for SWARM, INHERIT and REMIX');
assert.ok(routeMatrix.includes("route.startsWith('/games/swarm/') ? ['/games/swarm/styles.css', '/games/swarm/game.js']") && routeMatrix.includes("text.includes('<title>SWARM — One Body. Eight Minds.</title>')") && routeMatrix.includes("text.includes('<title>INHERIT — The Quiet Reach</title>')") && routeMatrix.includes("text.includes('<title>REMIX — OSGARD WORLD GAMING</title>')"), 'Direct game routes must verify branded page identity plus SWARM JavaScript/CSS resources');
assert.ok(routeMatrix.includes('id="CASCADELAB021"') && routeMatrix.includes('data-cascade-lab-passport="0.21.0"') && cascadePassport.includes("const VERSION='0.21.0'") && cascadePassport.includes('function verifyPassport('), 'Production route contract must validate the CASCADE LAB passport 0.21')
assert.ok(!cascadePassport.includes('fetch(') && !cascadePassport.includes('XMLHttpRequest') && !cascadePassport.includes('sendBeacon') && !cascadePassport.includes('.innerHTML'), 'Passport must not upload local data or inject HTML')
new Function(cascadePassport)
const launchMapStart=html.indexOf('games={')
const launchMapEnd=html.indexOf('},read=',launchMapStart)
assert.ok(launchMapStart>=0&&launchMapEnd>launchMapStart,'Games launch registry is missing or malformed')
const launchMap=html.slice(launchMapStart,launchMapEnd)
const routeEntries=[...launchMap.matchAll(/(?:'([^']+)'|([a-z][a-z-]*)):\{title:'([^']+)',url:'([^']+)'\}/g)].map(m=>({id:m[1]||m[2],title:m[3],url:m[4]}))
const expectedLaunchIds=['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid'].sort()
assert.equal(routeEntries.length,11,'Launch registry must contain exactly eleven game entries')
assert.deepEqual(routeEntries.map(x=>x.id).sort(),expectedLaunchIds,'Every visible game must have exactly one unique launch route')
assert.ok(entertainmentCatalogSource.includes("['10', 'afterimage-run', 'AR', 'AFTERIMAGE//RUN'") && entertainmentCatalogSource.includes("['11', 'aether-grid', 'AG', 'AETHER GRID'") && entertainmentCatalogSource.includes("'/games/aether-grid/'") && entertainmentCatalogSource.includes('Eleven independent games'), 'React EntertainmentCatalog must show AETHER GRID and accurately label eleven games')
assert.ok(entertainmentCatalogSource.includes('DAILY SCI-FI SPEEDRUN · v1.7.0') && sectionSource.includes('ЕЖЕДНЕВНЫЙ SCI-FI SPEEDRUN · v1.7.0'), 'Both React and fallback Entertainment pages must visibly advertise AFTERIMAGE v1.7.0')
assert.ok(sectionSource.includes("title: 'AFTERIMAGE//RUN'") && sectionSource.includes("href: '/games/afterimage-run/'") && sectionSource.includes("title: 'CASCADE LAB'") && sectionSource.includes("title: 'AETHER GRID'") && sectionSource.includes("href: '/games/aether-grid/'"), 'The fallback Entertainment page must expose AETHER GRID and the other latest games')
assert.ok(appStyles.includes('.premium-game-card--afterimage-run'), 'The React EntertainmentCatalog must provide a dedicated AFTERIMAGE RUN visual theme')
assert.ok(routeEntries.every(x=>x.url.startsWith('/games/')),'Every launch entry must use a same-origin game route')
const inviteLandingScript=readFileSync(resolve(root,'invite/invite-landing.js'),'utf8')
assert.ok(inviteLandingScript.includes("localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'") && inviteLandingScript.includes("name: 'referral_link_opened'") && inviteLandingScript.includes("source: 'referral-link:' + code"),'Invite preview must preserve consent-gated referral attribution')
const productionMatrix = readFileSync(resolve('scripts/production-route-matrix.mjs'),'utf8')
assert.ok(productionMatrix.includes("path === '/games/invite/invite-landing.js'") && productionMatrix.includes("target.searchParams.set('utm_campaign', campaign)"), 'Production route matrix must validate the invitation script with its own content contract, not unrelated SkillCred markers')
for(const game of routeEntries){
 const invitePage=readFileSync(resolve(root,'invite',game.id,'index.html'),'utf8')
 const card=readFileSync(resolve(root,'share-cards',game.id+'.png'))
 assert.ok(invitePage.includes('<meta property="og:title" content="'+game.title+' — OSGARD PLAY">'),'Game-specific Open Graph title missing for '+game.id)
 assert.ok(invitePage.includes('property="og:image" content="https://osgard.world/games/share-cards/'+game.id+'.png"'),'Game-specific social card URL missing for '+game.id)
 assert.ok(invitePage.includes('name="twitter:card" content="summary_large_image"') && invitePage.includes('id="play-link"') && invitePage.includes('/games/invite/invite-landing.js'),'Invite page metadata, CTA or attribution bridge missing for '+game.id)
 assert.ok(card.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Share card must be a real PNG for '+game.id)
 assert.equal(card.readUInt32BE(16),1200,'Share card width must be 1200 for '+game.id)
 assert.equal(card.readUInt32BE(20),630,'Share card height must be 630 for '+game.id)
 assert.ok(card.length<300*1024,'Share card should stay below the messaging-preview size budget for '+game.id)
}
const catalogInvitePage=readFileSync(resolve(root,'invite/index.html'),'utf8')
const catalogInviteCard=readFileSync(resolve(root,'share-cards/catalog.png'))
assert.ok(catalogInvitePage.includes('property="og:title" content="OSGARD PLAY — OSGARD PLAY"') && catalogInvitePage.includes('id="play-link"'),'Generic catalogue invitation page missing')
assert.ok(catalogInviteCard.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Generic catalogue share card must be a PNG')

const lifecycle=readFileSync(resolve(root,'player-lifecycle.js'),'utf8')
const consentedAnalytics=readFileSync(resolve(root,'consented-analytics.js'),'utf8')
const sponsoredCampaigns=readFileSync(resolve(root,'sponsored-campaigns.js'),'utf8')
const commerceClient=readFileSync(resolve(root,'commerce-client.js'),'utf8')
const commerceConfig=JSON.parse(readFileSync(resolve(root,'commerce-config.json'),'utf8'))
const recommendationScript=readFileSync(resolve(root,'game-session-recommendations.js'),'utf8')
const recommendationStyles=readFileSync(resolve(root,'game-session-recommendations.css'),'utf8')
const dailyCircuitScript=readFileSync(resolve(root,'daily-circuit.js'),'utf8')
const dailyCircuitStyles=readFileSync(resolve(root,'daily-circuit.css'),'utf8')
const inheritSafeForSmoke=readFileSync(resolve(root,'inherit/index.html'),'utf8')
const nullShiftForSmoke=readFileSync(resolve(root,'null-shift/game.js'),'utf8')
const swarmForSmoke=readFileSync(resolve(root,'swarm/game.js'),'utf8')
const remixForSmoke=readFileSync(resolve(root,'remix/index.html'),'utf8')
const timeForSmoke=readFileSync(resolve('src/TimePrototype.tsx'),'utf8')
const luxury=readFileSync(resolve(root,'luxury.js'),'utf8')

assert.ok(!html.includes('href="./daily-circuit.css?v=__OSGARD_BUILD_VERSION__"')&&!html.includes('<script src="./daily-circuit.js?v=__OSGARD_BUILD_VERSION__"'),'Daily Circuit assets must not block the initial catalogue render')
assert.ok(html.includes('id="daily-circuit-slot"')&&html.includes('id="daily-circuit-lazy-loader"')&&html.includes('/games/daily-circuit.css?v=__OSGARD_BUILD_VERSION__')&&html.includes('/games/daily-circuit.js?v=__OSGARD_BUILD_VERSION__')&&html.includes("rootMargin: '180px 0px'")&&html.includes('data-load-daily-circuit'),'Daily Circuit must keep a visible manual CTA and lazily load versioned assets near the section')
const dailyCircuitLazyLoaderMatch=html.match(/<script id="daily-circuit-lazy-loader">([\s\S]*?)<\/script>/)
assert.ok(dailyCircuitLazyLoaderMatch,'Daily Circuit lazy loader is missing')
new Function(dailyCircuitLazyLoaderMatch[1])
{
 const loadedDailyAssets=[]
 let dailyObserverCallback=null
 const dailyButton={disabled:false,textContent:'Открыть',closest(selector){return selector==='[data-load-daily-circuit]'?this:null}}
 const dailyStatus={textContent:''}
 const dailySlot={isConnected:true,dataset:{},setAttribute(){},querySelector(selector){return selector==='[data-load-daily-circuit]'?dailyButton:selector==='#daily-circuit-load-status'?dailyStatus:null}}
 const dailyHead={append(node){loadedDailyAssets.push(node)}}
 const dailyListeners={}
 class DailyCircuitObserver{
  constructor(callback,options){dailyObserverCallback=callback;this.options=options}
  observe(target){this.target=target}
  disconnect(){this.disconnected=true}
 }
 const dailyDocument={
  head:dailyHead,
  getElementById(id){return id==='daily-circuit-slot'?dailySlot:null},
  querySelector(selector){return selector==='link[data-daily-circuit-style]'?loadedDailyAssets.find(node=>node.tagName==='LINK'&&node.dataset.dailyCircuitStyle==='true')||null:null},
  createElement(tag){return{tagName:tag.toUpperCase(),dataset:{},remove(){this.removed=true}}},
  addEventListener(type,handler){dailyListeners[type]=handler}
 }
 runInNewContext(dailyCircuitLazyLoaderMatch[1],{document:dailyDocument,window:{IntersectionObserver:DailyCircuitObserver},IntersectionObserver:DailyCircuitObserver})
 assert.equal(loadedDailyAssets.length,0,'Daily Circuit CSS and JS must not download before its section approaches the viewport')
 assert.equal(typeof dailyObserverCallback,'function','Daily Circuit must observe its reserved slot')
 dailyObserverCallback([{isIntersecting:true}])
 assert.equal(loadedDailyAssets[0]?.tagName,'LINK','The Daily Circuit stylesheet should load before the script')
 assert.ok(loadedDailyAssets[0].href.includes('/games/daily-circuit.css?v=__OSGARD_BUILD_VERSION__'),'Daily Circuit CSS must use the release marker')
 loadedDailyAssets[0].onload()
 assert.equal(loadedDailyAssets[1]?.tagName,'SCRIPT','Daily Circuit JS should start after stylesheet resolution')
 assert.ok(loadedDailyAssets[1].src.includes('/games/daily-circuit.js?v=__OSGARD_BUILD_VERSION__'),'Daily Circuit JS must use the release marker')
 loadedDailyAssets[1].onload()
 assert.equal(dailySlot.dataset.loaded,'true','Lazy loader must record that the daily engine loaded')
}
assert.ok(dailyCircuitScript.includes("const mount=doc.querySelector('#daily-circuit-slot')")&&dailyCircuitScript.includes('if(mount)mount.replaceWith(section)'),'Daily Circuit must mount into its reserved lazy slot without inserting unexpected content at the hero')
assert.ok(dailyCircuitStyles.includes('.daily-circuit-grid')&&dailyCircuitStyles.includes('@media(max-width:760px)')&&dailyCircuitStyles.includes('prefers-reduced-motion:reduce'),'Daily Circuit must be responsive and respect reduced motion')
assert.ok(dailyCircuitScript.includes('OSGARDDailyCircuitCore')&&dailyCircuitScript.includes('navigator.share')&&dailyCircuitScript.includes('navigator.clipboard.writeText'),'Daily Circuit must expose deterministic routes and share/copy fallback')
assert.ok(!dailyCircuitScript.includes('fetch(')&&!dailyCircuitScript.includes('googletagmanager')&&!dailyCircuitScript.includes('doubleclick.net'),'Daily Circuit must not add ad SDKs or unapproved network calls')
assert.ok(html.includes('window.OSGARDGames=Object.freeze')&&html.includes('window.OSGARDDailyTrackShare=')&&html.includes("source:'daily_circuit'"),'Daily Circuit must use the existing player and consent/token analytics bridge')
new Function(dailyCircuitScript)
const dailyCircuitSandbox={window:{},URL,URLSearchParams,Date,Math,Uint8Array}
runInNewContext(dailyCircuitScript,dailyCircuitSandbox)
const dailyCircuitCore=dailyCircuitSandbox.window.OSGARDDailyCircuitCore
assert.ok(dailyCircuitCore,'Daily Circuit pure routing core must be available')
const fixedDailyCircuitDate='2026-10-13'
const signalDailyCircuitUrl=new URL(dailyCircuitCore.routeFor('signal-run',fixedDailyCircuitDate,'https://osgard.world').href,'https://osgard.world')
const nullDailyCircuitShare=new URL(dailyCircuitCore.shareUrl('null-shift',fixedDailyCircuitDate,'0123456789ab','https://osgard.world'))
assert.equal(signalDailyCircuitUrl.pathname,'/games/signal-run/')
assert.equal(signalDailyCircuitUrl.searchParams.get('mode'),'daily')
assert.equal(signalDailyCircuitUrl.searchParams.get('day'),fixedDailyCircuitDate)
assert.equal(signalDailyCircuitUrl.searchParams.get('utm_content'),'daily_circuit')
assert.equal(nullDailyCircuitShare.pathname,'/games/invite/null-shift/')
assert.equal(nullDailyCircuitShare.searchParams.get('og_challenge'),'NS-20261013-C3','NULL//SHIFT daily code must match the UTC Godot contract selector')
assert.equal(nullDailyCircuitShare.searchParams.get('og_ref'),'og_01234567')
assert.equal(nullDailyCircuitShare.searchParams.get('og_game'),'null-shift')
assert.equal(nullDailyCircuitShare.searchParams.get('og_day'),fixedDailyCircuitDate)
assert.equal(nullDailyCircuitShare.searchParams.get('utm_campaign'),'play_with_friends')
const aetherDailyRoute=new URL(dailyCircuitCore.routeFor('aether-grid',fixedDailyCircuitDate,'https://osgard.world').href,'https://osgard.world')
const aetherDailyInvite=new URL(dailyCircuitCore.shareUrl('aether-grid',fixedDailyCircuitDate,'0123456789ab','https://osgard.world'))
assert.equal(aetherDailyRoute.pathname,'/games/aether-grid/')
assert.equal(aetherDailyRoute.searchParams.get('day'),fixedDailyCircuitDate)
assert.equal(aetherDailyRoute.searchParams.get('utm_campaign'),'daily_puzzle')
assert.equal(dailyCircuitCore.routeFor('aether-grid',fixedDailyCircuitDate,'https://osgard.world').challengeCode,'AG-20261013-DAILY')
assert.equal(aetherDailyInvite.pathname,'/games/invite/aether-grid/')
assert.equal(aetherDailyInvite.searchParams.get('og_ref'),'og_01234567')
assert.equal(aetherDailyInvite.searchParams.get('og_game'),'aether-grid')
assert.equal(aetherDailyInvite.searchParams.get('og_day'),fixedDailyCircuitDate)
assert.equal(aetherDailyInvite.searchParams.get('utm_campaign'),'play_with_friends')
const fullCircuitFallback=new URL(dailyCircuitCore.circuitShareUrl(fixedDailyCircuitDate,'0123456789ab','https://osgard.world'))
assert.equal(fullCircuitFallback.pathname,'/games/')
assert.equal(fullCircuitFallback.searchParams.get('og_daily_circuit'),fixedDailyCircuitDate)
assert.equal(fullCircuitFallback.searchParams.get('og_ref'),'og_01234567')
assert.equal(fullCircuitFallback.searchParams.get('utm_source'),'osgard_play')
assert.equal(fullCircuitFallback.searchParams.get('utm_medium'),'referral')
assert.equal(fullCircuitFallback.searchParams.get('utm_campaign'),'play_with_friends')
assert.equal(fullCircuitFallback.searchParams.get('utm_content'),'catalog')
dailyCircuitSandbox.window.OSGARDInvite={createLink:()=> 'https://osgard.world/games/invite/?og_ref=og_a1b2c3d4&utm_source=osgard_play&utm_medium=referral&utm_campaign=play_with_friends&utm_content=catalog'}
const fullCircuitWithOwnerCode=new URL(dailyCircuitCore.circuitShareUrl(fixedDailyCircuitDate,'0123456789ab','https://osgard.world'))
assert.equal(fullCircuitWithOwnerCode.searchParams.get('og_ref'),'og_a1b2c3d4','Full circuit invitations should reuse the portal-owned referral code')
assert.equal(fullCircuitWithOwnerCode.searchParams.get('og_daily_circuit'),fixedDailyCircuitDate)
delete dailyCircuitSandbox.window.OSGARDInvite
const emptyDailyCircuitProgress=dailyCircuitCore.circuitProgressSummary(fixedDailyCircuitDate,null)
assert.equal(emptyDailyCircuitProgress.count,0)
assert.equal(emptyDailyCircuitProgress.complete,false)
const partialDailyCircuitProgress=dailyCircuitCore.circuitProgressSummary(fixedDailyCircuitDate,{date:fixedDailyCircuitDate,completedGames:['aether-grid','aether-grid','unknown']})
assert.equal(partialDailyCircuitProgress.count,1,'Duplicate completion messages must not inflate daily progress')
assert.equal(partialDailyCircuitProgress.completedGames.join(','),'aether-grid')
const completeDailyCircuitProgress=dailyCircuitCore.circuitProgressSummary(fixedDailyCircuitDate,{date:fixedDailyCircuitDate,completedGames:['signal-run','null-shift','aether-grid','unknown']})
assert.equal(completeDailyCircuitProgress.count,3)
assert.equal(completeDailyCircuitProgress.complete,true)
assert.equal(dailyCircuitCore.circuitProgressSummary('2026-10-14',{date:fixedDailyCircuitDate,completedGames:['signal-run']}).count,0,'Progress from a different date must not carry over')
const firstCircuitStreak=dailyCircuitCore.advanceCircuitStreak('2026-10-13',null)
assert.deepEqual({...firstCircuitStreak},{count:1,lastDate:'2026-10-13',best:1},'First full circle starts a local one-day streak')
const nextCircuitStreak=dailyCircuitCore.advanceCircuitStreak('2026-10-14',firstCircuitStreak)
assert.deepEqual({...nextCircuitStreak},{count:2,lastDate:'2026-10-14',best:2},'Consecutive full circuits increase the streak and best record')
assert.deepEqual({...dailyCircuitCore.advanceCircuitStreak('2026-10-14',nextCircuitStreak)},{...nextCircuitStreak},'Repeated completion events cannot award the same day twice')
const missedCircuitStreak=dailyCircuitCore.advanceCircuitStreak('2026-10-16',nextCircuitStreak)
assert.deepEqual({...missedCircuitStreak},{count:1,lastDate:'2026-10-16',best:2},'A missed UTC day resets the active streak but keeps the best record')
assert.equal(dailyCircuitCore.circuitStreakSummary('2026-10-14',nextCircuitStreak).activeCount,2)
assert.equal(dailyCircuitCore.circuitStreakSummary('2026-10-16',nextCircuitStreak).activeCount,0)
assert.throws(()=>dailyCircuitCore.advanceCircuitStreak('2026-02-30',nextCircuitStreak),/valid UTC calendar date/i)
assert.equal(dailyCircuitCore.shareUrl('signal-run',fixedDailyCircuitDate,'0123456789ab','https://osgard.world').includes('/games/invite/signal-run/'),true)
assert.equal(dailyCircuitCore.shareUrl('null-shift',fixedDailyCircuitDate,'0123456789ab','https://osgard.world').includes('/games/invite/null-shift/'),true)
assert.throws(()=>dailyCircuitCore.challengeCode('2026-02-30'),/valid UTC calendar date/i)
assert.throws(()=>dailyCircuitCore.routeFor('unknown',fixedDailyCircuitDate,'https://osgard.world'),/Unsupported daily route/i)
assert.ok(dailyCircuitScript.includes('const existingDailyShareTracker=typeof root.OSGARDDailyTrackShare')&&dailyCircuitScript.includes("existingDailyShareTracker(id,{...metadata,source:'daily_circuit'})")&&!dailyCircuitScript.includes('fetch('),'Daily Circuit must use the existing consented portal share-analytics bridge without adding direct API calls')
assert.ok(dailyCircuitStyles.includes('repeat(3,minmax(0,1fr))')&&dailyCircuitStyles.includes('.daily-circuit-aether-grid')&&dailyCircuitStyles.includes('@media(max-width:1040px)'),'Three daily challenges must have a distinct, responsive AETHER GRID presentation')
assert.ok(dailyCircuitScript.includes("get('og_daily_circuit')")&&dailyCircuitScript.includes('function circuitShareUrl(')&&dailyCircuitScript.includes('daily-circuit-share-all'),'Full circuit links must preserve a single UTC date and expose a share control')
assert.ok(dailyCircuitScript.includes('function circuitProgressSummary(day,raw)')&&dailyCircuitScript.includes("function saveCircuitCompletion(day,gameId)")&&dailyCircuitScript.includes("function handleDailyCircuitCompletion(event,day,section,value,fill,bar,status,streakValue)"),'Daily Circuit must validate, store and render unique per-game completion progress')
assert.ok(dailyCircuitScript.includes("CIRCUIT_PROGRESS_KEY='osgard.games.daily-circuit-progress.v1'")&&dailyCircuitScript.includes("CIRCUIT_STREAK_KEY='osgard.games.daily-circuit-streak.v1'")&&dailyCircuitScript.includes("doc.addEventListener('osgard:game-completed'"),'Daily completion progress and streak should persist locally and react to actual game completion events')
assert.ok(dailyCircuitScript.includes('function circuitStreakSummary(day,raw)')&&dailyCircuitScript.includes('function advanceCircuitStreak(day,raw)')&&dailyCircuitScript.includes("day===today&&saved.lastDate!==today"),'Daily streaks should be unique per UTC day and only advance for the current-day full circuit')
assert.ok(dailyCircuitScript.includes('root.OSGARDDailyTrackShare?.')&&!dailyCircuitScript.includes('fetch('),'Full circuit share must use the existing consent-gated analytics bridge only')
assert.ok(dailyCircuitStyles.includes('.daily-circuit-full-share')&&dailyCircuitStyles.includes('.daily-circuit-share-all:focus-visible')&&dailyCircuitStyles.includes('@media(max-width:1040px)'),'Full-circuit share panel must be responsive and keyboard accessible')
assert.ok(dailyCircuitStyles.includes('.daily-circuit-progress-track')&&dailyCircuitStyles.includes('.daily-circuit-card.is-complete')&&dailyCircuitStyles.includes('.daily-circuit-complete'),'Daily circuit completion needs a visible progress bar and per-game badge')
assert.ok(dailyCircuitStyles.includes('.daily-circuit-streak{')&&!dailyCircuitStyles.includes('}..daily-circuit-full-share{'),'Streak indicator must be styled and the share panel selector must remain valid')
assert.ok(dailyCircuitScript.includes("fullShare.setAttribute('aria-labelledby','daily-circuit-full-share-title')")&&dailyCircuitScript.includes("fullShareTitle.id='daily-circuit-full-share-title'"),'Full-circuit share panel must expose its heading to assistive technology')
assert.ok(inviteLandingScript.includes("['aether-grid','signal-run','null-shift'].includes(game) && validAetherDay")&&inviteLandingScript.includes("params.get('og_challenge') === expectedChallenge"),'Canonical daily invitations must preserve validated date and contract state')
assert.ok(lifecycle.includes('function preserveDailyChallengeUrl')&&lifecycle.includes("if(id==='aether-grid')target.searchParams.set('day',day)")&&lifecycle.includes('dailyNullShiftCode(day)'),'Player launch must preserve validated challenge state from an invitation landing')
assert.ok(lifecycle.includes('function dailyChallengeContext(id,url)')&&lifecycle.includes("dailyChallengeContext(activeGame,activeUrl)"),'Only validated daily challenges may add a daily date to the completion event')
assert.throws(()=>dailyCircuitCore.shareUrl('signal-run',fixedDailyCircuitDate,'bad','https://osgard.world'),/12-character opaque invite code/i)
assert.ok(dailyCircuitScript.includes("osgard.signal-run.daily-streak.v1")&&dailyCircuitScript.includes("osgard.signal-run.daily-best."),'Daily Circuit streak must reuse the existing local SIGNAL RUN progress, not create competing state')
assert.ok(dailyCircuitStyles.includes('.daily-circuit-local-progress')&&dailyCircuitStyles.includes('.daily-circuit-local-title'),'Daily streak and best-score summary must be visible in the responsive challenge card')
const emptyProgress=dailyCircuitCore.progressSummary(null,0,fixedDailyCircuitDate)
assert.equal(emptyProgress.count,0,'A new player must start at zero completed daily streak')
assert.equal(emptyProgress.completedToday,false,'A new player must not be shown as having completed today')
assert.equal(emptyProgress.status,'СЕРИЯ НАЧНЁТСЯ ПОСЛЕ ПЕРВОГО ЗАВЕРШЁННОГО ЗАБЕГА')
const continueProgress=dailyCircuitCore.progressSummary({lastDate:'2026-10-12',count:3},420,fixedDailyCircuitDate)
assert.equal(continueProgress.count,3)
assert.equal(continueProgress.best,420)
assert.equal(continueProgress.continues,true,'A streak from yesterday should be marked as recoverable today')
assert.equal(continueProgress.status,'СЕРИЯ 3 ДН. · СОХРАНИ ЕЁ СЕГОДНЯ')
const completedProgress=dailyCircuitCore.progressSummary({lastDate:fixedDailyCircuitDate,count:4},520,fixedDailyCircuitDate)
assert.equal(completedProgress.completedToday,true,'A completed current UTC date should be recognized')
assert.equal(completedProgress.best,520,'The local daily high score should display as an integer')
const lapsedProgress=dailyCircuitCore.progressSummary({lastDate:'2026-10-09',count:7},0,fixedDailyCircuitDate)
assert.equal(lapsedProgress.completedToday,false)
assert.equal(lapsedProgress.continues,false,'A lapsed streak must not be represented as uninterrupted')
assert.equal(lapsedProgress.status,'ПРЕДЫДУЩАЯ СЕРИЯ · 7 ДН. — НАЧНИ НОВУЮ')
assert.throws(()=>dailyCircuitCore.progressSummary(null,0,'2026-02-30'),/valid UTC calendar date/i)
console.log('PASS DAILY CIRCUIT deterministic routes, local daily streak, best score, consent boundaries, responsive styling and no-ad-network guard')


const nginx=readFileSync(resolve('nginx.conf'),'utf8')
const admin=readFileSync(resolve(root,'admin/index.html'),'utf8')
const partnerEditor=readFileSync(resolve(root,'admin/partners/index.html'),'utf8')
const partnerLanding=readFileSync(resolve(root,'partners/index.html'),'utf8')
assert.ok(dailyCircuitScript.includes("format:'Спонсорское событие или уровень'")&&partnerLanding.includes('<option>Спонсорское событие или уровень</option>'),'Daily Circuit sponsor CTA must preselect a real supported Partner Studio format')
const civic=readFileSync(resolve(root,'civic-cascade/index.html'),'utf8')
const cascadeGame=readFileSync(resolve(root,'cascade-lab/index.html'),'utf8')
const cascadeDelta=readFileSync(resolve(root,'cascade-lab/delta-lens.js'),'utf8')
const cascadeHypothesis=readFileSync(resolve(root,'cascade-lab/hypothesis-lab.js'),'utf8')
const cascadeEngineering=readFileSync(resolve(root,'cascade-lab/engineering-suite.js'),'utf8')
const afterimageGame=readFileSync(resolve(root,'afterimage-run/index.html'),'utf8')
const aetherGame=readFileSync(resolve(root,'aether-grid/index.html'),'utf8')
assert.ok(afterimageGame.includes('<title>AFTERIMAGE//RUN — OSGARD PLAY</title>')&&afterimageGame.includes('<meta name="osgard-game-version" content="1.7.0">')&&afterimageGame.includes('id="runnerCanvas"')&&afterimageGame.includes('id="run-start"')&&afterimageGame.includes('id="daily-seed"')&&afterimageGame.includes('id="share-telegram"')&&afterimageGame.includes('id="record-progress"'),'AFTERIMAGE//RUN v1.7.0 interactive/share contract missing')
assert.ok(['id="fullscreen-btn"','id="sound-toggle"','id="haptic-toggle"','id="focus-mode"','id="contrast-toggle"','id="claim-share-reward"','id="run-report"'].every(id=>afterimageGame.includes(id)),'AFTERIMAGE v1.7.0 settings, explicit share-claim and diagnostics are required')
assert.ok(afterimageGame.includes('jumpBuffer')&&afterimageGame.includes('devicePixelRatio')&&afterimageGame.includes('1000/24')&&afterimageGame.includes('AUTO-PAUSED / TAB HIDDEN'),'AFTERIMAGE v1.7.0 touch input, HiDPI and background reliability contract missing')
assert.ok(!/<script[^>]+src=/i.test(afterimageGame)&&!/<link[^>]+href=["']https?:/i.test(afterimageGame),'AFTERIMAGE//RUN must remain self-contained')
assert.ok(afterimageGame.includes("extra||{}),location.origin)")&&!afterimageGame.includes("extra||{}),'*')"),'AFTERIMAGE lifecycle messages must stay same-origin')
assert.ok(afterimageGame.includes('incomingSeed=params.get(\'seed\')')&&afterimageGame.includes('Number.isSafeInteger(rawTarget)')&&afterimageGame.includes('rawTarget<=99999999')&&afterimageGame.includes('if(r[today])'),'AFTERIMAGE challenge/reward safety checks missing')
assert.ok(afterimageGame.includes("opened.opener=null")&&afterimageGame.includes("prepareShareReward('share-intent-'+kind)"),'Social share must detach opener and require a separate reward confirmation')
assert.ok(afterimageGame.includes('id="claim-share-reward"')&&afterimageGame.includes("rewardShare('player-confirmed:'+method)"),'AFTERIMAGE reward must require a separate player confirmation')
const afterimageShareStart=afterimageGame.indexOf('async function shareNative()')
const afterimageShareEnd=afterimageGame.indexOf("$('run-start').addEventListener",afterimageShareStart)
const afterimageShareFlow=afterimageGame.slice(afterimageShareStart,afterimageShareEnd)
assert.ok(afterimageShareStart>=0&&afterimageShareEnd>afterimageShareStart,'AFTERIMAGE share flow boundaries must remain independently testable')
assert.ok(!afterimageShareFlow.includes("rewardShare('web-share'")&&!afterimageShareFlow.includes("rewardShare('copy-link'")&&!afterimageShareFlow.includes("rewardShare('share-intent-"),'Opening a share sheet, opening a social composer, or copying a link must not award a shard immediately')
assert.ok(afterimageGame.includes("Копирование не даёт награду")&&afterimageGame.includes("rewardConfirmedByPlayer:true"),'Copying a link must not reward; analytics must mark a player-confirmed claim')
assert.ok(afterimageGame.includes("life('share_created',{shareMethod:confirmedMethod==='web-share'?'web-share':'social-share'")&&afterimageGame.includes('rewardConfirmedByPlayer:true')&&!afterimageGame.includes("life('shared'"),'Confirmed share must use the player-lifecycle bridge event accepted by the host')
assert.ok(afterimageGame.includes('id="share-facebook"')&&afterimageGame.includes("facebook:'https://www.facebook.com/sharer/sharer.php?u='"),'AFTERIMAGE share buttons must expose the configured Facebook share path')
assert.ok(afterimageGame.includes('SIGNAL SHARD')&&afterimageGame.includes('Публичная публикация поста не проверяется'),'Share reward copy must not claim that a public post was verified')
assert.ok(afterimageGame.includes("let shardCosmeticUnlocked=Object.values(safeRead(REWARD,{})).some(record=>record&&record.kind==='cosmetic')"),'Previously claimed SIGNAL SHARD cosmetics must persist across sessions')
assert.ok(afterimageGame.includes("shardCosmeticUnlocked=true")&&afterimageGame.includes("color:'#ffc86a'")&&afterimageGame.includes("shardCosmeticUnlocked?'#ffe6a8':'#7cecff'"),'Confirmed SIGNAL SHARD reward must unlock an actual in-game gold cosmetic')
const goldTrailStart=afterimageGame.indexOf('if(shardCosmeticUnlocked&&game.elapsed-(game.cosmeticTrailAt||0)>.06)')
const goldTrailEnd=afterimageGame.indexOf('game.speed=',goldTrailStart)
assert.ok(goldTrailStart>=0&&goldTrailEnd>goldTrailStart&&!afterimageGame.slice(goldTrailStart,goldTrailEnd).includes('random('),'Cosmetic trail must not consume gameplay randomness or alter obstacle generation')
const afterimageInline=[...afterimageGame.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim())
assert.equal(afterimageInline.length,1,'AFTERIMAGE should have one inline game script')
new Function(afterimageInline[0])
assert.ok(afterimageGame.includes('id="phase-splits"')&&afterimageGame.includes('id="split-current-title"')&&afterimageGame.includes('id="split-delta"')&&afterimageGame.includes('id="split-history"'),'AFTERIMAGE v1.7 checkpoint comparison interface missing')
assert.ok(afterimageGame.includes('while(game.distance>=game.nextSplitDistance&&game.nextSplitDistance<=SPLIT_DISTANCE*60')&&afterimageGame.includes('function renderSplitPanel()')&&afterimageGame.includes('function updateSplitProgress()'),'AFTERIMAGE checkpoints must be distance-based and show live progress')
assert.ok(afterimageGame.includes('elapsedBeforeTick+dt*fraction'),'Checkpoint times must interpolate to the actual distance crossing rather than use a later render-frame timestamp')
assert.ok(afterimageGame.includes('Object.assign({},daily,{splits:mergedSplits})')&&afterimageGame.includes('personalBestSplits:normalizeSplitRecords(daily.splits)')&&afterimageGame.includes('checkpointSplits:game.splits.map'),'Personal split records must persist independently and export into run diagnostics')
assert.ok(afterimageGame.includes('settings.focusMode?normalizeSplitRecords(daily.splits):mergeBestSplits(daily.splits,game.splits)'),'Practice mode must not overwrite ranked split records')
const splitHelperStart=afterimageGame.indexOf('function normalizeSplitRecords(')
const splitHelperEnd=afterimageGame.indexOf('function renderSplitPanel(',splitHelperStart)
assert.ok(splitHelperStart>=0&&splitHelperEnd>splitHelperStart,'Pure checkpoint-record helpers must be independently testable')
const splitHelpers=new Function('const SPLIT_DISTANCE=1000;'+afterimageGame.slice(splitHelperStart,splitHelperEnd)+';return {normalizeSplitRecords,mergeBestSplits};')()
assert.deepEqual(splitHelpers.normalizeSplitRecords([{distance:2000,time:24.236},{distance:1000,time:12.401},{distance:1000,time:11.997},{distance:1500,time:6},{distance:3000,time:-1},{distance:6000,time:86401},{distance:61000,time:500}]),[{distance:1000,time:11.997},{distance:2000,time:24.236}],'Split records must reject invalid distances/times and retain the best duplicate checkpoint time')
assert.deepEqual(splitHelpers.mergeBestSplits([{distance:1000,time:12},{distance:2000,time:25},{distance:3000,time:38}],[{distance:1000,time:11.5},{distance:2000,time:27},{distance:4000,time:47}]),[{distance:1000,time:11.5},{distance:2000,time:25},{distance:3000,time:38},{distance:4000,time:47}],'A faster sector must update only that checkpoint; slower existing personal bests remain intact')
assert.deepEqual(splitHelpers.mergeBestSplits(undefined,undefined),[],'Empty split history must remain empty')
assert.equal(splitHelpers.normalizeSplitRecords(Array.from({length:80},(_,i)=>({distance:(i+1)*1000,time:i+10}))).length,60,'Split storage must be capped at 60 checkpoints')

assert.ok(afterimageGame.includes("const RELEASE_VERSION='1.7.0'")&&afterimageGame.includes("const CAREER_KEY='osgard.afterimage.career.v1'")&&afterimageGame.includes("schema:'osgard.afterimage.run-report.v3'"),'AFTERIMAGE v1.6 release metadata and diagnostic schema missing')
assert.ok(['id="career-runs"','id="career-streak"','id="career-best"','id="career-distance"','id="career-shards"','id="career-dashes"','id="career-achievements"','id="career-history"'].every(id=>afterimageGame.includes(id)),'AFTERIMAGE career dashboard, achievements, and recent-run history missing')
assert.ok(afterimageGame.includes('function updateCareerStreak()')&&afterimageGame.includes('function recordRunStart()')&&afterimageGame.includes('function recordRunFinish(challengeBeaten)')&&afterimageGame.includes('career.recentRuns=career.recentRuns.slice(0,10)'),'AFTERIMAGE local profile metrics/streak/recent history must be persisted and bounded')
assert.ok(afterimageGame.includes("id:'first-run'")&&afterimageGame.includes("id:'challenge-breaker'")&&afterimageGame.includes("id:'ten-runs'"),'AFTERIMAGE achievement milestones missing')
assert.ok(afterimageGame.includes("type=random()<.12?'shield':'shard'")&&afterimageGame.includes('PHASE SHIELD ABSORBED · RUN CONTINUES')&&afterimageGame.includes('game.shieldCharges--'),'AFTERIMAGE phase shield pickup must be visual, limited to one charge, and consume a hit')
assert.ok(afterimageGame.includes('game.nearMisses++')&&afterimageGame.includes('game.bonusPoints+=75')&&afterimageGame.includes('near_miss_bonus'),'AFTERIMAGE close obstacle evasion must award a measurable near-miss bonus')
assert.ok(afterimageGame.includes('id="eco-mode"')&&afterimageGame.includes('settings.ecoMode')&&afterimageGame.includes('Math.min(settings.ecoMode?1.15:2.5')&&afterimageGame.includes('starLimit=settings.ecoMode?65:stars.length')&&afterimageGame.includes('for(let si=0,starLimit=settings.ecoMode?65:stars.length;si<starLimit;si++)')&&afterimageGame.includes('game.particles.length>320'),'AFTERIMAGE Eco graphics mode must reduce render scale/stars/effects and cap particles')
assert.ok(afterimageGame.includes('game.frameTimeTotal')&&afterimageGame.includes('game.frameTimeMax')&&afterimageGame.includes('game.slowFrames')&&afterimageGame.includes('slowFramesOver34ms'),'AFTERIMAGE exported diagnostics must include average/max frame timing and slow-frame count')
assert.ok(afterimageGame.includes("window.addEventListener('pagehide',()=>{if(audioContext&&audioContext.state!=='closed')audioContext.close().catch(()=>{})})"),'AFTERIMAGE must release Web Audio context on pagehide')

assert.ok(afterimageGame.includes('function resizeCanvas()')&&afterimageGame.includes('devicePixelRatio')&&afterimageGame.includes('Math.min(settings.ecoMode?1.15:2.5')&&afterimageGame.includes('ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0)')&&afterimageGame.includes('canvas.dataset.renderScale'),'AFTERIMAGE canvas must use capped HiDPI backing resolution and expose its render scale')
assert.ok(afterimageGame.includes("window.addEventListener('resize',()=>{resizeCanvas();draw()})"),'AFTERIMAGE must redraw crisply on viewport/DPR changes')
assert.ok(afterimageGame.includes('function stopIdle()')&&afterimageGame.includes('function scheduleIdle()')&&afterimageGame.includes('1000/24'),'AFTERIMAGE idle rendering should be throttled to 24 FPS')
assert.ok(afterimageGame.includes("document.addEventListener('visibilitychange'")&&afterimageGame.includes('AUTO-PAUSED / TAB HIDDEN')&&afterimageGame.includes("window.addEventListener('pagehide',stopIdle)"),'AFTERIMAGE must pause safely in hidden tabs and stop timers on pagehide')
assert.ok(!afterimageGame.includes('requestAnimationFrame(idle)'),'AFTERIMAGE must not keep an unbounded idle animation loop running')
assert.ok(afterimageGame.includes('tabindex="0"')&&afterimageGame.includes("target.closest('button,a,input,textarea,select,[contenteditable=\"true\"],[role=\"textbox\"]')"),'AFTERIMAGE canvas must be keyboard-focusable without hijacking focused controls')
assert.ok(afterimageGame.includes("if(!game.running||game.paused)return;if(e.pointerType==='touch')e.preventDefault()"),'AFTERIMAGE must preserve page touch scrolling when a run is not active')
const patina=readFileSync(resolve(root,'patina/index.html'),'utf8')
const signalRun=readFileSync(resolve(root,'signal-run/index.html'),'utf8')
const signalJs=readFileSync(resolve(root,'signal-run/game.js'),'utf8')
const signalDailyJs=readFileSync(resolve(root,'signal-run/daily.js'),'utf8')
const manifest=readFileSync(resolve('src/core/manifest.ts'),'utf8')
const sitemap=readFileSync(resolve('public/sitemap.xml'),'utf8')
const catalogIds=catalogCards.map(card=>card.id).sort()
assert.equal(new Set(catalogIds).size,catalogIds.length,'Catalog card IDs must be unique')
assert.deepEqual(catalogIds,routeEntries.map(entry=>entry.id).sort(),'Catalog card IDs must exactly match the player launch registry')
const validIdsMatch=luxury.match(/const validIds = new Set\(\[([^\]]+)\]\)/)
assert.ok(validIdsMatch,'History/resume validIds registry is missing')
const historyIds=[...validIdsMatch[1].matchAll(/'([^']+)'/g)].map(match=>match[1]).sort()
assert.deepEqual(historyIds,catalogIds,'Recent history, recent sorting and resume IDs must exactly match catalog cards')
const visibleFilters=new Set([...html.matchAll(/<button\b[^>]*data-filter="([^"]+)"/g)].map(match=>match[1]))
const cardGenres=[...new Set(catalogCards.flatMap(card=>card.genres))].sort()
assert.ok(cardGenres.every(genre=>visibleFilters.has(genre)),'Every card genre must have a visible catalog filter: '+cardGenres.filter(genre=>!visibleFilters.has(genre)).join(', '))
assert.ok(visibleFilters.has('arcade'),'The catalog must expose the Arcade genre filter')
const required=['data-game="null-shift"','data-game="time"','data-game="swarm"','data-game="inherit"','data-game="remix"','data-game="civic-cascade"','data-game="patina"','data-game="signal-run"','data-game="cascade-lab"','data-game="afterimage-run"','data-game="aether-grid"','id="games-grid"','id="game-search"','data-filter="tactical"','data-filter="arcade"','id="player-dialog"','id="player-share"','id="player-fullscreen"','id="analytics-toggle"','id="project-form"','https://wa.me/79640027222','osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio','href="/games/ecosystem/"','/games/favicon.svg','/privacy/','/terms/']
for(const item of required) assert.ok(html.includes(item),'Games hub missing: '+item)

const gameDocumentPages=[
  'public/entertainment/index.html',
  'public/games/admin/index.html',
  'public/games/admin/partners/index.html',
  'public/games/aether-grid/index.html',
  'public/games/afterimage-run/index.html',
  'public/games/cascade-lab/index.html',
  'public/games/civic-cascade/index.html',
  'public/games/commerce-admin/index.html',
  'public/games/ecosystem/index.html',
  'public/games/growth-studio/index.html',
  'public/games/index.html',
  'public/games/inherit/index.html',
  'public/games/monetization/index.html',
  'public/games/null-shift/index.html',
  'public/games/operations/index.html',
  'public/games/partners/index.html',
  'public/games/patina/index.html',
  'public/games/premium/index.html',
  'public/games/premium/success/index.html',
  'public/games/remix/index.html',
  'public/games/remix/player/index.html',
  'public/games/signal-run/index.html',
  'public/games/swarm/index.html'
]
for(const path of gameDocumentPages){
  const documentSource=readFileSync(resolve(path),'utf8')
  assert.equal(documentSource.split('</body>').length-1,1,path+' must close body exactly once')
  assert.equal(documentSource.split('</html>').length-1,1,path+' must close html exactly once')
  const inlineScripts=[...documentSource.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  for(let index=0;index<inlineScripts.length;index++){
    const attrs=inlineScripts[index][1]
    const scriptBody=inlineScripts[index][2]
    const type=(attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)||[])[1]?.toLowerCase()||''
    if(/\bsrc\s*=/.test(attrs)||['module','application/ld+json','application/json','importmap'].includes(type)||!scriptBody.trim()) continue
    assert.doesNotThrow(()=>new Function(scriptBody),path+' classic inline script #'+(index+1)+' must parse')
  }
}
assert.equal(html.split('</body>').length-1,1,'Games hub must close body exactly once')
assert.equal(html.split('</html>').length-1,1,'Games hub must close html exactly once')
assert.ok(appSource.includes('className="play-catalog-link" href="/games/"')&&appSource.includes('<em>OSGARD WORLD GAMING</em>')&&appSource.includes("'Открыть игровой портал'"),'Homepage entertainment gateway must promote OSGARD WORLD GAMING and open the canonical /games/ hub')
assert.ok(appSource.includes('className="play-quick-picks"')&&appSource.includes("aria-label={ru ? 'Быстрый запуск игр' : 'Quick launch games'}")&&appSource.includes('QUICK START'),'Homepage must expose a labelled quick-launch section in both locales')
for (const route of ['/games/swarm/','/games/inherit/','/games/signal-run/']) assert.ok(appSource.includes('href="'+route+'"'),'Homepage quick-launch route missing: '+route)
for (const path of ['public/games/swarm/index.html','public/games/inherit/index.html','public/games/signal-run/index.html']) assert.ok(existsSync(resolve(path)),'Homepage quick-launch target is missing: '+path)
assert.ok(appStyles.includes('.play-quick-picks{display:grid;grid-template-columns:auto repeat(3,minmax(0,1fr))')&&appStyles.includes('@media(max-width:760px){.play-quick-picks{grid-template-columns:1fr}'),'Quick-launch strip must have desktop and mobile layouts')
assert.ok(appStyles.includes('.play-quick-link:focus-visible')&&appStyles.includes('@media(prefers-reduced-motion:reduce){.play-quick-link'),'Quick-launch links must retain keyboard focus and reduced-motion support')
assert.ok(html.includes('<title>OSGARD WORLD GAMING — Игровая платформа</title>')&&html.includes('og:title" content="OSGARD WORLD GAMING — игровые миры')&&html.includes('"name":"OSGARD WORLD GAMING"'),'Gaming hub identity must be consistent in title, social metadata and structured data')
assert.ok(html.includes('<meta property="og:type" content="website">')&&html.includes('<meta property="og:site_name" content="OSGARD WORLD GAMING">')&&html.includes('<meta property="og:url" content="https://osgard.world/games/">'),'Games hub Open Graph type, site name and canonical URL must be complete')
assert.ok(html.includes('<meta property="og:image" content="https://osgard.world/games/share-cards/catalog.png">')&&html.includes('<meta property="og:image:width" content="1200">')&&html.includes('<meta property="og:image:height" content="630">'),'Games hub must reference a generated catalogue social card with exact dimensions')
assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">')&&html.includes('<meta name="twitter:image" content="https://osgard.world/games/share-cards/catalog.png">')&&catalogInviteCard.length>0,'Twitter card metadata must use an existing generated catalogue image')
assert.ok(html.includes('id="catalog-total">11</b>')&&html.includes('id="catalog-range">01—11</b>'),'Initial visible catalogue counters must match the eleven-game structured item list')
assert.ok(html.includes('OSGARD WORLD GAMING <span>/</span> DIGITAL WORLDS')&&html.includes('быстрый возврат к недавним сессиям'),'Gaming hub hero must describe the branded portal and its actual navigation features')
for(const path of ['public/games/index.html','public/games/favicon.svg','public/games/player-lifecycle.js','public/games/consented-analytics.js','public/games/game-session-recommendations.js','public/games/game-session-recommendations.css','public/games/admin/index.html','public/games/admin/partners/index.html','public/games/civic-cascade/index.html','public/games/patina/index.html','public/games/signal-run/index.html','public/games/signal-run/game.js','public/games/signal-run/daily.js','public/games/cascade-lab/index.html','public/privacy/index.html','public/terms/index.html']) assert.ok(existsSync(resolve(path)),'Missing file: '+path)
for(const path of ['scripts/games-lighthouse-report.mjs','.github/workflows/games-lighthouse.yml']) assert.ok(existsSync(resolve(path)),'Missing games performance monitoring file: '+path)
const lighthouseScript=readFileSync(resolve('scripts/games-lighthouse-report.mjs'),'utf8')
const lighthouseWorkflow=readFileSync(resolve('.github/workflows/games-lighthouse.yml'),'utf8')
assert.ok(lighthouseWorkflow.includes('https://osgard.world/games/')&&lighthouseWorkflow.includes('--preset=desktop')&&lighthouseWorkflow.includes('actions/upload-artifact@v4'),'Games Lighthouse workflow must audit mobile/desktop and preserve reports')
assert.ok(lighthouseWorkflow.includes('workflow_run')&&lighthouseWorkflow.includes('OSGARD frontend deploy'),'Games Lighthouse audit should run after successful publication')
assert.ok(html.includes('<meta name="osgard-build" content="__OSGARD_BUILD_VERSION__">'),'Games hub must carry a release marker that is stamped at packaging time')
assert.ok(!html.includes('<link rel="stylesheet" href="/games/game-session-recommendations.css?v=__OSGARD_BUILD_VERSION__">'),'Recommendation CSS must not block the initial catalogue render')
assert.ok(!html.includes('<script src="./player-lifecycle.js?v=__OSGARD_BUILD_VERSION__" defer>')&&!html.includes('<script src="./game-session-recommendations.js?v=__OSGARD_BUILD_VERSION__" defer>'),'Gameplay lifecycle and referral modules must not be eagerly downloaded on the landing view')
assert.ok(html.includes('src="/games/consented-analytics.js?v=__OSGARD_BUILD_VERSION__"'), 'Consent-gated delivery queue must be loaded for the hub.');
assert.ok(html.indexOf('src="/games/consented-analytics.js') < html.indexOf('src="/games/commerce-client.js"'), 'Shared analytics queue must load before the commerce client.');
assert.equal(typeof commerceConfig.apiBaseUrl,'string','Commerce API config must expose a public URL setting, never a secret');
for (const source of [commerceClient, consentedAnalytics, recommendationScript, lifecycle]) assert.ok(!source.includes("config.apiBaseUrl||'/commerce-api'")&&!source.includes("config.apiBaseUrl || '/commerce-api'")&&!source.includes("return '/commerce-api'")&&!source.includes('config.apiBaseUrl || API_FALLBACK'), 'Unconfigured API clients must not silently fall back to the relative SPA path');
assert.ok(commerceClient.includes("parsed.pathname === '/commerce-api'")&&consentedAnalytics.includes("parsed.pathname === '/commerce-api'")&&recommendationScript.includes("parsedBase.pathname==='/commerce-api'")&&lifecycle.includes("parsed.pathname==='/commerce-api'"), 'The first-party reverse proxy path must be explicitly allow-listed when configured');
assert.ok(commerceClient.includes("'/commerce-api/healthz'")&&commerceClient.includes("health.databaseReady === true")&&commerceClient.includes("if (!base) throw new Error('COMMERCE_API_NOT_CONFIGURED')"),'Lead submission must discover only a healthy same-origin Commerce API and preserve manual fallback when it is unavailable')
assert.ok(commerceClient.includes('const loadConfig = () => {')&&commerceClient.includes('const config = await loadConfig();')&&commerceClient.includes("fetch('/games/commerce-config.json'")&&!commerceClient.includes('const configPromise = fetch('),'The public commerce configuration must be fetched only when the API client is actually used');
assert.ok(consentedAnalytics.includes("'/commerce-api/healthz'")&&consentedAnalytics.includes("health.databaseReady === true")&&consentedAnalytics.includes('if (!base || !consentGranted()'),'Shared analytics queue must require positive API health and explicit consent before delivery');
assert.ok(sponsoredCampaigns.includes('function consentGranted()')&&sponsoredCampaigns.includes("localStorage.getItem(CONSENT_KEY) === 'yes'"),'Sponsored campaign frequency caps must define a fail-closed explicit-consent check');
new Function(sponsoredCampaigns);
assert.ok(lifecycle.includes("fetch('/commerce-api/healthz'")&&lifecycle.includes("health.databaseReady!==true")&&lifecycle.includes("return fetch(base+'/v1/events'"),'Gameplay lifecycle events must discover only the database-ready first-party API and fail closed otherwise');
new Function(consentedAnalytics);
for(const marker of ['window.OSGARD_CONSENTED_ANALYTICS','MAX_PENDING = 100','MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000','if (!consentGranted())','clearQueue()','result?.accepted']) assert.ok(consentedAnalytics.includes(marker), 'Consent queue contract missing: '+marker);
const lazyRuntimeMatch=html.match(/<script id="games-lazy-runtime">([\s\S]*?)<\/script>/)
assert.ok(lazyRuntimeMatch,'The Games hub must provide the on-demand runtime loader')
const lazyRuntime=lazyRuntimeMatch[1]
new Function(lazyRuntime)
for(const marker of ["function loadPlayerRuntime()","function loadRecommendations()","function loadCatalogEnhancements()","function watchCatalogEnhancements()","rootMargin:'360px 0px'","loadScript('luxury.js')","loadScript('player-lifecycle.js')","loadScript('game-session-recommendations.js')","link.dataset.osgardLazy='recommendations-css'","event.stopImmediatePropagation()","playPending()","playerState==='failed'","meta[name=\"osgard-build\"]"]) assert.ok(lazyRuntime.includes(marker),'Lazy-load contract missing: '+marker)
assert.ok(lazyRuntime.includes("params.get('og_ref')")&&lazyRuntime.includes("loadRecommendations()"),'Invite landings must lazily activate consent-aware referral UI')
assert.ok(lazyRuntime.includes("script.async=true")&&lazyRuntime.includes("encodeURIComponent(version)"),'On-demand scripts must be asynchronous and release-versioned')

{
 const loadedScripts=[],loadedStyles=[],listeners=[];
 let actualLaunches=0;
 class FakeElement {
  constructor(tag='a'){this.tagName=tag.toUpperCase();this.dataset={};this.children=[];this.isConnected=true;this.rel='';this.href='';this.src='';this.hidden=false;this.onload=null;this.onerror=null;this.className=''}
  closest(selector){return selector==='a[data-play]'&&this.dataset.play?this:null}
  append(...items){this.children.push(...items)}
  setAttribute(){}
  addEventListener(){}
  remove(){}
  dispatchEvent(event){return fakeDocument.dispatchEvent({...event,target:this})}
 }
 class FakeMouseEvent {
  constructor(type,options={}){this.type=type;Object.assign(this,options);this.defaultPrevented=false;this.immediateStopped=false}
  preventDefault(){this.defaultPrevented=true}
  stopImmediatePropagation(){this.immediateStopped=true}
 }
 const fakeHead={append(node){
  if(node.tagName==='LINK'){loadedStyles.push(node);return}
  if(node.tagName==='SCRIPT'){
   loadedScripts.push(node.src);
   setTimeout(()=>{
    if(node.src.includes('/player-lifecycle.js')){
     fakeDocument.addEventListener('click',event=>{
      const link=event.target&&event.target.closest&&event.target.closest('a[data-play]');
      if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();event.stopImmediatePropagation();actualLaunches++;
     },true);
    }
    node.onload&&node.onload();
   },0);
  }
 }};
 const fakeDocument={
  head:fakeHead,
  querySelector(selector){return selector==='meta[name="osgard-build"]'?{content:'qa-release-123'}:null},
  createElement(tag){return new FakeElement(tag)},
  addEventListener(type,handler,capture){listeners.push({type,handler,capture:!!capture})},
  dispatchEvent(eventLike){
   const event=eventLike instanceof FakeMouseEvent?eventLike:new FakeMouseEvent(eventLike.type,eventLike);
   for(const item of [...listeners])if(item.type===event.type){item.handler(event);if(event.immediateStopped)break}
   return !event.defaultPrevented;
  }
 };
 const fakeWindow={};
 const fakeLocation={origin:'https://osgard.world',search:'',pathname:'/games/'};
 const lazyApi=new Function('document','window','location','Element','MouseEvent','URLSearchParams','encodeURIComponent','Promise','setTimeout',lazyRuntime+';return window.OSGARDGamesLazy;')(fakeDocument,fakeWindow,fakeLocation,FakeElement,FakeMouseEvent,URLSearchParams,encodeURIComponent,Promise,setTimeout);
 const gameLink=new FakeElement('a');gameLink.dataset.play='swarm';gameLink.href='https://osgard.world/games/swarm/';
 const firstClick=fakeDocument.dispatchEvent({type:'click',target:gameLink,button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false});
 assert.equal(firstClick,false,'First gameplay click must pause native navigation while the lifecycle runtime loads');
 await lazyApi.loadPlayerRuntime();
 await lazyApi.loadRecommendations();
 assert.equal(actualLaunches,1,'The first game click must be replayed exactly once after the player runtime registers its listener');
 assert.ok(loadedScripts.some(src=>src.startsWith('/games/player-lifecycle.js?v=qa-release-123')),'Gameplay lifecycle script must use the deployed build marker');
 assert.ok(loadedScripts.some(src=>src.startsWith('/games/game-session-recommendations.js?v=qa-release-123')),'Referral/recommendation script must use the deployed build marker');
 assert.ok(loadedStyles.some(link=>link.href.startsWith('/games/game-session-recommendations.css?v=qa-release-123')),'Recommendation CSS must load only when the growth module is requested');
 assert.equal(fakeWindow.OSGARDGamesLazy.loadPlayerRuntime instanceof Function,true,'Loader API must remain available to retry the runtime');
}

assert.ok(deployWorkflow.includes('s|__OSGARD_BUILD_VERSION__|$ASSET_VERSION|g')&&deployWorkflow.includes('grep -Fq "<meta name=\\"osgard-build\\" content=\\"$ASSET_VERSION\\">"'),'Deploy packaging must stamp and verify the Games build marker')
const packageHtmlStep = deployWorkflow.indexOf('name: Package HTML assets and matching Nginx config')
const finalManifestStep = deployWorkflow.indexOf('OSGARD_FRONTEND_MANIFEST=release-manifest.json node scripts/frontend-archive-preflight.mjs osgard-release/html')
const archiveTarStep = deployWorkflow.indexOf('tar -czf osgard-world-release.tgz -C osgard-release .', packageHtmlStep)
assert.ok(packageHtmlStep >= 0 && finalManifestStep > packageHtmlStep && archiveTarStep > finalManifestStep, 'Release manifest must hash the final publishable HTML tree after stamping/compression and before archive creation')
assert.ok(deployWorkflow.includes('actions/upload-artifact@v4') && deployWorkflow.includes('osgard-production-release-${{ github.sha }}') && deployWorkflow.includes('production-route-matrix.json') && deployWorkflow.includes('osgard-world-release.tgz') && deployWorkflow.includes('retention-days: 30'), 'Successful production deployment must retain its archive, checksum, manifest and route evidence together')
assert.ok(deployWorkflow.includes('scripts/frontend-archive-preflight-smoke.mjs'), 'Changes to the release-manifest fixture must trigger frontend CI')
assert.ok(routeMatrix.includes("schema: 'osgard.production-route-matrix.v1'") && routeMatrix.includes('sourceRevision: expectedBuild || null') && routeMatrix.includes("await writeFile(reportPath, JSON.stringify(report, null, 2)"), 'Production route validation must persist a machine-readable report bound to the checked-out commit')
assert.ok(readinessWorkflow.includes('OSGARD_SOURCE_REVISION: ${{ github.event.workflow_run.head_sha || github.event.pull_request.head.sha || github.sha }}') && readinessWorkflow.includes('OSGARD_EXPECTED_BUILD: ${{ github.event.workflow_run.head_sha || github.sha }}'), 'Readiness manifest and route matrix must use the deployed/checked-out commit rather than the workflow-run default SHA')
assert.ok(productionMatrix.includes("const expectedBuild = String(process.env.OSGARD_EXPECTED_BUILD || '').trim()") && productionMatrix.includes("const actualBuild = isGamesHub ?") && productionMatrix.includes('expectedBuildMatches') && deployWorkflow.includes('OSGARD_EXPECTED_BUILD:') && deployWorkflow.includes('github.sha'), 'Production route validation must compare the published Games build marker against the commit being deployed')
assert.ok(lighthouseWorkflow.includes('EXPECTED_DEPLOY_SHA')&&lighthouseWorkflow.includes('osgard-build')&&lighthouseWorkflow.includes('luxury.css?v=$expected')&&lighthouseWorkflow.includes('daily-circuit.css?v=$expected')&&lighthouseWorkflow.includes('daily-circuit.js?v=$expected')&&lighthouseWorkflow.includes("versioned('/games/'+path)")&&lighthouseWorkflow.includes("loadScript('player-lifecycle.js')")&&!lighthouseWorkflow.includes('player-lifecycle.js?v=$expected'),'Games Lighthouse must verify versioned assets and the actual lazy-loader contract')
const healthyScores={performance:.95,accessibility:1,'best-practices':1,seo:1}
const fixture=(scores,tbt,lcp,targetSize={score:1,details:{items:[]}})=>({finalDisplayedUrl:'https://osgard.world/games/',categories:Object.fromEntries(Object.entries(scores).map(([key,score])=>[key,{score}])),audits:{'total-blocking-time':{numericValue:tbt},'largest-contentful-paint':{numericValue:lcp},'target-size':targetSize}})
assert.equal(assessReport(fixture(healthyScores,250,2500),'mobile').pass,true,'Healthy mobile Lighthouse report should pass guardrails')
assert.equal(assessReport(fixture({...healthyScores,performance:.84},501,4001),'mobile').pass,false,'Poor mobile scores/TBT/LCP should fail guardrails')
assert.equal(assessReport(fixture({...healthyScores,performance:.89},100,1500),'desktop').pass,false,'Desktop performance below guardrail should fail')
assert.equal(assessReport(fixture(healthyScores,250,2500,{score:0,details:{items:[{node:{selector:'a.play-link'}}]}}),'desktop').pass,false,'Any overlapping or undersized touch target must fail Lighthouse guardrails')
assert.equal(assessReport(fixture(healthyScores,250,2500,{score:0,details:{items:[{node:{selector:'a.play-link'}},{node:{selector:'a.detail-link'}}]}}),'desktop').targetSizeFailures,2,'Lighthouse report must expose the count of failing touch targets')
assert.ok(lighthouseScript.includes('maxTbtMs')&&lighthouseScript.includes('maxLcpMs')&&lighthouseScript.includes("json.audits?.['target-size']"),'Lighthouse report must enforce Core Web Vitals and touch-target guardrails')
assert.ok(html.includes('type="application/ld+json"'),'SEO ItemList JSON-LD missing')
assert.ok(html.includes('"numberOfItems":11')&&html.includes('"name":"CIVIC CASCADE","url":"https://osgard.world/games/civic-cascade/"')&&html.includes('"name":"PATINA Atelier","url":"https://osgard.world/games/patina/"')&&html.includes('"name":"SIGNAL RUN","url":"https://osgard.world/games/signal-run/"')&&html.includes('"name":"CASCADE LAB","url":"https://osgard.world/games/cascade-lab/"')&&html.includes('"name":"AETHER GRID","url":"https://osgard.world/games/aether-grid/"'),'AETHER GRID must appear in the canonical eleven-game Games ItemList')
assert.ok(html.includes('class="art art-civic"')&&html.includes('data-favorite="civic-cascade"')&&html.includes('href="/games/civic-cascade/" data-play="civic-cascade"'),'CIVIC CASCADE card must support the existing play and favorites UI')
assert.ok(html.includes('href="/game/civic-cascade"'),'CIVIC CASCADE secondary action must open its detail page, not relaunch the game')
assert.ok(lifecycle.includes("'civic-cascade':{title:'CIVIC CASCADE',url:'/games/civic-cascade/'}"),'Player lifecycle registry must include CIVIC CASCADE')
assert.ok(lifecycle.includes("if(id==='civic-cascade')return !!doc.querySelector('#cc-game-root')&&!!doc.querySelector('#cc-status')"),'Player lifecycle must detect a ready CIVIC CASCADE client')
assert.ok(manifest.includes("'civic-cascade'")&&manifest.includes("title: 'CIVIC CASCADE'")&&manifest.includes("href: '/games/civic-cascade/'"),'Core manifest must register CIVIC CASCADE')
assert.ok(sitemap.includes('<loc>https://osgard.world/games/civic-cascade/</loc>'),'CIVIC CASCADE must be present in the XML sitemap')
assert.ok(manifest.includes("'afterimage-run'")&&manifest.includes("title: 'AFTERIMAGE//RUN'")&&manifest.includes("href: '/games/afterimage-run/'"),'AFTERIMAGE must be registered in core manifest')
assert.ok(sitemap.includes('<loc>https://osgard.world/games/afterimage-run/</loc>'),'AFTERIMAGE must be present in the XML sitemap')
assert.ok(lifecycle.includes("'afterimage-run':{title:'AFTERIMAGE//RUN',url:'/games/afterimage-run/'}")&&lifecycle.includes("if(id==='afterimage-run')return !!doc.querySelector('#runnerCanvas')&&!!doc.querySelector('#run-start')&&!!doc.querySelector('#daily-seed')"),'AFTERIMAGE must participate in player lifecycle readiness')
assert.ok(aetherGame.includes('<title>AETHER GRID — OSGARD WORLD GAMING</title>')&&aetherGame.includes('id="board"')&&aetherGame.includes('id="challenge-code"')&&aetherGame.includes("notify('ready')")&&aetherGame.includes("notify('completed'"),'AETHER GRID must provide its daily puzzle and lifecycle event contract')
assert.ok(aetherGame.includes('/games/invite/aether-grid/')&&aetherGame.includes('og_day')&&aetherGame.includes('utm_campaign'),'AETHER GRID must preserve the daily challenge in friend invites')
assert.ok(lifecycle.includes("'aether-grid':{title:'AETHER GRID',url:'/games/aether-grid/'}")&&lifecycle.includes("if(id==='aether-grid')return !!doc.querySelector('#board')&&!!doc.querySelector('#challenge-code')"),'AETHER GRID must be launchable in the portal and report readiness')
assert.ok(manifest.includes("'afterimage-run'")&&manifest.includes("title: 'AFTERIMAGE//RUN'")&&manifest.includes("href: '/games/afterimage-run/'"),'AFTERIMAGE must be registered in the typed manifest')
assert.ok(sitemap.includes('<loc>https://osgard.world/games/afterimage-run/</loc>'),'AFTERIMAGE must be present in the XML sitemap')
assert.ok(lifecycle.includes("'afterimage-run':{title:'AFTERIMAGE//RUN',url:'/games/afterimage-run/'}")&&lifecycle.includes("if(id==='afterimage-run')return !!doc.querySelector('#runnerCanvas')&&!!doc.querySelector('#run-start')&&!!doc.querySelector('#daily-seed')"),'AFTERIMAGE must participate in player lifecycle readiness')
const recommendations=readFileSync(resolve(root,'game-session-recommendations.js'),'utf8')
assert.ok(recommendations.includes("'afterimage-run':{title:'AFTERIMAGE//RUN',subtitle:'Ежедневный sci-fi speedrun',href:'/games/afterimage-run/'}")&&recommendations.includes("'afterimage-run':['signal-run','cascade-lab']")&&recommendations.includes("'afterimage-run':'AFTERIMAGE//RUN'")&&recommendations.includes("'aether-grid':{title:'AETHER GRID',subtitle:'Ежедневная головоломка',href:'/games/aether-grid/'}")&&recommendations.includes("'aether-grid':'AETHER GRID'"),'AETHER GRID must participate in postgame recommendations, referral share, and OSGARD SELECT')
assert.ok(recommendations.includes('osgard-aftergame-intermission')&&recommendations.includes('og-postgame-preferences')&&recommendations.includes('Настроить показ')&&recommendations.includes('Автозапуска нет.'),'The existing optional between-game OSGARD SELECT must remain available, user-configurable and must not autoplay')
assert.ok(recommendations.includes("const frequencyValues=['each','every3','off']")&&recommendations.includes("defaultFrequency:'each'")&&recommendations.includes("const fallback={frequency:managedPromoConfig.defaultFrequency,selected:managedPromoConfig.defaultSelectedServices.slice()}")&&recommendations.includes("frequency:frequencyValues.includes(stored.frequency)?stored.frequency:'each'")&&recommendations.includes('function normalizeManagedPromoConfig(raw)'),'OSGARD SELECT should use managed frequency defaults while preserving user-configurable frequency')
for(const domain of ['marcosa.club','osgardbewworld.com','o2system.art','senjorio.com','superday.run','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio']) assert.ok(recommendations.includes(domain),'Owned-service intermission missing '+domain)
assert.ok(recommendations.includes("['gardvpn','08','GARD VPN','PRIVACY / VPN'")&&recommendations.includes('Временно не продвигается: главная страница не подтверждает, что VPN-соединение действительно устанавливается.')&&recommendations.includes("services.filter(item=>item[7]!==false)")&&/\['gardvpn','08','GARD VPN'[^\n]+false,false\]/.test(recommendations),'GARD VPN must be excluded from promotional selections until VPN connectivity is verified')
assert.ok(civic.includes('id="cc-game-root"')&&civic.includes('id="cc-map"')&&civic.includes('id="cc-status"'),'CIVIC CASCADE playable entry point or diagnostics are missing')
for(const action of ['data-action="pump"','data-action="grid"','data-action="route"','data-action="repair"'])assert.ok(civic.includes(action),'CIVIC CASCADE tactical action missing: '+action)
for(const feature of ['function riskValue()','function objectiveState()','function checkFinish()','function sendLifecycle(status)','requestAnimationFrame(frame)','prefers-reduced-motion:reduce'])assert.ok(civic.includes(feature),'CIVIC CASCADE simulation feature missing: '+feature)
assert.ok(civic.includes("game:'civic-cascade'")&&civic.includes("type:'osgard:game-lifecycle'"),'CIVIC CASCADE must handshake with the host game-session lifecycle')
const civicInline=(civic.match(/<script>([\s\S]*?)<\/script>/)||[])[1]
assert.ok(civicInline&&civicInline.length>5000,'CIVIC CASCADE self-contained game script missing')
new Function(civicInline)
const civicRelease = JSON.parse(readFileSync(resolve('public/games/civic-cascade/release.json'), 'utf8'));
assert.ok(civic.includes(`name="osgard-game-version" content="${civicRelease.version}-`), 'CIVIC CASCADE HTML release marker must match release.json');
assert.ok(civic.includes('id="cc-result-challenge"') && civic.includes('id="cc-challenge-banner"'), 'CIVIC CASCADE mission challenge UI missing')
assert.ok(civicInline.includes('function parseMissionChallenge') && civicInline.includes('function createMissionChallengeUrl') && civicInline.includes('civic_cascade_friend_challenge'), 'CIVIC CASCADE challenge routing and share attribution missing')
assert.ok(civic.includes('id="cc-incident"') && civic.includes('id="cc-incident-options"') && civic.includes('SIMULATION PAUSED'), 'Crisis Director decision UI is missing')
for (const id of ['medical-backup','bridge-pressure','comms-failure']) assert.ok(civicInline.includes("id:'"+id+"'"), 'CIVIC CASCADE incident missing: '+id)
assert.ok(civicInline.includes("state.actionCount=(state.actionCount||0)+1") && civicInline.includes("if(crisisIncidents[state.actionCount])openIncident(crisisIncidents[state.actionCount])"), 'Incidents must be scheduled from tactical actions')
assert.ok(civicInline.includes('if(finished||activeIncident)return') && civicInline.includes("activeIncident=null;ui.incident.hidden=true"), 'Mission completion must wait for the incident decision')
assert.ok(civicInline.includes('actionCount:[0,999]') && civicInline.includes("key==='actionCount'&&v===undefined") && civicInline.includes("key==='actionCount'&&s[key]===undefined?0:s[key]"), 'Legacy local checkpoints must migrate')
assert.ok(lifecycle.includes("'signal-run':{title:'SIGNAL RUN',url:'/games/signal-run/'}"), 'Player lifecycle registry must include SIGNAL RUN')
assert.ok(luxury.includes("const validIds = new Set(['null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade', 'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid'])"), 'Recent history and Resume registry must include all eleven current games')
assert.ok(luxury.includes("const catalogCount = Array.from(grid.querySelectorAll('.card[data-game]'))")&&luxury.includes("allCountBadge.textContent = String(catalogCount)")&&luxury.includes("catalogRange.textContent = '01—' + String(catalogCount).padStart(2, '0')"),'Visible catalogue count/range must be derived from the actual validated cards')
assert.ok(lifecycle.includes("if(id==='signal-run')return !!doc.querySelector('#arena')&&!!doc.querySelector('#start')"), 'Player lifecycle must detect SIGNAL RUN readiness')
assert.ok(lifecycle.includes("!['ready','started','paused','resumed','share_created','error','level_completed','completed'].includes(m.state)"), 'Player lifecycle must accept ready, pause/resume, share_created and terminal states')
assert.ok(lifecycle.includes("activeGame==='null-shift'") && lifecycle.includes("return 'referral:'+code+':null-shift'") && lifecycle.includes("function shareReferralCode(payload)") && lifecycle.includes("const flowType=['daily-challenge','score-duel','solution-link','result-card','friend-invite'].includes(payload?.flowType)?payload.flowType:'generic';const source=name==='share_created'?(shareCode?'game-invite:'+activeGame+':'+shareCode:'game-share:'+activeGame+':'+flowType):analyticsSource()"), 'NULL SHIFT daily challenge invites must retain referral source and count confirmed share actions')
assert.ok(manifest.includes("'patina' | 'signal-run'") && manifest.includes("href: '/games/signal-run/'"), 'Core manifest must register SIGNAL RUN')
assert.ok(sitemap.includes('<loc>https://osgard.world/games/signal-run/</loc>') && sitemap.includes('<loc>https://osgard.world/game/signal-run</loc>'), 'SIGNAL RUN routes must be present in the XML sitemap')
assert.ok(signalRun.includes('<title>SIGNAL RUN — OSGARD WORLD</title>') && signalRun.includes('id="arena"') && signalRun.includes('id="fullscreen"'), 'SIGNAL RUN page shell or controls missing')
assert.ok(signalRun.includes('<link rel="canonical" href="https://osgard.world/games/signal-run/">'),'SIGNAL RUN canonical URL must match the public game route')
for(const meta of [
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="OSGARD WORLD">',
  '<meta property="og:title" content="SIGNAL RUN — OSGARD WORLD">',
  '<meta property="og:description"',
  '<meta property="og:url" content="https://osgard.world/games/signal-run/">',
  '<meta name="twitter:card" content="summary">'
]) assert.ok(signalRun.includes(meta),'SIGNAL RUN social metadata missing: '+meta)
assert.ok(!signalRun.includes('property="og:image"'),'SIGNAL RUN must not advertise a non-existent social-preview image')
assert.equal(catalogCards.find(card=>card.id==='signal-run')?.genres.join(' '),'arcade creative','SIGNAL RUN must be classified as an arcade, not tactical game')
assert.ok(signalRun.includes('prefers-reduced-motion:reduce') && signalRun.includes('id="touch-pulse"'), 'SIGNAL RUN mobile/accessibility controls missing')
assert.ok(signalRun.includes('id="daily-run"')&&signalRun.includes('id="daily-info"')&&signalRun.indexOf('src="./daily.js"')<signalRun.indexOf('src="./game.js"'),'SIGNAL RUN daily controls and utility order missing')
assert.ok(signalJs.includes('OSGARDSignalDaily')&&signalJs.includes('Daily.createRandom(Daily.seedForDate(dailyDate))')&&signalJs.includes("url.searchParams.set('mode','daily')")&&signalJs.includes("url.searchParams.set('day',dailyDate)")&&signalJs.includes('DAILY CONTRACT'),'Deterministic daily run and shareable challenge missing')
assert.ok(signalJs.includes("new URL('/games/invite/signal-run/',location.origin)")&&signalJs.includes("url.searchParams.set('play','signal-run')")&&signalJs.includes('function referralCode()')&&signalJs.includes("url.searchParams.set('ref',code)"),'SIGNAL RUN must use its social-preview invitation page and a stable opaque referral code')
assert.ok(signalJs.includes('async function buildSignalShareCard(score)')&&signalJs.includes("card.toBlob(resolve,'image/png')")&&signalJs.includes("navigator.canShare({files:[file]})")&&signalJs.includes("life('share_created'"),'SIGNAL RUN must create a PNG result card and count sharing only after a completed share/copy')
assert.ok(signalRun.includes('id="download-share-card"')&&signalRun.includes('СОХРАНИТЬ КАРТОЧКУ PNG'),'SIGNAL RUN must expose a result-card download control after a run')
assert.ok(signalJs.includes("$('download-share-card')?.addEventListener('click'")&&signalJs.includes("URL.createObjectURL(blob)")&&signalJs.includes("URL.revokeObjectURL(url)")&&signalJs.includes("link.download='osgard-signal-run-'")&&signalJs.includes("status.textContent='КАРТОЧКА РЕЗУЛЬТАТА СОХРАНЕНА В PNG'"),'SIGNAL RUN PNG download must save a local image and release its object URL without fabricating a share event')
assert.ok(inviteLandingScript.includes("const legacySignalRun = game === 'signal-run'")&&inviteLandingScript.includes("target.searchParams.set(key, value)")&&inviteLandingScript.includes("validDailyMode"),'Signal Run social preview must preserve only validated challenge and daily-mode parameters')
assert.ok(html.includes('id="games-deep-link-bridge"')&&html.includes("incoming.searchParams.get('play')||''")&&html.includes("validGameIds.has(gameId)")&&html.includes("requestAnimationFrame(()=>link.click())"),'Supported game deep links must launch through the shared game-player lifecycle')
const signalReferralBridgeStart=html.indexOf('<script id="games-deep-link-bridge">')+'<script id="games-deep-link-bridge">'.length;
const signalReferralBridgeEnd=html.indexOf('</script>',signalReferralBridgeStart);
assert.ok(signalReferralBridgeEnd>signalReferralBridgeStart,'SIGNAL RUN referral bridge must be a valid inline script');
new Function(html.slice(signalReferralBridgeStart,signalReferralBridgeEnd));
assert.ok(html.slice(signalReferralBridgeStart,signalReferralBridgeEnd).includes("localStorage.getItem('osgard.games.analytics-consent.v1')==='yes'")&&html.slice(signalReferralBridgeStart,signalReferralBridgeEnd).includes("name:'referral_link_opened'"),'Referral opens must be consent-gated and use the server event contract')
assert.ok(lifecycle.includes("return 'referral:'+code+':signal-run'")&&lifecycle.includes("url.searchParams.get('utm_campaign')==='challenge'"),'Accepted SIGNAL RUN challenges must feed a fixed, consented referral source into session metrics')
assert.ok(signalRun.includes('target="_blank" rel="noopener noreferrer"'),'Post-run sponsor inquiry must not replace the active game document')
new Function(signalDailyJs)
const dailySandbox={Date,Math,Number,String,Object,RegExp};runInNewContext(signalDailyJs,dailySandbox)
const daily=dailySandbox.OSGARDSignalDaily
assert.ok(daily,'Daily utility public API is missing')
assert.equal(daily.normalizeDate('2026-02-30','2026-10-13'),'2026-10-13','Impossible dates must fall back to today')
assert.equal(daily.normalizeDate('2024-02-29','2026-10-13'),'2024-02-29','Valid leap days must be accepted')
assert.equal(daily.seedForDate('2026-10-13'),daily.seedForDate('2026-10-13'),'Same UTC date must produce the same seed')
assert.notEqual(daily.seedForDate('2026-10-13'),daily.seedForDate('2026-10-14'),'Different dates must produce different seeds')
const dailyA=daily.createRandom(daily.seedForDate('2026-10-13')),dailyB=daily.createRandom(daily.seedForDate('2026-10-13'))
assert.deepEqual(Array.from({length:8},()=>dailyA()),Array.from({length:8},()=>dailyB()),'Same date must produce identical random streams')
assert.equal(daily.previousUtcDate('2024-03-01'),'2024-02-29','UTC date logic must support leap years')
assert.equal(daily.nextStreak(null,'2026-10-13').count,1,'New streak starts at one')
assert.equal(daily.nextStreak({lastDate:'2026-10-13',count:4},'2026-10-13').count,4,'Same-day completions must not inflate streak')
assert.equal(daily.nextStreak({lastDate:'2026-10-12',count:4},'2026-10-13').count,5,'Consecutive days extend streak')
assert.equal(daily.nextStreak({lastDate:'2026-10-10',count:4},'2026-10-13').count,1,'Missed day resets streak')
assert.ok(signalJs.includes("game:'signal-run'") && signalJs.includes("life('ready'") && signalJs.includes("life('completed'") && signalJs.includes('dailyMode,dailyDate') && signalJs.includes('osgard.signal-run.best.v1'), 'SIGNAL RUN lifecycle, daily metadata and local-best contract missing')
new Function(signalJs)

assert.match(admin, /<meta name="robots" content="noindex,nofollow,noarchive">/, 'Operator analytics must not be indexed')
for(const endpoint of ['/api/v1/analytics/summary','/api/v1/analytics/cohorts','/api/v1/analytics/snapshots','/api/v1/analytics/export']) assert.ok(admin.includes(endpoint),'LiveOps is missing protected API surface '+endpoint)
assert.ok(admin.includes("'X-Moderation-Token':operatorToken"), 'Operator key must be sent only in the protected API request header')
assert.ok(admin.includes('API aggregates') || admin.includes('API STATUS'), 'LiveOps status surface missing')
assert.ok(admin.includes('не показывает все анонимные посещения сайта') && admin.includes('не подключены'), 'Admin must clearly state which commercial metrics are not collected')
const adminScriptBody=admin.split('<script>')[1]?.split('</script>')[0]||''
const adminScripts=adminScriptBody.trim()?[adminScriptBody]:[]
assert.equal(adminScripts.length,1,'LiveOps should have one self-contained application module')
new Function(adminScripts[0])
assert.ok(!/localStorage|sessionStorage/.test(adminScripts[0]), 'Operator token must not be persisted in browser storage')
assert.ok(adminScripts[0].includes("readApi('/api/v1/analytics/summary?") && adminScripts[0].includes("readApi('/api/v1/analytics/cohorts')"), 'LiveOps must query the server aggregates, not fixture numbers')
assert.ok(adminScripts[0].includes("'osgard-games-aggregate-events.jsonl'") && adminScripts[0].includes('JSON.parse(line)'), 'Aggregate export must validate JSONL records before download')
assert.ok(admin.includes('href="/games/admin/partners/"'), 'LiveOps must link to the sponsor inventory editor')
assert.match(partnerEditor, /<meta name="robots" content="noindex,nofollow,noarchive">/, 'Sponsor editor must not be indexed')
assert.ok(partnerEditor.includes('id="editor-list"') && partnerEditor.includes('id="download"') && partnerEditor.includes('id="import-button"'), 'Sponsor editor UI actions are incomplete')
assert.ok(partnerEditor.includes("active:false,sponsorLabelRequired:true") || partnerEditor.includes('active:false,sponsorLabelRequired:true'), 'New inventory rows must be forced inactive and sponsor-labelled')
assert.ok(partnerEditor.includes("item?.active!==false") && partnerEditor.includes("item?.sponsorLabelRequired!==true"), 'Export validation must refuse any activated or unlabelled sponsor placement')
assert.match(partnerEditor, /data\?\.commercialStatus\s*!==\s*['"]inquiry_only['"]/, 'Sponsor editor must preserve commercial status contract')
assert.match(partnerEditor, /data\?\.currency\s*!==\s*['"]EUR['"]/, 'Sponsor editor must preserve EUR currency contract')
const editorScriptBody=partnerEditor.split('<script>')[1]?.split('</script>')[0]||''
assert.ok(editorScriptBody.length>1000, 'Sponsor inventory editor script missing')
new Function(editorScriptBody)
assert.ok(!/localStorage|sessionStorage/.test(editorScriptBody), 'Editor must not persist draft commercial data unexpectedly')
assert.ok(editorScriptBody.includes("fetch('/games/partners/inventory.json'") && editorScriptBody.includes("a.download='inventory.json'"), 'Editor must read current inventory and export a valid JSON file')
assert.ok(html.includes('<meta name="description"'),'SEO description missing')
assert.ok(html.includes('prefers-reduced-motion:reduce'),'Reduced motion CSS missing')
const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1]||''
assert.ok(css.includes('@media(max-width:760px)'),'Responsive/mobile layout missing')
assert.ok(css.includes('.player-view')&&css.includes('dialog::backdrop'),'Game dialog style missing')
assert.ok(lazyRuntime.includes("loadScript('player-lifecycle.js')")&&lazyRuntime.includes("versioned('/games/'+path)"),'Self-hosted lifecycle module must be loaded on demand with the current release version')
assert.ok(lazyRuntime.includes("document.querySelector('.filters')")&&lazyRuntime.includes("rootMargin:'360px 0px'")&&lazyRuntime.includes("anchor.addEventListener('focusin',activate"),'Premium noncritical catalog toolbar must load on approach/focus, not during the initial catalogue parse')
assert.ok(html.includes("$('.card',grid).forEach(c=>")&&!/(^|[^$])\$\('\.card',grid\)\.forEach/.test(html),'Catalog search/filter must iterate over every card; a single-element query caused a render TypeError')
assert.ok(html.includes('<strong>OSGARD <span>WORLD</span></strong> <em>PLAY</em>')&&!html.includes('aria-label="OSGARD WORLD PLAY"'),'Brand accessible name must preserve the exact visible words')
assert.ok(!/<a class="art art-[^"]+"[^>]*aria-label=/.test(html),'Artwork links must use their visible content for the accessible name')
for(const [marker,label] of [
  ["random.setAttribute('aria-label', 'Случайная игра","random action label must contain the visible text"],
  ["resume.setAttribute('aria-label', 'Продолжить последнюю игру'","resume action label must contain the visible text"],
  ["share.setAttribute('aria-label', 'Поделиться платформой OSGARD PLAY'","share action label must contain the visible text"],
]) assert.ok(luxury.includes(marker),label)
assert.ok(html.includes('@media(min-width:761px){.civic-update-card{contain-intrinsic-size:auto 760px}}'),'Long Civic Cascade desktop card must reserve a safe intrinsic size to prevent its action links overlapping the next card')
assert.ok(html.includes('.game-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 14px;border:1px solid rgba(255,255,255,.12);border-radius:3px;background:rgba(255,255,255,.06);text-decoration:none;line-height:1.35;transition:border-color .2s,background .2s,color .2s}')&&html.includes('.game-actions .play-link{border-color:rgba(211,255,105,.28);background:rgba(211,255,105,.09)}')&&html.includes('.game-actions .detail-link{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.055)}')&&html.includes('.luxury-entertainment footer>nav a{display:inline-flex;align-items:center;min-height:36px;padding:8px 2px}'),'Catalog action links must expose a visible 48px tappable surface; footer targets remain compliant')
assert.ok(html.includes('content-visibility:auto;contain-intrinsic-size:auto 500px')&&html.includes('content-visibility:auto;contain-intrinsic-size:auto 88px'),'Off-screen Games cards and ecosystem tiles must defer content rendering while reserving layout space')
const packageScripts=JSON.parse(readFileSync(resolve('package.json'),'utf8')).scripts
assert.ok(packageScripts.build.includes('optimize-games-static-assets.mjs dist/games')&&packageScripts['qa:games-assets']==='node scripts/games-static-assets-smoke.mjs','Production build must minify and precompress Games assets with a tested optimizer')
assert.ok(deployWorkflow.includes('run: npm run qa:games-assets')&&nginx.includes('gzip_static on;'),'CI must test the static asset optimizer and Nginx must serve precompressed CSS/JS')
for(const lowContrast of ['#656c61','#6f796b','#6d756a','#71796c','#737a70','#737b70','#697168']) assert.ok(!html.toLowerCase().includes(lowContrast),'Low-contrast secondary color remains: '+lowContrast)
assert.ok(html.includes('.consent-row p{max-width:710px;color:#7f877c;font-size:12px;line-height:1.7}'),'Analytics consent copy must reach a legible 12px size')
assert.ok(html.includes('.note{margin:16px 0 0;color:#8b9387;font-size:12px;line-height:1.7}')&&html.includes('.privacy-note{color:#8b9387;font-size:12px;line-height:1.65}'),'Notes must remain readable on mobile')
assert.ok(nginx.includes('gzip_types text/plain text/css text/javascript application/json application/javascript'),'Nginx should gzip text/javascript assets')
assert.ok(lifecycle.includes('function startSession(')&&lifecycle.includes('game_session_completed'),'Actual session lifecycle tracking missing')
assert.ok(lifecycle.includes('function openBetweenWorlds(')&&lifecycle.includes("osgard:request-postgame")&&lifecycle.includes("osgard:game-session-ended"),'Active game returns must open the between-worlds chooser')
assert.ok(lifecycle.includes('activeSessionSeen=true')&&lifecycle.includes('activeSessionSeen=false'),'The player wrapper must remember whether a game actually started')
const betweenWorldsSource=lifecycle.slice(lifecycle.indexOf('function openBetweenWorlds('),lifecycle.indexOf("window.addEventListener('osgard:request-postgame'"))
assert.ok(betweenWorldsSource.includes('!activeSessionSeen')&&betweenWorldsSource.includes('if(sessionStartedAt)endSession(reason)'),'A naturally completed game must still show its intermission after session telemetry has reset')
assert.ok(html.includes("osgard:request-postgame")&&html.includes("postgameReady==='1'"),'Close action must open the chooser before leaving an active game')
assert.ok(lifecycle.includes("dialog.addEventListener('cancel'")&&lifecycle.includes('event.preventDefault()'),'Escape must open the chooser during a confirmed game session')
assert.ok(recommendationStyles.includes('data-postgame-intermission')&&recommendationStyles.includes('.player-view iframe{display:none'),'Intermission must hide the game iframe while offers and rewards are shown')
assert.ok(lifecycle.includes('event.preventDefault();event.stopPropagation();launch(id,link.href,false)'),'Launch capture must prevent the legacy card handler from opening the same iframe twice')
assert.ok(lifecycle.includes('clientReadyMs')&&lifecycle.includes('durationSeconds')&&lifecycle.includes('function fail('),'Launch timing and failure recovery missing')
assert.ok(lifecycle.includes('osgard:game-lifecycle')&&lifecycle.includes('event.origin!==location.origin')&&lifecycle.includes('event.source!==frame.contentWindow'),'Lifecycle message must validate same-origin iframe/source')
assert.ok(lifecycle.includes('if(!consent||!token)return'),'Lifecycle analytics must require consent and authentication')
new Function(lifecycle)
assert.ok(lifecycle.includes('dialog#player-dialog{width:100vw'),'Mobile CSS selector must match actual dialog id')
assert.ok(html.includes('id="post-run-recommendations"')&&lazyRuntime.includes('game-session-recommendations.css')&&lazyRuntime.includes('game-session-recommendations.js'),'The catalogue must mount post-session recommendations through the on-demand loader')
assert.ok(html.includes('id="osgard-aftergame-intermission"')&&html.includes('aria-label="Подборка между игровыми сессиями"'),'The Games hub must reserve an accessible post-session area outside the player dialog')
const endSessionContract=lifecycle.slice(lifecycle.indexOf('function endSession(reason)'),lifecycle.indexOf('function startSession(method)'))
assert.ok(endSessionContract.includes("if(sessionStartedAt){")&&endSessionContract.includes("}if(endReason==='closed_by_user'")&&endSessionContract.includes("new CustomEvent('osgard:game-session-ended'")&&!endSessionContract.includes("if(!sessionStartedAt)return"),'Closing any launched game must dispatch an intermission even when the player closes before the session handshake starts; completion telemetry remains session-gated')
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-session-ended'")&&recommendationScript.includes("detail.reason!=='closed_by_user'")&&recommendationScript.includes('outsideRoot.hidden=false'),'The outside owned-service intermission must not duplicate the in-player chooser')
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-launching',()=>{")&&recommendationScript.includes("outsideRoot.hidden=true"),'The outside intermission must clear when the next game launches')
assert.ok(recommendationStyles.includes('#osgard-aftergame-intermission[hidden]')&&recommendationStyles.includes('.og-postgame-outside-suite'),'Post-session intermission must have a hidden state and standalone layout')
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-completed'")&&recommendationScript.includes("document.addEventListener('osgard:game-launching'"),'The deferred recommendation runtime must subscribe to the gameplay lifecycle')
assert.ok(lifecycle.includes("document.dispatchEvent(new Event('osgard:game-launching'))")&&lifecycle.includes("new CustomEvent('osgard:game-completed'"),'Lifecycle wrapper must clear recommendations on launch and publish confirmed completion')
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-completed'")&&recommendationScript.includes("document.addEventListener('osgard:game-launching'"),'Recommendation module must subscribe to game lifecycle events')
assert.ok(recommendationStyles.includes('.post-run-recommendations')&&recommendationStyles.includes('prefers-reduced-motion:reduce'),'Recommendation shelf must have responsive/reduced-motion styling')
new Function(recommendationScript)
const mockNode=()=>{const node={className:'',textContent:'',hidden:false,dataset:{},attributes:{},children:[],handlers:{},append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=nodes},setAttribute(name,value){this.attributes[name]=value},addEventListener(name,handler){(this.handlers[name]??=[]).push(handler)},focus(){this.focused=true},click(){for(const handler of this.handlers.click||[])handler({target:this,button:0})},querySelector(selector){return selector.startsWith('.')?this.children.find(child=>child.className===selector.slice(1))||null:null}};node.classList={toggle(name,force){let parts=node.className.split(/\s+/).filter(Boolean);const current=parts.includes(name),enabled=force===undefined?!current:Boolean(force);if(enabled&&!current)parts.push(name);if(!enabled&&current)parts=parts.filter(value=>value!==name);node.className=parts.join(' ');return enabled},add(name){this.toggle(name,true)},remove(name){this.toggle(name,false)},contains(name){return node.className.split(/\s+/).includes(name)}};return node}
const mockHost=mockNode();mockHost.hidden=true
const mockOutside=mockNode();mockOutside.hidden=true
const mockClasses=new Set()
const mockDialog={classList:{add(name){mockClasses.add(name)},remove(name){mockClasses.delete(name)},contains(name){return mockClasses.has(name)}}}
const mockHandlers={}
const mockHead=mockNode()
const mockDocument={head:mockHead,querySelector(selector){return selector==='#post-run-recommendations'?mockHost:selector==='#osgard-aftergame-intermission'?mockOutside:selector==='#player-dialog'?mockDialog:null},createElement(){return mockNode()},addEventListener(name,handler){(mockHandlers[name]??=[]).push(handler)},dispatch(name,event={}){const handlers=mockHandlers[name]||[];assert.ok(handlers.length,'Missing recommendation/growth lifecycle listener: '+name);handlers.forEach(handler=>handler(event))}}
const mockStorage=()=>{const values=new Map();return{getItem(key){return values.has(key)?values.get(key):null},setItem(key,value){values.set(key,String(value))},removeItem(key){values.delete(key)}}}
const mockLocalStorage=mockStorage(),mockSessionStorage=mockStorage()
const serviceIdsForCadence=['marcosa','projects','o2-system','senjorio','superday','myosa','gold-glamour','osgard-business','vanguard','partner-studio']
const legacyServicePreferenceIds=serviceIdsForCadence.filter(id=>id!=='partner-studio')
const preferenceStart=recommendationScript.indexOf('function readServicePreferences(){')
const preferenceEnd=recommendationScript.indexOf('\nfunction writeServicePreferences(',preferenceStart)
assert.ok(preferenceStart>=0&&preferenceEnd>preferenceStart,'Service preference reader must be independently testable')
const preferenceReaderSource=recommendationScript.slice(preferenceStart,preferenceEnd)
const emptyPreferenceStorage={getItem(){return null}}
const defaultPromoTestConfig={enabled:true,defaultFrequency:'each',enabledServices:serviceIdsForCadence.slice(),defaultSelectedServices:serviceIdsForCadence.slice(),spotlightService:'auto',showShareRewards:true}
const defaultPreferences=new Function('localStorage','memoryServicePreferences','servicePreferencesKey','availableServiceIds','frequencyValues','managedPromoConfig',preferenceReaderSource+';return readServicePreferences()')(emptyPreferenceStorage,null,'osgard.games.postgame-service-preferences.v1',serviceIdsForCadence,['each','every3','off'],defaultPromoTestConfig)
assert.equal(defaultPreferences.frequency,'each','A new player should see the owned-service chooser after every completed round')
const legacyPromoTestConfig={...defaultPromoTestConfig,enabledServices:legacyServicePreferenceIds.slice(),defaultSelectedServices:legacyServicePreferenceIds.slice()}
assert.ok(!new Function('localStorage','memoryServicePreferences','servicePreferencesKey','availableServiceIds','frequencyValues','managedPromoConfig',preferenceReaderSource+';return readServicePreferences()')(emptyPreferenceStorage,null,'osgard.games.postgame-service-preferences.v1',legacyServicePreferenceIds,['each','every3','off'],legacyPromoTestConfig).selected.includes('partner-studio'),'A config with a smaller approved list must not opt new players into excluded services')
assert.ok(recommendationScript.includes('localStorage.getItem(servicePreferencesKey)'),'Existing explicit local player preferences must remain readable')
const cadenceStart=recommendationScript.indexOf('function shouldShowServicePromos(')
const cadenceEnd=recommendationScript.indexOf('\\nfunction normalizeServiceSearchQuery(',cadenceStart)
assert.ok(cadenceStart>=0&&cadenceEnd>cadenceStart,'Service promotion cadence gate must be independently testable')
const cadenceSource=recommendationScript.slice(cadenceStart,cadenceEnd)
const shouldShowPromoImpl=new Function('preferences','completedCount','readPromoSnoozeUntil','managedPromoConfig',cadenceSource+';return shouldShowServicePromos(preferences,completedCount)')
const shouldShowPromo=(preferences,completedCount,readPromoSnoozeUntil)=>shouldShowPromoImpl(preferences,completedCount,readPromoSnoozeUntil,defaultPromoTestConfig)
const noPromoPause=()=>0
assert.equal(shouldShowPromo(defaultPreferences,1,noPromoPause),true,'Default cadence must show after the first completed round')
assert.equal(shouldShowPromo(defaultPreferences,2,noPromoPause),true,'Default cadence must show after each completed round')
assert.equal(shouldShowPromo({frequency:'every3'},1,noPromoPause),false,'An explicit lower-frequency preference must skip the first round')
assert.equal(shouldShowPromo({frequency:'every3'},2,noPromoPause),false,'An explicit lower-frequency preference must skip the second round')
assert.equal(shouldShowPromo({frequency:'every3'},3,noPromoPause),true,'An explicit lower-frequency preference must show after the third round')
assert.equal(shouldShowPromo({frequency:'off'},3,noPromoPause),false,'Opting out must suppress owned-service promotions')
assert.equal(shouldShowPromo(defaultPreferences,1,()=>Date.now()+3600000),false,'A live 24-hour snooze must suppress the promo intermission')
assert.equal(shouldShowPromo(defaultPreferences,1,noPromoPause),true,'Once the pause is cleared, the saved frequency takes effect again')
mockLocalStorage.setItem('osgard.games.postgame-service-preferences.v1',JSON.stringify({frequency:'each',selected:serviceIdsForCadence}))

const mockWindowHandlers={}
const mockWindow={OSGARD_CONSENTED_ANALYTICS:null,location:{origin:'https://osgard.world',pathname:'/games/'},addEventListener(name,handler){(mockWindowHandlers[name]??=[]).push(handler)},dispatchEvent(event){(mockWindowHandlers[event.type]||[]).forEach(handler=>handler(event));return true}}
new Function('document','window','location','localStorage','sessionStorage',recommendationScript)(mockDocument,mockWindow, {search:'',origin:'https://osgard.world',pathname:'/games/'},mockLocalStorage,mockSessionStorage)
const firstSessionId='session_swarm_qa_1000'
mockDocument.dispatch('osgard:game-completed',{detail:{game:'swarm',sessionId:firstSessionId}})
const firstProgress=JSON.parse(mockLocalStorage.getItem('osgard.games.postgame-service-progress.v1'))
assert.equal(firstProgress.count,1,'The completed game event should count one OSGARD intermission')
mockDocument.dispatch('osgard:game-session-ended',{detail:{game:'swarm',sessionId:firstSessionId,reason:'closed_by_user',durationSeconds:31,sessionStarted:true}})
const afterSameSessionReturn=JSON.parse(mockLocalStorage.getItem('osgard.games.postgame-service-progress.v1'))
assert.equal(afterSameSessionReturn.count,1,'Completion and closing the same game session must not increment cadence twice')
assert.deepEqual(afterSameSessionReturn.sessions,[firstSessionId],'Intermission cadence should persist its idempotency key')
assert.equal(mockHandlers['osgard:game-completed'].length,2,'Recommendations and unified OSGARD SELECT must subscribe to completed sessions')
assert.equal(mockHandlers['osgard:game-session-ended'].length,3,'Recommendations and the unified inline/outside OSGARD SELECT intermission must subscribe to session returns')
assert.equal(mockHost.hidden,false,'Completed SWARM session should show recommendations')
assert.equal(mockClasses.has('has-recommendations'),true,'The player layout should adapt after completion')
const mockGrid=mockHost.children.find(node=>node.className==='post-run-grid');
const mockSuite=mockHost.children.find(node=>node.className==='og-postgame-suite');
assert.ok(mockSuite,'Post-run service/reward suite should appear after each valid completion');
assert.equal(mockSuite.children[0].children.find(node=>node.className==='og-postgame-service-grid').children.length,10,'Post-run intermission should promote ten eligible services, including the opt-in Partner Studio offer, while GARD VPN remains excluded');
const initialSpotlight=mockSuite.children[0].children.find(node=>node.className==='og-postgame-service-grid').children.find(node=>node.className.includes('is-featured'));
assert.equal(initialSpotlight?.dataset.service,'marcosa','The first available service should lead the first post-game spotlight');
assert.ok(!mockSuite.children[0].children.find(node=>node.className==='og-postgame-service-grid').children.some(node=>node.dataset.service==='gardvpn'),'GARD VPN must not appear in active promotional cards until its connection is verified');
const postGameServiceShelf=mockSuite.children[0];
const postGamePreferences=postGameServiceShelf.children.find(node=>node.className==='og-postgame-preferences');
const postGameServiceOptions=postGamePreferences?.children.find(node=>node.className==='og-postgame-service-options');
assert.ok(postGamePreferences&&postGamePreferences.hidden,'Service preferences must be available but collapsed by default')
assert.equal(postGameServiceOptions?.children.length,11,'Service preferences must show all eleven owned services, including the disabled VPN choice')
const servicePreferenceInputs=(postGameServiceOptions?.children||[]).map(option=>option.children[0]);
assert.equal(servicePreferenceInputs.filter(input=>input.checked&&!input.disabled).length,10,'The saved preference list selects ten eligible services, including Partner Studio, but excludes the disabled VPN')
const unavailableServiceChoice=servicePreferenceInputs.find(input=>input.dataset.servicePreference==='gardvpn');
assert.ok(unavailableServiceChoice&&unavailableServiceChoice.disabled,'GARD VPN remains visible in preferences but disabled until functional VPN connectivity is verified')
const frequencyField=postGamePreferences.children.find(node=>node.className==='og-postgame-frequency-label');
assert.deepEqual(frequencyField.children[0].children.map(option=>option.value),['each','every3','off'],'Players must choose every round, every three rounds, or no promo')
assert.equal(frequencyField.children[0].value,'each','An explicitly saved every-round preference should be preserved')
assert.ok(mockSuite.children[1]&&mockSuite.children[1].className==='og-postgame-reward','Social-share reward must remain available with or without promotions')

const servicesSection=mockSuite.children.find(node=>node.className==='og-postgame-services')
const spotlight=servicesSection.children.find(node=>node.className==='og-postgame-spotlight')
assert.ok(spotlight&&!spotlight.hidden,'A premium OSGARD SELECT spotlight should appear between game rounds')
assert.equal(spotlight.dataset.service,'marcosa','SWARM should highlight contextually relevant MARCOSA by default')
assert.ok(recommendationScript.includes("'signal-run':['myosa','projects','superday']")&&recommendationScript.includes("'afterimage-run':['superday','projects','vanguard','partner-studio']")&&recommendationScript.includes("'aether-grid':['projects','myosa','vanguard','partner-studio']"),'The spotlight map must include the daily puzzle and relevant owned services, including the opt-in Partner Studio offer')
assert.ok(recommendationScript.includes("const spotlightOptions=[...relevantOrder,...selectedIds.filter(id=>!relevantOrder.includes(id))]"),'The alternate-project control must cycle relevant suggestions first, then all other services selected by the player')
assert.ok(spotlight.children.some(node=>node.className==='og-postgame-spotlight-copy'),'Spotlight needs an editorial service description and action controls')
const serviceFilters=servicesSection.children.find(node=>node.className==='og-postgame-service-filters')
assert.equal(serviceFilters.children[0].textContent,'Все доступные · 10','The all-services filter must count only the ten eligible promotional services and exclude the disabled VPN')
const serviceGrid=servicesSection.children.find(node=>node.className==='og-postgame-service-grid')
const serviceCards=serviceGrid.children
assert.equal(serviceGrid.hidden,true,'The full service directory should be collapsed under the spotlight by default')
assert.equal(serviceFilters.hidden,true,'Category filters should stay collapsed until the directory is opened')
const serviceHead=servicesSection.children.find(node=>node.className==='og-postgame-service-head')
const headActions=serviceHead.children.find(node=>node.className==='og-postgame-service-head-actions')
const serviceDirectoryToggle=headActions.children.find(node=>node.className.includes('og-postgame-collapse-toggle'))
assert.ok(serviceDirectoryToggle&&!serviceDirectoryToggle.hidden,'The player must be able to open the full owned-service directory')
serviceDirectoryToggle.click()
assert.equal(serviceGrid.hidden,false,'The service directory toggle should reveal all active service cards')
assert.equal(serviceFilters.hidden,false,'Opening the directory should reveal category filters');
assert.equal(serviceFilters.children.length,7,'The luxury intermission should offer explicit categories for every service type, including temporarily unavailable projects')
const socialFilter=serviceFilters.children.find(node=>node.dataset.osgardServiceFilter==='social')
socialFilter.click()
assert.equal(socialFilter.attributes['aria-pressed'],'true','Selected service category must expose accessible pressed state')
assert.equal(serviceCards.filter(node=>!node.hidden).length,1,'Selecting the social category should show only its one service')
assert.equal(serviceCards.find(node=>node.dataset.service==='marcosa').hidden,false,'Selected MARCOSA service should remain visible')
assert.ok(serviceCards.filter(node=>node.dataset.category!=='social').every(node=>node.hidden),'Non-selected service categories should be hidden')
serviceFilters.children.find(node=>node.dataset.osgardServiceFilter==='all').click()
assert.ok(serviceCards.every(node=>!node.hidden),'All services should return when the all-category filter is selected')
const decisionBar=servicesSection.children.find(node=>node.className==='og-postgame-service-decision');
assert.ok(decisionBar,'A clear skip control should be available in the intermission');
const skipOffer=decisionBar.children.find(node=>node.className==='og-postgame-skip');
skipOffer.click();
assert.equal(spotlight.hidden,true,'Skip should hide the premium spotlight too')
assert.equal(servicesSection.children.find(node=>node.className==='og-postgame-service-grid').hidden,true,'Skip should hide promo cards without blocking share rewards');
assert.equal(servicesSection.children.find(node=>node.className==='og-postgame-service-filters').hidden,true,'Skip should hide service categories together with promo cards');
assert.equal(decisionBar.children.find(node=>node.className==='og-postgame-skip-status').hidden,false,'Skip should provide accessible feedback');
assert.ok(recommendationScript.includes("'owned_promo_intermission_skipped'")&&recommendationScript.includes("'owned_promo_preferences_saved'"),'Promotion control events should be consent-gated and allowlisted');
assert.ok(recommendationScript.includes('Выбери категорию и сервис, который хочешь посмотреть. Автозапуска нет'),'Service promotion must remain user-selected and must not autoplay')
const rewardSection=mockSuite.children.find(node=>node.className==='og-postgame-reward')
const socialGrid=rewardSection.children.find(node=>node.className==='og-postgame-networks')
assert.deepEqual(socialGrid.children.map(node=>node.textContent),['Telegram ↗','WhatsApp ↗','VK ↗','X ↗','Facebook ↗'],'Share reward must offer the five requested social destinations')
assert.ok(socialGrid.children.every(node=>node.target==='_blank'&&node.rel==='noopener noreferrer'&&node.href.startsWith('https://')),'Social buttons must open valid, isolated external share destinations')
const claimReward=rewardSection.children.find(node=>node.className==='og-postgame-claim')
socialGrid.children[0].click()
assert.equal(claimReward.hidden,false,'Choosing a social destination should reveal the return-to-game reward confirmation')
assert.ok(claimReward.textContent.includes('Telegram')&&claimReward.textContent.includes('+50 SHARDS'),'Reward confirmation should name the selected destination and show the local reward')
assert.ok(rewardSection.children.find(node=>node.className==='og-postgame-status').textContent.includes('Соцсеть не сообщает сайту подтверждение публикации'),'Manual repost reward must clearly disclose that posting is player-confirmed, not network-verified')
assert.deepEqual(mockGrid.children.map(node=>node.dataset.play),['null-shift','signal-run'],'SWARM should recommend two related live games')
assert.deepEqual(mockGrid.children.map(node=>node.href),['/games/null-shift-godot/','/games/signal-run/'],'Recommendations should point to valid game launch routes')
mockDocument.dispatch('osgard:game-launching')
assert.equal(mockHost.hidden,true,'The next launch must clear recommendations')
assert.equal(mockHost.children.length,0,'Stale recommendation links must be removed')
assert.equal(mockClasses.has('has-recommendations'),false,'The player modal should return to normal layout on relaunch')
mockDocument.dispatch('osgard:game-completed',{detail:{game:'unknown'}})
assert.equal(mockHost.hidden,true,'Unknown game IDs must not generate recommendations')
mockDocument.dispatch('osgard:game-session-ended',{detail:{game:'patina',reason:'closed_by_user',durationSeconds:31,sessionStarted:true}})
assert.equal(mockOutside.hidden,false,'Closing a live PATINA session should show the owned-service intermission outside the player dialog')
const outsideSuite=mockOutside.children.find(node=>node.className==='og-postgame-suite og-postgame-outside-suite')
assert.ok(outsideSuite,'Closed-session intermission should contain a standalone service/reward suite')
assert.equal(outsideSuite.children.find(node=>node.className==='og-postgame-services').children.find(node=>node.className==='og-postgame-service-grid').children.length,10,'Closed-session intermission should show all ten eligible services, including Partner Studio, while excluding the unverified VPN')
assert.equal(outsideSuite.children.find(node=>node.className==='og-postgame-back').href,'#catalog','Players must have a clear path back to the next game');
const outsideCards=outsideSuite.children.find(node=>node.className==='og-postgame-services').children.find(node=>node.className==='og-postgame-service-grid').children;
assert.equal(outsideCards.find(node=>node.className.includes('is-featured'))?.dataset.service,'gold-glamour','PATINA should highlight its contextual GOLD GLAMOUR service');
mockDocument.dispatch('osgard:game-launching')
assert.equal(mockOutside.hidden,true,'Starting the next game must dismiss the standalone intermission')
assert.equal(mockOutside.children.length,0,'Starting the next game must clear stale promoted-service cards')
mockDocument.dispatch('osgard:game-session-ended',{detail:{game:'swarm',reason:'returned_to_catalog',durationSeconds:31,sessionStarted:true}})
assert.equal(mockHost.hidden,false,'Returning from an active SWARM session should show the chooser inside the player')
assert.ok(mockHost.children.find(node=>node.className==='og-postgame-suite'),'The in-player chooser must include service choices and sharing rewards')
assert.equal(mockOutside.hidden,true,'The in-player return path must not also render the outside chooser')
mockDocument.dispatch('osgard:game-launching')
assert.equal(mockHost.hidden,true,'Launching another game must dismiss the in-player chooser')
assert.ok(recommendationScript.includes("'cascade-lab'")&&recommendationScript.includes("'civic-cascade'")&&recommendationScript.includes("'signal-run'"),'Recommendation map must cover the nine-game catalogue')
mockDocument.dispatch('osgard:game-completed',{detail:{game:'swarm',sessionId:'session_swarm_rotation_test'}})
const finalSuite=mockHost.children.find(node=>node.className==='og-postgame-suite')
const finalServiceSection=finalSuite.children.find(node=>node.className==='og-postgame-services')
const finalSpotlight=finalServiceSection.children.find(node=>node.className==='og-postgame-spotlight')
const finalSpotlightActions=finalSpotlight.children[0].children.find(node=>node.className==='og-postgame-spotlight-actions')
const finalRotateButton=finalSpotlightActions.children.find(node=>node.className==='og-postgame-spotlight-next')
const finalServiceGrid=finalServiceSection.children.find(node=>node.className==='og-postgame-service-grid')
const beforeRotating=finalSpotlight.dataset.service
finalRotateButton.click()
assert.notEqual(finalSpotlight.dataset.service,beforeRotating,'Another project should rotate the contextual spotlight')
assert.equal(finalServiceGrid.children.find(node=>node.className.includes('is-featured'))?.dataset.service,finalSpotlight.dataset.service,'Rotating the spotlight must move the featured card to the chosen project')
assert.ok(inheritSafeForSmoke.includes('<meta name="osgard-inherit-api-base" content="">'),'INHERIT API must be an explicit deployment setting')
assert.ok(!inheritSafeForSmoke.includes('http://127.0.0.1:4174')&&!inheritSafeForSmoke.includes('http://127.0.0.1:4175'),'INHERIT public client must not contain localhost endpoints')
assert.ok(inheritSafeForSmoke.includes("if(!apiWorld){notice('Общий мир не подключён — локальная летопись активна');return}"),'INHERIT should use local play without a configured shared server')
assert.ok(inheritSafeForSmoke.includes("game:'inherit',state:'completed'"),'INHERIT generation handoff must publish the completed lifecycle event')

assert.equal(inheritSafeForSmoke.split('</body>').length-1,1,'INHERIT must close body exactly once')
assert.equal(inheritSafeForSmoke.split('</html>').length-1,1,'INHERIT must close html exactly once')
assert.ok(!inheritSafeForSmoke.includes('</script></body></html>'+String.fromCharCode(10)+'document.head.insertAdjacentHTML'),'INHERIT theme injection must remain inside its script block')
const inheritFinalPassHandlerStart=inheritSafeForSmoke.lastIndexOf("const passForAnalytics=q('#pass').onclick;")
const inheritCompletedSignal=inheritSafeForSmoke.lastIndexOf("game:'inherit',state:'completed'")
assert.ok(inheritFinalPassHandlerStart>=0&&inheritCompletedSignal>inheritFinalPassHandlerStart,'INHERIT completion must be sent by the final generation-pass handler, not an overwritten earlier handler')
const inheritPastStyleAnchor=inheritSafeForSmoke.indexOf("document.head.insertAdjacentHTML('beforeend','<style>.past .app")
const inheritPastScriptStart=inheritSafeForSmoke.lastIndexOf('<script>',inheritPastStyleAnchor)
const inheritPastScriptEnd=inheritSafeForSmoke.indexOf('</script>',inheritPastStyleAnchor)
assert.ok(inheritPastScriptStart>=0&&inheritPastScriptEnd>inheritPastStyleAnchor,'INHERIT past-generation theme injection must stay inside a script element')
new Function(inheritSafeForSmoke.slice(inheritPastScriptStart+'<script>'.length,inheritPastScriptEnd))
const inheritPassWrapperStart=inheritSafeForSmoke.lastIndexOf("const passForAnalytics=q('#pass').onclick;")
const inheritPassWrapperEnd=inheritSafeForSmoke.indexOf("const returnedEventKey=",inheritPassWrapperStart)
assert.ok(inheritPassWrapperStart>=0&&inheritPassWrapperEnd>inheritPassWrapperStart,'INHERIT final pass wrapper must be extractable for a deterministic handoff test')
const inheritPassWrapperSource=inheritSafeForSmoke.slice(inheritPassWrapperStart,inheritPassWrapperEnd)
new Function('q','S','window','localStorage','track',inheritPassWrapperSource)
async function runInheritPassHandoffTest(serverBacked){
  const state={generation:173,pending:[{type:'light',x:42,y:37}]}
  const stored=new Map(serverBacked?[['inherit-last-passed','173']]:[])
  const tracked=[]
  const messages=[]
  const button={onclick:async function(){state.generation+=1;state.pending=[];if(serverBacked)stored.set('inherit-last-passed',String(state.generation))}}
  const mockQ=selector=>selector==='#pass'?button:null
  const mockWindow={location:{origin:'https://osgard.world'}}
  mockWindow.parent={postMessage:(message,targetOrigin)=>messages.push({message,targetOrigin})}
  const mockStorage={getItem:key=>stored.has(key)?stored.get(key):null,setItem:(key,value)=>stored.set(key,String(value))}
  new Function('q','S','window','localStorage','track',inheritPassWrapperSource)(mockQ,state,mockWindow,mockStorage,name=>tracked.push(name))
  await button.onclick({type:'click'})
  assert.equal(state.generation,174,'Passing a local or server-backed generation must advance exactly once')
  assert.equal(messages.length,1,'Every successful generation handoff must notify the parent player exactly once')
  assert.equal(messages[0].message.type,'osgard:game-lifecycle','INHERIT must use the shared lifecycle contract')
  assert.equal(messages[0].message.game,'inherit','INHERIT lifecycle message must identify the game')
  assert.equal(messages[0].message.state,'completed','Generation handoff must mark the gameplay session completed')
  assert.equal(messages[0].targetOrigin,'https://osgard.world','Lifecycle message must target the same origin')
  assert.equal(tracked.includes('generation_transferred'),serverBacked,'Only a server-confirmed generation transfer should count as server transfer analytics')
}
await runInheritPassHandoffTest(false)
await runInheritPassHandoffTest(true)

assert.ok(nullShiftForSmoke.includes("game:'null-shift',state:'completed'"),'NULL//SHIFT WebGL fallback must emit completion')
assert.ok(swarmForSmoke.includes("game:'swarm',state:'completed'"),'SWARM must emit completion from result state')
assert.ok(remixForSmoke.includes("game:'remix',state:'completed'"),'REMIX must emit completion from server RESULTS')
assert.ok(timeForSmoke.includes("game: 'time', state: 'completed'"),'Imperium of Time must emit completion on terminal state')
assert.ok(civic.includes("sendLifecycle('completed'"),'CIVIC CASCADE must emit completion')
assert.ok(patina.includes("signal('completed'"),'PATINA must emit completion')
assert.ok(signalJs.includes("life('completed'"),'SIGNAL RUN must emit completion')

assert.ok(signalRun.includes('id="shards"')&&signalRun.includes('OSGARD SHARDS')&&signalRun.includes('публикацию в соцсети')&&signalRun.includes('не имеют денежной стоимости'),'SIGNAL RUN must disclose the local SHARDS wallet and social-share verification limits');
assert.ok(signalJs.includes("SHARDS_KEY='osgard.games.shards-wallet.v1'")&&signalJs.includes('function awardShareShards')&&signalJs.includes('event.key===SHARDS_KEY'),'SIGNAL RUN must use the same local SHARDS wallet as the postgame reward panel');
assert.ok(signalJs.includes("bonus.ok?' · +50 SHARDS'")&&signalJs.includes('current.day===day'),'SIGNAL RUN must show the +50 local invitation reward and prevent duplicate grants within one UTC day');
assert.ok(signalRun.includes('id="claim-share-reward"')&&signalRun.includes('Копирование ссылки само по себе не даёт награду'),'SIGNAL RUN must offer an explicit share-reward confirmation and disclose that copying does not earn a reward');
assert.ok(signalRun.includes('id="buy-gold-signal"')&&signalRun.includes('id="cosmetic-status"')&&signalRun.includes('не даёт игровых преимуществ'),'SIGNAL RUN must expose the cosmetic shop and disclose that it has no gameplay advantage');
assert.ok(signalJs.includes("GOLD_SIGNAL_KEY='osgard.signal-run.cosmetics.v1'")&&signalJs.includes("GOLD_SIGNAL_COST=100")&&signalJs.includes('function purchaseGoldSignal()')&&signalJs.includes("goldSignalUnlocked?'#e9c66a':'#d3ff69'"),'SIGNAL RUN must persist a 100-SHARDS cosmetic theme that changes visuals only');
assert.ok(recommendationScript.includes("og-postgame-signal-cta")&&recommendationScript.includes("utm_campaign','shards_cosmetic'")&&recommendationScript.includes('GOLD SIGNAL за 100 SHARDS')&&recommendationStyles.includes('.og-postgame-signal-cta'),'Post-game intermission must show a tracked path from earned SHARDS to the SIGNAL RUN cosmetic');

const signalShareStart=signalJs.indexOf("$('share').addEventListener('click',async()=>{");
const signalShareEnd=signalJs.indexOf("});document.addEventListener('keydown'",signalShareStart);
assert.ok(signalShareStart>=0&&signalShareEnd>signalShareStart,'SIGNAL RUN share handler boundaries are required');
const signalShareHandler=signalJs.slice(signalShareStart,signalShareEnd);
assert.ok(!signalShareHandler.includes('awardShareShards(method)')&&signalShareHandler.includes("method==='clipboard'")&&signalShareHandler.includes('pendingShareReward=method'),'SIGNAL RUN must not auto-award for opening a share sheet or copying');
assert.ok(signalJs.includes("claimShare.addEventListener('click'")&&signalJs.includes("awardShareShards('user-confirmed:'+method)"),'SIGNAL RUN reward must be granted only after an explicit user confirmation');
new Function(signalJs);

const cosmeticStart=signalJs.indexOf('function readShards(){');
const cosmeticEnd=signalJs.indexOf("if(claimShare)claimShare.addEventListener('click',()=>{",cosmeticStart);
assert.ok(cosmeticStart>=0&&cosmeticEnd>cosmeticStart,'SIGNAL RUN cosmetic wallet functions must remain independently testable');
const cosmeticFunctions=signalJs.slice(cosmeticStart,cosmeticEnd);
function createCosmeticHarness(initialWallet,failedWrites=[]){
 const store=new Map();
 if(initialWallet!==null&&initialWallet!==undefined)store.set('osgard.games.shards-wallet.v1',JSON.stringify(initialWallet));
 const failing=new Set(failedWrites);
 const localStorage={
  getItem(key){return store.has(key)?store.get(key):null},
  setItem(key,value){if(failing.has(key))throw new Error('simulated storage failure');store.set(key,String(value))},
  removeItem(key){store.delete(key)}
 };
 const elements={'buy-gold-signal':{disabled:false,textContent:''},'cosmetic-status':{textContent:''}};
 const harness=[
  "const SHARDS_KEY='osgard.games.shards-wallet.v1';",
  "const SHARDS_DAILY_REWARD=50;",
  "const GOLD_SIGNAL_KEY='osgard.signal-run.cosmetics.v1';",
  "const GOLD_SIGNAL_COST=100;",
  "let goldSignalUnlocked=false;",
  'const cosmeticStatus=elements[\'cosmetic-status\'];',
  'const $=(key)=>elements[key]||null;',
  'function hud(){}',
  cosmeticFunctions,
  'globalThis.cosmeticTest={readShards,readGoldSignal,updateCosmeticShop,purchaseGoldSignal,awardShareShards,get unlocked(){return goldSignalUnlocked},button:elements[\'buy-gold-signal\'],status:cosmeticStatus};'
 ].join('\n');
 const context={localStorage,elements,Date,JSON,Math,Number,String,Error};
 runInNewContext(harness,context);
 return {api:context.cosmeticTest,store};
}
const todayUtc=new Date().toISOString().slice(0,10);
{
 const test=createCosmeticHarness({balance:150,lastRewardDay:todayUtc,lastSource:'share'});
 test.api.updateCosmeticShop();
 assert.equal(test.api.button.disabled,false,'A player with 150 SHARDS should be able to unlock the 100-SHARD cosmetic');
 test.api.purchaseGoldSignal();
 assert.equal(test.api.readShards().balance,50,'Cosmetic purchase should deduct exactly 100 local SHARDS');
 assert.equal(test.api.readGoldSignal(),true,'Successful purchase should persist GOLD SIGNAL unlock');
 assert.equal(test.api.button.disabled,true,'An unlocked cosmetic must not be charged a second time');
 assert.equal(test.api.awardShareShards('same-day-share').already,true,'Cosmetic spending must not reset the one-per-UTC-day sharing reward');
}
{
 const test=createCosmeticHarness({balance:99,lastRewardDay:'',lastSource:'test'});
 test.api.purchaseGoldSignal();
 assert.equal(test.api.readShards().balance,99,'Insufficient balance must not deduct SHARDS');
 assert.equal(test.api.readGoldSignal(),false,'Insufficient balance must not unlock the cosmetic');
}
{
 const test=createCosmeticHarness({balance:150,lastRewardDay:'',lastSource:'test'},['osgard.signal-run.cosmetics.v1']);
 test.api.purchaseGoldSignal();
 assert.equal(test.api.readShards().balance,150,'If cosmetic persistence fails, the wallet deduction must roll back');
 assert.equal(test.api.readGoldSignal(),false,'Failed persistence must not report an unlocked cosmetic');
}
assert.ok(recommendationScript.includes('Использовать SHARDS в SIGNAL RUN')&&recommendationScript.includes("utm_campaign','shards_cosmetic'"),'Post-game share reward must link the local SHARDS wallet to the SIGNAL RUN cosmetic');
assert.ok(recommendationStyles.includes('.og-postgame-signal-cta')&&recommendationStyles.includes('prefers-reduced-motion:reduce'),'SHARDS redemption CTA must be responsive and respect reduced motion');

assert.ok(cascadeGame.includes("notifyOsgardLifecycle('level_completed'")&&!cascadeGame.includes("notifyOsgardLifecycle('completed'"),'CASCADE LAB must report a level result without pretending the entire game session ended')
assert.ok(lifecycle.includes("'level_completed'")&&lifecycle.includes("if(m.state==='level_completed')")&&lifecycle.includes("osgard:game-level-completed")&&lifecycle.includes("if(m.state==='completed')"),'The portal must keep level completion distinct from game-session completion')
assert.ok(cascadeGame.includes("const SHARED_SERVICE_PREFERENCES_KEY = 'osgard.games.postgame-service-preferences.v1'") && cascadeGame.includes('function readSharedServicePreferences()'), 'CASCADE LAB must read the same service-promotion preferences as the Games hub')
assert.ok(cascadeGame.includes("preferences.frequency === 'off'") && cascadeGame.includes('!eligible.length'), 'CASCADE LAB must bypass its service interstitial when promotion is disabled or no service was selected')
assert.ok(cascadeGame.includes("preferences.frequency === 'every3'") && cascadeGame.includes('if (!completedLevel || incrementCompletedInterstitialCount() % 3 !== 0)'), 'CASCADE LAB must only count successful level completions for every-three frequency')
assert.ok(cascadeGame.includes('function getEligibleServiceCampaigns') && cascadeGame.includes('CAMPAIGN_TO_SERVICE_PREFERENCE') && cascadeGame.includes('for (const item of visibleServiceCampaigns)'), 'CASCADE LAB campaign choices must respect the user-selected OSGARD service list')
assert.ok(cascadeGame.includes("const PREFERRED_SERVICE_KEY = 'osgard.games.preferred-service.v1'") && cascadeGame.includes('function readPreferredServiceId()'), 'CASCADE LAB must read the service preference saved by OSGARD SELECT')
assert.ok(cascadeGame.includes('function getPreferredServiceCampaign(campaigns)') && cascadeGame.includes('const preferredCampaign = getPreferredServiceCampaign(visibleServiceCampaigns)') && cascadeGame.includes('const initialCampaign = preferredCampaign || visibleServiceCampaigns[nextIndex]'), 'CASCADE LAB must spotlight the preferred service when it remains eligible and otherwise fall back to rotation')
assert.ok(cascadeGame.includes('const selectedPosition = visibleServiceCampaigns.findIndex(item => item.id === campaign.id)') && cascadeGame.includes('String(displayPosition).padStart(2, \'0\')') && cascadeGame.includes('String(visibleServiceCampaigns.length).padStart(2, \'0\')'), 'CASCADE LAB campaign counter must show the selected position within the user-filtered service collection')
assert.ok(cascadeGame.includes("if (campaign.id !== selectedServiceCampaignId && serviceSharePending)"), 'Changing the selected service must clear an outstanding share-reward confirmation');
assert.ok(["id: 'myosa', number: '09', brand: 'MYOSA'","id: 'o2-system', number: '10', brand: 'O2 SYSTEM'","id: 'gold-glamour', number: '11', brand: 'GOLD GLAMOUR'","id: 'partner-studio', number: '12', brand: 'OSGARD PARTNER STUDIO'"].every(marker=>cascadeGame.includes(marker)), 'CASCADE LAB must include every active OSGARD SELECT service that can be selected in shared preferences')
assert.ok(["'myosa': 'https://myosa.world/'","'o2-system': 'https://o2system.art/'","'gold-glamour': 'https://gold-glamour.online/'","'partner-studio': 'https://osgard.world/games/partners/'"].every(url=>cascadeGame.includes(url)), 'Every additional OSGARD service campaign must use its configured HTTPS destination')
assert.ok(["myosa: 'myosa'","'o2-system': 'o2-system'","'gold-glamour': 'gold-glamour'","'partner-studio': 'partner-studio'"].every(mapping=>cascadeGame.includes(mapping)), 'MYOSA, O2 SYSTEM, GOLD GLAMOUR and Partner Studio preferences must map to their own campaigns');
assert.ok(cascadeGame.includes("const SERVICE_CAMPAIGN_IDS = new Set(['marcosa', 'taxi', 'smart-map', 'business', 'creator-studio', 'project-builder', 'worlds', 'osgard-os', 'myosa', 'o2-system', 'gold-glamour', 'partner-studio'])"), 'The local campaign analytics report must accept every selectable service campaign ID');


assert.ok(cascadeGame.includes("notifyCompletedShare('daily-challenge'") && cascadeGame.includes("notifyCompletedShare('score-duel'") && cascadeGame.includes("notifyCompletedShare('solution-link'") && cascadeGame.includes("notifyCompletedShare('result-card'"), 'CASCADE LAB must bridge completed share actions from public challenges, duels, solution links and result cards to the parent portal')
assert.ok(cascadeGame.includes("out.fillText('PLAY: OSGARD.WORLD/GAMES/CASCADE-LAB', 794, 514)") && cascadeGame.includes('text: shareText, url: shareLink') && cascadeGame.includes("'https://osgard.world/games/cascade-lab/'"), 'CASCADE LAB result cards must contain a visible playable URL and share the correct public challenge or duel link')
assert.ok(lifecycle.includes("payload.flowType=m.flowType") && lifecycle.includes("payload.referralCode=m.referralCode") && lifecycle.includes("'game-share:'+activeGame+':'+flowType"), 'Parent portal must distinguish share flow type and keep validated referral codes separate from generic share actions')

const scripts=Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)).map(m=>m[1]).filter(s=>s.trim()&&!s.trim().startsWith('{'))
assert.ok(scripts.length,'Inline application JavaScript not found')
const js=scripts.find(s=>s.includes('function createInviteLink')&&s.includes('function eventIfAllowed'))
assert.ok(js,'Games catalogue runtime script missing; do not confuse it with additive feature bridges')
new Function(js)
assert.ok(js.includes('osgard.games.favorites.v1')&&js.includes('osgard.games.recent.v1'),'Local favorites/history missing')
assert.ok(js.includes("localStorage.getItem('osgard.auth.accessToken')")&&js.includes('/api/v1/player/events')&&js.includes('if(!consent)return'),'Analytics must require both explicit consent and login token')
assert.ok(
  js.includes("trackShare:()=>eventIfAllowed('share_created'") &&
  js.includes('function eventIfAllowed(name,id,extra={})') &&
  js.includes('if(!consent)return') &&
  js.includes('if(!token)return') &&
  js.includes('referralCode:getInviteCode()'),
  'Catalog share must use a consent- and login-gated event with referral attribution'
)
assert.ok(js.includes('frame.requestFullscreen()'),'Fullscreen action missing')
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(html),'External asset CDN found')
for(const host of ['osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio']) assert.ok(html.includes('utm_source=osgard_games')&&html.includes(host),'Cross-promo UTM missing for '+host)
for (const slug of ['time','swarm','null-shift','inherit','remix','signal-run','civic-cascade','patina','cascade-lab']) assert.ok(html.includes('href="/game/' + slug + '"'), 'Missing detail link: ' + slug)
assert.ok(html.includes('href="/games/monetization/"'), 'Economics planner link missing')
assert.ok(html.includes('id="load-device-fit"') && html.includes('Проверить совместимость'), 'Device compatibility action must be available from the Games catalog')
assert.ok(!html.includes('id="load-device-fit" type="button" aria-controls="osgard-device-fit"'), 'The lazy button must not reference a panel that does not exist yet')
assert.ok(html.includes("panel.setAttribute('tabindex','-1')") && html.includes('panel.focus()'), 'Opening the lazy panel must move keyboard focus to the new accessible region')
assert.ok(html.includes("loadScript('device-fit.js')"), 'Device compatibility feature must remain available through the versioned lazy loader')
assert.ok(html.includes('data-device-fit-css="/games/device-fit.css?v=__OSGARD_BUILD_VERSION__"'), 'Device compatibility CSS must retain a versioned asset contract')
assert.ok(html.includes('data-device-fit-src="/games/device-fit.js?v=__OSGARD_BUILD_VERSION__"'), 'Device compatibility JS must retain a versioned asset contract')
assert.ok(!html.includes('<script src="/games/device-fit.js?v=__OSGARD_BUILD_VERSION__" defer></script>'), 'Device compatibility logic must not execute with the initial deferred script batch')
assert.ok(!html.includes('<link rel="stylesheet" href="/games/device-fit.css?v=__OSGARD_BUILD_VERSION__">'), 'Device compatibility CSS must not block the initial catalog render')
const expeditionHtml = readFileSync(resolve('public/games/expedition/index.html'),'utf8')
const expeditionCss = readFileSync(resolve('public/games/expedition/expedition.css'),'utf8')
const expeditionCore = readFileSync(resolve('public/games/expedition/core.js'),'utf8')
const expeditionRuntime = readFileSync(resolve('public/games/expedition/catalog-runtime.js'),'utf8')
assert.ok(html.includes('href="/games/expedition/"') && html.includes('/games/expedition/catalog-runtime.js?v=__OSGARD_BUILD_VERSION__'), 'Expedition builder must be linked from Games and its progress runtime must load')
assert.ok(expeditionHtml.includes('<title>OSGARD PLAY — Конструктор экспедиций</title>') && expeditionHtml.includes('id="game-options"') && expeditionHtml.includes('id="share-panel"'), 'Expedition builder UI is incomplete')
assert.ok(expeditionCore.includes('function advanceProgress(') && expeditionCore.includes('function parseRoute(') && expeditionRuntime.includes("osgard:game-completed"), 'Expedition progress must be validated and advanced from actual game-completion events')
assert.ok(expeditionCss.includes('prefers-reduced-motion:reduce') && expeditionCss.includes('@media(max-width:760px)'), 'Expedition UI must support reduced motion and mobile viewports')
console.log('PASS OSGARD GAMES HUB: eleven actual game routes, search/filters, local favorites/history, embedded player/fullscreen/share, consent-gated authenticated analytics, cross-promotion, contact form, SEO, mobile/reduced-motion styling and legal documents.')
assert.ok(html.includes('href="/games/cascade-lab/" data-play="cascade-lab"') && html.includes('data-favorite="cascade-lab"') && html.includes('href="/game/cascade-lab"'), 'CASCADE LAB must use catalogue play, favourites and detail route')
// Assert the actual release marker of the current production-bound CASCADE LAB browser prototype.
assert.ok(cascadeGame.includes('id="CASCADELAB017"') && cascadeGame.includes('data-cascade-lab-delta="0.17.0"') && cascadeDelta.includes('function latestSameLevelPair()') && cascadeDelta.includes('cascade-lab-ab-comparison.json'), 'CASCADE LAB Delta Lens must compare same-level attempts and export a local A/B report')
assert.ok(cascadeGame.includes('id="CASCADELAB018"') && cascadeGame.includes('data-cascade-lab-experiment="0.18.0"') && cascadeGame.includes('hypothesis-lab.js?v=0.18.0') && cascadeHypothesis.includes("const SCHEMA = 'osgard.cascade-lab.next-experiment.v1'") && cascadeHypothesis.includes('function reconcilePlan('), 'CASCADE LAB Hypothesis Lab must store a plan and observe the next same-level run')
assert.ok(!cascadeHypothesis.includes('fetch(') && !cascadeHypothesis.includes('XMLHttpRequest') && !cascadeHypothesis.includes('sendBeacon'), 'Hypothesis Lab must remain local-only')
new Function(cascadeHypothesis)
assert.ok(cascadeGame.includes('id="CASCADELAB019"') && cascadeGame.includes('data-cascade-lab-engineering="0.19.0"') && cascadeGame.includes('engineering-suite.js?v=0.19.0'), 'CASCADE LAB Engineering OS 0.19 loader missing')
assert.ok(cascadeGame.includes("new CustomEvent('cascade-lab:run-finished'") && cascadeEngineering.includes("const SCHEMA = 'osgard.cascade-lab.engineering-suite.v1'") && cascadeEngineering.includes('const IMPROVEMENTS = Object.freeze(['), 'Engineering OS run contract, schema and 30-item manifest missing')
assert.ok(!cascadeEngineering.includes('fetch(') && !cascadeEngineering.includes('XMLHttpRequest') && !cascadeEngineering.includes('sendBeacon') && !cascadeEngineering.includes('.innerHTML'), 'Engineering OS must remain local-only and use safe text rendering')
new Function(cascadeEngineering)
assert.ok(cascadeGame.includes('id="CASCADELAB022"') && cascadeGame.includes('data-cascade-lab-xray="0.22.0"') && cascadeGame.includes('trajectory-xray.js?v=0.22.0'), 'CASCADE LAB Trajectory X-Ray loader missing')
assert.ok(cascadeGame.includes('trajectory: Array.from({ length: Math.min(420, lastReplay.length) }') && cascadeXray.includes('function normalizeFrames(') && cascadeXray.includes('function trajectoryDeviation('), 'Trajectory X-Ray must analyse bounded real replay frames')
assert.ok(!cascadeXray.includes('fetch(') && !cascadeXray.includes('XMLHttpRequest') && !cascadeXray.includes('sendBeacon') && !cascadeXray.includes('.innerHTML'), 'Trajectory X-Ray must remain local-only and render via safe DOM nodes')
new Function(cascadeXray)

assert.ok(cascadeGame.includes('<title>CASCADE LAB — Premium Physics Lab 0.25.0</title>') && cascadeGame.includes('name="osgard-game-version" content="0.25.0-evidence-integrity"') && cascadeGame.includes('data-cascade-lab-engineering="0.19.0"') && cascadeGame.includes('data-cascade-lab-ledger="0.15.0"') && cascadeGame.includes('CASCADELAB015') && cascadeGame.includes('id="CASCADELAB020"') && cascadeGame.includes('data-cascade-lab-studio="0.20.0"') && cascadeGame.includes('data-cascade-lab-ready="true"') && cascadeGame.includes("notifyOsgardLifecycle('ready'") && cascadeGame.includes("notifyOsgardLifecycle('started'") && cascadeGame.includes("notifyOsgardLifecycle('paused'") && cascadeGame.includes("notifyOsgardLifecycle('resumed'") && cascadeGame.includes("notifyOsgardLifecycle('level_completed'") && !cascadeGame.includes("notifyOsgardLifecycle('completed'"), 'CASCADE LAB 0.25.0 must preserve the 0.15 ledger, 0.19 engineering layer and report non-terminal level completion');
assert.ok(lifecycle.includes("'cascade-lab':{title:'CASCADE LAB',url:'/games/cascade-lab/'}") && lifecycle.includes("if(id==='cascade-lab')return doc.body.dataset.cascadeLabReady==='true'"), 'Game modal must register CASCADE LAB readiness')
assert.ok(manifest.includes("'cascade-lab'") && manifest.includes("title: 'CASCADE LAB'") && sitemap.includes('<loc>https://osgard.world/games/cascade-lab/</loc>'), 'CASCADE LAB must be present in manifest and sitemap')


assert.ok(!entertainmentAlias.includes('http-equiv="refresh"') && !entertainmentAlias.includes("window.location.replace('/games/')") && entertainmentAlias.includes('<title>OSGARD ENTERTAINMENT — Играй. Исследуй. Передавай вызов.</title>') && entertainmentAlias.includes('id="world-catalog"') && entertainmentAlias.includes('data-game="aether-grid"'), 'The dedicated Entertainment hub must replace the old redirect and include all game discovery content')
assert.ok(nginx.includes('location = /entertainment {') && nginx.includes('return 301 /entertainment/;') && nginx.includes('location = /entertainment/') && nginx.includes('try_files /entertainment/index.html =404;') && !nginx.includes('location ^~ /entertainment/'), 'The no-slash alias must normalize and the trailing-slash route must serve the dedicated static page directly')
assert.ok(mainSource.includes("import { AurumPage, CatalogPage, ChroniclePage, ClubPage, DevelopmentPage, EntertainmentPage, MastersPage, TimeCoinPage, WorldsPage } from './Sections'") && mainSource.includes("path === '/entertainment' ? <EntertainmentPage locale={locale} setLocale={setLocale} />"), 'React fallback must render the Entertainment route, not bounce visitors to the Games hub')
assert.ok(sectionSource.includes("['Entertainment', '/entertainment/']"), 'Secondary OSGARD navigation must link directly to the dedicated Entertainment page')
assert.ok(rootIndex.includes('href="/osgard-mark.svg"') && rootIndex.includes('"logo":"https://osgard.world/osgard-mark.svg"'), 'Root page must use the original OSGARD brand mark for favicon and organization schema')
assert.ok(existsSync(resolve('public/osgard-mark.svg')), 'Original OSGARD brand mark is present')


const luxuryCss = readFileSync(resolve(root,'luxury.css'),'utf8')
const luxuryJs = readFileSync(resolve(root,'luxury.js'),'utf8')
assert.ok(html.includes('href="./luxury.css?v=__OSGARD_BUILD_VERSION__"'), 'Premium OSGARD PLAY theme must be linked and versioned')
assert.ok(!html.includes('<script src="./luxury.js?v=__OSGARD_BUILD_VERSION__" defer>')&&html.includes('id="luxury-lazy-asset" data-src="/games/luxury.js?v=__OSGARD_BUILD_VERSION__"'), 'Premium catalogue enhancements must keep a versioned asset pointer without loading on initial page entry')
assert.ok(html.includes('<body class="luxury-entertainment">'), 'Premium body theme class is missing')
for (const feature of ['sortCards','launchRandom','updateResumeButton','navigator.share',"event.key === '/'","event.key.toLowerCase() === 'r'","event.key.toLowerCase() === 'f'"]) {
  assert.ok(luxuryJs.includes(feature), 'Premium catalogue action missing: '+feature)
}
assert.ok(luxuryJs.includes("osgard.games.recent.v1"), 'Premium resume control must reuse existing recent-game history')
assert.ok(luxuryJs.includes("announce('Поиск очищен.')\n    }\n  });\n\n  // Player Lab is lazy-loaded"), 'Keyboard listener must terminate before the following lazy IIFE to prevent runtime call-chaining errors')
assert.ok(luxuryCss.includes('.luxury-entertainment') && luxuryCss.includes('@media(max-width:760px)'), 'Premium theme or mobile layout missing')
assert.ok(luxuryCss.includes('@media(prefers-reduced-motion:reduce)'), 'Premium theme must respect reduced-motion preference')
assert.ok(luxuryCss.includes(':focus-visible') || html.includes(':focus-visible'), 'Keyboard-visible focus state must remain available')
new Function(luxuryJs)


assert.ok(html.includes('"name":"PATINA Atelier","url":"https://osgard.world/games/patina/"') && html.includes('data-game="patina"') && html.includes('data-favorite="patina"'), 'PATINA Atelier must be a first-class catalog game with its own canonical route')
assert.ok(html.includes('href="/game/patina"'),'PATINA secondary action must open its detail page, not relaunch the game')
assert.ok(patina.includes('<title>PATINA Atelier — OSGARD WORLD GAMING</title>') && patina.includes('data-patina-ready="true"') && patina.includes('id="patina-workbench"'), 'PATINA Atelier playable route or host handshake marker missing')
for(const feature of ['id="diagnose"','id="swab"','id="stabilize"','id="polish"','id="preserve"','id="finish-case"','id="export-case"','id="journal-list"','osgard:game-lifecycle','simulationOnly:true','localStorage.setItem(STORAGE_KEY']) assert.ok(patina.includes(feature),'PATINA gameplay feature missing: '+feature)
assert.ok(lifecycle.includes("patina:{title:'PATINA Atelier',url:'/games/patina/'}") && lifecycle.includes("if(id==='patina')return doc.body.dataset.patinaReady==='true'&&!!doc.querySelector('#patina-workbench')"),'Player lifecycle registry must detect a ready PATINA client')
assert.ok(manifest.includes("'patina'") && manifest.includes("title: 'PATINA ATELIER'") && manifest.includes("href: '/games/patina/'"),'Core manifest must register PATINA Atelier')
assert.ok(sitemap.includes('<loc>https://osgard.world/games/patina/</loc>'),'PATINA must be present in the XML sitemap')
assert.ok(!/src=["']https?:/i.test(patina) && !/<link[^>]*rel=["']stylesheet["'][^>]*href=["']https?:/i.test(patina),'PATINA must run without remote script or stylesheet dependencies')
const patinaScriptStart=patina.indexOf('<script>')+'<script>'.length
const patinaScriptEnd=patina.indexOf('</script>',patinaScriptStart)
const patinaInline=patina.slice(patinaScriptStart,patinaScriptEnd)
assert.ok(patinaInline&&patinaInline.length>5000,'PATINA self-contained gameplay script missing')
new Function(patinaInline)

assert.ok(luxuryCss.includes('content-visibility:auto') && luxuryCss.includes('contain-intrinsic-size:auto 500px') && luxuryCss.includes('contain-intrinsic-size:auto 840px'), 'Mobile layout should reserve enough space for off-screen cards and the contact panel')
assert.ok(luxuryCss.includes('.luxury-entertainment .catalog .grid{content-visibility:auto;contain-intrinsic-size:auto 5700px}') && luxuryCss.includes('.luxury-entertainment .daily-circuit-slot{content-visibility:auto;contain-intrinsic-size:auto 460px}'), 'Mobile first render should defer the eleven-card SVG grid and Daily Circuit panel until they approach the viewport')
assert.ok(luxuryCss.includes('.luxury-entertainment .hero-art svg{animation:none!important;transform:none!important}'), 'Mobile hero artwork must avoid continuous animation that competes with gameplay startup')
assert.ok(luxuryCss.includes('luxury-entertainment header{backdrop-filter:none'), 'Mobile layout should avoid expensive header blur')

const inviteScriptStart=html.indexOf("<script>\n(()=>{'use strict';")
assert.ok(inviteScriptStart>=0,'Games catalog runtime script missing for referral-link verification')
const inviteScriptBodyStart=inviteScriptStart+'<script>'.length
const inviteScriptEnd=html.indexOf('</script>',inviteScriptBodyStart)
assert.ok(inviteScriptEnd>inviteScriptBodyStart,'Games catalog runtime script closing tag missing')
const catalogRuntime=html.slice(inviteScriptBodyStart,inviteScriptEnd)
new Function(catalogRuntime)
for(const marker of ["og_ref","og_game","utm_source","utm_medium","utm_campaign","utm_content","function createInviteLink","function renderInviteRibbon","source:'referral_link'","referralCode:invite.code","if(!consent)return","if(!token)return"]) assert.ok(catalogRuntime.includes(marker),'Referral / privacy contract missing: '+marker)
assert.ok(catalogRuntime.includes("navigator.share({title:games[id].title+' — OSGARD PLAY'") && catalogRuntime.includes("url=createInviteLink(id)"),'Player-share action must produce a game-specific invite link')
assert.ok(catalogRuntime.includes("async function sendCommerceInviteEvent(gameId,code)") && catalogRuntime.includes("source:'game-invite:'+gameId+':'+code"),'Player-share events must include the same invitation code used by the generated link')
assert.ok(catalogRuntime.includes("void sendCommerceInviteEvent(id,referralCode)") && catalogRuntime.includes("if(!allowed()||!games[gameId]||!/^og_[a-f0-9]{8}$/.test(String(code||'')))return false"),'Share-event persistence must validate the game/code and require explicit analytics consent')
assert.ok(catalogRuntime.includes("'/v1/events'") && catalogRuntime.includes("name:'share_created'") && catalogRuntime.includes("consent:true"),'Player-share event must use the shared, consented Commerce API event contract')
assert.ok(lifecycle.includes("function shareReferralCode(payload)") && lifecycle.includes("localStorage.getItem('osgard.games.invite-code.v1')") && lifecycle.includes("const flowType=['daily-challenge','score-duel','solution-link','result-card','friend-invite'].includes(payload?.flowType)?payload.flowType:'generic';const source=name==='share_created'?(shareCode?'game-invite:'+activeGame+':'+shareCode:'game-share:'+activeGame+':'+flowType):analyticsSource()"),'In-game sharing must attach a validated referral code to the server funnel event')

assert.ok(catalogRuntime.includes('window.OSGARDInvite={createLink:(id)=>createInviteLink(id)') && luxury.includes('window.OSGARDInvite?.createLink()') && luxury.includes('window.OSGARDInvite?.trackShare?.()'),'Catalogue share control must use the same invite-link builder')
assert.ok(catalogRuntime.includes("const route=games[id]?'/games/invite/'+id+'/':'/games/invite/'"),'Every share should use a game-specific preview route before entering the catalogue')
assert.ok(luxuryCss.includes('.invite-ribbon') && luxuryCss.includes('@media(max-width:620px)') && luxuryCss.includes('prefers-reduced-motion:reduce'),'Referral invitation ribbon must be responsive and respect reduced motion')
assert.ok(catalogRuntime.includes("sessionStorage.setItem('osgard.games.invite-dismissed.v1',key)"),'Invite dismissal should be local to this browser session')
console.log('PASS OSGARD referral loop: game-specific invite deep links, consent-gated authenticated attribution, responsive invite ribbon and script syntax.')


const referralCoreSource=readFileSync(resolve('services/osgard-commerce-api/src/core.mjs'),'utf8')
const referralApiSource=readFileSync(resolve('services/osgard-commerce-api/src/server.mjs'),'utf8')
const referralAdminSource=readFileSync(resolve('public/games/commerce-admin/index.html'),'utf8')
assert.ok(recommendationScript.includes('osgard.games.referral-attribution.v1') && recommendationScript.includes('game-invite:') && recommendationScript.includes('play_with_friends'), 'Post-session invite link and referral attribution missing')
assert.ok(recommendationScript.includes("u.pathname==='/games/invite/'+id+'/") && recommendationScript.includes("new URL('/games/invite/'+encodeURIComponent(id)+'/',location.origin)"),'Unified OSGARD SELECT must validate and fallback to the game-specific preview route')
assert.ok(recommendationScript.includes("u.searchParams.get('og_game')===id") && recommendationScript.includes("u.searchParams.get('og_ref')||''") && recommendationScript.includes("u.searchParams.set('og_game',id)") && recommendationScript.includes("u.searchParams.set('og_ref','og_'"), 'Unified invite links must validate and emit canonical og_game/og_ref parameters')
assert.ok(recommendationScript.includes('!invite.legacy') && recommendationScript.includes("params.get('challenge')"), 'Canonical links must use one ribbon while legacy invite links remain supported')
assert.ok(recommendationScript.includes("sendEvent('referral_link_opened'") && recommendationScript.includes("sendSelectEvent('invite_link_prepared'"), 'Invite opens and canonical share flows must use the consented event API')
assert.ok(recommendationScript.includes("source==='osgard_play'") && recommendationScript.includes("campaign==='play_with_friends'") && recommendationScript.includes("campaign==='play_with_a_friend'"), 'Referral links must validate known UTM contracts')
assert.ok(recommendationScript.includes("sessionStorage.setItem(marker,'pending')") && recommendationScript.includes("state==='pending'"), 'Referral-open callbacks must be deduplicated before waiting on the network')
assert.ok(recommendationScript.includes('const pendingTelemetry=new Set()') && recommendationScript.includes('cancelPendingTelemetry()'), 'In-flight consented analytics must support cancellation on opt-out')
assert.ok(catalogRuntime.includes("campaign==='play_with_friends'") && catalogRuntime.includes("medium==='referral'"), 'The main catalogue must validate canonical invitation labels before attributing player events')
assert.ok(html.includes("params.get('utm_campaign')==='play_with_friends'") && html.includes("params.get('challenge')") && html.includes("params.get('utm_campaign')==='play_with_a_friend'"), 'Both canonical and legacy referral landings must load the invitation handler')
assert.ok(!recommendationScript.includes('function addPostSessionActions(gameId){') && !recommendationScript.includes('post-game-partner-studio'), 'The legacy second post-session panel must be absent; unified OSGARD SELECT owns sharing and offers')
const unifiedShareStart=recommendationScript.indexOf("primary.addEventListener('click',async()=>{",recommendationScript.indexOf('function rewardShelf(gameId){'))
const unifiedShareEnd=recommendationScript.indexOf(" const note=make('p','og-postgame-reward-note'",unifiedShareStart)
assert.ok(unifiedShareStart>=0&&unifiedShareEnd>unifiedShareStart,'Unified OSGARD SELECT share flow boundaries are required')
const unifiedShareHandler=recommendationScript.slice(unifiedShareStart,unifiedShareEnd)
assert.ok(unifiedShareHandler.includes('await navigator.share(')&&unifiedShareHandler.includes("pending='native-share'"),'The single intermission share flow must support native sharing')
const nativeShareAt=unifiedShareHandler.indexOf('await navigator.share(')
const nativeRegistrationAt=unifiedShareHandler.indexOf('const inviteRegistration=registerReferralInvite(gameId,inviteCode)')
assert.ok(nativeRegistrationAt>=0&&nativeRegistrationAt<nativeShareAt,'Invite registration should start before opening the native share sheet')
assert.ok(!unifiedShareHandler.slice(0,nativeShareAt).includes('await registerReferralInvite('),'Do not wait for network registration before invoking navigator.share; mobile browsers require the original user activation')
assert.ok(unifiedShareHandler.includes("sendSelectEvent('invite_link_prepared'")&&unifiedShareHandler.includes("sendSelectEvent('social_share_intent'"),'Canonical invites and social-share intent must go through consent-gated first-party analytics')
assert.ok(!unifiedShareHandler.includes('award(')&&!unifiedShareHandler.includes('grantReward('),'The share sheet itself must not automatically grant SHARDS')
assert.ok(recommendationScript.includes("['partner-studio','11','OSGARD PARTNER STUDIO','BRANDED GAMES / B2B'")&&recommendationScript.includes("'/games/partners/'"),'Partner Studio must be a selectable owned-service campaign in the unified intermission')
assert.ok(recommendationScript.includes("const url=new URL(item[5],location.origin)")&&recommendationScript.includes("const u=new URL(href,location.origin)"),'The same campaign renderer must safely support external URLs and first-party Partner Studio route')
assert.ok(recommendationScript.includes("sendSelectEvent('cross_promo_clicked',gameId,'osgard-select:click:'+id)")&&recommendationScript.includes("claimPromoImpression('card:'+gameId+':'+serviceId)"),'Partner Studio must use the same consent-gated click and genuinely-visible impression rules as other services')
assert.ok(recommendationStyles.includes('.og-postgame-service-card')&&recommendationStyles.includes('@media(max-width:760px)')&&recommendationStyles.includes('prefers-reduced-motion:reduce'),'The unified service card system must remain responsive and respect reduced-motion settings')
assert.ok(recommendationScript.includes("async function sendSelectEvent(name,gameId,source)")&&recommendationScript.includes('if(!hasConsent())return false'),'Owned-service exposure must remain behind explicit analytics consent')
assert.ok(recommendationScript.includes("setTimeout(()=>refreshCurrentServiceShelf(),0)")&&recommendationScript.includes("section.__osgardRefreshImpressions=()=>{"),'Changing analytics consent must re-arm existing owned-promo visibility observers without rebuilding the post-game UI')
assert.ok(recommendationScript.includes("cardObserver.unobserve(card);")&&recommendationScript.includes("cardObserver.observe(card);"),'Cards that remain visible when consent is enabled must be eligible for a fresh measured impression')
const postGameIds=['marcosa','projects','o2-system','senjorio','superday','myosa','gold-glamour','gardvpn','osgard-business','vanguard','partner-studio'];
for(const id of postGameIds)assert.ok(recommendationScript.includes("['"+id+"'"),'Post-game service missing: '+id);
for(const domain of ['marcosa.club','osgardbewworld.com','o2system.art','senjorio.com','superday.run','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio'])assert.ok(recommendationScript.includes(domain),'Service URL missing: '+domain);
assert.ok(recommendationScript.includes("['projects','01','OSGARD BEW WORLD'") && recommendationScript.includes("['osgard-business','09','OSGARD OS'") && recommendationScript.includes("['vanguard','10','OSGARD VANGUARD STUDIO'") && recommendationScript.includes("['partner-studio','11','OSGARD PARTNER STUDIO'"),'Post-session cards must use the official OSGARD product names');
assert.ok(html.includes('<b>OSGARD BEW WORLD</b>') && html.includes('<b>OSGARD OS</b>') && html.includes('<b>OSGARD VANGUARD STUDIO</b>'),'Games hub ecosystem cards must use the same official product names');
assert.ok(!html.includes('<b>OSGARD PROJECTS</b>') && !html.includes('<b>OSGARD BUSINESS</b>') && !html.includes('<b>OSGARD VANGUARD</b>'),'Retired shorthand names must not drift back into the visible Games hub');
assert.ok(recommendationScript.includes("['o2-system','02','O2 SYSTEM','BUSINESS OPERATIONS','Система учёта кассы обменников'") && recommendationScript.includes("['myosa','06','MYOSA','AI PLATFORM','Платформа искусственного интеллекта нового поколения'"),'Post-session cards must retain the intended product descriptions');
assert.ok(/\['gardvpn','08','GARD VPN'[^\n]+false,false\]/.test(recommendationScript)&&recommendationScript.includes('Временно не продвигается: главная страница не подтверждает, что VPN-соединение действительно устанавливается.'),'GARD VPN must be unavailable in promotions until connection health is verified');
for(const provider of ['t.me/share/url','wa.me/?text=','vk.com/share.php','twitter.com/intent/tweet','facebook.com/sharer/sharer.php'])assert.ok(recommendationScript.includes(provider),'Social share redirect missing: '+provider);
assert.ok(recommendationScript.includes("u.searchParams.set('utm_medium','post_game')")&&recommendationScript.includes("u.searchParams.set('utm_campaign','after_game')"),'Post-game links require UTM attribution');
assert.ok(recommendationScript.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50")&&recommendationScript.includes('current.day===day'),'SHARDS must persist locally and be capped once per UTC day');
assert.ok(recommendationScript.includes('Я опубликовал — получить +50 SHARDS')&&recommendationScript.includes('Соцсеть не сообщает сайту подтверждение публикации')&&recommendationScript.includes('не являются платёжным средством'),'Social reward must disclose self-confirmation and non-monetary points');
assert.ok(recommendationStyles.includes('.og-postgame-services')&&recommendationStyles.includes('.og-postgame-service-grid')&&recommendationStyles.includes('.og-postgame-reward')&&recommendationStyles.includes('@media(max-width:760px)')&&recommendationStyles.includes('prefers-reduced-motion:reduce'),'Postgame UI must be premium, responsive and accessible');
assert.ok(recommendationScript.includes('РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD')&&recommendationScript.includes('osgardServiceFilter')&&recommendationScript.includes('categoryByService'),'OSGARD SELECT must disclose self-promotion and let players filter service offers by category');
assert.ok(recommendationScript.includes("['all','Все доступные · '+availableServiceIds.length]")&&recommendationScript.includes("['studio','Разработка · 3']")&&recommendationScript.includes("['luxury','Luxury · 1']"),'OSGARD SELECT filters must expose all configured service categories');
assert.ok(recommendationScript.includes("sendSelectEvent('cross_promo_clicked',gameId,'osgard-select:click:'+id)")&&recommendationScript.includes("'owned_promo_impression'"),'Every active OSGARD SELECT service card must emit service-attributed click and exposure events');
assert.ok(recommendationScript.includes('function hasConsent()')&&recommendationScript.includes('function sendSelectEvent(name,gameId,source)'), 'OSGARD SELECT must define its own consent-gated analytics functions')
assert.ok(recommendationScript.includes("fetch('/games/commerce-config.json'")&&recommendationScript.includes("base+'/v1/events'")&&recommendationScript.includes("localStorage.getItem(selectConsentKey)==='yes'")&&recommendationScript.includes('if(!rawBase)return false'), 'OSGARD SELECT must post only to a configured API after consent')
const selectSenderStart=recommendationScript.indexOf('async function sendSelectEvent(name,gameId,source){');
const selectSenderEnd=recommendationScript.indexOf('function readServicePreferences(){',selectSenderStart);
assert.ok(selectSenderStart>=0&&selectSenderEnd>selectSenderStart,'OSGARD SELECT sender must remain independently testable');
const selectSender=recommendationScript.slice(selectSenderStart,selectSenderEnd);
assert.ok(recommendationScript.includes('const pendingSelectTelemetry=new Set()')&&recommendationScript.includes('function cancelPendingSelectTelemetry()')&&recommendationScript.includes('controller.abort()'),'OSGARD SELECT must cancel in-flight requests when analytics consent is withdrawn');
assert.ok(recommendationScript.includes('checkSelectConsentAfterToggle()')&&recommendationScript.includes("target.closest('#analytics-toggle')"),'OSGARD SELECT must observe the consent control when it is changed or clicked');
assert.ok(selectSender.includes('if(controller)options.signal=controller.signal')&&selectSender.includes('if(controller)request.signal=controller.signal'),'Consent cancellation must abort both config and event POST requests');
assert.ok((selectSender.match(/if\(!hasConsent\(\)\|\|\(controller&&controller\.signal\.aborted\)\)return false/g)||[]).length>=3,'Consent must be rechecked after network awaits before posting and accepting analytics');
assert.ok(selectSender.includes('finally{if(controller)pendingSelectTelemetry.delete(controller)}'),'Completed or aborted telemetry requests must release their controller');
assert.ok(recommendationScript.includes("sendSelectEvent('social_share_intent'")&&recommendationScript.includes("sendSelectEvent('social_reward_claimed'"), 'Social share-intent and self-reported reward events must be separate')
assert.equal((recommendationScript.match(/if\(queue&&typeof queue\.enqueue==='function'\)return queue\.enqueue\(event\)/g)||[]).length,2,'Referral/inter-session and OSGARD SELECT telemetry must both use the shared consented retry queue');
for(const eventName of ['owned_promo_intermission_skipped','owned_promo_preferences_saved','social_share_intent','social_reward_claimed','owned_promo_impression']) assert.ok(consentedAnalytics.includes("'"+eventName+"'"),'Consent queue must allow existing OSGARD SELECT event: '+eventName);
const rewardClaimStart=recommendationScript.indexOf("claim.addEventListener('click',()=>{",recommendationScript.indexOf('function rewardShelf(gameId){'));
const rewardClaimEnd=recommendationScript.indexOf(" primary.addEventListener('click',async()=>{",rewardClaimStart);
assert.ok(rewardClaimStart>=0&&rewardClaimEnd>rewardClaimStart,'Reward claim handler boundaries are required');
const rewardClaimHandler=recommendationScript.slice(rewardClaimStart,rewardClaimEnd);
assert.ok(rewardClaimHandler.includes("sendSelectEvent('social_reward_claimed'")&&!rewardClaimHandler.includes("sendSelectEvent('share_created'"), 'A player-confirmed reward claim must not be counted as a created share');
assert.ok(rewardClaimHandler.includes("award('social-confirmation:'+network)"), 'A share reward must remain a separate local player-confirmed action');
const rewardPrimaryStart=recommendationScript.indexOf("primary.addEventListener('click',async()=>{",recommendationScript.indexOf('function rewardShelf(gameId){'));
const rewardPrimaryEnd=recommendationScript.indexOf(" const note=make('p','og-postgame-reward-note'",rewardPrimaryStart);
assert.ok(rewardPrimaryStart>=0&&rewardPrimaryEnd>rewardPrimaryStart,'OSGARD SELECT reward-share handler boundaries are required');
const rewardPrimaryHandler=recommendationScript.slice(rewardPrimaryStart,rewardPrimaryEnd);
assert.ok(!rewardPrimaryHandler.includes('show(award('),'OSGARD SELECT must not award automatically when native share succeeds or a link is copied');
assert.ok(rewardPrimaryHandler.includes("pending='native-share'")&&rewardPrimaryHandler.includes("claim.hidden=false")&&rewardPrimaryHandler.includes('Копирование само по себе не считается репостом и не даёт награду'),'Native sharing must require confirmation and clipboard copy must not award');
assert.ok(recommendationScript.includes("award('social-confirmation:'+network)")&&recommendationScript.includes('не чаще раза в UTC-день на этом устройстве'),'Social reward is self-confirmed, local and daily-capped');
assert.ok(referralApiSource.includes('facebook|native-share') && referralApiSource.includes('osgard-social-share:(telegram|whatsapp|vk|x|facebook|native-share)'), 'Commerce API social channel aggregation must include native Web Share events and claims');
assert.ok(referralAdminSource.includes("'native-share': 'Системное меню отправки'"), 'Protected commerce admin must render native Web Share as a readable social channel');
assert.ok(recommendationScript.includes("entry.intersectionRatio>=0.5")&&recommendationScript.includes("},1000)")&&recommendationScript.includes('card.isConnected')&&recommendationScript.includes('card.getClientRects().length'),'A promo exposure must require at least 50% visibility for a full second on a connected, visible card');
assert.ok(referralCoreSource.includes('"owned_promo_impression"'),'Commerce API must allow the explicit owned-promo impression event');
assert.ok(referralApiSource.includes("source ~ '^osgard-select:spotlight:[a-z0-9-]{1,40}:[abc]$'")&&referralApiSource.includes("source ~ '^osgard-select:impression:[a-z0-9-]{1,40}$'")&&referralApiSource.includes("source ~ '^osgard-select:click:[a-z0-9-]{1,40}(:[abc])?$'")&&referralApiSource.includes('ownedPromoByService: ownedPromoByService.rows'),'Admin analytics API must use all valid service-card and spotlight impressions and clicks per service/game')
assert.ok(referralAdminSource.includes('id="owned-promo-body"')&&referralAdminSource.includes('renderOwnedPromo(overview.ownedPromoByService || [])')&&referralAdminSource.includes('CTR по появлениям'),'Protected commerce admin must report own-service exposure, clicks and CTR');
assert.ok(referralAdminSource.includes('id="analytics-social-share-intents"')&&referralAdminSource.includes('id="analytics-social-reward-claims"')&&referralAdminSource.includes('funnel.socialShareIntents')&&referralAdminSource.includes('funnel.socialRewardClaims'),'Protected commerce dashboard must distinguish social share intents from self-reported reward claims')

assert.ok(recommendationScript.includes("const servicePreferencesKey='osgard.games.postgame-service-preferences.v1'")&&recommendationScript.includes("const frequencyValues=['each','every3','off']")&&recommendationScript.includes("frequency==='every3'")&&recommendationScript.includes("frequency==='off'"),'Service preferences must persist all three promo frequency choices')
assert.ok(recommendationScript.includes('availableServiceIds.filter(id=>Array.isArray(value.selected)&&value.selected.includes(id))')&&recommendationScript.includes('preferences.selected.includes(id)'), 'Only services selected by the player should be actively promoted')
assert.ok(recommendationScript.includes("localStorage.setItem(serviceProgressKey,JSON.stringify(next))")&&recommendationScript.includes('completedCount%3===0'),'Promo caps must count completed game sessions, not page visits')
assert.ok(!recommendationScript.includes("sendEvent('partner_impression'"),'Do not synthesize sponsor impressions without an ad measurement signal')
assert.ok(recommendationStyles.includes('.og-postgame-preferences')&&recommendationStyles.includes('.og-postgame-service-options')&&recommendationStyles.includes('.og-postgame-frequency')&&recommendationStyles.includes('@media(max-width:360px)'),'Promo preference controls must be responsive on mobile')

assert.ok(recommendationStyles.includes('.og-postgame-service-filters')&&recommendationStyles.includes('.og-postgame-service-filter[aria-pressed="true"]')&&recommendationStyles.includes('.og-postgame-service-card[hidden]'),'Service filters need accessible selected states and must reliably hide unmatched cards');

assert.ok(lifecycle.includes('function analyticsSource()') && lifecycle.includes(':analyticsSource()') && lifecycle.includes("return 'referral:'+code+':null-shift'"), 'Actual gameplay sessions must preserve consented invite attribution')
assert.ok(referralCoreSource.includes('"referral_link_opened"') && referralCoreSource.includes('"share_created"'), 'Commerce API must explicitly allowlist invite events')
for(const metric of ['inviteShares','referralOpens','referredStarts','referredCompletions']) assert.ok(referralApiSource.includes(metric), 'Commerce analytics response lacks referral metric '+metric)
assert.ok(recommendationScript.includes('function canPersistReferralWallet()') && recommendationScript.includes("reason:'wallet-storage'"), 'A referral claim must not be consumed when the local cosmetic wallet cannot be persisted');
assert.ok(recommendationScript.includes("const referralOwnerKey='osgard.games.referral-owner.v1'") && recommendationScript.includes("postReferralRequest('/v1/referrals/register'") && recommendationScript.includes("postReferralRequest('/v1/referrals/prepare-claim'") && recommendationScript.includes("postReferralRequest('/v1/referrals/ack'"), 'OSGARD SELECT must register invite codes and use the retry-safe prepare/ack reward API')
assert.ok(recommendationScript.includes('function addQualifiedReferralShards(claims)') && recommendationScript.includes('qualifiedClaims') && recommendationScript.includes('receipt-ID') && recommendationScript.includes('не короче 30 секунд'), 'Qualified referral rewards must persist per-invite receipt IDs, be retry-safe and stay separate from self-confirmed social rewards')
assert.ok(recommendationScript.includes("sendSelectEvent('referral_reward_claimed'"), 'A server-confirmed referral award must have its own analytics event')
assert.ok(referralCoreSource.includes('validateReferralRegistrationPayload') && referralCoreSource.includes('validateReferralClaimPayload') && referralCoreSource.includes('validateReferralClaimAckPayload'), 'Commerce API must validate owner tokens and referral codes before registration, prepare and acknowledgement')
assert.ok(referralApiSource.includes('app.post("/v1/referrals/register"') && referralApiSource.includes('app.post("/v1/referrals/prepare-claim"') && referralApiSource.includes('app.post("/v1/referrals/ack"') && referralApiSource.includes('commerce_referral_invites'), 'Commerce API must persist invite ownership and expose idempotent prepare/ack endpoints')
assert.ok(referralApiSource.includes("INTERVAL '30 seconds'") && referralApiSource.includes('e.duration_seconds') && referralApiSource.includes('ON CONFLICT (referral_code) DO NOTHING'), 'A qualified reward must require a server-timed completed session, and invite ownership must not be overwritten')
assert.ok(referralApiSource.includes('verifiedReferralRewards: referralRewardStats.rows[0]') && referralAdminSource.includes('id="analytics-qualified-referrals"') && referralAdminSource.includes('id="analytics-qualified-shards"'), 'Protected admin must report server-qualified rewards separately from self-claimed social rewards')
assert.ok(referralCoreSource.includes('"referral_reward_claimed"') && consentedAnalytics.includes("'referral_reward_claimed'"), 'Qualified-reward analytics must remain allow-listed and consent-gated')
const inviteSqlStart=referralApiSource.indexOf('invite_shares AS')
const inviteSqlEnd=referralApiSource.indexOf('SELECT\n          COUNT(*) FILTER',inviteSqlStart)
const inviteSql=referralApiSource.slice(inviteSqlStart,inviteSqlEnd)
assert.equal(inviteSql.split("~ '^(og_[a-f0-9]{8}|[a-f0-9]{12})$'").length-1,4,'All four share/open/start/completion SQL stages must accept canonical and legacy invite codes')
for(const metric of ['analytics-invites','analytics-referral-opens','analytics-referred-starts','analytics-referred-completions']) assert.ok(referralAdminSource.includes('id="'+metric+'"'), 'Commerce admin is missing referral metric '+metric)

 
// The root Entertainment gateway must expose the existing OSGARD SELECT cross-promo
// and the labelled, scenario-based monetisation page without implying live advertising revenue.
assert.ok(appSource.includes('OSGARD SELECT / BETWEEN WORLDS') && appSource.includes('play-economy-strip'), 'Entertainment gateway must introduce the post-game OSGARD SELECT loop')
assert.ok(appSource.includes("PlaySelectLoop locale={locale}"), 'Main Entertainment gateway must mount OSGARD SELECT')
assert.ok(playSelectSource.includes('OSGARD SELECT / OWNED PROJECTS') && playSelectSource.includes('РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ'), 'First-party services must be explicitly disclosed')
assert.ok(['marcosa.club','osgardbewworld.com','o2system.art','senjorio.com','superday.run','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio'].every(domain=>playSelectSource.includes(domain)), 'Entertainment gateway must include all ten owner-provided services')
assert.ok(playSelectSource.includes("id: 'partner-studio'")&&playSelectSource.includes("url: '/games/partners/'")&&playSelectSource.includes('new URL(service.url, window.location.origin)'), 'Entertainment gateway must include a measurable first-party Partner Studio campaign without breaking relative URL handling')
assert.ok(['OSGARD BEW WORLD','O2 SYSTEM','SENJORIO','SUPERDAY','MARCOSA','MYOSA','GOLD GLAMOUR','GARD VPN','OSGARD OS','OSGARD VANGUARD STUDIO'].every(name=>playSelectSource.includes(name)), 'The Entertainment gateway must use the official product names')
assert.ok(playSelectSource.includes("utm_source', 'osgard_world'")&&playSelectSource.includes("utm_medium', 'entertainment_select'")&&playSelectSource.includes("utm_campaign', 'between_worlds'")&&playSelectSource.includes("utm_content', service.id"), 'Every Entertainment project card must carry distinct campaign attribution')
assert.ok(playSelectSource.includes("const PROMOTABLE_SERVICE_IDS = services.filter(service => service.id !== 'gardvpn').map(service => service.id)") &&
  playSelectSource.includes("const limitedVerification = service.id === 'gardvpn'") &&
  playSelectSource.includes('disabled={limitedVerification}') &&
  playSelectSource.includes('VPN-подключение не проверено') &&
  playSelectSource.includes('VPN-ПОДКЛЮЧЕНИЕ НЕ ПРОВЕРЕНО · ПРОМО ОТКЛЮЧЕНО') &&
  playSelectSource.includes('return <article key={service.id} className="play-select-service is-limited-verification"') &&
  appStyles.includes('.play-select-preference-option.is-limited-verification'),
  'GARD VPN must remain disclosed in the owner inventory but excluded from clickable promotions until VPN connectivity is verified')
assert.ok(playSelectSource.includes("const WALLET_KEY = 'osgard.games.shards-wallet.v1'") && playSelectSource.includes('current.day === today') && playSelectSource.includes('current.balance + 50'), 'Homepage must use shared SHARDS wallet and UTC-day cap')
assert.ok(playSelectSource.includes('navigator.share') && playSelectSource.includes('navigator.clipboard && navigator.clipboard.writeText') && ['Telegram','WhatsApp','VK','X','Facebook'].every(network=>playSelectSource.includes("name: '"+network+"'")), 'Homepage must offer native/clipboard sharing and five social composers')
const homeShareStart=playSelectSource.indexOf('const shareInvite = async () => {');
const homeShareEnd=playSelectSource.indexOf('\n\n  return <section',homeShareStart);
assert.ok(homeShareStart>=0&&homeShareEnd>homeShareStart,'Homepage share handler boundaries are required');
const homeShareHandler=playSelectSource.slice(homeShareStart,homeShareEnd);
assert.ok(!homeShareHandler.includes('grantReward(')&&homeShareHandler.includes("setPendingNetwork('native-share')")&&homeShareHandler.includes('Копирование само по себе не считается репостом'),'Homepage must require explicit confirmation; copy alone cannot grant SHARDS');
assert.ok(playSelectSource.includes("pendingNetwork === 'native-share'")&&playSelectSource.includes("grantReward('homepage-social-confirmation:' + pendingNetwork)"),'Homepage SHARDS grant must be reached only through its explicit claim button');
assert.ok(playSelectSource.includes('Отправка отменена — награда не начислена.') && playSelectSource.includes('не являются деньгами'), 'Cancelled shares must not earn and SHARDS must be disclosed as non-monetary')
assert.ok(appStyles.includes('.play-select-loop') && appStyles.includes('.play-select-layout') && appStyles.includes('@media(max-width:600px)') && appStyles.includes('prefers-reduced-motion:reduce'), 'OSGARD SELECT must be responsive and respect reduced motion')
assert.ok(appSource.includes('href="/games/?utm_source=osgard_world&amp;utm_medium=entertainment&amp;utm_campaign=between_worlds"'), 'Entertainment gateway must link into the playable hub with campaign attribution')
assert.ok(appSource.includes('href="/games/monetization/?utm_source=osgard_world&amp;utm_medium=entertainment&amp;utm_campaign=economy_model"'), 'Entertainment gateway must link to the scenario economy model')
assert.ok(appSource.includes('публикацию нельзя проверить автоматически') && appSource.includes('Это не деньги'), 'SHARDS must be disclosed as non-monetary with social-post verification limits')
assert.ok(appStyles.includes('.play-economy-strip') && appStyles.includes('@media(max-width:760px)') && appStyles.includes('prefers-reduced-motion:reduce'), 'Entertainment economy teaser needs responsive and reduced-motion styling')


const promoVariantSource=readFileSync(resolve('public/games/game-session-recommendations.js'),'utf8')
const promoVariantApi=readFileSync(resolve('services/osgard-commerce-api/src/server.mjs'),'utf8')
const promoVariantAdmin=readFileSync(resolve('public/games/commerce-admin/index.html'),'utf8')
assert.ok(promoVariantSource.includes("const sessionSpotlightVariant=getSessionSpotlightVariant()") && promoVariantSource.includes("osgard.games.select-spotlight-variant.v1") && promoVariantSource.includes("spotlightVariant=sessionSpotlightVariant") && promoVariantSource.includes("roll<1/3?'a':roll<2/3?'b':'c'"), 'OSGARD SELECT must keep one of three CTA variants stable for the browser tab session')
assert.ok(promoVariantSource.includes("variant==='a'?'Открыть официальный сайт ↗':variant==='b'?'Изучить сервис ↗':'Посмотреть возможности ↗'"), 'A/B/C experiment must compare three distinct Russian CTA labels')
assert.ok(promoVariantSource.includes("'osgard-select:spotlight:'+serviceId+':'+variant") && promoVariantSource.includes("'osgard-select:click:'+item[0]+':'+variant"), 'Experiment impressions and CTA clicks must carry the same variant label')
assert.ok(promoVariantSource.includes("claimPromoImpression('spotlight-click:'+seenKey)") && promoVariantSource.includes("canCountSpotlightImpression(spotlightIsVisible,hasConsent(),spotlight.isConnected,spotlight.hidden,document.visibilityState!=='visible',spotlight.dataset.service,item[0])") && promoVariantSource.includes("sendSelectEvent('owned_promo_impression',gameId,'osgard-select:spotlight:'+item[0]+':'+variant)"), 'Spotlight clicks must be deduplicated and qualify as exposures only while the observed spotlight is visible after consent')
assert.ok(promoVariantApi.includes('ownedPromoVariantStats') && promoVariantApi.includes("source ~ '^osgard-select:(spotlight|click):[a-z0-9-]{1,40}:[abc]$'"), 'Commerce API must aggregate only well-formed A/B/C experiment events')
assert.ok(promoVariantApi.includes("event_name = 'owned_promo_impression'") && promoVariantApi.includes("source ~ '^osgard-select:spotlight:[a-z0-9-]{1,40}:[abc]$'") && promoVariantApi.includes("source ~ '^osgard-select:click:[a-z0-9-]{1,40}(:[abc])?$'"), 'Service CTR aggregation must only include valid spotlight impressions and outbound service clicks')
assert.ok(promoVariantAdmin.includes('id="owned-promo-variant-table"') && promoVariantAdmin.includes('renderPromoVariants(overview.ownedPromoVariantStats || [])'), 'Protected admin dashboard must render experiment results')

assert.ok(cascadeDirector.includes("const VERSION='0.24.0'") && cascadeDirector.includes("const SCHEMA='osgard.cascade-lab.mission-director.v1'") && !cascadeDirector.includes('fetch(') && !cascadeDirector.includes('sendBeacon('), 'Mission Director must remain local-only')

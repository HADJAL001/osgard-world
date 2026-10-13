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
const appSource = readFileSync(resolve('src/App.tsx'),'utf8')
const appStyles = readFileSync(resolve('src/styles.css'),'utf8')
const root=resolve('public/games')
execFileSync(process.execPath,[resolve('scripts/generate-games-share-cards.mjs')],{stdio:'ignore'})
const html=readFileSync(resolve(root,'index.html'),'utf8')
const catalogCards=[...html.matchAll(/<article\b[^>]*\bdata-game="([^"]+)"[^>]*\bdata-genres="([^"]+)"[^>]*>/g)].map(match=>({id:match[1],genres:match[2].trim().split(/\s+/).filter(Boolean)}))
const deployWorkflow=readFileSync(resolve('.github/workflows/deploy-frontend.yml'),'utf8')
const routeMatrix=readFileSync(resolve('scripts/production-route-matrix.mjs'),'utf8')
assert.ok(routeMatrix.includes("route === '/games/invite/invite-landing.js'") && routeMatrix.includes("name: 'referral_link_opened'") && routeMatrix.includes("osgard.games.referral-attribution.v1"),'Production route matrix must validate invite JavaScript using its own referral-event contract, not the unrelated SkillCred contract')
assert.ok(routeMatrix.includes('const ROUTE_TIMEOUT_MS = 10000') && routeMatrix.includes('signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS)'),'Production route and asset requests must have bounded timeouts')
const launchMapStart=html.indexOf('games={')
const launchMapEnd=html.indexOf('},read=',launchMapStart)
assert.ok(launchMapStart>=0&&launchMapEnd>launchMapStart,'Games launch registry is missing or malformed')
const launchMap=html.slice(launchMapStart,launchMapEnd)
const routeEntries=[...launchMap.matchAll(/(?:'([^']+)'|([a-z][a-z-]*)):\{title:'([^']+)',url:'([^']+)'\}/g)].map(m=>({id:m[1]||m[2],title:m[3],url:m[4]}))
const expectedLaunchIds=['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','aether-grid'].sort()
assert.equal(routeEntries.length,10,'Launch registry must contain exactly ten game entries')
assert.deepEqual(routeEntries.map(x=>x.id).sort(),expectedLaunchIds,'Every visible game must have exactly one unique launch route')
assert.ok(routeEntries.every(x=>x.url.startsWith('/games/')),'Every launch entry must use a same-origin game route')
const inviteLandingScript=readFileSync(resolve(root,'invite/invite-landing.js'),'utf8')
assert.ok(inviteLandingScript.includes("localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'") && inviteLandingScript.includes("name: 'referral_link_opened'") && inviteLandingScript.includes("source: 'referral-link:' + code"),'Invite preview must preserve consent-gated referral attribution')
assert.ok(inviteLandingScript.includes("game === 'aether-grid' ? '/games/aether-grid/' : '/games/'") && inviteLandingScript.includes("target.searchParams.set('day', aetherDay)"), 'AETHER GRID invite must preserve the shared daily seed')
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

assert.ok(html.includes('href="./daily-circuit.css?v=__OSGARD_BUILD_VERSION__"')&&html.includes('src="./daily-circuit.js?v=__OSGARD_BUILD_VERSION__"'),'Daily Circuit assets must be linked with the release version marker')
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
assert.equal(nullDailyCircuitShare.pathname,'/games/null-shift-godot/')
assert.equal(nullDailyCircuitShare.searchParams.get('challenge'),'NS-20261013-C3','NULL//SHIFT daily code must match the UTC Godot contract selector')
assert.equal(nullDailyCircuitShare.searchParams.get('ref'),'og_01234567')
assert.equal(nullDailyCircuitShare.searchParams.get('utm_campaign'),'play_with_friends')
assert.throws(()=>dailyCircuitCore.challengeCode('2026-02-30'),/valid UTC calendar date/i)
assert.throws(()=>dailyCircuitCore.routeFor('unknown',fixedDailyCircuitDate,'https://osgard.world'),/Unsupported daily route/i)
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
const aetherGame=readFileSync(resolve(root,'aether-grid/index.html'),'utf8')
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
const required=['data-game="null-shift"','data-game="time"','data-game="swarm"','data-game="inherit"','data-game="remix"','data-game="civic-cascade"','data-game="patina"','data-game="signal-run"','data-game="cascade-lab"','data-game="aether-grid"','id="games-grid"','id="game-search"','data-filter="tactical"','data-filter="arcade"','id="player-dialog"','id="player-share"','id="player-fullscreen"','id="analytics-toggle"','id="project-form"','https://wa.me/79640027222','osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio','/games/favicon.svg','/privacy/','/terms/']
for(const item of required) assert.ok(html.includes(item),'Games hub missing: '+item)
assert.ok(appSource.includes('className="play-catalog-link" href="/games/"')&&appSource.includes('<em>OSGARD WORLD GAMING</em>')&&appSource.includes("'Открыть игровой портал'"),'Homepage entertainment gateway must promote OSGARD WORLD GAMING and open the canonical /games/ hub')
assert.ok(appSource.includes('className="play-quick-picks"')&&appSource.includes("aria-label={ru ? 'Быстрый запуск игр' : 'Quick launch games'}")&&appSource.includes('QUICK START'),'Homepage must expose a labelled quick-launch section in both locales')
for (const route of ['/games/swarm/','/games/inherit/','/games/signal-run/']) assert.ok(appSource.includes('href="'+route+'"'),'Homepage quick-launch route missing: '+route)
for (const path of ['public/games/swarm/index.html','public/games/inherit/index.html','public/games/signal-run/index.html']) assert.ok(existsSync(resolve(path)),'Homepage quick-launch target is missing: '+path)
assert.ok(appStyles.includes('.play-quick-picks{display:grid;grid-template-columns:auto repeat(3,minmax(0,1fr))')&&appStyles.includes('@media(max-width:760px){.play-quick-picks{grid-template-columns:1fr}'),'Quick-launch strip must have desktop and mobile layouts')
assert.ok(appStyles.includes('.play-quick-link:focus-visible')&&appStyles.includes('@media(prefers-reduced-motion:reduce){.play-quick-link'),'Quick-launch links must retain keyboard focus and reduced-motion support')
assert.ok(html.includes('<title>OSGARD WORLD GAMING — Игровая платформа</title>')&&html.includes('og:title" content="OSGARD WORLD GAMING — игровые миры')&&html.includes('"name":"OSGARD WORLD GAMING"'),'Gaming hub identity must be consistent in title, social metadata and structured data')
assert.ok(html.includes('OSGARD WORLD GAMING <span>/</span> DIGITAL WORLDS')&&html.includes('быстрый возврат к недавним сессиям'),'Gaming hub hero must describe the branded portal and its actual navigation features')
for(const path of ['public/games/index.html','public/games/favicon.svg','public/games/player-lifecycle.js','public/games/game-session-recommendations.js','public/games/game-session-recommendations.css','public/games/admin/index.html','public/games/admin/partners/index.html','public/games/civic-cascade/index.html','public/games/patina/index.html','public/games/signal-run/index.html','public/games/signal-run/game.js','public/games/signal-run/daily.js','public/games/cascade-lab/index.html','public/games/aether-grid/index.html','public/privacy/index.html','public/terms/index.html']) assert.ok(existsSync(resolve(path)),'Missing file: '+path)
for(const path of ['scripts/games-lighthouse-report.mjs','.github/workflows/games-lighthouse.yml']) assert.ok(existsSync(resolve(path)),'Missing games performance monitoring file: '+path)
const lighthouseScript=readFileSync(resolve('scripts/games-lighthouse-report.mjs'),'utf8')
const lighthouseWorkflow=readFileSync(resolve('.github/workflows/games-lighthouse.yml'),'utf8')
assert.ok(lighthouseWorkflow.includes('https://osgard.world/games/')&&lighthouseWorkflow.includes('--preset=desktop')&&lighthouseWorkflow.includes('actions/upload-artifact@v4'),'Games Lighthouse workflow must audit mobile/desktop and preserve reports')
assert.ok(lighthouseWorkflow.includes('workflow_run')&&lighthouseWorkflow.includes('OSGARD frontend deploy'),'Games Lighthouse audit should run after successful publication')
assert.ok(html.includes('<meta name="osgard-build" content="__OSGARD_BUILD_VERSION__">'),'Games hub must carry a release marker that is stamped at packaging time')
assert.ok(!html.includes('<link rel="stylesheet" href="/games/game-session-recommendations.css?v=__OSGARD_BUILD_VERSION__">'),'Recommendation CSS must not block the initial catalogue render')
assert.ok(!html.includes('<script src="./player-lifecycle.js?v=__OSGARD_BUILD_VERSION__" defer>')&&!html.includes('<script src="./game-session-recommendations.js?v=__OSGARD_BUILD_VERSION__" defer>'),'Gameplay lifecycle and referral modules must not be eagerly downloaded on the landing view')
const lazyRuntimeMatch=html.match(/<script id="games-lazy-runtime">([\s\S]*?)<\/script>/)
assert.ok(lazyRuntimeMatch,'The Games hub must provide the on-demand runtime loader')
const lazyRuntime=lazyRuntimeMatch[1]
new Function(lazyRuntime)
for(const marker of ["function loadPlayerRuntime()","function loadRecommendations()","loadScript('player-lifecycle.js')","loadScript('game-session-recommendations.js')","link.dataset.osgardLazy='recommendations-css'","event.stopImmediatePropagation()","playPending()","playerState==='failed'","meta[name=\"osgard-build\"]"]) assert.ok(lazyRuntime.includes(marker),'Lazy-load contract missing: '+marker)
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
assert.ok(lighthouseWorkflow.includes('EXPECTED_DEPLOY_SHA')&&lighthouseWorkflow.includes('osgard-build')&&lighthouseWorkflow.includes('luxury.css?v=$expected')&&lighthouseWorkflow.includes('daily-circuit.css?v=$expected')&&lighthouseWorkflow.includes('daily-circuit.js?v=$expected')&&lighthouseWorkflow.includes("versioned('/games/'+path)")&&lighthouseWorkflow.includes("loadScript('player-lifecycle.js')")&&!lighthouseWorkflow.includes('player-lifecycle.js?v=$expected'),'Games Lighthouse must verify versioned assets and the actual lazy-loader contract')
const healthyScores={performance:.95,accessibility:1,'best-practices':1,seo:1}
const fixture=(scores,tbt,lcp)=>({finalDisplayedUrl:'https://osgard.world/games/',categories:Object.fromEntries(Object.entries(scores).map(([key,score])=>[key,{score}])),audits:{'total-blocking-time':{numericValue:tbt},'largest-contentful-paint':{numericValue:lcp}}})
assert.equal(assessReport(fixture(healthyScores,250,2500),'mobile').pass,true,'Healthy mobile Lighthouse report should pass guardrails')
assert.equal(assessReport(fixture({...healthyScores,performance:.84},501,4001),'mobile').pass,false,'Poor mobile scores/TBT/LCP should fail guardrails')
assert.equal(assessReport(fixture({...healthyScores,performance:.89},100,1500),'desktop').pass,false,'Desktop performance below guardrail should fail')
assert.ok(lighthouseScript.includes('maxTbtMs')&&lighthouseScript.includes('maxLcpMs'),'Lighthouse report must enforce Core Web Vitals guardrails')
assert.ok(html.includes('type="application/ld+json"'),'SEO ItemList JSON-LD missing')
assert.ok(html.includes('"numberOfItems":10')&&html.includes('"name":"CIVIC CASCADE","url":"https://osgard.world/games/civic-cascade/"')&&html.includes('"name":"PATINA Atelier","url":"https://osgard.world/games/patina/"')&&html.includes('"name":"SIGNAL RUN","url":"https://osgard.world/games/signal-run/"')&&html.includes('"name":"CASCADE LAB","url":"https://osgard.world/games/cascade-lab/"')&&html.includes('"name":"AETHER GRID","url":"https://osgard.world/games/aether-grid/"'),'CIVIC CASCADE must appear in the canonical Games ItemList')
assert.ok(html.includes('class="art art-civic"')&&html.includes('data-favorite="civic-cascade"')&&html.includes('href="/games/civic-cascade/" data-play="civic-cascade"'),'CIVIC CASCADE card must support the existing play and favorites UI')
assert.ok(html.includes('href="/game/civic-cascade"'),'CIVIC CASCADE secondary action must open its detail page, not relaunch the game')
assert.ok(lifecycle.includes("'civic-cascade':{title:'CIVIC CASCADE',url:'/games/civic-cascade/'}"),'Player lifecycle registry must include CIVIC CASCADE')
assert.ok(lifecycle.includes("if(id==='civic-cascade')return !!doc.querySelector('#cc-game-root')&&!!doc.querySelector('#cc-status')"),'Player lifecycle must detect a ready CIVIC CASCADE client')
assert.ok(manifest.includes("'civic-cascade'")&&manifest.includes("title: 'CIVIC CASCADE'")&&manifest.includes("href: '/games/civic-cascade/'"),'Core manifest must register CIVIC CASCADE')
assert.ok(sitemap.includes('<loc>https://osgard.world/games/civic-cascade/</loc>'),'CIVIC CASCADE must be present in the XML sitemap')
assert.ok(civic.includes('id="cc-game-root"')&&civic.includes('id="cc-map"')&&civic.includes('id="cc-status"'),'CIVIC CASCADE playable entry point or diagnostics are missing')
for(const action of ['data-action="pump"','data-action="grid"','data-action="route"','data-action="repair"'])assert.ok(civic.includes(action),'CIVIC CASCADE tactical action missing: '+action)
for(const feature of ['function riskValue()','function objectiveState()','function checkFinish()','function sendLifecycle(status)','requestAnimationFrame(frame)','prefers-reduced-motion:reduce'])assert.ok(civic.includes(feature),'CIVIC CASCADE simulation feature missing: '+feature)
assert.ok(civic.includes("game:'civic-cascade'")&&civic.includes("type:'osgard:game-lifecycle'"),'CIVIC CASCADE must handshake with the host game-session lifecycle')
const civicInline=(civic.match(/<script>([\s\S]*?)<\/script>/)||[])[1]
assert.ok(civicInline&&civicInline.length>5000,'CIVIC CASCADE self-contained game script missing')
new Function(civicInline)
assert.ok(lifecycle.includes("'signal-run':{title:'SIGNAL RUN',url:'/games/signal-run/'}"), 'Player lifecycle registry must include SIGNAL RUN')
assert.ok(luxury.includes("const validIds = new Set(['null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade', 'patina', 'signal-run', 'cascade-lab'])"), 'Recent history and Resume registry must include all nine current games, including CASCADE LAB')
assert.ok(lifecycle.includes("if(id==='signal-run')return !!doc.querySelector('#arena')&&!!doc.querySelector('#start')"), 'Player lifecycle must detect SIGNAL RUN readiness')
assert.ok(lifecycle.includes("!['ready','started','paused','resumed','share_created','error','completed'].includes(m.state)"), 'Player lifecycle must accept ready, pause/resume, share_created and terminal states')
assert.ok(lifecycle.includes("activeGame==='null-shift'") && lifecycle.includes("return 'referral:'+code+':null-shift'") && lifecycle.includes("function shareReferralCode(payload)") && lifecycle.includes("source=name==='share_created'?(shareCode?'game-invite:'+activeGame+':'+shareCode:'game-invite:'+activeGame):analyticsSource()"), 'NULL SHIFT daily challenge invites must retain referral source and count confirmed share actions')
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
assert.ok(html.includes('id="signal-run-referral-bridge"')&&html.includes("incoming.searchParams.get('play')!=='signal-run'")&&html.includes("requestAnimationFrame(()=>link.click())"),'SIGNAL RUN challenge links must launch through the existing game-player lifecycle')
const signalReferralBridgeStart=html.indexOf('<script id="signal-run-referral-bridge">')+'<script id="signal-run-referral-bridge">'.length;
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
assert.ok(html.includes('aria-label="OSGARD WORLD PLAY"'),'Brand accessible name must include visible PLAY label')
for(const label of ['NULL//SHIFT — играть на Godot','TIME / EMPIRE — играть в Империю времени','SWARM — играть','INHERIT — играть','REMIX / ARENA — открыть REMIX']) assert.ok(html.includes('aria-label="'+label+'"'),'Game art accessible name must include the visible label: '+label)
for(const lowContrast of ['#656c61','#6f796b','#6d756a','#71796c','#737a70','#737b70','#697168']) assert.ok(!html.toLowerCase().includes(lowContrast),'Low-contrast secondary color remains: '+lowContrast)
assert.ok(html.includes('.consent-row p{max-width:710px;color:#7f877c;font-size:12px;line-height:1.7}'),'Analytics consent copy must reach a legible 12px size')
assert.ok(html.includes('.note{margin:16px 0 0;color:#8b9387;font-size:12px;line-height:1.7}')&&html.includes('.privacy-note{color:#8b9387;font-size:12px;line-height:1.65}'),'Notes must remain readable on mobile')
assert.ok(nginx.includes('gzip_types text/plain text/css text/javascript application/json application/javascript'),'Nginx should gzip text/javascript assets')
assert.ok(lifecycle.includes('function startSession(')&&lifecycle.includes('game_session_completed'),'Actual session lifecycle tracking missing')
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
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-session-ended'")&&recommendationScript.includes("detail.reason!=='closed_by_user'")&&recommendationScript.includes('outsideRoot.hidden=false'),'The owned-service intermission must also appear after a player closes an active game')
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-launching',()=>{")&&recommendationScript.includes("outsideRoot.hidden=true"),'The outside intermission must clear when the next game launches')
assert.ok(recommendationStyles.includes('#osgard-aftergame-intermission[hidden]')&&recommendationStyles.includes('.og-postgame-outside-suite'),'Post-session intermission must have a hidden state and standalone layout')
assert.ok(recommendationScript.includes("'aether-grid'") && recommendationScript.includes("'/games/aether-grid/'"), 'Post-session recommendation map must include AETHER GRID')
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-completed'")&&recommendationScript.includes("document.addEventListener('osgard:game-launching'"),'The deferred recommendation runtime must subscribe to the gameplay lifecycle')
assert.ok(lifecycle.includes("document.dispatchEvent(new Event('osgard:game-launching'))")&&lifecycle.includes("new CustomEvent('osgard:game-completed'"),'Lifecycle wrapper must clear recommendations on launch and publish confirmed completion')
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-completed'")&&recommendationScript.includes("document.addEventListener('osgard:game-launching'"),'Recommendation module must subscribe to game lifecycle events')
assert.ok(recommendationStyles.includes('.post-run-recommendations')&&recommendationStyles.includes('prefers-reduced-motion:reduce'),'Recommendation shelf must have responsive/reduced-motion styling')
new Function(recommendationScript)
const mockNode=()=>({className:'',textContent:'',hidden:false,dataset:{},attributes:{},children:[],handlers:{},append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=nodes},setAttribute(name,value){this.attributes[name]=value},addEventListener(name,handler){(this.handlers[name]??=[]).push(handler)},click(){for(const handler of this.handlers.click||[])handler({target:this,button:0})},querySelector(selector){return selector.startsWith('.')?this.children.find(node=>node.className===selector.slice(1))||null:null}})
const mockHost=mockNode();mockHost.hidden=true
const mockOutside=mockNode();mockOutside.hidden=true
const mockClasses=new Set()
const mockDialog={classList:{add(name){mockClasses.add(name)},remove(name){mockClasses.delete(name)},contains(name){return mockClasses.has(name)}}}
const mockHandlers={}
const mockHead=mockNode()
const mockDocument={head:mockHead,querySelector(selector){return selector==='#post-run-recommendations'?mockHost:selector==='#osgard-aftergame-intermission'?mockOutside:selector==='#player-dialog'?mockDialog:null},createElement(){return mockNode()},addEventListener(name,handler){(mockHandlers[name]??=[]).push(handler)},dispatch(name,event={}){const handlers=mockHandlers[name]||[];assert.ok(handlers.length,'Missing recommendation/growth lifecycle listener: '+name);handlers.forEach(handler=>handler(event))}}
new Function('document','window','location',recommendationScript)(mockDocument,{}, {search:'',origin:'https://osgard.world',pathname:'/games/'})
mockDocument.dispatch('osgard:game-completed',{detail:{game:'swarm'}})
assert.equal(mockHandlers['osgard:game-completed'].length,3,'Recommendation, invite and OSGARD SELECT modules must subscribe to completed sessions')
assert.equal(mockHost.hidden,false,'Completed SWARM session should show recommendations')
assert.equal(mockClasses.has('has-recommendations'),true,'The player layout should adapt after completion')
const mockGrid=mockHost.children.find(node=>node.className==='post-run-grid');
const mockSuite=mockHost.children.find(node=>node.className==='og-postgame-suite');
assert.ok(mockSuite,'Post-run service/reward suite should appear after each valid completion');
assert.equal(mockSuite.children[0].children.find(node=>node.className==='og-postgame-service-grid').children.length,10,'Post-run intermission should list all ten services');
const postGameServiceShelf=mockSuite.children[0];
const postGamePreferences=postGameServiceShelf.children.find(node=>node.className==='og-postgame-preferences');
const postGameServiceOptions=postGamePreferences?.children.find(node=>node.className==='og-postgame-service-options');
assert.ok(postGamePreferences&&postGamePreferences.hidden,'Service preferences must be available but collapsed by default')
assert.equal(postGameServiceOptions?.children.length,10,'Service preferences must offer all ten owned projects')
const servicePreferenceInputs=(postGameServiceOptions?.children||[]).map(option=>option.children[0]);
assert.equal(servicePreferenceInputs.filter(input=>input.checked&&!input.disabled).length,9,'Default preference selects every service whose availability is confirmed')
const unavailableServiceChoice=servicePreferenceInputs.find(input=>input.dataset.servicePreference==='gardvpn');
assert.ok(unavailableServiceChoice?.disabled,'GARD VPN must remain unselectable until service availability is confirmed')
const frequencyField=postGamePreferences.children.find(node=>node.className==='og-postgame-frequency-label');
assert.deepEqual(frequencyField.children[0].children.map(option=>option.value),['each','every3','off'],'Players must choose every round, every three rounds, or no promo')
assert.equal(frequencyField.children[0].value,'each','Service intermission is enabled after every completed game by default')
assert.ok(mockSuite.children[1]&&mockSuite.children[1].className==='og-postgame-reward','Social-share reward must remain available with or without promotions')

const servicesSection=mockSuite.children.find(node=>node.className==='og-postgame-services')
const serviceFilters=servicesSection.children.find(node=>node.className==='og-postgame-service-filters')
const serviceCards=servicesSection.children.find(node=>node.className==='og-postgame-service-grid').children
assert.equal(serviceFilters.children.length,7,'The luxury intermission should offer explicit categories for all ten service choices')
const socialFilter=serviceFilters.children.find(node=>node.dataset.osgardServiceFilter==='social')
socialFilter.click()
assert.equal(socialFilter.attributes['aria-pressed'],'true','Selected service category must expose accessible pressed state')
assert.equal(serviceCards.filter(node=>!node.hidden).length,1,'Selecting the social category should show only its one service')
assert.equal(serviceCards.find(node=>node.dataset.service==='marcosa').hidden,false,'Selected MARCOSA service should remain visible')
assert.ok(serviceCards.filter(node=>node.dataset.category!=='social').every(node=>node.hidden),'Non-selected service categories should be hidden')
serviceFilters.children.find(node=>node.dataset.osgardServiceFilter==='all').click()
assert.ok(serviceCards.every(node=>!node.hidden),'All services should return when the all-category filter is selected')
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
mockDocument.dispatch('osgard:game-session-ended',{detail:{game:'patina',reason:'closed_by_user',durationSeconds:31}})
assert.equal(mockOutside.hidden,false,'Closing a live PATINA session should show the owned-service intermission outside the player dialog')
const outsideSuite=mockOutside.children.find(node=>node.className==='og-postgame-suite og-postgame-outside-suite')
assert.ok(outsideSuite,'Closed-session intermission should contain a standalone service/reward suite')
assert.equal(outsideSuite.children.find(node=>node.className==='og-postgame-services').children.find(node=>node.className==='og-postgame-service-grid').children.length,10,'Closed-session intermission must preserve all ten owned service choices')
assert.equal(outsideSuite.children.find(node=>node.className==='og-postgame-back').href,'#catalog','Players must have a clear path back to the next game')
mockDocument.dispatch('osgard:game-launching')
assert.equal(mockOutside.hidden,true,'Starting the next game must dismiss the standalone intermission')
assert.equal(mockOutside.children.length,0,'Starting the next game must clear stale promoted-service cards')
assert.ok(recommendationScript.includes("'cascade-lab'")&&recommendationScript.includes("'civic-cascade'")&&recommendationScript.includes("'signal-run'"),'Recommendation map must cover the nine-game catalogue')
assert.ok(inheritSafeForSmoke.includes('<meta name="osgard-inherit-api-base" content="">'),'INHERIT API must be an explicit deployment setting')
assert.ok(!inheritSafeForSmoke.includes('http://127.0.0.1:4174')&&!inheritSafeForSmoke.includes('http://127.0.0.1:4175'),'INHERIT public client must not contain localhost endpoints')
assert.ok(inheritSafeForSmoke.includes("if(!apiWorld){notice('Общий мир не подключён — локальная летопись активна');return}"),'INHERIT should use local play without a configured shared server')
assert.ok(inheritSafeForSmoke.includes("game:'inherit',state:'completed'"),'INHERIT generation handoff must publish the completed lifecycle event')
assert.ok(nullShiftForSmoke.includes("game:'null-shift',state:'completed'"),'NULL//SHIFT WebGL fallback must emit completion')
assert.ok(swarmForSmoke.includes("game:'swarm',state:'completed'"),'SWARM must emit completion from result state')
assert.ok(remixForSmoke.includes("game:'remix',state:'completed'"),'REMIX must emit completion from server RESULTS')
assert.ok(timeForSmoke.includes("game: 'time', state: 'completed'"),'Imperium of Time must emit completion on terminal state')
assert.ok(civic.includes("sendLifecycle('completed'"),'CIVIC CASCADE must emit completion')
assert.ok(patina.includes("signal('completed'"),'PATINA must emit completion')
assert.ok(signalJs.includes("life('completed'"),'SIGNAL RUN must emit completion')
assert.ok(cascadeGame.includes("notifyOsgardLifecycle('completed'"),'CASCADE LAB must emit completion after a passed level')

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
for (const slug of ['time','swarm','null-shift','inherit','remix','signal-run','civic-cascade','patina','cascade-lab','aether-grid']) assert.ok(html.includes('href="/game/' + slug + '"'), 'Missing detail link: ' + slug)
assert.ok(html.includes('href="/games/monetization/"'), 'Economics planner link missing')
console.log('PASS OSGARD GAMES HUB: ten actual game routes, search/filters, local favorites/history, embedded player/fullscreen/share, consent-gated authenticated analytics, cross-promotion, contact form, SEO, mobile/reduced-motion styling and legal documents.')
assert.ok(html.includes('href="/games/cascade-lab/" data-play="cascade-lab"') && html.includes('data-favorite="cascade-lab"') && html.includes('href="/game/cascade-lab"'), 'CASCADE LAB must use catalogue play, favourites and detail route')
assert.ok(html.includes('href="/games/aether-grid/" data-play="aether-grid"') && html.includes('data-favorite="aether-grid"') && html.includes('href="/game/aether-grid"'), 'AETHER GRID must use catalogue play, favorites and detail route')
assert.ok(aetherGame.includes('<title>AETHER GRID — OSGARD WORLD GAMING</title>') && aetherGame.includes('id="board"') && aetherGame.includes('id="challenge-code"') && aetherGame.includes("notify('ready'") && aetherGame.includes("notify('started'") && aetherGame.includes("notify('completed'"), 'AETHER GRID daily puzzle and lifecycle contract missing')
assert.ok(aetherGame.includes('navigator.share') && aetherGame.includes('og_day') && aetherGame.includes('osgard.aether-grid.best.v1.'), 'AETHER GRID must preserve daily seeds and local best scores')
const aetherInlineScript=aetherGame.split('<script>')[1]?.split('</script>')[0]||''
assert.ok(aetherInlineScript.includes('function buildPuzzle') && aetherInlineScript.includes('function isSolved') && aetherInlineScript.includes('function shareResult'), 'AETHER GRID puzzle engine is incomplete')
assert.ok(!aetherGame.includes('fetch('), 'AETHER GRID must run without a backend dependency')
new Function(aetherInlineScript)
assert.ok(cascadeGame.includes('<title>CASCADE LAB — OSGARD PLAY</title>') && cascadeGame.includes('data-cascade-lab-ready="true"') && cascadeGame.includes("notifyOsgardLifecycle('ready'") && cascadeGame.includes("notifyOsgardLifecycle('started'") && cascadeGame.includes("notifyOsgardLifecycle('paused'") && cascadeGame.includes("notifyOsgardLifecycle('resumed'") && cascadeGame.includes("notifyOsgardLifecycle('completed'"), 'CASCADE LAB lifecycle contract missing')
assert.ok(lifecycle.includes("'cascade-lab':{title:'CASCADE LAB',url:'/games/cascade-lab/'}") && lifecycle.includes("if(id==='cascade-lab')return doc.body.dataset.cascadeLabReady==='true'"), 'Game modal must register CASCADE LAB readiness')
assert.ok(lifecycle.includes("'aether-grid':{title:'AETHER GRID',url:'/games/aether-grid/'}") && lifecycle.includes("if(id==='aether-grid')return !!doc.querySelector('#board')"), 'Game modal must register AETHER GRID readiness')
assert.ok(manifest.includes("'cascade-lab'") && manifest.includes("title: 'CASCADE LAB'") && sitemap.includes('<loc>https://osgard.world/games/cascade-lab/</loc>'), 'CASCADE LAB must be present in manifest and sitemap')
assert.ok(manifest.includes("'aether-grid'") && manifest.includes("title: 'AETHER GRID'") && sitemap.includes('<loc>https://osgard.world/games/aether-grid/</loc>') && sitemap.includes('<loc>https://osgard.world/game/aether-grid</loc>'), 'AETHER GRID must be present in manifest and sitemap')


assert.ok(entertainmentAlias.includes('content="0;url=/games/"') && entertainmentAlias.includes("window.location.replace('/games/')"), 'Legacy /entertainment path must forward to the canonical Games hub')
assert.ok(nginx.includes('location = /entertainment {') && nginx.includes('location = /entertainment/ {'), 'Both legacy Entertainment URL variants need server-side redirects')
assert.ok(nginx.split("return 301 /games/;").length >= 3, 'Entertainment redirects must target the canonical /games/ route')
assert.ok(mainSource.includes("function EntertainmentRedirect()") && mainSource.includes("path === '/entertainment' ? <EntertainmentRedirect />") && !mainSource.includes("import { EntertainmentCatalog }"), 'React /entertainment route must forward to the canonical Games hub')
assert.ok(sectionSource.includes("['Entertainment', '/games/']"), 'Secondary OSGARD navigation must link Entertainment directly to Games hub')
assert.ok(rootIndex.includes('href="/osgard-mark.svg"') && rootIndex.includes('"logo":"https://osgard.world/osgard-mark.svg"'), 'Root page must use the original OSGARD brand mark for favicon and organization schema')
assert.ok(existsSync(resolve('public/osgard-mark.svg')), 'Original OSGARD brand mark is present')


const luxuryCss = readFileSync(resolve(root,'luxury.css'),'utf8')
const luxuryJs = readFileSync(resolve(root,'luxury.js'),'utf8')
assert.ok(html.includes('href="./luxury.css?v=__OSGARD_BUILD_VERSION__"'), 'Premium OSGARD PLAY theme must be linked and versioned')
assert.ok(html.includes('src="./luxury.js?v=__OSGARD_BUILD_VERSION__" defer'), 'Premium catalogue interactions must be loaded and versioned')
assert.ok(html.includes('<body class="luxury-entertainment">'), 'Premium body theme class is missing')
for (const feature of ['sortCards','launchRandom','updateResumeButton','navigator.share',"event.key === '/'","event.key.toLowerCase() === 'r'","event.key.toLowerCase() === 'f'"]) {
  assert.ok(luxuryJs.includes(feature), 'Premium catalogue action missing: '+feature)
}
assert.ok(luxuryJs.includes("osgard.games.recent.v1"), 'Premium resume control must reuse existing recent-game history')
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

assert.ok(luxuryCss.includes('content-visibility:auto') && luxuryCss.includes('contain-intrinsic-size:auto 440px'), 'Mobile layout should defer off-screen cards with a reserved size')
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
assert.ok(lifecycle.includes("function shareReferralCode(payload)") && lifecycle.includes("localStorage.getItem('osgard.games.invite-code.v1')") && lifecycle.includes("source=name==='share_created'?(shareCode?'game-invite:'+activeGame+':'+shareCode:'game-invite:'+activeGame):analyticsSource()"),'In-game sharing must attach a validated referral code to the server funnel event')

assert.ok(catalogRuntime.includes('window.OSGARDInvite={createLink:(id)=>createInviteLink(id)') && luxury.includes('window.OSGARDInvite?.createLink()') && luxury.includes('window.OSGARDInvite?.trackShare?.()'),'Catalogue share control must use the same invite-link builder')
assert.ok(catalogRuntime.includes("const route=games[id]?'/games/invite/'+id+'/':'/games/invite/'"),'Every share should use a game-specific preview route before entering the catalogue')
assert.ok(luxuryCss.includes('.invite-ribbon') && luxuryCss.includes('@media(max-width:620px)') && luxuryCss.includes('prefers-reduced-motion:reduce'),'Referral invitation ribbon must be responsive and respect reduced motion')
assert.ok(catalogRuntime.includes("sessionStorage.setItem('osgard.games.invite-dismissed.v1',key)"),'Invite dismissal should be local to this browser session')
console.log('PASS OSGARD referral loop: game-specific invite deep links, consent-gated authenticated attribution, responsive invite ribbon and script syntax.')


const referralCoreSource=readFileSync(resolve('services/osgard-commerce-api/src/core.mjs'),'utf8')
const referralApiSource=readFileSync(resolve('services/osgard-commerce-api/src/server.mjs'),'utf8')
const referralAdminSource=readFileSync(resolve('public/games/commerce-admin/index.html'),'utf8')
assert.ok(recommendationScript.includes('osgard.games.referral-attribution.v1') && recommendationScript.includes('game-invite:') && recommendationScript.includes('play_with_friends'), 'Post-session invite link and referral attribution missing')
assert.ok(recommendationScript.includes("shared.pathname==='/games/invite/'+gameId+'/" ) && recommendationScript.includes("new URL('/games/invite/'+encodeURIComponent(gameId)+'/'"),'Post-session sharing must validate and fallback to the game-specific preview route')
assert.ok(recommendationScript.includes("params.get('og_game')") && recommendationScript.includes("params.get('og_ref')") && recommendationScript.includes("shared.searchParams.get('og_game')===gameId"), 'Post-session invites must use the canonical og_game/og_ref URL contract')
assert.ok(recommendationScript.includes('!invite.legacy') && recommendationScript.includes("params.get('challenge')"), 'Canonical links must use one ribbon while legacy invite links remain supported')
assert.ok(recommendationScript.includes("sendEvent('referral_link_opened'") && recommendationScript.includes("sendEvent('share_created'"), 'Invite opens and generated links must use the consented event API')
assert.ok(recommendationScript.includes("source==='osgard_play'") && recommendationScript.includes("campaign==='play_with_friends'") && recommendationScript.includes("campaign==='play_with_a_friend'"), 'Referral links must validate known UTM contracts')
assert.ok(recommendationScript.includes("sessionStorage.setItem(marker,'pending')") && recommendationScript.includes("state==='pending'"), 'Referral-open callbacks must be deduplicated before waiting on the network')
assert.ok(recommendationScript.includes('const pendingTelemetry=new Set()') && recommendationScript.includes('cancelPendingTelemetry()'), 'In-flight consented analytics must support cancellation on opt-out')
assert.ok(catalogRuntime.includes("campaign==='play_with_friends'") && catalogRuntime.includes("medium==='referral'"), 'The main catalogue must validate canonical invitation labels before attributing player events')
assert.ok(html.includes("params.get('utm_campaign')==='play_with_friends'") && html.includes("params.get('challenge')") && html.includes("params.get('utm_campaign')==='play_with_a_friend'"), 'Both canonical and legacy referral landings must load the invitation handler')
const postSessionShareStart=recommendationScript.indexOf("inviteButton.addEventListener('click',async()=>{");
assert.ok(postSessionShareStart>=0,'Post-session invite handler missing')
const postSessionShareEnd=recommendationScript.indexOf('\n });',postSessionShareStart)
assert.ok(postSessionShareEnd>postSessionShareStart,'Post-session invite handler boundary missing')
const postSessionShareHandler=recommendationScript.slice(postSessionShareStart,postSessionShareEnd)
const nativeShareAt=postSessionShareHandler.indexOf('await navigator.share(')
const clipboardCopyAt=postSessionShareHandler.indexOf('await navigator.clipboard.writeText(message)')
const countedShareAt=postSessionShareHandler.indexOf("if(shareCompleted)void sendEvent('share_created'")
assert.ok(nativeShareAt>=0&&clipboardCopyAt>=0,'Invite must support both native share and clipboard fallback')
assert.ok(postSessionShareHandler.indexOf('shareCompleted=true')>nativeShareAt&&postSessionShareHandler.lastIndexOf('shareCompleted=true')>clipboardCopyAt,'A share action is only successful after the share promise or clipboard copy resolves')
assert.ok(countedShareAt>postSessionShareHandler.indexOf('finally {')&&postSessionShareHandler.includes("if(error instanceof Error&&error.name==='AbortError')"),'share_created must be emitted only after successful completion; cancelling the native share sheet must return before the event')
assert.equal(postSessionShareHandler.split("sendEvent('share_created'").length-1,1,'A completed share action should generate at most one share event')
assert.ok(recommendationScript.includes('osgardbewworld.com/?utm_source=osgard_games&utm_medium=cross_promo&utm_campaign=after_game'), 'Post-session game-creation lead CTA and attribution missing')
assert.ok(recommendationScript.includes("partnerCta.href='/games/partners/?utm_source=osgard_play&utm_medium=post_game&utm_campaign=partner_studio&utm_content='+encodeURIComponent(gameId)"), 'Post-session Partner Studio CTA must carry game-level campaign attribution')
assert.ok(recommendationScript.includes("sendEvent('cross_promo_clicked',gameId,'post-game-partner-studio')"), 'Partner Studio clicks must use the existing cross-promo analytics event')
assert.ok(recommendationScript.includes("partnerCta.setAttribute('aria-label'"), 'Partner Studio CTA needs a descriptive accessible name')
assert.ok(recommendationStyles.includes('.og-partner-cta') && recommendationStyles.includes('@media(max-width:760px)') && recommendationStyles.includes('prefers-reduced-motion:reduce'), 'Partner Studio CTA must be responsive and respect reduced motion')
assert.ok(recommendationScript.includes("async function sendEvent(name,gameId,source)") && recommendationScript.includes("if(!consented())return false"), 'Partner CTA tracking must reuse the analytics-consent gate')
assert.ok(recommendationScript.includes("sendEvent('cross_promo_clicked',gameId,'post-game-partner-studio')") && !recommendationScript.includes("sendEvent('partner_impression'"), 'Only actual CTA clicks are recorded; no synthetic sponsor impressions')
const postGameIds=['marcosa','projects','o2-system','senjorio','superday','myosa','gold-glamour','gardvpn','osgard-business','vanguard'];
for(const id of postGameIds)assert.ok(recommendationScript.includes("['"+id+"'"),'Post-game service missing: '+id);
for(const domain of ['marcosa.club','osgardbewworld.com','o2system.art','senjorio.com','superday.run','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio'])assert.ok(recommendationScript.includes(domain),'Service URL missing: '+domain);
assert.ok(/\['gardvpn','08','GARD VPN'[^\n]+false,false\]/.test(recommendationScript),'GARD VPN must stay non-clickable until availability is confirmed');
for(const provider of ['t.me/share/url','wa.me/?text=','vk.com/share.php','twitter.com/intent/tweet','facebook.com/sharer/sharer.php'])assert.ok(recommendationScript.includes(provider),'Social share redirect missing: '+provider);
assert.ok(recommendationScript.includes("u.searchParams.set('utm_medium','post_game')")&&recommendationScript.includes("u.searchParams.set('utm_campaign','after_game')"),'Post-game links require UTM attribution');
assert.ok(recommendationScript.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50")&&recommendationScript.includes('current.day===day'),'SHARDS must persist locally and be capped once per UTC day');
assert.ok(recommendationScript.includes('Я опубликовал — получить +50 SHARDS')&&recommendationScript.includes('Соцсеть не сообщает сайту подтверждение публикации')&&recommendationScript.includes('не являются платёжным средством'),'Social reward must disclose self-confirmation and non-monetary points');
assert.ok(recommendationStyles.includes('.og-postgame-services')&&recommendationStyles.includes('.og-postgame-service-grid')&&recommendationStyles.includes('.og-postgame-reward')&&recommendationStyles.includes('@media(max-width:760px)')&&recommendationStyles.includes('prefers-reduced-motion:reduce'),'Postgame UI must be premium, responsive and accessible');
assert.ok(recommendationScript.includes('РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD')&&recommendationScript.includes('osgardServiceFilter')&&recommendationScript.includes('categoryByService'),'OSGARD SELECT must disclose self-promotion and let players filter service offers by category');
assert.ok(recommendationScript.includes("['all','Все сервисы · 10']")&&recommendationScript.includes("['studio','Разработка · 2']")&&recommendationScript.includes("['luxury','Luxury · 1']"),'OSGARD SELECT filters must expose all configured service categories');
assert.ok(recommendationScript.includes("const servicePreferencesKey='osgard.games.postgame-service-preferences.v1'")&&recommendationScript.includes("frequency:'each'")&&recommendationScript.includes("frequency==='every3'")&&recommendationScript.includes("frequency==='off'"),'Service preferences must persist promo frequency choice')
assert.ok(recommendationScript.includes('availableServiceIds.filter(id=>Array.isArray(value.selected)&&value.selected.includes(id))')&&recommendationScript.includes('preferences.selected.includes(id)'), 'Only services selected by the player should be actively promoted')
assert.ok(recommendationScript.includes("localStorage.setItem(serviceProgressKey,JSON.stringify(next))")&&recommendationScript.includes('completedCount%3===0'),'Promo caps must count completed game sessions, not page visits')
assert.ok(!recommendationScript.includes("sendEvent('partner_impression'"),'Do not synthesize sponsor impressions without an ad measurement signal')
assert.ok(recommendationStyles.includes('.og-postgame-preferences')&&recommendationStyles.includes('.og-postgame-service-options')&&recommendationStyles.includes('.og-postgame-frequency')&&recommendationStyles.includes('@media(max-width:360px)'),'Promo preference controls must be responsive on mobile')

assert.ok(recommendationStyles.includes('.og-postgame-service-filters')&&recommendationStyles.includes('.og-postgame-service-filter[aria-pressed="true"]')&&recommendationStyles.includes('.og-postgame-service-card[hidden]'),'Service filters need accessible selected states and must reliably hide unmatched cards');

assert.ok(lifecycle.includes('function analyticsSource()') && lifecycle.includes(':analyticsSource()') && lifecycle.includes("return 'referral:'+code+':null-shift'"), 'Actual gameplay sessions must preserve consented invite attribution')
assert.ok(referralCoreSource.includes('"referral_link_opened"') && referralCoreSource.includes('"share_created"'), 'Commerce API must explicitly allowlist invite events')
for(const metric of ['inviteShares','referralOpens','referredStarts','referredCompletions']) assert.ok(referralApiSource.includes(metric), 'Commerce analytics response lacks referral metric '+metric)
const inviteSqlStart=referralApiSource.indexOf('invite_shares AS')
const inviteSqlEnd=referralApiSource.indexOf('SELECT\n          COUNT(*) FILTER',inviteSqlStart)
const inviteSql=referralApiSource.slice(inviteSqlStart,inviteSqlEnd)
assert.equal(inviteSql.split("~ '^(og_[a-f0-9]{8}|[a-f0-9]{12})$'").length-1,4,'All four share/open/start/completion SQL stages must accept canonical and legacy invite codes')
for(const metric of ['analytics-invites','analytics-referral-opens','analytics-referred-starts','analytics-referred-completions']) assert.ok(referralAdminSource.includes('id="'+metric+'"'), 'Commerce admin is missing referral metric '+metric)

 
// The root Entertainment gateway must expose the existing OSGARD SELECT cross-promo
// and the labelled, scenario-based monetisation page without implying live advertising revenue.
assert.ok(appSource.includes('OSGARD SELECT / BETWEEN WORLDS') && appSource.includes('play-economy-strip'), 'Entertainment gateway must introduce the post-game OSGARD SELECT loop')
assert.ok(appSource.includes('href="/games/?utm_source=osgard_world&amp;utm_medium=entertainment&amp;utm_campaign=between_worlds"'), 'Entertainment gateway must link into the playable hub with campaign attribution')
assert.ok(appSource.includes('href="/games/monetization/?utm_source=osgard_world&amp;utm_medium=entertainment&amp;utm_campaign=economy_model"'), 'Entertainment gateway must link to the scenario economy model')
assert.ok(appSource.includes('не подтверждается автоматически') && appSource.includes('Это не деньги'), 'SHARDS must be disclosed as non-monetary with social-post verification limits')
assert.ok(appStyles.includes('.play-economy-strip') && appStyles.includes('@media(max-width:760px)') && appStyles.includes('prefers-reduced-motion:reduce'), 'Entertainment economy teaser needs responsive and reduced-motion styling')

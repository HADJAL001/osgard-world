import { assessReport } from './games-lighthouse-report.mjs'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { resolve } from 'node:path'
const entertainmentAlias = readFileSync(resolve('public/entertainment/index.html'),'utf8')
const rootIndex = readFileSync(resolve('index.html'),'utf8')
const mainSource = readFileSync(resolve('src/main.tsx'),'utf8')
const sectionSource = readFileSync(resolve('src/Sections.tsx'),'utf8')
const appSource = readFileSync(resolve('src/App.tsx'),'utf8')
const appStyles = readFileSync(resolve('src/styles.css'),'utf8')
const root=resolve('public/games')
const html=readFileSync(resolve(root,'index.html'),'utf8')
const deployWorkflow=readFileSync(resolve('.github/workflows/deploy-frontend.yml'),'utf8')
const launchMapStart=html.indexOf('games={')
const launchMapEnd=html.indexOf('},read=',launchMapStart)
assert.ok(launchMapStart>=0&&launchMapEnd>launchMapStart,'Games launch registry is missing or malformed')
const launchMap=html.slice(launchMapStart,launchMapEnd)
const routeEntries=[...launchMap.matchAll(/(?:'([^']+)'|([a-z][a-z-]*)):\{title:'([^']+)',url:'([^']+)'\}/g)].map(m=>({id:m[1]||m[2],title:m[3],url:m[4]}))
const expectedLaunchIds=['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab'].sort()
assert.equal(routeEntries.length,9,'Launch registry must contain exactly nine game entries')
assert.deepEqual(routeEntries.map(x=>x.id).sort(),expectedLaunchIds,'Every visible game must have exactly one unique launch route')
assert.ok(routeEntries.every(x=>x.url.startsWith('/games/')),'Every launch entry must use a same-origin game route')
const catalogIds=catalogCards.map(card=>card.id).sort()
assert.equal(new Set(catalogIds).size,catalogIds.length,'Catalog card IDs must be unique')
assert.deepEqual(catalogIds,routeEntries.map(entry=>entry.id).sort(),'Catalog card IDs must exactly match the player launch registry')
const validIdsMatch=luxury.match(/const validIds = new Set\\(\\[([^\\]]+)\\]\\)/)
assert.ok(validIdsMatch,'History/resume validIds registry is missing')
const historyIds=[...validIdsMatch[1].matchAll(/'([^']+)'/g)].map(match=>match[1]).sort()
assert.deepEqual(historyIds,catalogIds,'Recent history, recent sorting and resume IDs must exactly match catalog cards')
const visibleFilters=new Set([...html.matchAll(/<button\\b[^>]*data-filter="([^"]+)"/g)].map(match=>match[1]))
const cardGenres=[...new Set(catalogCards.flatMap(card=>card.genres))].sort()
assert.ok(cardGenres.every(genre=>visibleFilters.has(genre)),'Every card genre must have a visible catalog filter: '+cardGenres.filter(genre=>!visibleFilters.has(genre)).join(', '))
assert.ok(visibleFilters.has('arcade'),'The catalog must expose the Arcade genre filter')

const lifecycle=readFileSync(resolve(root,'player-lifecycle.js'),'utf8')
const recommendationScript=readFileSync(resolve(root,'game-session-recommendations.js'),'utf8')
const recommendationStyles=readFileSync(resolve(root,'game-session-recommendations.css'),'utf8')
const inheritSafeForSmoke=readFileSync(resolve(root,'inherit/index.html'),'utf8')
const nullShiftForSmoke=readFileSync(resolve(root,'null-shift/game.js'),'utf8')
const swarmForSmoke=readFileSync(resolve(root,'swarm/game.js'),'utf8')
const remixForSmoke=readFileSync(resolve(root,'remix/index.html'),'utf8')
const timeForSmoke=readFileSync(resolve('src/TimePrototype.tsx'),'utf8')
const luxury=readFileSync(resolve(root,'luxury.js'),'utf8')

const nginx=readFileSync(resolve('nginx.conf'),'utf8')
const admin=readFileSync(resolve(root,'admin/index.html'),'utf8')
const partnerEditor=readFileSync(resolve(root,'admin/partners/index.html'),'utf8')
const civic=readFileSync(resolve(root,'civic-cascade/index.html'),'utf8')
const cascadeGame=readFileSync(resolve(root,'cascade-lab/index.html'),'utf8')
const patina=readFileSync(resolve(root,'patina/index.html'),'utf8')
const signalRun=readFileSync(resolve(root,'signal-run/index.html'),'utf8')
const catalogCards=[...html.matchAll(/<article\\b[^>]*\\bdata-game="([^"]+)"[^>]*\\bdata-genres="([^"]+)"[^>]*>/g)].map(match=>({id:match[1],genres:match[2].trim().split(/\\s+/).filter(Boolean)}))
const signalJs=readFileSync(resolve(root,'signal-run/game.js'),'utf8')
const signalDailyJs=readFileSync(resolve(root,'signal-run/daily.js'),'utf8')
const manifest=readFileSync(resolve('src/core/manifest.ts'),'utf8')
const sitemap=readFileSync(resolve('public/sitemap.xml'),'utf8')
const required=['data-game="null-shift"','data-game="time"','data-game="swarm"','data-game="inherit"','data-game="remix"','data-game="civic-cascade"','data-game="patina"','data-game="signal-run"','data-game="cascade-lab"','id="games-grid"','id="game-search"','data-filter="tactical"','data-filter="arcade"','id="player-dialog"','id="player-share"','id="player-fullscreen"','id="analytics-toggle"','id="project-form"','https://wa.me/79640027222','osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio','/games/favicon.svg','/privacy/','/terms/']
for(const item of required) assert.ok(html.includes(item),'Games hub missing: '+item)
assert.ok(appSource.includes('className="play-catalog-link" href="/games/"')&&appSource.includes('<em>OSGARD WORLD GAMING</em>')&&appSource.includes("'Открыть игровой портал'"),'Homepage entertainment gateway must promote OSGARD WORLD GAMING and open the canonical /games/ hub')
assert.ok(appSource.includes('className="play-quick-picks"')&&appSource.includes("aria-label={ru ? 'Быстрый запуск игр' : 'Quick launch games'}")&&appSource.includes('QUICK START'),'Homepage must expose a labelled quick-launch section in both locales')
for (const route of ['/games/swarm/','/games/inherit/','/games/signal-run/']) assert.ok(appSource.includes('href="'+route+'"'),'Homepage quick-launch route missing: '+route)
for (const path of ['public/games/swarm/index.html','public/games/inherit/index.html','public/games/signal-run/index.html']) assert.ok(existsSync(resolve(path)),'Homepage quick-launch target is missing: '+path)
assert.ok(appStyles.includes('.play-quick-picks{display:grid;grid-template-columns:auto repeat(3,minmax(0,1fr))')&&appStyles.includes('@media(max-width:760px){.play-quick-picks{grid-template-columns:1fr}'),'Quick-launch strip must have desktop and mobile layouts')
assert.ok(appStyles.includes('.play-quick-link:focus-visible')&&appStyles.includes('@media(prefers-reduced-motion:reduce){.play-quick-link'),'Quick-launch links must retain keyboard focus and reduced-motion support')
assert.ok(html.includes('<title>OSGARD WORLD GAMING — Игровая платформа</title>')&&html.includes('og:title" content="OSGARD WORLD GAMING — игровые миры')&&html.includes('"name":"OSGARD WORLD GAMING"'),'Gaming hub identity must be consistent in title, social metadata and structured data')
assert.ok(html.includes('OSGARD WORLD GAMING <span>/</span> DIGITAL WORLDS')&&html.includes('быстрый возврат к недавним сессиям'),'Gaming hub hero must describe the branded portal and its actual navigation features')
for(const path of ['public/games/index.html','public/games/favicon.svg','public/games/player-lifecycle.js','public/games/game-session-recommendations.js','public/games/game-session-recommendations.css','public/games/admin/index.html','public/games/admin/partners/index.html','public/games/civic-cascade/index.html','public/games/patina/index.html','public/games/signal-run/index.html','public/games/signal-run/game.js','public/games/signal-run/daily.js','public/games/cascade-lab/index.html','public/privacy/index.html','public/terms/index.html']) assert.ok(existsSync(resolve(path)),'Missing file: '+path)
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
assert.ok(lighthouseWorkflow.includes('EXPECTED_DEPLOY_SHA')&&lighthouseWorkflow.includes('osgard-build')&&lighthouseWorkflow.includes('luxury.css?v=$expected'),'Games Lighthouse must wait for the matching release before scoring')
const healthyScores={performance:.95,accessibility:1,'best-practices':1,seo:1}
const fixture=(scores,tbt,lcp)=>({finalDisplayedUrl:'https://osgard.world/games/',categories:Object.fromEntries(Object.entries(scores).map(([key,score])=>[key,{score}])),audits:{'total-blocking-time':{numericValue:tbt},'largest-contentful-paint':{numericValue:lcp}}})
assert.equal(assessReport(fixture(healthyScores,250,2500),'mobile').pass,true,'Healthy mobile Lighthouse report should pass guardrails')
assert.equal(assessReport(fixture({...healthyScores,performance:.84},501,4001),'mobile').pass,false,'Poor mobile scores/TBT/LCP should fail guardrails')
assert.equal(assessReport(fixture({...healthyScores,performance:.89},100,1500),'desktop').pass,false,'Desktop performance below guardrail should fail')
assert.ok(lighthouseScript.includes('maxTbtMs')&&lighthouseScript.includes('maxLcpMs'),'Lighthouse report must enforce Core Web Vitals guardrails')
assert.ok(html.includes('type="application/ld+json"'),'SEO ItemList JSON-LD missing')
assert.ok(html.includes('"numberOfItems":9')&&html.includes('"name":"CIVIC CASCADE","url":"https://osgard.world/games/civic-cascade/"')&&html.includes('"name":"PATINA Atelier","url":"https://osgard.world/games/patina/"')&&html.includes('"name":"SIGNAL RUN","url":"https://osgard.world/games/signal-run/"')&&html.includes('"name":"CASCADE LAB","url":"https://osgard.world/games/cascade-lab/"'),'CIVIC CASCADE must appear in the canonical Games ItemList')
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
assert.ok(signalJs.includes("new URL('/games/',location.origin)")&&signalJs.includes("url.searchParams.set('play','signal-run')")&&signalJs.includes('function referralCode()')&&signalJs.includes("url.searchParams.set('ref',referralCode())"),'SIGNAL RUN must share a game-specific catalog deep link with an opaque referral code')
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
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-completed'")&&recommendationScript.includes("document.addEventListener('osgard:game-launching'"),'The deferred recommendation runtime must subscribe to the gameplay lifecycle')
assert.ok(lifecycle.includes("document.dispatchEvent(new Event('osgard:game-launching'))")&&lifecycle.includes("new CustomEvent('osgard:game-completed'"),'Lifecycle wrapper must clear recommendations on launch and publish confirmed completion')
assert.ok(recommendationScript.includes("document.addEventListener('osgard:game-completed'")&&recommendationScript.includes("document.addEventListener('osgard:game-launching'"),'Recommendation module must subscribe to game lifecycle events')
assert.ok(recommendationStyles.includes('.post-run-recommendations')&&recommendationStyles.includes('prefers-reduced-motion:reduce'),'Recommendation shelf must have responsive/reduced-motion styling')
new Function(recommendationScript)
const mockNode=()=>({className:'',textContent:'',hidden:false,dataset:{},attributes:{},children:[],append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=nodes},setAttribute(name,value){this.attributes[name]=value},addEventListener(){},querySelector(selector){return selector.startsWith('.')?this.children.find(node=>node.className===selector.slice(1))||null:null}})
const mockHost=mockNode();mockHost.hidden=true
const mockClasses=new Set()
const mockDialog={classList:{add(name){mockClasses.add(name)},remove(name){mockClasses.delete(name)},contains(name){return mockClasses.has(name)}}}
const mockHandlers={}
const mockHead=mockNode()
const mockDocument={head:mockHead,querySelector(selector){return selector==='#post-run-recommendations'?mockHost:selector==='#player-dialog'?mockDialog:null},createElement(){return mockNode()},addEventListener(name,handler){(mockHandlers[name]??=[]).push(handler)},dispatch(name,event={}){const handlers=mockHandlers[name]||[];assert.ok(handlers.length,'Missing recommendation/growth lifecycle listener: '+name);handlers.forEach(handler=>handler(event))}}
new Function('document','window','location',recommendationScript)(mockDocument,{}, {search:'',origin:'https://osgard.world',pathname:'/games/'})
mockDocument.dispatch('osgard:game-completed',{detail:{game:'swarm'}})
assert.equal(mockHandlers['osgard:game-completed'].length,2,'Recommendation shelf and invite loop must both subscribe to completed sessions')
assert.equal(mockHost.hidden,false,'Completed SWARM session should show recommendations')
assert.equal(mockClasses.has('has-recommendations'),true,'The player layout should adapt after completion')
assert.deepEqual(mockHost.children[2].children.map(node=>node.dataset.play),['null-shift','signal-run'],'SWARM should recommend two related live games')
assert.deepEqual(mockHost.children[2].children.map(node=>node.href),['/games/null-shift-godot/','/games/signal-run/'],'Recommendations should point to valid game launch routes')
mockDocument.dispatch('osgard:game-launching')
assert.equal(mockHost.hidden,true,'The next launch must clear recommendations')
assert.equal(mockHost.children.length,0,'Stale recommendation links must be removed')
assert.equal(mockClasses.has('has-recommendations'),false,'The player modal should return to normal layout on relaunch')
mockDocument.dispatch('osgard:game-completed',{detail:{game:'unknown'}})
assert.equal(mockHost.hidden,true,'Unknown game IDs must not generate recommendations')
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
for (const slug of ['time','swarm','null-shift','inherit','remix','signal-run','civic-cascade','patina','cascade-lab']) assert.ok(html.includes('href="/game/' + slug + '"'), 'Missing detail link: ' + slug)
assert.ok(html.includes('href="/games/monetization/"'), 'Economics planner link missing')
console.log('PASS OSGARD GAMES HUB: nine actual game routes, search/filters, local favorites/history, embedded player/fullscreen/share, consent-gated authenticated analytics, cross-promotion, contact form, SEO, mobile/reduced-motion styling and legal documents.')
assert.ok(html.includes('href="/games/cascade-lab/" data-play="cascade-lab"') && html.includes('data-favorite="cascade-lab"') && html.includes('href="/game/cascade-lab"'), 'CASCADE LAB must use catalogue play, favourites and detail route')
assert.ok(cascadeGame.includes('<title>CASCADE LAB — OSGARD PLAY</title>') && cascadeGame.includes('data-cascade-lab-ready="true"') && cascadeGame.includes("notifyOsgardLifecycle('ready'") && cascadeGame.includes("notifyOsgardLifecycle('started'") && cascadeGame.includes("notifyOsgardLifecycle('paused'") && cascadeGame.includes("notifyOsgardLifecycle('resumed'") && cascadeGame.includes("notifyOsgardLifecycle('completed'"), 'CASCADE LAB lifecycle contract missing')
assert.ok(lifecycle.includes("'cascade-lab':{title:'CASCADE LAB',url:'/games/cascade-lab/'}") && lifecycle.includes("if(id==='cascade-lab')return doc.body.dataset.cascadeLabReady==='true'"), 'Game modal must register CASCADE LAB readiness')
assert.ok(manifest.includes("'cascade-lab'") && manifest.includes("title: 'CASCADE LAB'") && sitemap.includes('<loc>https://osgard.world/games/cascade-lab/</loc>'), 'CASCADE LAB must be present in manifest and sitemap')


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
assert.ok(catalogRuntime.includes('window.OSGARDInvite={createLink:()=>createInviteLink()') && luxury.includes('window.OSGARDInvite?.createLink()') && luxury.includes('window.OSGARDInvite?.trackShare?.()'),'Catalogue share control must use the same invite-link builder')
assert.ok(luxuryCss.includes('.invite-ribbon') && luxuryCss.includes('@media(max-width:620px)') && luxuryCss.includes('prefers-reduced-motion:reduce'),'Referral invitation ribbon must be responsive and respect reduced motion')
assert.ok(catalogRuntime.includes("sessionStorage.setItem('osgard.games.invite-dismissed.v1',key)"),'Invite dismissal should be local to this browser session')
console.log('PASS OSGARD referral loop: game-specific invite deep links, consent-gated authenticated attribution, responsive invite ribbon and script syntax.')


const referralCoreSource=readFileSync(resolve('services/osgard-commerce-api/src/core.mjs'),'utf8')
const referralApiSource=readFileSync(resolve('services/osgard-commerce-api/src/server.mjs'),'utf8')
const referralAdminSource=readFileSync(resolve('public/games/commerce-admin/index.html'),'utf8')
assert.ok(recommendationScript.includes('osgard.games.referral-attribution.v1') && recommendationScript.includes('game-invite:') && recommendationScript.includes('play_with_a_friend'), 'Post-session invite link and referral attribution missing')
assert.ok(recommendationScript.includes("sendEvent('referral_link_opened'") && recommendationScript.includes("sendEvent('share_created'"), 'Invite opens and generated links must use the consented event API')
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
assert.ok(lifecycle.includes('function analyticsSource()') && lifecycle.includes('source:analyticsSource()'), 'Actual gameplay sessions must preserve consented invite attribution')
assert.ok(referralCoreSource.includes('"referral_link_opened"') && referralCoreSource.includes('"share_created"'), 'Commerce API must explicitly allowlist invite events')
for(const metric of ['inviteShares','referralOpens','referredStarts','referredCompletions']) assert.ok(referralApiSource.includes(metric), 'Commerce analytics response lacks referral metric '+metric)
for(const metric of ['analytics-invites','analytics-referral-opens','analytics-referred-starts','analytics-referred-completions']) assert.ok(referralAdminSource.includes('id="'+metric+'"'), 'Commerce admin is missing referral metric '+metric)

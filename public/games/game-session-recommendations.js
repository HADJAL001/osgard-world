(() => {
'use strict';
const games={
 'null-shift':{title:'NULL//SHIFT',subtitle:'Тактический рейд',href:'/games/null-shift-godot/'},
 time:{title:'Империя времени',subtitle:'Стратегия и управление городом',href:'/games/time'},
 swarm:{title:'SWARM',subtitle:'Командная симуляция',href:'/games/swarm/'},
 inherit:{title:'INHERIT',subtitle:'Мир, который продолжают поколения',href:'/games/inherit/'},
 remix:{title:'REMIX',subtitle:'Арена испытаний',href:'/games/remix/'},
 'signal-run':{title:'SIGNAL RUN',subtitle:'Динамичная аркада',href:'/games/signal-run/'},
 'civic-cascade':{title:'CIVIC CASCADE',subtitle:'Кризисная стратегия',href:'/games/civic-cascade/'},
 patina:{title:'PATINA Atelier',subtitle:'Реставрационная мастерская',href:'/games/patina/'},
 'cascade-lab':{title:'CASCADE LAB',subtitle:'Физические головоломки',href:'/games/cascade-lab/'},
 'afterimage-run':{title:'AFTERIMAGE//RUN',subtitle:'Ежедневный sci-fi speedrun',href:'/games/afterimage-run/'},
 'aether-grid':{title:'AETHER GRID',subtitle:'Ежедневная головоломка',href:'/games/aether-grid/'}
};
const next={
 'null-shift':['civic-cascade','cascade-lab'],time:['civic-cascade','inherit'],
 swarm:['null-shift','signal-run'],inherit:['patina','time'],remix:['swarm','cascade-lab'],
 'signal-run':['swarm','null-shift'],'civic-cascade':['time','inherit'],patina:['inherit','civic-cascade'],
 'cascade-lab':['signal-run','afterimage-run'],'afterimage-run':['signal-run','cascade-lab'],'aether-grid':['cascade-lab','signal-run']
};
const host=document.querySelector('#post-run-recommendations'),dialog=document.querySelector('#player-dialog');
if(!host||!dialog)return;
const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
function clear(){if(typeof document.dispatchEvent==='function')document.dispatchEvent(new CustomEvent('osgard:dispose-postgame'));host.replaceChildren();host.hidden=true;dialog.classList.remove('has-recommendations')}
function render(id){
 if(!games[id]||!Array.isArray(next[id]))return;
 host.replaceChildren();
 host.append(make('p','post-run-heading','Сессия завершена · следующий маршрут'));
 host.append(make('p','post-run-copy','Продолжай игровую историю OSGARD — выбери следующий мир.'));
 const list=make('div','post-run-grid');
 next[id].forEach(nextId=>{const game=games[nextId];if(!game)return;const link=make('a','post-run-link');link.href=game.href;link.dataset.play=nextId;link.append(make('strong','',game.title),make('span','',game.subtitle),make('em','','Открыть ↗'));list.append(link)});
 host.append(list);host.hidden=false;dialog.classList.add('has-recommendations');
}
document.addEventListener('osgard:game-launching',clear);
document.addEventListener('osgard:game-completed',event=>render(event.detail&&event.detail.game));
document.addEventListener('osgard:game-session-ended',event=>{if(event.detail&&event.detail.sessionStarted===true)render(event.detail.game)});
})();

/* OSGARD PLAY growth loop: invite a friend after a real game completion. */
(() => {
'use strict';
const root=document.querySelector('#post-run-recommendations');
const dialog=document.querySelector('#player-dialog');
if(!root||!dialog||typeof window==='undefined'||typeof location==='undefined')return;
const games={
 'null-shift':{title:'NULL//SHIFT'},
 time:{title:'Империя времени'},
 swarm:{title:'SWARM'},
 inherit:{title:'INHERIT'},
 remix:{title:'REMIX'},
 'civic-cascade':{title:'CIVIC CASCADE'},
 patina:{title:'PATINA Atelier'},
 'signal-run':{title:'SIGNAL RUN'},
 'cascade-lab':{title:'CASCADE LAB'},'afterimage-run':{title:'AFTERIMAGE//RUN'},'aether-grid':{title:'AETHER GRID'}
};
const CONSENT_KEY='osgard.games.analytics-consent.v1';
const ATTR_KEY='osgard.games.referral-attribution.v1';
const SESSION_KEY='osgard.games.growth-session.v1';
const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
const consented=()=>{try{return localStorage.getItem(CONSENT_KEY)==='yes'}catch{return false}};
function token(){const bytes=new Uint8Array(6);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
function sessionId(){try{let value=sessionStorage.getItem(SESSION_KEY);if(value&&/^session_[a-f0-9]{24}$/.test(value))return value;value='session_'+token()+token();sessionStorage.setItem(SESSION_KEY,value);return value}catch{return 'session_'+token()+token()}}
const pendingTelemetry=new Set();
function cancelPendingTelemetry(){for(const controller of pendingTelemetry){try{controller.abort()}catch{}}pendingTelemetry.clear()}
async function sendEvent(name,gameId,source){
 if(!consented())return false;
 const event={eventId:'evt_'+token()+token(),name,sessionId:sessionId(),gameId:games[gameId]?gameId:'unknown',source:String(source||'games-hub').slice(0,80),path:location.pathname,durationSeconds:0};
 const queue=window.OSGARD_CONSENTED_ANALYTICS;
 if(queue&&typeof queue.enqueue==='function')return queue.enqueue(event);
 const controller=typeof AbortController==='function'?new AbortController():null;
 if(controller)pendingTelemetry.add(controller);
 try{
  const configOptions={cache:'no-store'};
  if(controller)configOptions.signal=controller.signal;
  const configResponse=await fetch('/games/commerce-config.json',configOptions);
  if(!consented()||(controller&&controller.signal.aborted))return false;
  const config=configResponse.ok?await configResponse.json().catch(()=>({})):{};
  if(!consented()||(controller&&controller.signal.aborted))return false;
   const rawBase=typeof config.apiBaseUrl==='string'?config.apiBaseUrl.trim():'';
   if(!rawBase)return false;
   let parsedBase;
   try{parsedBase=new URL(rawBase,location.origin)}catch{return false}
   const localApi=['localhost','127.0.0.1'].includes(parsedBase.hostname);
   const allowedPath=parsedBase.pathname==='/'||(parsedBase.pathname==='/commerce-api'&&(parsedBase.origin===location.origin||parsedBase.origin==='https://osgard.world'));
   if((parsedBase.protocol!=='https:'&&!(localApi&&parsedBase.protocol==='http:'))||parsedBase.username||parsedBase.password||!allowedPath||parsedBase.search||parsedBase.hash)return false;
   const base=parsedBase.origin+(parsedBase.pathname==='/'?'':parsedBase.pathname);
  const request={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,events:[event]})};
  if(controller)request.signal=controller.signal;
  const response=await fetch(base+'/v1/events',request);
  if(!consented()||(controller&&controller.signal.aborted))return false;
  return response.ok;
 }catch{return false}finally{if(controller)pendingTelemetry.delete(controller)}
}
function incomingInvite(){
 const params=new URLSearchParams(location.search);
 const source=params.get('utm_source')||'',medium=params.get('utm_medium')||'',campaign=params.get('utm_campaign')||'';
 const canonicalGame=params.get('og_game')||'',canonicalCode=params.get('og_ref')||'';
 const canonicalInvite=Boolean(games[canonicalGame]&&/^og_[a-f0-9]{8}$/.test(canonicalCode)&&source==='osgard_play'&&medium==='referral'&&campaign==='play_with_friends');
 if(canonicalInvite)return {game:canonicalGame,code:canonicalCode,legacy:false};
 const legacyGame=params.get('challenge')||'',legacyCode=params.get('ref')||'';
 const legacyInvite=Boolean(games[legacyGame]&&/^[a-f0-9]{12}$/.test(legacyCode)&&source==='osgard_games'&&medium==='referral'&&campaign==='play_with_a_friend');
 if(legacyInvite)return {game:legacyGame,code:legacyCode,legacy:true};
 return null;
}
async function recordInviteOpen(invite){
 if(!invite||!consented())return false;
 const marker='osgard.games.referral-opened.'+invite.code;
 try{
  sessionStorage.setItem(ATTR_KEY,JSON.stringify({code:invite.code,game:invite.game,at:Date.now()}));
  const state=sessionStorage.getItem(marker);
  if(state==='yes')return true;
  if(state==='pending')return false;
  sessionStorage.setItem(marker,'pending');
  const sent=await sendEvent('referral_link_opened',invite.game,'referral-link:'+invite.code);
  if(sent)sessionStorage.setItem(marker,'yes');
  else sessionStorage.removeItem(marker);
  return sent;
 }catch{
  try{if(sessionStorage.getItem(marker)==='pending')sessionStorage.removeItem(marker)}catch{}
  return false;
 }
}
function handleConsentToggle(){
 setTimeout(()=>{
  if(consented()){captureInvite();return}
  cancelPendingTelemetry();
  try{
   sessionStorage.removeItem(ATTR_KEY);
   const invite=incomingInvite();
   if(invite){const marker='osgard.games.referral-opened.'+invite.code;if(sessionStorage.getItem(marker)==='pending')sessionStorage.removeItem(marker)}
  }catch{}
 },0);
}
function captureInvite(){const invite=incomingInvite();if(invite)void recordInviteOpen(invite);return invite}
function ensureStyles(){
 if(document.querySelector('#osgard-growth-style'))return;
 const style=make('style');style.id='osgard-growth-style';
 style.textContent='.og-invite-banner{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin:0 0 22px;padding:20px 22px;border:1px solid #d3ff695c;background:linear-gradient(115deg,#d3ff6914,transparent 70%),#101411}.og-invite-eyebrow{margin:0 0 7px;color:#d3ff69;font:9px ui-monospace,monospace;letter-spacing:.14em}.og-invite-banner h3{margin:0;color:#f2f0e8;font:400 clamp(22px,3vw,32px)/1.08 Georgia,serif}.og-invite-banner p:not(.og-invite-eyebrow){margin:8px 0 0;color:#a5aaa1;font-size:12px;line-height:1.7}.og-invite-accept,.og-share-friend{min-height:43px;padding:11px 15px;border:1px solid #d3ff69;background:#d3ff69;color:#10140b;font:650 11px system-ui,sans-serif;cursor:pointer}.og-invite-banner button:focus-visible,.og-growth button:focus-visible,.og-growth a:focus-visible{outline:2px solid #f2f0e8;outline-offset:4px}.og-growth{display:grid;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid #ffffff1c}.og-growth-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.og-growth-label{color:#d3ff69;font:9px ui-monospace,monospace;letter-spacing:.1em}.og-growth-copy{margin:0;color:#a5aaa1;font-size:12px;line-height:1.6}.og-growth-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.og-create-game{display:inline-flex;align-items:center;min-height:40px;padding:9px 12px;border:1px solid #ffffff30;color:#f2f0e8;text-decoration:none;font-size:11px}.og-growth-status{margin:0;color:#d3ff69;font-size:11px;overflow-wrap:anywhere}.og-growth-status a{color:#d3ff69}@media(max-width:600px){.og-invite-banner{grid-template-columns:1fr;padding:16px}.og-invite-accept{width:100%}.og-growth-actions>*{width:100%;justify-content:center}}@media(prefers-reduced-motion:reduce){.og-invite-banner,.og-growth{scroll-behavior:auto;animation:none;transition:none}}';
 document.head.append(style);
}
function installInviteBanner(){
 const invite=incomingInvite(),catalog=document.querySelector('#catalog');
 // Canonical og_ref/og_game links use the Games hub's existing invitation ribbon.
 // Keep this secondary banner only for legacy challenge/ref links already shared.
 if(!invite||!invite.legacy||!catalog||catalog.querySelector('.og-invite-banner'))return;
 ensureStyles();
 const banner=make('aside','og-invite-banner');banner.setAttribute('aria-labelledby','og-invite-title');
 const copy=make('div');copy.append(make('p','og-invite-eyebrow','OSGARD PLAY / ЛИЧНОЕ ПРИГЛАШЕНИЕ'));
 copy.append(make('h3','','Тебя пригласили в '+games[invite.game].title));
 copy.append(make('p','','Открой игру и попробуй её сам. Приглашение не требует регистрации.'));
 const button=make('button','og-invite-accept','Принять приглашение ↗');button.type='button';button.id='osgard-accept-invite';
 banner.append(copy,button);
 const title=copy.querySelector('h3');if(title)title.id='og-invite-title';
 const heading=catalog.querySelector('.title');
 if(heading)heading.insertAdjacentElement('afterend',banner);else catalog.prepend(banner);
 button.addEventListener('click',()=>{
  void recordInviteOpen(invite);
  const link=document.querySelector('#games-grid .card[data-game="'+invite.game+'"] a[data-play]');
  if(link){link.click();return}
  document.querySelector('#games-grid .card[data-game="'+invite.game+'"]')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
 });
}
/* Post-session share, rewards and partner offers are owned by the unified OSGARD SELECT suite below. */
document.addEventListener('change',event=>{
 const target=event.target;
 if(target&&target.id==='analytics-toggle')handleConsentToggle();
});
document.addEventListener('click',event=>{
 const target=event.target;
 if(target&&typeof target.closest==='function'&&target.closest('#analytics-toggle'))handleConsentToggle();
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&consented())captureInvite()});
captureInvite();installInviteBanner();
})();


/* OSGARD SELECT — owned-service showcase and local share reward after every completed game. */
(() => {
'use strict';
const root=document.querySelector('#post-run-recommendations');
const outsideRoot=document.querySelector('#osgard-aftergame-intermission');
if(!root||typeof window==='undefined'||typeof location==='undefined')return;
const titles={'null-shift':'NULL//SHIFT',time:'Империя времени',swarm:'SWARM',inherit:'INHERIT',remix:'REMIX','civic-cascade':'CIVIC CASCADE',patina:'PATINA Atelier','signal-run':'SIGNAL RUN','cascade-lab':'CASCADE LAB','afterimage-run':'AFTERIMAGE//RUN','aether-grid':'AETHER GRID'};
const services=[
 ['marcosa','05','MARCOSA','SOCIAL / COMMUNITY','Премиальная социальная сеть нового поколения для общения и сообществ','https://marcosa.club/',true],
 ['projects','01','OSGARD BEW WORLD','DIGITAL STUDIO','Создание проектов, сайтов и приложений','https://osgardbewworld.com/'],
 ['o2-system','02','O2 SYSTEM','BUSINESS OPERATIONS','Система учёта кассы обменников','https://o2system.art/'],
 ['senjorio','03','SENJORIO','PREMIUM MOBILITY','Премиальный сервис такси','https://senjorio.com/'],
 ['superday','04','SUPERDAY','MAP / DAILY PLANNING','Умная карта и планировщик дня','https://superday.run/'],
 ['myosa','06','MYOSA','AI PLATFORM','Платформа искусственного интеллекта нового поколения','https://myosa.world/'],
 ['gold-glamour','07','GOLD GLAMOUR','LUXURY SERVICES','Премиальные услуги с золотом и выездным обслуживанием','https://gold-glamour.online/'],
 ['gardvpn','08','GARD VPN','PRIVACY / VPN','Временно не продвигается: главная страница не подтверждает, что VPN-соединение действительно устанавливается.','https://gardvpn.is/',false,false],
 ['osgard-business','09','OSGARD OS','BUSINESS INTELLIGENCE','Диагностика бизнеса, развитие и рекомендации по росту','https://osgardos.com/'],
 ['vanguard','10','OSGARD VANGUARD STUDIO','VIDEO STUDIO','Создание видео и визуальных проектов','https://osgardvanguard.studio/'],
 ['partner-studio','11','OSGARD PARTNER STUDIO','BRANDED GAMES / B2B','Заказные мини-игры и брендированные игровые события для компаний','/games/partners/']
];
const walletKey='osgard.games.shards-wallet.v1',dailyReward=50;
const servicePreferencesKey='osgard.games.postgame-service-preferences.v1';
const promoSnoozeKey='osgard.games.postgame-snooze-until.v1';
const promoSnoozeMs=24*60*60*1000;
const serviceProgressKey='osgard.games.postgame-service-progress.v1';
const availableServiceIds=services.filter(item=>item[7]!==false).map(item=>item[0]);
const frequencyValues=['each','every3','off'];
const preferredServiceKey='osgard.games.preferred-service.v1';
const recommendationByGame={
 'null-shift':['myosa','osgard-business','projects','superday'],
 time:['o2-system','osgard-business','superday','projects'],
 swarm:['marcosa','superday','projects'],
 inherit:['marcosa','myosa','projects'],
 remix:['marcosa','vanguard','projects'],
 'civic-cascade':['osgard-business','superday','o2-system'],
 patina:['gold-glamour','vanguard','projects'],
 'signal-run':['myosa','projects','superday'],
 'cascade-lab':['projects','myosa','vanguard'],
 'remix':['marcosa','vanguard','projects','partner-studio'],
 'patina':['gold-glamour','vanguard','projects','partner-studio'],
 'afterimage-run':['superday','projects','vanguard','partner-studio'],
 'aether-grid':['projects','myosa','vanguard','partner-studio']
};
function readPreferredService(){try{const id=localStorage.getItem(preferredServiceKey)||'';return availableServiceIds.includes(id)?id:''}catch{return''}}
function savePreferredService(id){if(!availableServiceIds.includes(id))return false;try{localStorage.setItem(preferredServiceKey,id);return true}catch{return false}}
let memoryServicePreferences=null;
let memoryPromoSnoozeUntil=0;
let memoryServiceProgress={count:0,lastAt:0,lastGame:'',sessions:[],byGame:{}};
function readPromoSnoozeUntil(now=Date.now()){
 try{
  const value=Number(localStorage.getItem(promoSnoozeKey)||0);
  if(Number.isSafeInteger(value)&&value>now&&value-now<=promoSnoozeMs+60000){memoryPromoSnoozeUntil=value;return value}
  if(value>0)localStorage.removeItem(promoSnoozeKey);
  memoryPromoSnoozeUntil=0;return 0;
 }catch{return Number.isSafeInteger(memoryPromoSnoozeUntil)&&memoryPromoSnoozeUntil>now?memoryPromoSnoozeUntil:0}
}
function snoozeServicePromosForDay(now=Date.now()){
 const until=now+promoSnoozeMs;memoryPromoSnoozeUntil=until;
 try{localStorage.setItem(promoSnoozeKey,String(until));return{ok:true,persisted:true,until}}
 catch{return{ok:true,persisted:false,until}}
}
function clearServicePromoSnooze(){
 memoryPromoSnoozeUntil=0;
 try{localStorage.removeItem(promoSnoozeKey);return true}catch{return false}
}
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function disposePostgameTree(node){if(!node)return;const dispose=node.__osgardDispose;if(typeof dispose==='function'){node.__osgardDispose=null;try{dispose()}catch{}}Array.from(node.children||[]).forEach(disposePostgameTree)}
function disposeCurrentPostgame(){disposePostgameTree(root);disposePostgameTree(outsideRoot)}
document.addEventListener('osgard:dispose-postgame',disposeCurrentPostgame);
const selectConsentKey='osgard.games.analytics-consent.v1';
const selectSessionKey='osgard.games.growth-session.v1';
const selectAllowedEvents=new Set(['cross_promo_clicked','owned_promo_impression','owned_promo_intermission_skipped','owned_promo_preferences_saved','owned_promo_snoozed','owned_promo_snooze_cleared','social_share_intent','social_reward_claimed','referral_reward_claimed','share_created','invite_link_prepared']);
function hasConsent(){try{return localStorage.getItem(selectConsentKey)==='yes'}catch{return false}}
const promoImpressionKeyPrefix='osgard.games.promo-impression.v1:';
const fallbackPromoImpressions=new Set();
let memorySpotlightVariant='';
function claimPromoImpression(key){
 const normalized=String(key||'').replace(/[^a-zA-Z0-9:_-]/g,'').slice(0,120);
 if(!normalized)return false;
 const storageKey=promoImpressionKeyPrefix+normalized;
 try{
  if(sessionStorage.getItem(storageKey)==='1')return false;
  sessionStorage.setItem(storageKey,'1');
  fallbackPromoImpressions.add(normalized);
  return true;
 }catch{
  if(fallbackPromoImpressions.has(normalized))return false;
  fallbackPromoImpressions.add(normalized);
  return true;
 }
}
function getSessionSpotlightVariant(){
 if(memorySpotlightVariant==='a'||memorySpotlightVariant==='b'||memorySpotlightVariant==='c')return memorySpotlightVariant;
 const key='osgard.games.select-spotlight-variant.v1';
 try{
  const existing=sessionStorage.getItem(key);
  if(existing==='a'||existing==='b'||existing==='c'){memorySpotlightVariant=existing;return existing}
  const roll=Math.random();memorySpotlightVariant=roll<1/3?'a':roll<2/3?'b':'c';
  sessionStorage.setItem(key,memorySpotlightVariant);
  return memorySpotlightVariant;
 }catch{
  const roll=Math.random();memorySpotlightVariant=roll<1/3?'a':roll<2/3?'b':'c';
  return memorySpotlightVariant;
 }
}
const pendingSelectTelemetry=new Set();
function cancelPendingSelectTelemetry(){for(const controller of pendingSelectTelemetry){try{controller.abort()}catch{}}pendingSelectTelemetry.clear()}
function checkSelectConsentAfterToggle(){setTimeout(()=>{if(!hasConsent())cancelPendingSelectTelemetry()},0)}
document.addEventListener('change',event=>{
 if(event.target&&event.target.id==='analytics-toggle'){
  checkSelectConsentAfterToggle();
  // Re-arm visibility observers when consent changes without rebuilding or resetting the user's current filters.
  setTimeout(()=>refreshCurrentServiceShelf(),0);
  setTimeout(()=>{const button=document.querySelector('.og-postgame-qualified-claim'),status=document.querySelector('.og-postgame-qualified-status');if(button&&status)void refreshQualifiedClaimButton(button,status)},0);
 }
});
document.addEventListener('click',event=>{
 const target=event.target;
 if(target&&typeof target.closest==='function'&&target.closest('#analytics-toggle')){
  checkSelectConsentAfterToggle();
  setTimeout(()=>{const button=document.querySelector('.og-postgame-qualified-claim'),status=document.querySelector('.og-postgame-qualified-status');if(button&&status)void refreshQualifiedClaimButton(button,status)},0);
 }
});
function selectSessionId(){
 try{let value=sessionStorage.getItem(selectSessionKey);if(value&&/^session_[a-f0-9]{24}$/.test(value))return value;value='session_'+makeEventToken()+makeEventToken();sessionStorage.setItem(selectSessionKey,value);return value}
 catch{return 'session_'+makeEventToken()+makeEventToken()}
}
function makeEventToken(){
 const bytes=new Uint8Array(6);
 if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
 else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
async function sendSelectEvent(name,gameId,source){
 if(!hasConsent()||!selectAllowedEvents.has(name))return false;
 const event={eventId:'evt_'+makeEventToken()+makeEventToken(),name,sessionId:selectSessionId(),gameId:titles[gameId]?gameId:'unknown',source:String(source||'osgard-select').slice(0,80),path:location.pathname,durationSeconds:0};
 const queue=window.OSGARD_CONSENTED_ANALYTICS;
 if(queue&&typeof queue.enqueue==='function')return queue.enqueue(event);
 const controller=typeof AbortController==='function'?new AbortController():null;
 if(controller)pendingSelectTelemetry.add(controller);
 try{
  if(!hasConsent())return false;
  const options={cache:'no-store'};
  if(controller)options.signal=controller.signal;
  const configResponse=await fetch('/games/commerce-config.json',options);
  if(!hasConsent()||(controller&&controller.signal.aborted))return false;
  const config=configResponse.ok?await configResponse.json().catch(()=>({})):{};
  if(!hasConsent()||(controller&&controller.signal.aborted))return false;
  const rawBase=typeof config.apiBaseUrl==='string'?config.apiBaseUrl.trim():'';
  if(!rawBase)return false;
  let parsedBase;
  try{parsedBase=new URL(rawBase,location.origin)}catch{return false}
  const localApi=['localhost','127.0.0.1'].includes(parsedBase.hostname);
  const allowedPath=parsedBase.pathname==='/'||(parsedBase.pathname==='/commerce-api'&&(parsedBase.origin===location.origin||parsedBase.origin==='https://osgard.world'));
  if((parsedBase.protocol!=='https:'&&!(localApi&&parsedBase.protocol==='http:'))||parsedBase.username||parsedBase.password||!allowedPath||parsedBase.search||parsedBase.hash)return false;
  const base=parsedBase.origin+(parsedBase.pathname==='/'?'':parsedBase.pathname);
  const request={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,events:[event]})};
  if(controller)request.signal=controller.signal;
  const response=await fetch(base+'/v1/events',request);
  if(!hasConsent()||(controller&&controller.signal.aborted))return false;
  return response.ok;
 }catch{return false}finally{if(controller)pendingSelectTelemetry.delete(controller)}
}
const referralOwnerKey='osgard.games.referral-owner.v1';
function getOrCreateReferralOwnerToken(){
 try{
  let token=localStorage.getItem(referralOwnerKey)||'';
  if(/^[a-f0-9]{32}$/.test(token))return token;
  const bytes=new Uint8Array(16);
  if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
  else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
  token=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
  localStorage.setItem(referralOwnerKey,token);
  return token;
 }catch{return ''}
}
async function resolveReferralApiBase(){
 try{
  const configResponse=await fetch('/games/commerce-config.json',{cache:'no-store',credentials:'same-origin'});
  const config=configResponse.ok?await configResponse.json().catch(()=>({})):{};
  const rawBase=typeof config.apiBaseUrl==='string'?config.apiBaseUrl.trim():'';
  let base='';
  if(!rawBase){
   const healthResponse=await fetch('/commerce-api/healthz',{cache:'no-store',credentials:'omit'});
   const health=healthResponse.ok?await healthResponse.json().catch(()=>({})):{};
   if(healthResponse.ok&&health.service==='osgard-commerce-api'&&health.databaseReady===true)base=location.origin+'/commerce-api';
   else return{ok:false,reason:'not-configured'};
  }else{
   let parsedBase;
   try{parsedBase=new URL(rawBase,location.origin)}catch{return{ok:false,reason:'invalid-config'}}
   const localApi=['localhost','127.0.0.1'].includes(parsedBase.hostname);
   const allowedPath=parsedBase.pathname==='/'||(parsedBase.pathname==='/commerce-api'&&(parsedBase.origin===location.origin||parsedBase.origin==='https://osgard.world'));
   if((parsedBase.protocol!=='https:'&&!(localApi&&parsedBase.protocol==='http:'))||parsedBase.username||parsedBase.password||!allowedPath||parsedBase.search||parsedBase.hash)return{ok:false,reason:'invalid-config'};
   base=parsedBase.origin+(parsedBase.pathname==='/'?'':parsedBase.pathname);
   const healthResponse=await fetch(base+'/healthz',{cache:'no-store',credentials:'omit'});
   const health=healthResponse.ok?await healthResponse.json().catch(()=>({})):{};
   if(!healthResponse.ok||health.service!=='osgard-commerce-api'||health.databaseReady!==true)return{ok:false,reason:'database-not-ready'};
  }
  return{ok:true,base};
 }catch{return{ok:false,reason:'network'}}
}
async function postReferralRequest(path,payload){
 if(!hasConsent())return{ok:false,reason:'consent'};
 const api=await resolveReferralApiBase();
 if(!api.ok)return api;
 try{
  const response=await fetch(api.base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:api.base.startsWith(location.origin)?'same-origin':'omit',keepalive:true});
  const data=await response.json().catch(()=>({}));
  return{ok:response.ok,status:response.status,data};
 }catch{return{ok:false,reason:'network'}}
}
async function registerReferralInvite(gameId,referralCode){
 if(!hasConsent()||!titles[gameId]||!/^og_[a-f0-9]{8}$/.test(String(referralCode||'')))return false;
 const ownerToken=getOrCreateReferralOwnerToken();
 if(!ownerToken)return false;
 const result=await postReferralRequest('/v1/referrals/register',{consent:true,referralCode,gameId,ownerToken});
 return result.ok===true;
}
function canPersistReferralWallet(){
 const probe='osgard.games.wallet-probe.'+makeEventToken();
 try{const current=localStorage.getItem(walletKey);localStorage.setItem(probe,'1');localStorage.removeItem(probe);if(current!==null)localStorage.setItem(walletKey,current);return true}catch{try{localStorage.removeItem(probe)}catch{}return false}
}
function addQualifiedReferralShards(claims){
 if(!Array.isArray(claims)||claims.length>10)return{ok:false,balance:getWallet().balance,count:0,amount:0};
 const current=getWallet(),known=new Set(current.claims),accepted=[];
 for(const item of claims){
  const code=String(item?.referralCode||''),amount=Number(item?.amount);
  if(!/^og_[a-f0-9]{8}$/.test(code)||amount!==50)return{ok:false,balance:current.balance,count:0,amount:0};
  if(!known.has(code)){known.add(code);accepted.push(code)}
 }
 const amount=accepted.length*50,balance=Math.min(1000000000,current.balance+amount);
 const qualifiedClaims=[...current.claims,...accepted].slice(-5000);
 try{
  localStorage.setItem(walletKey,JSON.stringify({balance,lastRewardDay:current.day,lastSource:accepted.length?'qualified-referral':'qualified-referral-retry',qualifiedClaims,updatedAt:new Date().toISOString()}));
  return{ok:true,balance,count:accepted.length,amount,claimCodes:claims.map(item=>item.referralCode)};
 }catch{return{ok:false,balance:current.balance,count:0,amount:0}}
}
async function referralApiAvailability(){
 if(!hasConsent())return{ready:false,reason:'consent'};
 const api=await resolveReferralApiBase();
 return api.ok?{ready:true}:{ready:false,reason:api.reason||'network'};
}
async function refreshQualifiedClaimButton(button,status){
 const availability=await referralApiAvailability();
 button.disabled=!availability.ready;
 button.textContent=availability.ready?'Проверить награду за друга ↗':availability.reason==='consent'?'Награда за друга · требуется согласие':availability.reason==='not-configured'?'Серверная награда пока не подключена':'Серверная награда временно недоступна';
 if(availability.ready){if(!status.textContent)status.textContent='Серверная проверка доступна. Награда выдаётся по зарегистрированным приглашениям и завершённым сессиям.';return}
 if(availability.reason==='consent')status.textContent='Для серверной награды нужно разрешить необязательную аналитику. Ссылки можно отправлять и без этого.';
 else if(availability.reason==='not-configured')status.textContent='Ссылки-приглашения и локальные SHARDS работают. Серверная награда появится после настройки Commerce API.';
 else status.textContent='Сервер наград пока не готов. Локальная награда за самоподтверждённую публикацию остаётся доступна.';
}
async function claimQualifiedReferralShards(){
 if(!hasConsent())return{ok:false,reason:'consent'};
 if(!canPersistReferralWallet())return{ok:false,reason:'wallet-storage'};
 let ownerToken='';
 try{ownerToken=localStorage.getItem(referralOwnerKey)||''}catch{}
 if(!/^[a-f0-9]{32}$/.test(ownerToken))return{ok:false,reason:'no-invites'};
 const result=await postReferralRequest('/v1/referrals/prepare-claim',{consent:true,ownerToken});
 if(!result.ok)return{ok:false,reason:result.reason||result.data?.error||'unavailable'};
 const claims=result.data?.claims;
 if(!Array.isArray(claims)||claims.length>10||claims.some(item=>!item||!/^og_[a-f0-9]{8}$/.test(String(item.referralCode||''))||Number(item.amount)!==50))return{ok:false,reason:'invalid-response'};
 return{ok:true,count:claims.length,amount:claims.length*50,claims,ownerToken};
}
function readServicePreferences(){
 const fallback={frequency:'each',selected:availableServiceIds.slice()};
 let stored=null;
 try{const raw=localStorage.getItem(servicePreferencesKey);if(raw)stored=JSON.parse(raw)}catch{return memoryServicePreferences?{frequency:memoryServicePreferences.frequency,selected:memoryServicePreferences.selected.slice()}:fallback}
 if(!stored||typeof stored!=='object')return memoryServicePreferences?{frequency:memoryServicePreferences.frequency,selected:memoryServicePreferences.selected.slice()}:fallback;
 return {frequency:frequencyValues.includes(stored.frequency)?stored.frequency:'each',selected:Array.isArray(stored.selected)?availableServiceIds.filter(id=>stored.selected.includes(id)):fallback.selected};
}
function writeServicePreferences(value){
 const next={frequency:frequencyValues.includes(value.frequency)?value.frequency:'each',selected:availableServiceIds.filter(id=>Array.isArray(value.selected)&&value.selected.includes(id))};
 memoryServicePreferences=next;
 try{localStorage.setItem(servicePreferencesKey,JSON.stringify(next));return true}catch{return false}
}
function readServiceProgress(){
 const normalizeByGame=value=>{
  const result={};
  if(!value||typeof value!=='object'||Array.isArray(value))return result;
  for(const [id,count] of Object.entries(value)){
   if(titles[id]&&Number.isSafeInteger(count)&&count>=0)result[id]=Math.min(count,1000000000);
  }
  return result;
 };
 try{
  const raw=localStorage.getItem(serviceProgressKey);
  if(raw){
   const value=JSON.parse(raw);
   return{
    count:Number.isSafeInteger(value.count)&&value.count>=0?Math.min(value.count,1000000000):0,
    lastAt:Number.isFinite(value.lastAt)?value.lastAt:0,
    lastGame:typeof value.lastGame==='string'?value.lastGame:'',
    sessions:Array.isArray(value.sessions)?value.sessions.filter(id=>typeof id==='string'&&/^[a-z0-9:_-]{1,160}$/i.test(id)).slice(-100):[],
    byGame:normalizeByGame(value.byGame)
   };
  }
 }catch{}
 return {...memoryServiceProgress,sessions:[...(memoryServiceProgress.sessions||[])],byGame:normalizeByGame(memoryServiceProgress.byGame)};
}
function recordCompletedRound(gameId,sessionId){
 const current=readServiceProgress(),now=Date.now(),key=typeof sessionId==='string'&&/^[a-z0-9:_-]{1,160}$/i.test(sessionId)?sessionId:'';
 if(key&&current.sessions.includes(key))return current.count;
 if(!key&&current.lastGame===gameId&&now>=current.lastAt&&now-current.lastAt<2500)return current.count;
 const sessions=key?[...current.sessions.filter(id=>id!==key),key].slice(-100):current.sessions;
 const byGame={...current.byGame};
 if(titles[gameId])byGame[gameId]=Math.min((byGame[gameId]||0)+1,1000000000);
 const next={count:Math.min(current.count+1,1000000000),lastAt:now,lastGame:gameId,sessions,byGame};memoryServiceProgress=next;
 try{localStorage.setItem(serviceProgressKey,JSON.stringify(next))}catch{}
 return next.count;
}
function shouldShowServicePromos(preferences,completedCount,now=Date.now()){
 if(readPromoSnoozeUntil(now)>now)return false;
 if(preferences.frequency==='off')return false;
 if(preferences.frequency==='every3')return completedCount>0&&completedCount%3===0;
 return true;
}
function normalizeServiceSearchQuery(value){return String(value??'').normalize('NFKC').trim().toLocaleLowerCase().slice(0,100)}
function matchesServiceFilter(category,selectedCategory,searchableText,query){
 const categoryMatch=selectedCategory==='all'||category===selectedCategory;
 const normalized=normalizeServiceSearchQuery(query);
 return categoryMatch&&(!normalized||String(searchableText??'').normalize('NFKC').toLocaleLowerCase().includes(normalized));
}
function chooseSpotlightService(options,preferred,completedCount,frequency){
 const candidates=Array.isArray(options)?options.filter(id=>typeof id==='string'&&id.length>0):[];
 if(!candidates.length)return '';
 if(candidates.includes(preferred))return preferred;
 const count=Number.isSafeInteger(completedCount)&&completedCount>0?completedCount:1;
 const displayNumber=frequency==='every3'?Math.max(1,Math.floor(count/3)):count;
 return candidates[(displayNumber-1)%candidates.length];
}
function frequencySummary(preferences,completedCount){
 const pausedUntil=readPromoSnoozeUntil();
 if(pausedUntil>Date.now())return 'Промо-подборка на паузе до '+new Date(pausedUntil).toLocaleString()+'. Награды за приглашение остаются доступны.';
 if(preferences.frequency==='off')return 'Подборка отключена. Награды за приглашение остаются доступны.';
 if(preferences.frequency==='every3')return 'Подборка появляется раз в три завершённых раунда. Следующий показ: через '+(3-(completedCount%3))+' раунд(а).';
 return 'Подборка появляется после каждой завершённой игры. В настройках можно выбрать другой интервал или отключить показ.';
}
function inviteFor(id){
 try{const candidate=window.OSGARDInvite?.createLink?.(id);if(candidate){const u=new URL(candidate,location.origin);if(u.origin===location.origin&&u.pathname==='/games/invite/'+id+'/'&&u.searchParams.get('og_game')===id&&/^og_[a-f0-9]{8}$/.test(u.searchParams.get('og_ref')||''))return u.href}}catch{}
 const bytes=new Uint8Array(4);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
 const u=new URL('/games/invite/'+encodeURIComponent(id)+'/',location.origin);u.searchParams.set('og_ref','og_'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''));u.searchParams.set('og_game',id);
 u.searchParams.set('utm_source','osgard_play');u.searchParams.set('utm_medium','referral');u.searchParams.set('utm_campaign','play_with_friends');u.searchParams.set('utm_content',id);return u.href;
}
function getWallet(){try{const w=JSON.parse(localStorage.getItem(walletKey)||'{}'),claims=Array.isArray(w.qualifiedClaims)?[...new Set(w.qualifiedClaims.filter(code=>/^og_[a-f0-9]{8}$/.test(String(code))))].slice(-5000):[];return{balance:Number.isSafeInteger(w.balance)&&w.balance>=0?Math.min(w.balance,1e9):0,day:typeof w.lastRewardDay==='string'?w.lastRewardDay:'',claims}}catch{return{balance:0,day:'',claims:[]}}}
function award(source){const current=getWallet(),day=new Date().toISOString().slice(0,10);if(current.day===day)return{ok:false,already:true,balance:current.balance};const next={balance:Math.min(1e9,current.balance+dailyReward),lastRewardDay:day,lastSource:String(source||'share').slice(0,60),qualifiedClaims:current.claims,updatedAt:new Date().toISOString()};try{localStorage.setItem(walletKey,JSON.stringify(next));return{ok:true,balance:next.balance}}catch{return{ok:false,balance:current.balance}}}
function servicesShelf(gameId,showPromos,completedCount){
 const preferences=readServicePreferences();
 const section=make('section','og-postgame-services'),head=make('div','og-postgame-service-head'),intro=make('div');
 intro.append(make('p','og-postgame-eyebrow','OSGARD SELECT / BETWEEN WORLDS'),make('p','og-postgame-disclosure','РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD'),make('h3','og-postgame-title','Мир не заканчивается после раунда.'),make('p','og-postgame-copy','Выбери категорию и сервис, который хочешь посмотреть. Автозапуска нет. Это самореклама экосистемы OSGARD; переход добровольный и откроется в новой вкладке.'));
 const settingsToggle=make('button','og-postgame-toggle og-postgame-settings-toggle','Настроить показ');settingsToggle.type='button';settingsToggle.setAttribute('aria-expanded','false');settingsToggle.setAttribute('aria-controls','og-postgame-preferences');
 const collapseToggle=make('button','og-postgame-toggle og-postgame-collapse-toggle',showPromos?'Свернуть подборку':'Подборка по расписанию');collapseToggle.type='button';collapseToggle.setAttribute('aria-expanded',String(Boolean(showPromos)));
 const currentSnooze=readPromoSnoozeUntil(),snoozeActive=currentSnooze>Date.now();
 const snoozeButton=make('button','og-postgame-toggle og-postgame-snooze',snoozeActive?'Возобновить показы':'Пауза 24 часа');snoozeButton.type='button';snoozeButton.disabled=preferences.frequency==='off';snoozeButton.setAttribute('aria-label',snoozeActive?'Возобновить межигровые предложения OSGARD раньше срока':'Приостановить подборку собственных сервисов OSGARD на 24 часа');
 const headActions=make('div','og-postgame-service-head-actions');headActions.append(settingsToggle,collapseToggle,snoozeButton);head.append(intro,headActions);

 const settings=make('div','og-postgame-preferences');settings.id='og-postgame-preferences';settings.hidden=true;
 const settingsHeading=make('p','og-postgame-settings-heading','ЧАСТОТА И ИНТЕРЕСЫ');
 const settingsDescription=make('p','og-postgame-settings-copy','По умолчанию подборка появляется после каждой завершённой игры. Выбери интересующие проекты, измени частоту или отключи промо-показы.');
 const frequencyLabel=make('label','og-postgame-frequency-label','Как часто показывать');
 const frequency=make('select','og-postgame-frequency');frequency.setAttribute('aria-label','Частота показа сервисов OSGARD');
 [['each','После каждой завершённой игры'],['every3','Раз в три завершённых раунда'],['off','Не показывать подборку']].forEach(([value,labelText])=>{const option=make('option','',labelText);option.value=value;frequency.append(option)});
 frequency.value=preferences.frequency;frequencyLabel.append(frequency);
 const choicesHeading=make('p','og-postgame-settings-subheading','ВЫБЕРИ СЕРВИСЫ');
 const choices=make('div','og-postgame-service-options');
 services.forEach(([id,num,title,category,description,href,featured=false,active=true])=>{
  const label=make('label','og-postgame-service-option'+(active===false?' is-unavailable':''));
  const input=make('input','');input.type='checkbox';input.dataset.servicePreference=id;input.checked=preferences.selected.includes(id);input.disabled=active===false;input.setAttribute('aria-label','Показывать '+title);
  const copy=make('span','og-postgame-service-option-copy');copy.append(make('strong','',title),make('small','',active===false?'Доступность не подтверждена':category));
  label.append(input,copy);choices.append(label);
 });
 const presetActions=make('div','og-postgame-presets');
 const allButton=make('button','og-postgame-preset','Все доступные');allButton.type='button';
 const clearButton=make('button','og-postgame-preset','Ничего не показывать');clearButton.type='button';
 presetActions.append(allButton,clearButton);
 allButton.addEventListener('click',()=>choices.querySelectorAll('input[data-service-preference]:not(:disabled)').forEach(input=>{input.checked=true}));
 clearButton.addEventListener('click',()=>choices.querySelectorAll('input[data-service-preference]:not(:disabled)').forEach(input=>{input.checked=false}));
 const saveButton=make('button','og-postgame-save','Сохранить настройки');saveButton.type='button';
 const preferencesStatus=make('p','og-postgame-settings-status');preferencesStatus.setAttribute('role','status');preferencesStatus.setAttribute('aria-live','polite');
 settings.append(settingsHeading,settingsDescription,frequencyLabel,choicesHeading,choices,presetActions,saveButton,preferencesStatus);

 const categoryByService={projects:'studio',vanguard:'studio','partner-studio':'studio','o2-system':'business','osgard-business':'business',senjorio:'life',superday:'life',myosa:'tech',gardvpn:'tech',marcosa:'social','gold-glamour':'luxury'};
 const filterDefs=[['all','Все доступные · '+availableServiceIds.length],['studio','Разработка · 3'],['business','Бизнес · 2'],['life','Город и жизнь · 2'],['tech','Технологии · 2'],['social','Социальные · 1'],['luxury','Luxury · 1']];
 const filters=make('div','og-postgame-service-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Выбрать категорию сервиса OSGARD');
 const filterButtons=[];
 filterDefs.forEach(([id,labelText])=>{const button=make('button','og-postgame-service-filter',labelText);button.type='button';button.dataset.osgardServiceFilter=id;button.setAttribute('aria-pressed',String(id==='all'));filters.append(button);filterButtons.push(button)});
 const activeSelected=services.filter(([id,,,,,,featured=false,active=true])=>active!==false&&preferences.selected.includes(id));
 const spotlightId=activeSelected.length?activeSelected[(Math.max(0,completedCount-1)%activeSelected.length)][0]:null;
 const preferred=readPreferredService();
 const contextualOrder=recommendationByGame[gameId]||['marcosa'];
 const selectedIds=activeSelected.map(item=>item[0]);
 const relevantOrder=contextualOrder.filter(id=>selectedIds.includes(id));
 const spotlightOptions=[...relevantOrder,...selectedIds.filter(id=>!relevantOrder.includes(id))];
 const roundForSpotlight=preferences.frequency==='every3'?completedCount:(readServiceProgress().byGame[gameId]||1);
 let spotlightServiceId=chooseSpotlightService(spotlightOptions,preferred,roundForSpotlight,preferences.frequency)||spotlightId||'';
 // Assign once per page session; re-rendering the spotlight must not change the experiment cohort.
 const sessionSpotlightVariant=getSessionSpotlightVariant();
 let spotlightVariant=sessionSpotlightVariant;
 const spotlight=make('article','og-postgame-spotlight');
 spotlight.setAttribute('aria-label','Персональная рекомендация OSGARD');
 const spotlightStatus=make('p','og-postgame-spotlight-status');
 spotlightStatus.setAttribute('role','status');spotlightStatus.setAttribute('aria-live','polite');
 const spotlightSeen=new Set();
 let spotlightObserver=null,spotlightImpressionTimer=0,spotlightIsVisible=false;
 function clearSpotlightImpression(){
  if(spotlightImpressionTimer){clearTimeout(spotlightImpressionTimer);spotlightImpressionTimer=0}
 }
 function stopSpotlightWatcher(){
  clearSpotlightImpression();
  spotlightIsVisible=false;
  if(spotlightObserver){spotlightObserver.disconnect();spotlightObserver=null}
 }
 function canCountSpotlightImpression(visible,consented,connected,hidden,backgrounded,currentService,targetService){
  return Boolean(visible&&consented&&connected&&!hidden&&!backgrounded&&currentService===targetService);
 }
 function watchSpotlight(){
  stopSpotlightWatcher();
  if(typeof IntersectionObserver!=='function'||spotlight.hidden||!spotlight.isConnected)return;
  const serviceId=spotlightServiceId,variant=spotlightVariant,seenKey=gameId+':'+serviceId+':'+variant;
  if(spotlightSeen.has(seenKey))return;
  spotlightObserver=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{
    spotlightIsVisible=Boolean(entry.isIntersecting&&entry.intersectionRatio>=0.5);
    if(!spotlightIsVisible){clearSpotlightImpression();return}
    if(spotlightImpressionTimer)return;
    spotlightImpressionTimer=setTimeout(()=>{
     spotlightImpressionTimer=0;
     if(!canCountSpotlightImpression(spotlightIsVisible,hasConsent(),spotlight.isConnected,spotlight.hidden,document.visibilityState!=='visible',spotlight.dataset.service,serviceId))return;
     if(!claimPromoImpression('spotlight:'+seenKey))return;
     spotlightSeen.add(seenKey);
     void sendSelectEvent('owned_promo_impression',gameId,'osgard-select:spotlight:'+serviceId+':'+variant);
     if(spotlightObserver){spotlightObserver.disconnect();spotlightObserver=null}
    },1000);
   });
  },{threshold:[0,0.5,1]});
  spotlightObserver.observe(spotlight);
 }
 function renderSpotlight(serviceId){
  stopSpotlightWatcher();
  spotlightVariant=sessionSpotlightVariant;
  const variant=spotlightVariant;
  const item=services.find(entry=>entry[0]===serviceId&&entry[7]!==false);
  if(!item||!showPromos||!activeSelected.length){spotlight.hidden=true;return}
  spotlight.hidden=false;spotlight.dataset.service=item[0];spotlight.dataset.promoVariant=variant;spotlight.replaceChildren();
  const copy=make('div','og-postgame-spotlight-copy');
  copy.append(make('span','og-postgame-spotlight-label','OSGARD SELECT / PERSONAL SPOTLIGHT'));
  copy.append(make('span','og-postgame-spotlight-kicker',item[3]+' · СОВЕТ ДЛЯ '+String(titles[gameId]||'OSGARD PLAY').toUpperCase()));
  copy.append(make('h4','og-postgame-spotlight-name',item[2]));
  copy.append(make('p','og-postgame-spotlight-description',item[4]));
  const actions=make('div','og-postgame-spotlight-actions');
  const open=make('a','og-postgame-spotlight-open',variant==='a'?'Открыть официальный сайт ↗':variant==='b'?'Изучить сервис ↗':'Посмотреть возможности ↗');
  const url=new URL(item[5],location.origin);url.searchParams.set('utm_source','osgard_games');url.searchParams.set('utm_medium','post_game');url.searchParams.set('utm_campaign','after_game');url.searchParams.set('utm_content',item[0]+'_'+gameId);
  open.href=url.href;open.target='_blank';open.rel='noopener noreferrer';open.dataset.service=item[0];open.dataset.game=gameId;
  open.dataset.promoVariant=variant;
  open.addEventListener('click',()=>{
   if(!hasConsent())return;
   const seenKey=gameId+':'+item[0]+':'+variant;
   if(canCountSpotlightImpression(spotlightIsVisible,hasConsent(),spotlight.isConnected,spotlight.hidden,document.visibilityState!=='visible',spotlight.dataset.service,item[0])&&claimPromoImpression('spotlight:'+seenKey)){
    spotlightSeen.add(seenKey);clearSpotlightImpression();
    if(spotlightObserver){spotlightObserver.disconnect();spotlightObserver=null}
    void sendSelectEvent('owned_promo_impression',gameId,'osgard-select:spotlight:'+item[0]+':'+variant);
   }
   if(claimPromoImpression('spotlight-click:'+seenKey))void sendSelectEvent('cross_promo_clicked',gameId,'osgard-select:click:'+item[0]+':'+variant);
  });
  const next=make('button','og-postgame-spotlight-next','Другой проект ↻');next.type='button';
  next.addEventListener('click',()=>{
   if(activeSelected.length<2){spotlightStatus.textContent='В настройках выбери ещё один проект, чтобы сменить рекомендацию.';return}
   const currentIndex=spotlightOptions.indexOf(spotlightServiceId);
   spotlightServiceId=spotlightOptions[(currentIndex+1+spotlightOptions.length)%spotlightOptions.length];
   renderSpotlight(spotlightServiceId);cards.forEach(card=>card.classList.toggle('is-featured',card.dataset.service===spotlightServiceId));watchSpotlight();
  });
  const save=make('button','og-postgame-spotlight-preferred',preferred===item[0]?'★ Мой выбор сохранён':'☆ Запомнить мой выбор');save.type='button';
  save.addEventListener('click',()=>{
   const ok=savePreferredService(item[0]);
   spotlightStatus.textContent=ok?'Сохранено. Эта рекомендация будет приоритетной в следующих межигровых подборках.':'Браузер не разрешил сохранить выбор. Текущая рекомендация остаётся доступной.';
   save.textContent=ok?'★ Мой выбор сохранён':'☆ Повторить сохранение';
  });
  actions.append(open,next,save);copy.append(actions);
  spotlight.append(copy,spotlightStatus);
 }
 renderSpotlight(spotlightServiceId);
 setTimeout(watchSpotlight,0);
 collapseToggle.hidden=!(showPromos&&activeSelected.length);
 collapseToggle.textContent=showPromos?'Выбрать из '+availableServiceIds.length+' сервисов':'Подборка по расписанию';
 collapseToggle.setAttribute('aria-expanded','false');
 const visible=activeSelected;
 const grid=make('div','og-postgame-service-grid'),cards=[];
 grid.hidden=true;filters.hidden=true;
 const searchLabel=make('label','og-postgame-service-search-wrap');searchLabel.hidden=true;
 const searchCaption=make('span','og-postgame-service-search-caption','ПОИСК ПО СЕРВИСАМ');
 const serviceSearch=make('input','og-postgame-service-search');serviceSearch.type='search';serviceSearch.placeholder='Например, бизнес, видео, карта…';serviceSearch.autocomplete='off';serviceSearch.setAttribute('aria-label','Поиск по выбранным сервисам OSGARD');
 searchLabel.append(searchCaption,serviceSearch);
 const serviceSearchStatus=make('p','og-postgame-service-search-status','');
 serviceSearchStatus.hidden=true;serviceSearchStatus.setAttribute('role','status');serviceSearchStatus.setAttribute('aria-live','polite');
 const clearServiceSearch=make('button','og-postgame-search-clear','Очистить поиск');clearServiceSearch.type='button';clearServiceSearch.hidden=true;
 if(showPromos&&activeSelected.length){
  visible.forEach(([id,num,title,category,description,href,featured=false,active=true])=>{
   const isSpotlight=id===spotlightServiceId;
   const card=make('a','og-postgame-service-card'+(isSpotlight?' is-featured':''));
   card.dataset.service=id;card.dataset.game=gameId;card.dataset.category=categoryByService[id]||'other';cards.push(card);
   const u=new URL(href,location.origin);u.searchParams.set('utm_source','osgard_games');u.searchParams.set('utm_medium','post_game');u.searchParams.set('utm_campaign','after_game');u.searchParams.set('utm_content',id+'_'+gameId);card.href=u.href;card.target='_blank';card.rel='noopener noreferrer';card.setAttribute('aria-label','Открыть '+title+' в новой вкладке');
   card.addEventListener('click',()=>sendSelectEvent('cross_promo_clicked',gameId,'osgard-select:click:'+id));
   if(isSpotlight)card.append(make('span','og-postgame-service-spotlight','В ФОКУСЕ ЭТОГО РАУНДА'));
   card.append(make('span','og-postgame-service-code','OSG / '+num+' · '+category),make('strong','og-postgame-service-name',title),make('span','og-postgame-service-description',description),make('span','og-postgame-service-action','Открыть проект ↗'));grid.append(card);
  });
 }
 function updateFilterCounts(){
  filterButtons.forEach(button=>{
   const id=button.dataset.osgardServiceFilter||'all';
   const count=id==='all'?cards.length:cards.filter(card=>card.dataset.category===id).length;
   const base=(filterDefs.find(item=>item[0]===id)?.[1]||id).replace(/ · \d+$/,'');
   button.textContent=base+' · '+count;
   button.disabled=id!=='all'&&count===0;
   if(id==='all')button.disabled=cards.length===0;
  });
 }
 let activeServiceCategory='all';
 function applyFilter(selected){
  activeServiceCategory=selected==='all'||filterDefs.some(item=>item[0]===selected)?selected:'all';
  filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.osgardServiceFilter===activeServiceCategory)));
  const query=normalizeServiceSearchQuery(serviceSearch.value);
  let visibleCount=0;
  cards.forEach(card=>{
   card.hidden=!matchesServiceFilter(card.dataset.category,activeServiceCategory,card.textContent,query);
   if(!card.hidden)visibleCount++;
  });
  serviceSearchStatus.textContent=query?'Найдено '+visibleCount+' из '+cards.length+' сервисов.':'В этой подборке '+visibleCount+' сервисов.';
 }
 filterButtons.forEach(button=>button.addEventListener('click',()=>applyFilter(button.dataset.osgardServiceFilter||'all')));
 serviceSearch.addEventListener('input',()=>applyFilter(activeServiceCategory));
 clearServiceSearch.addEventListener('click',()=>{serviceSearch.value='';applyFilter(activeServiceCategory);serviceSearch.focus()});
 updateFilterCounts();

 // Keep a small, immediately visible set of choices so users do not have to open the full directory to change the featured service.
 const quickPickHeading=make('p','og-postgame-quick-picks-heading','БЫСТРЫЙ ВЫБОР · СЕРВИСЫ ДЛЯ ТЕБЯ');
 const quickPicks=make('div','og-postgame-quick-picks');
 quickPicks.setAttribute('role','group');
 quickPicks.setAttribute('aria-label','Быстрый выбор сервиса OSGARD');
 const quickPickButtons=[];
 const quickPickIds=[spotlightServiceId,...spotlightOptions.filter(id=>id!==spotlightServiceId)].slice(0,3);
 quickPickIds.forEach(serviceId=>{
  const item=services.find(entry=>entry[0]===serviceId&&entry[7]!==false);
  if(!item)return;
  const button=make('button','og-postgame-quick-pick');
  button.type='button';
  button.dataset.service=serviceId;
  button.setAttribute('aria-pressed',String(serviceId===spotlightServiceId));
  button.append(make('span','og-postgame-quick-pick-category',item[3]),make('strong','',item[2]),make('span','og-postgame-quick-pick-description',item[4]));
  button.addEventListener('click',()=>{
   spotlightServiceId=serviceId;
   renderSpotlight(serviceId);
   cards.forEach(card=>card.classList.toggle('is-featured',card.dataset.service===serviceId));
   quickPickButtons.forEach(choice=>choice.setAttribute('aria-pressed',String(choice.dataset.service===serviceId)));
   watchSpotlight();
  });
  quickPickButtons.push(button);
  quickPicks.append(button);
 });

 const state=make('div','og-postgame-service-empty');
 if(!showPromos)state.textContent=frequencySummary(preferences,completedCount);
 else if(!activeSelected.length)state.textContent='Сейчас ни один сервис не выбран. Открой «Настроить показ» и отметь интересующие проекты.';
 const foot=make('p','og-postgame-service-foot','Переход добровольный и открывается в новой вкладке. Результат сохраняется. Нет сторонней рекламной сети или фиктивных показов.');
 const decision=make('div','og-postgame-service-decision');
 const skipButton=make('button','og-postgame-skip','Пропустить подборку');skipButton.type='button';
 const skipStatus=make('p','og-postgame-skip-status','Подборка скрыта. Игровой каталог и награда за приглашение остаются доступны.');skipStatus.hidden=true;skipStatus.setAttribute('role','status');skipStatus.setAttribute('aria-live','polite');
 skipButton.addEventListener('click',()=>{stopSpotlightWatcher();spotlight.hidden=true;grid.hidden=true;filters.hidden=true;skipButton.hidden=true;skipStatus.hidden=false;void sendSelectEvent('owned_promo_intermission_skipped',gameId,'osgard-select:skip:'+completedCount)});
 decision.append(skipButton,skipStatus);
 settingsToggle.addEventListener('click',()=>{settings.hidden=!settings.hidden;settingsToggle.textContent=settings.hidden?'Настроить показ':'Закрыть настройки';settingsToggle.setAttribute('aria-expanded',String(!settings.hidden));if(!settings.hidden)frequency.focus()});
 collapseToggle.addEventListener('click',()=>{
  const collapsed=!grid.hidden;grid.hidden=collapsed;filters.hidden=collapsed;searchLabel.hidden=collapsed;serviceSearchStatus.hidden=collapsed;clearServiceSearch.hidden=collapsed;
  collapseToggle.textContent=collapsed?'Выбрать из '+availableServiceIds.length+' сервисов':'Свернуть каталог';collapseToggle.setAttribute('aria-expanded',String(!collapsed));
  if(!collapsed){applyFilter(activeServiceCategory);serviceSearch.focus()}
 });
 snoozeButton.addEventListener('click',()=>{
  const wasPaused=readPromoSnoozeUntil()>Date.now();
  if(wasPaused){
   const persisted=clearServicePromoSnooze();
   if(hasConsent())void sendSelectEvent('owned_promo_snooze_cleared',gameId,'osgard-select:snooze-resume:'+completedCount);
   const replacement=servicesShelf(gameId,shouldShowServicePromos(readServicePreferences(),completedCount),completedCount);
   disposePostgameTree(section);section.replaceWith(replacement);
   const stateNode=replacement.querySelector('.og-postgame-service-empty');
   if(stateNode)stateNode.textContent=persisted?'Пауза отменена. Подборка снова следует выбранному расписанию; награды за приглашение остаются доступны.':'Пауза отменена в этой вкладке. Браузер не разрешил сохранить изменение; в других вкладках пауза может действовать до закрытия.';
   return;
  }
  const result=snoozeServicePromosForDay();
  if(hasConsent())void sendSelectEvent('owned_promo_snoozed',gameId,'osgard-select:snooze-24h:'+completedCount);
  const replacement=servicesShelf(gameId,shouldShowServicePromos(readServicePreferences(),completedCount),completedCount);
  disposePostgameTree(section);section.replaceWith(replacement);
  const stateNode=replacement.querySelector('.og-postgame-service-empty');
  if(stateNode)stateNode.textContent=result.persisted?'Подборка скрыта на 24 часа. Награды за приглашение и каталог игр остаются доступны.':'Подборка скрыта до закрытия вкладки: браузер не разрешил сохранить паузу. Награды за приглашение доступны.';
 });
 saveButton.addEventListener('click',()=>{
  const selectedIds=Array.from(choices.querySelectorAll('input[data-service-preference]:checked')).map(input=>input.dataset.servicePreference);
  const ok=writeServicePreferences({frequency:frequency.value,selected:selectedIds});
  if(ok)void sendSelectEvent('owned_promo_preferences_saved',gameId,'osgard-select:preferences:'+frequency.value+':'+selectedIds.length);
  const nextPreferences=readServicePreferences(),nextShow=shouldShowServicePromos(nextPreferences,completedCount);
  stopSpotlightWatcher();
  const replacement=servicesShelf(gameId,nextShow,completedCount);disposePostgameTree(section);section.replaceWith(replacement);
  const nextToggle=replacement.querySelector('.og-postgame-settings-toggle');if(nextToggle)nextToggle.click();
  const nextStatus=replacement.querySelector('.og-postgame-settings-status');
  if(nextStatus)nextStatus.textContent=ok?'Настройки сохранены на этом устройстве.':'Настройки действуют в этой вкладке; браузер не разрешил постоянное сохранение.';
 });
 section.append(head,settings);
 if(showPromos&&activeSelected.length)section.append(spotlight,quickPickHeading,quickPicks);
 if(showPromos&&activeSelected.length)section.append(searchLabel,filters,serviceSearchStatus,clearServiceSearch,grid,foot,decision);
 else section.append(state,foot);
 // Count owned-service exposure only when a clickable card is at least half visible for a full second.
 // This remains consent-gated first-party measurement, not a third-party ad-network impression.
 let cardObserver=null;
 if(typeof IntersectionObserver==='function'){
  const observed=new Set();
 const observer=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{
    const card=entry.target;
    if(entry.isIntersecting&&entry.intersectionRatio>=0.5&&!card.hidden&&!observed.has(card)){
     if(card.__osgardImpressionTimer)return;
     card.__osgardImpressionTimer=setTimeout(()=>{
      delete card.__osgardImpressionTimer;
      if(!hasConsent()||!card.isConnected||card.hidden||!card.getClientRects().length)return;
      const serviceId=String(card.dataset.service||'');
      if(claimPromoImpression('card:'+gameId+':'+serviceId)){
       observed.add(card);
       void sendSelectEvent('owned_promo_impression',gameId,'osgard-select:impression:'+serviceId);
      }
      observer.unobserve(card);
     },1000);
    }else if(card.__osgardImpressionTimer){
     clearTimeout(card.__osgardImpressionTimer);
     delete card.__osgardImpressionTimer;
    }
   });
  },{threshold:[0,0.5,1]});
  cardObserver=observer;
  cards.filter(card=>card.tagName==='A'&&!card.classList.contains('is-unavailable')).forEach(card=>observer.observe(card));
 }
 section.__osgardRefreshImpressions=()=>{
  watchSpotlight();
  if(cardObserver){
   cards.filter(card=>card.tagName==='A'&&!card.classList.contains('is-unavailable')&&!card.hidden).forEach(card=>{
    cardObserver.unobserve(card);
    cardObserver.observe(card);
   });
  }
 };
 section.__osgardDispose=()=>{
  stopSpotlightWatcher();
  if(cardObserver){cardObserver.disconnect();cardObserver=null}
  cards.forEach(card=>{if(card.__osgardImpressionTimer){clearTimeout(card.__osgardImpressionTimer);delete card.__osgardImpressionTimer}});
 };
 return section;
}
function rewardShelf(gameId){
 const section=make('section','og-postgame-reward'),head=make('div','og-postgame-reward-head'),intro=make('div');
 intro.append(make('p','og-postgame-eyebrow','COMMUNITY REWARD / OSGARD PLAY'),make('h3','og-postgame-title','Передай приглашение дальше.'),make('p','og-postgame-copy','Поделись игровым миром с другом. За одно действие в сутки можно получить +50 SHARDS.'));
 const balance=make('strong','og-postgame-wallet','OSGARD SHARDS · '+getWallet().balance);head.append(intro,balance);
 const status=make('p','og-postgame-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const primary=make('button','og-postgame-share-primary','Поделиться приглашением ↗');primary.type='button';const actions=make('div','og-postgame-share-actions');actions.append(primary);
 const signalLink=make('a','og-postgame-signal-cta','Использовать SHARDS в SIGNAL RUN ↗');
 const signalUrl=new URL('/games/signal-run/',location.origin);signalUrl.searchParams.set('utm_source','osgard_games');signalUrl.searchParams.set('utm_medium','post_game_reward');signalUrl.searchParams.set('utm_campaign','shards_cosmetic');signalUrl.searchParams.set('utm_content',gameId);
 signalLink.href=signalUrl.href;signalLink.target='_blank';signalLink.rel='noopener noreferrer';
 signalLink.addEventListener('click',()=>void sendSelectEvent('cross_promo_clicked',gameId,'osgard-select:shards-sink:signal-run'));
 actions.append(signalLink);
 const url=inviteFor(gameId),inviteCode=new URL(url,location.origin).searchParams.get('og_ref')||'',message='Пойдём сыграем в '+titles[gameId]+' в OSGARD PLAY.',eu=encodeURIComponent(url),et=encodeURIComponent(message);
 const networks=[['Telegram','https://t.me/share/url?url='+eu+'&text='+et],['WhatsApp','https://wa.me/?text='+encodeURIComponent(message+' '+url)],['VK','https://vk.com/share.php?url='+eu+'&title='+encodeURIComponent('OSGARD PLAY · '+titles[gameId])+'&comment='+et],['X','https://twitter.com/intent/tweet?url='+eu+'&text='+et],['Facebook','https://www.facebook.com/sharer/sharer.php?u='+eu]];
 const grid=make('div','og-postgame-networks'),claim=make('button','og-postgame-claim','Я опубликовал — получить +50 SHARDS');claim.type='button';claim.hidden=true;let pending='';
 const qualifiedClaim=make('button','og-postgame-qualified-claim','Проверяем сервер наград…');qualifiedClaim.type='button';qualifiedClaim.disabled=true;
 const qualifiedNote=make('p','og-postgame-qualified-note','Дополнительные +50 SHARDS начисляются за каждую зарегистрированную ссылку, по которой друг открыл приглашение и прошёл игровую сессию не короче 30 секунд. Требуется согласие на аналитику и доступность Commerce API.');
 const qualifiedStatus=make('p','og-postgame-qualified-status');qualifiedStatus.setAttribute('role','status');qualifiedStatus.setAttribute('aria-live','polite');
 void refreshQualifiedClaimButton(qualifiedClaim,qualifiedStatus);
 qualifiedClaim.addEventListener('click',async()=>{
  qualifiedClaim.disabled=true;qualifiedStatus.textContent='Проверяем приглашения на сервере…';
  try{
   const result=await claimQualifiedReferralShards();
   if(!result.ok){
    const messages={consent:'Включи согласие на аналитику, чтобы проверить приглашения. Без согласия игровые ссылки всё равно можно отправлять.', 'no-invites':'Сначала отправь другу приглашение с этого устройства.', 'not-configured':'Сервис вознаграждений пока не подключён к Commerce API. Приглашение всё равно работает.', 'invalid-config':'Адрес Commerce API не настроен корректно.', network:'Не удалось связаться с сервером. Попробуй позже.', 'REFERRAL_REWARD_UNAVAILABLE':'Сервис наград временно недоступен.','wallet-storage':'Браузер заблокировал локальное хранилище — награда не запрашивалась.'};
    qualifiedStatus.textContent=messages[result.reason]||'Не удалось проверить приглашения: '+String(result.reason||'ошибка');
    return;
   }
   if(result.count===0){qualifiedStatus.textContent='Пока нет подтверждённых завершений по твоим приглашениям. Награда появится после того, как друг откроет ссылку и завершит сессию не короче 30 секунд.';return}
   const saved=addQualifiedReferralShards(result.claims);
   if(!saved.ok){qualifiedStatus.textContent='Подходящие награды найдены, но браузер не сохранил их receipt-ID. Сервер не пометил их полученными — проверь настройки хранилища и попробуй снова.';return}
   const acknowledgement=await postReferralRequest('/v1/referrals/ack',{consent:true,ownerToken:result.ownerToken,referralCodes:result.claims.map(item=>item.referralCode)});
   balance.textContent='OSGARD SHARDS · '+saved.balance;
   if(!acknowledgement.ok){
    qualifiedStatus.textContent=saved.count>0?'Сохранено на устройстве: +'+saved.amount+' SHARDS. Серверное подтверждение временно недоступно; повторная проверка не начислит эти receipt-ID второй раз.':'Эти награды уже сохранены на устройстве. Серверное подтверждение не прошло — нажми проверку снова позже.';
    if(saved.count>0)void sendSelectEvent('referral_reward_claimed',gameId,'osgard-referral-qualified:'+saved.count+':'+gameId);
    return;
   }
   qualifiedStatus.textContent=saved.count>0?'Сервер подтвердил '+saved.count+' новое(ых) приглашение(я). Начислено +'+saved.amount+' SHARDS. Это косметические очки без денежной стоимости.':'Награды уже были сохранены на этом устройстве; серверное подтверждение синхронизировано без повторного начисления.';
   if(saved.count>0)void sendSelectEvent('referral_reward_claimed',gameId,'osgard-referral-qualified:'+saved.count+':'+gameId);
  }catch{qualifiedStatus.textContent='Не удалось проверить приглашения. Попробуй позже.'}
  finally{void refreshQualifiedClaimButton(qualifiedClaim,qualifiedStatus);balance.textContent='OSGARD SHARDS · '+getWallet().balance}
 });
 const show=result=>{balance.textContent='OSGARD SHARDS · '+getWallet().balance;status.textContent=result.ok?'+50 SHARDS начислено. Баланс: '+result.balance+'.':result.already?'Дневная награда уже получена. Баланс: '+result.balance+'.':'Не удалось сохранить награду в этом браузере.'};
 networks.forEach(([name,href])=>{const link=make('a','og-postgame-network',name+' ↗');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Открыть форму публикации в '+name+' в новой вкладке');link.addEventListener('click',()=>{pending=name;claim.hidden=false;claim.textContent='Я опубликовал в '+name+' — получить +50 SHARDS';status.textContent='Откроется форма публикации. После отправки вернись и подтверди действие. Соцсеть не сообщает сайту подтверждение публикации.';void registerReferralInvite(gameId,inviteCode);void sendSelectEvent('invite_link_prepared',gameId,'game-invite:'+gameId+':'+inviteCode);void sendSelectEvent('social_share_intent',gameId,'osgard-social-share:'+name.toLowerCase()+':'+gameId)});grid.append(link)});
 claim.addEventListener('click',()=>{
  if(!pending)return;
  const network=pending,result=award('social-confirmation:'+network);
  show(result);
  // Manual confirmation is a reward claim, not proof that a post was published.
  // Track it as social_reward_claimed only; do not inflate share_created.
  if(result.ok)void sendSelectEvent('social_reward_claimed',gameId,'osgard-social-reward:'+network.toLowerCase()+':'+gameId);
  pending='';claim.hidden=true;
 });
 primary.addEventListener('click',async()=>{
  primary.disabled=true;
  status.textContent='Готовим приглашение…';
  try{
   if(typeof navigator.share==='function'){
    // Open the native share sheet synchronously in the user gesture. Awaiting a
    // network request first can consume transient user activation on mobile browsers.
    const inviteRegistration=registerReferralInvite(gameId,inviteCode);
    await navigator.share({title:'OSGARD PLAY · '+titles[gameId],text:message,url});
    await inviteRegistration;
    pending='native-share';
    claim.hidden=false;
    claim.textContent='Я действительно опубликовал — получить +50 SHARDS';
    status.textContent='Меню отправки завершено. Если ты действительно опубликовал приглашение, подтверди ниже. OSGARD не может проверить публикацию автоматически.';
    void sendSelectEvent('invite_link_prepared',gameId,'game-invite:'+gameId+':'+inviteCode);
    void sendSelectEvent('social_share_intent',gameId,'osgard-social-share:native-share:'+gameId);
    
   } else if(navigator.clipboard?.writeText){
    await registerReferralInvite(gameId,inviteCode);
    await navigator.clipboard.writeText(message+' '+url);
    pending='';
    claim.hidden=true;
    status.textContent='Ссылка скопирована. Копирование само по себе не считается репостом и не даёт награду. Опубликуй приглашение через одну из соцсетей ниже, затем вернись и подтверди.';
    
   } else {
    pending='';
    claim.hidden=true;
    status.textContent='Быстрая отправка недоступна. Выбери соцсеть ниже.';
   }
  } catch(error){
   pending='';
   claim.hidden=true;
   status.textContent=error instanceof Error&&error.name==='AbortError'?'Отправка отменена — награда не начислена.':'Не удалось отправить приглашение. Выбери соцсеть ниже.';
  } finally {primary.disabled=false}
 });
 const note=make('p','og-postgame-reward-note','Награда за публикацию: +50 локальных SHARDS не чаще раза в UTC-день на этом устройстве — после самостоятельного подтверждения игроком. Копирование само по себе не считается репостом и не даёт награду. OSGARD не получает надёжный сигнал о факте публикации; социальные платформы не подтверждают факт поста. Отдельно доступны серверно-квалифицированные +50 SHARDS за приглашение, по которому друг открыл ссылку и завершил игровую сессию не короче 30 секунд. Эта проверка подтверждает последовательность событий и время, но не уникальную личность. Все SHARDS — только косметические очки, не имеют денежной стоимости и не являются платёжным средством; баланс публикации хранится локально и может быть сброшен очисткой данных браузера. В SIGNAL RUN их можно потратить на косметический профиль GOLD SIGNAL за 100 SHARDS; он меняет только цвета и не влияет на счёт или сложность.');
 section.append(head,actions,grid,claim,qualifiedClaim,qualifiedNote,qualifiedStatus,status,note);return section;
}

function gameCoachShelf(detail,gameId){
 const section=make('section','og-postgame-ai-coach');
 section.setAttribute('aria-labelledby','og-game-coach-title');
 const header=make('div','og-game-coach-header');
 const intro=make('div','og-game-coach-intro');
 const title=make('h3','og-game-coach-title','Один полезный совет к следующему раунду.');
 title.id='og-game-coach-title';
 intro.append(
  make('p','og-postgame-eyebrow','OSGARD AI / GAME COACH'),
  title,
  make('p','og-game-coach-copy','Необязательный совет от ИИ на основе этой игровой сессии. Без имени, email, ID аккаунта, кода приглашения или свободного текста.')
 );
 const badge=make('span','og-game-coach-badge','OPENAI · ПО ЗАПРОСУ');
 header.append(intro,badge);
 const consentLabel=make('label','og-game-coach-consent');
 const checkbox=make('input','');checkbox.type='checkbox';checkbox.checked=false;
 const consentText=make('span','','Я согласен один раз отправить минимальную сводку этой сессии в OpenAI для создания подсказки. Это отдельно от согласия на аналитику.');
 consentLabel.append(checkbox,consentText);
 const actions=make('div','og-game-coach-actions');
 const run=make('button','og-game-coach-button','Получить AI-подсказку ↗');run.type='button';run.disabled=true;
 const status=make('p','og-game-coach-status','Подсказка необязательна. Играть и получать игровые награды можно без неё.');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const result=make('div','og-game-coach-result');result.hidden=true;
 const privacy=make('p','og-game-coach-privacy','При нажатии сначала проверяется доступность сервера. Если AI Coach отключён, сводка игры не отправляется. В запрос входят только ID игры, язык, длительность и факт завершения; ответы не сохраняются в профиле OSGARD. OpenAI API key остаётся только на сервере.');
 const values=detail&&typeof detail==='object'?detail:{};
 const duration=Number.isSafeInteger(values.durationSeconds)&&values.durationSeconds>=0?Math.min(values.durationSeconds,14400):0;
 function setBusy(busy){run.disabled=busy||!checkbox.checked;checkbox.disabled=busy;run.textContent=busy?'Готовим подсказку…':'Получить AI-подсказку ↗'}
 checkbox.addEventListener('change',()=>{
  run.disabled=!checkbox.checked;
  status.textContent=checkbox.checked?'Согласие действует только для одного запроса. Нажми кнопку, чтобы продолжить.':'Сводка не отправлена.';
  if(!checkbox.checked)result.hidden=true;
 });
 run.addEventListener('click',async()=>{
  if(!checkbox.checked){status.textContent='Сначала подтверди разовое согласие. Сводка не отправлена.';return}
  // Consent is consumed for this single button action, even when the server is disabled or unavailable.
  setBusy(true);checkbox.checked=false;status.textContent='Проверяем, включён ли AI Coach…';result.hidden=true;result.replaceChildren();
  try{
   const api=await resolveReferralApiBase();
   if(!api.ok){status.textContent=api.reason==='not-configured'?'AI Coach временно недоступен. Сервер не настроен; данные игры не отправлены.':'Не удалось проверить AI Coach. Данные игры не отправлены; попробуй позже.';return}
   const credentials=api.base.startsWith(location.origin)?'same-origin':'omit';
   const statusResponse=await fetch(api.base+'/v1/game-coach/status',{method:'GET',cache:'no-store',credentials,signal:AbortSignal.timeout(8000)});
   const statusPayload=statusResponse.ok?await statusResponse.json().catch(()=>({})):({});
   if(!statusResponse.ok||statusPayload.enabled!==true){status.textContent='AI Coach пока не активирован владельцем сервера. Данные этой сессии не отправлены. Можно продолжить играть.';return}
   const body={consent:true,gameId,locale:document.documentElement.lang==='en'?'en':'ru',durationSeconds:duration,result:'session_ended'};
   status.textContent='Отправляем краткую сводку и ждём один совет…';
   const response=await fetch(api.base+'/v1/game-coach',{method:'POST',cache:'no-store',credentials,headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok||!payload.advice||typeof payload.advice!=='object'){
    status.textContent=response.status===429?'Лимит запросов достигнут. Попробуй позже.':'AI Coach не смог подготовить ответ. Игровой результат не изменён.';
    return;
   }
   const advice=payload.advice;
   result.append(make('p','og-game-coach-result-label','ПЕРСОНАЛЬНЫЙ СОВЕТ · '+String(titles[gameId]||'OSGARD PLAY').toUpperCase()));
   result.append(make('h4','og-game-coach-result-title',advice.title));
   result.append(make('p','og-game-coach-result-observation',advice.observation));
   const tip=make('div','og-game-coach-tip');tip.append(make('strong','','Попробуй в следующем раунде'),make('p','',advice.tip));
   const challenge=make('div','og-game-coach-challenge');challenge.append(make('strong','','Маленький эксперимент'),make('p','',advice.challenge));
   result.append(tip,challenge);result.hidden=false;
   status.textContent='Готово. Совет сформирован по этой сводке и не изменяет счёт, SHARDS или сложность игры.';
   checkbox.checked=false;
   checkbox.disabled=false;
  }catch(error){
   status.textContent=error&&error.name==='TimeoutError'?'Запрос занял слишком много времени. Ничего в игре не изменилось. Попробуй позже.':'Не удалось связаться с AI Coach. Игровой процесс не затронут.';
  }finally{setBusy(false)}
 });
 section.append(header,consentLabel,actions,privacy,status,result);
 actions.append(run);
 return section;
}

let lastIntermissionGame='',lastIntermissionCount=0;
function refreshCurrentServiceShelf(){
 if(!titles[lastIntermissionGame])return;
 const current=root.querySelector('.og-postgame-services')||(outsideRoot&&outsideRoot.querySelector('.og-postgame-services'));
 if(!current)return;
 if(typeof current.__osgardRefreshImpressions==='function'){
  current.__osgardRefreshImpressions();
  return;
 }
 const next=servicesShelf(lastIntermissionGame,shouldShowServicePromos(readServicePreferences(),lastIntermissionCount),lastIntermissionCount);
 disposePostgameTree(current);current.replaceWith(next);
}
document.addEventListener('osgard:service-preferences-updated',refreshCurrentServiceShelf);
window.addEventListener('osgard:service-preferences-updated',refreshCurrentServiceShelf);
window.addEventListener('storage',event=>{
 if(!event.key||[servicePreferencesKey,promoSnoozeKey,preferredServiceKey].includes(event.key))refreshCurrentServiceShelf();
});
document.addEventListener('osgard:game-launching',()=>{lastIntermissionGame='';lastIntermissionCount=0});
function renderOutsideIntermission(detail){
 const id=detail&&detail.game;
 if(!outsideRoot||!titles[id]||!detail||detail.sessionStarted!==true||detail.reason!=='closed_by_user')return;
 const completedCount=recordCompletedRound(id,detail.sessionId),preferences=readServicePreferences();
 lastIntermissionGame=id;lastIntermissionCount=completedCount;
 disposePostgameTree(outsideRoot);
 outsideRoot.replaceChildren();
 const suite=make('section','og-postgame-suite og-postgame-outside-suite');
 const intro=make('div','og-postgame-outside-intro');
 intro.append(make('p','og-postgame-eyebrow','OSGARD SELECT / BETWEEN WORLDS'));
 intro.append(make('h2','og-postgame-title','Раунд окончен. Выбери следующий шаг.'));
 intro.append(make('p','og-postgame-copy','Ты завершил сессию '+titles[id]+'. Выбери один из собственных проектов OSGARD, поделись приглашением или сразу вернись к каталогу.'));
 const back=make('a','og-postgame-back','Выбрать следующую игру ↗');back.href='#catalog';
 suite.append(intro,back,servicesShelf(id,shouldShowServicePromos(preferences,completedCount),completedCount),gameCoachShelf(detail,id),rewardShelf(id));
 outsideRoot.append(suite);outsideRoot.hidden=false;
 if(typeof outsideRoot.scrollIntoView==='function'){
  const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  outsideRoot.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
 }
}
document.addEventListener('osgard:game-session-ended',event=>renderOutsideIntermission(event.detail));
document.addEventListener('osgard:game-launching',()=>{
 disposeCurrentPostgame();
 if(!outsideRoot)return;
 outsideRoot.replaceChildren();
 outsideRoot.hidden=true;
});
function renderOsgardSelect(gameId,sessionId){
 const id=gameId;if(!titles[id])return;
 const completedCount=recordCompletedRound(id,sessionId),preferences=readServicePreferences();
 lastIntermissionGame=id;lastIntermissionCount=completedCount;
 const previousSuite=root.querySelector('.og-postgame-suite');if(previousSuite){disposePostgameTree(previousSuite);previousSuite.remove()}
 const suite=make('section','og-postgame-suite');suite.append(servicesShelf(id,shouldShowServicePromos(preferences,completedCount),completedCount),rewardShelf(id));root.append(suite);
}
document.addEventListener('osgard:game-completed',event=>renderOsgardSelect(event.detail&&event.detail.game,event.detail&&event.detail.sessionId));
document.addEventListener('osgard:game-session-ended',event=>{if(event.detail&&event.detail.sessionStarted===true)renderOsgardSelect(event.detail.game,event.detail.sessionId)});
})();
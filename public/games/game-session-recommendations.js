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
function clear(){host.replaceChildren();host.hidden=true;dialog.classList.remove('has-recommendations')}
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
function buildShareUrl(gameId){
 try{
  if(typeof window.OSGARDInvite?.createLink==='function'){
   const shared=new URL(window.OSGARDInvite.createLink(gameId),location.origin);
   if(shared.origin===location.origin&&shared.pathname==='/games/invite/'+gameId+'/'&&shared.searchParams.get('og_game')===gameId&&/^og_[a-f0-9]{8}$/.test(shared.searchParams.get('og_ref')||''))return shared.href;
  }
 }catch{}
 // Fail-soft fallback follows the same public URL contract as the catalogue toolbar.
 const url=new URL('/games/invite/'+encodeURIComponent(gameId)+'/',location.origin);
 url.searchParams.set('og_ref','og_'+token().slice(0,8));
 url.searchParams.set('og_game',gameId);
 url.searchParams.set('utm_source','osgard_play');
 url.searchParams.set('utm_medium','referral');
 url.searchParams.set('utm_campaign','play_with_friends');
 url.searchParams.set('utm_content',gameId);
 return url.href;
}
function addPostSessionActions(gameId){
 const game=games[gameId];if(!game)return;
 root.querySelector('.og-growth')?.remove();ensureStyles();
 const section=make('section','og-growth');section.setAttribute('aria-label','Приглашение друга и создание собственной игры');
 const top=make('div','og-growth-top');top.append(make('span','og-growth-label','PLAY TOGETHER / PASS IT ON'));
 top.append(make('p','og-growth-copy','Понравилась игра? Передай другу ссылку на тот же игровой мир.'));
 const actions=make('div','og-growth-actions');
 const inviteButton=make('button','og-share-friend','Пригласить друга ↗');inviteButton.type='button';
 const createLink=make('a','og-create-game','Создать свою игру с OSGARD ↗');
 createLink.href='https://osgardbewworld.com/?utm_source=osgard_games&utm_medium=cross_promo&utm_campaign=after_game&utm_content='+encodeURIComponent(gameId);
 createLink.target='_blank';createLink.rel='noopener noreferrer';
 const status=make('p','og-growth-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const fallback=make('a','og-create-game','Отправить в WhatsApp ↗');fallback.hidden=true;fallback.target='_blank';fallback.rel='noopener noreferrer';
 const partnerCta=make('a','og-partner-cta');
 partnerCta.href='/games/partners/?utm_source=osgard_play&utm_medium=post_game&utm_campaign=partner_studio&utm_content='+encodeURIComponent(gameId);
 partnerCta.target='_blank';partnerCta.rel='noopener noreferrer';
 partnerCta.setAttribute('aria-label','OSGARD Partner Studio: обсудить брендированный игровой челлендж после игры '+game.title);
 const partnerCopy=make('span','og-partner-copy');
 partnerCopy.append(make('span','og-partner-eyebrow','PARTNER STUDIO / ДЛЯ БРЕНДОВ'));
 partnerCopy.append(make('strong','og-partner-title','Преврати идею бренда в игру'));
 partnerCopy.append(make('span','og-partner-description','Спонсорское событие или заказная мини-игра. Только по согласованию — без рекламы поверх активного раунда.'));
 partnerCta.append(partnerCopy,make('span','og-partner-action','Обсудить проект ↗'));
 partnerCta.addEventListener('click',()=>{void sendEvent('cross_promo_clicked',gameId,'post-game-partner-studio')});
 actions.append(inviteButton,createLink,fallback);section.append(top,actions,status,partnerCta);root.append(section);
 inviteButton.addEventListener('click',async()=>{
  inviteButton.disabled=true;status.textContent='Готовим персональную ссылку…';
  const url=buildShareUrl(gameId),inviteCode=new URL(url,location.origin).searchParams.get('og_ref')||'',message='Пойдём сыграем в '+game.title+' в OSGARD PLAY: '+url;
  let shareCompleted=false;
  try{
   if(typeof navigator.share==='function'){
    await navigator.share({title:'OSGARD PLAY · '+game.title,text:'Пойдём сыграем вместе.',url});
    shareCompleted=true;
    status.textContent='Ссылка передана в системное меню отправки.';
   } else if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(message);
    shareCompleted=true;
    status.textContent='Текст приглашения скопирован.';
   } else {
    fallback.href='https://wa.me/?text='+encodeURIComponent(message);
    fallback.hidden=false;
    status.textContent='Открой WhatsApp, проверь приглашение и отправь его другу.';
   }
  } catch(error){
   if(error instanceof Error&&error.name==='AbortError'){
    status.textContent='Отправка отменена. Действие не засчитано как успешное приглашение.';
    return;
   }
   status.textContent='Не удалось открыть отправку. Можно попробовать WhatsApp или скопировать ссылку из адресной строки: '+url;
   fallback.href='https://wa.me/?text='+encodeURIComponent(message);
   fallback.hidden=false;
   return;
  } finally {
   inviteButton.disabled=false;
  }
  // Count only an action the browser confirmed: the native share promise resolved
  // or the invite text was successfully copied. A visible fallback link or a
  // dismissed share sheet is not counted as a successful share.
  if(shareCompleted)void sendEvent('share_created',gameId,'game-invite:'+gameId+':'+inviteCode);
 });
}
document.addEventListener('osgard:game-completed',event=>{const id=event.detail&&event.detail.game;addPostSessionActions(id)});
document.addEventListener('osgard:game-session-ended',event=>{if(event.detail&&event.detail.sessionStarted===true)addPostSessionActions(event.detail.game)});
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
 ['gardvpn','08','GARD VPN','PRIVACY / VPN','Главная страница ответила HTTP 200 при проверке 13 октября 2026 года; работоспособность VPN-подключения не проверялась.','https://gardvpn.is/',false,true],
 ['osgard-business','09','OSGARD OS','BUSINESS INTELLIGENCE','Диагностика бизнеса, развитие и рекомендации по росту','https://osgardos.com/'],
 ['vanguard','10','OSGARD VANGUARD STUDIO','VIDEO STUDIO','Создание видео и визуальных проектов','https://osgardvanguard.studio/']
];
const walletKey='osgard.games.shards-wallet.v1',dailyReward=50;
const servicePreferencesKey='osgard.games.postgame-service-preferences.v1';
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
 'afterimage-run':['superday','projects','vanguard'],'aether-grid':['projects','myosa','vanguard']
};
function readPreferredService(){try{const id=localStorage.getItem(preferredServiceKey)||'';return availableServiceIds.includes(id)?id:''}catch{return''}}
function savePreferredService(id){if(!availableServiceIds.includes(id))return false;try{localStorage.setItem(preferredServiceKey,id);return true}catch{return false}}
let memoryServicePreferences=null;
let memoryServiceProgress={count:0,lastAt:0,lastGame:'',sessions:[],byGame:{}};
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const selectConsentKey='osgard.games.analytics-consent.v1';
const selectSessionKey='osgard.games.growth-session.v1';
const selectAllowedEvents=new Set(['cross_promo_clicked','owned_promo_impression','owned_promo_intermission_skipped','owned_promo_preferences_saved','social_share_intent','social_reward_claimed','share_created','invite_link_prepared']);
function hasConsent(){try{return localStorage.getItem(selectConsentKey)==='yes'}catch{return false}}
const pendingSelectTelemetry=new Set();
function cancelPendingSelectTelemetry(){for(const controller of pendingSelectTelemetry){try{controller.abort()}catch{}}pendingSelectTelemetry.clear()}
function checkSelectConsentAfterToggle(){setTimeout(()=>{if(!hasConsent())cancelPendingSelectTelemetry()},0)}
document.addEventListener('change',event=>{if(event.target&&event.target.id==='analytics-toggle')checkSelectConsentAfterToggle()});
document.addEventListener('click',event=>{const target=event.target;if(target&&typeof target.closest==='function'&&target.closest('#analytics-toggle'))checkSelectConsentAfterToggle()});
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
function shouldShowServicePromos(preferences,completedCount){
 if(preferences.frequency==='off')return false;
 if(preferences.frequency==='every3')return completedCount>0&&completedCount%3===0;
 return true;
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
function getWallet(){try{const w=JSON.parse(localStorage.getItem(walletKey)||'{}');return{balance:Number.isSafeInteger(w.balance)&&w.balance>=0?Math.min(w.balance,1e9):0,day:typeof w.lastRewardDay==='string'?w.lastRewardDay:''}}catch{return{balance:0,day:''}}}
function award(source){const current=getWallet(),day=new Date().toISOString().slice(0,10);if(current.day===day)return{ok:false,already:true,balance:current.balance};const next={balance:Math.min(1e9,current.balance+dailyReward),lastRewardDay:day,lastSource:String(source||'share').slice(0,60),updatedAt:new Date().toISOString()};try{localStorage.setItem(walletKey,JSON.stringify(next));return{ok:true,balance:next.balance}}catch{return{ok:false,balance:current.balance}}}
function servicesShelf(gameId,showPromos,completedCount){
 const preferences=readServicePreferences();
 const section=make('section','og-postgame-services'),head=make('div','og-postgame-service-head'),intro=make('div');
 intro.append(make('p','og-postgame-eyebrow','OSGARD SELECT / BETWEEN WORLDS'),make('p','og-postgame-disclosure','РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD'),make('h3','og-postgame-title','Мир не заканчивается после раунда.'),make('p','og-postgame-copy','Выбери категорию и сервис, который хочешь посмотреть. Автозапуска нет. Это самореклама экосистемы OSGARD; переход добровольный и откроется в новой вкладке.'));
 const settingsToggle=make('button','og-postgame-toggle og-postgame-settings-toggle','Настроить показ');settingsToggle.type='button';settingsToggle.setAttribute('aria-expanded','false');settingsToggle.setAttribute('aria-controls','og-postgame-preferences');
 const collapseToggle=make('button','og-postgame-toggle og-postgame-collapse-toggle',showPromos?'Свернуть подборку':'Подборка по расписанию');collapseToggle.type='button';collapseToggle.setAttribute('aria-expanded',String(Boolean(showPromos)));
 const headActions=make('div','og-postgame-service-head-actions');headActions.append(settingsToggle,collapseToggle);head.append(intro,headActions);

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

 const categoryByService={projects:'studio',vanguard:'studio','o2-system':'business','osgard-business':'business',senjorio:'life',superday:'life',myosa:'tech',gardvpn:'tech',marcosa:'social','gold-glamour':'luxury'};
 const filterDefs=[['all','Все доступные · '+availableServiceIds.length],['studio','Разработка · 2'],['business','Бизнес · 2'],['life','Город и жизнь · 2'],['tech','Технологии · 2'],['social','Социальные · 1'],['luxury','Luxury · 1']];
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
 let spotlightVariant='a';
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
  spotlightVariant=Math.random()<0.5?'a':'b';
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
  const open=make('a','og-postgame-spotlight-open',variant==='a'?'Открыть официальный сайт ↗':'Изучить сервис ↗');
  const url=new URL(item[5]);url.searchParams.set('utm_source','osgard_games');url.searchParams.set('utm_medium','post_game');url.searchParams.set('utm_campaign','after_game');url.searchParams.set('utm_content',item[0]+'_'+gameId);
  open.href=url.href;open.target='_blank';open.rel='noopener noreferrer';open.dataset.service=item[0];open.dataset.game=gameId;
  open.dataset.promoVariant=variant;
  open.addEventListener('click',()=>void sendSelectEvent('cross_promo_clicked',gameId,'osgard-select:click:'+item[0]+':'+variant));
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
 if(showPromos&&activeSelected.length){
  visible.forEach(([id,num,title,category,description,href,featured=false,active=true])=>{
   const isSpotlight=id===spotlightServiceId;
   const card=make('a','og-postgame-service-card'+(isSpotlight?' is-featured':''));
   card.dataset.service=id;card.dataset.game=gameId;card.dataset.category=categoryByService[id]||'other';cards.push(card);
   const u=new URL(href);u.searchParams.set('utm_source','osgard_games');u.searchParams.set('utm_medium','post_game');u.searchParams.set('utm_campaign','after_game');u.searchParams.set('utm_content',id+'_'+gameId);card.href=u.href;card.target='_blank';card.rel='noopener noreferrer';card.setAttribute('aria-label','Открыть '+title+' в новой вкладке');
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
 function applyFilter(selected){
  filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.osgardServiceFilter===selected)));
  cards.forEach(card=>{card.hidden=selected!=='all'&&card.dataset.category!==selected});
 }
 filterButtons.forEach(button=>button.addEventListener('click',()=>applyFilter(button.dataset.osgardServiceFilter||'all')));
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
 collapseToggle.addEventListener('click',()=>{const collapsed=!grid.hidden;grid.hidden=collapsed;filters.hidden=collapsed;collapseToggle.textContent=collapsed?'Выбрать из '+availableServiceIds.length+' сервисов':'Свернуть каталог';collapseToggle.setAttribute('aria-expanded',String(!collapsed))});
 saveButton.addEventListener('click',()=>{
  const selectedIds=Array.from(choices.querySelectorAll('input[data-service-preference]:checked')).map(input=>input.dataset.servicePreference);
  const ok=writeServicePreferences({frequency:frequency.value,selected:selectedIds});
  if(ok)void sendSelectEvent('owned_promo_preferences_saved',gameId,'osgard-select:preferences:'+frequency.value+':'+selectedIds.length);
  const nextPreferences=readServicePreferences(),nextShow=shouldShowServicePromos(nextPreferences,completedCount);
  stopSpotlightWatcher();
  const replacement=servicesShelf(gameId,nextShow,completedCount);section.replaceWith(replacement);
  const nextToggle=replacement.querySelector('.og-postgame-settings-toggle');if(nextToggle)nextToggle.click();
  const nextStatus=replacement.querySelector('.og-postgame-settings-status');
  if(nextStatus)nextStatus.textContent=ok?'Настройки сохранены на этом устройстве.':'Настройки действуют в этой вкладке; браузер не разрешил постоянное сохранение.';
 });
 section.append(head,settings);
 if(showPromos&&activeSelected.length)section.append(spotlight,quickPickHeading,quickPicks);
 if(showPromos&&activeSelected.length)section.append(filters,grid,foot,decision);
 else section.append(state,foot);
 // Count owned-service exposure only when a clickable card is at least half visible for a full second.
 // This remains consent-gated first-party measurement, not a third-party ad-network impression.
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
      observed.add(card);
      sendSelectEvent('owned_promo_impression',gameId,'osgard-select:impression:'+card.dataset.service);
      observer.unobserve(card);
     },1000);
    }else if(card.__osgardImpressionTimer){
     clearTimeout(card.__osgardImpressionTimer);
     delete card.__osgardImpressionTimer;
    }
   });
  },{threshold:[0,0.5,1]});
  cards.filter(card=>card.tagName==='A'&&!card.classList.contains('is-unavailable')).forEach(card=>observer.observe(card));
 }
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
 const show=result=>{balance.textContent='OSGARD SHARDS · '+getWallet().balance;status.textContent=result.ok?'+50 SHARDS начислено. Баланс: '+result.balance+'.':result.already?'Дневная награда уже получена. Баланс: '+result.balance+'.':'Не удалось сохранить награду в этом браузере.'};
 networks.forEach(([name,href])=>{const link=make('a','og-postgame-network',name+' ↗');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Открыть форму публикации в '+name+' в новой вкладке');link.addEventListener('click',()=>{pending=name;claim.hidden=false;claim.textContent='Я опубликовал в '+name+' — получить +50 SHARDS';status.textContent='Откроется форма публикации. После отправки вернись и подтверди действие. Соцсеть не сообщает сайту подтверждение публикации.';void sendSelectEvent('invite_link_prepared',gameId,'game-invite:'+gameId+':'+inviteCode);void sendSelectEvent('social_share_intent',gameId,'osgard-social-share:'+name.toLowerCase()+':'+gameId)});grid.append(link)});
 claim.addEventListener('click',()=>{
  if(!pending)return;
  const network=pending,result=award('social-confirmation:'+network);
  show(result);
  void sendSelectEvent('share_created',gameId,'game-invite:'+gameId+':'+inviteCode);
  if(result.ok)void sendSelectEvent('social_reward_claimed',gameId,'osgard-social-reward:'+network.toLowerCase()+':'+gameId);
  pending='';claim.hidden=true;
 });
 primary.addEventListener('click',async()=>{
  primary.disabled=true;
  status.textContent='Готовим приглашение…';
  try{
   if(typeof navigator.share==='function'){
    await navigator.share({title:'OSGARD PLAY · '+titles[gameId],text:message,url});
    pending='native-share';
    claim.hidden=false;
    claim.textContent='Я действительно опубликовал — получить +50 SHARDS';
    status.textContent='Меню отправки завершено. Если ты действительно опубликовал приглашение, подтверди ниже. OSGARD не может проверить публикацию автоматически.';
    void sendSelectEvent('invite_link_prepared',gameId,'game-invite:'+gameId+':'+inviteCode);
    void sendSelectEvent('social_share_intent',gameId,'osgard-social-share:native-share:'+gameId);
    
   } else if(navigator.clipboard?.writeText){
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
 const note=make('p','og-postgame-reward-note','Награда: +50 локальных SHARDS не чаще раза в UTC-день на этом устройстве. Копирование ссылки само по себе не даёт награду. После публикации из социальной сети или системного меню игрок подтверждает действие самостоятельно: OSGARD не получает надёжный сигнал о факте публикации. SHARDS хранятся в этом браузере, не имеют денежной стоимости, не являются платёжным средством и могут быть сброшены очисткой данных браузера. В SIGNAL RUN их можно потратить на косметический профиль GOLD SIGNAL за 100 SHARDS; он меняет только цвета и не влияет на счёт или сложность.');
 section.append(head,actions,grid,claim,status,note);return section;
}
function renderOutsideIntermission(detail){
 const id=detail&&detail.game;
 if(!outsideRoot||!titles[id]||!detail||detail.sessionStarted!==true||detail.reason!=='closed_by_user')return;
 const completedCount=recordCompletedRound(id,detail.sessionId),preferences=readServicePreferences();
 outsideRoot.replaceChildren();
 const suite=make('section','og-postgame-suite og-postgame-outside-suite');
 const intro=make('div','og-postgame-outside-intro');
 intro.append(make('p','og-postgame-eyebrow','OSGARD SELECT / BETWEEN WORLDS'));
 intro.append(make('h2','og-postgame-title','Раунд окончен. Выбери следующий шаг.'));
 intro.append(make('p','og-postgame-copy','Ты завершил сессию '+titles[id]+'. Выбери один из собственных проектов OSGARD, поделись приглашением или сразу вернись к каталогу.'));
 const back=make('a','og-postgame-back','Выбрать следующую игру ↗');back.href='#catalog';
 suite.append(intro,back,servicesShelf(id,shouldShowServicePromos(preferences,completedCount),completedCount),rewardShelf(id));
 outsideRoot.append(suite);outsideRoot.hidden=false;
 if(typeof outsideRoot.scrollIntoView==='function'){
  const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  outsideRoot.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
 }
}
document.addEventListener('osgard:game-session-ended',event=>renderOutsideIntermission(event.detail));
document.addEventListener('osgard:game-launching',()=>{
 if(!outsideRoot)return;
 outsideRoot.replaceChildren();
 outsideRoot.hidden=true;
});
function renderOsgardSelect(gameId,sessionId){
 const id=gameId;if(!titles[id])return;
 const completedCount=recordCompletedRound(id,sessionId),preferences=readServicePreferences();
 root.querySelector('.og-postgame-suite')?.remove();
 const suite=make('section','og-postgame-suite');suite.append(servicesShelf(id,shouldShowServicePromos(preferences,completedCount),completedCount),rewardShelf(id));root.append(suite);
}
document.addEventListener('osgard:game-completed',event=>renderOsgardSelect(event.detail&&event.detail.game,event.detail&&event.detail.sessionId));
document.addEventListener('osgard:game-session-ended',event=>{if(event.detail&&event.detail.sessionStarted===true)renderOsgardSelect(event.detail.game,event.detail.sessionId)});
})();
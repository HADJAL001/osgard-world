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
 'cascade-lab':{title:'CASCADE LAB',subtitle:'Физические головоломки',href:'/games/cascade-lab/'}
};
const next={
 'null-shift':['civic-cascade','cascade-lab'],time:['civic-cascade','inherit'],
 swarm:['null-shift','signal-run'],inherit:['patina','time'],remix:['swarm','cascade-lab'],
 'signal-run':['swarm','null-shift'],'civic-cascade':['time','inherit'],patina:['inherit','civic-cascade'],
 'cascade-lab':['signal-run','null-shift']
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
 'cascade-lab':{title:'CASCADE LAB'}
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
 const controller=typeof AbortController==='function'?new AbortController():null;
 if(controller)pendingTelemetry.add(controller);
 try{
  const configOptions={cache:'no-store'};
  if(controller)configOptions.signal=controller.signal;
  const configResponse=await fetch('/games/commerce-config.json',configOptions);
  if(!consented()||(controller&&controller.signal.aborted))return false;
  const config=configResponse.ok?await configResponse.json().catch(()=>({})):{};
  if(!consented()||(controller&&controller.signal.aborted))return false;
  const base=String(config.apiBaseUrl||'/commerce-api').replace(/\/+$/,'');
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
const titles={'null-shift':'NULL//SHIFT',time:'Империя времени',swarm:'SWARM',inherit:'INHERIT',remix:'REMIX','civic-cascade':'CIVIC CASCADE',patina:'PATINA Atelier','signal-run':'SIGNAL RUN','cascade-lab':'CASCADE LAB'};
const services=[
 ['marcosa','05','MARCOSA','SOCIAL / COMMUNITY','Социальная сеть нового поколения — общение, сообщества и цифровые миры','https://marcosa.club/',true],
 ['projects','01','OSGARD PROJECTS','DIGITAL STUDIO','Создание сайтов, приложений и цифровых продуктов','https://osgardbewworld.com/'],
 ['o2-system','02','O2 SYSTEM','BUSINESS OPERATIONS','Инструменты учёта кассы обменников','https://o2system.art/'],
 ['senjorio','03','SENJORIO','PREMIUM MOBILITY','Премиальный сервис такси','https://senjorio.com/'],
 ['superday','04','SUPERDAY','MAP / DAILY PLANNING','Умная карта и планировщик дня','https://superday.run/'],
 ['myosa','06','MYOSA','AI PLATFORM','Платформа искусственного интеллекта','https://myosa.world/'],
 ['gold-glamour','07','GOLD GLAMOUR','LUXURY SERVICES','Премиальные услуги с золотом и выездным обслуживанием','https://gold-glamour.online/'],
 ['gardvpn','08','GARD VPN','PRIVACY / VPN','Временно не включён в промо-переходы, пока доступность не подтверждена','https://gardvpn.is/',false,false],
 ['osgard-business','09','OSGARD BUSINESS','BUSINESS INTELLIGENCE','Диагностика бизнеса, развитие и рекомендации по росту','https://osgardos.com/'],
 ['vanguard','10','OSGARD VANGUARD','VIDEO STUDIO','Создание видео и визуальных проектов','https://osgardvanguard.studio/']
];
const walletKey='osgard.games.shards-wallet.v1',dailyReward=50;
const servicePreferencesKey='osgard.games.postgame-service-preferences.v1';
const serviceProgressKey='osgard.games.postgame-service-progress.v1';
const availableServiceIds=services.filter(item=>item[7]!==false).map(item=>item[0]);
const preferredServiceKey='osgard.games.preferred-service.v1';
const recommendationByGame={'null-shift':'projects',time:'superday',swarm:'marcosa',inherit:'myosa',remix:'projects','civic-cascade':'osgard-business',patina:'gold-glamour','signal-run':'vanguard','cascade-lab':'projects'};
let completedInPlayer='';
function readPreferredService(){try{const id=localStorage.getItem(preferredServiceKey)||'';return availableServiceIds.includes(id)?id:''}catch{return''}}
function writePreferredService(id){if(!availableServiceIds.includes(id))return false;try{localStorage.setItem(preferredServiceKey,id);return true}catch{return false}}
const frequencyValues=['each','every3','off'];
let memoryServicePreferences=null;
let memoryServiceProgress={count:0,lastAt:0,lastGame:''};
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
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
 try{const raw=localStorage.getItem(serviceProgressKey);if(raw){const value=JSON.parse(raw);return{count:Number.isSafeInteger(value.count)&&value.count>=0?Math.min(value.count,1000000000):0,lastAt:Number.isFinite(value.lastAt)?value.lastAt:0,lastGame:typeof value.lastGame==='string'?value.lastGame:''}}}catch{}
 return {...memoryServiceProgress};
}
function recordCompletedRound(gameId){
 const current=readServiceProgress(),now=Date.now();
 if(current.lastGame===gameId&&now>=current.lastAt&&now-current.lastAt<2500)return current.count;
 const next={count:Math.min(current.count+1,1000000000),lastAt:now,lastGame:gameId};memoryServiceProgress=next;
 try{localStorage.setItem(serviceProgressKey,JSON.stringify(next))}catch{}
 return next.count;
}
function shouldShowServicePromos(preferences,completedCount){
 if(preferences.frequency==='off')return false;
 if(preferences.frequency==='every3')return completedCount>0&&completedCount%3===0;
 return true;
}
function frequencySummary(preferences,completedCount){
 if(preferences.frequency==='off')return 'Подборка отключена. Награды за приглашение остаются доступны.';
 if(preferences.frequency==='every3')return 'Подборка появляется раз в три завершённых раунда. Следующий показ: через '+(3-(completedCount%3))+' раунд(а).';
 return 'Подборка появится после завершённой игры. Можно изменить частоту в настройках.';
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
 intro.append(make('p','og-postgame-eyebrow','OSGARD SELECT / BETWEEN WORLDS'),make('p','og-postgame-disclosure','РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD'),make('h3','og-postgame-title','Твой следующий мир.'),make('p','og-postgame-copy','Сначала — одна рекомендация под игру, в которой ты только что был. Хочешь больше — открой каталог, выбери проект или настрой частоту. Никакого автоперехода.'));
 const settingsToggle=make('button','og-postgame-toggle og-postgame-settings-toggle','Настроить показ');settingsToggle.type='button';settingsToggle.setAttribute('aria-expanded','false');settingsToggle.setAttribute('aria-controls','og-postgame-preferences');
 const collapseToggle=make('button','og-postgame-toggle og-postgame-collapse-toggle','Выбрать из 10 сервисов');collapseToggle.type='button';collapseToggle.setAttribute('aria-expanded','false');
 const headActions=make('div','og-postgame-service-head-actions');headActions.append(settingsToggle,collapseToggle);head.append(intro,headActions);

 const settings=make('div','og-postgame-preferences');settings.id='og-postgame-preferences';settings.hidden=true;
 const settingsHeading=make('p','og-postgame-settings-heading','ЧАСТОТА И ИНТЕРЕСЫ');
 const settingsDescription=make('p','og-postgame-settings-copy','По умолчанию подборка показывается после каждой завершённой игры. Выбери только нужные проекты или отключи промо-показы.');
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
 const filterDefs=[['all','Все сервисы · 10'],['studio','Разработка · 2'],['business','Бизнес · 2'],['life','Город и жизнь · 2'],['tech','Технологии · 2'],['social','Социальные · 1'],['luxury','Luxury · 1']];
 const filters=make('div','og-postgame-service-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Выбрать категорию сервиса OSGARD');
 const filterButtons=[];
 filterDefs.forEach(([id,labelText])=>{const button=make('button','og-postgame-service-filter',labelText);button.type='button';button.dataset.osgardServiceFilter=id;button.setAttribute('aria-pressed',String(id==='all'));filters.append(button);filterButtons.push(button)});
 const activeSelected=services.filter(([id,,,,,,featured=false,active=true])=>active!==false&&preferences.selected.includes(id));
 const spotlight=make('section','og-postgame-spotlight');spotlight.setAttribute('aria-label','Персональная рекомендация OSGARD');
 spotlight.hidden=!(showPromos&&activeSelected.length);
 let spotlightServiceId='';
 function serviceDestination(service){const u=new URL(service[5]);u.searchParams.set('utm_source','osgard_games');u.searchParams.set('utm_medium','post_game');u.searchParams.set('utm_campaign','after_game');u.searchParams.set('utm_content',service[0]+'_'+gameId);return u.href}
 function renderSpotlight(requestedId){
  const service=activeSelected.find(item=>item[0]===requestedId)||activeSelected.find(item=>item[0]===recommendationByGame[gameId])||activeSelected[0];
  spotlight.replaceChildren();
  if(!service){spotlight.hidden=true;return}
  spotlightServiceId=service[0];
  const copy=make('div','og-postgame-spotlight-copy');
  copy.append(make('span','og-postgame-spotlight-label','РЕКОМЕНДАЦИЯ ДЛЯ '+(titles[gameId]||'ТВОЕЙ ИГРЫ')),make('span','og-postgame-service-code','OSG / '+service[1]+' · '+service[3]),make('strong','og-postgame-spotlight-name',service[2]),make('span','og-postgame-spotlight-description',service[4]));
  const actions=make('div','og-postgame-spotlight-actions');
  const open=make('a','og-postgame-spotlight-open','Изучить проект ↗');open.href=serviceDestination(service);open.target='_blank';open.rel='noopener noreferrer';open.setAttribute('aria-label','Открыть '+service[2]+' в новой вкладке');open.addEventListener('click',()=>sendSelectEvent('cross_promo_clicked',gameId,'osgard-select:spotlight:'+service[0]));
  const next=make('button','og-postgame-spotlight-next','Другой проект');next.type='button';next.addEventListener('click',()=>{const index=activeSelected.findIndex(item=>item[0]===spotlightServiceId);const chosen=activeSelected[(index+1)%activeSelected.length];renderSpotlight(chosen[0]);status.textContent='Рекомендация изменена. Выбери «Запомнить выбор», если хочешь видеть этот проект первым.'});
  const preferred=make('button','og-postgame-spotlight-preferred',readPreferredService()===service[0]?'✓ Мой выбор':'Запомнить выбор');preferred.type='button';preferred.addEventListener('click',()=>{const saved=writePreferredService(service[0]);preferred.textContent=saved?'✓ Мой выбор':'Не удалось сохранить';status.textContent=saved?'Выбор сохранён на этом устройстве.':'Браузер не разрешил сохранить предпочтение.'});
  actions.append(open,next,preferred);copy.append(actions);spotlight.append(copy);
 }
 const preferredId=readPreferredService();
 renderSpotlight(activeSelected.some(item=>item[0]===preferredId)?preferredId:recommendationByGame[gameId]);
 if(showPromos&&activeSelected.length&&typeof IntersectionObserver==='function'){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>=0.5){clearTimeout(spotlight.__osgardExposureTimer);spotlight.__osgardExposureTimer=setTimeout(()=>{if(spotlight.isConnected&&!spotlight.hidden&&spotlight.getClientRects().length){sendSelectEvent('owned_promo_impression',gameId,'osgard-select:spotlight:'+spotlightServiceId);observer.disconnect()}},1000)}else{clearTimeout(spotlight.__osgardExposureTimer);delete spotlight.__osgardExposureTimer}}},{threshold:[0,0.5,1]});
  observer.observe(spotlight);
 }
 collapseToggle.hidden=!(showPromos&&activeSelected.length);
 const visible=activeSelected.length?services.filter(([id,,,,,,featured=false,active=true])=>active===false||preferences.selected.includes(id)):[];
 const grid=make('div','og-postgame-service-grid'),cards=[];grid.hidden=true;filters.hidden=true;
 if(showPromos&&activeSelected.length){
  visible.forEach(([id,num,title,category,description,href,featured=false,active=true])=>{
   const card=make(active===false?'article':'a','og-postgame-service-card'+(featured?' is-featured':'')+(active===false?' is-unavailable':''));
   card.dataset.service=id;card.dataset.game=gameId;card.dataset.category=categoryByService[id]||'other';cards.push(card);
   if(active!==false){
    const u=new URL(href);u.searchParams.set('utm_source','osgard_games');u.searchParams.set('utm_medium','post_game');u.searchParams.set('utm_campaign','after_game');u.searchParams.set('utm_content',id+'_'+gameId);card.href=u.href;card.target='_blank';card.rel='noopener noreferrer';card.setAttribute('aria-label','Открыть '+title+' в новой вкладке');
    card.addEventListener('click',()=>sendSelectEvent('cross_promo_clicked',gameId,'osgard-select:click:'+id));
   }
   card.append(make('span','og-postgame-service-code','OSG / '+num+' · '+category),make('strong','og-postgame-service-name',title),make('span','og-postgame-service-description',description),make('span','og-postgame-service-action',active===false?'Пока не продвигается':'Открыть проект ↗'));grid.append(card);
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

 const state=make('div','og-postgame-service-empty');
 if(!showPromos)state.textContent=frequencySummary(preferences,completedCount);
 else if(!activeSelected.length)state.textContent='Сейчас ни один сервис не выбран. Открой «Настроить показ» и отметь интересующие проекты.';
 const foot=make('p','og-postgame-service-foot','Переход добровольный и открывается в новой вкладке. Результат сохраняется. Нет сторонней рекламной сети или фиктивных показов.');
 settingsToggle.addEventListener('click',()=>{settings.hidden=!settings.hidden;settingsToggle.textContent=settings.hidden?'Настроить показ':'Закрыть настройки';settingsToggle.setAttribute('aria-expanded',String(!settings.hidden));if(!settings.hidden)frequency.focus()});
 collapseToggle.addEventListener('click',()=>{const opened=grid.hidden;grid.hidden=!opened;filters.hidden=!opened;collapseToggle.textContent=opened?'Свернуть каталог':'Выбрать из 10 сервисов';collapseToggle.setAttribute('aria-expanded',String(opened));if(opened&&filters.querySelector('button:not(:disabled)'))filters.querySelector('button:not(:disabled)').focus()});
 saveButton.addEventListener('click',()=>{
  const selectedIds=Array.from(choices.querySelectorAll('input[data-service-preference]:checked')).map(input=>input.dataset.servicePreference);
  const ok=writeServicePreferences({frequency:frequency.value,selected:selectedIds});
  const nextPreferences=readServicePreferences(),nextShow=shouldShowServicePromos(nextPreferences,completedCount);
  const replacement=servicesShelf(gameId,nextShow,completedCount);section.replaceWith(replacement);
  const nextToggle=replacement.querySelector('.og-postgame-settings-toggle');if(nextToggle)nextToggle.click();
  const nextStatus=replacement.querySelector('.og-postgame-settings-status');
  if(nextStatus)nextStatus.textContent=ok?'Настройки сохранены на этом устройстве.':'Настройки действуют в этой вкладке; браузер не разрешил постоянное сохранение.';
 });
 section.append(head);
 if(showPromos&&activeSelected.length)section.append(spotlight);
 section.append(settings);
 if(showPromos&&activeSelected.length)section.append(filters,grid,foot);
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
 const primary=make('button','og-postgame-share-primary','Поделиться приглашением · +50 SHARDS');primary.type='button';const actions=make('div','og-postgame-share-actions');actions.append(primary);
 const url=inviteFor(gameId),message='Пойдём сыграем в '+titles[gameId]+' в OSGARD PLAY.',eu=encodeURIComponent(url),et=encodeURIComponent(message);
 const networks=[['Telegram','https://t.me/share/url?url='+eu+'&text='+et],['WhatsApp','https://wa.me/?text='+encodeURIComponent(message+' '+url)],['VK','https://vk.com/share.php?url='+eu+'&title='+encodeURIComponent('OSGARD PLAY · '+titles[gameId])+'&comment='+et],['X','https://twitter.com/intent/tweet?url='+eu+'&text='+et],['Facebook','https://www.facebook.com/sharer/sharer.php?u='+eu]];
 const grid=make('div','og-postgame-networks'),claim=make('button','og-postgame-claim','Я опубликовал — получить +50 SHARDS');claim.type='button';claim.hidden=true;let pending='';
 const show=result=>{balance.textContent='OSGARD SHARDS · '+getWallet().balance;status.textContent=result.ok?'+50 SHARDS начислено. Баланс: '+result.balance+'.':result.already?'Дневная награда уже получена. Баланс: '+result.balance+'.':'Не удалось сохранить награду в этом браузере.'};
 networks.forEach(([name,href])=>{const link=make('a','og-postgame-network',name+' ↗');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Открыть форму публикации в '+name+' в новой вкладке');link.addEventListener('click',()=>{pending=name;claim.hidden=false;claim.textContent='Я опубликовал в '+name+' — получить +50 SHARDS';status.textContent='Откроется форма публикации. После отправки вернись и подтверди действие. Соцсеть не сообщает сайту подтверждение публикации.'});grid.append(link)});
 claim.addEventListener('click',()=>{if(!pending)return;show(award('social-confirmation:'+pending));pending='';claim.hidden=true});
 primary.addEventListener('click',async()=>{primary.disabled=true;status.textContent='Готовим приглашение…';let done=false,source='share';try{if(typeof navigator.share==='function'){await navigator.share({title:'OSGARD PLAY · '+titles[gameId],text:message,url});done=true;source='native-share'}else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message+' '+url);done=true;source='clipboard'}else{status.textContent='Быстрая отправка недоступна. Выбери соцсеть ниже.';return}}catch(error){status.textContent=error instanceof Error&&error.name==='AbortError'?'Отправка отменена — награда не начислена.':'Не удалось отправить приглашение. Выбери соцсеть ниже.';return}finally{primary.disabled=false}if(done)show(award(source+':'+gameId))});
 const note=make('p','og-postgame-reward-note','Награда: +50 локальных SHARDS, не чаще раза в сутки на этом устройстве. Для отдельных соцсетей публикацию подтверждает игрок: соцсети не возвращают сайту надёжный статус опубликованного поста. Очки не имеют денежной стоимости, не привязаны к аккаунту и не являются платёжным средством.');
 section.append(head,actions,grid,claim,status,note);return section;
}
function renderOutsideIntermission(detail){
 const id=detail&&detail.game;
 if(!outsideRoot||!titles[id]||!detail||detail.reason!=='closed_by_user')return;
 const completedSuite=completedInPlayer===id?root.querySelector('.og-postgame-suite'):null;
 if(completedInPlayer===id&&!completedSuite)return;
 const completedCount=completedSuite?readServiceProgress().count:recordCompletedRound(id);
 const preferences=readServicePreferences();
 const suite=make('section','og-postgame-suite og-postgame-outside-suite');
 const intro=make('div','og-postgame-outside-intro');
 intro.append(make('p','og-postgame-eyebrow','OSGARD SELECT / BETWEEN WORLDS'));
 intro.append(make('h2','og-postgame-title','Сессия завершена. Выбери следующий шаг.'));
 intro.append(make('p','og-postgame-copy','Ты вышел из '+titles[id]+'. Выбери следующий игровой мир, открой собственный проект OSGARD или пригласи друга.'));
 const back=make('a','og-postgame-back','Выбрать следующую игру ↗');back.href='#catalog';
 if(completedSuite){
  const existingChildren=Array.from(completedSuite.children);
  completedSuite.replaceChildren();
  completedSuite.remove();
  suite.append(intro,back,...existingChildren);
 }else{
  suite.append(intro,back,servicesShelf(id,shouldShowServicePromos(preferences,completedCount),completedCount),rewardShelf(id));
 }
 outsideRoot.replaceChildren(suite);outsideRoot.hidden=false;
 if(typeof outsideRoot.scrollIntoView==='function'){
  const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  outsideRoot.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
 }
}
document.addEventListener('osgard:game-session-ended',event=>renderOutsideIntermission(event.detail));
document.addEventListener('osgard:game-launching',()=>{
 completedInPlayer='';
 if(!outsideRoot)return;
 outsideRoot.replaceChildren();
 outsideRoot.hidden=true;
});
document.addEventListener('osgard:game-completed',event=>{
 const id=event.detail&&event.detail.game;if(!titles[id])return;
 completedInPlayer=id;
 if(outsideRoot){outsideRoot.replaceChildren();outsideRoot.hidden=true}
 const completedCount=recordCompletedRound(id),preferences=readServicePreferences();
 root.querySelector('.og-postgame-suite')?.remove();
 const suite=make('section','og-postgame-suite');suite.append(servicesShelf(id,shouldShowServicePromos(preferences,completedCount),completedCount),rewardShelf(id));root.append(suite);
});
})();
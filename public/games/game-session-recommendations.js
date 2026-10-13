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


/* OSGARD SELECT v2 — contextual service choice, transparent local rewards and consent-aware attribution. */
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
 ['gardvpn','08','GARD VPN','PRIVACY / VPN','VPN-сервис. Проверь возможности и условия на официальном сайте','https://gardvpn.is/',false,true],
 ['osgard-business','09','OSGARD BUSINESS','BUSINESS INTELLIGENCE','Диагностика бизнеса, развитие и рекомендации по росту','https://osgardos.com/'],
 ['vanguard','10','OSGARD VANGUARD','VIDEO STUDIO','Создание видео и визуальных проектов','https://osgardvanguard.studio/']
];
const recommendationByGame={'null-shift':'gardvpn',time:'superday',swarm:'marcosa',inherit:'myosa',remix:'projects','civic-cascade':'osgard-business',patina:'gold-glamour','signal-run':'vanguard','cascade-lab':'projects'};
const walletKey='osgard.games.shards-wallet.v1',preferredKey='osgard.games.preferred-service.v1',dailyReward=50;
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const hasConsent=()=>{try{return localStorage.getItem('osgard.games.analytics-consent.v1')==='yes'}catch{return false}};
function randomHex(bytes=12){const data=new Uint8Array(bytes);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(data);else for(let i=0;i<data.length;i++)data[i]=Math.floor(Math.random()*256);return Array.from(data,b=>b.toString(16).padStart(2,'0')).join('')}
function sendSelectEvent(name,gameId,source){
 if(!hasConsent())return;
 const event={eventId:'evt_'+randomHex(),name,sessionId:'session_'+randomHex(),gameId:titles[gameId]?gameId:'unknown',source:String(source||'osgard-select').slice(0,80),path:location.pathname,durationSeconds:0};
 fetch('/games/commerce-config.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({})).then(config=>{
  if(!hasConsent())return;
  const base=String(config.apiBaseUrl||'/commerce-api').replace(/\/+$/,'');
  return fetch(base+'/v1/events',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,events:[event]})});
 }).catch(()=>{});
}
function inviteFor(id){
 try{const candidate=window.OSGARDInvite?.createLink?.(id);if(candidate){const u=new URL(candidate,location.origin);if(u.origin===location.origin&&u.pathname==='/games/invite/'+id+'/'&&u.searchParams.get('og_game')===id&&/^og_[a-f0-9]{8}$/.test(u.searchParams.get('og_ref')||''))return u.href}}catch{}
 const u=new URL('/games/invite/'+encodeURIComponent(id)+'/',location.origin);u.searchParams.set('og_ref','og_'+randomHex(4));u.searchParams.set('og_game',id);
 u.searchParams.set('utm_source','osgard_play');u.searchParams.set('utm_medium','referral');u.searchParams.set('utm_campaign','play_with_friends');u.searchParams.set('utm_content',id);return u.href;
}
function getWallet(){try{const w=JSON.parse(localStorage.getItem(walletKey)||'{}');return{balance:Number.isSafeInteger(w.balance)&&w.balance>=0?Math.min(w.balance,1e9):0,day:typeof w.lastRewardDay==='string'?w.lastRewardDay:''}}catch{return{balance:0,day:''}}}
function award(source){
 const current=getWallet(),day=new Date().toISOString().slice(0,10);
 if(current.day===day)return{ok:false,already:true,balance:current.balance};
 const next={balance:Math.min(1e9,current.balance+dailyReward),lastRewardDay:day,lastSource:String(source||'share').slice(0,60),updatedAt:new Date().toISOString(),scope:'local-device-only'};
 try{localStorage.setItem(walletKey,JSON.stringify(next));return{ok:true,balance:next.balance}}catch{return{ok:false,balance:current.balance}}
}
function serviceUrl(service,gameId){
 const u=new URL(service[5]);u.searchParams.set('utm_source','osgard_games');u.searchParams.set('utm_medium','post_game');u.searchParams.set('utm_campaign','after_game');u.searchParams.set('utm_content',service[0]+'_'+gameId);return u.href;
}
function readPreferred(){
 try{const id=localStorage.getItem(preferredKey)||'';return services.some(s=>s[0]===id&&s[7]!==false)?id:''}catch{return''}
}
function savePreferred(id){
 try{localStorage.setItem(preferredKey,id);return true}catch{return false}
}
function servicesShelf(gameId){
 const section=make('section','og-postgame-services'),head=make('div','og-postgame-service-head'),intro=make('div');
 intro.append(make('p','og-postgame-eyebrow','OSGARD SELECT / BETWEEN WORLDS'),make('p','og-postgame-disclosure','РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD'),make('h3','og-postgame-title','Мир не заканчивается после раунда.'),make('p','og-postgame-copy','Начни с персональной рекомендации или сам выбери любой проект OSGARD. Ничего не запускается автоматически; внешняя ссылка откроется по твоему нажатию.'));
 const toggle=make('button','og-postgame-toggle','Выбрать из 10 сервисов');toggle.type='button';toggle.setAttribute('aria-expanded','false');head.append(intro,toggle);
 const spotlight=make('article','og-postgame-spotlight');spotlight.setAttribute('aria-label','Персональная рекомендация OSGARD');
 const filters=make('div','og-postgame-service-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Выбрать категорию сервиса OSGARD');filters.hidden=true;
 const filterDefs=[['all','Все сервисы · 10'],['studio','Разработка · 2'],['business','Бизнес · 2'],['life','Город и жизнь · 2'],['tech','Технологии · 2'],['social','Социальные · 1'],['luxury','Luxury · 1']];
 const filterButtons=[],cards=[];
 filterDefs.forEach(([id,label])=>{const button=make('button','og-postgame-service-filter',label);button.type='button';button.dataset.osgardServiceFilter=id;button.setAttribute('aria-pressed',String(id==='all'));filters.append(button);filterButtons.push(button)});
 const categoryByService={projects:'studio',vanguard:'studio','o2-system':'business','osgard-business':'business',senjorio:'life',superday:'life',myosa:'tech',gardvpn:'tech',marcosa:'social','gold-glamour':'luxury'};
 const grid=make('div','og-postgame-service-grid');grid.hidden=true;
 services.forEach(([id,num,title,category,description,href,featured=false,active=true])=>{
  const card=make(active===false?'article':'a','og-postgame-service-card'+(featured?' is-featured':'')+(active===false?' is-unavailable':''));
  card.dataset.service=id;card.dataset.game=gameId;card.dataset.category=categoryByService[id]||'other';cards.push(card);
  if(active!==false){card.href=serviceUrl([id,num,title,category,description,href,featured,active],gameId);card.target='_blank';card.rel='noopener noreferrer';card.setAttribute('aria-label','Открыть '+title+' в новой вкладке');card.addEventListener('click',()=>sendSelectEvent('cross_promo_clicked',gameId,'post-game:'+id))}
  card.append(make('span','og-postgame-service-code','OSG / '+num+' · '+category),make('strong','og-postgame-service-name',title),make('span','og-postgame-service-description',description),make('span','og-postgame-service-action',active===false?'Пока не продвигается':'Открыть проект ↗'));grid.append(card);
 });
 function renderSpotlight(id){
  const service=services.find(s=>s[0]===id&&s[7]!==false)||services.find(s=>s[0]===recommendationByGame[gameId])||services[0];
  spotlight.replaceChildren();
  const copy=make('div','og-postgame-spotlight-copy');
  copy.append(make('span','og-postgame-spotlight-label','РЕКОМЕНДАЦИЯ ДЛЯ '+(titles[gameId]||'ТВОЕЙ ИГРЫ')),make('span','og-postgame-service-code','OSG / '+service[1]+' · '+service[3]),make('strong','og-postgame-spotlight-name',service[2]),make('span','og-postgame-spotlight-description',service[4]));
  const actions=make('div','og-postgame-spotlight-actions');
  const open=make('a','og-postgame-spotlight-open','Изучить проект ↗');open.href=serviceUrl(service,gameId);open.target='_blank';open.rel='noopener noreferrer';open.addEventListener('click',()=>sendSelectEvent('cross_promo_clicked',gameId,'post-game-spotlight:'+service[0]));
  const next=make('button','og-postgame-spotlight-next','Другой проект');next.type='button';next.addEventListener('click',()=>{const active=services.filter(s=>s[7]!==false);const index=active.findIndex(s=>s[0]===service[0]);const chosen=active[(index+1)%active.length];renderSpotlight(chosen[0]);sendSelectEvent('service_recommendation_changed',gameId,'select:'+chosen[0])});
  const preferred=make('button','og-postgame-spotlight-preferred',readPreferred()===service[0]?'✓ Основной выбор':'Запомнить мой выбор');preferred.type='button';preferred.addEventListener('click',()=>{if(savePreferred(service[0])){preferred.textContent='✓ Основной выбор';status.textContent='Выбор сохранён на этом устройстве.';spotlight.querySelectorAll('.og-postgame-spotlight-preferred').forEach(n=>n.textContent=n===preferred?'✓ Основной выбор':'Запомнить мой выбор')}else status.textContent='Не удалось сохранить выбор. Проверь настройки браузера.'});
  actions.append(open,next,preferred);copy.append(actions);
  spotlight.append(copy);
 }
 const initial=readPreferred()||recommendationByGame[gameId]||'marcosa';
 renderSpotlight(initial);
 const foot=make('p','og-postgame-service-foot','Ссылки ведут на официальные сайты проектов. Наличие ссылки не означает, что функции или доступность сервиса проверены в реальном времени.');
 filterButtons.forEach(button=>button.addEventListener('click',()=>{const selected=button.dataset.osgardServiceFilter||'all';filterButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));cards.forEach(card=>{card.hidden=selected!=='all'&&card.dataset.category!==selected})}));
 toggle.addEventListener('click',()=>{const opened=grid.hidden;grid.hidden=!opened;filters.hidden=!opened;toggle.textContent=opened?'Свернуть каталог':'Выбрать из 10 сервисов';toggle.setAttribute('aria-expanded',String(opened))});
 section.append(head,spotlight,filters,grid,foot);
 const status=make('p','og-postgame-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');section.append(status);
 return section;
}
function rewardShelf(gameId){
 const section=make('section','og-postgame-reward'),head=make('div','og-postgame-reward-head'),intro=make('div');
 intro.append(make('p','og-postgame-eyebrow','COMMUNITY REWARD / OSGARD PLAY'),make('h3','og-postgame-title','Поделись игровым миром.'),make('p','og-postgame-copy','Отправь приглашение другу. За одно действие в сутки можно получить +50 локальных SHARDS.'));
 const balance=make('strong','og-postgame-wallet','OSGARD SHARDS · '+getWallet().balance);head.append(intro,balance);
 const status=make('p','og-postgame-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const primary=make('button','og-postgame-share-primary','Поделиться приглашением · +50 SHARDS');primary.type='button';const actions=make('div','og-postgame-share-actions');actions.append(primary);
 const url=inviteFor(gameId),message='Пойдём сыграем в '+titles[gameId]+' в OSGARD PLAY.',eu=encodeURIComponent(url),et=encodeURIComponent(message);
 const networks=[['Telegram','https://t.me/share/url?url='+eu+'&text='+et],['WhatsApp','https://wa.me/?text='+encodeURIComponent(message+' '+url)],['VK','https://vk.com/share.php?url='+eu+'&title='+encodeURIComponent('OSGARD PLAY · '+titles[gameId])+'&comment='+et],['X','https://twitter.com/intent/tweet?url='+eu+'&text='+et],['Facebook','https://www.facebook.com/sharer/sharer.php?u='+eu]];
 const grid=make('div','og-postgame-networks'),claim=make('button','og-postgame-claim','Я отправил ссылку — получить локальный бонус');claim.type='button';claim.hidden=true;let pending='';
 const show=result=>{balance.textContent='OSGARD SHARDS · '+getWallet().balance;status.textContent=result.ok?'+50 SHARDS начислено локально. Баланс: '+result.balance+'.':result.already?'Дневная награда уже использована на этом устройстве. Баланс: '+result.balance+'.':'Не удалось сохранить награду в этом браузере.'};
 networks.forEach(([name,href])=>{const link=make('a','og-postgame-network',name+' ↗');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Открыть форму отправки приглашения в '+name+' в новой вкладке');link.addEventListener('click',()=>{pending=name;claim.hidden=false;claim.textContent='Я отправил ссылку через '+name+' — получить локальный бонус';status.textContent='Откроется форма отправки. После отправки вернись и подтверди действие. Соцсеть не передаёт сайту надёжного подтверждения публикации.';sendSelectEvent('share_dialog_opened',gameId,'social-share:'+name)});grid.append(link)});
 claim.addEventListener('click',()=>{if(!pending)return;show(award('self-attested:'+pending));if(!getWallet().day||getWallet().day!==new Date().toISOString().slice(0,10))status.textContent+=' Это не проверка опубликованного поста.';pending='';claim.hidden=true});
 primary.addEventListener('click',async()=>{primary.disabled=true;status.textContent='Готовим приглашение…';let done=false,source='share';try{if(typeof navigator.share==='function'){await navigator.share({title:'OSGARD PLAY · '+titles[gameId],text:message,url});done=true;source='native-share'}else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message+' '+url);done=true;source='clipboard-copy'}else{status.textContent='Быстрая отправка недоступна. Выбери социальную сеть ниже.';return}}catch(error){status.textContent=error instanceof Error&&error.name==='AbortError'?'Отправка отменена — локальная награда не начислена.':'Не удалось отправить приглашение. Выбери социальную сеть ниже.';return}finally{primary.disabled=false}if(done){const result=award(source+':'+gameId);show(result);sendSelectEvent(source==='clipboard-copy'?'share_link_copied':'share_created',gameId,'game-invite:'+gameId)}});
 const note=make('p','og-postgame-reward-note','SHARDS — только локальные игровые очки на этом устройстве: не деньги, не платёжное средство и не привилегия аккаунта. Лимит: одна награда в сутки в этом браузере. При отправке через соцсеть подтверждение кнопкой основано на честном слове игрока; пост не проверяется, а очки легко потерять или сбросить. Для защищённой награды за реально пришедшего и сыгравшего друга потребуется аккаунт и серверный журнал начислений.');
 section.append(head,actions,grid,claim,status,note);return section;
}
function renderOutsideIntermission(detail){
 const id=detail&&detail.game;
 if(!outsideRoot||!titles[id]||!detail||detail.reason!=='closed_by_user')return;
 outsideRoot.replaceChildren();
 const suite=make('section','og-postgame-suite og-postgame-outside-suite');
 const intro=make('div','og-postgame-outside-intro');
 intro.append(make('p','og-postgame-eyebrow','OSGARD SELECT / BETWEEN WORLDS'));
 intro.append(make('h2','og-postgame-title','Раунд окончен. Выбери следующий шаг.'));
 intro.append(make('p','og-postgame-copy','Ты завершил сессию '+titles[id]+'. Выбери следующий игровой мир, открой собственный проект OSGARD или пригласи друга.'));
 const back=make('a','og-postgame-back','Выбрать следующую игру ↗');back.href='#catalog';
 suite.append(intro,back,servicesShelf(id),rewardShelf(id));
 outsideRoot.append(suite);outsideRoot.hidden=false;
 if(typeof outsideRoot.scrollIntoView==='function'){const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;outsideRoot.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})}
}
document.addEventListener('osgard:game-session-ended',event=>renderOutsideIntermission(event.detail));
document.addEventListener('osgard:game-launching',()=>{if(!outsideRoot)return;outsideRoot.replaceChildren();outsideRoot.hidden=true});
document.addEventListener('osgard:game-completed',event=>{const id=event.detail&&event.detail.game;if(!titles[id])return;root.querySelector('.og-postgame-suite')?.remove();const suite=make('section','og-postgame-suite');suite.append(servicesShelf(id),rewardShelf(id));root.append(suite)});
})();
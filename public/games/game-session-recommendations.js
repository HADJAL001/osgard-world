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


/* OSGARD SELECT — owned-service intermission and server-backed referral rewards. */
(() => {
'use strict';
const root=document.querySelector('#post-run-recommendations');
const outsideRoot=document.querySelector('#osgard-aftergame-intermission');
if(!root||typeof window==='undefined'||typeof location==='undefined')return;
const titles={'null-shift':'NULL//SHIFT',time:'Империя времени',swarm:'SWARM',inherit:'INHERIT',remix:'REMIX','civic-cascade':'CIVIC CASCADE',patina:'PATINA Atelier','signal-run':'SIGNAL RUN','cascade-lab':'CASCADE LAB'};
const services=[
 ['marcosa','05','MARCOSA','SOCIAL / COMMUNITY','Социальная сеть нового поколения — общение, сообщества и цифровые миры','https://marcosa.club/',true],
 ['projects','01','OSGARD PROJECTS','DIGITAL DEVELOPMENT','Создание сайтов, приложений и игровых продуктов','https://osgardbewworld.com/',true],
 ['o2-system','02','O2 SYSTEM','FINANCIAL TOOLS','Система учёта кассы обменников','https://o2system.art/'],
 ['senjorio','03','SENJORIO','PREMIUM MOBILITY','Премиальное такси','https://senjorio.com/'],
 ['superday','04','SUPERDAY','MAP / DAILY PLANNING','Умная карта и планировщик дня','https://superday.run/'],
 ['myosa','06','MYOSA','AI PLATFORM','Платформа искусственного интеллекта','https://myosa.world/'],
 ['gold-glamour','07','GOLD GLAMOUR','LUXURY SERVICES','Премиальные услуги с золотом и выездным обслуживанием','https://gold-glamour.online/'],
 ['gardvpn','08','GARD VPN','PRIVACY / VPN','Пока не включён в промо-переходы, пока доступность не подтверждена','https://gardvpn.is/',false,false],
 ['osgard-business','09','OSGARD BUSINESS','BUSINESS INTELLIGENCE','Диагностика бизнеса, развитие и рекомендации по росту','https://osgardos.com/'],
 ['vanguard','10','OSGARD VANGUARD','VIDEO STUDIO','Создание видео и визуальных проектов','https://osgardvanguard.studio/']
];
const WALLET_KEY='osgard.games.referral-wallet-token.v1';
const INVITES_KEY='osgard.games.referral-issued-invites.v1';
const CONSENT_KEY='osgard.games.analytics-consent.v1';
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v}catch{return fallback}};
function cryptoHex(bytes){const a=new Uint8Array(bytes);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(a);else for(let i=0;i<a.length;i++)a[i]=Math.floor(Math.random()*256);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')}
function getWalletToken(create){try{let value=localStorage.getItem(WALLET_KEY)||'';if(/^rw_[a-f0-9]{64}$/.test(value))return value;if(!create)return '';value='rw_'+cryptoHex(32);localStorage.setItem(WALLET_KEY,value);return value}catch{return ''}}
function consented(){try{return localStorage.getItem(CONSENT_KEY)==='yes'}catch{return false}}
function eventSessionId(){try{let value=sessionStorage.getItem('osgard.games.growth-session.v1');if(value&&/^session_[a-f0-9]{24}$/.test(value))return value;value='session_'+cryptoHex(12);sessionStorage.setItem('osgard.games.growth-session.v1',value);return value}catch{return 'session_'+cryptoHex(12)}}
async function getApiBase(){try{const r=await fetch('/games/commerce-config.json',{cache:'no-store'});const c=r.ok?await r.json():{};return String(c.apiBaseUrl||'/commerce-api').replace(/\/+$/,'')}catch{return '/commerce-api'}}
async function postApi(path,payload){const base=await getApiBase();const r=await fetch(base+path,{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.message||data.error||'HTTP_'+r.status);return data}
async function sendEvent(name,gameId,source){if(!consented())return false;try{await postApi('/v1/events',{consent:true,events:[{eventId:'evt_'+cryptoHex(16),name,sessionId:eventSessionId(),gameId:titles[gameId]?gameId:'unknown',source:String(source||'post-game').slice(0,80),path:location.pathname,durationSeconds:0}]});return true}catch{return false}}
function inviteFor(gameId,code){const u=new URL('/games/invite/'+encodeURIComponent(gameId)+'/',location.origin);u.searchParams.set('og_ref',code);u.searchParams.set('og_game',gameId);u.searchParams.set('utm_source','osgard_play');u.searchParams.set('utm_medium','referral');u.searchParams.set('utm_campaign','play_with_friends');u.searchParams.set('utm_content',gameId);return u.href}
function loadInviteMap(){const v=read(INVITES_KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function saveInvite(gameId,invite){const all=loadInviteMap();all[gameId]=invite;try{localStorage.setItem(INVITES_KEY,JSON.stringify(all))}catch{}}
async function createInvite(gameId){const token=getWalletToken(true);if(!token)throw new Error('Не удалось сохранить ключ локального бонусного кошелька. Проверь настройки приватности браузера.');const result=await postApi('/v1/referrals/issue',{walletToken:token,gameId,rewardConsent:true});if(!/^og_[a-f0-9]{8}$/.test(result.inviteCode||''))throw new Error('Сервер не вернул корректный код приглашения.');const item={code:result.inviteCode,url:inviteFor(gameId,result.inviteCode),gameId,createdAt:new Date().toISOString()};saveInvite(gameId,item);return{...item,balance:Number(result.balance||0),rewards:Number(result.rewards||0)}}
async function currentWallet(){const token=getWalletToken(false);if(!token)return{balance:0,rewards:0,dailyRewardLimit:5};return postApi('/v1/referrals/wallet',{walletToken:token,rewardConsent:true})}
function ensureStyles(){if(document.querySelector('#osgard-growth-style'))return;const style=make('style');style.id='osgard-growth-style';style.textContent='.og-postgame-suite{display:grid;gap:10px;margin:12px 0}.og-postgame-services,.og-postgame-reward{min-width:0;padding:14px;border:1px solid rgba(218,192,133,.27);border-radius:11px;background:radial-gradient(ellipse at 0 0,rgba(201,173,111,.10),transparent 42%),linear-gradient(145deg,#11120f,#0a0d0c 72%);box-shadow:0 18px 46px rgba(0,0,0,.22)}.og-postgame-service-head,.og-postgame-reward-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}.og-postgame-service-head>div,.og-postgame-reward-head>div{min-width:0}.og-postgame-eyebrow{margin:0 0 5px;color:#d7bf87;font:8px/1.5 ui-monospace,Consolas,monospace;letter-spacing:.16em}.og-postgame-title{margin:0;color:#f4f0e6;font:400 clamp(20px,2.1vw,28px)/1.04 Georgia,serif;letter-spacing:-.035em}.og-postgame-copy{max-width:650px;margin:7px 0 0;color:#a8a79d;font-size:10px;line-height:1.6}.og-postgame-toggle{flex:0 0 auto;min-height:30px;padding:6px 9px;border:1px solid rgba(218,192,133,.3);border-radius:7px;background:#ffffff03;color:#d8c28f;font-size:9px;cursor:pointer}.og-postgame-service-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:minmax(92px,auto);gap:7px}.og-postgame-service-grid[hidden],.og-postgame-claim[hidden],.og-postgame-networks[hidden]{display:none}.og-postgame-service-card{position:relative;display:flex;min-width:0;min-height:94px;flex-direction:column;align-items:flex-start;gap:6px;overflow:hidden;padding:11px;border:1px solid #ffffff16;border-radius:8px;background:linear-gradient(135deg,#ffffff05,transparent 75%),#101311;color:#f3f0e8;text-decoration:none;transition:border-color .22s ease,background .22s ease,transform .22s ease}.og-postgame-service-card:after{position:absolute;right:0;top:0;width:24px;height:1px;content:\"\";background:rgba(218,192,133,.45)}.og-postgame-service-card:hover,.og-postgame-service-card:focus-visible{transform:translateY(-2px);border-color:rgba(218,192,133,.62);background:#121511;outline:2px solid transparent}.og-postgame-service-card.is-featured{grid-column:span 2;grid-row:span 2;justify-content:center;gap:10px;padding:16px;background:radial-gradient(ellipse at 100% 0,rgba(218,192,133,.13),transparent 48%),#111410;border-color:rgba(218,192,133,.32)}.og-postgame-service-code{color:#b8a676;font:7px/1.5 ui-monospace,Consolas,monospace;letter-spacing:.09em}.og-postgame-service-name{font-size:11px;font-weight:750;letter-spacing:.035em;overflow-wrap:anywhere}.og-postgame-service-card.is-featured .og-postgame-service-name{font:400 clamp(24px,3vw,38px)/1 Georgia,serif;letter-spacing:-.045em;color:#f2e4bb}.og-postgame-service-description{flex:1;color:#a9aaa0;font-size:9px;line-height:1.55;overflow-wrap:anywhere}.og-postgame-service-action{margin-top:2px;color:#e0c989;font:8px/1.5 ui-monospace,Consolas,monospace;letter-spacing:.04em}.og-postgame-service-card.is-unavailable{border-style:dashed;border-color:#ffffff18;opacity:.78;cursor:default}.og-postgame-service-foot{margin:10px 0 0;color:#777d72;font-size:8px;line-height:1.5}.og-postgame-wallet{flex:0 0 auto;padding:7px 9px;border:1px solid rgba(218,192,133,.29);border-radius:7px;color:#e7d49f;font:8px ui-monospace,Consolas,monospace;letter-spacing:.04em;white-space:nowrap}.og-postgame-share-actions,.og-postgame-networks{display:flex;flex-wrap:wrap;gap:7px}.og-postgame-share-primary,.og-postgame-claim,.og-postgame-network,.og-postgame-enable,.og-postgame-disable{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:8px 11px;border:1px solid rgba(218,192,133,.29);border-radius:7px;background:#ffffff03;color:#e8e3d6;text-decoration:none;font-size:9px;font-weight:650;cursor:pointer;transition:background .2s ease,border-color .2s ease,transform .2s ease}.og-postgame-share-primary,.og-postgame-enable{border-color:#d8c28f;background:linear-gradient(115deg,#c5a95e,#e8d5a1 60%,#c9ab64);color:#13130f}.og-postgame-share-primary:hover,.og-postgame-enable:hover,.og-postgame-network:hover{transform:translateY(-1px);border-color:#f0dfb2}.og-postgame-network{color:#d4c29a}.og-postgame-network:focus-visible,.og-postgame-share-primary:focus-visible,.og-postgame-enable:focus-visible,.og-postgame-disable:focus-visible{outline:2px solid #f2e4bb;outline-offset:2px}.og-postgame-claim{background:#ffffff04}.og-postgame-status{margin:8px 0 0;color:#d9c997;font-size:10px;line-height:1.6;overflow-wrap:anywhere}.og-postgame-reward-note{margin:8px 0 0;color:#85877e;font-size:8px;line-height:1.6}.og-postgame-controls{display:flex;gap:7px;flex-wrap:wrap}.og-postgame-networks a[aria-disabled=\"true\"]{opacity:.35;pointer-events:none}@media(max-width:760px){.og-postgame-services,.og-postgame-reward{padding:11px}.og-postgame-service-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(86px,auto)}.og-postgame-service-card{min-height:88px;padding:9px}.og-postgame-service-card.is-featured{grid-column:span 2;grid-row:auto;min-height:125px}.og-postgame-service-card.is-featured .og-postgame-service-name{font-size:30px}.og-postgame-service-name{font-size:10px}.og-postgame-service-description{font-size:9px}.og-postgame-reward-head{flex-direction:column;gap:8px}.og-postgame-wallet{align-self:flex-start}.og-postgame-share-primary,.og-postgame-network,.og-postgame-enable,.og-postgame-disable{min-height:40px}.og-postgame-controls>*{flex:1 1 auto}}@media(max-width:360px){.og-postgame-service-grid{grid-template-columns:1fr}.og-postgame-service-card.is-featured{grid-column:auto}}@media(prefers-reduced-motion:reduce){.og-postgame-service-card,.og-postgame-network,.og-postgame-share-primary,.og-postgame-enable{transition:none}}';document.head.append(style)}
const categoryByService={projects:'studio',vanguard:'studio','gold-glamour':'luxury'};let osgardServiceFilter='all';
function servicesShelf(gameId){const section=make('section','og-postgame-services'),head=make('div','og-postgame-service-head'),intro=make('div');intro.append(make('p','og-postgame-eyebrow','OSGARD SELECT / BETWEEN WORLDS'),make('h3','og-postgame-title','Мир не заканчивается после раунда.'),make('p','og-postgame-copy','Выбери следующий продукт экосистемы. Это собственные сервисы OSGARD, а не сторонняя рекламная сеть.'));const toggle=make('button','og-postgame-toggle','Свернуть подборку');toggle.type='button';toggle.setAttribute('aria-expanded','true');head.append(intro,toggle);const filters=make('div','og-postgame-service-filters');[['all','Все сервисы · 10'],['studio','Разработка · 2'],['luxury','Luxury · 1']].forEach(([value,label])=>{const b=make('button','og-postgame-service-filter',label);b.type='button';b.setAttribute('aria-pressed',String(value===osgardServiceFilter));b.addEventListener('click',()=>{osgardServiceFilter=value;for(const btn of filters.children)btn.setAttribute('aria-pressed',String(btn===b));for(const card of grid.children)card.hidden=value!=='all'&&(categoryByService[card.dataset.service]||'ecosystem')!==value});filters.append(b)});const grid=make('div','og-postgame-service-grid');services.forEach(([id,num,title,category,description,href,featured=false,active=true])=>{const card=make(active===false?'article':'a','og-postgame-service-card'+(featured?' is-featured':'')+(active===false?' is-unavailable':''));card.dataset.service=id;card.dataset.game=gameId;card.dataset.category=categoryByService[id]||'ecosystem';card.hidden=osgardServiceFilter!=='all'&&card.dataset.category!==osgardServiceFilter;if(active!==false){const u=new URL(href);u.searchParams.set('utm_source','osgard_games');u.searchParams.set('utm_medium','post_game');u.searchParams.set('utm_campaign','after_game');u.searchParams.set('utm_content',id+'_'+gameId);card.href=u.href;card.target='_blank';card.rel='noopener noreferrer';card.setAttribute('aria-label','Открыть '+title+' в новой вкладке')}card.append(make('span','og-postgame-service-code','OSG / '+num+' · '+category),make('strong','og-postgame-service-name',title),make('span','og-postgame-service-description',description),make('span','og-postgame-service-action',active===false?'Пока не продвигается':'Открыть проект ↗'));grid.append(card)});const foot=make('p','og-postgame-service-foot','Переход добровольный, откроется в отдельной вкладке. Текущий результат игры сохранится.');toggle.addEventListener('click',()=>{grid.hidden=!grid.hidden;toggle.textContent=grid.hidden?'Показать все проекты · 10':'Свернуть подборку';toggle.setAttribute('aria-expanded',String(!grid.hidden))});section.append(head,filters,grid,foot);return section}
function rewardShelf(gameId){
 const section=make('section','og-postgame-reward'),head=make('div','og-postgame-reward-head'),intro=make('div');intro.append(make('p','og-postgame-eyebrow','COMMUNITY REWARD / OSGARD PLAY'),make('h3','og-postgame-title','Играй вместе — открывай награды.'),make('p','og-postgame-copy','Создай персональную ссылку и позови друга в тот же мир. +50 SHARDS начисляются только после подтверждённой сервером записи игровой сессии приглашённого длительностью от 60 секунд.'));const balance=make('strong','og-postgame-wallet','SHARDS · серверный кошелёк');head.append(intro,balance);
 const status=make('p','og-postgame-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const enable=make('button','og-postgame-enable','Включить бонусную программу и создать ссылку');enable.type='button';
 const primary=make('button','og-postgame-share-primary','Поделиться приглашением ↗');primary.type='button';primary.disabled=true;
 const controls=make('div','og-postgame-controls');const disable=make('button','og-postgame-disable','Удалить кошелёк и отключить SHARDS');disable.type='button';disable.hidden=true;
 const actions=make('div','og-postgame-share-actions');actions.append(enable,primary);
 const grid=make('div','og-postgame-networks');grid.hidden=true;let invite=null,wallet=null;
 const setState=(text)=>{status.textContent=text};
 const refresh=async()=>{wallet=await currentWallet();balance.textContent='SHARDS · '+wallet.balance+' · наград '+wallet.rewards;};
 const links=[['Telegram',code=>'https://t.me/share/url?url='+encodeURIComponent(invite.url)+'&text='+encodeURIComponent('Пойдём сыграем в '+titles[gameId]+' в OSGARD PLAY.')],['WhatsApp',code=>'https://wa.me/?text='+encodeURIComponent('Пойдём сыграем в '+titles[gameId]+' в OSGARD PLAY: '+invite.url)],['VK',code=>'https://vk.com/share.php?url='+encodeURIComponent(invite.url)+'&title='+encodeURIComponent('OSGARD PLAY · '+titles[gameId])],['X',code=>'https://twitter.com/intent/tweet?url='+encodeURIComponent(invite.url)+'&text='+encodeURIComponent('Пойдём сыграем в '+titles[gameId]+' в OSGARD PLAY.')],['Facebook',code=>'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(invite.url)]];
 links.forEach(([name,href])=>{const link=make('a','og-postgame-network',name+' ↗');link.href='#';link.target='_blank';link.rel='noopener noreferrer';link.addEventListener('click',event=>{if(!invite){event.preventDefault();return}link.href=href();void sendEvent('share_target_opened',gameId,'social-share-target:'+name);setState('Открыта форма '+name+'. Сама соцсеть не подтверждает публикацию; SHARDS начисляются за завершённую игровую сессию приглашённого.')});grid.append(link)});
 async function setup(){enable.disabled=true;setState('Подготавливаем защищённый серверный кошелёк и уникальную ссылку…');try{invite=await createInvite(gameId);await refresh();const earned=Boolean(wallet&&wallet.rewards>0);primary.disabled=false;grid.hidden=false;disable.hidden=false;enable.textContent='Создать ещё одну ссылку';setState('Ссылка создана. За каждый пригласительный код можно получить +50 SHARDS один раз; до пяти наград за 24 часа. Для учёта игровой сессии приглашённому нужно разрешить необязательную аналитику.');void sendEvent('catalog_viewed',gameId,'referral-reward-opt-in');}catch(error){setState('Серверная бонусная система сейчас недоступна: '+(error&&error.message?error.message:'повторите позже')+'. Награда локально не имитируется.');}finally{enable.disabled=false}}
 enable.addEventListener('click',()=>void setup());
 primary.addEventListener('click',async()=>{if(!invite){setState('Сначала включи бонусную программу и создай ссылку.');return}primary.disabled=true;let completed=false;try{if(typeof navigator.share==='function'){await navigator.share({title:'OSGARD PLAY · '+titles[gameId],text:'Пойдём сыграем вместе.',url:invite.url});completed=true;}else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText('Пойдём сыграем в '+titles[gameId]+' в OSGARD PLAY: '+invite.url);completed=true;}else{setState('Быстрая отправка недоступна. Выбери соцсеть ниже.');return}}catch(error){setState(error instanceof Error&&error.name==='AbortError'?'Отправка отменена — ссылка не засчитана как подтверждённый share.':'Не удалось отправить приглашение. Выбери соцсеть ниже.');return}finally{primary.disabled=false}if(completed){const sent=await sendEvent('share_created',gameId,'game-invite:'+gameId+':'+invite.code);setState('Приглашение передано или скопировано. '+(sent?'Действие записано. ':'')+'Награда не выдаётся за share: +50 SHARDS появятся только если приглашённый завершит сессию от 60 секунд и согласится на учёт игровой сессии.');}});
 disable.addEventListener('click',async()=>{if(!confirm('Удалить серверный бонусный кошелёк, его ссылки и историю наград? Это действие необратимо.'))return;disable.disabled=true;try{const token=getWalletToken(false);if(!token)throw new Error('Кошелёк на этом устройстве не найден.');await postApi('/v1/referrals/disable',{walletToken:token});try{localStorage.removeItem(WALLET_KEY);localStorage.removeItem(INVITES_KEY)}catch{}invite=null;wallet=null;primary.disabled=true;grid.hidden=true;disable.hidden=true;balance.textContent='SHARDS · отключено';enable.textContent='Подключить снова';setState('Кошелёк и связанные приглашения удалены с сервера.')}catch(error){setState('Не удалось удалить кошелёк: '+(error&&error.message||'повторите позже'))}finally{disable.disabled=false}});
 const prior=loadInviteMap()[gameId];if(prior&&/^og_[a-f0-9]{8}$/.test(prior.code||'')){invite={...prior,url:inviteFor(gameId,prior.code)};grid.hidden=false;primary.disabled=false;disable.hidden=false;enable.textContent='Создать ещё одну ссылку';void refresh().catch(()=>{balance.textContent='SHARDS · сервер недоступен';})}
 const note=make('p','og-postgame-reward-note','Баллы SHARDS — внутриигровые очки, не являются платёжным средством и не имеют денежной стоимости; обмен и покупки отключены. Награда начисляется на сервере один раз на код приглашения, после записи завершённой сессии от 60 секунд; максимум пять начислений на кошелёк за скользящие 24 часа. Нельзя проверить публикацию напрямую в соцсети, поэтому «Поделиться» само по себе баллы не выдаёт. Обе стороны должны разрешить соответствующий учёт сессии; не обещается защита от всех видов накрутки для клиентских игр.');
 section.append(head,actions,grid,disable,status,note);return section;
}
function suiteFor(id,extraClass=''){const suite=make('section','og-postgame-suite'+(extraClass?' '+extraClass:''));suite.append(servicesShelf(id),rewardShelf(id));return suite}
document.addEventListener('osgard:game-completed',event=>{const id=event.detail&&event.detail.game;if(!titles[id])return;root.querySelector('.og-postgame-suite')?.remove();const suite=suiteFor(id);root.append(suite)});
document.addEventListener('osgard:game-session-ended',event=>{const detail=event.detail||{},id=detail.game;if(detail.reason!=='closed_by_user'||!titles[id]||!outsideRoot)return;outsideRoot.replaceChildren();const suite=suiteFor(id,'og-postgame-outside-suite');const back=make('a','og-postgame-back','← К следующей игре');back.href='#catalog';suite.append(back);outsideRoot.append(suite);outsideRoot.hidden=false});
document.addEventListener('osgard:game-launching',()=>{
 root.querySelector('.og-postgame-suite')?.remove();
 root.hidden=true;
 root.replaceChildren();
 if(outsideRoot){outsideRoot.hidden=true;outsideRoot.replaceChildren()}
 dialog?.classList.remove('has-recommendations');
});
document.addEventListener('osgard:game-completed',()=>{root.hidden=false});
})();

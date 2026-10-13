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
function visitorToken(){try{let value=localStorage.getItem('osgard.games.referral-owner-token.v1')||'';if(!/^[a-f0-9]{12}$/.test(value)){value=token();localStorage.setItem('osgard.games.referral-owner-token.v1',value)}return value}catch{return token()}}
function longInviteCode(){const bytes=new Uint8Array(16);try{globalThis.crypto.getRandomValues(bytes)}catch{for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256)}return 'og_'+Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('')}
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
 const canonicalInvite=Boolean(games[canonicalGame]&&/^og_(?:[a-f0-9]{8}|[a-f0-9]{32})$/.test(canonicalCode)&&source==='osgard_play'&&medium==='referral'&&campaign==='play_with_friends');
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
  const deviceToken=visitorToken();
  sessionStorage.setItem(ATTR_KEY,JSON.stringify({code:invite.code,game:invite.game,visitorToken:deviceToken,at:Date.now()}));
  const state=sessionStorage.getItem(marker);
  if(state==='yes')return true;
  if(state==='pending')return false;
  sessionStorage.setItem(marker,'pending');
  const source=/^og_[a-f0-9]{32}$/.test(invite.code)?'referral-link:'+invite.code+':'+deviceToken:'referral-link:'+invite.code;
  const sent=await sendEvent('referral_link_opened',invite.game,source);
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
   if(shared.origin===location.origin&&shared.pathname==='/games/invite/'+gameId+'/'&&shared.searchParams.get('og_game')===gameId&&/^og_(?:[a-f0-9]{8}|[a-f0-9]{32})$/.test(shared.searchParams.get('og_ref')||''))return shared.href;
  }
 }catch{}
 // Fail-soft fallback follows the same public URL contract as the catalogue toolbar.
 const url=new URL('/games/invite/'+encodeURIComponent(gameId)+'/',location.origin);
 url.searchParams.set('og_ref',longInviteCode());
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
  const url=buildShareUrl(gameId),inviteParams=new URL(url,location.origin).searchParams,inviteCode=inviteParams.get('og_ref')||'',ownerToken=visitorToken(),message='Пойдём сыграем в '+game.title+' в OSGARD PLAY: '+url;
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
  if(shareCompleted)void sendEvent('share_created',gameId,/^og_[a-f0-9]{32}$/.test(inviteCode)?'game-invite:'+gameId+':'+inviteCode+':'+ownerToken:'game-invite:'+gameId+':'+inviteCode);
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

/* Premium first-party intermission: OSGARD-owned services, social share buttons and SPARK referral rewards. */
(() => {
'use strict';
const host=document.querySelector('#post-run-recommendations');
const dialog=document.querySelector('#player-dialog');
if(!host||!dialog||typeof location==='undefined')return;
const CONSENT_KEY='osgard.games.analytics-consent.v1';
const validGames=new Set(['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab']);
const gameTitles={'null-shift':'NULL//SHIFT',time:'Империя времени',swarm:'SWARM',inherit:'INHERIT',remix:'REMIX','civic-cascade':'CIVIC CASCADE',patina:'PATINA Atelier','signal-run':'SIGNAL RUN','cascade-lab':'CASCADE LAB'};
const services=[
 {id:'create',mark:'CREATE',name:'OSGARD CREATE',headline:'Идея → цифровой продукт',description:'Создание проектов и приложений',url:'https://osgardbewworld.com/'},
 {id:'o2system',mark:'O2',name:'O2 SYSTEM',headline:'Касса под контролем',description:'Система учёта кассы обменников',url:'https://o2system.art/'},
 {id:'senjorio',mark:'S',name:'SENJORIO',headline:'Перемещения премиум-класса',description:'Премиальное такси',url:'https://senjorio.com/'},
 {id:'superday',mark:'DAY',name:'SUPERDAY',headline:'Планируй свой день',description:'Умная карта и планировщик дня',url:'https://superday.run/'},
 {id:'marcosa',mark:'M',name:'MARCOSA',headline:'Личный социальный мир',description:'Премиальная социальная сеть нового поколения',url:'https://marcosa.club/'},
 {id:'myosa',mark:'AI',name:'MYOSA',headline:'Инструменты нового поколения',description:'AI-платформа',url:'https://myosa.world/'},
 {id:'gold-glamour',mark:'G',name:'GOLD GLAMOUR',headline:'Сервис с золотым акцентом',description:'Премиальные услуги с золотом и выездным обслуживанием',url:'https://gold-glamour.online/'},
 {id:'gardvpn',mark:'VPN',name:'GARD VPN',headline:'Защити соединение',description:'VPN-сервис',url:'https://gardvpn.is/'},
 {id:'osgardos',mark:'OS',name:'OSGARD OS',headline:'Развивай бизнес',description:'Развитие бизнеса',url:'https://osgardos.com/'},
 {id:'vanguard',mark:'FRAME',name:'OSGARD VANGUARD',headline:'Расскажи историю сильнее',description:'Создание видео',url:'https://osgardvanguard.studio/'}
];
const make=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node};
const consented=()=>{try{return localStorage.getItem(CONSENT_KEY)==='yes'}catch{return false}};
function inviteCode(){try{if(typeof window.OSGARDInvite?.getCode==='function')return window.OSGARDInvite.getCode();}catch{}const bytes=new Uint8Array(16);try{globalThis.crypto.getRandomValues(bytes)}catch{for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256)}const code='og_'+Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');try{localStorage.setItem('osgard.games.invite-code.v1',code)}catch{}return code}
function ownerToken(){try{if(typeof window.OSGARDInvite?.getOwnerToken==='function')return window.OSGARDInvite.getOwnerToken()}catch{}try{let t=localStorage.getItem('osgard.games.referral-owner-token.v1')||'';if(!/^[a-f0-9]{12}$/.test(t)){const bytes=new Uint8Array(6);globalThis.crypto.getRandomValues(bytes);t=Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');localStorage.setItem('osgard.games.referral-owner-token.v1',t)}return t}catch{return randomHex(6)}}
function gameId(){const value=dialog.dataset.game||'unknown';return validGames.has(value)?value:'unknown'}
async function apiBase(){try{const r=await fetch('/games/commerce-config.json',{cache:'no-store'});const c=r.ok?await r.json().catch(()=>({})):{};let base=String(c.apiBaseUrl||'/commerce-api');while(base.endsWith('/'))base=base.slice(0,-1);return base}catch{return '/commerce-api'}}
async function postEvent(name,id,source){
 if(!consented())return false;
 const event={eventId:'evt_'+randomHex(12),name,sessionId:'session_'+randomHex(12),gameId:validGames.has(id)?id:'unknown',source:String(source).slice(0,80),path:location.pathname,durationSeconds:0};
 try{const response=await fetch((await apiBase())+'/v1/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,events:[event]})});return response.ok}catch{return false}
}
function randomHex(bytes=12){const data=new Uint8Array(bytes);try{globalThis.crypto.getRandomValues(data)}catch{for(let i=0;i<data.length;i++)data[i]=Math.floor(Math.random()*256)}return Array.from(data,v=>v.toString(16).padStart(2,'0')).join('')}
function sessionToken(){try{const raw=sessionStorage.getItem('osgard.games.referral-attribution.v1'),v=raw?JSON.parse(raw):null;if(v&&/^[a-f0-9]{12}$/.test(v.visitorToken||''))return v.visitorToken}catch{}return ownerToken()}
async function loadRewardBalance(node){
 if(!consented()){node.textContent='Включи необязательную аналитику, чтобы учитывать приглашения. Сам каталог и переходы работают и без неё.';return}
 const code=inviteCode();
 node.textContent='Проверяем награды…';
 try{
  const response=await fetch((await apiBase())+'/v1/referrals/reward-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error('Не удалось получить баланс');
  node.textContent='Твой баланс: '+String(result.pointsEarned||0)+' SPARK · зачтено приглашений: '+String(result.qualifiedSessions||0)+'. SPARK нельзя обменять на деньги или покупки.';
 }catch{node.textContent='Баланс SPARK пока недоступен. Приглашения работают; результат появится после подключения хранилища наград.'}
}
function serviceHref(service,currentGame){
 const url=new URL(service.url);
 url.searchParams.set('utm_source','osgard_games');
 url.searchParams.set('utm_medium','cross_promo');
 url.searchParams.set('utm_campaign','between_games');
 url.searchParams.set('utm_content',currentGame+':'+service.id);
 return url.href;
}
function socialHref(network,url,title){
 const text='Пойдём сыграем в '+title+' в OSGARD PLAY: '+url;
 if(network==='whatsapp')return 'https://wa.me/?text='+encodeURIComponent(text);
 if(network==='telegram')return 'https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent('Пойдём сыграем в '+title+' в OSGARD PLAY');
 if(network==='vk')return 'https://vk.com/share.php?url='+encodeURIComponent(url)+'&title='+encodeURIComponent(title+' — OSGARD PLAY');
 if(network==='x')return 'https://twitter.com/intent/tweet?text='+encodeURIComponent(text);
 if(network==='facebook')return 'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);
 return url;
}
function render(event){
 const id=event?.detail?.game;if(!validGames.has(id))return;
 host.querySelector('.og-intermission')?.remove();
 const section=make('section','og-intermission');section.setAttribute('aria-labelledby','og-intermission-title');
 const header=make('div','og-intermission-header');
 const eyebrow=make('p','og-intermission-eyebrow','OSGARD WORLD / INTERMISSION  ·  СОБСТВЕННАЯ ЭКОСИСТЕМА');
 header.append(eyebrow);
 const title=make('h3','og-intermission-title','Выбери свой следующий мир.');
 title.id='og-intermission-title';
 const copy=make('p','og-intermission-copy','Только что завершена игровая сессия. Открой сервис OSGARD, который нужен тебе сейчас — переход добровольный.');
 header.append(title,copy);
 const disclosure=make('p','og-intermission-disclosure','Реклама собственных проектов OSGARD · это не сторонние рекламодатели. Каждый сервис открывается в отдельной вкладке.');
 header.append(disclosure);
 const grid=make('div','og-service-grid');
 services.forEach((service,index)=>{
  const a=make('a','og-service-card'+(index===0?' og-service-featured':''));a.href=serviceHref(service,id);a.target='_blank';a.rel='noopener noreferrer';a.dataset.service=service.id;
  const meta=make('span','og-service-meta');meta.append(make('span','og-service-mark',service.mark),make('span','og-service-name',service.name));
  a.append(meta,make('strong','og-service-headline',service.headline),make('span','og-service-description',service.description),make('span','og-service-open','Открыть официальный сайт ↗'));
  a.addEventListener('click',()=>{void postEvent('cross_promo_clicked',id,'cross-promo:'+service.id)});
  grid.append(a);
 });
 const shareSection=make('div','og-social-section');
 const shareTitle=make('h4','og-social-title','Передай вызов другу');
 const shareCopy=make('p','og-social-copy','Друзья смогут открыть ту же игру. Приглашение засчитывается, только если другой браузер откроет ссылку и завершит игровую сессию длиной не менее 60 секунд.');
 shareSection.append(shareTitle,shareCopy);
 const canonicalUrl=()=>{const u=new URL('/games/invite/'+id+'/',location.origin);u.searchParams.set('og_ref',inviteCode());u.searchParams.set('og_game',id);u.searchParams.set('utm_source','osgard_play');u.searchParams.set('utm_medium','referral');u.searchParams.set('utm_campaign','play_with_friends');u.searchParams.set('utm_content',id);return u.href};
 const socialGrid=make('div','og-social-grid');
 const socialNetworks=[['whatsapp','WhatsApp'],['telegram','Telegram'],['vk','VK'],['x','X'],['facebook','Facebook']];
 const inviteUrl=canonicalUrl();
 socialNetworks.forEach(([network,label])=>{
  const a=make('a','og-social-link',label+' ↗');a.href=socialHref(network,inviteUrl,gameTitles[id]||id);a.target='_blank';a.rel='noopener noreferrer';
  a.addEventListener('click',event=>{
   if(!consented())return;
   event.preventDefault();
   const destination=a.href;
   const popup=window.open('about:blank','_blank');
   if(popup)popup.opener=null;
   void postEvent('share_created',id,'game-invite:'+id+':'+inviteCodeValue+':'+ownerToken()).finally(()=>{
    if(popup&&!popup.closed)popup.location.href=destination;
    else if(!popup)location.href=destination;
   });
  });
  socialGrid.append(a);
 });
 const copyButton=make('button','og-social-copy-button','Скопировать приглашение');
 copyButton.type='button';
 const shareStatus=make('p','og-social-status','Кнопки откроют форму выбранной соцсети. Мы не можем проверить, нажал ли пользователь «Опубликовать».');
 shareStatus.setAttribute('role','status');shareStatus.setAttribute('aria-live','polite');
 copyButton.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(inviteUrl);shareStatus.textContent='Ссылка скопирована. Отправь её другу. После подтверждённой копии событие ссылки будет учтено, а SPARK — только после квалифицированной сессии.';if(consented())void postEvent('share_created',id,'game-invite:'+id+':'+inviteCodeValue+':'+ownerToken())}
  catch{shareStatus.textContent='Не удалось скопировать автоматически. Выбери соцсеть выше или скопируй адресную строку.'}
 });
 const rewardSection=make('div','og-spark-panel');
 rewardSection.append(make('span','og-spark-eyebrow','OSGARD SPARK / НАГРАДА ЗА ПРИГЛАШЕНИЕ'));
 rewardSection.append(make('strong','og-spark-title','+100 SPARK за квалифицированного друга'));
 rewardSection.append(make('p','og-spark-copy','Друг должен открыть твою ссылку в другом браузере и провести в игре не менее 60 секунд до завершения сессии. Один и тот же приглашённый браузер засчитывается по одной награде на код.'));
 const balance=make('p','og-spark-balance','');
 balance.setAttribute('role','status');balance.setAttribute('aria-live','polite');rewardSection.append(balance);
 rewardSection.append(make('p','og-spark-footnote','SPARK — внутренняя неденежная активность. Обмен на деньги и покупки не предусмотрен; игровые привилегии ещё не подключены.'));
 section.append(header,grid,shareSection,socialGrid,copyButton,shareStatus,rewardSection);
 host.append(section);
 void loadRewardBalance(balance);
}
document.addEventListener('osgard:game-completed',render);
document.addEventListener('osgard:game-launching',()=>{host.querySelector('.og-intermission')?.remove()});
})();
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
const SHARE_REWARD_KEY='osgard.games.reward-wallet.v1';
function grantShareReward(gameId){
 const today=new Date().toISOString().slice(0,10);
 try{
  let wallet;
  try{wallet=JSON.parse(localStorage.getItem(SHARE_REWARD_KEY)||'null')}catch{wallet=null}
  if(!wallet||typeof wallet!=='object'||!Array.isArray(wallet.entries))wallet={version:1,balance:0,entries:[]};
  wallet.balance=Math.max(0,Math.floor(Number(wallet.balance)||0));
  if(wallet.entries.some(entry=>entry&&entry.gameId===gameId&&entry.day===today&&entry.kind==='share-invite')){
   return {ok:false,reason:'already',balance:wallet.balance};
  }
  const todayCount=wallet.entries.filter(entry=>entry&&entry.day===today&&entry.kind==='share-invite').length;
  if(todayCount>=3)return {ok:false,reason:'daily-cap',balance:wallet.balance};
  const reward={id:'shard_'+token(),kind:'share-invite',item:'signal-shard',amount:1,gameId,day:today,grantedAt:new Date().toISOString(),validation:'client-side-share-action'};
  wallet.version=1;
  wallet.balance+=1;
  wallet.entries=wallet.entries.concat(reward).slice(-250);
  localStorage.setItem(SHARE_REWARD_KEY,JSON.stringify(wallet));
  notifyGameFrame(gameId,reward,wallet.balance);
  return {ok:true,reward,balance:wallet.balance};
 }catch{
  return {ok:false,reason:'storage-unavailable',balance:0};
 }
}
function notifyGameFrame(gameId,reward,balance){
 const frame=document.querySelector('#player-frame');
 if(!frame)return false;
 let delivered=false;
 try{
  if(frame.contentWindow)frame.contentWindow.postMessage({type:'osgard:share-reward-granted',version:1,gameId,reward,balance},location.origin);
 }catch{}
 try{
  const doc=frame.contentDocument;
  if(!doc||!doc.body)return false;
  let style=doc.getElementById('osgard-share-reward-style');
  if(!style){
   style=doc.createElement('style');style.id='osgard-share-reward-style';
   style.textContent='#osgard-share-reward-toast{position:fixed;z-index:2147483647;top:max(14px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 24px);padding:13px 17px;border:1px solid #e4cb8a;background:linear-gradient(120deg,#d4b56b,#f0dda5);color:#10130d;font:700 11px/1.5 system-ui,sans-serif;letter-spacing:.055em;box-shadow:0 14px 48px #0009;border-radius:4px;text-align:center}#osgard-share-reward-toast small{display:block;margin-top:3px;font-size:9px;font-weight:500;letter-spacing:0}';
   (doc.head||doc.documentElement).append(style);
  }
  let toast=doc.getElementById('osgard-share-reward-toast');
  if(toast)toast.remove();
  toast=doc.createElement('div');toast.id='osgard-share-reward-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
  const title=doc.createElement('span');title.textContent='OSGARD BONUS · +1 SIGNAL SHARD';
  const detail=doc.createElement('small');detail.textContent='Коллекция жетонов: '+balance;
  toast.append(title,detail);doc.body.append(toast);delivered=true;
  setTimeout(()=>{if(toast.isConnected)toast.remove()},6500);
 }catch{}
 return delivered;
}
function reportShareReward(result,status,claimButton){
 if(!result||!status)return;
 if(result.ok){
  status.textContent='Награда получена: +1 Signal Shard. Баланс в этом браузере: '+result.balance+'. В игре показано уведомление, если игровой клиент разрешил доступ.';
  if(claimButton){claimButton.disabled=true;claimButton.textContent='Получено · +1 Signal Shard';}
 }else if(result.reason==='already'){
  status.textContent='За эту игру сегодня уже начислялся Signal Shard. Награда — не более одного раза на игру и трёх раз в день.';
  if(claimButton){claimButton.disabled=true;claimButton.textContent='Сегодня уже получено';}
 }else if(result.reason==='daily-cap'){
  status.textContent='Дневной лимит Signal Shard исчерпан: максимум три награды в день.';
  if(claimButton){claimButton.disabled=true;claimButton.textContent='Лимит на сегодня';}
 }else{
  status.textContent='Браузер не сохранил награду. Разреши локальное хранилище и попробуй снова.';
 }
}
function addPostSessionActions(gameId){
 const game=games[gameId];if(!game)return;
 root.querySelector('.og-growth')?.remove();ensureStyles();
 const section=make('section','og-growth');section.setAttribute('aria-label','Приглашение друга, бонус за распространение и проекты OSGARD');
 const top=make('div','og-growth-top');top.append(make('span','og-growth-label','PLAY TOGETHER / EARN A SHARD'));
 top.append(make('p','og-growth-copy','Поделись приглашением, чтобы получить +1 Signal Shard. Лимит — три награды в день; фактическую публикацию соцсеть не подтверждает.'));
 const actions=make('div','og-growth-actions');
 const inviteButton=make('button','og-share-friend','Поделиться · получить +1 ✦');inviteButton.type='button';
 const inviteUrl=buildShareUrl(gameId);
 const inviteText='Пойдём сыграем в '+game.title+' в OSGARD PLAY: '+inviteUrl;
 const whatsApp=make('a','og-create-game','WhatsApp ↗');
 whatsApp.href='https://wa.me/?text='+encodeURIComponent(inviteText);whatsApp.target='_blank';whatsApp.rel='noopener noreferrer';
 const telegram=make('a','og-create-game','Telegram ↗');
 telegram.href='https://t.me/share/url?url='+encodeURIComponent(inviteUrl)+'&text='+encodeURIComponent('Пойдём сыграем в '+game.title+' в OSGARD PLAY');
 telegram.target='_blank';telegram.rel='noopener noreferrer';
 const claimButton=make('button','og-share-reward-claim','Я отправил · забрать +1 Signal Shard');claimButton.type='button';claimButton.hidden=true;
 const createLink=make('a','og-create-game','Создать свою игру с OSGARD ↗');
 createLink.href='https://osgardbewworld.com/?utm_source=osgard_games&utm_medium=cross_promo&utm_campaign=after_game&utm_content='+encodeURIComponent(gameId);
 createLink.target='_blank';createLink.rel='noopener noreferrer';
 const status=make('p','og-growth-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const disclosure=make('p','og-reward-disclosure','Бонус — локальный коллекционный жетон, не деньги и не платная валюта. Для WhatsApp/Telegram подтверждение отправки — самоотчёт; серверной проверки поста нет.');
 const fallback=make('a','og-create-game','Открыть WhatsApp ↗');fallback.hidden=true;fallback.target='_blank';fallback.rel='noopener noreferrer';
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
 actions.append(inviteButton,whatsApp,telegram,claimButton,createLink,fallback);
 section.append(top,actions,status,disclosure,partnerCta);root.append(section);
 let pendingSocialChannel='';
 function prepareSelfReportedClaim(channel){
  pendingSocialChannel=channel;
  claimButton.hidden=false;claimButton.disabled=false;claimButton.textContent='Я отправил · забрать +1 Signal Shard';
  status.textContent='В открывшейся вкладке отправь приглашение. Вернись сюда и подтверди, что поделился: браузер не может проверить публикацию в соцсети.';
 }
 whatsApp.addEventListener('click',()=>prepareSelfReportedClaim('whatsapp'));
 telegram.addEventListener('click',()=>prepareSelfReportedClaim('telegram'));
 fallback.addEventListener('click',()=>prepareSelfReportedClaim('whatsapp'));
 claimButton.addEventListener('click',()=>{
  if(!pendingSocialChannel)return;
  const result=grantShareReward(gameId);
  reportShareReward(result,status,claimButton);
  pendingSocialChannel='';
 });
 inviteButton.addEventListener('click',async()=>{
  inviteButton.disabled=true;status.textContent='Готовим персональную ссылку…';
  const url=buildShareUrl(gameId),inviteCode=new URL(url,location.origin).searchParams.get('og_ref')||'',message='Пойдём сыграем в '+game.title+' в OSGARD PLAY: '+url;
  let shareCompleted=false;
  try{
   if(typeof navigator.share==='function'){
    await navigator.share({title:'OSGARD PLAY · '+game.title,text:'Пойдём сыграем вместе.',url});
    shareCompleted=true;
    status.textContent='Ссылка передана в системное меню отправки.';
   }else if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(message);
    shareCompleted=true;
    status.textContent='Текст приглашения скопирован.';
   }else{
    fallback.href='https://wa.me/?text='+encodeURIComponent(message);
    fallback.hidden=false;
    prepareSelfReportedClaim('whatsapp');
    status.textContent='Открой WhatsApp, отправь приглашение и вернись, чтобы подтвердить действие.';
   }
  }catch(error){
   if(error instanceof Error&&error.name==='AbortError'){
    status.textContent='Отправка отменена. Награда не начислена.';
    return;
   }
   status.textContent='Не удалось открыть системную отправку. Выбери WhatsApp или Telegram.';
   fallback.href='https://wa.me/?text='+encodeURIComponent(message);fallback.hidden=false;
   prepareSelfReportedClaim('whatsapp');
   return;
  }finally{inviteButton.disabled=false}
  // The browser confirms that the share workflow finished or the link was copied.
  // It cannot prove a public social post; this local cosmetic reward is disclosed as such.
  if(shareCompleted){
   void sendEvent('share_created',gameId,'game-invite:'+gameId+':'+inviteCode);
   reportShareReward(grantShareReward(gameId),status,claimButton);
  }
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
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
 'null-shift':{title:'NULL//SHIFT',href:'/games/null-shift-godot/'},
 time:{title:'Империя времени',href:'/games/time'},
 swarm:{title:'SWARM',href:'/games/swarm/'},
 inherit:{title:'INHERIT',href:'/games/inherit/'},
 remix:{title:'REMIX',href:'/games/remix/'},
 'civic-cascade':{title:'CIVIC CASCADE',href:'/games/civic-cascade/'},
 patina:{title:'PATINA Atelier',href:'/games/patina/'},
 'signal-run':{title:'SIGNAL RUN',href:'/games/signal-run/'},
 'cascade-lab':{title:'CASCADE LAB',href:'/games/cascade-lab/'}
};
const CONSENT_KEY='osgard.games.analytics-consent.v1';
const ATTR_KEY='osgard.games.referral-attribution.v1';
const SESSION_KEY='osgard.games.growth-session.v1';
const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
const consented=()=>{try{return localStorage.getItem(CONSENT_KEY)==='yes'}catch{return false}};
function token(){const bytes=new Uint8Array(6);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
function sessionId(){try{let value=sessionStorage.getItem(SESSION_KEY);if(value&&/^session_[a-f0-9]{24}$/.test(value))return value;value='session_'+token()+token();sessionStorage.setItem(SESSION_KEY,value);return value}catch{return 'session_'+token()+token()}}
async function sendEvent(name,gameId,source){
 if(!consented())return false;
 const event={eventId:'evt_'+token()+token(),name,sessionId:sessionId(),gameId:games[gameId]?gameId:'unknown',source:String(source||'games-hub').slice(0,80),path:location.pathname,durationSeconds:0};
 try{
  const configResponse=await fetch('/games/commerce-config.json',{cache:'no-store'});
  const config=configResponse.ok?await configResponse.json().catch(()=>({})):{};
  const base=String(config.apiBaseUrl||'/commerce-api').replace(/\\/+$/,'');
  const response=await fetch(base+'/v1/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,events:[event]})});
  return response.ok;
 }catch{return false}
}
function incomingInvite(){
 const params=new URLSearchParams(location.search),game=params.get('challenge'),code=params.get('ref');
 if(!games[game]||!code||!/^[a-f0-9]{12}$/.test(code))return null;
 return {game,code};
}
async function recordInviteOpen(invite){
 if(!invite||!consented())return;
 try{
  const attr={code:invite.code,game:invite.game,at:Date.now()};
  sessionStorage.setItem(ATTR_KEY,JSON.stringify(attr));
  const marker='osgard.games.referral-opened.'+invite.code;
  if(sessionStorage.getItem(marker)==='yes')return;
  if(await sendEvent('referral_link_opened',invite.game,'referral-link:'+invite.code))sessionStorage.setItem(marker,'yes');
 }catch{}
}
function captureInvite(){
 const invite=incomingInvite();
 if(invite)void recordInviteOpen(invite);
 return invite;
}
function ensureStyles(){
 if(document.querySelector('#osgard-growth-style'))return;
 const style=make('style');
 style.id='osgard-growth-style';
 style.textContent='.og-invite-banner{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin:0 0 22px;padding:20px 22px;border:1px solid #d3ff695c;background:linear-gradient(115deg,#d3ff6914,transparent 70%),#101411}.og-invite-eyebrow{margin:0 0 7px;color:#d3ff69;font:9px ui-monospace,monospace;letter-spacing:.14em}.og-invite-banner h3{margin:0;color:#f2f0e8;font:400 clamp(22px,3vw,32px)/1.08 Georgia,serif}.og-invite-banner p:not(.og-invite-eyebrow){margin:8px 0 0;color:#a5aaa1;font-size:12px;line-height:1.7}.og-invite-accept,.og-share-friend{min-height:43px;padding:11px 15px;border:1px solid #d3ff69;background:#d3ff69;color:#10140b;font:650 11px system-ui,sans-serif;cursor:pointer}.og-invite-banner button:focus-visible,.og-growth button:focus-visible,.og-growth a:focus-visible{outline:2px solid #f2f0e8;outline-offset:4px}.og-growth{display:grid;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid #ffffff1c}.og-growth-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.og-growth-label{color:#d3ff69;font:9px ui-monospace,monospace;letter-spacing:.1em}.og-growth-copy{margin:0;color:#a5aaa1;font-size:12px;line-height:1.6}.og-growth-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.og-create-game{display:inline-flex;align-items:center;min-height:40px;padding:9px 12px;border:1px solid #ffffff30;color:#f2f0e8;text-decoration:none;font-size:11px}.og-growth-status{margin:0;color:#d3ff69;font-size:11px;overflow-wrap:anywhere}.og-growth-status a{color:#d3ff69}@media(max-width:600px){.og-invite-banner{grid-template-columns:1fr;padding:16px}.og-invite-accept{width:100%}.og-growth-actions>*{width:100%;justify-content:center}}@media(prefers-reduced-motion:reduce){.og-invite-banner,.og-growth{scroll-behavior:auto;animation:none;transition:none}}';
 document.head.append(style);
}
function installInviteBanner(){
 const invite=incomingInvite(),catalog=document.querySelector('#catalog');
 if(!invite||!catalog||catalog.querySelector('.og-invite-banner'))return;
 ensureStyles();
 const banner=make('aside','og-invite-banner');
 banner.setAttribute('aria-labelledby','og-invite-title');
 const copy=make('div');
 copy.append(make('p','og-invite-eyebrow','OSGARD PLAY / ЛИЧНОЕ ПРИГЛАШЕНИЕ'));
 copy.append(make('h3','', 'Тебя пригласили в '+games[invite.game].title));
 copy.append(make('p','','Открой игру и попробуй её сам. Приглашение не требует регистрации.'));
 const button=make('button','og-invite-accept','Принять приглашение ↗');
 button.type='button';button.id='osgard-accept-invite';
 banner.append(copy,button);
 const title=copy.querySelector('h3');if(title)title.id='og-invite-title';
 const heading=catalog.querySelector('.title');
 if(heading)heading.insertAdjacentElement('afterend',banner);else catalog.prepend(banner);
 button.addEventListener('click',()=>{
  void recordInviteOpen(invite);
  const link=document.querySelector('#games-grid .card[data-game="'+invite.game+'"] a[data-play]');
  if(link){link.click();return}
  const card=document.querySelector('#games-grid .card[data-game="'+invite.game+'"]');
  card?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
 });
}
function buildShareUrl(gameId,code){
 const url=new URL('/games/',location.origin);
 url.searchParams.set('challenge',gameId);
 url.searchParams.set('ref',code);
 url.searchParams.set('utm_source','osgard_games');
 url.searchParams.set('utm_medium','referral');
 url.searchParams.set('utm_campaign','play_with_a_friend');
 url.searchParams.set('utm_content',gameId);
 return url.href;
}
function addPostSessionActions(gameId){
 const game=games[gameId];
 if(!game)return;
 root.querySelector('.og-growth')?.remove();
 ensureStyles();
 const section=make('section','og-growth');
 section.setAttribute('aria-label','Приглашение друга и создание собственной игры');
 const top=make('div','og-growth-top');
 top.append(make('span','og-growth-label','PLAY TOGETHER / PASS IT ON'));
 top.append(make('p','og-growth-copy','Понравилась игра? Передай другу ссылку на тот же игровой мир.'));
 const actions=make('div','og-growth-actions');
 const inviteButton=make('button','og-share-friend','Пригласить друга ↗');inviteButton.type='button';
 const createLink=make('a','og-create-game','Создать свою игру с OSGARD ↗');
 createLink.href='https://osgardbewworld.com/?utm_source=osgard_games&utm_medium=cross_promo&utm_campaign=after_game&utm_content='+encodeURIComponent(gameId);
 createLink.target='_blank';createLink.rel='noopener noreferrer';
 const status=make('p','og-growth-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const fallback=make('a','og-create-game','Отправить в WhatsApp ↗');fallback.hidden=true;fallback.target='_blank';fallback.rel='noopener noreferrer';
 actions.append(inviteButton,createLink,fallback);
 section.append(top,actions,status);
 root.append(section);
 inviteButton.addEventListener('click',async()=>{
  inviteButton.disabled=true;status.textContent='Готовим персональную ссылку…';
  const code=token(),url=buildShareUrl(gameId,code),message='Пойдём сыграем в '+game.title+' в OSGARD PLAY: '+url;
  let shared=false;
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:'OSGARD PLAY · '+game.title,text:'Пойдём сыграем вместе.',url});shared=true}
   else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);shared=true}
   else {fallback.href='https://wa.me/?text='+encodeURIComponent(message);fallback.hidden=false;status.textContent='Открой WhatsApp, чтобы отправить ссылку другу.'}
   if(shared){
    status.textContent=navigator.share?'Ссылка передана в системное меню отправки.':'Текст приглашения скопирован.';
    void sendEvent('share_created',gameId,'game-invite:'+gameId+':'+code);
   }
  }catch(error){
   if(!(error instanceof Error&&error.name==='AbortError')){status.textContent='Не удалось открыть отправку. Можно скопировать ссылку из адресной строки: '+url;fallback.href='https://wa.me/?text='+encodeURIComponent(message);fallback.hidden=false}
  }finally{inviteButton.disabled=false}
 });
}
document.addEventListener('osgard:game-completed',event=>{const id=event.detail&&event.detail.game;addPostSessionActions(id)});
document.addEventListener('change',event=>{
 const target=event.target;
 if(target&&target.id==='analytics-toggle')setTimeout(()=>{if(consented())captureInvite();else{try{sessionStorage.removeItem(ATTR_KEY)}catch{}}},0);
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&consented())captureInvite()});
captureInvite();
installInviteBanner();
})();
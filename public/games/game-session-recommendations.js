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
function track(name,id,source){
 let consent=false;
 try{consent=localStorage.getItem('osgard.games.analytics-consent.v1')==='yes'}catch{}
 if(!consent)return;
 const token=globalThis.crypto?.randomUUID?.()||(Date.now().toString(36)+Math.random().toString(36).slice(2,15));
 const sessionId=('invite_'+token).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,96);
 fetch('/commerce-api/v1/events',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,events:[{name,sessionId,gameId:id,source,path:location.pathname,durationSeconds:0}]})}).catch(()=>{});
}
function challengeUrl(id){
 const url=new URL('/games/',location.origin);
 url.searchParams.set('osgard_challenge',id);
 url.searchParams.set('utm_source','osgard_play');
 url.searchParams.set('utm_medium','viral_challenge');
 url.searchParams.set('utm_campaign','post_run');
 url.searchParams.set('utm_content',id);
 return url.href;
}
function clear(){host.replaceChildren();host.hidden=true;dialog.classList.remove('has-recommendations')}
function render(id){
 if(!games[id]||!Array.isArray(next[id]))return;
 host.replaceChildren();
 host.append(make('p','post-run-heading','Сессия завершена · следующий маршрут'));
 host.append(make('p','post-run-copy','Продолжай игровую историю OSGARD — выбери следующий мир.'));
 const list=make('div','post-run-grid');
 next[id].forEach(nextId=>{const game=games[nextId];if(!game)return;const link=make('a','post-run-link');link.href=game.href;link.dataset.play=nextId;link.append(make('strong','',game.title),make('span','',game.subtitle),make('em','','Открыть ↗'));list.append(link)});
 host.append(list);
 const share=make('button','post-run-share','Передать вызов другу ↗');
 share.type='button';
 share.setAttribute('aria-label','Создать и отправить другу ссылку на вызов в '+games[id].title);
 const feedback=make('p','post-run-share-status','Приглашение ведёт в OSGARD PLAY и открывает ту же игру.');
 feedback.setAttribute('role','status');
 feedback.setAttribute('aria-live','polite');
 share.addEventListener('click',async()=>{
  const url=challengeUrl(id);
  try{
   if(navigator.share){
    await navigator.share({title:games[id].title+' — OSGARD PLAY',text:'Бросаю тебе вызов: попробуй пройти '+games[id].title+' в OSGARD WORLD.',url});
    feedback.textContent='Меню отправки закрыто. Если ты отправил ссылку, друг сможет принять вызов.';
    track('game_invite_link_created',id,'post_run_challenge_share');
    return;
   }
   if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(url);
    feedback.textContent='Ссылка скопирована. Отправь её другу, чтобы передать вызов.';
    track('game_invite_link_created',id,'post_run_challenge_copy');
    return;
   }
   feedback.textContent='Ссылка вызова: '+url;
  }catch(error){
   if(error?.name!=='AbortError')feedback.textContent='Не удалось открыть отправку. Ссылка вызова: '+url;
  }
 });
 host.append(share,feedback);
 host.hidden=false;
 dialog.classList.add('has-recommendations');
}
document.addEventListener('osgard:game-launching',clear);
document.addEventListener('osgard:game-completed',event=>render(event.detail&&event.detail.game));
})();
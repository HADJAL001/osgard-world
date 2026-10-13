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
 host.append(list);
 const actions=make('div','post-run-actions');
 const invite=make('button','post-run-share','Пригласить друга на следующий раунд ↗');
 invite.type='button';invite.dataset.invite=id;invite.setAttribute('aria-label','Пригласить друга сыграть в '+games[id].title);
 const support=make('a','post-run-support','Поддержать разработку OSGARD ↗');support.href='/games/premium/';
 actions.append(invite,support);host.append(actions);
 const inviteStatus=make('p','post-run-share-status','');inviteStatus.setAttribute('role','status');inviteStatus.setAttribute('aria-live','polite');host.append(inviteStatus);
 host.hidden=false;dialog.classList.add('has-recommendations');
}
host.addEventListener('click',async event=>{
 const button=event.target instanceof Element?event.target.closest('button[data-invite]'):null;
 if(!button)return;
 const id=button.dataset.invite,helper=window.OSGARDReferral,status=host.querySelector('.post-run-share-status');
 if(!helper||!games[id]){if(status)status.textContent='Приглашение временно недоступно. Попробуй обновить страницу.';return}
 button.disabled=true;
 try{
  const result=await helper.share(id,'post-run');
  if(!status)return;
  if(result.status==='copied')status.textContent='Ссылка-приглашение скопирована. Она сразу откроет игру.';
  else if(result.status==='shared')status.textContent='Ссылка передана выбранному приложению. Доставка зависит от него.';
  else if(result.status==='manual'){status.textContent='Скопируй приглашение вручную: '+result.url;try{window.prompt('Ссылка-приглашение OSGARD PLAY',result.url)}catch{}}
 }catch{if(status)status.textContent='Не удалось подготовить ссылку. Попробуй ещё раз.'}
 finally{button.disabled=false}
});
document.addEventListener('osgard:game-launching',clear);
document.addEventListener('osgard:game-completed',event=>render(event.detail&&event.detail.game));
})();
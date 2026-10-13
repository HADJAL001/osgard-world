(() => {
'use strict';
const games={
 'null-shift':{title:'NULL//SHIFT',subtitle:'Тактический рейд',href:'/games/null-shift-godot/'},
 time:{title:'Империя времени',subtitle:'Стратегия и управление городом',href:'/games/time'},
 swarm:{title:'SWARM',subtitle:'Командная симуляция',href:'/games/swarm/'},
 inherit:{title:'INHERIT',subtitle:'Живой мир и наследие',href:'/games/inherit/'},
 remix:{title:'REMIX',subtitle:'Арена испытаний',href:'/games/remix/'},
 'civic-cascade':{title:'CIVIC CASCADE',subtitle:'Кризисная стратегия',href:'/games/civic-cascade/'},
 patina:{title:'PATINA Atelier',subtitle:'Реставрационная головоломка',href:'/games/patina/'},
 'signal-run':{title:'SIGNAL RUN',subtitle:'Ритм и реакция',href:'/games/signal-run/'}
};
const next={
 'null-shift':['swarm','signal-run'],
 time:['civic-cascade','inherit'],
 swarm:['null-shift','remix'],
 inherit:['patina','time'],
 remix:['swarm','signal-run'],
 'civic-cascade':['time','swarm'],
 patina:['inherit','civic-cascade'],
 'signal-run':['remix','null-shift']
};
const host=document.querySelector('#post-run-recommendations');
const dialog=document.querySelector('#player-dialog');
if(!host||!dialog)return;
const make=(tag,cls,value)=>{const item=document.createElement(tag);if(cls)item.className=cls;if(value!==undefined)item.textContent=value;return item};
function clearRecommendations(){host.replaceChildren();host.hidden=true;dialog.classList.remove('has-recommendations')}
function renderRecommendations(id){
 if(!games[id]||!Array.isArray(next[id]))return;
 host.replaceChildren();
 host.append(make('p','post-run-heading','Сессия завершена · следующий маршрут'));
 host.append(make('p','post-run-copy','Продолжи исследовать игровые миры OSGARD — без искусственных рейтингов и фиктивной популярности.'));
 const list=make('div','post-run-grid');
 next[id].forEach(nextId=>{const game=games[nextId];if(!game)return;const link=make('a','post-run-link');link.href=game.href;link.dataset.play=nextId;link.append(make('strong','',game.title),make('span','',game.subtitle),make('em','','Открыть ↗'));list.append(link)});
 host.append(list);host.hidden=false;dialog.classList.add('has-recommendations');
}
document.addEventListener('osgard:game-launching',clearRecommendations);
document.addEventListener('osgard:game-completed',event=>renderRecommendations(event.detail&&event.detail.game));
})();
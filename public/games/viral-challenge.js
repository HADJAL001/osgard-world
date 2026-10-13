(() => {
'use strict';
const games={
 'null-shift':{title:'NULL//SHIFT',href:'/games/null-shift-godot/'},
 time:{title:'Империя времени',href:'/games/time'},
 swarm:{title:'SWARM',href:'/games/swarm/'},
 inherit:{title:'INHERIT',href:'/games/inherit/'},
 remix:{title:'REMIX',href:'/games/remix/'},
 'signal-run':{title:'SIGNAL RUN',href:'/games/signal-run/'},
 'civic-cascade':{title:'CIVIC CASCADE',href:'/games/civic-cascade/'},
 patina:{title:'PATINA Atelier',href:'/games/patina/'},
 'cascade-lab':{title:'CASCADE LAB',href:'/games/cascade-lab/'}
};
const host=document.querySelector('#viral-challenge');
if(!host)return;
const landing=new URL(location.href);
const id=landing.searchParams.get('osgard_challenge');
if(!Object.prototype.hasOwnProperty.call(games,id))return;
const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node};
function track(name,gameId,source){
 let consent=false;
 try{consent=localStorage.getItem('osgard.games.analytics-consent.v1')==='yes'}catch{}
 if(!consent)return;
 const token=globalThis.crypto?.randomUUID?.()||(Date.now().toString(36)+Math.random().toString(36).slice(2,15));
 const sessionId=('invite_'+token).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,96);
 fetch('/commerce-api/v1/events',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,events:[{name,sessionId,gameId,source,path:location.pathname,durationSeconds:0}]})}).catch(()=>{});
}
const heading=make('p','viral-challenge-eyebrow','OSGARD PLAY / FRIEND CHALLENGE');
const title=make('h2','viral-challenge-title','Тебя вызывают: '+games[id].title);
const message=make('p','viral-challenge-copy','Прими вызов, сыграй в тот же мир и после завершения передай его дальше.');
const accept=make('a','viral-challenge-accept','Принять вызов · Играть ↗');
accept.href=games[id].href;
accept.dataset.play=id;
accept.setAttribute('aria-label','Принять игровой вызов: '+games[id].title);
accept.addEventListener('click',()=>track('game_invite_accepted',id,'viral_challenge_landing'));
const foot=make('small','viral-challenge-foot','Без фальшивых призов и обязательной регистрации. Игра запускается на OSGARD WORLD.');
host.replaceChildren(heading,title,message,accept,foot);
host.hidden=false;
let seen=false;
try{const key='osgard.viral.invite-seen.v1.'+id;seen=sessionStorage.getItem(key)==='yes';if(!seen)sessionStorage.setItem(key,'yes')}catch{}
if(!seen)track('game_invite_opened',id,'viral_challenge_landing');
})();
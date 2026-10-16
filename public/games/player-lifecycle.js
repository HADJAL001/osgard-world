(()=>{
'use strict';
const $=s=>document.querySelector(s),dialog=$('#player-dialog'),frame=$('#player-frame'),status=$('#player-status'),title=$('#player-title'),direct=$('#player-direct-link');
if(!dialog||!frame||!status)return;
const games={
 'null-shift':{title:'NULL//SHIFT',url:'/games/null-shift-godot/'},
 time:{title:'Империя времени',url:'/games/time'},
 swarm:{title:'SWARM',url:'/games/swarm/'},
 inherit:{title:'INHERIT',url:'/games/inherit/'},
 remix:{title:'REMIX',url:'/games/remix/'},
 'civic-cascade':{title:'CIVIC CASCADE',url:'/games/civic-cascade/'},
 patina:{title:'PATINA Atelier',url:'/games/patina/'},
 'signal-run':{title:'SIGNAL RUN',url:'/games/signal-run/'},
 'cascade-lab':{title:'CASCADE LAB',url:'/games/cascade-lab/'},
 'afterimage-run':{title:'AFTERIMAGE//RUN',url:'/games/afterimage-run/'},
 'aether-grid':{title:'AETHER GRID',url:'/games/aether-grid/'},
 'heist-echo':{title:'HEIST//ECHO',url:'/games/heist-echo/'}
};
const clock=document.createElement('span');clock.id='player-session-clock';clock.className='session-clock';clock.hidden=true;clock.textContent='СЕССИЯ 00:00';status.insertAdjacentElement('afterend',clock);
const tools=dialog.querySelector('.player-tools');
const retry=document.createElement('button');retry.id='player-retry';retry.type='button';retry.setAttribute('aria-label','Повторить запуск');retry.title='Повторить запуск';retry.textContent='↻';retry.hidden=true;tools?.insertBefore(retry,tools.querySelector('#player-close'));
const style=document.createElement('style');style.textContent='#player-status[data-state=error]{color:#ff9c91!important}#player-status[data-state=ready]{color:#c9ff87!important}.session-clock{display:inline-block;margin-top:7px;color:#d3ff69;font:9px ui-monospace,monospace;letter-spacing:.1em}#player-retry{width:35px;min-height:35px;padding:0;border:1px solid #ffffff20;background:#0e1210;color:#d3ff69;font-size:19px;cursor:pointer}#player-retry[hidden]{display:none}@media(max-width:760px){dialog#player-dialog{width:100vw;max-width:100vw;max-height:100svh;height:100svh;border:0;border-radius:0}}';document.head.append(style);
let activeGame='',activeUrl='',sequence=0,activeSessionId='',attempt=0,launchAt=0,clientReadyAt=0,clientLoaded=false,activeSessionSeen=false,sessionStartedAt=0,sessionElapsed=0,lastTick=0,gamePaused=false,engineBootAt=0,sessionMethod='',loadTimer=0,pollTimer=0,clockTimer=0,commerceSessionId='';
function setStatus(message,state='loading'){status.textContent=message;status.dataset.state=state}
function analyticsSource(){try{const url=new URL(activeUrl||location.href,location.origin),code=url.searchParams.get('ref')||'';if(activeGame==='null-shift'&&/^og_[a-f0-9]{8}$/.test(code)&&/^NS-[0-9]{8}-C[1-3]$/.test(url.searchParams.get('challenge')||'')&&(url.pathname==='/games/null-shift-godot/'||url.pathname==='/games/null-shift-godot/index.html')&&url.searchParams.get('utm_source')==='osgard_play'&&url.searchParams.get('utm_medium')==='referral'&&url.searchParams.get('utm_campaign')==='play_with_friends')return 'referral:'+code+':null-shift';if(activeGame==='signal-run'&&url.pathname==='/games/signal-run/'&&/^[a-f0-9]{12}$/.test(code)&&url.searchParams.get('utm_source')==='signal-run'&&url.searchParams.get('utm_medium')==='share'&&url.searchParams.get('utm_campaign')==='challenge')return 'referral:'+code+':signal-run'}catch{}try{const raw=sessionStorage.getItem('osgard.games.referral-attribution.v1');if(raw){const value=JSON.parse(raw);const now=Date.now();if(value&&/^(?:og_[a-f0-9]{8}|[a-f0-9]{12})$/.test(String(value.code||''))&&now>=Number(value.at)&&now-Number(value.at)<=86400000)return 'referral:'+value.code+':'+activeGame}}catch{}return 'games-catalog-player'}
function shareReferralCode(payload){const supplied=String(payload?.referralCode||'');if(/^(?:og_[a-f0-9]{8}|[a-f0-9]{12})$/.test(supplied))return supplied;try{const url=new URL(activeUrl||location.href,location.origin),candidate=url.searchParams.get('og_ref')||url.searchParams.get('ref')||'';if(/^(?:og_[a-f0-9]{8}|[a-f0-9]{12})$/.test(candidate))return candidate}catch{}try{const raw=sessionStorage.getItem('osgard.games.referral-attribution.v1');if(raw){const value=JSON.parse(raw),candidate=String(value?.code||''),now=Date.now();if(value&&/^(?:og_[a-f0-9]{8}|[a-f0-9]{12})$/.test(candidate)&&now>=Number(value.at)&&now-Number(value.at)<=86400000)return candidate}}catch{}try{const candidate=localStorage.getItem('osgard.games.invite-code.v1')||'';if(/^og_[a-f0-9]{8}$/.test(candidate))return candidate}catch{}return ''}
function sendCommerceEvent(name,payload){
 if(!activeGame||!['game_session_started','game_session_completed','share_created'].includes(name))return;
 let consent=false;
 try{consent=localStorage.getItem('osgard.games.analytics-consent.v1')==='yes'}catch{}
 if(!consent)return;
 if(name==='game_session_started'||!commerceSessionId)commerceSessionId='session_'+(window.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2,15)).replace(/[^a-zA-Z0-9_-]/g,'');
 const id=commerceSessionId;
 if(name==='game_session_completed')commerceSessionId='';
 const duration=Math.max(0,Math.floor(Number(payload?.durationSeconds||0)));
 const shareCode=name==='share_created'?shareReferralCode(payload):'';
 const flowType=['daily-challenge','score-duel','solution-link','result-card','friend-invite'].includes(payload?.flowType)?payload.flowType:'generic';const source=name==='share_created'?(shareCode?'game-invite:'+activeGame+':'+shareCode:'game-share:'+activeGame+':'+flowType):analyticsSource();
 let path=location.pathname;
 try{path=new URL(activeUrl||location.href,location.origin).pathname}catch{}
 const event={eventId:'evt_'+(window.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,15)).replace(/[^a-zA-Z0-9_-]/g,''),name,sessionId:id,gameId:activeGame,source,path,durationSeconds:duration};
 const queue=window.OSGARD_CONSENTED_ANALYTICS;
 if(queue&&typeof queue.enqueue==='function'){void queue.enqueue(event);return}
 fetch('/games/commerce-config.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({})).then(async config=>{
  const raw=typeof config.apiBaseUrl==='string'?config.apiBaseUrl.trim():'';
  let base='';
  if(!raw){
   const healthResponse=await fetch('/commerce-api/healthz',{cache:'no-store',credentials:'omit'});
   const health=healthResponse.ok?await healthResponse.json().catch(()=>({})):{};
   if(!healthResponse.ok||health.service!=='osgard-commerce-api'||health.databaseReady!==true)return null;
   base=location.origin+'/commerce-api';
  }else{
   let parsed;
   try{parsed=new URL(raw,location.origin)}catch{return null}
   const localApi=['localhost','127.0.0.1'].includes(parsed.hostname);
   const allowedPath=parsed.pathname==='/'||(parsed.pathname==='/commerce-api'&&(parsed.origin===location.origin||parsed.origin==='https://osgard.world'));
   if((parsed.protocol!=='https:'&&!(localApi&&parsed.protocol==='http:'))||parsed.username||parsed.password||!allowedPath||parsed.search||parsed.hash)return null;
   base=parsed.origin+(parsed.pathname==='/'?'':parsed.pathname);
  }
  return fetch(base+'/v1/events',{method:'POST',keepalive:true,credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,events:[event]})});
 }).catch(()=>{})
}
function allowedEvent(name,payload){sendCommerceEvent(name,payload);if(!activeGame||activeGame==='time')return;let consent=false,token='';try{consent=localStorage.getItem('osgard.games.analytics-consent.v1')==='yes';token=localStorage.getItem('osgard.auth.accessToken')||''}catch{}if(!consent||!token)return;const event={id:window.crypto?.randomUUID?.()||name+'-'+Date.now()+'-'+Math.random().toString(36).slice(2),name,world:'play',game:activeGame,payload:Object.assign({source:'games_catalog',catalogVersion:2},payload||{}),occurredAt:new Date().toISOString(),schemaVersion:1};fetch('/api/v1/player/events',{method:'POST',credentials:'same-origin',keepalive:true,headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({event})}).catch(()=>{})}
function stopTimers(){if(loadTimer){clearTimeout(loadTimer);loadTimer=0}if(pollTimer){clearInterval(pollTimer);pollTimer=0}}
function elapsedText(ms){const n=Math.max(0,Math.floor(ms/1000));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function tickClock(){const now=performance.now();if(!document.hidden&&!gamePaused)sessionElapsed+=Math.max(0,now-lastTick);lastTick=now;clock.textContent='СЕССИЯ '+elapsedText(sessionElapsed)}
function endSession(reason){const endedGame=activeGame,endReason=reason||'closed_by_user';let seconds=Math.max(0,Math.floor(sessionElapsed/1000));if(sessionStartedAt){if(!document.hidden&&!gamePaused)sessionElapsed+=Math.max(0,performance.now()-lastTick);seconds=Math.floor(sessionElapsed/1000);allowedEvent('game_session_completed',{durationSeconds:seconds,endReason,launchDurationMs:Math.max(0,sessionStartedAt-launchAt),launchAttempt:attempt,startMethod:sessionMethod})}if(endReason==='closed_by_user'&&endedGame)document.dispatchEvent(new CustomEvent('osgard:game-session-ended',{detail:{game:endedGame,sessionId:activeSessionId,durationSeconds:seconds,reason:endReason,sessionStarted:!!sessionStartedAt}}));sessionStartedAt=0;sessionMethod='';sessionElapsed=0;gamePaused=false;clock.hidden=true;if(clockTimer){clearInterval(clockTimer);clockTimer=0}clock.textContent='СЕССИЯ 00:00'}
function setPostgameCloseButton(){const button=$('#player-close');if(button){button.textContent='←';button.setAttribute('aria-label','Вернуться в каталог');button.title='Вернуться в каталог'}}
function resetPostgameCloseButton(){const button=$('#player-close');if(button){button.textContent='×';button.setAttribute('aria-label','Закрыть игру');button.title='Закрыть игру'}}
function openBetweenWorlds(reason='returned_to_catalog'){
 if(!dialog.open||!activeGame||!activeSessionSeen)return false;
 const endedGame=activeGame;
 if(sessionStartedAt)endSession(reason);
 stopTimers();
 sequence++;
 frame.src='about:blank';
 dialog.dataset.postgameReady='1';
 dialog.dataset.postgameIntermission='1';
 setPostgameCloseButton();
 setStatus('Сессия завершена · выбери следующий мир или продукт OSGARD ниже.','ready');
 document.dispatchEvent(new CustomEvent('osgard:game-session-ended',{detail:{game:endedGame,sessionId:activeSessionId,reason,sessionStarted:true}}));
 const recommendations=$('#post-run-recommendations');
 if(recommendations&&typeof recommendations.scrollIntoView==='function'){
  const reduceMotion=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  recommendations.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'nearest'});
 }
 return true;
}
window.addEventListener('osgard:request-postgame',()=>{openBetweenWorlds('returned_to_catalog')});
dialog.addEventListener('cancel',event=>{if(dialog.dataset.postgameReady==='1')return;if(openBetweenWorlds('escape_to_catalog'))event.preventDefault()});
function startSession(method){if(sessionStartedAt||!activeGame)return;activeSessionSeen=true;gamePaused=false;if(!clientLoaded){clientLoaded=true;clientReadyAt=Date.now()}sessionStartedAt=Date.now();sessionElapsed=0;lastTick=performance.now();sessionMethod=method;clock.hidden=false;tickClock();if(clockTimer)clearInterval(clockTimer);clockTimer=setInterval(tickClock,1000);allowedEvent('game_session_started',{launchDurationMs:Math.max(0,sessionStartedAt-launchAt),clientReadyMs:Math.max(0,clientReadyAt-launchAt),launchAttempt:attempt,startMethod:method});document.dispatchEvent(new CustomEvent('osgard:game-session-started',{detail:{game:activeGame,sessionId:activeSessionId,method,startedAt:sessionStartedAt}}));setStatus('Сессия активна · клиент готов за '+((clientReadyAt-launchAt)/1000).toFixed(1)+' с','ready')}
function fail(message){endSession('launch_error');stopTimers();setStatus(message,'error');retry.hidden=false}
function readyForGame(doc,id){if(!doc||!doc.body)return false;if(id==='civic-cascade')return !!doc.querySelector('#cc-game-root')&&!!doc.querySelector('#cc-status');if(id==='patina')return doc.body.dataset.patinaReady==='true'&&!!doc.querySelector('#patina-workbench');if(id==='cascade-lab')return doc.body.dataset.cascadeLabReady==='true';if(id==='afterimage-run')return !!doc.querySelector('#runnerCanvas')&&!!doc.querySelector('#run-start')&&!!doc.querySelector('#daily-seed');if(id==='aether-grid')return !!doc.querySelector('#board')&&!!doc.querySelector('#challenge-code');if(id==='heist-echo')return !!doc.querySelector('#launch')&&!!doc.querySelector('#status');if(id==='signal-run')return !!doc.querySelector('#arena')&&!!doc.querySelector('#start');if(id==='time')return !!doc.querySelector('#root')&&!!doc.querySelector('#tgGuideTitle')&&doc.body.textContent.trim().length>80;if(id==='swarm')return !!doc.querySelector('#game')&&!!doc.querySelector('#start')&&!!doc.querySelector('#objective-status');if(id==='inherit')return !!doc.querySelector('#world')&&!!doc.querySelector('#pass');if(id==='remix')return !!doc.querySelector('#arena')&&!!doc.querySelector('#start-match')&&!!doc.querySelector('#match-status');return id==='null-shift'&&!!doc.querySelector('#game')&&!!doc.querySelector('#diag-panel')}
function markClientReady(){if(clientLoaded)return;clientLoaded=true;clientReadyAt=Date.now();if(loadTimer){clearTimeout(loadTimer);loadTimer=0}}
function bindFirstInteraction(doc,seq){if(doc.__osgardLifecycleBound===seq)return;doc.__osgardLifecycleBound=seq;const handler=()=>{if(seq!==sequence||!dialog.open||!clientLoaded)return;if(activeGame!=='inherit')return;startSession('first-game-interaction');doc.removeEventListener('pointerdown',handler,true);doc.removeEventListener('keydown',handler,true)};doc.addEventListener('pointerdown',handler,true);doc.addEventListener('keydown',handler,true)}
function probe(seq){if(seq!==sequence||!dialog.open)return;let doc;try{doc=frame.contentDocument}catch{return}if(!doc||!doc.documentElement)return;
 const isGodot=activeGame==='null-shift'&&(doc.documentElement.dataset.nullshiftShell==='premium-v1'||!!doc.querySelector('#status-label'));
 if(isGodot){markClientReady();const line=doc.querySelector('#status-label'),led=doc.querySelector('#status-led'),text=line?.textContent?.trim()||'',state=led?.dataset.state||'ready';if(state==='error'||text.includes('ЗАПУСК НЕ ЗАВЕРШЁН')||text.includes('WEBGL 2 НЕ ДОСТУПЕН')){fail(text||'Godot не поддерживает 3D на этом устройстве. Открой игру отдельно или попробуй WebGL-версию.');return}if(text.includes('СИСТЕМА АКТИВНА')){engineBootAt=0;startSession('godot-engine-ready');return}if(state==='loading'||text.includes('ЗАГРУЗКА')||text.includes('ИНИЦИАЛИЗАЦИЯ')){if(!engineBootAt)engineBootAt=Date.now();setStatus('Godot загружает WebAssembly и игровую сцену…','loading');if(Date.now()-engineBootAt>60000)fail('Godot не завершил запуск за 60 секунд. Повтори запуск или открой облегчённую версию.');return}if(text.includes('ОЖИДАНИЯ КОМАНДЫ')||text.includes('ДВИЖОК ГОТОВ')){engineBootAt=0;setStatus('Движок готов. Нажми «НАЧАТЬ ОПЕРАЦИЮ» внутри игрового окна.','ready');return}setStatus('Проверяем готовность Godot…','loading');return}
 if(!clientLoaded&&readyForGame(doc,activeGame)){markClientReady();setStatus('Игровой интерфейс готов за '+((clientReadyAt-launchAt)/1000).toFixed(1)+' с. Начни игру внутри окна.','ready');if(activeGame==='inherit')bindFirstInteraction(doc,seq)}
}
function isValidDailyDate(day){if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;const date=new Date(day+'T00:00:00.000Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day}
function dailyNullShiftCode(day){if(!isValidDailyDate(day))return '';const month=Number(day.slice(5,7)),date=Number(day.slice(8,10));return 'NS-'+day.replace(/-/g,'')+'-C'+(((month+date)%3)+1)}
function preserveDailyChallengeUrl(id,url){try{const target=new URL(url,location.origin);if(target.origin!==location.origin)return url;const query=new URLSearchParams(location.search),day=query.get('day')||'';if(!isValidDailyDate(day))return url;if(id==='aether-grid')target.searchParams.set('day',day);else if(id==='signal-run'&&query.get('mode')==='daily'){target.searchParams.set('mode','daily');target.searchParams.set('day',day)}else if(id==='null-shift'&&query.get('challenge')===dailyNullShiftCode(day))target.searchParams.set('challenge',query.get('challenge'));return target.href}catch{return url}}
function dailyChallengeContext(id,url){try{const target=new URL(url||location.href,location.origin);if(target.origin!==location.origin)return{};const path=target.pathname,params=target.searchParams;if(id==='aether-grid'&&path==='/games/aether-grid/'&&isValidDailyDate(params.get('day')||''))return{dailyDate:params.get('day'),dailyChallenge:id};if(id==='signal-run'&&path==='/games/signal-run/'&&params.get('mode')==='daily'&&isValidDailyDate(params.get('day')||''))return{dailyDate:params.get('day'),dailyChallenge:id};if(id==='null-shift'&&path==='/games/null-shift-godot/'){const code=params.get('challenge')||'',match=/^NS-(\d{4})(\d{2})(\d{2})-C[1-3]$/.exec(code);if(match){const day=match[1]+'-'+match[2]+'-'+match[3];if(isValidDailyDate(day)&&dailyNullShiftCode(day)===code)return{dailyDate:day,dailyChallenge:id}}}}catch{}return{}}
function launch(id,url,retryMode=false){if(!games[id])return;url=preserveDailyChallengeUrl(id,url);document.dispatchEvent(new Event('osgard:game-launching'));if(retryMode){endSession('retry');attempt++}else{if(activeGame)endSession('replaced');attempt=1}stopTimers();sequence++;const seq=sequence;activeGame=id;activeUrl=url;delete dialog.dataset.postgameReady;delete dialog.dataset.postgameIntermission;resetPostgameCloseButton();activeSessionSeen=false;gamePaused=false;launchAt=Date.now();activeSessionId='session_'+id+'_'+sequence+'_'+launchAt;clientReadyAt=0;clientLoaded=false;engineBootAt=0;sessionStartedAt=0;sessionElapsed=0;clock.hidden=true;retry.hidden=true;setStatus(retryMode?'Повторяем запуск игры…':'Загружаем игровой клиент…','loading');title.textContent=games[id].title;if(direct)direct.href=url;dialog.dataset.game=id;
 if(!dialog.open)dialog.showModal();loadTimer=setTimeout(()=>{if(seq===sequence&&!clientLoaded)fail('Не удалось подтвердить готовность игры за 35 секунд. Повтори запуск или открой её отдельно.')},35000);pollTimer=setInterval(()=>probe(seq),400);
 const setFrame=()=>{if(seq!==sequence)return;frame.src=url};if(retryMode){frame.src='about:blank';setTimeout(setFrame,80)}else setFrame()}
document.addEventListener('click',event=>{const link=event.target.closest('a[data-play]');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const id=link.dataset.play;if(!games[id])return;event.preventDefault();event.stopPropagation();launch(id,link.href,false)},true);
frame.addEventListener('load',()=>{const seq=sequence;if(!activeGame||!dialog.open)return;setTimeout(()=>probe(seq),0)});
retry.addEventListener('click',()=>{if(activeGame&&activeUrl)launch(activeGame,activeUrl,true)});
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow)return;const m=event.data;if(!m||m.type!=='osgard:game-lifecycle'||m.game!==activeGame||!['ready','started','paused','resumed','share_created','error','level_completed','completed'].includes(m.state))return;if(Number.isFinite(m.at)&&m.at<launchAt-1000)return;if(m.state==='share_created'){const challengeScore=Number(m.challengeScore);const payload={source:activeGame+'-share',shareMethod:m.shareMethod==='web-share'?'web-share':'clipboard'};if(['daily-challenge','score-duel','solution-link','result-card','friend-invite'].includes(m.flowType))payload.flowType=m.flowType;if(typeof m.referralCode==='string'&&/^(?:og_[a-f0-9]{8}|[a-f0-9]{12})$/.test(m.referralCode))payload.referralCode=m.referralCode;if(Number.isFinite(challengeScore)&&challengeScore>0&&challengeScore<=1000000000)payload.challengeScore=Math.floor(challengeScore);allowedEvent('share_created',payload);return}if(m.state==='ready'){markClientReady();setStatus('Игровой интерфейс готов. Нажми «НАЧАТЬ» внутри окна.','ready');return}if(m.state==='started'){gamePaused=false;probe(sequence);startSession('game-engine-handshake');return}if(m.state==='paused'){gamePaused=true;lastTick=performance.now();setStatus('Игра на паузе','ready');return}if(m.state==='resumed'){gamePaused=false;lastTick=performance.now();setStatus('Игровая сессия продолжена','ready');return}if(m.state==='error'){fail(String(m.message||'Игровой движок сообщил об ошибке запуска.').slice(0,220));return}if(m.state==='level_completed'){setStatus('Уровень пройден · игровая сессия продолжается','ready');document.dispatchEvent(new CustomEvent('osgard:game-level-completed',{detail:{game:activeGame,sessionId:activeSessionId,levelId:String(m.levelId||'').slice(0,80),mode:String(m.mode||'').slice(0,24)}}));return}if(m.state==='completed'){gamePaused=false;endSession('game_completed');setStatus('Раунд завершён. Результат может оставаться на экране.','ready');document.dispatchEvent(new CustomEvent('osgard:game-completed',{detail:{game:activeGame,sessionId:activeSessionId,...dailyChallengeContext(activeGame,activeUrl)}}))}});
dialog.addEventListener('close',()=>{delete dialog.dataset.postgameReady;delete dialog.dataset.postgameIntermission;resetPostgameCloseButton();sequence++;stopTimers();endSession('closed_by_user');activeSessionSeen=false;activeGame='';activeUrl='';clientLoaded=false;frame.src='about:blank'});
window.addEventListener('pagehide',()=>{sequence++;stopTimers();endSession('pagehide')});
})();
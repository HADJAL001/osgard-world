const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const startButton = document.querySelector('#start');
const resetButton = document.querySelector('#reset');
const againButton = document.querySelector('#again');
const overlay = document.querySelector('#overlay');
const result = document.querySelector('#result');
const panel = document.querySelector('#role-panel');
const roleName = document.querySelector('#role-name');
const status = document.querySelector('#objective-status');
const roleCue = document.querySelector('#role-cue');
const timer = document.querySelector('#timer');
const stabilityLabel = document.querySelector('#stability');
const nameInput = document.querySelector('#player-name');
const roomInput = document.querySelector('#room-code');
const rolePreference = document.querySelector('#role-preference');
const hostRoomButton = document.querySelector('#host-room');
const joinRoomButton = document.querySelector('#join-room');
const copyInviteButton = document.querySelector('#copy-invite');
const copyChaosCardButton = document.querySelector('#copy-chaos-card');
const chaosCard = document.querySelector('#chaos-card');
const rematchVote = document.querySelector('#rematch-vote');
const networkStatus = document.querySelector('#network-status');
const feedbackForm = document.querySelector('#playtest-feedback');
const feedbackStatus = document.querySelector('#feedback-status');
let resultTeam = null;
let chaosShareText = '';
const missionTitle = document.querySelector('#mission-title');
const missionModifier = document.querySelector('#mission-modifier');
const missionEffect = document.querySelector('#mission-effect');
const recentRuns = document.querySelector('#recent-runs');
const recentRunCount = document.querySelector('#recent-run-count');

const roles = [
  ['LOCOMOTION','MOVE','1'], ['JUMP','JUMP','2'], ['LEFT ARM','GRAB','3'], ['RIGHT ARM','GRAB','4'],
  ['HEAD','SCAN','5'], ['CORE','STABILIZE','6'], ['TAIL','HOOK','7'], ['SPECIAL','OVERDRIVE','8']
];
const keys = {};
let activeRole = 0;
let game;
let roomSession = null;
let roomEvents = null;
let roomSocket = null;
let roomReconnectTimer = null;
let roomReconnectAttempt = 0;
let nextInputAt = 0;
let loadedMatchResult = null;
const sessionStorageKey = 'swarm-room-session';
const modifierBriefs = {
  standard:['STANDARD RUN','Baseline systems online. Complete every role gate to extract.'],
  low_gravity:['LOW GRAVITY','Longer air time. Time the jump through the shock grid.'],
  fragile_core:['FRAGILE CORE','Carrying drains stability faster. Move only when both arms are ready.'],
  overcharged:['OVERCHARGED','SPECIAL gains a longer overdrive burst. Save it for extraction.']
};
const missionBriefs = {
  lab_escape:['LAB ESCAPE','HEAD maps the route, then JUMP clears the shock grid.'],
  reactor_relay:['REACTOR RELAY','CORE must charge the relay, then JUMP clears the arc trench.'],
  convoy_rescue:['CONVOY RESCUE','SPECIAL uplinks the rescue beacon, then JUMP clears the debris field.']
};
const failureBriefs = {
  stability_depleted:'THE BODY LOST STABILITY. CORE AND TAIL NEEDED A CALMER RUN.',
  time_expired:'THE EXTRACTION WINDOW CLOSED. PUSH THE OBJECTIVE FORWARD EARLIER.'
};
function updateMissionBrief(modifier='standard', mission='lab_escape') {
  const [name,effect]=modifierBriefs[modifier] || modifierBriefs.standard;
  const [missionName,missionEffect]=missionBriefs[mission] || missionBriefs.lab_escape;
  missionTitle.textContent=`${missionName} // MISSION PATH`; missionModifier.textContent=name; missionEffect.textContent=`${missionEffect} ${effect}`;
}
function labelRole(role) { return String(role || '').replaceAll('_',' ').toUpperCase(); }
function updateRoleCue() {
  const directive=game?.directive;
  const assigned=roomSession?.player?.role;
  if(!directive?.role) { roleCue.textContent=game?.online ? 'ROUND COMPLETE — REVIEW THE TEAM RECAP' : 'OFFLINE TRAINING — SWITCH ROLES TO LEARN THE BODY'; return; }
  if(!game?.online) { roleCue.textContent=`NEXT: ${labelRole(directive.role)} — ${directive.instruction}`; return; }
  roleCue.textContent=assigned===directive.role ? `YOUR TURN · ${directive.instruction}` : `WAIT FOR ${labelRole(directive.role)} · ${directive.stage}`;
}

function persistRoomSession() {
  if(roomSession) sessionStorage.setItem(sessionStorageKey,JSON.stringify(roomSession));
}
function forgetRoomSession() {
  sessionStorage.removeItem(sessionStorageKey);
}
function inviteUrl() {
  const url=new URL(location.href);
  url.searchParams.set('room',roomSession.roomId);
  url.searchParams.set('ref','invite');
  return url.toString();
}
function inviteVisitorId() {
  const key='swarm-invite-visitor-id';
  try {
    let id=localStorage.getItem(key);
    if(!id) { id=crypto.randomUUID(); localStorage.setItem(key,id); }
    return id;
  } catch { return crypto.randomUUID(); }
}
let inviteOpenPromise=null;
function recordInviteOpen(roomId) {
  const visitorId=inviteVisitorId();
  inviteOpenPromise=fetch(`/rooms/${encodeURIComponent(roomId)}/invite-open`,{method:'POST',headers:{'content-type':'application/json'},keepalive:true,body:JSON.stringify({visitorId})}).catch(() => null);
  return inviteOpenPromise;
}
function reportEngagement(event) {
  if(!roomSession?.roomId || !roomSession?.player?.playerId) return;
  fetch(`/rooms/${encodeURIComponent(roomSession.roomId)}/analytics`,{method:'POST',headers:{'content-type':'application/json'},keepalive:true,body:JSON.stringify({playerId:roomSession.player.playerId,reconnectToken:roomSession.player.reconnectToken,event})}).catch(() => {});
}
async function copyInvite() {
  if(!roomSession?.roomId) { networkStatus.textContent='HOST OR JOIN A ROOM FIRST'; networkStatus.className='network-status error'; return; }
  const url=inviteUrl();
  const shareText=`JOIN MY CREW IN SWARM — ROOM ${roomSession.roomId}`;
  try {
    if(navigator.share) {
      try {
        await navigator.share({title:'SWARM CO-OP INVITE',text:shareText,url});
        reportEngagement('invite_shared');
        networkStatus.textContent=`INVITE SHARED · ROOM ${roomSession.roomId}`; networkStatus.className='network-status connected';
        return;
      } catch(error) {
        if(error?.name==='AbortError') {
          networkStatus.textContent='INVITE SHARE CANCELED'; networkStatus.className='network-status connected';
          return;
        }
      }
    }
    if(!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    reportEngagement('invite_copied');
    networkStatus.textContent=`INVITE COPIED · ROOM ${roomSession.roomId}`; networkStatus.className='network-status connected';
  } catch {
    roomInput.value=roomSession.roomId; roomInput.select();
    reportEngagement('invite_copied');
    networkStatus.textContent='ROOM CODE SELECTED — COPY IT TO INVITE YOUR CREW'; networkStatus.className='network-status connected';
  }
}
function buildChaosCard(summary) {
  const resultWord=summary?.outcome==='complete' ? 'ESCAPED' : 'COLLAPSED';
  const mission=(summary?.mission || game?.mission || 'lab_escape').replaceAll('_',' ').toUpperCase();
  const modifier=(summary?.modifier || game?.modifier || 'standard').replaceAll('_',' ').toUpperCase();
  const reason=summary?.outcome==='failed' ? ` ${failureBriefs[summary.failureReason] || 'THE SIGNAL WAS LOST.'}` : '';
  const invite=roomSession?.roomId ? ` JOIN OUR CREW: ${inviteUrl()}` : '';
  return `SWARM // ${mission} // ${modifier} — THE BODY ${resultWord}.${reason}${invite}`;
}
function renderChaosCard(summary) {
  chaosShareText=buildChaosCard(summary);
  chaosCard.textContent=chaosShareText;
  copyChaosCardButton.textContent='SHARE CHAOS CARD';
}
async function submitPlaytestFeedback(event) {
  event.preventDefault();
  if(!roomSession || !loadedMatchResult) return;
  const fields=new FormData(feedbackForm);
  const fun=Number(fields.get('fun')); const clarity=Number(fields.get('clarity'));
  if(!fun || !clarity) { feedbackStatus.textContent='SELECT FUN AND CLARITY'; return; }
  feedbackStatus.textContent='SENDING...';
  try {
    const response=await fetch('/rooms/'+encodeURIComponent(roomSession.roomId)+'/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({playerId:roomSession.player.playerId,reconnectToken:roomSession.player.reconnectToken,fun,clarity,wouldRematch:fields.get('wouldRematch')==='on',wouldShare:fields.get('wouldShare')==='on',note:fields.get('note')})});
    if(!response.ok) throw new Error();
    feedbackStatus.textContent='SIGNAL RECORDED — THANK YOU.';
  } catch { feedbackStatus.textContent='SIGNAL NOT SAVED — TRY AGAIN.'; }
}
async function copyChaosCard() {
  if(!chaosShareText) renderChaosCard(loadedMatchResult);
  try {
    if(navigator.share) {
      await navigator.share({ title:'SWARM // CHAOS CARD', text:chaosShareText, url:roomSession?.roomId ? inviteUrl() : undefined });
      reportEngagement('chaos_card_shared');
      copyChaosCardButton.textContent='CHAOS CARD SHARED';
      return;
    }
    if(!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(chaosShareText);
    reportEngagement('chaos_card_copied');
    copyChaosCardButton.textContent='CHAOS CARD COPIED';
  } catch {
    const selection=getSelection(); const range=document.createRange(); range.selectNodeContents(chaosCard); selection?.removeAllRanges(); selection?.addRange(range);
    reportEngagement('chaos_card_copied');
    copyChaosCardButton.textContent='CARD SELECTED — COPY IT';
  }
}
function renderRecentRuns(matches=[]) {
  recentRuns.replaceChildren();
  recentRunCount.textContent=String(matches.length);
  if(!matches.length) { recentRuns.textContent='No completed live runs yet.'; return; }
  for(const match of matches.slice(0,3)) {
    const row=document.createElement('span'); row.className='recent-run';
    const state=document.createElement('strong'); state.textContent=match.outcome==='complete' ? 'SYNCED' : 'DESYNC';
    row.append(state, document.createTextNode(` · ${(match.mission || 'unknown').replaceAll('_',' ').toUpperCase()}`));
    recentRuns.append(row);
  }
}
async function loadPlayerHistory() {
  if(!roomSession?.player?.playerId) return;
  try {
    const response=await fetch(`/players/${encodeURIComponent(roomSession.player.playerId)}/matches?limit=3`);
    if(!response.ok) return;
    const data=await response.json(); renderRecentRuns(data.matches || []);
  } catch { /* History is optional while offline or reconnecting. */ }
}

function newGame() {
  return { active:false, finished:false, last:0, elapsed:90, player:{x:170,y:510,vx:0,vy:0,angle:0,onGround:true,carry:false}, core:{x:680,y:542,vx:0,vy:0,held:false,scanned:false}, stability:100, overdrive:0, overheat:0, armPulse:0, message:'HEAD: SCAN THE CORE', directive:{stage:'SCAN',role:'head',instruction:'PRESS ACTION NEAR THE CORE'}, leftReady:false, rightReady:false, syncTimer:0, routeScanned:false, relayCharge:0, relayPrimed:false, beaconCharge:0, beaconOnline:false, hazardCleared:false, gateCharge:0, gateOpen:false, modifier:'standard', mission:'lab_escape' };
}
function renderRoles() {
  const assigned={locomotion:0,jump:1,left_arm:2,right_arm:3,head:4,core:5,tail:6,special:7}[roomSession?.player?.role];
  panel.innerHTML = roles.map((r,i) => `<button class="role ${i===activeRole?'active':''} ${game?.online && i!==assigned?'locked':''}" data-role="${i}" type="button" ${game?.online && i!==assigned?'disabled':''}><i>${r[2]}</i><b>${r[0]}</b><span>${r[1]}</span></button>`).join('');
  panel.querySelectorAll('.role').forEach(el=>el.addEventListener('click',()=>selectRole(Number(el.dataset.role))));
}
function selectRole(index) {
  const assigned={locomotion:0,jump:1,left_arm:2,right_arm:3,head:4,core:5,tail:6,special:7}[roomSession?.player?.role];
  if(game?.online && index!==assigned) return;
  activeRole=index; roleName.textContent=roles[index][0]; renderRoles(); updateRoleCue();
}
function hydrateBody(body) {
  if(!body || !game?.online) return;
  game.elapsed=body.elapsed; game.stability=body.stability; game.overdrive=body.overdrive*1000; game.overheat=body.overheat*1000; game.message=body.message;
  game.player.x=body.player.x; game.player.y=body.player.y; game.player.vx=body.player.vx; game.player.vy=body.player.vy; game.player.angle=body.player.angle; game.player.onGround=body.player.onGround; game.player.carry=body.player.carry;
  game.core.x=body.core.x; game.core.scanned=body.core.scanned; game.core.held=body.core.held;
  game.leftReady=body.leftLinked; game.rightReady=body.rightLinked; game.syncTimer=body.syncRemaining*1000;
  game.routeScanned=body.routeScanned; game.relayCharge=body.relayCharge || 0; game.relayPrimed=Boolean(body.relayPrimed); game.beaconCharge=body.beaconCharge || 0; game.beaconOnline=Boolean(body.beaconOnline); game.hazardCleared=body.hazardCleared; game.gateCharge=body.gateCharge; game.gateOpen=body.gateOpen;
  game.modifier=body.modifier || 'standard'; game.directive=body.directive || null;
  game.mission=body.mission || 'lab_escape';
  updateMissionBrief(game.modifier,game.mission);
  timer.textContent=formatTime(game.elapsed); stabilityLabel.textContent=`${Math.round(game.stability)}%`; status.textContent=game.message; updateRoleCue();
  if(body.phase==='complete') { finish(true); loadMatchResult(); }
  if(body.phase==='failed') { finish(false); loadMatchResult(); }
}
function displayRoom(room, player) {
  const filled = room.players.length;
  const ready = room.players.filter(member => member.ready && member.connected).length;
  const connected = room.players.filter(member => member.connected).length;
  const yours = player?.role ? ` — YOU: ${player.role.replace('_',' ').toUpperCase()}` : '';
  networkStatus.textContent=`ROOM ${room.roomId} · ${filled}/8 MINDS${yours}`;
  const stateLabel=room.paused ? 'PAUSED · RECONNECTING' : room.phase==='running' ? 'LIVE' : `${ready}/${connected} READY`;
  networkStatus.textContent += ` · ${stateLabel}`;
  networkStatus.className='network-status connected';
  roomInput.value=room.roomId;
  if(roomSession && room.phase!=='running' && room.phase!=='lobby') {
    const voters=room.players.filter(member => member.connected);
    const voted=voters.filter(member => member.ready).length;
    const mine=voters.find(member => member.playerId===roomSession.player.playerId);
    rematchVote.textContent=`REMATCH VOTES: ${voted}/${voters.length} · EVERY CONNECTED MIND MUST VOTE`;
    againButton.disabled=Boolean(mine?.ready);
    againButton.innerHTML=mine?.ready ? 'REMATCH VOTE LOCKED <b>✓</b>' : 'VOTE REMATCH <b>→</b>';
  }
}
function receiveRoomMessage(message) {
  if(message?.type==='ping') {
    const ping=message.data;
    status.textContent=`${ping.role.replace('_',' ').toUpperCase()}: ${ping.command}`;
    return;
  }
  const room=message?.data;
  if(!room?.roomId) return;
  displayRoom(room, roomSession?.player);
  hydrateBody(room.body);
  if(room.paused) status.textContent='TEAM LINK LOST — HOLDING THE BODY';
  if(message.type==='started' && !game.active && !game.finished) startLocal(roomSession?.player?.role, room.body);
}
function streamRoom(roomId) {
  clearTimeout(roomReconnectTimer);
  roomEvents?.close(); roomEvents=null;
  const previousSocket=roomSocket; roomSocket=null; previousSocket?.close();
  const scheme=location.protocol==='https:' ? 'wss' : 'ws';
  const playerId=encodeURIComponent(roomSession.player.playerId);
  const reconnectToken=encodeURIComponent(roomSession.player.reconnectToken);
  roomSocket=new WebSocket(`${scheme}://${location.host}/rooms/${roomId}/ws?playerId=${playerId}&reconnectToken=${reconnectToken}`);
  roomSocket.addEventListener('open', () => { roomReconnectAttempt=0; });
  roomSocket.addEventListener('message', event => { try { receiveRoomMessage(JSON.parse(event.data)); } catch { networkStatus.textContent='INVALID ROOM MESSAGE'; networkStatus.className='network-status error'; } });
  roomSocket.addEventListener('close', event => {
    if(roomSocket !== event.target || !roomSession) return;
    const delay=Math.min(5000,1000 * (2 ** roomReconnectAttempt));
    roomReconnectAttempt=Math.min(roomReconnectAttempt+1,3);
    roomReconnectTimer=setTimeout(() => streamRoom(roomId),delay);
  });
  roomSocket.addEventListener('close', () => { if(roomSession) { networkStatus.textContent='ROOM SOCKET RECONNECTING…'; networkStatus.className='network-status error'; } });
  roomSocket.addEventListener('error', () => { if(roomSession) { networkStatus.textContent='ROOM SOCKET ERROR'; networkStatus.className='network-status error'; } });
}
async function joinRoom(roomId, create=false) {
  const code=String(roomId || '').trim().toUpperCase();
  if(!code && !create) { networkStatus.textContent='ENTER A ROOM CODE'; networkStatus.className='network-status error'; return; }
  try {
    if(create) {
      const created=await fetch('/rooms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({})});
      if(!created.ok) throw new Error((await created.json()).error);
      roomId=(await created.json()).roomId;
    }
    const currentUrl=new URL(location.href);
    const joinSource=currentUrl.searchParams.get('room')===String(roomId).toUpperCase() && currentUrl.searchParams.get('ref')==='invite' ? 'invite' : 'direct';
    const inviteAttributionId=joinSource==='invite' ? inviteVisitorId() : undefined;
    if(joinSource==='invite' && inviteOpenPromise) await inviteOpenPromise;
    const response=await fetch(`/rooms/${roomId}/join`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:nameInput.value.trim() || 'MIND',role:rolePreference.value || undefined,joinSource,inviteVisitorId:inviteAttributionId})});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error || 'Unable to join room');
    roomSession={ player:data.player, roomId:data.room.roomId };
    persistRoomSession();
    rolePreference.value=data.player.role; displayRoom(data.room,data.player); streamRoom(data.room.roomId); loadPlayerHistory();
  } catch(error) { networkStatus.textContent=error.message.toUpperCase(); networkStatus.className='network-status error'; }
}
function startLocal(assignedRole, body) {
  loadedMatchResult=null; chaosShareText=''; rematchVote.textContent=''; againButton.disabled=false; againButton.innerHTML='VOTE REMATCH <b>→</b>'; game=newGame(); game.online=Boolean(assignedRole && roomSession); game.active=true; game.last=performance.now(); overlay.classList.add('is-hidden'); result.classList.add('is-hidden'); selectRole(0); requestAnimationFrame(loop);
  const roleIndex={locomotion:0,jump:1,left_arm:2,right_arm:3,head:4,core:5,tail:6,special:7}[assignedRole];
  if(Number.isInteger(roleIndex)) selectRole(roleIndex);
  hydrateBody(body);
}
function renderResultTeam(players=[]) {
  resultTeam ||= Object.assign(document.createElement('div'), { id:'result-team', ariaLive:'polite' });
  if(!resultTeam.parentElement) document.querySelector('.result-grid').after(resultTeam);
  resultTeam.replaceChildren();
  for(const player of players) {
    const line=document.createElement('div'); const role=document.createElement('b'); const stat=document.createElement('span');
    role.textContent=player.role.replace('_',' ').toUpperCase();
    stat.textContent=player.meaningfulAction===false ? 'NO DECISIVE ACTION · TRY A NEW PLAN' : `${player.meaningfulActionCount ?? 0} DECISIVE ACTIONS · ${player.inputCount} INPUTS`;
    line.append(role,stat); resultTeam.append(line);
  }
}
async function start() {
  if(!roomSession) return startLocal();
  try {
    const ready=await fetch(`/rooms/${roomSession.roomId}/ready`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({playerId:roomSession.player.playerId,reconnectToken:roomSession.player.reconnectToken,ready:true})});
    if(!ready.ok) { const data=await ready.json(); throw new Error(data.error || 'Unable to ready up'); }
    const response=await fetch(`/rooms/${roomSession.roomId}/start`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({playerId:roomSession.player.playerId,reconnectToken:roomSession.player.reconnectToken})});
    const data=await response.json();
    if(!response.ok) {
      if(response.status===409 && Array.isArray(data.unready)) {
        networkStatus.textContent=`REMATCH VOTE RECORDED · WAITING FOR ${data.unready.map(labelRole).join(', ')}`;
        networkStatus.className='network-status connected';
        againButton.disabled=true; againButton.innerHTML='REMATCH VOTE LOCKED <b>✓</b>';
        return;
      }
      throw new Error(data.error || 'Unable to start room');
    }
    startLocal(roomSession.player.role,data.body);
  } catch(error) { networkStatus.textContent=error.message.toUpperCase(); networkStatus.className='network-status error'; }
}
function finish(success) {
  if(game.finished) return;
  game.active=false; game.finished=true;
  document.querySelector('#result-kicker').textContent=success?'OBJECTIVE COMPLETE':'THE BODY COLLAPSED';
  document.querySelector('#result-title').innerHTML=success?'CORE<br><em>SECURED.</em>':'SIGNAL<br><em>LOST.</em>';
  document.querySelector('#result-copy').textContent=success?'The team hauled the core to extraction. One body, eight minds.':'The core was not extracted in time. Coordinate, stabilize, try again.';
  document.querySelector('#result-time').textContent=success?formatTime(game.elapsed):'00:00';
  document.querySelector('#result-status').textContent=success?'SYNCED':'DESYNC';
  renderResultTeam();
  renderChaosCard({ outcome:success?'complete':'failed', mission:game.mission, modifier:game.modifier, failureReason:success?null:(game.stability<=0?'stability_depleted':'time_expired') });
  result.classList.remove('is-hidden');
}
async function loadMatchResult() {
  if(!roomSession || loadedMatchResult) return;
  try {
    const response=await fetch(`/rooms/${roomSession.roomId}/result`);
    if(!response.ok) return;
    const summary=await response.json(); loadedMatchResult=summary;
    const mine=summary.players.find(player => player.playerId===roomSession.player.playerId);
    if(!mine) return;
    const failure=summary.outcome==='failed' ? ` ${failureBriefs[summary.failureReason] || 'THE SIGNAL WAS LOST.'}` : '';
    document.querySelector('#result-copy').textContent=`${summary.message}.${failure} ${mine.role.replace('_',' ').toUpperCase()}: ${mine.meaningfulActionCount ?? 0} decisive actions, ${mine.inputCount} inputs.`;
    document.querySelector('#result-status').textContent=summary.outcome==='complete' ? 'SYNCED' : 'DESYNC';
    renderResultTeam(summary.players);
    renderChaosCard(summary);
    feedbackForm.hidden=false; feedbackStatus.textContent='';
    loadPlayerHistory();
  } catch { /* The match overlay remains usable if the recap request is unavailable. */ }
}
function formatTime(t) { const s=Math.max(0,Math.ceil(t)); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function middleGateComplete() { return game.mission==='reactor_relay' ? game.relayPrimed : game.mission==='convoy_rescue' ? game.beaconOnline : game.routeScanned; }
function roleInput(dt) {
  const p=game.player, c=game.core;
  const move=(keys.KeyA||keys.ArrowLeft?-1:0)+(keys.KeyD||keys.ArrowRight?1:0);
  const near=Math.abs((p.x+36)-c.x)<105 && Math.abs(p.y-c.y)<100;
  if(activeRole===0) { p.vx += move*.0022*dt; p.vx=Math.max(-.48,Math.min(.48,p.vx)); if(move) p.angle+=move*.0008*dt; }
  if(activeRole===1 && (keys.Space||keys.KeyW||keys.ArrowUp) && p.onGround) { p.vy=-.75; p.onGround=false; keys.Space=false; keys.KeyW=false; keys.ArrowUp=false; game.message='JUMP SIGNAL EXECUTED'; }
  if(activeRole===4 && keys.KeyF && near && !c.scanned) { c.scanned=true; game.message='CORE SIGNATURE FOUND — SYNCHRONIZE THE ARMS'; keys.KeyF=false; }
  if(game.mission==='lab_escape' && activeRole===4 && keys.KeyF && p.carry && c.scanned && !game.routeScanned && p.x>=750 && p.x<=930) { game.routeScanned=true; game.message='HEAD: ESCAPE ROUTE MAPPED — CLEAR THE SHOCK GRID'; keys.KeyF=false; }
  if((activeRole===2||activeRole===3) && keys.KeyF && c.scanned && near) {
    game.armPulse=260;
    if(activeRole===2) game.leftReady=true; else game.rightReady=true;
    if(game.syncTimer<=0) game.syncTimer=2600;
    if(game.leftReady && game.rightReady) { c.held=true; p.carry=true; game.message='ARM SYNC COMPLETE — MOVE TO EXTRACTION'; }
    else game.message=activeRole===2?'LEFT ARM LINKED — SWITCH TO RIGHT ARM':'RIGHT ARM LINKED — SWITCH TO LEFT ARM';
    keys.KeyF=false;
  }
  if(activeRole===5 && (keys.Space||keys.KeyW||keys.ArrowUp)) {
    game.stability=Math.min(100,game.stability+.12*dt);
    if(game.mission==='reactor_relay' && p.carry && !game.relayPrimed && p.x>=750 && p.x<=930) { game.relayCharge=Math.min(1,game.relayCharge+dt/1000); game.message=`CORE: PRIME THE RELAY ${Math.ceil(game.relayCharge*100)}%`; if(game.relayCharge>=1) game.relayPrimed=true; }
    else game.message='CORE STABILIZING';
  }
  if(activeRole===6 && keys.KeyF) {
    p.vx*=.58; game.stability=Math.min(100,game.stability+.035*dt);
    if(p.carry && p.x>=940 && !game.gateOpen) { game.gateCharge=Math.min(1,game.gateCharge+dt/1000); game.message=`TAIL: PRESSURE GATE ${Math.ceil(game.gateCharge*100)}%`; if(game.gateCharge>=1) { game.gateOpen=true; game.message='PRESSURE GATE OPEN — EXTRACT THE CORE'; } }
    else game.message='TAIL ANCHOR DAMPING THE BODY';
  }
  if(activeRole===7 && keys.KeyQ && game.mission==='convoy_rescue' && p.carry && !game.beaconOnline && p.x>=750 && p.x<=930) { game.beaconCharge=Math.min(1,game.beaconCharge+dt/1000); game.message=`SPECIAL: UPLINK THE RESCUE BEACON ${Math.ceil(game.beaconCharge*100)}%`; if(game.beaconCharge>=1) { game.beaconOnline=true; game.message='RESCUE BEACON ONLINE - CLEAR THE DEBRIS FIELD'; } }
  else if(activeRole===7 && keys.KeyQ && game.overdrive<=0) { const charged=game.modifier==='overcharged'; game.overdrive=charged?3500:2500; game.message=charged?'OVERCHARGED OVERDRIVE: 4 SECONDS':'OVERDRIVE: 3 SECONDS'; keys.KeyQ=false; }
}
function update(dt) {
  const p=game.player,c=game.core; game.elapsed-=dt/1000; const hadOverdrive=game.overdrive>0; game.overdrive=Math.max(0,game.overdrive-dt); if(hadOverdrive && game.overdrive===0) { game.overheat=2500; game.message='OVERHEAT: BODY SLOWED'; } game.overheat=Math.max(0,game.overheat-dt); game.armPulse=Math.max(0,game.armPulse-dt); game.syncTimer=Math.max(0,game.syncTimer-dt);
  if(game.syncTimer===0 && !c.held) { game.leftReady=false; game.rightReady=false; }
  roleInput(dt);
  const boost=game.overdrive>0?1.65:game.overheat>0?.55:1;
  p.vx*=Math.pow(.0009,dt/1000); p.vy+=(game.modifier==='low_gravity'?.00115:.00195)*dt; p.x+=p.vx*dt*boost; p.y+=p.vy*dt;
  if(p.y>=510){p.y=510;p.vy=0;p.onGround=true;} p.x=Math.max(90,Math.min(1170,p.x));
  if(p.carry && middleGateComplete() && !game.hazardCleared && p.x>=840 && p.x<=980 && p.y<480) { game.hazardCleared=true; game.message=game.mission==='reactor_relay'?'JUMP: ARC TRENCH CLEARED — OPEN THE COOLANT VALVE':'JUMP: SHOCK GRID CLEARED — OPEN THE PRESSURE GATE'; }
  if(p.carry && !middleGateComplete() && p.x>875) p.x=875;
  if(p.carry && middleGateComplete() && !game.hazardCleared && p.x>930) p.x=930;
  if(p.carry && game.hazardCleared && !game.gateOpen && p.x>1020) p.x=1020;
  const carryStrain=game.modifier==='fragile_core'?14:8; const imbalance=Math.abs(p.vx)*14+Math.abs(Math.sin(p.angle))*35+(p.carry?carryStrain:0); game.stability=Math.max(0,game.stability-imbalance*dt/1000);
  if(c.held) { c.x=p.x+54; c.y=p.y+28; } else { c.vy+=.0018*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y>542){c.y=542;c.vy=0;c.vx*=.74;} }
  if(p.carry && middleGateComplete() && game.hazardCleared && game.gateOpen && p.x>1050) { finish(true); return; }
  if(game.elapsed<=0 || game.stability<=0) { finish(false); return; }
  timer.textContent=formatTime(game.elapsed); stabilityLabel.textContent=`${Math.round(game.stability)}%`; status.textContent=game.message;
}
function currentAxis() {
  return { x:(keys.KeyA||keys.ArrowLeft?-1:0)+(keys.KeyD||keys.ArrowRight?1:0), y:0 };
}
function currentButtons() {
  return (keys.KeyF||keys.Space||keys.KeyW||keys.ArrowUp||keys.KeyQ) ? 1 : 0;
}
async function publishInput(now) {
  if(!game?.online || !roomSession || now<nextInputAt) return;
  nextInputAt=now+50;
  const tick=(roomSession.inputTick || 0)+1;
  roomSession.inputTick=tick;
  const input={role:roomSession.player.role,tick,axis:currentAxis(),buttons:currentButtons()};
  if(roomSocket?.readyState===WebSocket.OPEN) { roomSocket.send(JSON.stringify({type:'input',input})); return; }
  try {
    const response=await fetch(`/rooms/${roomSession.roomId}/input`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({playerId:roomSession.player.playerId,reconnectToken:roomSession.player.reconnectToken,input})});
    if(!response.ok) { const data=await response.json().catch(()=>({})); throw new Error(data.error || 'Input rejected'); }
  } catch(error) {
    networkStatus.textContent=error.message.toUpperCase(); networkStatus.className='network-status error';
  }
}
function sendPing(command) {
  if(!game?.online || roomSocket?.readyState!==WebSocket.OPEN) return;
  roomSocket.send(JSON.stringify({type:'ping',command}));
}
function world() {
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#1b2821');g.addColorStop(.58,'#101715');g.addColorStop(1,'#070a09');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(game.overdrive>0) {
    const pulse=.08+Math.sin(performance.now()*.015)*.035;
    const surge=ctx.createRadialGradient(game.player.x,game.player.y,20,game.player.x,game.player.y,430);
    surge.addColorStop(0,`rgba(217,255,87,${pulse})`);surge.addColorStop(1,'rgba(217,255,87,0)');ctx.fillStyle=surge;ctx.fillRect(0,0,W,H);
  }
  if(game.overheat>0) { ctx.fillStyle='rgba(255,117,94,.055)';ctx.fillRect(0,0,W,H); }
  ctx.fillStyle='rgba(217,255,87,.05)';for(let x=-150;x<W+150;x+=68){ctx.beginPath();ctx.moveTo(W*.5,208);ctx.lineTo(x,H);ctx.lineTo(x+2,H);ctx.fill();}
  ctx.strokeStyle='rgba(229,243,213,.055)';for(let y=300;y<H;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.fillStyle='#17221e';ctx.fillRect(0,574,W,146);ctx.fillStyle='#d9ff57';ctx.globalAlpha=.2;ctx.fillRect(0,574,W,2);ctx.globalAlpha=1;
  ctx.fillStyle='#0a0f0d';ctx.fillRect(1025,454,125,120);ctx.fillStyle='#2b3b33';ctx.fillRect(1041,468,91,106);ctx.fillStyle='#d9ff57';ctx.globalAlpha=.6;ctx.fillRect(1080,465,12,109);ctx.globalAlpha=1;ctx.fillStyle='#dde8c7';ctx.font='10px DM Mono';ctx.fillText('EXTRACTION',1035,442);
  const isReactor=game.mission==='reactor_relay'; const isConvoy=game.mission==='convoy_rescue'; const middleComplete=middleGateComplete();
  ctx.fillStyle=middleComplete?'#d9ff57':'#536158';ctx.fillRect(790,472,14,102);ctx.fillStyle='#dde8c7';ctx.fillText(isReactor?`CORE RELAY ${Math.round(game.relayCharge*100)}%`:isConvoy?`RESCUE BEACON ${Math.round(game.beaconCharge*100)}%`:'HEAD SCAN',768,454);
  ctx.fillStyle=game.hazardCleared?'rgba(217,255,87,.22)':'rgba(255,117,94,.24)';ctx.fillRect(860,500,78,74);ctx.fillStyle='#dde8c7';ctx.fillText(isReactor?'ARC TRENCH':isConvoy?'DEBRIS FIELD':'SHOCK GRID',860,486);
  ctx.fillStyle=game.gateOpen?'#d9ff57':'#526158';ctx.fillRect(970,445,12,129);ctx.fillStyle='#dde8c7';ctx.fillText(game.gateOpen?'GATE OPEN':isReactor?`COOLANT ${Math.round(game.gateCharge*100)}%`:isConvoy?`AIRLOCK ${Math.round(game.gateCharge*100)}%`:`TAIL GATE ${Math.round(game.gateCharge*100)}%`,948,432);
  ctx.fillStyle='#38443d';ctx.fillRect(632,506,96,68);ctx.fillStyle='#87938a';ctx.fillRect(650,519,60,4);
  const mutator={standard:'STANDARD RUN',low_gravity:'LOW GRAVITY',fragile_core:'FRAGILE CORE',overcharged:'OVERCHARGED'}[game.modifier] || 'STANDARD RUN';
  ctx.fillStyle='#dde8c7';ctx.font='10px DM Mono';ctx.fillText(`MUTATOR: ${mutator}`,28,36);
}
function creature() {
  const p=game.player, core=game.core;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
  const armGlow=game.overdrive>0?'#d9ff57':game.overheat>0?'#ff755e':game.armPulse>0?'#d9ff57':'#a6beb0';ctx.strokeStyle='#829d8e';ctx.lineWidth=15;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-12,4);ctx.lineTo(-47,29);ctx.lineTo(-70,56);ctx.moveTo(28,4);ctx.lineTo(66,22);ctx.lineTo(82,53);ctx.stroke();
  ctx.strokeStyle='#657a6e';ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(-10,45);ctx.lineTo(-24,66);ctx.moveTo(27,45);ctx.lineTo(47,66);ctx.stroke();
  ctx.fillStyle='#b4cbb9';ctx.beginPath();ctx.ellipse(8,12,44,53,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#758d7e';ctx.beginPath();ctx.ellipse(17,-37,31,25,-.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=armGlow;ctx.shadowColor=armGlow;ctx.shadowBlur=15;ctx.beginPath();ctx.arc(5,12,12,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#1c2b24';ctx.beginPath();ctx.arc(25,-40,5,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(core.x,core.y);ctx.fillStyle=core.held?'#d9ff57':'#ff755e';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=core.held?28:18;ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1b241b';ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.restore();
}
function draw() { world(); creature(); }
function loop(now) {
  if(!game.active)return;
  const dt=Math.min(34,now-game.last);game.last=now;
  if(game.online) publishInput(now); else update(dt);
  draw();requestAnimationFrame(loop);
}
async function restoreRoomSession() {
  let saved;
  try { saved=JSON.parse(sessionStorage.getItem(sessionStorageKey) || 'null'); } catch { forgetRoomSession(); return; }
  if(!saved?.roomId || !saved?.player?.playerId || !saved?.player?.reconnectToken) return;
  try {
    const response=await fetch(`/rooms/${saved.roomId}/reconnect`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({playerId:saved.player.playerId,reconnectToken:saved.player.reconnectToken})});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error || 'Reconnect failed');
    roomSession={player:data.player,roomId:data.room.roomId}; persistRoomSession();
    rolePreference.value=data.player.role; displayRoom(data.room,data.player); streamRoom(data.room.roomId); loadPlayerHistory();
  } catch { forgetRoomSession(); }
}

startButton.addEventListener('click',start);againButton.addEventListener('click',()=>{reportEngagement('rematch_clicked');start();});resetButton.addEventListener('click',()=>{overlay.classList.remove('is-hidden');result.classList.add('is-hidden');feedbackForm.hidden=true;rematchVote.textContent='';againButton.disabled=false;againButton.innerHTML='VOTE REMATCH <b>→</b>';game=newGame();draw();});
feedbackForm.addEventListener('submit',submitPlaytestFeedback);
hostRoomButton.addEventListener('click',()=>joinRoom('',true));
joinRoomButton.addEventListener('click',()=>joinRoom(roomInput.value));
copyInviteButton.addEventListener('click',copyInvite);
copyChaosCardButton.addEventListener('click',copyChaosCard);
const sharedRoomCode=new URLSearchParams(location.search).get('room');
if(sharedRoomCode && /^[A-Z0-9]{3,8}$/i.test(sharedRoomCode)) {
  roomInput.value=sharedRoomCode.toUpperCase();
  if(new URLSearchParams(location.search).get('ref')==='invite') {
    networkStatus.textContent=`INVITE FOUND · ROOM ${roomInput.value} · PICK A CALL SIGN, THEN JOIN`;
    networkStatus.className='network-status connected';
    nameInput.focus();
    recordInviteOpen(roomInput.value);
  }
}
addEventListener('keydown',event=>{
  if(event.target.matches('input')) return;
  if(['Space','ArrowUp','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  if(/^Digit[1-8]$/.test(event.code))selectRole(Number(event.code.slice(-1))-1);
  const pings={KeyZ:'GO',KeyX:'WAIT',KeyC:'DANGER'}; if(pings[event.code]) sendPing(pings[event.code]);
  keys[event.code]=true;
});
addEventListener('keyup',event=>keys[event.code]=false);
document.querySelectorAll('[data-key]').forEach(button=>{const key=button.dataset.key;const up=()=>keys[key]=false;button.addEventListener('pointerdown',e=>{e.preventDefault();keys[key]=true;});button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up);});
game=newGame();updateMissionBrief();renderRoles();draw();
restoreRoomSession();

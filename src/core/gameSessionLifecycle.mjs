const VALID_GAME_STATES = new Set(['ready','started','paused','resumed','share_created','error','level_completed','completed']);
const GAME_ID_PATTERN = /^[a-z0-9-]{1,40}$/;

/** Validate sender, origin, game ID, lifecycle state and timestamp before mutating the player. */
export function isTrustedGameLifecycleMessage({origin,expectedOrigin,source,expectedSource,data,gameId,launchedAt=0,now=Date.now()}={}) {
  if(typeof expectedOrigin!=='string'||!expectedOrigin||origin!==expectedOrigin)return false;
  if(!expectedSource||source!==expectedSource)return false;
  if(typeof gameId!=='string'||!GAME_ID_PATTERN.test(gameId))return false;
  if(!data||typeof data!=='object'||Array.isArray(data))return false;
  if(data.type!=='osgard:game-lifecycle'||data.game!==gameId)return false;
  if(!VALID_GAME_STATES.has(data.state))return false;
  if(data.at!==undefined){
    if(!Number.isFinite(data.at)||data.at<launchedAt-1000||data.at>now+60_000)return false;
  }
  if(data.message!==undefined&&(typeof data.message!=='string'||data.message.length>500))return false;
  return true;
}

/** Monotonic pause-aware timer. Loading alone does not count as a started session. */
export function createSessionClock() {
  let startedAt=null,activeSince=null,accumulatedMs=0,closed=false;
  const elapsedMs=now=>startedAt===null?0:Math.max(0,accumulatedMs+(activeSince===null?0:Math.max(0,now-activeSince)));
  return {
    start(now){if(closed||startedAt!==null||!Number.isFinite(now))return false;startedAt=now;activeSince=now;return true},
    pause(now){if(closed||startedAt===null||activeSince===null||!Number.isFinite(now))return false;accumulatedMs+=Math.max(0,now-activeSince);activeSince=null;return true},
    resume(now){if(closed||startedAt===null||activeSince!==null||!Number.isFinite(now))return false;activeSince=now;return true},
    elapsedMs,
    isStarted(){return startedAt!==null},
    isPaused(){return startedAt!==null&&activeSince===null&&!closed},
    isFinished(){return closed},
    finish(now){if(closed)return null;closed=true;if(startedAt===null||!Number.isFinite(now))return null;const durationMs=elapsedMs(now);if(activeSince!==null)accumulatedMs+=Math.max(0,now-activeSince);activeSince=null;return{startedAt,finishedAt:now,durationMs}},
  };
}

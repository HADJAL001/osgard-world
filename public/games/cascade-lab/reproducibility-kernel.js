(() => {
'use strict';

const VERSION = '0.26.0';
const SCHEMA = 'osgard.cascade-lab.reproducibility-kernel.v1';
const CONTRACT_SCHEMA = 'osgard.cascade-lab.physics-contract.v1';
const ARCHIVE_SCHEMA = 'osgard.cascade-lab.reproducibility-archive.v1';
const ENGINE_REVISION = 'cascade-physics-v1';
const STORAGE_KEY = SCHEMA;
const MAX_RUNS = 12;
const MAX_FRAMES = 420;
const MAX_IMPORT_BYTES = 900 * 1024;
const TOOL_TYPES = new Set(['spring','fan','belt','magnet','switch','bumper']);
const IMPROVEMENTS = Object.freeze([
  'versioned-physics-contract','fixed-step-manifest','world-constants-fingerprint','level-layout-fingerprint',
  'ordered-device-blueprint-fingerprint','bounded-trajectory-normalization','stable-canonical-encoding','portable-run-passport',
  'non-cryptographic-trace-digest','same-scenario-gate','same-contract-gate','same-blueprint-gate',
  'exact-repeat-detection','trace-drift-detection','trajectory-mean-deviation','final-position-deviation',
  'elapsed-time-delta','outcome-delta','explicit-non-comparable-reason','tamper-evident-import-check',
  'duplicate-id-rejection','archive-size-cap','archive-run-cap','local-only-run-ledger',
  'explicit-passport-export','validated-archive-export','validated-archive-import','comparison-selector',
  'trajectory-overlay-chart','plain-language-method-limitations'
]);
const clean = (value, max = 180) => String(value == null ? '' : value).replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, places = 3) => finite(value) ? Number(value.toFixed(places)) : null;
const list = value => Array.isArray(value) ? value : [];

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
}
function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').toUpperCase();
}
function inRange(value, min, max) {
  return finite(value) && value >= min && value <= max ? value : null;
}
function vec2(raw, min = -500, max = 1500) {
  if (!raw || typeof raw !== 'object') return null;
  const x = inRange(raw.x, min, max), y = inRange(raw.y, min, max);
  return x === null || y === null ? null : { x: round(x, 2), y: round(y, 2) };
}
function rect(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const x = inRange(raw.x, -500, 1500), y = inRange(raw.y, -500, 1200);
  const w = inRange(raw.w, 0, 1500), h = inRange(raw.h, 0, 1200);
  return [x,y,w,h].some(value => value === null) ? null : { x:round(x,2), y:round(y,2), w:round(w,2), h:round(h,2) };
}
function normalizeContract(raw, levelId) {
  if (!raw || typeof raw !== 'object' || raw.schema !== CONTRACT_SCHEMA) return null;
  const engineRevision = clean(raw.engineRevision, 80);
  const fixedStepSeconds = inRange(raw.fixedStepSeconds, 0.0001, 0.1);
  const maxStepSeconds = inRange(raw.maxStepSeconds, 0.0001, 0.2);
  const world = raw.world || {};
  const normalizedWorld = {
    width:inRange(world.width,100,5000), height:inRange(world.height,100,5000),
    gravity:inRange(world.gravity,0,10000), radius:inRange(world.radius,1,250)
  };
  if (!engineRevision || fixedStepSeconds === null || maxStepSeconds === null || Object.values(normalizedWorld).some(value => value === null)) return null;
  const source = raw.physics || {};
  const physicsKeys = [
    'startVelocityX','fanRangeX','fanAccelX','fanAccelY','magnetRadius','magnetStrength',
    'springSpeed','bumperSpeedX','bumperSpeedY','dragPer60Hz','minVelocityX','maxVelocityX',
    'minVelocityY','maxVelocityY','fragileImpactLimit','switchRadius','maxSimulationSeconds'
  ];
  const physics = {};
  for (const key of physicsKeys) {
    const value = inRange(source[key], -100000, 100000);
    if (value === null) return null;
    physics[key] = round(value, 4);
  }
  const sourceLevel = raw.level || {};
  if (!Number.isInteger(sourceLevel.id) || sourceLevel.id !== levelId) return null;
  const start = vec2(sourceLevel.start);
  const goal = rect(sourceLevel.goal);
  if (!start || !goal) return null;
  const platforms = list(sourceLevel.platforms).slice(0,60).map(rect);
  const gates = list(sourceLevel.gates).slice(0,20).map(rect);
  if (platforms.some(item => !item) || gates.some(item => !item)) return null;
  const checkpoints = list(sourceLevel.checkpoints).slice(0,20).map(checkpoint => {
    if (!checkpoint || typeof checkpoint.id !== 'string') return null;
    const position = vec2(checkpoint);
    const radius = inRange(checkpoint.radius, 0, 500);
    if (!position || radius === null) return null;
    return { id:clean(checkpoint.id,80), label:clean(checkpoint.label,120), x:position.x, y:position.y, radius:round(radius,2), required:checkpoint.required !== false };
  });
  if (checkpoints.some(item => !item)) return null;
  let switchZone = null;
  if (sourceLevel.switchZone != null) {
    switchZone = vec2(sourceLevel.switchZone);
    if (!switchZone) return null;
  }
  return {
    schema:CONTRACT_SCHEMA, engineRevision,
    fixedStepSeconds:round(fixedStepSeconds,8), maxStepSeconds:round(maxStepSeconds,8),
    world:Object.fromEntries(Object.entries(normalizedWorld).map(([key,value]) => [key,round(value,4)])),
    physics,
    level:{
      id:levelId, start, goal, platforms, gates, checkpoints, switchZone,
      fragile:sourceLevel.fragile === true
    }
  };
}
function normalizeFrames(raw) {
  if (!Array.isArray(raw) || raw.length < 2) return [];
  const count = Math.min(MAX_FRAMES, raw.length);
  const selected = count === raw.length ? raw : Array.from({length:count},(_,index)=>raw[Math.round(index*(raw.length-1)/(count-1))]);
  const result = [];
  let priorTime = -1;
  for (const frame of selected) {
    if (!frame || typeof frame !== 'object') continue;
    const t = inRange(frame.t,0,120), x = inRange(frame.x,-500,2000), y = inRange(frame.y,-500,1500);
    if (t === null || x === null || y === null) continue;
    const time = round(t,4);
    if (time < priorTime) return [];
    priorTime = time;
    const vx = frame.vx == null ? null : inRange(frame.vx,-10000,10000);
    const vy = frame.vy == null ? null : inRange(frame.vy,-10000,10000);
    if ((frame.vx != null && vx === null) || (frame.vy != null && vy === null)) return [];
    result.push({
      t:time,x:round(x,3),y:round(y,3),vx:round(vx,3),vy:round(vy,3),
      gateOpen:frame.gateOpen === true,
      checkpoints:list(frame.checkpoints).slice(0,20).map(id=>clean(id,80))
    });
  }
  return result.length >= 2 ? result : [];
}
function normalizeDevices(raw) {
  if (!Array.isArray(raw) || raw.length > 12) return null;
  const devices = raw.map(device => {
    if (!device || !TOOL_TYPES.has(device.type)) return null;
    const x = inRange(device.x,-100,1200), y = inRange(device.y,-100,700), angle = inRange(device.angle,-Math.PI*64,Math.PI*64);
    if ([x,y,angle].some(value=>value===null)) return null;
    return {type:device.type,x:round(x,2),y:round(y,2),angle:round(angle,5)};
  });
  return devices.some(device=>!device) ? null : devices;
}
function normalizeEvents(raw) {
  return list(raw).slice(-16).map(event => {
    if (!event || typeof event !== 'object') return null;
    const t = event.t == null ? null : inRange(event.t,0,120);
    const x = event.x == null ? null : inRange(event.x,-500,2000);
    const y = event.y == null ? null : inRange(event.y,-500,1500);
    const speed = event.speed == null ? null : inRange(event.speed,0,100000);
    if ([t,x,y,speed].some((value,index)=>value===null && [event.t,event.x,event.y,event.speed][index]!=null)) return null;
    return {type:clean(event.type||'event',36),label:clean(event.label||event.type||'Событие',140),t:round(t,4),x:round(x,3),y:round(y,3),speed:round(speed,3)};
  }).filter(Boolean);
}
function signatures(run) {
  const contractFingerprint = fnv1a(canonicalize(run.simulationContract));
  const blueprintFingerprint = fnv1a(canonicalize({
    levelId:run.levelId, contractFingerprint,
    // Device order is preserved: the solver processes interactive devices in sequence.
    devices:run.devices
  }));
  const traceFingerprint = fnv1a(canonicalize({
    status:run.status, gateOpen:run.gateOpen,
    checkpointsReached:run.checkpointsReached,
    trajectory:run.trajectory,
    telemetry:run.telemetry
  }));
  return {contractFingerprint,blueprintFingerprint,traceFingerprint};
}
function normalizeRun(raw, options = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = clean(raw.id,100);
  const atMs = Date.parse(raw.at);
  if (!id || !Number.isFinite(atMs) || !['won','lost'].includes(raw.status)) return null;
  if (!Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5) return null;
  const mode = ['campaign','daily','duel'].includes(raw.mode) ? raw.mode : null;
  if (!mode) return null;
  const dailyDate = typeof raw.dailyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyDate) ? raw.dailyDate : null;
  if (mode === 'daily' && !dailyDate) return null;
  const simulationContract = normalizeContract(raw.simulationContract,raw.levelId);
  const devices = normalizeDevices(raw.devices);
  const trajectory = normalizeFrames(raw.trajectory);
  if (!simulationContract || !devices || trajectory.length < 2) return null;
  const telemetryRaw = raw.telemetry && typeof raw.telemetry === 'object' ? raw.telemetry : {};
  const telemetry = {
    distance:inRange(telemetryRaw.distance,0,1000000),
    peakSpeed:inRange(telemetryRaw.peakSpeed,0,100000),
    impacts:Number.isInteger(telemetryRaw.impacts)?clamp(telemetryRaw.impacts,0,100000):0,
    contacts:Number.isInteger(telemetryRaw.contacts)?clamp(telemetryRaw.contacts,0,100000):0,
    activations:Number.isInteger(telemetryRaw.activations)?clamp(telemetryRaw.activations,0,100000):0,
    lastImpactSpeed:inRange(telemetryRaw.lastImpactSpeed,0,100000),
    events:normalizeEvents(telemetryRaw.events)
  };
  const timeSeconds = inRange(raw.timeSeconds,0,120);
  if (timeSeconds === null || telemetry.distance === null || telemetry.peakSpeed === null || telemetry.lastImpactSpeed === null) return null;
  const run = {
    schema:SCHEMA, version:VERSION, id, at:new Date(atMs).toISOString(),
    levelId:raw.levelId,levelTitle:clean(raw.levelTitle||('Протокол #'+raw.levelId),140),
    status:raw.status,mode,dailyDate,reason:clean(raw.reason,240),grade:clean(raw.grade||'—',8),
    timeSeconds:round(timeSeconds,4),deviceCount:devices.length,par:Number.isInteger(raw.par)?clamp(raw.par,0,12):null,
    parTime:inRange(raw.parTime,0,120),gateOpen:raw.gateOpen===true,
    checkpointsReached:list(raw.checkpointsReached).slice(0,20).map(id=>clean(id,80)),
    devices,simulationContract,trajectory,telemetry
  };
  const fingerprints = signatures(run);
  const claimed = raw.fingerprints;
  if (claimed && options.skipFingerprintVerification !== true) {
    if (claimed.contractFingerprint !== fingerprints.contractFingerprint ||
        claimed.blueprintFingerprint !== fingerprints.blueprintFingerprint ||
        claimed.traceFingerprint !== fingerprints.traceFingerprint) return null;
  }
  run.fingerprints = fingerprints;
  run.verification = {
    method:'FNV-1a-32 canonical fingerprint',
    cryptographic:false,
    note:'Detects accidental or unsophisticated edits; not a cryptographic signature or proof of authorship.'
  };
  return run;
}
function verifyPassport(raw) {
  if (!raw || !raw.fingerprints) return {ok:false,reason:'Паспорт не содержит отпечатков для повторной проверки.'};
  const run = normalizeRun(raw,{skipFingerprintVerification:true});
  if (!run) return {ok:false,reason:'Структура паспорта или физический контракт недействительны.'};
  const claimed = raw.fingerprints, computed = run.fingerprints;
  const checks = {
    contract:claimed.contractFingerprint===computed.contractFingerprint,
    blueprint:claimed.blueprintFingerprint===computed.blueprintFingerprint,
    trace:claimed.traceFingerprint===computed.traceFingerprint
  };
  return {
    ok:Object.values(checks).every(Boolean),checks,
    reason:Object.values(checks).every(Boolean)?'Все три отпечатка совпадают.':'Содержимое не совпадает с записанными отпечатками.',
    fingerprints:computed
  };
}
function validateArchive(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== ARCHIVE_SCHEMA || raw.schemaVersion !== 1 || !Array.isArray(raw.runs)) {
    return {ok:false,reason:'Неизвестная схема паспорта или архива.'};
  }
  if (raw.runs.length > MAX_RUNS) return {ok:false,reason:'Архив превышает лимит в '+MAX_RUNS+' запусков.'};
  const encoded = JSON.stringify(raw);
  const bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(encoded).length : encoded.length*2;
  if (bytes > MAX_IMPORT_BYTES) return {ok:false,reason:'Архив превышает лимит 900 KiB.'};
  const runs = raw.runs.map(item => {
    const verified = verifyPassport(item);
    return verified.ok ? normalizeRun(item) : null;
  });
  if (runs.some(run=>!run)) return {ok:false,reason:'Один или несколько паспортов не прошли проверку отпечатков.'};
  const ids = new Set();
  for (const run of runs) {
    if (ids.has(run.id)) return {ok:false,reason:'В архиве обнаружены повторяющиеся ID запусков.'};
    ids.add(run.id);
  }
  return {ok:true,archive:{schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs}};
}
function scenarioKey(run) {
  return run ? [run.levelId,run.mode,run.dailyDate||''].join('|') : '';
}
function interpolate(trace,time) {
  if (!trace.length) return null;
  if (time <= trace[0].t) return trace[0];
  if (time >= trace.at(-1).t) return trace.at(-1);
  let low=0,high=trace.length-1;
  while(high-low>1){const middle=Math.floor((low+high)/2);if(trace[middle].t<=time)low=middle;else high=middle;}
  const a=trace[low],b=trace[high],ratio=(time-a.t)/Math.max(0.0001,b.t-a.t);
  return {t:time,x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio};
}
function trajectoryDeviation(a,b,samples=41) {
  if (!a || !b || a.trajectory.length<2 || b.trajectory.length<2) return null;
  const durationA=a.trajectory.at(-1).t-a.trajectory[0].t;
  const durationB=b.trajectory.at(-1).t-b.trajectory[0].t;
  if (!(durationA>0) || !(durationB>0)) return null;
  let total=0;
  for(let i=0;i<samples;i++){
    const ratio=i/(samples-1);
    const pa=interpolate(a.trajectory,a.trajectory[0].t+durationA*ratio);
    const pb=interpolate(b.trajectory,b.trajectory[0].t+durationB*ratio);
    total+=Math.hypot(pa.x-pb.x,pa.y-pb.y);
  }
  return round(total/samples,3);
}
function compareRuns(candidateRaw,baselineRaw) {
  const candidate=normalizeRun(candidateRaw),baseline=normalizeRun(baselineRaw);
  if (!candidate || !baseline) return {tier:'invalid',comparable:false,reason:'Одна из записей не прошла проверку паспорта.'};
  if (candidate.id===baseline.id) return {tier:'same-record',comparable:false,reason:'Выбери два разных запуска.'};
  if (scenarioKey(candidate)!==scenarioKey(baseline)) return {tier:'different-scenario',comparable:false,reason:'Разные протоколы, режимы или даты ежедневного вызова.'};
  if (candidate.fingerprints.contractFingerprint!==baseline.fingerprints.contractFingerprint) return {tier:'different-contract',comparable:false,reason:'Изменилась версия физической модели, шаг интегрирования или геометрия уровня.'};
  if (candidate.fingerprints.blueprintFingerprint!==baseline.fingerprints.blueprintFingerprint) return {tier:'different-blueprint',comparable:false,reason:'Схемы или порядок устройств различаются. Это не тест воспроизводимости одной и той же сборки.'};
  const deviation=trajectoryDeviation(candidate,baseline);
  const secondsDelta=round(candidate.timeSeconds-baseline.timeSeconds,4);
  const finalA=candidate.trajectory.at(-1),finalB=baseline.trajectory.at(-1);
  const finalPositionDelta=round(Math.hypot(finalA.x-finalB.x,finalA.y-finalB.y),3);
  const exact=candidate.fingerprints.traceFingerprint===baseline.fingerprints.traceFingerprint;
  let tier,reason;
  if (exact) {
    tier='exact-repeat';reason='Совпали отпечаток трассы, исход, события и выбранные измерения.';
  } else if (deviation!==null && deviation<=0.5 && candidate.status===baseline.status) {
    tier='near-repeat';reason='Траектории почти совпадают, но журнал или измерения отличаются.';
  } else {
    tier='trace-drift';reason='При одинаковом сценарии, контракте и схеме обнаружено расхождение результата или траектории.';
  }
  return {
    tier,comparable:true,reason,
    statusSame:candidate.status===baseline.status,
    secondsDelta,meanTrajectoryDeviation:deviation,finalPositionDelta,
    traceFingerprintSame:exact,
    candidateId:candidate.id,baselineId:baseline.id,
    contractFingerprint:candidate.fingerprints.contractFingerprint,
    blueprintFingerprint:candidate.fingerprints.blueprintFingerprint
  };
}
const api=Object.freeze({
  version:VERSION,schema:SCHEMA,contractSchema:CONTRACT_SCHEMA,archiveSchema:ARCHIVE_SCHEMA,
  engineRevision:ENGINE_REVISION,maxRuns:MAX_RUNS,maxFrames:MAX_FRAMES,maxImportBytes:MAX_IMPORT_BYTES,improvements:IMPROVEMENTS,
  canonicalize,fnv1a,normalizeContract,normalizeFrames,normalizeRun,signatures,verifyPassport,validateArchive,
  scenarioKey,trajectoryDeviation,compareRuns
});
if (typeof window==='undefined' || !window.document) {
  globalThis.__CASCADELAB026_TEST__=api;
  return;
}
if (window.CASCADELAB026) return;

const css=[
'.cl-repro{margin:18px 0 28px;padding:clamp(14px,2.2vw,24px);border:1px solid #79c9ff45;border-radius:17px;background:radial-gradient(ellipse at 5% 0%,#4ca2f91a,transparent 40%),radial-gradient(ellipse at 95% 0%,#51dfce12,transparent 42%),linear-gradient(145deg,#081826,#050c13);color:#eaf5f8;box-shadow:0 18px 48px #0003}.cl-repro *{box-sizing:border-box}.cl-repro-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.cl-repro-kicker{margin:0;color:#8bdcff;font:8px ui-monospace,monospace;letter-spacing:.18em}.cl-repro-badge{padding:5px 8px;border:1px solid #79c9ff4a;border-radius:5px;color:#a9e6ff;font:8px ui-monospace,monospace}.cl-repro h3{margin:10px 0 0;color:#f4fbff;font:400 clamp(25px,3vw,38px)/1.08 Georgia,serif;letter-spacing:-.03em}.cl-repro-copy{max-width:850px;margin:9px 0 16px;color:#9db8c7;font-size:10px;line-height:1.7}.cl-repro-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.cl-repro-card{min-width:0;padding:10px;border:1px solid #8cb6cd20;border-radius:9px;background:#06131d}.cl-repro-card small{display:block;color:#6f99ac;font:7px ui-monospace,monospace;letter-spacing:.1em}.cl-repro-card strong{display:block;margin-top:6px;color:#ddf0f8;font:600 13px ui-monospace,monospace;overflow-wrap:anywhere}.cl-repro-card p{margin:5px 0 0;color:#7696a8;font:8px/1.55 system-ui,sans-serif;overflow-wrap:anywhere}.cl-repro-status{margin:10px 0 0;padding:11px 12px;border-left:2px solid #72dbce;border-radius:0 8px 8px 0;background:#58d7c00a;color:#d9efee;font:10px/1.65 system-ui,sans-serif}.cl-repro-status[data-kind=warning]{border-color:#e9ba6a;color:#f6deb0;background:#e9ba6a0a}.cl-repro-status[data-kind=error]{border-color:#ff9d94;color:#ffc6bf;background:#ff9d940a}.cl-repro-selects{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.cl-repro-field{display:grid;gap:5px;min-width:0}.cl-repro-field label{color:#7295a7;font:8px ui-monospace,monospace;letter-spacing:.04em}.cl-repro-select{width:100%;min-width:0;min-height:38px;padding:8px;border:1px solid #8abbd12d;border-radius:7px;background:#06111a;color:#d9edf5;font:10px system-ui,sans-serif}.cl-repro-select:focus-visible,.cl-repro-button:focus-visible{outline:2px solid #9ee7ff;outline-offset:3px}.cl-repro-chart{display:block;width:100%;height:auto;min-height:130px;margin-top:10px;border:1px solid #83bdd01c;border-radius:9px;background:#051019}.cl-repro-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:9px}.cl-repro-metric{padding:9px;border:1px solid #8db7cb21;border-radius:8px;background:#06121b}.cl-repro-metric span{display:block;color:#6c90a3;font:7px ui-monospace,monospace}.cl-repro-metric b{display:block;margin-top:5px;color:#e7f3fa;font:600 15px Georgia,serif;overflow-wrap:anywhere}.cl-repro-toolbar{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.cl-repro-button{min-height:38px;padding:8px 10px;border:1px solid #7fc7ec3c;border-radius:7px;background:#0a2534;color:#bde9fb;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-repro-button.primary{border-color:#72d9d0;background:linear-gradient(120deg,#9ff0e4,#53b9bc);color:#062228}.cl-repro-button:hover{filter:brightness(1.12)}.cl-repro-log{display:grid;gap:6px;margin-top:12px}.cl-repro-run{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 9px;border:1px solid #8ab6cb20;border-radius:7px;background:#06121b}.cl-repro-run strong{display:block;color:#d2e7f0;font-size:10px}.cl-repro-run small{display:block;margin-top:4px;color:#7190a1;font:7px/1.55 ui-monospace,monospace;overflow-wrap:anywhere}.cl-repro-run button{min-height:31px;padding:5px 8px;border:1px solid #7fc7ec3a;border-radius:6px;background:#0a2534;color:#bde9fb;font-size:8px}.cl-repro-empty{padding:14px;border:1px dashed #80bdd12b;border-radius:8px;color:#7896a5;font-size:9px;line-height:1.6}.cl-repro-foot{margin:11px 0 0;padding-top:10px;border-top:1px solid #8bb7cb1d;color:#678596;font:7px/1.65 ui-monospace,monospace}.cl-repro-legend{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 0;color:#7899a9;font:8px ui-monospace,monospace}.cl-repro-legend span:before{content:\"\";display:inline-block;width:12px;height:2px;margin:0 5px 2px 0;background:#70d8ff}.cl-repro-legend span:last-child:before{background:#e9ba6a}@media(max-width:650px){.cl-repro{padding:13px;border-radius:12px}.cl-repro-grid{grid-template-columns:1fr}.cl-repro-selects{grid-template-columns:1fr}.cl-repro-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-repro-button{min-height:42px}.cl-repro-toolbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cl-repro-button{width:100%}.cl-repro-run{grid-template-columns:1fr}.cl-repro-run button{min-height:38px}}@media(prefers-reduced-motion:reduce){.cl-repro-button{transition:none!important}}'
].join('');
const style=document.createElement('style');
style.dataset.cascadeLabReproducibility=VERSION;
style.textContent=css;
document.head.append(style);
const make=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=String(value);
  return node;
};
const panel=make('section','cl-repro');
panel.setAttribute('aria-labelledby','cl-repro-title');
const header=make('div','cl-repro-head');
header.append(make('p','cl-repro-kicker','CASCADE LAB / REPRODUCIBILITY KERNEL'));
const badge=make('span','cl-repro-badge','PHYSICS CONTRACT v1');
header.append(badge);
const heading=make('h3','','Паспорт запуска и проверка повторяемости');
heading.id='cl-repro-title';
panel.append(header,heading,make('p','cl-repro-copy','Сравниваем только одинаковый протокол, дату ежедневного вызова, версию физической модели и точную конфигурацию устройств. Отпечаток помогает найти расхождение, но сам по себе не доказывает авторство или истинность результата.'));
const cardGrid=make('div','cl-repro-grid');
const contractCard=make('article','cl-repro-card');
contractCard.append(make('small','','PHYSICS CONTRACT'));
const contractValue=make('strong','','—');
contractCard.append(contractValue,make('p','','Шаг интегрирования, параметры мира и версия модели'));
const blueprintCard=make('article','cl-repro-card');
blueprintCard.append(make('small','','BLUEPRINT'));
const blueprintValue=make('strong','','—');
blueprintCard.append(blueprintValue,make('p','','Порядок и положение всех установленных устройств'));
const traceCard=make('article','cl-repro-card');
traceCard.append(make('small','','TRAJECTORY DIGEST'));
const traceValue=make('strong','','—');
traceCard.append(traceValue,make('p','','Траектория, исход и события запуска'));
cardGrid.append(contractCard,blueprintCard,traceCard);
panel.append(cardGrid);
const status=make('p','cl-repro-status','После первого завершённого испытания здесь появится технический паспорт.');
status.setAttribute('role','status');
status.setAttribute('aria-live','polite');
panel.append(status);
const selectors=make('div','cl-repro-selects');
const baselineField=make('div','cl-repro-field');
baselineField.append(make('label','','БАЗОВЫЙ ЗАПУСК'));
const baselineSelect=document.createElement('select');
baselineSelect.className='cl-repro-select';
baselineField.append(baselineSelect);
const candidateField=make('div','cl-repro-field');
candidateField.append(make('label','','КАНДИДАТ НА ПОВТОР'));
const candidateSelect=document.createElement('select');
candidateSelect.className='cl-repro-select';
candidateField.append(candidateSelect);
selectors.append(baselineField,candidateField);
panel.append(selectors);
const chart=document.createElement('canvas');
chart.className='cl-repro-chart';
chart.width=1000;chart.height=300;
chart.setAttribute('role','img');
chart.setAttribute('aria-label','Наложение траекторий базового и повторного запуска');
panel.append(chart);
const legend=make('div','cl-repro-legend');
legend.append(make('span','','Кандидат'),make('span','','База'));
panel.append(legend);
const metricGrid=make('div','cl-repro-metrics');
const metricNodes={};
for(const [key,label] of [['MEAN DEVIATION','СРЕДНЕЕ ОТКЛОНЕНИЕ'],['FINAL OFFSET','РАЗНИЦА В ФИНИШЕ'],['TIME DELTA','ДЕЛЬТА ВРЕМЕНИ'],['TRACE MATCH','СОВПАДЕНИЕ ТРАССЫ']]){
  const card=make('div','cl-repro-metric');
  card.append(make('span','',label));
  const value=make('b','','—');card.append(value);metricGrid.append(card);metricNodes[key]=value;
}
panel.append(metricGrid);
const toolbar=make('div','cl-repro-toolbar');
const compareButton=make('button','cl-repro-button primary','Сравнить паспорта');
compareButton.type='button';
const passportButton=make('button','cl-repro-button','Скачать паспорт JSON');
passportButton.type='button';
const archiveButton=make('button','cl-repro-button','Экспорт архива');
archiveButton.type='button';
const importButton=make('button','cl-repro-button','Импорт архива');
importButton.type='button';
const clearButton=make('button','cl-repro-button','Очистить историю');
clearButton.type='button';
const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.hidden=true;
toolbar.append(compareButton,passportButton,archiveButton,importButton,clearButton);
panel.append(toolbar,fileInput);
const history=make('div','cl-repro-log');
panel.append(history,make('p','cl-repro-foot','LOCAL-FIRST · НЕ СЕТЕВОЙ СЕРВИС · FNV-1a-32 — НЕ КРИПТОГРАФИЧЕСКИЙ ХЭШ · ТАБЛИЦА ПРОТОКОЛОВ НЕ ПОДМЕНЯЕТ ФИЗИЧЕСКУЮ ВАЛИДАЦИЮ'));

const existingEvidence=document.querySelector('.cl-evidence');
const existingXray=document.querySelector('.cl-xray');
const bottomGrid=document.querySelector('.bottom-grid');
const footer=document.querySelector('.app-footer')||document.querySelector('footer');
if(existingEvidence&&typeof existingEvidence.after==='function')existingEvidence.after(panel);
else if(existingXray&&typeof existingXray.after==='function')existingXray.after(panel);
else if(bottomGrid&&typeof bottomGrid.before==='function')bottomGrid.before(panel);
else if(footer&&typeof footer.before==='function')footer.before(panel);
else return;

let runs=readRuns();
function readRuns(){
  try{
    const raw=window.localStorage.getItem(STORAGE_KEY);
    if(!raw)return [];
    const parsed=JSON.parse(raw);
    const checked=validateArchive(parsed);
    return checked.ok?checked.archive.runs.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS):[];
  }catch{return [];}
}
function persist(){
  runs=runs.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS);
  const payload={schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs};
  try{
    window.localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
    return true;
  }catch{
    status.dataset.kind='error';
    status.textContent='Браузер не разрешил локальное сохранение. Экспорт паспорта всё ещё доступен после выбора запуска.';
    return false;
  }
}
function download(filename,content,type){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.hidden=true;
  panel.append(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function shortFingerprint(value){return typeof value==='string'?value.slice(0,8).toUpperCase():'—';}
function runLabel(run){
  return 'L'+run.levelId+' · '+(run.status==='won'?'УСПЕХ':'НЕУДАЧА')+' · '+run.timeSeconds.toFixed(2)+' с · '+new Date(run.at).toLocaleString();
}
function selectedRun(select){
  return runs.find(run=>run.id===select.value)||null;
}
function syncSelects(){
  const priorBaseline=baselineSelect.value,priorCandidate=candidateSelect.value;
  baselineSelect.replaceChildren();candidateSelect.replaceChildren();
  if(!runs.length){
    const blank=document.createElement('option');blank.value='';blank.textContent='Нет записанных запусков';
    baselineSelect.append(blank.cloneNode(true));candidateSelect.append(blank);baselineSelect.disabled=true;candidateSelect.disabled=true;return;
  }
  baselineSelect.disabled=false;candidateSelect.disabled=false;
  for(const run of runs){
    const optionA=document.createElement('option');optionA.value=run.id;optionA.textContent=runLabel(run);
    const optionB=optionA.cloneNode(true);baselineSelect.append(optionA);candidateSelect.append(optionB);
  }
  const candidate=runs.find(run=>run.id===priorCandidate)||runs[0];
  let baseline=runs.find(run=>run.id===priorBaseline&&run.id!==candidate.id);
  if(!baseline)baseline=runs.find(run=>run.id!==candidate.id&&compareRuns(candidate,run).comparable)||runs.find(run=>run.id!==candidate.id)||candidate;
  candidateSelect.value=candidate.id;baselineSelect.value=baseline.id;
}
function setStatus(message,kind='success'){
  status.dataset.kind=kind==='success'?'success':kind;
  status.textContent=message;
}
function drawOverlay(candidate,baseline){
  const ctx=chart.getContext('2d');
  const width=chart.width,height=chart.height;
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle='#06121b';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#8ab4c51c';ctx.lineWidth=1;
  for(let i=1;i<6;i++){const x=i*width/6;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
  for(let i=1;i<4;i++){const y=i*height/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  const world=candidate?.simulationContract?.world||baseline?.simulationContract?.world||{width:1000,height:560};
  const sx=width/world.width,sy=height/world.height,scale=Math.min(sx,sy);
  const ox=(width-world.width*scale)/2,oy=(height-world.height*scale)/2;
  const trace=(run,color,dashed)=>{
    if(!run||!run.trajectory.length)return;
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=dashed?2:2.5;ctx.setLineDash(dashed?[8,5]:[]);ctx.beginPath();
    run.trajectory.forEach((frame,index)=>{
      const x=ox+frame.x*scale,y=oy+frame.y*scale;
      if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });
    ctx.stroke();const first=run.trajectory[0],last=run.trajectory.at(-1);
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(ox+first.x*scale,oy+first.y*scale,5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(ox+last.x*scale,oy+last.y*scale,5,0,Math.PI*2);ctx.fill();ctx.restore();
  };
  trace(baseline,'#e9ba6a',true);trace(candidate,'#70d8ff',false);
}
function clearMetrics(){
  for(const item of Object.values(metricNodes))item.textContent='—';
  drawOverlay(null,null);
}
function renderSelected(){
  const candidate=selectedRun(candidateSelect);
  if(!candidate){contractValue.textContent='—';blueprintValue.textContent='—';traceValue.textContent='—';clearMetrics();return;}
  contractValue.textContent=shortFingerprint(candidate.fingerprints.contractFingerprint);
  blueprintValue.textContent=shortFingerprint(candidate.fingerprints.blueprintFingerprint);
  traceValue.textContent=shortFingerprint(candidate.fingerprints.traceFingerprint);
  const baseline=selectedRun(baselineSelect);
  drawOverlay(candidate,baseline&&baseline.id!==candidate.id&&candidate.fingerprints.contractFingerprint===baseline.fingerprints.contractFingerprint?baseline:null);
}
function renderComparison(result){
  if(!result.comparable){
    setStatus(result.reason,'warning');clearMetrics();return;
  }
  const labels={
    'exact-repeat':'ТОЧНЫЙ ПОВТОР',
    'near-repeat':'ТРАЕКТОРИЯ СТАБИЛЬНА, ЖУРНАЛ ОТЛИЧАЕТСЯ',
    'trace-drift':'ОБНАРУЖЕНО РАСХОЖДЕНИЕ'
  };
  badge.textContent=labels[result.tier]||result.tier.toUpperCase();
  badge.dataset.kind=result.tier;
  setStatus(result.reason+' Это сравнение наблюдаемых данных, а не доказательство причинности.',result.tier==='trace-drift'?'warning':'success');
  metricNodes['MEAN DEVIATION'].textContent=result.meanTrajectoryDeviation===null?'—':result.meanTrajectoryDeviation.toFixed(3)+' px';
  metricNodes['FINAL OFFSET'].textContent=result.finalPositionDelta.toFixed(3)+' px';
  metricNodes['TIME DELTA'].textContent=(result.secondsDelta>0?'+':'')+result.secondsDelta.toFixed(4)+' с';
  metricNodes['TRACE MATCH'].textContent=result.traceFingerprintSame?'100%':'нет';
}
function updateHistory(){
  history.replaceChildren();
  if(!runs.length){history.append(make('p','cl-repro-empty','Заверши физический запуск, чтобы создать первый паспорт воспроизводимости.'));return;}
  for(const run of runs.slice(0,MAX_RUNS)){
    const row=make('article','cl-repro-run'),copy=make('div');
    copy.append(make('strong','',runLabel(run)));
    copy.append(make('small','', 'ENGINE '+run.simulationContract.engineRevision+' · CONTRACT '+run.fingerprints.contractFingerprint+' · BLUEPRINT '+run.fingerprints.blueprintFingerprint+' · TRACE '+run.fingerprints.traceFingerprint));
    const open=make('button','','Сравнить');open.type='button';
    open.addEventListener('click',()=>{
      candidateSelect.value=run.id;
      const baseline=runs.find(item=>item.id!==run.id&&compareRuns(run,item).comparable);
      if(baseline)baselineSelect.value=baseline.id;
      renderSelected();
      if(baseline)renderComparison(compareRuns(run,baseline));
      else{setStatus('Нет второго запуска с тем же сценарием, физическим контрактом и порядком устройств. Повтори испытание без изменений.','warning');clearMetrics();}
      panel.scrollIntoView?.({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    });
    row.append(copy,open);history.append(row);
  }
}
function render(){
  syncSelects();updateHistory();renderSelected();
  const candidate=selectedRun(candidateSelect),baseline=selectedRun(baselineSelect);
  if(candidate&&baseline&&candidate.id!==baseline.id)renderComparison(compareRuns(candidate,baseline));
  else if(candidate){badge.textContent='PASSPORT '+VERSION;setStatus('Паспорт создан. Для проверки воспроизводимости нужен второй запуск с тем же контрактом и конфигурацией.','warning');clearMetrics();}
}
function onRunFinished(raw){
  if(!raw||!raw.simulationContract){
    setStatus('Запуск не содержит версионированный physics contract. Переиграй уровень в актуальной версии; неподписанные старые записи не объявляются воспроизводимыми.','error');return;
  }
  const rawId='rpk-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
  const run=normalizeRun({...raw,id:rawId,at:raw.at||new Date().toISOString()});
  if(!run){setStatus('Паспорт не создан: структура контракта, телеметрия или траектория не прошли проверку.','error');return;}
  runs=runs.filter(item=>item.id!==run.id);runs.unshift(run);runs=runs.slice(0,MAX_RUNS);
  const stored=persist();
  render();
  const baseline=runs.find(item=>item.id!==run.id&&compareRuns(run,item).comparable);
  if(baseline){
    candidateSelect.value=run.id;baselineSelect.value=baseline.id;
    renderSelected();renderComparison(compareRuns(run,baseline));
  }else{
    candidateSelect.value=run.id;renderSelected();badge.textContent='PASSPORT CREATED';
    setStatus('Паспорт нового запуска сохранён'+(stored?' локально':' только в памяти')+'. Следующий идентичный запуск позволит измерить повторяемость.','warning');clearMetrics();
  }
}
function exportPassport(){
  const run=selectedRun(candidateSelect);
  if(!run){setStatus('Нет паспорта для экспорта.','warning');return;}
  download('cascade-lab-reproducibility-'+run.id+'.json',JSON.stringify({schema:SCHEMA,schemaVersion:1,run},null,2),'application/json;charset=utf-8');
  setStatus('Паспорт выбранного запуска сохранён. Данные не отправлялись.','success');
}
function exportArchive(){
  const archiveData={schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs};
  download('cascade-lab-reproducibility-archive.json',JSON.stringify(archiveData,null,2),'application/json;charset=utf-8');
  setStatus('Локальный архив экспортирован. Данные не отправлялись.','success');
}
async function importArchive(file){
  if(!file)return;
  if(file.size>MAX_IMPORT_BYTES){setStatus('Файл больше 900 KiB. Импорт отклонён.','error');return;}
  try{
    const incoming=validateArchive(JSON.parse(await file.text()));
    if(!incoming.ok)throw new Error(incoming.reason);
    const combined=[...incoming.archive.runs,...runs],seen=new Set();
    runs=combined.filter(run=>!seen.has(run.id)&&seen.add(run.id)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS);
    if(!persist())throw new Error('Браузер не разрешил сохранить объединённый архив.');
    render();setStatus('Архив проверен: '+incoming.archive.runs.length+' паспортов, всего в локальной истории '+runs.length+'.','success');
  }catch(error){setStatus(clean(error&&error.message||'Импорт отклонён.',220),'error');}
  finally{fileInput.value='';}
}
compareButton.addEventListener('click',()=>{
  const candidate=selectedRun(candidateSelect),baseline=selectedRun(baselineSelect);
  renderSelected();
  if(!candidate||!baseline){setStatus('Выбери два завершённых запуска.','warning');return;}
  renderComparison(compareRuns(candidate,baseline));
});
baselineSelect.addEventListener('change',()=>{renderSelected();const a=selectedRun(candidateSelect),b=selectedRun(baselineSelect);if(a&&b)renderComparison(compareRuns(a,b));});
candidateSelect.addEventListener('change',()=>{renderSelected();const a=selectedRun(candidateSelect),b=selectedRun(baselineSelect);if(a&&b)renderComparison(compareRuns(a,b));});
passportButton.addEventListener('click',exportPassport);
archiveButton.addEventListener('click',exportArchive);
importButton.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',()=>void importArchive(fileInput.files&&fileInput.files[0]));
clearButton.addEventListener('click',()=>{
  if(!window.confirm('Удалить локальные паспорта воспроизводимости из этого браузера?'))return;
  runs=[];try{window.localStorage.removeItem(STORAGE_KEY);}catch{}
  render();setStatus('Локальная история удалена. Внешние файлы экспорта не затронуты.','success');
});
window.addEventListener('cascade-lab:run-finished',event=>onRunFinished(event.detail||{}));
render();
Object.defineProperty(window,'CASCADELAB026',{
  value:Object.freeze({version:VERSION,schema:SCHEMA,engineRevision:ENGINE_REVISION,getRuns:()=>runs.map(run=>({...run})),verifyPassport,compareRuns,validateArchive}),
  configurable:false,enumerable:false,writable:false
});
})();
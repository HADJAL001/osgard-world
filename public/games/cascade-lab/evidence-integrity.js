(() => {
'use strict';

const VERSION = '0.25.0';
const SCHEMA = 'osgard.cascade-lab.evidence-integrity.v1';
const ARCHIVE_SCHEMA = 'osgard.cascade-lab.evidence-integrity-archive.v1';
const MAX_AUDITS = 80;
const MAX_IMPORT_BYTES = 200 * 1024;
const MAX_RUNS = 18;
const MAX_FRAMES = 420;
const TOOLS = new Set(['spring','fan','belt','magnet','switch','bumper']);
const clean = (value, max = 180) => String(value == null ? '' : value).replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrapAngle = value => {
  let angle = value % (Math.PI * 2);
  if (angle > Math.PI) angle -= Math.PI * 2;
  if (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
};
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
function normalizeRun(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 90) return null;
  if (!['won','lost'].includes(raw.status) || !Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5) return null;
  const stamp = Date.parse(raw.at);
  if (!Number.isFinite(stamp)) return null;
  const mode = clean(raw.mode || 'campaign', 24) || 'campaign';
  const dailyDate = typeof raw.dailyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyDate) ? raw.dailyDate : null;
  const devices = (Array.isArray(raw.devices) ? raw.devices : []).slice(0, 12).filter(device =>
    device && typeof device === 'object' && TOOLS.has(device.type) &&
    finite(device.x) && device.x >= -100 && device.x <= 1200 &&
    finite(device.y) && device.y >= -100 && device.y <= 700 &&
    finite(device.angle) && Math.abs(device.angle) <= Math.PI * 64
  ).map(device => ({
    type: device.type,
    x: round(device.x, 1),
    y: round(device.y, 1),
    angle: round(wrapAngle(device.angle), 3)
  }));
  const trajectory = (Array.isArray(raw.trajectory) ? raw.trajectory : []).slice(0, MAX_FRAMES)
    .filter(point => point && finite(point.t) && point.t >= 0 && point.t <= 120 && finite(point.x) && finite(point.y))
    .map(point => ({
      t: round(point.t, 3), x: round(point.x, 2), y: round(point.y, 2),
      vx: finite(point.vx) ? round(point.vx, 2) : null,
      vy: finite(point.vy) ? round(point.vy, 2) : null,
      gateOpen: point.gateOpen === true,
      checkpoints: Array.isArray(point.checkpoints) ? point.checkpoints.slice(0, 20).map(value => clean(value, 80)) : []
    }));
  if (trajectory.length < 2) return null;
  const telemetry = raw.telemetry && typeof raw.telemetry === 'object' ? raw.telemetry : {};
  return {
    schema: SCHEMA,
    id: clean(raw.id, 90),
    at: new Date(stamp).toISOString(),
    status: raw.status,
    levelId: raw.levelId,
    levelTitle: clean(raw.levelTitle || ('Протокол #' + raw.levelId), 120),
    mode, dailyDate,
    timeSeconds: clamp(finite(raw.timeSeconds) ? raw.timeSeconds : trajectory.at(-1).t, 0, 120),
    deviceCount: Number.isInteger(raw.deviceCount) ? clamp(raw.deviceCount, 0, 12) : devices.length,
    grade: clean(raw.grade || '—', 8),
    par: Number.isInteger(raw.par) ? clamp(raw.par, 0, 12) : null,
    parTime: finite(raw.parTime) ? clamp(raw.parTime, 0, 120) : null,
    telemetry: {
      peakSpeed: finite(telemetry.peakSpeed) ? clamp(telemetry.peakSpeed, 0, 100000) : null,
      lastImpactSpeed: finite(telemetry.lastImpactSpeed) ? clamp(telemetry.lastImpactSpeed, 0, 100000) : null,
      distance: finite(telemetry.distance) ? clamp(telemetry.distance, 0, 1000000) : null,
      activations: Number.isInteger(telemetry.activations) ? clamp(telemetry.activations, 0, 10000) : 0,
      contacts: Number.isInteger(telemetry.contacts) ? clamp(telemetry.contacts, 0, 10000) : 0
    },
    devices, trajectory
  };
}
function scenarioKey(run) {
  return run ? [run.levelId, run.mode, run.dailyDate || ''].join('|') : '';
}
function blueprintPayload(run) {
  if (!run) return null;
  const devices = run.devices.map(device => ({
    type: device.type, x: round(device.x, 1), y: round(device.y, 1), angle: round(wrapAngle(device.angle), 3)
  })).sort((a,b) => a.type.localeCompare(b.type) || a.x-b.x || a.y-b.y || a.angle-b.angle);
  return { levelId: run.levelId, devices };
}
function blueprintSignature(run) {
  return run ? 'EI25-' + fnv1a(canonicalize(blueprintPayload(run))) : null;
}
function interpolate(trace, time) {
  if (!trace.length) return null;
  if (time <= trace[0].t) return trace[0];
  if (time >= trace.at(-1).t) return trace.at(-1);
  let low = 0, high = trace.length - 1;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (trace[mid].t <= time) low = mid; else high = mid;
  }
  const a = trace[low], b = trace[high];
  const ratio = (time-a.t) / Math.max(0.0001,b.t-a.t);
  return { t:time, x:a.x+(b.x-a.x)*ratio, y:a.y+(b.y-a.y)*ratio };
}
function trajectoryDeviation(a, b, samples = 41) {
  if (!a || !b || a.trajectory.length < 2 || b.trajectory.length < 2) return null;
  const durationA = a.trajectory.at(-1).t - a.trajectory[0].t;
  const durationB = b.trajectory.at(-1).t - b.trajectory[0].t;
  if (!(durationA > 0) || !(durationB > 0)) return null;
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const ratio = i / (samples-1);
    const pa = interpolate(a.trajectory, a.trajectory[0].t + durationA*ratio);
    const pb = interpolate(b.trajectory, b.trajectory[0].t + durationB*ratio);
    total += Math.hypot(pa.x-pb.x,pa.y-pb.y);
  }
  return round(total/samples, 2);
}
function compareBlueprints(baseline, candidate) {
  const left = baseline.devices.map((device,index)=>({...device,_index:index,_used:false}));
  const right = candidate.devices.map((device,index)=>({...device,_index:index,_used:false}));
  const potential = [];
  for (const a of left) for (const b of right) {
    if (a.type !== b.type) continue;
    const position = Math.hypot(a.x-b.x,a.y-b.y);
    const angle = Math.abs(wrapAngle(b.angle-a.angle));
    potential.push({a,b,cost:position+angle*24,position,angle});
  }
  potential.sort((a,b)=>a.cost-b.cost||a.a._index-b.a._index||a.b._index-b.b._index);
  const matched = [];
  for (const pair of potential) {
    if (pair.a._used||pair.b._used) continue;
    pair.a._used=true;pair.b._used=true;matched.push(pair);
  }
  const changes=[];
  for(const pair of matched){
    if(pair.position>5)changes.push({
      kind:'position',label:'Положение: '+pair.a.type,
      before:{x:pair.a.x,y:pair.a.y},after:{x:pair.b.x,y:pair.b.y},
      magnitude:round(pair.position,2)
    });
    if(pair.angle>0.035)changes.push({
      kind:'angle',label:'Угол: '+pair.a.type,
      before:{angle:pair.a.angle},after:{angle:pair.b.angle},
      magnitude:round(pair.angle*180/Math.PI,2)
    });
  }
  for(const item of left.filter(device=>!device._used))changes.push({
    kind:'removed',label:'Удалена деталь: '+item.type,before:{type:item.type,x:item.x,y:item.y,angle:item.angle},after:null,magnitude:1
  });
  for(const item of right.filter(device=>!device._used))changes.push({
    kind:'added',label:'Добавлена деталь: '+item.type,before:null,after:{type:item.type,x:item.x,y:item.y,angle:item.angle},magnitude:1
  });
  return {baselineSignature:blueprintSignature(baseline),candidateSignature:blueprintSignature(candidate),
    changedVariables:changes.length,changes:changes.slice(0,24),sameBlueprint:changes.length===0};
}
function median(values) {
  const sorted=values.filter(finite).slice().sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const middle=Math.floor(sorted.length/2);
  return round(sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2,3);
}
function groupSummary(runs) {
  const successes=runs.filter(run=>run.status==='won').length;
  const wins=runs.length?successes/runs.length:null;
  const successTimes=runs.filter(run=>run.status==='won').map(run=>run.timeSeconds);
  const durations=runs.map(run=>run.timeSeconds);
  const med=median(durations),mad=med===null?null:median(durations.map(value=>Math.abs(value-med)));
  return {count:runs.length,successes,successRate:wins===null?null:round(wins*100,1),
    medianTimeSeconds:median(successTimes),allRunMedianSeconds:med,
    timeMedianAbsoluteDeviationSeconds:mad};
}
function guidanceFor(tier,changeCount,baselineGroup,candidateGroup) {
  if(tier==='not-comparable')return 'Выбери попытки из одного уровня и одного режима. Не сравнивай сюжет, ежедневное испытание и дуэль как один сценарий.';
  if(tier==='same-setup-control')return 'Чертёж не изменился. Используй эту пару как контроль повторяемости, затем сравни разброс времени, исхода и траекторий.';
  if(tier==='confounded')return 'Изменено несколько параметров ('+changeCount+'). Раздели работу на отдельные опыты: сохрани базу, измени одну настройку и повтори запуск.';
  if(tier==='single-variable-contrast')return 'Изменён один параметр, но повторов недостаточно. Повтори базовую и изменённую конфигурации минимум ещё по одному разу в том же сценарии.';
  if(tier==='repeated-single-variable-pattern')return 'В обеих конфигурациях есть повторы. Проверь устойчивость результата на новых запусках; это повторяемая наблюдаемая связь, не доказательство причинности.';
  return 'Сначала собери сопоставимые записи. Не делай вывод о причине, если сценарии или конфигурации отличаются непредусмотренным образом.';
}
function analyzeContrast(rawBaseline,rawCandidate,rawRuns=[]) {
  const baseline=normalizeRun(rawBaseline),candidate=normalizeRun(rawCandidate);
  if(!baseline||!candidate)return {ok:false,error:'Для анализа нужны две корректные записи с траекторией минимум из двух кадров.'};
  if(baseline.id===candidate.id)return {ok:false,error:'Выбрана одна и та же запись дважды.'};
  const compatible=scenarioKey(baseline)===scenarioKey(candidate);
  const diff=compareBlueprints(baseline,candidate);
  const peers=(Array.isArray(rawRuns)?rawRuns:[]).map(normalizeRun).filter(Boolean)
    .filter(run=>scenarioKey(run)===scenarioKey(baseline));
  const baselineGroup=peers.filter(run=>blueprintSignature(run)===diff.baselineSignature);
  const candidateGroup=peers.filter(run=>blueprintSignature(run)===diff.candidateSignature);
  let tier='not-comparable';
  if(compatible){
    if(diff.changedVariables===0)tier='same-setup-control';
    else if(diff.changedVariables>1)tier='confounded';
    else if(baselineGroup.length>=2&&candidateGroup.length>=2)tier='repeated-single-variable-pattern';
    else tier='single-variable-contrast';
  }
  const bg=groupSummary(baselineGroup),cg=groupSummary(candidateGroup);
  const outcomeDelta=round((candidate.status==='won'?100:0)-(baseline.status==='won'?100:0),1);
  const medianTimeDelta=bg.medianTimeSeconds===null||cg.medianTimeSeconds===null?null:round(cg.medianTimeSeconds-bg.medianTimeSeconds,3);
  const pathDelta=trajectoryDeviation(candidate,baseline);
  return {
    ok:true,schema:SCHEMA,version:VERSION,compatible,tier,
    baseline:{id:baseline.id,at:baseline.at,levelId:baseline.levelId,levelTitle:baseline.levelTitle,mode:baseline.mode,dailyDate:baseline.dailyDate,status:baseline.status,timeSeconds:round(baseline.timeSeconds,3),deviceCount:baseline.deviceCount,signature:diff.baselineSignature},
    candidate:{id:candidate.id,at:candidate.at,levelId:candidate.levelId,levelTitle:candidate.levelTitle,mode:candidate.mode,dailyDate:candidate.dailyDate,status:candidate.status,timeSeconds:round(candidate.timeSeconds,3),deviceCount:candidate.deviceCount,signature:diff.candidateSignature},
    changes:diff.changes,changedVariables:diff.changedVariables,sameBlueprint:diff.sameBlueprint,
    comparison:{
      outcomeDeltaPercentagePoints:outcomeDelta,timeDeltaSeconds:round(candidate.timeSeconds-baseline.timeSeconds,3),
      deviceCountDelta:candidate.deviceCount-baseline.deviceCount,
      peakSpeedDelta:finite(candidate.telemetry.peakSpeed)&&finite(baseline.telemetry.peakSpeed)?round(candidate.telemetry.peakSpeed-baseline.telemetry.peakSpeed,2):null,
      impactSpeedDelta:finite(candidate.telemetry.lastImpactSpeed)&&finite(baseline.telemetry.lastImpactSpeed)?round(candidate.telemetry.lastImpactSpeed-baseline.telemetry.lastImpactSpeed,2):null,
      activationDelta:candidate.telemetry.activations-baseline.telemetry.activations,
      distanceDelta:finite(candidate.telemetry.distance)&&finite(baseline.telemetry.distance)?round(candidate.telemetry.distance-baseline.telemetry.distance,2):null,
      meanTrajectoryDeviation:compatible?pathDelta:null
    },
    baselineGroup:bg,candidateGroup:cg,
    interpretation:{
      title:({
        'not-comparable':'Несопоставимые сценарии',
        'same-setup-control':'Контрольный повтор одного чертежа',
        'confounded':'Смешанный опыт: изменено несколько параметров',
        'single-variable-contrast':'Однофакторное сравнение',
        'repeated-single-variable-pattern':'Повторяемый однофакторный сигнал'
      })[tier],
      guidance:guidanceFor(tier,diff.changedVariables,bg,cg),
      limitation:'Данные описывают наблюдаемую связь. Даже повторяемый сигнал не доказывает причинность: могли влиять неучтённые условия, точность измерений или особенности игровой физики.'
    }
  };
}
function cleanAudit(raw) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==SCHEMA||typeof raw.id!=='string'||!/^eia_[a-f0-9]{20}$/.test(raw.id)||!Number.isFinite(Date.parse(raw.createdAt)))return null;
  const a=raw.analysis;
  if(!a||a.schema!==SCHEMA||!['not-comparable','same-setup-control','confounded','single-variable-contrast','repeated-single-variable-pattern'].includes(a.tier)||
    !a.baseline||!a.candidate||typeof a.baseline.id!=='string'||typeof a.candidate.id!=='string'||
    !Number.isInteger(a.baseline.levelId)||!Number.isInteger(a.candidate.levelId)||
    !Array.isArray(a.changes)||a.changes.length>24||!a.comparison||!a.interpretation)return null;
  const safeChanges=a.changes.map(change=>{
    if(!change||!['position','angle','removed','added'].includes(change.kind))return null;
    return {
      kind:change.kind,label:clean(change.label,100),
      before:change.before&&typeof change.before==='object'?change.before:null,
      after:change.after&&typeof change.after==='object'?change.after:null,
      magnitude:finite(change.magnitude)?round(change.magnitude,3):null
    };
  });
  if(safeChanges.some(change=>!change))return null;
  const safeGroup=group=>{
    const g=group&&typeof group==='object'?group:{};
    return {
      count:clamp(Math.round(Number(g.count)||0),0,MAX_RUNS),
      successes:clamp(Math.round(Number(g.successes)||0),0,MAX_RUNS),
      successRate:finite(g.successRate)?clamp(g.successRate,0,100):null,
      medianTimeSeconds:finite(g.medianTimeSeconds)?clamp(g.medianTimeSeconds,0,120):null,
      allRunMedianSeconds:finite(g.allRunMedianSeconds)?clamp(g.allRunMedianSeconds,0,120):null,
      timeMedianAbsoluteDeviationSeconds:finite(g.timeMedianAbsoluteDeviationSeconds)?clamp(g.timeMedianAbsoluteDeviationSeconds,0,120):null
    };
  };
  const safeRun=run=>({
    id:clean(run.id,90),at:clean(run.at,40),
    levelId:run.levelId,levelTitle:clean(run.levelTitle,120),mode:clean(run.mode,24),
    dailyDate:typeof run.dailyDate==='string'?run.dailyDate:null,
    status:run.status==='won'?'won':'lost',
    timeSeconds:finite(run.timeSeconds)?clamp(run.timeSeconds,0,120):null,
    deviceCount:Number.isInteger(run.deviceCount)?clamp(run.deviceCount,0,12):null,
    signature:clean(run.signature,24)
  });
  const normalizedAnalysis={
    schema:SCHEMA,
    baseline:safeRun(a.baseline),
    candidate:safeRun(a.candidate),
    compatible:a.compatible===true,
    tier:a.tier,
    changedVariables:clamp(Math.round(Number(a.changedVariables)||0),0,24),
    sameBlueprint:a.sameBlueprint===true,
    changes:safeChanges,
    comparison:{
      outcomeDeltaPercentagePoints:finite(a.comparison.outcomeDeltaPercentagePoints)?clamp(a.comparison.outcomeDeltaPercentagePoints,-100,100):null,
      timeDeltaSeconds:finite(a.comparison.timeDeltaSeconds)?clamp(a.comparison.timeDeltaSeconds,-120,120):null,
      deviceCountDelta:finite(a.comparison.deviceCountDelta)?clamp(a.comparison.deviceCountDelta,-12,12):null,
      peakSpeedDelta:finite(a.comparison.peakSpeedDelta)?clamp(a.comparison.peakSpeedDelta,-100000,100000):null,
      impactSpeedDelta:finite(a.comparison.impactSpeedDelta)?clamp(a.comparison.impactSpeedDelta,-100000,100000):null,
      activationDelta:finite(a.comparison.activationDelta)?clamp(a.comparison.activationDelta,-10000,10000):null,
      distanceDelta:finite(a.comparison.distanceDelta)?clamp(a.comparison.distanceDelta,-1000000,1000000):null,
      meanTrajectoryDeviation:finite(a.comparison.meanTrajectoryDeviation)?clamp(a.comparison.meanTrajectoryDeviation,0,2000):null
    },
    baselineGroup:safeGroup(a.baselineGroup),
    candidateGroup:safeGroup(a.candidateGroup),
    interpretation:{
      title:clean(a.interpretation.title,120),
      guidance:clean(a.interpretation.guidance,500),
      limitation:clean(a.interpretation.limitation,500)
    }
  };
  return {
    schema:SCHEMA,id:raw.id,createdAt:new Date(Date.parse(raw.createdAt)).toISOString(),
    analysis:normalizedAnalysis
  };
}
function validateArchive(raw) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==ARCHIVE_SCHEMA||raw.schemaVersion!==1||!Array.isArray(raw.audits))return{ok:false,error:'Неизвестная схема архива Evidence Integrity.'};
  if(raw.audits.length>MAX_AUDITS)return{ok:false,error:'Архив превышает лимит из '+MAX_AUDITS+' сравнений.'};
  let bytes;
  try{bytes=JSON.stringify(raw).length}catch{return{ok:false,error:'Архив невозможно прочитать.'}}
  if(bytes>MAX_IMPORT_BYTES)return{ok:false,error:'Файл превышает 200 KiB. Импорт отклонён.'};
  const audits=raw.audits.map(cleanAudit);
  if(audits.some(audit=>!audit))return{ok:false,error:'Одна или несколько записей не прошли проверку структуры.'};
  const ids=new Set();
  for(const audit of audits){if(ids.has(audit.id))return{ok:false,error:'В архиве найдены повторяющиеся ID сравнений.'};ids.add(audit.id)}
  return{ok:true,archive:{schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),audits:audits.slice().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))}};
}
function createReport(baseline,candidate,runs,options={}) {
  const analysis=analyzeContrast(baseline,candidate,runs);
  if(!analysis.ok)return analysis;
  const stamp=options.now&&Number.isFinite(Date.parse(options.now))?new Date(options.now).toISOString():new Date().toISOString();
  const reportKey=analysis.baseline.id+'|'+analysis.candidate.id+'|'+stamp;
  const generatedId='eia_'+fnv1a(reportKey).toLowerCase()+fnv1a(reportKey+'|b').toLowerCase()+fnv1a(reportKey+'|c').toLowerCase().slice(0,4);
  const id=clean(options.id||generatedId,80);
  if(!/^eia_[a-f0-9]{20}$/.test(id))return{ok:false,error:'Не удалось сформировать ID отчёта.'};
  return{ok:true,report:cleanAudit({schema:SCHEMA,id,createdAt:stamp,analysis}),analysis};
}
function csvCell(value) {
  let textValue=value==null?'':String(value);
  if(/^[\s\u0000-\u001f]*[=+\-@]/.test(textValue))textValue="'"+textValue;
  return '"'+textValue.replace(/"/g,'""')+'"';
}
const pureApi=Object.freeze({
  version:VERSION,schema:SCHEMA,archiveSchema:ARCHIVE_SCHEMA,maxAudits:MAX_AUDITS,maxImportBytes:MAX_IMPORT_BYTES,
  canonicalize,fnv1a,normalizeRun,scenarioKey,blueprintPayload,blueprintSignature,compareBlueprints,trajectoryDeviation,
  groupSummary,analyzeContrast,createReport,cleanAudit,validateArchive,csvCell
});
if(typeof window==='undefined'||!window.document){globalThis.__CASCADELAB025_TEST__=pureApi;return}
if(window.CASCADELAB025)return;
const xray=window.CASCADELAB022;
if(!xray||typeof xray.getRuns!=='function'||typeof xray.compareRuns!=='function')return;

const STYLE=[
'.cl-evidence{margin:18px 0 24px;padding:clamp(14px,2.2vw,24px);border:1px solid #73dfd74a;border-radius:17px;background:radial-gradient(ellipse at 3% 0%,#45c9c014,transparent 38%),radial-gradient(ellipse at 94% 0%,#8c75ff13,transparent 44%),linear-gradient(145deg,#0c1a22,#071016);color:#eaf5f8;box-shadow:0 18px 48px #0003}.cl-evidence *{box-sizing:border-box}.cl-evidence-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.cl-evidence-kicker{margin:0;color:#79e8de;font:8px ui-monospace,monospace;letter-spacing:.18em}.cl-evidence-badge{padding:5px 8px;border:1px solid #79e8de4f;border-radius:6px;color:#9cf3ea;font:8px ui-monospace,monospace}.cl-evidence h3{margin:9px 0;color:#f3f8fb;font:400 clamp(24px,3vw,36px)/1.1 Georgia,serif;letter-spacing:-.025em}.cl-evidence-lead{max-width:850px;margin:8px 0 15px;color:#a4bcc8;font-size:10px;line-height:1.75}.cl-evidence-pickers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.cl-evidence-field{display:grid;gap:6px;min-width:0}.cl-evidence-field label{color:#83a4b2;font:8px ui-monospace,monospace;letter-spacing:.08em}.cl-evidence select,.cl-evidence input{width:100%;min-width:0;min-height:40px;padding:9px 10px;border:1px solid #88c4d133;border-radius:8px;background:#06131c;color:#e7f2f6;font:10px system-ui,sans-serif}.cl-evidence select:focus-visible,.cl-evidence button:focus-visible,.cl-evidence input:focus-visible{outline:2px solid #8af4e8;outline-offset:3px}.cl-evidence-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.cl-evidence-button{min-height:38px;padding:9px 11px;border:1px solid #82c8d13b;border-radius:8px;background:#0a2029;color:#d6f0f3;font:750 9px ui-monospace,monospace;cursor:pointer}.cl-evidence-button.primary{border-color:#93f1e48c;background:linear-gradient(135deg,#a7f0e5,#5ecac3);color:#07211f}.cl-evidence-button.danger{color:#ffb5ac;border-color:#ff9f9844;background:#241419}.cl-evidence-button:disabled{opacity:.4;cursor:not-allowed}.cl-evidence-report{margin-top:13px}.cl-evidence-empty{padding:15px;border:1px dashed #85c3d034;border-radius:10px;color:#8ea8b5;font-size:10px;line-height:1.7}.cl-evidence-summary{padding:14px;border:1px solid #83e1db35;border-radius:11px;background:linear-gradient(130deg,#102a32,#09151d)}.cl-evidence-summary h4{margin:0;color:#effbf9;font:400 23px/1.2 Georgia,serif}.cl-evidence-summary p{margin:7px 0 0;color:#b4cbd3;font-size:10px;line-height:1.7}.cl-evidence-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:9px}.cl-evidence-metric{min-width:0;padding:9px;border:1px solid #8abfcb24;border-radius:9px;background:#06131b}.cl-evidence-metric span{display:block;color:#6f96a7;font:7px ui-monospace,monospace;letter-spacing:.06em}.cl-evidence-metric b{display:block;margin-top:6px;color:#edf8fa;font:500 16px Georgia,serif;overflow-wrap:anywhere}.cl-evidence-section{margin-top:9px;padding:11px;border:1px solid #8abfcb25;border-radius:9px;background:#07131b}.cl-evidence-section h5{margin:0 0 7px;color:#a3d7de;font:8px ui-monospace,monospace;letter-spacing:.12em}.cl-evidence-list{display:grid;gap:5px}.cl-evidence-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:7px 8px;border:1px solid #7ebdca1b;border-radius:7px;background:#091923;color:#c7dce3;font-size:9px;line-height:1.5}.cl-evidence-row small{color:#7b9dac;font:8px ui-monospace,monospace}.cl-evidence-finding{padding:9px 10px;border-left:2px solid #85ebe0;border-radius:0 7px 7px 0;background:#58ddcf0b;color:#d8f3f2;font-size:10px;line-height:1.7}.cl-evidence-history{display:grid;gap:6px;margin-top:12px}.cl-evidence-history-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 9px;border:1px solid #80bdcb22;border-radius:8px;background:#06121a}.cl-evidence-history-row strong{display:block;color:#d5e9ee;font-size:9px}.cl-evidence-history-row small{display:block;margin-top:4px;color:#7897a5;font:7px/1.5 ui-monospace,monospace}.cl-evidence-history-actions{display:flex;gap:5px;flex-wrap:wrap}.cl-evidence-history-actions button{min-height:30px;padding:5px 7px;border:1px solid #8bc6d130;border-radius:6px;background:#0a2029;color:#bfe8ed;font-size:8px}.cl-evidence-status{min-height:20px;margin:10px 0 0;color:#88e3d5;font-size:9px;line-height:1.6;overflow-wrap:anywhere}.cl-evidence-status[data-kind=error]{color:#ffaaa6}.cl-evidence-foot{margin:8px 0 0;padding-top:9px;border-top:1px solid #8ac0cc1d;color:#6d8a99;font:7px/1.65 ui-monospace,monospace}.cl-evidence[hidden],.cl-evidence [hidden]{display:none!important}@media(max-width:680px){.cl-evidence-pickers{grid-template-columns:1fr}.cl-evidence-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-evidence-toolbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cl-evidence-button{width:100%;min-height:42px}.cl-evidence-history-row{grid-template-columns:1fr}.cl-evidence-history-actions{justify-content:flex-start}}@media(prefers-reduced-motion:reduce){.cl-evidence *{transition:none!important;animation:none!important}}'
].join('');
const style=document.createElement('style');style.dataset.cascadeLabEvidence=VERSION;style.textContent=STYLE;document.head.append(style);
const make=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=String(value);return node};
const $=selector=>panel.querySelector(selector);
const panel=make('section','cl-evidence');panel.id='cascade-evidence-integrity';panel.setAttribute('aria-labelledby','cl-evidence-title');panel.setAttribute('aria-live','polite');
const head=make('div','cl-evidence-head');head.append(make('p','cl-evidence-kicker','CASCADE LAB / EVIDENCE INTEGRITY LAB'));
head.append(make('span','cl-evidence-badge','VERSION '+VERSION));
const title=make('h3','','Проверь качество доказательств, а не только результат.');title.id='cl-evidence-title';
panel.append(head,title,make('p','cl-evidence-lead','Сравни два запуска одного сценария. Лаборатория найдёт изменённые детали и параметры, проверит число повторов и покажет, где выводы пока ненадёжны. Никакая оценка не объявляется доказанной причинностью.'));
const pickers=make('div','cl-evidence-pickers');
const baseField=make('div','cl-evidence-field');baseField.append(make('label','','БАЗОВАЯ ПОПЫТКА'));
const baselineSelect=make('select');baselineSelect.id='cl-evidence-baseline';baselineSelect.setAttribute('aria-label','Базовая попытка для сравнения');baseField.append(baselineSelect);
const candidateField=make('div','cl-evidence-field');candidateField.append(make('label','','ИЗМЕНЁННАЯ ПОПЫТКА'));
const candidateSelect=make('select');candidateSelect.id='cl-evidence-candidate';candidateSelect.setAttribute('aria-label','Изменённая попытка для сравнения');candidateField.append(candidateSelect);
pickers.append(baseField,candidateField);panel.append(pickers);
const toolbar=make('div','cl-evidence-toolbar');
const analyzeButton=make('button','cl-evidence-button primary','Проверить сравнение ↗');analyzeButton.type='button';
const exportButton=make('button','cl-evidence-button','Экспорт JSON');exportButton.type='button';
const csvButton=make('button','cl-evidence-button','Экспорт CSV');csvButton.type='button';
const importButton=make('button','cl-evidence-button','Импорт архива');importButton.type='button';
const clearButton=make('button','cl-evidence-button danger','Очистить историю');clearButton.type='button';
const fileInput=make('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.hidden=true;fileInput.setAttribute('aria-label','Выбрать архив Evidence Integrity JSON');
toolbar.append(analyzeButton,exportButton,csvButton,importButton,clearButton);panel.append(toolbar,fileInput);
const report=make('div','cl-evidence-report');const status=make('p','cl-evidence-status','Запусти минимум два обычных испытания, чтобы проверить качество сравнения.');
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const history=make('div','cl-evidence-history');const foot=make('p','cl-evidence-foot','LOCAL-ONLY · сравнение использует сохранённые X-Ray-траектории · архив ограничен 80 отчётами / 200 KiB · выводы не доказывают причинность');
panel.append(report,history,status,foot);
const mount=document.querySelector('#cascade-adaptive-mission-director')||document.querySelector('.cl-engineering')||document.querySelector('.cl-xray');
if(!mount)return;
mount.after(panel);

let audits=loadAudits(),activeReport=audits[0]||null,lastAnalysis=null;
function loadAudits(){
 try{
  const raw=JSON.parse(window.localStorage.getItem(ARCHIVE_SCHEMA)||'null');
  if(!raw)return[];
  const checked=validateArchive(raw);return checked.ok?checked.archive.audits.slice(0,MAX_AUDITS):[];
 }catch{return[]}
}
function archivePayload(){return{schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),audits}}
function persist(){
 audits=audits.slice().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,MAX_AUDITS);
 try{window.localStorage.setItem(ARCHIVE_SCHEMA,JSON.stringify(archivePayload()));status.dataset.kind='success';status.textContent='Отчёт сохранён локально. Никакие записи не отправлялись.';return true}
 catch{status.dataset.kind='error';status.textContent='Браузер не разрешил сохранить архив. Экспорт по кнопке всё ещё доступен.';return false}
}
function getRuns(){try{return xray.getRuns().map(normalizeRun).filter(Boolean).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))}catch{return[]}}
function runOption(run){
 const result=run.status==='won'?'✓':'×';
 const date=new Date(run.at).toLocaleString();
 return result+' L'+run.levelId+' · '+run.mode+(run.dailyDate?' '+run.dailyDate:'')+' · '+run.timeSeconds.toFixed(2)+' с · '+run.devices.length+' деталей · '+date+' · '+run.id.slice(-10);
}
function fillSelect(select,runs,currentId){
 const old=select.value;select.replaceChildren();
 const placeholder=make('option','','Выбери сохранённую попытку');placeholder.value='';select.append(placeholder);
 for(const run of runs){const option=make('option','',runOption(run));option.value=run.id;select.append(option)}
 select.value=runs.some(run=>run.id===currentId)?currentId:(runs.some(run=>run.id===old)?old:'');
}
function renderSelectors(){
 const runs=getRuns();const previousBase=baselineSelect.value,previousCandidate=candidateSelect.value;
 fillSelect(baselineSelect,runs,previousBase);fillSelect(candidateSelect,runs,previousCandidate);
 if(runs.length>=2){
  if(!candidateSelect.value)candidateSelect.value=runs[0].id;
  if(!baselineSelect.value)baselineSelect.value=runs.find(run=>run.id!==candidateSelect.value&&scenarioKey(run)===scenarioKey(runs[0]))?.id||runs.find(run=>run.id!==candidateSelect.value)?.id||'';
 }
 analyzeButton.disabled=runs.length<2||!baselineSelect.value||!candidateSelect.value||baselineSelect.value===candidateSelect.value;
 if(runs.length<2)status.textContent='Для проверки нужны минимум две завершённые записи с траекториями. Сначала сыграй два испытания.';
}
function download(filename,data,mime){
 const url=URL.createObjectURL(new Blob([data],{type:mime}));const link=make('a');link.href=url;link.download=filename;link.hidden=true;panel.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function exportJson(){
 const payload={schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),audits};
 download('cascade-lab-evidence-integrity-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8');
 status.textContent='Архив сравнений сохранён в JSON на устройстве.';
}
function exportCsv(){
 const rows=[['id','createdAt','levelId','mode','tier','baselineId','candidateId','changedVariables','outcomeDeltaPP','timeDeltaSeconds','deviceCountDelta','peakSpeedDelta','impactSpeedDelta','trajectoryDeviationPx','baselineRepeats','candidateRepeats','interpretation']];
 for(const audit of audits){const a=audit.analysis;rows.push([audit.id,a.baseline.levelId,a.baseline.mode,a.tier,a.baseline.id,a.candidate.id,a.changedVariables,a.comparison.outcomeDeltaPercentagePoints,a.comparison.timeDeltaSeconds,a.comparison.deviceCountDelta,a.comparison.peakSpeedDelta,a.comparison.impactSpeedDelta,a.comparison.meanTrajectoryDeviation,a.baselineGroup.count,a.candidateGroup.count,a.interpretation.title].map((value,index)=>index===0?value:value));rows[rows.length-1].splice(1,0,audit.createdAt)}
 download('cascade-lab-evidence-integrity-'+new Date().toISOString().slice(0,10)+'.csv','\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
 status.textContent='Сводка сравнений сохранена в CSV.';
}
function tierLabel(tier){return({
 'not-comparable':'НЕСОПОСТАВИМЫЕ СЦЕНАРИИ',
 'same-setup-control':'КОНТРОЛЬНЫЙ ПОВТОР',
 'confounded':'СМЕШАННЫЙ ОПЫТ',
 'single-variable-contrast':'ОДНОФАКТОРНЫЙ КОНТРАСТ',
 'repeated-single-variable-pattern':'ПОВТОРЯЕМЫЙ ОДНОФАКТОРНЫЙ СИГНАЛ'
})[tier]||'НЕТ ДАННЫХ'}
function metric(label,value){const card=make('div','cl-evidence-metric');card.append(make('span','',label),make('b','',value));return card}
function formatDelta(value,suffix=''){
 if(value===null||value===undefined)return'—';
 return(value>0?'+':'')+String(round(value,3)).replace('.',',')+suffix;
}
function renderReport(audit){
 report.replaceChildren();
 if(!audit){report.append(make('div','cl-evidence-empty','Выбери базовую и изменённую попытки, затем запусти аудит. Сначала проверь, что обе попытки относятся к одному уровню и игровому режиму.'));return}
 const a=audit.analysis;activeReport=audit;
 const summary=make('section','cl-evidence-summary');
 summary.append(make('h4','',a.interpretation.title),make('p','',tierLabel(a.tier)+' · '+(a.compatible?'СЦЕНАРИЙ СОВПАДАЕТ':'СЦЕНАРИЙ РАЗЛИЧАЕТСЯ')));
 summary.append(make('p','',a.interpretation.guidance));
 summary.append(make('p','',a.interpretation.limitation));report.append(summary);
 const metrics=make('div','cl-evidence-metrics');
 metrics.append(metric('ИЗМЕНЁННЫЕ ПАРАМЕТРЫ',String(a.changedVariables)),metric('ДЕЛЬТА ВРЕМЕНИ',formatDelta(a.comparison.timeDeltaSeconds,' с')),metric('ДЕЛЬТА ДЕТАЛЕЙ',formatDelta(a.comparison.deviceCountDelta,'')),metric('РАСХОЖДЕНИЕ ПУТЕЙ',a.comparison.meanTrajectoryDeviation===null?'—':formatDelta(a.comparison.meanTrajectoryDeviation,' px')));
 report.append(metrics);
 const groups=make('section','cl-evidence-section');groups.append(make('h5','','ПОВТОРЫ В ТОЧНОЙ КОНФИГУРАЦИИ'));
 const groupList=make('div','cl-evidence-list');
 for(const [label,g] of [['База',a.baselineGroup],['Изменённый вариант',a.candidateGroup]]){
  const row=make('div','cl-evidence-row');row.append(make('span','',label+' · '+g.count+' повторов · '+(g.successRate===null?'нет данных':g.successRate+'% успехов')+' · медиана успешных '+(g.medianTimeSeconds===null?'—':g.medianTimeSeconds.toFixed(2)+' с')),make('small','',g.timeMedianAbsoluteDeviationSeconds===null?'MAD —':'MAD '+g.timeMedianAbsoluteDeviationSeconds.toFixed(3)+' с'));groupList.append(row)
 }
 groups.append(groupList);report.append(groups);
 const changed=make('section','cl-evidence-section');changed.append(make('h5','','РАЗНИЦА ЧЕРТЕЖЕЙ'));
 const changes=make('div','cl-evidence-list');
 if(!a.changes.length)changes.append(make('div','cl-evidence-empty','В пределах допусков чертежи совпадают. Это сравнение контрольных повторов.'));
 for(const change of a.changes){
  const row=make('div','cl-evidence-row');row.append(make('span','',change.label),make('small','',change.magnitude===null?'':change.kind==='angle'?change.magnitude+'°':change.kind==='position'?change.magnitude+' px':'1 настройка'));changes.append(row)
 }
 changed.append(changes);report.append(changed);
 const observation=make('section','cl-evidence-section');observation.append(make('h5','','ИЗМЕРЕННЫЕ ИЗМЕНЕНИЯ'));
 const observed=make('div','cl-evidence-list');
 const c=a.comparison;
 for(const [label,value] of [
 ['Исход',a.baseline.status+' → '+a.candidate.status],
 ['Скорость пика',formatDelta(c.peakSpeedDelta,' px/s')],
 ['Последний удар',formatDelta(c.impactSpeedDelta,' px/s')],
 ['Активации устройств',formatDelta(c.activationDelta,'')],
 ['Пройденный путь',formatDelta(c.distanceDelta,' px')],
 ['Разница успеха пары',formatDelta(c.outcomeDeltaPercentagePoints,' п.п.')]
 ]){
  const row=make('div','cl-evidence-row');row.append(make('span','',label),make('small','',value));observed.append(row)
 }
 observation.append(observed);report.append(observation);
}
function renderHistory(){
 history.replaceChildren();
 const header=make('div','cl-evidence-head');header.append(make('p','cl-evidence-kicker','ЛОКАЛЬНЫЕ ПРОВЕРКИ'),make('span','cl-evidence-badge',audits.length+' / '+MAX_AUDITS));history.append(header);
 if(!audits.length){history.append(make('p','cl-evidence-empty','Сохранённых сравнений пока нет. Сохрани отчёт после первого аудита.'));return}
 for(const audit of audits.slice(0,MAX_AUDITS)){
  const row=make('article','cl-evidence-history-row'),copy=make('div');
  copy.append(make('strong','',tierLabel(audit.analysis.tier)),make('small','',new Date(audit.createdAt).toLocaleString()+' · L'+audit.analysis.baseline.levelId+' · '+audit.analysis.baseline.id.slice(-8)+' → '+audit.analysis.candidate.id.slice(-8)+' · '+audit.analysis.changedVariables+' изменённых параметров'));
  const actions=make('div','cl-evidence-history-actions'),view=make('button','','Открыть');view.type='button';view.addEventListener('click',()=>renderReport(audit));
  const remove=make('button','','Удалить');remove.type='button';remove.addEventListener('click',()=>{audits=audits.filter(item=>item.id!==audit.id);if(activeReport&&activeReport.id===audit.id)activeReport=null;persist();renderHistory();if(activeReport)renderReport(activeReport);else renderReport(null)});
  actions.append(view,remove);row.append(copy,actions);history.append(row)
 }
}
function compareSelected(){
 const runs=getRuns(),baseline=runs.find(run=>run.id===baselineSelect.value),candidate=runs.find(run=>run.id===candidateSelect.value);
 const result=createReport(baseline,candidate,runs);
 if(!result.ok){status.dataset.kind='error';status.textContent=result.error;return}
 lastAnalysis=result.analysis;
 audits=audits.filter(audit=>audit.id!==result.report.id);audits.unshift(result.report);audits=audits.slice(0,MAX_AUDITS);
 renderReport(result.report);renderHistory();
 if(persist())status.textContent='Аудит сохранён. Уровень доказательств: '+tierLabel(result.analysis.tier)+'. Выводы остаются наблюдательными.';
}
function importArchive(file){
 if(!file)return;
 if(file.size>MAX_IMPORT_BYTES){status.dataset.kind='error';status.textContent='Файл больше 200 KiB; импорт отклонён.';return}
 const reader=new FileReader();
 reader.onerror=()=>{status.dataset.kind='error';status.textContent='Не удалось прочитать архив.'};
 reader.onload=()=>{
  try{
   const incoming=validateArchive(JSON.parse(String(reader.result||'')));
   if(!incoming.ok)throw new Error(incoming.error);
   const all=[...incoming.archive.audits,...audits],seen=new Set();
   audits=all.filter(audit=>!seen.has(audit.id)&&seen.add(audit.id)).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,MAX_AUDITS);
   persist();renderHistory();if(audits[0])renderReport(audits[0]);
   status.textContent='Архив проверен. Объединено сравнений: '+audits.length+'.';
  }catch(error){status.dataset.kind='error';status.textContent=clean(error&&error.message||'Архив отклонён.',220)}
 };
 reader.readAsText(file);
}
analyzeButton.addEventListener('click',compareSelected);
exportButton.addEventListener('click',exportJson);
csvButton.addEventListener('click',exportCsv);
importButton.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',()=>{const file=fileInput.files&&fileInput.files[0];importArchive(file);fileInput.value=''});
clearButton.addEventListener('click',()=>{
 if(!window.confirm('Удалить локальную историю проверок Evidence Integrity?'))return;
 audits=[];activeReport=null;lastAnalysis=null;persist();renderHistory();renderReport(null);
});
baselineSelect.addEventListener('change',()=>{analyzeButton.disabled=!baselineSelect.value||!candidateSelect.value||baselineSelect.value===candidateSelect.value});
candidateSelect.addEventListener('change',()=>{analyzeButton.disabled=!baselineSelect.value||!candidateSelect.value||baselineSelect.value===candidateSelect.value});
window.addEventListener('cascade-lab:run-finished',()=>{
 renderSelectors();
 status.textContent='Новая попытка доступна в аудиторе. Выбери базу и контраст для проверки.';
});
window.addEventListener('storage',event=>{if(event.key===ARCHIVE_SCHEMA){audits=loadAudits();renderHistory()}});
renderSelectors();renderHistory();renderReport(activeReport);
Object.defineProperty(window,'CASCADELAB025',{
 value:Object.freeze({version:VERSION,schema:SCHEMA,getAudits:()=>audits.map(cleanAudit).filter(Boolean),analyzeContrast:(a,b)=>analyzeContrast(a,b,getRuns()),createReport:(a,b)=>createReport(a,b,getRuns()),validateArchive,blueprintSignature,compareBlueprints}),
 configurable:false,enumerable:false,writable:false
});
})();
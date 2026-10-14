(() => {
'use strict';

const VERSION = '0.27.0';
const SCHEMA = 'osgard.cascade-lab.reproducibility-lab.v1';
const ARCHIVE_SCHEMA = 'osgard.cascade-lab.reproducibility-archive.v1';
const STORAGE_KEY = SCHEMA;
const MAX_RUNS = 30;
const MAX_FRAMES = 420;
const MAX_IMPORT_BYTES = 320 * 1024;
const MAX_EVENTS = 32;
const TOOLS = new Set(['spring','fan','belt','magnet','switch','bumper']);
const MODES = new Set(['campaign','daily','duel']);
const IMPROVEMENTS = Object.freeze([
  'versioned-physics-profile',
  'canonical-setup-fingerprint',
  'repeat-identical-setup-action',
  'same-setup-run-cohort',
  'trajectory-repeatability-metrics',
  'outcome-and-event-drift-gate',
  'portable-validated-reproduction-archive'
]);
const clean = (value, max = 180) => String(value == null ? '' : value).replace(/\u0000/g,'').replace(/\s+/g,' ').trim().slice(0,max);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const round = (value, digits = 3) => finite(value) ? Number(value.toFixed(digits)) : null;
const clamp = (value, low, high) => Math.max(low,Math.min(high,value));
const list = value => Array.isArray(value) ? value : [];

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
}
function fnv1a(value, seed = 0x811c9dc5) {
  let hash = seed >>> 0;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash,0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8,'0').toUpperCase();
}
function wrapAngle(value) {
  let angle = value % (Math.PI * 2);
  if (angle > Math.PI) angle -= Math.PI * 2;
  if (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
function normalizeProfile(raw, levelId) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const worldRaw = p.world && typeof p.world === 'object' ? p.world : {};
  const levelRaw = p.level && typeof p.level === 'object' ? p.level : {};
  const point = (v, fallback = {x:0,y:0}) => ({
    x: round(finite(v && v.x) ? clamp(v.x,-200,1400) : fallback.x,2),
    y: round(finite(v && v.y) ? clamp(v.y,-200,850) : fallback.y,2)
  });
  const rect = v => ({
    x: round(finite(v && v.x) ? clamp(v.x,-200,1400) : 0,2),
    y: round(finite(v && v.y) ? clamp(v.y,-200,850) : 0,2),
    w: round(finite(v && v.w) ? clamp(v.w,0,1600) : 0,2),
    h: round(finite(v && v.h) ? clamp(v.h,0,1000) : 0,2)
  });
  const start = point(levelRaw.start);
  const goal = rect(levelRaw.goal);
  const platforms = list(levelRaw.platforms).slice(0,40).map(rect);
  const scenery = list(levelRaw.scenery).slice(0,40).map(rect);
  const gates = list(levelRaw.gates).slice(0,20).map(rect);
  const checkpoints = list(levelRaw.checkpoints).slice(0,20).map(c => ({
    id: clean(c && c.id,80), x: round(finite(c && c.x) ? clamp(c.x,-200,1400) : 0,2),
    y: round(finite(c && c.y) ? clamp(c.y,-200,850) : 0,2),
    radius: round(finite(c && c.radius) ? clamp(c.radius,0,250) : 0,2)
  })).sort((a,b) => a.id.localeCompare(b.id));
  const sw = levelRaw.switchZone && typeof levelRaw.switchZone === 'object' ? rect(levelRaw.switchZone) : null;
  return {
    world: {
      width: round(finite(worldRaw.width) ? clamp(worldRaw.width,100,4000) : 1000,2),
      height: round(finite(worldRaw.height) ? clamp(worldRaw.height,100,3000) : 560,2),
      gravity: round(finite(worldRaw.gravity) ? clamp(worldRaw.gravity,0,10000) : 1060,4),
      radius: round(finite(worldRaw.radius) ? clamp(worldRaw.radius,1,100) : 12,4),
      fixedStep: round(finite(worldRaw.fixedStep) ? clamp(worldRaw.fixedStep,1/1000,1/10) : 1/120,8)
    },
    level: {
      id: Number.isInteger(levelRaw.id) ? levelRaw.id : levelId,
      start, goal, platforms, scenery, gates, switchZone: sw, checkpoints
    }
  };
}
function normalizeDevices(source) {
  return list(source).slice(0,12).filter(d => d && TOOLS.has(d.type) && finite(d.x) && finite(d.y) && finite(d.angle)).map(d => ({
    type:d.type, x:round(clamp(d.x,-100,1200),1), y:round(clamp(d.y,-100,700),1),
    angle:round(wrapAngle(clamp(d.angle,-400,400)),3)
  })).sort((a,b)=>a.type.localeCompare(b.type)||a.x-b.x||a.y-b.y||a.angle-b.angle);
}
function normalizeTrace(source) {
  if (!Array.isArray(source) || source.length < 2) return [];
  const count = Math.min(source.length,MAX_FRAMES);
  const picked = count === source.length ? source : Array.from({length:count},(_,i)=>source[Math.round(i*(source.length-1)/(count-1))]);
  const trace=[];
  let previous=-Infinity;
  for (const p of picked) {
    if (!p || typeof p!=='object' || !finite(p.t)||!finite(p.x)||!finite(p.y)) continue;
    const t=round(clamp(p.t,0,120),4);
    if (t<previous) continue;
    previous=t;
    trace.push({
      t,x:round(clamp(p.x,-200,1400),2),y:round(clamp(p.y,-200,850),2),
      vx:round(finite(p.vx)?clamp(p.vx,-10000,10000):0,3),
      vy:round(finite(p.vy)?clamp(p.vy,-10000,10000):0,3),
      gateOpen:p.gateOpen===true,
      checkpoints:list(p.checkpoints).slice(0,20).map(v=>clean(v,80))
    });
  }
  return trace.length>=2?trace:[];
}
function normalizeEvents(source) {
  return list(source).slice(-MAX_EVENTS).filter(e=>e&&typeof e==='object').map(e=>({
    type:clean(e.type||'event',36),label:clean(e.label||e.type||'Событие',140),
    t:finite(e.t)?round(clamp(e.t,0,120),4):null,
    x:finite(e.x)?round(clamp(e.x,-200,1400),2):null,
    y:finite(e.y)?round(clamp(e.y,-200,850),2):null,
    speed:finite(e.speed)?round(clamp(e.speed,0,100000),3):null
  })).sort((a,b)=>(a.t??0)-(b.t??0));
}
function scenarioPayload(run) {
  return {
    schema:SCHEMA,
    engineVersion:run.engineVersion,
    levelId:run.levelId,
    mode:run.mode,
    dailyDate:run.dailyDate,
    profile:run.simulationProfile,
    devices:run.devices
  };
}
function scenarioSignature(run) {
  const value=canonicalize(scenarioPayload(run));
  // This is a stable non-cryptographic setup fingerprint, not an authenticity/signature mechanism.
  return 'RPL27-' + fnv1a(value) + fnv1a('osgard-cascade-lab:'+value,0x9747b28c);
}
function normalizeRun(raw) {
  if (!raw||typeof raw!=='object'||Array.isArray(raw)) return null;
  const id=clean(raw.id||raw.runId,90);
  const stamp=Date.parse(raw.at);
  const levelId=raw.levelId;
  if (!id||!Number.isFinite(stamp)||!Number.isInteger(levelId)||levelId<1||levelId>5) return null;
  if (!['won','lost'].includes(raw.status)) return null;
  if (!MODES.has(raw.mode)) return null;
  if (!raw.simulationProfile || typeof raw.simulationProfile !== 'object' || !raw.simulationProfile.world || !raw.simulationProfile.level) return null;
  const mode=raw.mode;
  const dailyDate=typeof raw.dailyDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.dailyDate)?raw.dailyDate:null;
  const engineVersion=clean(raw.engineVersion||'',32);
  if (!engineVersion) return null;
  if (mode==='daily'&&!dailyDate) return null;
  const devices=normalizeDevices(raw.devices);
  if (devices.length!==list(raw.devices).length) return null;
  const trajectory=normalizeTrace(raw.trajectory);
  if (trajectory.length<2) return null;
  const simulationProfile=normalizeProfile(raw.simulationProfile,levelId);
  if (simulationProfile.level.id!==levelId) return null;
  const telemetryRaw=raw.telemetry&&typeof raw.telemetry==='object'?raw.telemetry:{};
  const run={
    schema:SCHEMA,id,at:new Date(stamp).toISOString(),engineVersion,levelId,
    levelTitle:clean(raw.levelTitle||('Протокол #'+levelId),140),status:raw.status,mode,dailyDate,
    scenarioSignature:'',
    devices,simulationProfile,trajectory,
    timeSeconds:round(clamp(finite(raw.timeSeconds)?raw.timeSeconds:trajectory.at(-1).t,0,120),4),
    grade:clean(raw.grade||'—',8),
    telemetry:{
      distance:finite(telemetryRaw.distance)?round(clamp(telemetryRaw.distance,0,1000000),3):null,
      peakSpeed:finite(telemetryRaw.peakSpeed)?round(clamp(telemetryRaw.peakSpeed,0,100000),3):null,
      lastImpactSpeed:finite(telemetryRaw.lastImpactSpeed)?round(clamp(telemetryRaw.lastImpactSpeed,0,100000),3):null,
      impacts:Number.isInteger(telemetryRaw.impacts)?clamp(telemetryRaw.impacts,0,10000):0,
      contacts:Number.isInteger(telemetryRaw.contacts)?clamp(telemetryRaw.contacts,0,10000):0,
      activations:Number.isInteger(telemetryRaw.activations)?clamp(telemetryRaw.activations,0,10000):0,
      events:normalizeEvents(telemetryRaw.events)
    }
  };
  run.scenarioSignature=scenarioSignature(run);
  return run;
}
function validateArchive(raw) {
  if (!raw||typeof raw!=='object'||raw.schema!==ARCHIVE_SCHEMA||raw.schemaVersion!==1||!Array.isArray(raw.runs))
    return {ok:false,reason:'Неизвестная схема архива.'};
  if (raw.runs.length>MAX_RUNS) return {ok:false,reason:'Архив превышает лимит из 30 запусков.'};
  if (canonicalize(raw).length>MAX_IMPORT_BYTES) return {ok:false,reason:'Архив превышает 320 KiB.'};
  const ids=new Set(),runs=[];
  for (const item of raw.runs) {
    const run=normalizeRun(item);
    if (!run) return {ok:false,reason:'Запись запуска не прошла проверку структуры.'};
    if (ids.has(run.id)) return {ok:false,reason:'В архиве обнаружены повторяющиеся идентификаторы запусков.'};
    ids.add(run.id);
    if (item.scenarioSignature&&item.scenarioSignature!==run.scenarioSignature)
      return {ok:false,reason:'Контрольный отпечаток сценария не совпадает с содержимым записи.'};
    runs.push(run);
  }
  runs.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  return {ok:true,archive:{schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs}};
}
function interpolate(trace,ratio) {
  if (!trace.length) return null;
  const time=trace[0].t+(trace.at(-1).t-trace[0].t)*clamp(ratio,0,1);
  if (time<=trace[0].t) return trace[0];
  if (time>=trace.at(-1).t) return trace.at(-1);
  let low=0,high=trace.length-1;
  while(high-low>1){const mid=Math.floor((low+high)/2);if(trace[mid].t<=time)low=mid;else high=mid;}
  const a=trace[low],b=trace[high],d=Math.max(0.000001,b.t-a.t),p=(time-a.t)/d;
  return {t:time,x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p,vx:a.vx+(b.vx-a.vx)*p,vy:a.vy+(b.vy-a.vy)*p};
}
function traceMetrics(a,b,samples=41) {
  if (!a||!b||a.trajectory.length<2||b.trajectory.length<2) return null;
  let total=0,maximum=0;
  for(let i=0;i<samples;i++){
    const p=i/(samples-1),left=interpolate(a.trajectory,p),right=interpolate(b.trajectory,p);
    const distance=Math.hypot(left.x-right.x,left.y-right.y);
    total+=distance;maximum=Math.max(maximum,distance);
  }
  return {meanDeviation:round(total/samples,3),maxDeviation:round(maximum,3),samples};
}
function compareRuns(a,b) {
  if(!a||!b||a.scenarioSignature!==b.scenarioSignature) return null;
  const trace=traceMetrics(a,b);
  const aTypes=a.telemetry.events.map(e=>e.type),bTypes=b.telemetry.events.map(e=>e.type);
  const eventOrderSame=canonicalize(aTypes)===canonicalize(bTypes);
  const timeDelta=round(a.timeSeconds-b.timeSeconds,4);
  const outcomeSame=a.status===b.status;
  const stable=outcomeSame&&eventOrderSame&&trace&&trace.meanDeviation<=0.05&&Math.abs(timeDelta)<=0.01;
  const close=outcomeSame&&eventOrderSame&&trace&&trace.meanDeviation<=1.5&&Math.abs(timeDelta)<=0.05;
  const grade=stable?'REPRODUCIBLE':close?'CLOSE':'DRIFT';
  let score=100-(trace?trace.meanDeviation*12:50)-Math.abs(timeDelta)*80-(outcomeSame?0:45)-(eventOrderSame?0:12);
  score=clamp(Math.round(score),0,100);
  return {
    comparable:true,scenarioSignature:a.scenarioSignature,outcomeSame,eventOrderSame,
    statusA:a.status,statusB:b.status,timeDelta,
    distanceDelta:finite(a.telemetry.distance)&&finite(b.telemetry.distance)?round(a.telemetry.distance-b.telemetry.distance,3):null,
    peakSpeedDelta:finite(a.telemetry.peakSpeed)&&finite(b.telemetry.peakSpeed)?round(a.telemetry.peakSpeed-b.telemetry.peakSpeed,3):null,
    activationDelta:a.telemetry.activations-b.telemetry.activations,
    trace,grade,score
  };
}
function analyzeCohort(runs,runId) {
  const target=list(runs).find(r=>r.id===runId);
  if(!target) return {ok:false,reason:'Запуск не найден.'};
  const cohort=list(runs).filter(r=>r.scenarioSignature===target.scenarioSignature).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const baseline=cohort[0]||target;
  const comparisons=cohort.filter(r=>r.id!==baseline.id).map(r=>({runId:r.id,at:r.at,comparison:compareRuns(r,baseline)})).filter(v=>v.comparison);
  const outcomes=new Set(cohort.map(r=>r.status));
  const timeValues=cohort.map(r=>r.timeSeconds).filter(finite);
  const meanTime=timeValues.length?timeValues.reduce((s,v)=>s+v,0)/timeValues.length:null;
  const timeSpread=timeValues.length?Math.max(...timeValues)-Math.min(...timeValues):null;
  const deviations=comparisons.map(v=>v.comparison.trace?.meanDeviation).filter(finite);
  const maxDeviation=deviations.length?Math.max(...deviations):0;
  const eventOrderStable=comparisons.every(v=>v.comparison.eventOrderSame);
  const maxTimeDelta=comparisons.length?Math.max(...comparisons.map(v=>Math.abs(v.comparison.timeDelta))):0;
  let verdict='NEEDS_REPEAT',label='Нужен контрольный повтор',score=null;
  if(cohort.length>=2){
    const anyDrift=comparisons.some(v=>v.comparison.grade==='DRIFT')||outcomes.size>1;
    const allStable=comparisons.every(v=>v.comparison.grade==='REPRODUCIBLE')&&outcomes.size===1;
    const allClose=comparisons.every(v=>v.comparison.grade!=='DRIFT')&&outcomes.size===1;
    if(allStable){verdict='REPRODUCIBLE';label='Повторяемость подтверждена';score=100;}
    else if(allClose){verdict='CLOSE';label='Результаты близки, но есть малые различия';score=Math.max(70,Math.round(100-maxDeviation*12-maxTimeDelta*80));}
    else if(anyDrift){verdict=outcomes.size>1?'OUTCOME_DRIFT':'DRIFT';label=outcomes.size>1?'Исходы расходятся':'Обнаружен дрейф траектории или событий';score=Math.max(0,Math.round(100-maxDeviation*12-maxTimeDelta*80-(outcomes.size>1?45:12)-(eventOrderStable?0:10)));}
  }
  return {
    ok:true,scenarioSignature:target.scenarioSignature,count:cohort.length,baselineId:baseline.id,
    verdict,label,score,outcomesStable:outcomes.size<=1,eventOrderStable,
    meanTime:round(meanTime,4),timeSpread:round(timeSpread,4),maxTrajectoryDeviation:round(maxDeviation,3),
    comparisons
  };
}
const api=Object.freeze({
  version:VERSION,schema:SCHEMA,archiveSchema:ARCHIVE_SCHEMA,improvements:IMPROVEMENTS,
  maxRuns:MAX_RUNS,maxFrames:MAX_FRAMES,maxImportBytes:MAX_IMPORT_BYTES,
  canonicalize,scenarioSignature,normalizeRun,validateArchive,traceMetrics,compareRuns,analyzeCohort
});
if(typeof window==='undefined'||!window.document){globalThis.__CASCADELAB027_TEST__=api;return;}
if(window.CASCADELAB027)return;

const css=[
  '.cl-repro{width:min(760px,100%);margin:12px auto 10px;padding:12px;border:1px solid #78d8ff34;border-radius:12px;background:radial-gradient(ellipse at 90% 0%,#1c789122,transparent 42%),linear-gradient(145deg,#081824f4,#050d15f7);color:#eaf4f8;text-align:left;box-shadow:0 12px 36px #0004}',
  '.cl-repro-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.cl-repro-kicker{color:#73dcff;font:8px ui-monospace,monospace;letter-spacing:.15em}.cl-repro-status{padding:4px 7px;border:1px solid #e5bd7540;border-radius:5px;color:#f1d18f;font:8px ui-monospace,monospace}.cl-repro h3{margin:8px 0 5px;color:#f1f7fb;font:400 clamp(20px,3vw,28px)/1.12 Georgia,serif}.cl-repro-copy{margin:0;color:#9bb2c0;font:10px/1.6 system-ui,sans-serif}',
  '.cl-repro-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:10px}.cl-repro-metric{padding:8px;border:1px solid #81bed21e;border-radius:7px;background:#06131d}.cl-repro-metric small{display:block;color:#698b9d;font:7px ui-monospace,monospace}.cl-repro-metric strong{display:block;margin-top:5px;color:#e4f3fa;font:600 16px Georgia,serif;overflow-wrap:anywhere}.cl-repro-fingerprint{margin-top:8px;padding:7px 9px;border:1px dashed #7ecce333;border-radius:7px;color:#8ab8ca;font:8px/1.6 ui-monospace,monospace;overflow-wrap:anywhere}',
  '.cl-repro-plot{display:block;width:100%;height:120px;margin-top:8px;border:1px solid #7fb4c523;border-radius:8px;background:#06111a}.cl-repro-legend{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0;color:#7c98a8;font:8px ui-monospace,monospace}.cl-repro-dot{display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:#67dcff}.cl-repro-dot.alt{background:#e8bd73}',
  '.cl-repro-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.cl-repro-btn{min-height:36px;padding:8px 10px;border:1px solid #7cc9e638;border-radius:7px;background:#0b2432;color:#bbeaff;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-repro-btn.primary{background:linear-gradient(120deg,#f4d28c,#d69a40);border-color:#e9ba6a;color:#241a08}.cl-repro-btn.danger{background:#28171a;border-color:#ff9b8b55;color:#ffb5a7}.cl-repro-btn:focus-visible,.cl-repro-input:focus-visible{outline:2px solid #86e5ff;outline-offset:3px}.cl-repro-btn:disabled{opacity:.4;cursor:not-allowed}',
  '.cl-repro-runs{display:grid;gap:5px;margin-top:10px}.cl-repro-run{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px;border:1px solid #8bb7cb20;border-radius:7px;background:#06111b}.cl-repro-run strong{display:block;color:#d8eaf2;font-size:9px}.cl-repro-run small{display:block;margin-top:3px;color:#6f91a1;font:7px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.cl-repro-run-actions{display:flex;gap:4px}.cl-repro-run-actions button{min-height:28px;padding:4px 7px;border:1px solid #7ecce329;border-radius:5px;background:#0a1f2a;color:#a7ddf1;font-size:8px}.cl-repro-note{min-height:17px;margin:8px 0 0;color:#84dff7;font:8px/1.5 system-ui,sans-serif}.cl-repro-note[data-error=true]{color:#ffaaa0}.cl-repro-foot{margin:8px 0 0;padding-top:7px;border-top:1px solid #85b6ca20;color:#607d8c;font:7px/1.6 ui-monospace,monospace}',
  '@media(max-width:650px){.cl-repro{padding:10px;border-radius:10px}.cl-repro-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-repro-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cl-repro-btn{min-height:42px;width:100%}.cl-repro-run{grid-template-columns:1fr}.cl-repro-run-actions button{min-height:34px}.cl-repro-plot{height:100px}}',
  '@media(prefers-reduced-motion:reduce){.cl-repro *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}'
].join('');
const style=document.createElement('style');style.dataset.cascadeLabReproducibility=VERSION;style.textContent=css;document.head.append(style);
const make=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=String(value);return node;};
const panel=make('section','cl-repro');panel.setAttribute('aria-labelledby','cl-repro-title');panel.setAttribute('aria-live','polite');
const head=make('div','cl-repro-head');head.append(make('span','cl-repro-kicker','CASCADE LAB / REPRODUCIBILITY GATE'));const badge=make('span','cl-repro-status','WAITING FOR RUN');head.append(badge);
const title=make('h3','','Можно ли повторить этот запуск?');title.id='cl-repro-title';
const copy=make('p','cl-repro-copy','Лаборатория сравнивает повторы одной конфигурации: исход, траекторию, события и время. Совпадение отпечатка означает одинаковый сценарий по записанным параметрам, а не криптографическую гарантию.');
const grid=make('div','cl-repro-grid');const metricEls={};
for(const [key,label] of [['count','ПОВТОРЫ'],['score','СТАБИЛЬНОСТЬ'],['deviation','СР. ОТКЛОНЕНИЕ'],['time','РАЗБРОС ВРЕМЕНИ']]){
 const item=make('div','cl-repro-metric');item.append(make('small','',label));const v=make('strong','','—');item.append(v);grid.append(item);metricEls[key]=v;
}
const fingerprint=make('div','cl-repro-fingerprint','Отпечаток появится после завершения симуляции.');
const plot=document.createElement('canvas');plot.className='cl-repro-plot';plot.width=1000;plot.height=240;plot.setAttribute('role','img');plot.setAttribute('aria-label','Наложение траекторий двух повторных запусков');
const legend=make('div','cl-repro-legend');legend.append(make('span','','ГОЛУБОЙ — базовый запуск'));legend.firstChild.prepend(make('i','cl-repro-dot'));const altLegend=make('span','','ЗОЛОТОЙ — повтор');altLegend.prepend(make('i','cl-repro-dot alt'));legend.append(altLegend);
const actions=make('div','cl-repro-actions');const repeatBtn=make('button','cl-repro-btn primary','Повторить без изменений');repeatBtn.type='button';const exportBtn=make('button','cl-repro-btn','Экспорт пакета');exportBtn.type='button';const importBtn=make('button','cl-repro-btn','Импорт пакета');importBtn.type='button';const clearBtn=make('button','cl-repro-btn danger','Очистить архив');clearBtn.type='button';actions.append(repeatBtn,exportBtn,importBtn,clearBtn);
const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.hidden=true;
const runList=make('div','cl-repro-runs');const note=make('p','cl-repro-note','Запуски и отпечатки хранятся только в этом браузере.');note.setAttribute('role','status');note.setAttribute('aria-live','polite');
panel.append(head,title,copy,grid,fingerprint,plot,legend,actions,fileInput,runList,note,make('p','cl-repro-foot','ПРАВИЛО: одинаковая конфигурация ≠ гарантированная идентичность среды. Отчёт показывает измерения и допуски, а не причинность.'));
const anchor=document.querySelector('.cl-hypothesis');
const bottomGrid=document.querySelector('.bottom-grid');
const resultOverlay=document.querySelector('#resultOverlay');
if(anchor&&anchor.parentNode)anchor.after(panel);else if(bottomGrid&&bottomGrid.parentNode)bottomGrid.after(panel);else if(resultOverlay)resultOverlay.append(panel);else document.body.append(panel);

let runs=readRuns(),latestId=runs[0]?.id||null,latest=null;
function readRuns(){
 try{const raw=window.localStorage.getItem(STORAGE_KEY);if(!raw)return[];const parsed=JSON.parse(raw);const checked=validateArchive(parsed);return checked.ok?checked.archive.runs.slice(0,MAX_RUNS):[];}catch{return[];}
}
function setNote(message,error=false){note.textContent=message;note.dataset.error=error?'true':'false';}
function persist(){
 runs=runs.slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS);
 try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify({schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs}));}
 catch{setNote('Браузер не разрешил локальное сохранение. Экспортируй пакет до закрытия вкладки.',true);}
}
function download(filename,payload){
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));
 const a=make('a');a.href=url;a.download=filename;a.hidden=true;panel.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function drawTrace(current,baseline){
 const c=plot.getContext('2d');if(!c)return;
 c.clearRect(0,0,plot.width,plot.height);c.fillStyle='#06111a';c.fillRect(0,0,plot.width,plot.height);
 c.strokeStyle='#7ba8bb20';c.lineWidth=1;
 for(let x=40;x<plot.width;x+=80){c.beginPath();c.moveTo(x,18);c.lineTo(x,plot.height-18);c.stroke();}
 for(let y=20;y<plot.height;y+=40){c.beginPath();c.moveTo(20,y);c.lineTo(plot.width-20,y);c.stroke();}
 const values=[...(current?.trajectory||[]),...(baseline?.trajectory||[])];if(!values.length)return;
 const minX=Math.min(...values.map(p=>p.x)),maxX=Math.max(...values.map(p=>p.x)),minY=Math.min(...values.map(p=>p.y)),maxY=Math.max(...values.map(p=>p.y));
 const dx=Math.max(1,maxX-minX),dy=Math.max(1,maxY-minY);
 const path=(run,color)=>{if(!run||run.trajectory.length<2)return;c.beginPath();run.trajectory.forEach((p,i)=>{const x=25+(p.x-minX)/dx*(plot.width-50),y=18+(p.y-minY)/dy*(plot.height-36);if(!i)c.moveTo(x,y);else c.lineTo(x,y);});c.strokeStyle=color;c.lineWidth=3;c.lineJoin='round';c.stroke();};
 path(baseline,'#67dcff');path(current,'#e8bd73');
}
function render(){
 const run=runs.find(r=>r.id===latestId)||runs[0]||null;latest=run;
 repeatBtn.disabled=!run||!['won','lost'].includes(run.status);
 exportBtn.disabled=!runs.length;clearBtn.disabled=!runs.length;
 runList.replaceChildren();
 if(!run){
  badge.textContent='WAITING FOR RUN';title.textContent='Можно ли повторить этот запуск?';fingerprint.textContent='Отпечаток появится после завершения симуляции.';
  metricEls.count.textContent='0';metricEls.score.textContent='—';metricEls.deviation.textContent='—';metricEls.time.textContent='—';drawTrace(null,null);
  runList.append(make('div','','После завершения испытания здесь появятся исходный запуск и кнопка контрольного повтора.'));
  return;
 }
 const cohort=list(runs).filter(r=>r.scenarioSignature===run.scenarioSignature).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 const report=analyzeCohort(runs,run.id);const baseline=cohort.find(r=>r.id!==run.id)||null;
 badge.textContent=report.label.toLocaleUpperCase('ru');
 badge.dataset.verdict=report.verdict;
 title.textContent=report.label;
 fingerprint.textContent='SCENARIO '+run.scenarioSignature+' · ENGINE '+run.engineVersion+' · '+run.levelTitle+' · '+run.mode+(run.dailyDate?' / '+run.dailyDate:'');
 metricEls.count.textContent=String(report.count);
 metricEls.score.textContent=report.score===null?'—':report.score+'/100';
 metricEls.deviation.textContent=report.maxTrajectoryDeviation===null?'—':report.maxTrajectoryDeviation.toFixed(3)+' px';
 metricEls.time.textContent=report.timeSpread===null?'—':report.timeSpread.toFixed(4)+' s';
 drawTrace(run,baseline);
 setNote(report.count<2?'Сделай контрольный повтор без изменения конструкции, уровня и режима.':report.verdict==='REPRODUCIBLE'?'Повторы соответствуют строгому порогу: события одинаковы, среднее отклонение ≤ 0,05 px, разница времени ≤ 0,01 с.':'Есть различия между повторами. Проверь временной шаг, события и среднее отклонение траектории; не считай отпечаток доказательством одинаковой среды.');
 for(const entry of runs){
  const row=make('article','cl-repro-run');const detail=make('div');
  detail.append(make('strong','',(entry.status==='won'?'✓ ':'× ')+entry.levelTitle+' · '+entry.timeSeconds.toFixed(3)+' с'));
  const entryReport=analyzeCohort(runs,entry.id);
  detail.append(make('small','',new Date(entry.at).toLocaleString()+' · '+entry.scenarioSignature+' · '+entryReport.count+' повтор(а/ов)'));
  const buttons=make('div','cl-repro-run-actions');const open=make('button','','Показать');open.type='button';open.addEventListener('click',()=>{latestId=entry.id;render();});
  const remove=make('button','','Удалить');remove.type='button';remove.addEventListener('click',()=>{runs=runs.filter(v=>v.id!==entry.id);if(latestId===entry.id)latestId=runs[0]?.id||null;persist();render();});
  buttons.append(open,remove);row.append(detail,buttons);runList.append(row);
 }
}
function onRunFinished(raw){
 const run=normalizeRun(raw);
 if(!run){setNote('Запуск завершён, но не содержит достаточного профиля и траектории для сравнения. Проверь версию движка.',true);return;}
 if(raw.scenarioSignature&&raw.scenarioSignature!==run.scenarioSignature){setNote('Профиль запуска не прошёл проверку отпечатка.',true);return;}
 runs=runs.filter(r=>r.id!==run.id);runs.unshift(run);latestId=run.id;
 persist();render();setNote('Запуск сохранён локально. Отпечаток рассчитан по версии движка, профилю уровня, режиму и схеме устройств.');
}
repeatBtn.addEventListener('click',()=>{
 const run=runs.find(r=>r.id===latestId);
 if(!run)return;
 window.dispatchEvent(new CustomEvent('cascade-lab:repeat-identical-run-request',{detail:{
  runId:run.id,levelId:run.levelId,mode:run.mode,dailyDate:run.dailyDate,
  blueprint:run.devices.map(d=>({...d}))
 }}));
 setNote('Запрошен контрольный повтор. Не изменяй схему; следующая запись будет сопоставлена с этой конфигурацией.');
});
exportBtn.addEventListener('click',()=>{
 if(!runs.length)return;
 const archive={schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs};
 download('cascade-lab-reproducibility-'+new Date().toISOString().slice(0,10)+'.json',archive);
 setNote('Пакет воспроизведения экспортирован. Сетевой отправки не было.');
});
importBtn.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',()=>{
 const file=fileInput.files&&fileInput.files[0];fileInput.value='';if(!file)return;
 if(file.size>MAX_IMPORT_BYTES){setNote('Файл превышает лимит 320 KiB.',true);return;}
 const reader=new FileReader();
 reader.onerror=()=>setNote('Не удалось прочитать JSON.',true);
 reader.onload=()=>{
  try{
   const parsed=JSON.parse(String(reader.result||'')),checked=validateArchive(parsed);
   if(!checked.ok)throw new Error(checked.reason);
   const ids=new Set(runs.map(r=>r.id));
   for(const run of checked.archive.runs){if(!ids.has(run.id)){runs.push(run);ids.add(run.id);}}
   runs.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));runs=runs.slice(0,MAX_RUNS);latestId=runs[0]?.id||null;
   persist();render();setNote('Архив проверен и объединён. Сценарные отпечатки пересчитаны; дубликаты идентификаторов пропущены.');
  }catch(error){setNote(clean(error&&error.message||'Архив отклонён.',240),true);}
 };
 reader.readAsText(file);
});
clearBtn.addEventListener('click',()=>{
 if(!window.confirm('Удалить локальный архив воспроизводимости в этом браузере?'))return;
 runs=[];latestId=null;persist();render();setNote('Локальный архив удалён.');
});
window.addEventListener('cascade-lab:run-finished',event=>onRunFinished(event.detail||{}));
const publicApi=Object.freeze({
 version:VERSION,schema:SCHEMA,analyzeCohort,compareRuns,scenarioSignature,
 getRuns:()=>runs.map(r=>({...r})),render
});
Object.defineProperty(window,'CASCADELAB027',{value:publicApi,configurable:false,enumerable:false,writable:false});
render();
})();
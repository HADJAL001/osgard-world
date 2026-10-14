(() => {
'use strict';

const VERSION = '0.23.0';
const SCHEMA = 'osgard.cascade-lab.differential-lab.v1';
const POSITION_TOLERANCE_PX = 2;
const ANGLE_TOLERANCE_RAD = 0.035; // approximately two degrees; a practical UI threshold, not a physics law
const MAX_DISPLAY_VARIANTS = 18;
const DEVICE_LABELS = Object.freeze({
  spring: 'Пружина', fan: 'Вентилятор', belt: 'Конвейер',
  magnet: 'Магнит', switch: 'Контакт', bumper: 'Отбойник'
});
const DEVICE_SYMBOLS = Object.freeze({ spring:'П', fan:'В', belt:'К', magnet:'М', switch:'КТ', bumper:'О' });
const DEVICE_COLORS = Object.freeze({ spring:'#f3c46b', fan:'#62ddf4', belt:'#a997ff', magnet:'#ff91bd', switch:'#8de1ad', bumper:'#ff986b' });
const list = value => Array.isArray(value) ? value : [];
const finite = value => typeof value === 'number' && Number.isFinite(value);
const number = (value, fallback = null) => finite(value) ? value : fallback;
const cleanText = (value, limit = 180) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
const rounded = (value, digits = 2) => finite(value) ? Number(value.toFixed(digits)) : null;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const angleDelta = (left, right) => {
  const delta = (right - left + Math.PI) % (Math.PI * 2);
  return Math.abs((delta < 0 ? delta + Math.PI * 2 : delta) - Math.PI);
};
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
}
function hash32(value) {
  let hash = 0x811c9dc5;
  for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash.toString(16).toUpperCase().padStart(8, '0');
}
function scenarioKey(run) {
  if (!run || !Number.isInteger(run.levelId)) return null;
  return [run.levelId, cleanText(run.mode || 'campaign', 24), cleanText(run.dailyDate || '', 10)].join('|');
}
function normalizedDevices(run) {
  return list(run && run.devices).slice(0, 12).filter(device =>
    device && Object.hasOwn(DEVICE_LABELS, device.type) && finite(device.x) && finite(device.y) && finite(device.angle)
  ).map((device, index) => ({
    index, type: device.type,
    x: rounded(clamp(device.x, -100, 1200), 1),
    y: rounded(clamp(device.y, -100, 700), 1),
    angle: rounded(Math.atan2(Math.sin(device.angle), Math.cos(device.angle)), 4)
  }));
}
function canonicalDesign(run) {
  if (!run || !Number.isInteger(run.levelId)) return null;
  const devices = normalizedDevices(run).map(({type,x,y,angle}) => ({type,x,y,angle}))
    .sort((a,b) => a.type.localeCompare(b.type) || a.x-b.x || a.y-b.y || a.angle-b.angle);
  return canonicalize({scenario:scenarioKey(run), devices});
}
function fingerprintDesign(run) {
  const canonical = canonicalDesign(run);
  return canonical === null ? null : 'DL23-' + hash32(canonical);
}
function pairGroup(baselineGroup, variantGroup) {
  const smallIsBaseline = baselineGroup.length <= variantGroup.length;
  const small = smallIsBaseline ? baselineGroup : variantGroup;
  const large = smallIsBaseline ? variantGroup : baselineGroup;
  const memo = new Map();
  function solve(index, mask) {
    if (index >= small.length) return {cost:0, choices:[]};
    const key = index + ':' + mask;
    if (memo.has(key)) return memo.get(key);
    let best = {cost:Infinity, choices:[]};
    for (let j=0;j<large.length;j++) {
      const bit = 1 << j;
      if (mask & bit) continue;
      const left = small[index], right = large[j];
      const dx = right.device.x - left.device.x, dy = right.device.y - left.device.y;
      const rotation = angleDelta(left.device.angle, right.device.angle);
      const cost = Math.hypot(dx,dy) + rotation * 28;
      const rest = solve(index+1,mask|bit);
      const total = cost + rest.cost;
      if (total < best.cost) best = {cost:total,choices:[j,...rest.choices]};
    }
    memo.set(key,best);
    return best;
  }
  const solved = solve(0,0);
  const used = new Set(solved.choices);
  const matches = solved.choices.map((largeIndex,smallIndex) => {
    const left = small[smallIndex], right = large[largeIndex];
    return smallIsBaseline
      ? {baselineIndex:left.index,variantIndex:right.index,baselineDevice:left,variantDevice:right}
      : {baselineIndex:right.index,variantIndex:left.index,baselineDevice:right,variantDevice:left};
  });
  const unmatchedLarge = large.filter((_,index)=>!used.has(index)).map(item=>({index:item.index,device:item}));
  const removed = smallIsBaseline ? [] : unmatchedLarge;
  const added = smallIsBaseline ? unmatchedLarge : [];
  return {matches,removed,added};
}
function compareDesign(baseline, variant) {
  if (!baseline || !variant) return {ok:false, reason:'Для сравнения нужны два запуска.'};
  if (scenarioKey(baseline) !== scenarioKey(variant)) {
    return {ok:false, reason:'Сценарии отличаются: сравнивай один протокол, режим и дату ежедневного испытания.'};
  }
  const baseDevices = normalizedDevices(baseline), nextDevices = normalizedDevices(variant);
  const types = [...new Set([...baseDevices.map(d=>d.type),...nextDevices.map(d=>d.type)])].sort();
  const matches = [], removed = [], added = [];
  for (const type of types) {
    const result = pairGroup(baseDevices.filter(d=>d.type===type),nextDevices.filter(d=>d.type===type));
    matches.push(...result.matches); removed.push(...result.removed); added.push(...result.added);
  }
  const operations = [];
  const factors = new Set();
  for (const pair of matches) {
    const from = pair.baselineDevice, to = pair.variantDevice;
    const dx = rounded(to.x-from.x,1), dy = rounded(to.y-from.y,1);
    const distance = rounded(Math.hypot(dx,dy),1);
    const rotation = rounded(angleDelta(from.angle,to.angle),4);
    const moved = distance > POSITION_TOLERANCE_PX;
    const rotated = rotation > ANGLE_TOLERANCE_RAD;
    if (moved || rotated) {
      if (moved) factors.add('position');
      if (rotated) factors.add('angle');
      operations.push({
        kind:'changed', type:from.type, label:DEVICE_LABELS[from.type],
        baselineIndex:pair.baselineIndex,variantIndex:pair.variantIndex,
        from:{x:from.x,y:from.y,angle:from.angle},
        to:{x:to.x,y:to.y,angle:to.angle},
        dx,dy,distance,rotationRad:rotation,rotationDegrees:rounded(rotation*180/Math.PI,1),
        moved,rotated
      });
    }
  }
  for (const item of removed) {
    factors.add('composition');
    operations.push({kind:'removed',type:item.device.type,label:DEVICE_LABELS[item.device.type],baselineIndex:item.index,variantIndex:null,from:{x:item.device.x,y:item.device.y,angle:item.device.angle},to:null});
  }
  for (const item of added) {
    factors.add('composition');
    operations.push({kind:'added',type:item.device.type,label:DEVICE_LABELS[item.device.type],baselineIndex:null,variantIndex:item.index,from:null,to:{x:item.device.x,y:item.device.y,angle:item.device.angle}});
  }
  const order = {changed:0,removed:1,added:2};
  operations.sort((a,b)=>order[a.kind]-order[b.kind] || String(a.type).localeCompare(String(b.type)) || (a.baselineIndex??99)-(b.baselineIndex??99));
  const exactDesignMatch = canonicalDesign(baseline)===canonicalDesign(variant);
  const sameDesign = operations.length===0;
  const singleEdit = operations.length===1 && factors.size===1;
  const factorNames = [...factors].map(key=>({position:'Положение устройства',angle:'Угол устройства',composition:'Состав / количество деталей'}[key]));
  let classification;
  if (sameDesign) classification='same-design-repeat';
  else if (singleEdit) classification='single-edit';
  else if (factors.size===1) classification='one-factor-multiple-edits';
  else classification='multiple-factor-changes';
  return {
    ok:true, sameScenario:true, sameDesign,
    baselineFingerprint:fingerprintDesign(baseline),variantFingerprint:fingerprintDesign(variant),exactDesignMatch,
    baselineDeviceCount:baseDevices.length,variantDeviceCount:nextDevices.length,
    operationCount:operations.length,factorKeys:[...factors],factorNames,
    singleEdit,classification,operations,matches,
    added:added.length,removed:removed.length,
    note:sameDesign
      ? (exactDesignMatch ? 'Чертёж совпадает точно. Различия результатов относятся к повторным наблюдениям, а не к новому варианту конструкции.' : 'Чертежи отличаются только в пределах практических порогов '+POSITION_TOLERANCE_PX+' px / '+rounded(ANGLE_TOLERANCE_RAD*180/Math.PI,1)+'°. Это считается повтором одного варианта в данном сравнении.')
      : singleEdit
        ? 'Зафиксировано одно локальное изменение одного типа. Это создаёт более чистое сравнение, но само по себе не доказывает причинность.'
        : 'Обнаружено несколько изменений или несколько затронутых факторов. По этой паре нельзя выделить вклад одного изменения.'
  };
}
function interpolate(trace, time) {
  if (!Array.isArray(trace)||trace.length===0)return null;
  if(time<=trace[0].t)return trace[0];
  for(let i=1;i<trace.length;i++){
    if(trace[i].t>=time){
      const a=trace[i-1],b=trace[i],ratio=clamp((time-a.t)/Math.max(.0001,b.t-a.t),0,1);
      return {x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio};
    }
  }
  return trace[trace.length-1];
}
function trajectoryDeviation(baseline,variant,samples=41) {
  const a=list(baseline&&baseline.trajectory),b=list(variant&&variant.trajectory);
  if(a.length<2||b.length<2)return null;
  let total=0;
  for(let i=0;i<samples;i++){
    const ratio=i/Math.max(1,samples-1);
    const pa=interpolate(a,a[0].t+(a.at(-1).t-a[0].t)*ratio);
    const pb=interpolate(b,b[0].t+(b.at(-1).t-b[0].t)*ratio);
    total+=Math.hypot(pa.x-pb.x,pa.y-pb.y);
  }
  return rounded(total/samples,2);
}
function observedDelta(baseline,variant) {
  if(!baseline||!variant||scenarioKey(baseline)!==scenarioKey(variant))return {comparable:false,reason:'Сравнение результатов допустимо только для одного сценария.'};
  const delta=(a,b)=>finite(a)&&finite(b)?rounded(a-b,3):null;
  return {
    comparable:true,
    outcome:baseline.status===variant.status?'unchanged':variant.status==='won'?'recovered':'regressed',
    baselineStatus:baseline.status,variantStatus:variant.status,
    timeDelta:delta(variant.timeSeconds,baseline.timeSeconds),
    deviceCountDelta:delta(variant.deviceCount,baseline.deviceCount),
    peakSpeedDelta:delta(variant.telemetry&&variant.telemetry.peakSpeed,baseline.telemetry&&baseline.telemetry.peakSpeed),
    impactSpeedDelta:delta(variant.telemetry&&variant.telemetry.lastImpactSpeed,baseline.telemetry&&baseline.telemetry.lastImpactSpeed),
    activationDelta:delta(variant.telemetry&&variant.telemetry.activations,baseline.telemetry&&baseline.telemetry.activations),
    meanTrajectoryDeviation:trajectoryDeviation(baseline,variant)
  };
}
function summarizeRepeatability(runs) {
  const groups=new Map();
  for(const run of list(runs)){
    const layout=canonicalDesign(run);
    const scenario=scenarioKey(run);
    if(!layout||!scenario)continue;
    const key=scenario+'|'+layout;
    if(!groups.has(key))groups.set(key,{key,scenario,layout,fingerprint:fingerprintDesign(run),runs:[]});
    groups.get(key).runs.push(run);
  }
  const result=[];
  for(const group of groups.values()){
    const sample=group.runs;
    const times=sample.map(run=>run.timeSeconds).filter(finite);
    const mean=times.length?times.reduce((sum,value)=>sum+value,0)/times.length:null;
    const variance=times.length>1?times.reduce((sum,value)=>sum+(value-mean)**2,0)/(times.length-1):null;
    const stdDev=variance===null?null:Math.sqrt(variance);
    const successes=sample.filter(run=>run.status==='won').length;
    let stability='Недостаточно повторов';
    if(sample.length>=3){
      if(successes!==0&&successes!==sample.length)stability='Исходы различались';
      else if(stdDev!==null&&stdDev<=0.25)stability='Небольшой разброс времени в этой выборке';
      else stability='Наблюдается разброс времени';
    }
    result.push({
      scenario:group.scenario,fingerprint:group.fingerprint,canonical:group.layout,
      runCount:sample.length,successes,successRate:sample.length?rounded(successes/sample.length*100,1):null,
      meanTime:mean===null?null:rounded(mean,3),stdDev:stdDev===null?null:rounded(stdDev,3),
      minTime:times.length?Math.min(...times):null,maxTime:times.length?Math.max(...times):null,
      latestRun:sample.slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0]?.id||null,
      runIds:sample.slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).map(run=>run.id),
      stability
    });
  }
  return result.sort((a,b)=>b.runCount-a.runCount || String(a.fingerprint).localeCompare(String(b.fingerprint))).slice(0,MAX_DISPLAY_VARIANTS);
}
function csvCell(value) {
  let cell=value==null?'':String(value);
  if(/^[\s]*[=+\-@]/.test(cell))cell="'"+cell;
  return '"'+cell.replace(/"/g,'""')+'"';
}
function buildReport(baseline,variant,runs) {
  const design=compareDesign(baseline,variant);
  const observed=observedDelta(baseline,variant);
  if(!design.ok||!observed.comparable)return {ok:false,reason:design.reason||observed.reason};
  const repeatability=summarizeRepeatability(runs).filter(group=>group.scenario===scenarioKey(variant));
  let decision;
  if(design.sameDesign)decision='repeatability-check';
  else if(design.singleEdit)decision='isolated-edit-comparison';
  else decision='multiple-changes-comparison';
  return {
    ok:true,
    schema:SCHEMA,version:VERSION,createdAt:new Date().toISOString(),
    study:{decision,baselineId:baseline.id,variantId:variant.id,levelId:baseline.levelId,levelTitle:cleanText(baseline.levelTitle,120),mode:baseline.mode||'campaign',dailyDate:baseline.dailyDate||null},
    construction:{...design},
    observed:{...observed},
    repeatability,
    interpretation:{
      decision,
      singleEditEligible:design.singleEdit,
      causalClaim:false,
      text:design.note,
      limitations:[
        'Устройство сопоставляется с ближайшим устройством того же типа; при нескольких одинаковых деталях соответствие — математическая эвристика.',
        'Отпечаток DL23 — короткий FNV-1a для удобства группировки, не криптографическая подпись.',
        'Разница исхода, времени или траектории не доказывает причинность.',
        'Порог изменения положения — '+POSITION_TOLERANCE_PX+' px; порог угла — '+rounded(ANGLE_TOLERANCE_RAD*180/Math.PI,1)+'°.',
        'Сводка повторяемости описывает только сохранённые запуски в этом браузере; она не является статистическим доказательством.'
      ]
    }
  };
}
const api=Object.freeze({
  version:VERSION,schema:SCHEMA,positionTolerancePx:POSITION_TOLERANCE_PX,angleToleranceRad:ANGLE_TOLERANCE_RAD,
  canonicalize,hash32,scenarioKey,normalizedDevices,canonicalDesign,fingerprintDesign,compareDesign,
  trajectoryDeviation,observedDelta,summarizeRepeatability,csvCell,buildReport
});
if(typeof window==='undefined'||!window.document){globalThis.__CASCADELAB023_TEST__=api;return;}
if(window.CASCADELAB023||!window.CASCADELAB022)return;

const css=[
'.cl-diff{margin:18px 0 30px;padding:clamp(14px,2.2vw,24px);border:1px solid #e9ba6a48;border-radius:18px;background:radial-gradient(ellipse at 90% 0%,#be88351b,transparent 42%),radial-gradient(ellipse at 5% 0%,#3ea8d31a,transparent 45%),linear-gradient(145deg,#101720,#060b11);color:#edf5fa;box-shadow:0 22px 65px #0003}.cl-diff *{box-sizing:border-box}.cl-diff-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.cl-diff-kicker{margin:0;color:#f1c978;font:8px ui-monospace,monospace;letter-spacing:.18em}.cl-diff-pill{padding:5px 8px;border:1px solid #e9ba6a55;border-radius:5px;color:#f0cd8b;font:8px ui-monospace,monospace}.cl-diff h3{margin:9px 0 0;color:#fff8ea;font:400 clamp(26px,3.1vw,40px)/1.06 Georgia,serif;letter-spacing:-.035em}.cl-diff-lead{max-width:900px;margin:8px 0 17px;color:#a4b5c2;font-size:10px;line-height:1.75}.cl-diff *:focus-visible{outline:2px solid #c7f3ff;outline-offset:3px}.cl-diff-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;align-items:end}.cl-diff-field{display:grid;gap:5px;min-width:0}.cl-diff-field label,.cl-diff-small{color:#819aaa;font:8px ui-monospace,monospace;letter-spacing:.07em}.cl-diff-select{width:100%;min-height:42px;padding:9px 10px;border:1px solid #95b4c632;border-radius:8px;background:#07121b;color:#e8f3f8;font:10px system-ui,sans-serif}.cl-diff-blueprints{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}.cl-diff-board{min-width:0;padding:10px;border:1px solid #8fb9c728;border-radius:11px;background:#061019}.cl-diff-boardhead{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px}.cl-diff-boardhead strong{color:#dbe8ee;font:8px ui-monospace,monospace;letter-spacing:.07em}.cl-diff-boardhead span{color:#6d8999;font:8px ui-monospace,monospace}.cl-diff-canvas{display:block;width:100%;height:auto;aspect-ratio:1000/560;border:1px solid #76a0b41c;border-radius:7px;background:#08131d}.cl-diff-legend{margin:7px 0 0;color:#748b9a;font:7px/1.5 ui-monospace,monospace}.cl-diff-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}.cl-diff-stat{min-width:0;padding:10px;border:1px solid #8fb7c21f;border-radius:9px;background:#07121b}.cl-diff-stat span{display:block;color:#718d9e;font:7px ui-monospace,monospace;letter-spacing:.08em}.cl-diff-stat b{display:block;margin-top:6px;color:#fff2d7;font:600 clamp(15px,2vw,22px) Georgia,serif;overflow-wrap:anywhere}.cl-diff-stat small{display:block;margin-top:4px;color:#718e9e;font-size:8px;line-height:1.4}.cl-diff-verdict{margin-top:10px;padding:13px 14px;border:1px solid #e9ba6a2c;border-left:3px solid #e9ba6a;border-radius:0 9px 9px 0;background:#e9ba6a0b}.cl-diff-verdict strong{display:block;color:#f4d59b;font:8px ui-monospace,monospace;letter-spacing:.11em}.cl-diff-verdict p{margin:6px 0 0;color:#e4edf2;font-size:11px;line-height:1.65}.cl-diff-section{margin-top:16px}.cl-diff-sectionhead{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}.cl-diff-sectionhead h4{margin:0;color:#d6e5ed;font:8px ui-monospace,monospace;letter-spacing:.12em}.cl-diff-count{color:#728e9e;font:8px ui-monospace,monospace}.cl-diff-ops{display:grid;gap:6px}.cl-diff-op{display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:start;padding:9px;border:1px solid #91b6c31f;border-radius:8px;background:#07121b}.cl-diff-opicon{display:grid;place-items:center;min-height:30px;border:1px solid #e9ba6a36;border-radius:6px;color:#f1cb83;font:9px ui-monospace,monospace}.cl-diff-op strong{display:block;color:#dce9ef;font-size:10px}.cl-diff-op p{margin:4px 0 0;color:#8ea5b2;font-size:9px;line-height:1.6}.cl-diff-empty{padding:14px;border:1px dashed #91b6c326;border-radius:8px;color:#829aa8;font-size:9px;line-height:1.6}.cl-diff-variants{display:grid;gap:6px}.cl-diff-variant{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px;border:1px solid #91b6c323;border-radius:8px;background:#07121b}.cl-diff-variant strong{display:block;color:#dae8ef;font-size:10px}.cl-diff-variant p{margin:4px 0 0;color:#8098a8;font-size:8px;line-height:1.6;overflow-wrap:anywhere}.cl-diff-variant button,.cl-diff-btn{min-height:37px;padding:8px 10px;border:1px solid #86c4d23a;border-radius:7px;background:#0a202b;color:#bceaff;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-diff-btn.primary{border-color:#e9ba6a;background:linear-gradient(130deg,#f5d995,#dca34d);color:#211807}.cl-diff-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.cl-diff-status{min-height:18px;margin:9px 0 0;color:#8ddff5;font-size:9px;line-height:1.5}.cl-diff-status[data-kind=error]{color:#ffab9e}.cl-diff-foot{margin:9px 0 0;padding-top:9px;border-top:1px solid #90b2c21b;color:#668391;font:7px/1.65 ui-monospace,monospace}.cl-diff-boardhead .is-changed{color:#f4c56f}.cl-diff-variant button:hover,.cl-diff-btn:hover{filter:brightness(1.13)}@media(max-width:650px){.cl-diff{padding:13px;border-radius:12px}.cl-diff-controls,.cl-diff-blueprints{grid-template-columns:1fr}.cl-diff-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-diff-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cl-diff-btn{width:100%;min-height:42px}.cl-diff-variant{grid-template-columns:1fr}.cl-diff-variant button{width:100%;min-height:42px}}@media(prefers-reduced-motion:reduce){.cl-diff *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}'
].join('');
const style=document.createElement('style');style.dataset.cascadeLabDifferential=VERSION;style.textContent=css;document.head.append(style);
const make=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=String(value);return node;};
const button=(label,cls,handler)=>{const node=make('button',cls,label);node.type='button';node.addEventListener('click',handler);return node;};
const panel=make('section','cl-diff');panel.setAttribute('aria-labelledby','cl-diff-title');panel.setAttribute('aria-live','polite');
const head=make('div','cl-diff-head');head.append(make('p','cl-diff-kicker','CASCADE LAB / DIFFERENTIAL LAB'),make('span','cl-diff-pill','VERSION '+VERSION));
const title=make('h3','','Докажи качество эксперимента.');
const lead=make('p','cl-diff-lead','Сравни не только движение, но и сам чертёж: лаборатория сопоставляет детали одного типа, выделяет изменения конструкции, показывает повторяемость одинаковой сборки и формирует паспорт сравнения. Это инструмент контроля эксперимента, а не автоматическое доказательство причины.');
panel.append(head,title,lead);
const controls=make('div','cl-diff-controls');
function field(labelText) { const box=make('div','cl-diff-field');box.append(make('label','',labelText));const select=document.createElement('select');select.className='cl-diff-select';box.append(select);return {box,select};}
const baseField=field('БАЗОВЫЙ ЗАПУСК');const variantField=field('СРАВНИВАЕМЫЙ ЗАПУСК');
controls.append(baseField.box,variantField.box);panel.append(controls);
const blueprints=make('div','cl-diff-blueprints');
function board(label) {
  const box=make('article','cl-diff-board');const h=make('div','cl-diff-boardhead');
  h.append(make('strong','',label));const meta=make('span','','—');h.append(meta);
  const canvas=document.createElement('canvas');canvas.className='cl-diff-canvas';canvas.width=1000;canvas.height=560;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',label+' — схема расположения устройств');
  box.append(h,canvas,make('p','cl-diff-legend','Схема устройств; жёлтым отмечены изменённые детали. Условное представление, не копия игрового поля.'));
  return {box,meta,canvas};
}
const baseBoard=board('A / БАЗА'),variantBoard=board('B / ВАРИАНТ');
blueprints.append(baseBoard.box,variantBoard.box);panel.append(blueprints);
const statGrid=make('div','cl-diff-stats');
function stat(label) {const box=make('div','cl-diff-stat');box.append(make('span','',label));const value=make('b','','—');const note=make('small','','');box.append(value,note);statGrid.append(box);return {box,value,note};}
const statEdits=stat('ИЗМЕНЕНИЯ ЧЕРТЕЖА');
const statFactors=stat('ФАКТОРЫ');
const statOutcome=stat('ИСХОД');
const statDeviation=stat('СРЕДНЕЕ РАСХОЖДЕНИЕ');
panel.append(statGrid);
const verdict=make('section','cl-diff-verdict');verdict.append(make('strong','','ОЦЕНКА ЧИСТОТЫ ЭКСПЕРИМЕНТА'));const verdictBody=make('p','','Выбери две записи одного протокола.');verdict.append(verdictBody);panel.append(verdict);
const opSection=make('section','cl-diff-section');
const opHead=make('div','cl-diff-sectionhead');opHead.append(make('h4','','ИЗМЕНЕНИЯ КОНСТРУКЦИИ'));const opCount=make('span','cl-diff-count','—');opHead.append(opCount);
const opList=make('div','cl-diff-ops');opSection.append(opHead,opList);panel.append(opSection);
const repeatSection=make('section','cl-diff-section');
const repHead=make('div','cl-diff-sectionhead');repHead.append(make('h4','','АТЛАС ПОВТОРЯЕМОСТИ ОДИНАКОВЫХ СБОРОК'),make('span','cl-diff-count','Один вариант = один отпечаток чертежа'));
const variants=make('div','cl-diff-variants');repeatSection.append(repHead,variants);panel.append(repeatSection);
const actions=make('div','cl-diff-actions');
const jsonButton=button('Экспорт паспорта JSON','cl-diff-btn primary',()=>exportJson());
const csvButton=button('Экспорт изменений CSV','cl-diff-btn',()=>exportCsv());
const copyButton=button('Скопировать вывод','cl-diff-btn',()=>void copySummary());
const refreshButton=button('Обновить записи','cl-diff-btn',()=>refresh(true));
actions.append(jsonButton,csvButton,copyButton,refreshButton);panel.append(actions);
const status=make('p','cl-diff-status','Записи читаются из локального архива Trajectory X-Ray.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
panel.append(make('p','cl-diff-foot','LOCAL ONLY · NO NETWORK UPLOAD · 2 px / 2° — PRACTICAL DIFF TOLERANCES · DL23 FINGERPRINT IS NOT A CRYPTOGRAPHIC SIGNATURE · OBSERVATION ≠ CAUSATION'));
const xrayPanel=document.querySelector('.cl-xray');
if(xrayPanel&&xrayPanel.parentNode)xrayPanel.after(panel);else return;

let runs=[];let baselineId=null;let variantId=null;let activeReport=null;
function runLabel(run){return (run.status==='won'?'✓':'×')+' '+run.levelTitle+' · '+run.timeSeconds.toFixed(2)+' s · '+new Date(run.at).toLocaleString();}
function currentPair(){const baseline=runs.find(run=>run.id===baselineId);const variant=runs.find(run=>run.id===variantId);return baseline&&variant?{baseline,variant}:null;}
function populateSelects() {
  for(const select of [baseField.select,variantField.select])select.replaceChildren();
  const empty=make('option','','Выбери запись…');empty.value='';
  baseField.select.append(empty.cloneNode(true));variantField.select.append(empty.cloneNode(true));
  for(const run of runs){const label=runLabel(run);const left=document.createElement('option');left.value=run.id;left.textContent=label;baseField.select.append(left);const right=document.createElement('option');right.value=run.id;right.textContent=label;variantField.select.append(right);}
  baseField.select.value=baselineId||'';variantField.select.value=variantId||'';
}
function changedIndices(diff,side) {
  const result=new Set();
  if(!diff||!diff.ok)return result;
  for(const op of diff.operations){
    if(side==='baseline'&&op.baselineIndex!==null)result.add(op.baselineIndex);
    if(side==='variant'&&op.variantIndex!==null)result.add(op.variantIndex);
  }
  return result;
}
function drawBoard(canvas,run,changed) {
  const rect=canvas.getBoundingClientRect();const width=Math.max(1,Math.round(rect.width||500));const height=Math.max(1,Math.round(rect.height||280));const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  const xScale=width/1000,yScale=height/560;
  ctx.strokeStyle='#8abac41c';ctx.lineWidth=1;
  for(let x=0;x<=1000;x+=100){ctx.beginPath();ctx.moveTo(x*xScale,0);ctx.lineTo(x*xScale,height);ctx.stroke();}
  for(let y=0;y<=560;y+=70){ctx.beginPath();ctx.moveTo(0,y*yScale);ctx.lineTo(width,y*yScale);ctx.stroke();}
  ctx.strokeStyle='#96c5d52a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,Math.min(height-5,520*yScale));ctx.lineTo(width,Math.min(height-5,520*yScale));ctx.stroke();
  if(!run){ctx.fillStyle='#6c8b9a';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('Выбери запуск',width/2,height/2);return;}
  const counts={};
  for(let i=0;i<run.devices.length;i++){
    const d=run.devices[i];const px=clamp(d.x,0,1000)*xScale,py=clamp(d.y,0,560)*yScale;const color=changed.has(i)?'#ffca73':(DEVICE_COLORS[d.type]||'#9db2be');
    counts[d.type]=(counts[d.type]||0)+1;
    ctx.save();ctx.translate(px,py);ctx.rotate(d.angle||0);ctx.shadowColor=color;ctx.shadowBlur=changed.has(i)?12:3;
    ctx.fillStyle=changed.has(i)?'#4e3614':'#07141d';ctx.strokeStyle=color;ctx.lineWidth=changed.has(i)?2.8:1.8;ctx.beginPath();if(typeof ctx.roundRect==='function')ctx.roundRect(-12,-10,24,20,5);else ctx.rect(-12,-10,24,20);ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle=color;ctx.font='bold 8px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(DEVICE_SYMBOLS[d.type]||'?',0,0);ctx.restore();
    ctx.fillStyle='#95aab7';ctx.font='8px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText('#'+(i+1),px+13,py-10);
  }
  ctx.fillStyle='#6b8798';ctx.font='8px ui-monospace,monospace';ctx.textAlign='right';
  ctx.fillText(Object.entries(counts).map(([type,count])=>(DEVICE_SYMBOLS[type]||type)+count).join(' · '),width-8,height-8);
}
function setStatus(message,kind='info'){status.textContent=message;status.dataset.kind=kind;}
function fmt(value,suffix=''){return finite(value)?((value>0?'+':'')+String(rounded(value,2)).replace('.',',')+suffix):'—';}
function renderOperations(diff){
  opList.replaceChildren();
  if(!diff||!diff.ok){opList.append(make('div','cl-diff-empty',diff&&diff.reason||'Выбери две записи.'));opCount.textContent='—';return;}
  opCount.textContent=diff.operationCount+' операций · '+diff.factorNames.length+' фактора(ов)';
  if(!diff.operations.length){opList.append(make('div','cl-diff-empty','Чертежи совпадают в пределах порогов: '+POSITION_TOLERANCE_PX+' px и '+rounded(ANGLE_TOLERANCE_RAD*180/Math.PI,1)+'°. Рассматривай пару как повтор одного варианта.'));return;}
  for(const op of diff.operations){
    const row=make('article','cl-diff-op');const icon=make('span','cl-diff-opicon',op.kind==='added'?'+':op.kind==='removed'?'−':'Δ');
    const text=make('div');const title=op.kind==='added'?'Добавлено устройство':op.kind==='removed'?'Убрано устройство':'Изменено устройство';
    text.append(make('strong','',title+' · '+op.label));
    let detail='';
    if(op.kind==='changed'){
      detail='База: x '+op.from.x+', y '+op.from.y+', угол '+rounded(op.from.angle*180/Math.PI,1)+'°. Вариант: x '+op.to.x+', y '+op.to.y+', угол '+rounded(op.to.angle*180/Math.PI,1)+'°.';
      if(op.moved)detail+=' Смещение '+op.distance+' px (Δx '+op.dx+', Δy '+op.dy+').';
      if(op.rotated)detail+=' Поворот '+op.rotationDegrees+'°.';
    } else {
      const d=op.to||op.from;detail='Положение x '+d.x+', y '+d.y+', угол '+rounded(d.angle*180/Math.PI,1)+'°.';
    }
    text.append(make('p','',detail));row.append(icon,text);opList.append(row);
  }
}
function renderVariants(allRuns) {
  variants.replaceChildren();
  const grouped=summarizeRepeatability(allRuns).filter(group=>group.scenario===scenarioKey((runs.find(run=>run.id===variantId)||runs[0])));
  if(!grouped.length){variants.append(make('div','cl-diff-empty','После сохранения реальных траекторий варианты появятся здесь.'));return;}
  for(const group of grouped){
    const row=make('article','cl-diff-variant');const info=make('div');
    info.append(make('strong','',group.fingerprint+' · '+group.runCount+' запуск(а)'));
    const time=group.meanTime===null?'нет замеров':('среднее '+group.meanTime.toFixed(2)+' с'+(group.stdDev===null?'':' · SD '+group.stdDev.toFixed(2)+' с'));
    info.append(make('p','',group.successes+'/'+group.runCount+' доставок ('+group.successRate+'%) · '+time+' · '+group.stability+' · последняя запись '+group.latestRun));
    const choose=button('Сравнить с последней','',()=>{
      const members=runs.filter(run=>group.runIds.includes(run.id)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
      if(members.length>=2){baselineId=members[1].id;variantId=members[0].id;}
      else {variantId=members[0]?.id||null;baselineId=runs.find(run=>run.id!==variantId&&scenarioKey(run)===group.scenario)?.id||null;}
      populateSelects();render();setStatus('Выбран вариант '+group.fingerprint+'.','success');
    });
    row.append(info,choose);variants.append(row);
  }
}
function render(){
  runs=window.CASCADELAB022.getRuns().slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  if(!runs.some(run=>run.id===baselineId))baselineId=null;
  if(!runs.some(run=>run.id===variantId))variantId=null;
  if(!variantId&&runs.length)variantId=runs[0].id;
  if(!baselineId&&runs.length>1){
    const current=runs.find(run=>run.id===variantId)||runs[0];
    baselineId=runs.find(run=>run.id!==current.id&&scenarioKey(run)===scenarioKey(current))?.id||runs.find(run=>run.id!==current.id)?.id||null;
  }
  populateSelects();
  const pair=currentPair();const diff=pair?compareDesign(pair.baseline,pair.variant):{ok:false,reason:'Сохрани минимум два запуска в Trajectory X-Ray, затем выбери пару.'};
  const observed=pair?observedDelta(pair.baseline,pair.variant):{comparable:false};
  baseBoard.meta.textContent=pair?('L'+pair.baseline.levelId+' · '+fingerprintDesign(pair.baseline)):'нет записи';
  variantBoard.meta.textContent=pair?('L'+pair.variant.levelId+' · '+fingerprintDesign(pair.variant)):'нет записи';
  drawBoard(baseBoard.canvas,pair&&pair.baseline,changedIndices(diff,'baseline'));
  drawBoard(variantBoard.canvas,pair&&pair.variant,changedIndices(diff,'variant'));
  statEdits.value.textContent=diff.ok?String(diff.operationCount):'—';statEdits.note.textContent=diff.ok?diff.factorNames.length+' типов факторов':'Нужна пара';
  statFactors.value.textContent=diff.ok?(diff.singleEdit?'1 / чисто':String(diff.factorNames.length)):'—';statFactors.note.textContent=diff.ok?(diff.sameDesign?'Конструкция совпадает':diff.singleEdit?'Одна локальная правка':'Несколько правок / факторов'):'—';
  statOutcome.value.textContent=observed.comparable?(observed.outcome==='recovered'?'ПОБЕДА':observed.outcome==='regressed'?'ОТКАТ':observed.variantStatus==='won'?'ДВА УСПЕХА':'ДВА ОТКАЗА'):'—';
  statOutcome.note.textContent=observed.comparable?(observed.baselineStatus+' → '+observed.variantStatus):'Один сценарий обязателен';
  statDeviation.value.textContent=observed.comparable&&finite(observed.meanTrajectoryDeviation)?observed.meanTrajectoryDeviation.toFixed(1)+' px':'—';
  statDeviation.note.textContent='Среднее по нормированному времени';
  verdictBody.textContent=diff.ok?diff.note+' Наблюдаемый Δ времени: '+fmt(observed.timeDelta,' с')+'; устройств: '+fmt(observed.deviceCountDelta,'')+'. Среднее расхождение траекторий: '+fmt(observed.meanTrajectoryDeviation,' px')+'.':diff.reason;
  renderOperations(diff);renderVariants(runs);
  activeReport=pair&&diff.ok?buildReport(pair.baseline,pair.variant,runs):null;
  jsonButton.disabled=!activeReport;csvButton.disabled=!activeReport;copyButton.disabled=!activeReport;
}
function download(filename,body,type){
  const url=URL.createObjectURL(new Blob([body],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.hidden=true;panel.append(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function exportJson(){if(!activeReport)return;download('cascade-lab-differential-'+activeReport.study.levelId+'-'+activeReport.study.variantId+'.json',JSON.stringify(activeReport,null,2),'application/json;charset=utf-8');setStatus('Паспорт сравнения сохранён. Данные не отправлялись.','success');}
function exportCsv(){
  if(!activeReport)return;
  const d=activeReport.construction;
  const rows=[['schema','version','level_id','baseline_id','variant_id','classification','single_edit','operation_count','factor_names','baseline_fingerprint','variant_fingerprint','baseline_status','variant_status','time_delta_s','device_count_delta','peak_speed_delta','impact_speed_delta','activation_delta','mean_trajectory_deviation_px','causal_claim']];
  rows.push([activeReport.schema,activeReport.version,activeReport.study.levelId,activeReport.study.baselineId,activeReport.study.variantId,d.classification,d.singleEdit,d.operationCount,d.factorNames.join('; '),d.baselineFingerprint,d.variantFingerprint,activeReport.observed.baselineStatus,activeReport.observed.variantStatus,activeReport.observed.timeDelta,activeReport.observed.deviceCountDelta,activeReport.observed.peakSpeedDelta,activeReport.observed.impactSpeedDelta,activeReport.observed.activationDelta,activeReport.observed.meanTrajectoryDeviation,false]);
  download('cascade-lab-differential-'+activeReport.study.levelId+'.csv','\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');setStatus('CSV сравнения сохранён. Данные не отправлялись.','success');
}
async function copySummary(){
  if(!activeReport)return;
  const lines=[
    'CASCADE LAB DIFFERENTIAL LAB '+VERSION,
    'Протокол: '+activeReport.study.levelTitle+' (#'+activeReport.study.levelId+')',
    'База: '+activeReport.study.baselineId+' · вариант: '+activeReport.study.variantId,
    'Отпечаток базы: '+activeReport.construction.baselineFingerprint+' · варианта: '+activeReport.construction.variantFingerprint,
    'Изменения: '+activeReport.construction.operations.map(op=>op.kind+' '+op.label).join('; '),
    'Факторы: '+(activeReport.construction.factorNames.join(', ')||'нет'),
    'Исход: '+activeReport.observed.baselineStatus+' → '+activeReport.observed.variantStatus,
    'Δ времени: '+fmt(activeReport.observed.timeDelta,' с')+' · среднее расхождение пути: '+fmt(activeReport.observed.meanTrajectoryDeviation,' px'),
    'Вывод: '+activeReport.interpretation.text,
    'Ограничение: различия наблюдений не доказывают причинность.'
  ].join('\n');
  try{await navigator.clipboard.writeText(lines);setStatus('Краткий паспорт скопирован. Данные не отправлялись.','success');}
  catch{download('cascade-lab-differential-summary.txt',lines,'text/plain;charset=utf-8');setStatus('Сохранён текстовый вывод. Данные не отправлялись.','success');}
}
function refresh(newRun=false){
  const latest=window.CASCADELAB022.getRuns().slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  if(newRun&&latest[0]){variantId=latest[0].id;baselineId=latest.find(run=>run.id!==variantId&&scenarioKey(run)===scenarioKey(latest[0]))?.id||null;}
  render();setStatus('Обновлено: '+runs.length+' записей доступны локально.','success');
}
baseField.select.addEventListener('change',()=>{baselineId=baseField.select.value||null;render();});
variantField.select.addEventListener('change',()=>{variantId=variantField.select.value||null;render();});
window.addEventListener('cascade-lab:run-finished',()=>refresh(true));
if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(()=>{const pair=currentPair();const diff=pair?compareDesign(pair.baseline,pair.variant):null;drawBoard(baseBoard.canvas,pair&&pair.baseline,changedIndices(diff,'baseline'));drawBoard(variantBoard.canvas,pair&&pair.variant,changedIndices(diff,'variant'));});observer.observe(panel);}
render();
Object.defineProperty(window,'CASCADELAB023',{value:Object.freeze({version:VERSION,schema:SCHEMA,compareDesign,canonicalDesign,fingerprintDesign,observedDelta,summarizeRepeatability,buildReport}),configurable:false,enumerable:false,writable:false});
})();
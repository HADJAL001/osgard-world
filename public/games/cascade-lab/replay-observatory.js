(() => {
'use strict';
const VERSION='0.26.0';
const SCHEMA='osgard.cascade-lab.replay-observatory.v1';
const ARCHIVE_SCHEMA='osgard.cascade-lab.replay-observatory-archive.v1';
const STORAGE_KEY=SCHEMA;
const MAX_RUNS=30, MAX_FRAMES=420, MAX_EVENTS=40, MAX_IMPORT_BYTES=350*1024;
const TYPES=new Set(['spring','fan','belt','magnet','switch','bumper']);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const list=v=>Array.isArray(v)?v:[];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const round=(v,n=2)=>finite(v)?Number(v.toFixed(n)):null;
const clean=(v,n=160)=>String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
function canonical(value){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
function hash(value){
 let h=0x811c9dc5;
 for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,0x01000193)>>>0;}
 return h.toString(16).padStart(8,'0').toUpperCase();
}
function normalize(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const levelId=Number(raw.levelId);
 if(!Number.isInteger(levelId)||levelId<1||levelId>5||!['won','lost'].includes(raw.status))return null;
 const stamp=Date.parse(raw.at||'');
 if(!Number.isFinite(stamp))return null;
 const devices=list(raw.devices).slice(0,12).filter(d=>d&&TYPES.has(d.type)&&finite(d.x)&&finite(d.y)&&finite(d.angle))
  .map(d=>({type:d.type,x:round(clamp(d.x,-100,1200),1),y:round(clamp(d.y,-100,700),1),angle:round(clamp(d.angle,-400,400),3)}));
 const trajectory=list(raw.trajectory).slice(0,MAX_FRAMES).filter(p=>p&&finite(p.t)&&finite(p.x)&&finite(p.y))
  .map(p=>({t:round(clamp(p.t,0,120),3),x:round(clamp(p.x,-200,1400),2),y:round(clamp(p.y,-200,850),2),
   vx:finite(p.vx)?round(clamp(p.vx,-10000,10000),2):null,vy:finite(p.vy)?round(clamp(p.vy,-10000,10000),2):null,
   gateOpen:p.gateOpen===true,checkpoints:list(p.checkpoints).slice(0,20).map(v=>clean(v,50))}));
 const events=list(raw.events|| (raw.telemetry&&raw.telemetry.events)).slice(-MAX_EVENTS).filter(e=>e&&typeof e==='object').map(e=>({
  type:clean(e.type||'event',36),label:clean(e.label||e.type||'Событие',100),t:finite(e.t)?round(clamp(e.t,0,120),3):null,
  x:finite(e.x)?round(clamp(e.x,-200,1400),1):null,y:finite(e.y)?round(clamp(e.y,-200,850),1):null,
  speed:finite(e.speed)?round(clamp(e.speed,0,10000),1):null}));
 const checkpointsReached=list(raw.checkpointsReached).slice(0,20).map(v=>clean(v,50));
 const telemetry=raw.telemetry&&typeof raw.telemetry==='object'?raw.telemetry:(raw.metrics&&typeof raw.metrics==='object'?raw.metrics:{});
 const blueprint={levelId,devices};
 const blueprintFingerprint=hash(canonical(blueprint));
 const traceFingerprint=hash(canonical(trajectory.map(p=>({t:p.t,x:p.x,y:p.y,vx:p.vx,vy:p.vy,gateOpen:p.gateOpen,checkpoints:p.checkpoints}))));
 const duration=finite(raw.timeSeconds)?round(clamp(raw.timeSeconds,0,120),3):finite(raw.duration)?round(clamp(raw.duration,0,120),3):(trajectory.length?trajectory[trajectory.length-1].t:0);
 const distances=[];
 for(let i=1;i<trajectory.length;i++)distances.push(Math.hypot(trajectory[i].x-trajectory[i-1].x,trajectory[i].y-trajectory[i-1].y));
 const distance=distances.reduce((a,b)=>a+b,0);
 const gaps=[];
 for(let i=1;i<trajectory.length;i++)gaps.push(trajectory[i].t-trajectory[i-1].t);
 const nonMonotonic=gaps.filter(g=>g<0).length;
 const duplicateFrames=trajectory.length-new Set(trajectory.map(p=>p.t+'|'+p.x+'|'+p.y)).size;
 const speedSamples=trajectory.filter(p=>finite(p.vx)&&finite(p.vy)).map(p=>Math.hypot(p.vx,p.vy));
 const peakSpeed=speedSamples.length?Math.max(...speedSamples):finite(telemetry.peakSpeed)?clamp(telemetry.peakSpeed,0,10000):null;
 const status=raw.status;
 const grade=clean(raw.grade||'—',24);
 const run={
  id:clean(raw.id||('replay-'+stamp.toString(36)+'-'+hash(blueprintFingerprint+traceFingerprint)),100),
  at:new Date(stamp).toISOString(),levelId,levelTitle:clean(raw.levelTitle||('Протокол '+levelId),80),
  mode:clean(raw.mode||'campaign',30),status,duration,grade,deviceCount:devices.length,devices,
  blueprintFingerprint,traceFingerprint,trajectory,events,checkpointsReached,
  metrics:{distance:round(distance,2),peakSpeed:round(peakSpeed,2),frameCount:trajectory.length,eventCount:events.length,
   impacts:finite(telemetry.impacts)?clamp(Math.round(telemetry.impacts),0,10000):null,
   activations:finite(telemetry.activations)?clamp(Math.round(telemetry.activations),0,10000):null,
   checkpointCount:checkpointsReached.length,nonMonotonic,duplicateFrames},
  quality:{score:0,grade:'UNVERIFIED',issues:[]}
 };
 run.quality=quality(run);
 return run;
}
function quality(run){
 const issues=[];
 if(run.trajectory.length<2)issues.push('Недостаточно кадров траектории');
 if(run.metrics.nonMonotonic>0)issues.push('Время траектории идёт назад');
 if(run.metrics.duplicateFrames>Math.max(2,Math.floor(run.trajectory.length*.1)))issues.push('Много повторяющихся кадров');
 if(run.trajectory.length>0&&run.duration>0&&Math.abs(run.trajectory[run.trajectory.length-1].t-run.duration)>Math.max(1,run.duration*.25))issues.push('Время сводки расходится с последним кадром');
 if(run.metrics.frameCount===MAX_FRAMES)issues.push('Трасса ограничена лимитом записи');
 if(!run.events.length)issues.push('Нет событий телеметрии для перекрёстной проверки');
 let score=100;
 if(run.trajectory.length<2)score-=45;
 if(run.metrics.nonMonotonic)score-=Math.min(35,run.metrics.nonMonotonic*10);
 if(run.metrics.duplicateFrames>2)score-=Math.min(20,run.metrics.duplicateFrames);
 if(run.duration<=0)score-=20;
 if(!run.events.length)score-=8;
 if(run.metrics.frameCount===MAX_FRAMES)score-=5;
 score=clamp(score,0,100);
 return {score,grade:score>=90?'STRONG':score>=70?'USABLE':score>=45?'WEAK':'REJECT',issues};
}
function compareRuns(a,b){
 if(!a||!b||a.levelId!==b.levelId)return {ok:false,reason:'Сравнивать можно только запуски одного протокола.'};
 const sameBlueprint=a.blueprintFingerprint===b.blueprintFingerprint;
 const frameCount=Math.min(a.trajectory.length,b.trajectory.length);
 let sum=0,max=0;
 for(let i=0;i<frameCount;i++){
  const p=a.trajectory[Math.round(i*(a.trajectory.length-1)/Math.max(1,frameCount-1))];
  const q=b.trajectory[Math.round(i*(b.trajectory.length-1)/Math.max(1,frameCount-1))];
  const delta=Math.hypot(p.x-q.x,p.y-q.y);sum+=delta;max=Math.max(max,delta);
 }
 const avg=frameCount?round(sum/frameCount,2):null;
 const timeDelta=round(a.duration-b.duration,3);
 const outcomeChanged=a.status!==b.status;
 const score=clamp(Math.round(100-(avg===null?35:Math.min(65,avg/3))-(outcomeChanged?20:0)-(a.quality.score<70||b.quality.score<70?15:0)),0,100);
 return {ok:true,sameBlueprint,frameCount,meanTrajectoryDeviation:avg,maxTrajectoryDeviation:round(max,2),timeDelta,
  outcomeChanged,deviceDelta:a.deviceCount-b.deviceCount,qualityDelta:a.quality.score-b.quality.score,
  verdict:sameBlueprint&&avg!==null&&avg<2&&!outcomeChanged?'TRACE_STABLE':sameBlueprint?'SAME_BLUEPRINT_DIVERGENCE':'BLUEPRINT_CHANGED',
  confidence:score>=85?'HIGH':score>=60?'MEDIUM':'LOW',
  note:'Отпечаток — быстрый локальный контроль целостности, не криптографическая подпись. Отклонение траекторий не доказывает причину.'};
}
function validateArchive(payload){
 if(!payload||payload.schema!==ARCHIVE_SCHEMA||payload.schemaVersion!==1||!Array.isArray(payload.runs)||payload.runs.length>MAX_RUNS)return {ok:false,error:'Схема архива не поддерживается или превышен лимит записей.'};
 const runs=payload.runs.map(normalize);
 if(runs.some(r=>!r))return {ok:false,error:'Архив содержит некорректную запись запуска.'};
 if(new Set(runs.map(r=>r.id)).size!==runs.length)return {ok:false,error:'В архиве обнаружены повторяющиеся ID.'};
 return {ok:true,runs};
}
const api={version:VERSION,schema:SCHEMA,archiveSchema:ARCHIVE_SCHEMA,maxRuns:MAX_RUNS,maxFrames:MAX_FRAMES,normalize,quality,compareRuns,validateArchive,hash,canonical};
if(typeof window==='undefined'||!window.document){globalThis.__CASCADELAB026_TEST__=api;return;}
if(window.CASCADELAB026)return;
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const css=[
'.cl-replay-observatory{margin:22px auto 34px;max-width:1180px;padding:clamp(14px,2.2vw,24px);border:1px solid #70e0ff38;border-radius:20px;background:radial-gradient(ellipse at 8% 0%,#28c6e51a,transparent 38%),linear-gradient(145deg,#0c1424f7,#101827f5);color:#eaf4ff;font:14px/1.5 system-ui,sans-serif;box-shadow:0 22px 70px #0005}'
,'.cl-replay-observatory *{box-sizing:border-box}.cl-ro-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}.cl-ro-kicker{color:#70e0ff;font-size:11px;letter-spacing:.17em;font-weight:800}.cl-ro-title{font-size:clamp(22px,3vw,32px);line-height:1.12;margin:5px 0 8px;font-weight:850;letter-spacing:-.035em}.cl-ro-sub{color:#a9bdd4;max-width:760px}.cl-ro-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}.cl-ro-stat{border:1px solid #ffffff16;border-radius:13px;background:#ffffff06;padding:12px}.cl-ro-stat b{display:block;font-size:23px;line-height:1.2}.cl-ro-stat span{font-size:11px;color:#a9bdd4;letter-spacing:.08em}.cl-ro-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.cl-ro-controls select,.cl-ro-controls button,.cl-ro-controls input,.cl-ro-note{background:#111f32;border:1px solid #ffffff2a;border-radius:9px;color:#eaf4ff;padding:9px 11px;font:inherit;max-width:100%}.cl-ro-controls button{cursor:pointer;font-weight:750}.cl-ro-controls button:hover{border-color:#70e0ff}.cl-ro-controls button:disabled{opacity:.45;cursor:not-allowed}.cl-ro-primary{background:#70e0ff!important;color:#08121e!important;border-color:#70e0ff!important}.cl-ro-table-wrap{overflow:auto;margin-top:12px}.cl-ro-table{border-collapse:collapse;width:100%;min-width:700px}.cl-ro-table th,.cl-ro-table td{padding:10px 9px;border-bottom:1px solid #ffffff14;text-align:left;font-size:12px}.cl-ro-table th{color:#a9bdd4;font-size:10px;letter-spacing:.1em}.cl-ro-badge{display:inline-block;padding:3px 7px;border:1px solid #70e0ff44;border-radius:6px;color:#70e0ff;font-size:10px;font-weight:800}.cl-ro-note{display:block;width:100%;min-height:66px;resize:vertical;margin-top:12px}.cl-ro-foot{margin-top:12px;color:#9fb2c9;font-size:11px}.cl-ro-status{margin-top:9px;color:#70e0ff;min-height:22px}.cl-ro-diff{margin-top:12px;border:1px solid #70e0ff30;border-radius:12px;padding:13px;background:#70e0ff08}.cl-ro-empty{padding:18px;border:1px dashed #ffffff2b;border-radius:12px;color:#a9bdd4}@media(max-width:700px){.cl-ro-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-ro-stat b{font-size:20px}}@media(prefers-reduced-motion:reduce){.cl-replay-observatory *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}'
].join('');
const style=make('style');style.dataset.cascadeLabReplayObservatory=VERSION;style.textContent=css;document.head.append(style);
const panel=make('section','cl-replay-observatory');panel.id='cascadeLabReplayObservatory';panel.setAttribute('aria-labelledby','cl-ro-title');
const head=make('div','cl-ro-head'),intro=make('div',''),kicker=make('div','cl-ro-kicker','CASCADE LAB / REPLAY OBSERVATORY 0.26');
intro.append(kicker,make('h2','cl-ro-title','Воспроизводимость под микроскопом'),make('p','cl-ro-sub','Сверяй отпечатки сборки и траектории, замечай расхождения между повторными запусками и отделяй качество записи от результата уровня. Все данные остаются в этом браузере.'));
const headBadge=make('span','cl-ro-badge','LOCAL-FIRST · NO UPLOAD');head.append(intro,headBadge);panel.append(head);
const stats=make('div','cl-ro-grid');
const statDefs=[['runs','0','ЗАПУСКОВ В ЖУРНАЛЕ'],['quality','—','СРЕДНЕЕ КАЧЕСТВО ЗАПИСИ'],['repeat','0','ПОВТОРНЫЕ СБОРКИ'],['drift','—','СРЕДНЕЕ ОТКЛОНЕНИЕ']];
const statNodes={};
for(const [key,value,label] of statDefs){const card=make('div','cl-ro-stat'),v=make('b','',value),l=make('span','',label);card.append(v,l);stats.append(card);statNodes[key]=v;}
panel.append(stats);
const controls=make('div','cl-ro-controls'),levelSelect=make('select'),aSelect=make('select'),bSelect=make('select');
levelSelect.setAttribute('aria-label','Фильтр по протоколу');levelSelect.append(make('option','','Все протоколы'));for(let i=1;i<=5;i++)levelSelect.append(make('option','', 'Протокол '+i)),levelSelect.lastChild.value=String(i);
aSelect.setAttribute('aria-label','Первый запуск для сравнения');bSelect.setAttribute('aria-label','Второй запуск для сравнения');
const compareButton=make('button','','Сравнить трассы'),exportButton=make('button','','Экспорт JSON'),csvButton=make('button','','Экспорт CSV'),importButton=make('button','','Импорт архива'),clearButton=make('button','','Очистить журнал');
compareButton.className='cl-ro-primary';const fileInput=make('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.hidden=true;
controls.append(levelSelect,aSelect,bSelect,compareButton,exportButton,csvButton,importButton,clearButton,fileInput);panel.append(controls);
const diff=make('div','cl-ro-diff');diff.hidden=true;panel.append(diff);
const tableWrap=make('div','cl-ro-table-wrap'),table=make('table','cl-ro-table'),thead=make('thead'),tr=make('tr');
for(const label of ['ВРЕМЯ','ПРОТОКОЛ','РЕЗУЛЬТАТ','СБОРКА / ТРАССА','КАЧЕСТВО','КАДРЫ / СОБЫТИЯ'])tr.append(make('th','',label));
thead.append(tr);const tbody=make('tbody');table.append(thead,tbody);tableWrap.append(table);panel.append(tableWrap);
const note=make('textarea','cl-ro-note');note.maxLength=1200;note.placeholder='Локальная заметка исследователя: что изменил, что наблюдал и какую проверку выполнить дальше…';note.setAttribute('aria-label','Локальная заметка исследователя');panel.append(note);
const status=make('div','cl-ro-status','Журнал готов. Заверши уровень, чтобы добавить новый запуск.');panel.append(status);
panel.append(make('p','cl-ro-foot','Отпечатки FNV-1a нужны для быстрого поиска изменений и не являются криптографическим доказательством. Одинаковая сборка не гарантирует одинаковую среду; корреляция не доказывает причинность.'));
const mount=()=>{if(!document.getElementById(panel.id))document.body.append(panel);};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
let runs=load(),noteValue='';
function load(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return [];const p=JSON.parse(raw);if(p&&p.schema===ARCHIVE_SCHEMA&&Array.isArray(p.runs))return p.runs.map(normalize).filter(Boolean).slice(0,MAX_RUNS);}catch{}return [];}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({schema:ARCHIVE_SCHEMA,schemaVersion:1,runs:runs.slice(0,MAX_RUNS)}));return true;}catch{setStatus('Не удалось сохранить: возможно, хранилище браузера заполнено.','error');return false;}}
function setStatus(text,kind){status.textContent=text;status.dataset.kind=kind||'info';}
function download(name,mime,text){const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=make('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csvCell(value){let s=String(value==null?'':value);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function render(){
 const filtered=runs.filter(r=>!levelSelect.value||r.levelId===Number(levelSelect.value));
 statNodes.runs.textContent=String(runs.length);
 statNodes.quality.textContent=runs.length?Math.round(runs.reduce((s,r)=>s+r.quality.score,0)/runs.length)+'/100':'—';
 const grouped=new Map();for(const r of runs){const k=r.levelId+'|'+r.blueprintFingerprint;grouped.set(k,(grouped.get(k)||0)+1);}
 statNodes.repeat.textContent=String([...grouped.values()].filter(n=>n>1).length);
 const comps=[];for(let i=0;i<runs.length;i++)for(let j=i+1;j<runs.length;j++){if(runs[i].levelId===runs[j].levelId&&runs[i].blueprintFingerprint===runs[j].blueprintFingerprint){const c=compareRuns(runs[i],runs[j]);if(c.ok&&c.meanTrajectoryDeviation!==null)comps.push(c.meanTrajectoryDeviation);}}
 statNodes.drift.textContent=comps.length?(comps.reduce((a,b)=>a+b,0)/comps.length).toFixed(1)+' px':'—';
 tbody.replaceChildren();
 for(const r of filtered){const row=make('tr'),values=[
  new Date(r.at).toLocaleString(),r.levelTitle+' · #'+r.levelId,r.status==='won'?'ДОСТАВЛЕНО':'НЕ ДОСТАВЛЕНО',
  r.blueprintFingerprint+' / '+r.traceFingerprint,r.quality.score+'/100 '+r.quality.grade,
  r.metrics.frameCount+' / '+r.metrics.eventCount
 ];
  for(let i=0;i<values.length;i++){const cell=make('td','',values[i]);if(i===3){const badge=make('span','cl-ro-badge',values[i]);cell.replaceChildren(badge);}row.append(cell);}
  tbody.append(row);
 }
 if(!filtered.length){const row=make('tr'),cell=make('td','',runs.length?'Нет запусков для выбранного протокола.':'Здесь появятся реальные записи после завершения уровня.');cell.colSpan=6;row.append(cell);tbody.append(row);}
 fillSelect(aSelect,filtered);fillSelect(bSelect,filtered);compareButton.disabled=!aSelect.value||!bSelect.value||aSelect.value===bSelect.value;
}
function fillSelect(select,items){const previous=select.value;select.replaceChildren(make('option','','Выбрать запуск…'));for(const r of items){const o=make('option','',r.levelTitle+' · '+r.status+' · '+r.at.slice(0,16)+' · '+r.blueprintFingerprint);o.value=r.id;select.append(o);}if(items.some(r=>r.id===previous))select.value=previous;}
function selected(id){return runs.find(r=>r.id===id)||null;}
function renderDiff(){
 const a=selected(aSelect.value),b=selected(bSelect.value);if(!a||!b||a.id===b.id){diff.hidden=true;return;}
 const c=compareRuns(a,b);diff.replaceChildren();diff.hidden=false;
 if(!c.ok){diff.append(make('b','',c.reason));return;}
 diff.append(make('b','',c.verdict+' · уверенность '+c.confidence));
 const lines=[
  'Одинаковая сборка: '+(c.sameBlueprint?'да':'нет'),
  'Среднее отклонение траекторий: '+(c.meanTrajectoryDeviation===null?'нет данных':c.meanTrajectoryDeviation+' px'),
  'Максимальное отклонение: '+(c.maxTrajectoryDeviation===null?'нет данных':c.maxTrajectoryDeviation+' px'),
  'Разница времени A − B: '+c.timeDelta+' с',
  'Разница деталей A − B: '+c.deviceDelta,
  'Изменился исход: '+(c.outcomeChanged?'да':'нет'),
  c.note
 ];
 const ul=make('ul');for(const line of lines)ul.append(make('li','',line));diff.append(ul);
}
levelSelect.addEventListener('change',render);
aSelect.addEventListener('change',()=>{renderDiff();render();});
bSelect.addEventListener('change',()=>{renderDiff();render();});
compareButton.addEventListener('click',renderDiff);
exportButton.addEventListener('click',()=>download('cascade-lab-replay-observatory.json','application/json;charset=utf-8',JSON.stringify({schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs},null,2)));
csvButton.addEventListener('click',()=>{const rows=[['id','at','levelId','status','blueprintFingerprint','traceFingerprint','duration','deviceCount','qualityScore','qualityGrade','frames','events','distance','peakSpeed'],...runs.map(r=>[r.id,r.at,r.levelId,r.status,r.blueprintFingerprint,r.traceFingerprint,r.duration,r.deviceCount,r.quality.score,r.quality.grade,r.metrics.frameCount,r.metrics.eventCount,r.metrics.distance,r.metrics.peakSpeed])];download('cascade-lab-replay-observatory.csv','text/csv;charset=utf-8','\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'));});
importButton.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',async()=>{const file=fileInput.files&&fileInput.files[0];fileInput.value='';if(!file)return;if(file.size>MAX_IMPORT_BYTES){setStatus('Архив превышает 350 КиБ.','error');return;}try{const payload=JSON.parse(await file.text()),valid=validateArchive(payload);if(!valid.ok)throw new Error(valid.error);const map=new Map(runs.map(r=>[r.id,r]));for(const r of valid.runs)if(!map.has(r.id))map.set(r.id,r);runs=Array.from(map.values()).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS);persist();render();setStatus('Импорт завершён. Новые записи добавлены в локальный журнал.');}catch(e){setStatus(clean(e&&e.message||'Не удалось проверить архив.',220),'error');}});
clearButton.addEventListener('click',()=>{if(!confirm('Удалить все локальные записи Replay Observatory?'))return;runs=[];persist();diff.hidden=true;render();setStatus('Локальный журнал очищен.');});
note.addEventListener('input',()=>{noteValue=note.value.slice(0,1200);try{localStorage.setItem(STORAGE_KEY+':note',noteValue);}catch{}});
try{noteValue=localStorage.getItem(STORAGE_KEY+':note')||'';note.value=noteValue;}catch{}
window.addEventListener('cascade-lab:run-finished',event=>{
 const raw=event.detail||{},normalized=normalize({...raw,id:'ro-'+Date.now().toString(36)+'-'+hash(canonical(raw)),at:raw.at||new Date().toISOString()});
 if(!normalized){setStatus('Запуск не записан: формат сводки не прошёл проверку.','error');return;}
 runs=[normalized,...runs.filter(r=>r.id!==normalized.id)].slice(0,MAX_RUNS);
 if(persist()){render();setStatus('Запуск зафиксирован локально · качество '+normalized.quality.score+'/100 · сборка '+normalized.blueprintFingerprint+' · трасса '+normalized.traceFingerprint);}
});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){runs=load();render();}});
render();
Object.defineProperty(window,'CASCADELAB026',{value:Object.freeze({version:VERSION,schema:SCHEMA,compareRuns,quality,getRuns:()=>runs.map(r=>JSON.parse(JSON.stringify(r))) }),configurable:false,enumerable:false,writable:false});
})();
(() => {
'use strict';
const VERSION = '0.20.0';
const SCHEMA = 'osgard.cascade-lab.flight-recorder.v1';
const STORAGE_KEY = SCHEMA;
const MAX_RUNS = 12;
const MAX_SAMPLES = 180;
const MAX_ARCHIVE_BYTES = 120 * 1024;
const MAX_EVENTS = 24;
const WORLD = Object.freeze({ width: 960, height: 540 });
const finite = value => typeof value === 'number' && Number.isFinite(value);
const boundedText = (value, max = 140) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, places = 2) => finite(value) ? Number(value.toFixed(places)) : null;
const list = value => Array.isArray(value) ? value : [];
function normalisePoint(raw) {
  if (!raw || typeof raw !== 'object' || !finite(raw.t) || !finite(raw.x) || !finite(raw.y)) return null;
  return { t:clamp(raw.t,0,60), x:clamp(raw.x,-100,WORLD.width+100), y:clamp(raw.y,-100,WORLD.height+100),
    vx:finite(raw.vx)?clamp(raw.vx,-4000,4000):null, vy:finite(raw.vy)?clamp(raw.vy,-4000,4000):null,
    gateOpen:raw.gateOpen===true, checkpoints:list(raw.checkpoints).slice(0,20).filter(v=>typeof v==='string').map(v=>boundedText(v,80)) };
}
function samplePoints(rawPoints) {
  const all=list(rawPoints).map(normalisePoint).filter(Boolean);
  if(all.length<=MAX_SAMPLES)return all;
  const samples=[];
  for(let i=0;i<MAX_SAMPLES;i++)samples.push(all[Math.round(i*(all.length-1)/(MAX_SAMPLES-1))]);
  return samples;
}
function normaliseEvent(raw) {
  if(!raw||typeof raw!=='object'||!finite(raw.t))return null;
  return {type:boundedText(raw.type||'event',32),label:boundedText(raw.label||raw.type||'Событие',140),t:clamp(raw.t,0,60),
    x:finite(raw.x)?clamp(raw.x,-100,WORLD.width+100):null,y:finite(raw.y)?clamp(raw.y,-100,WORLD.height+100):null,
    speed:finite(raw.speed)?clamp(raw.speed,0,4000):null};
}
function normaliseRun(raw) {
  if(!raw||typeof raw!=='object')return null;
  const levelId=raw.levelId,capturedAt=Date.parse(raw.capturedAt||raw.at),points=samplePoints(raw.trace||raw.points);
  if(!Number.isInteger(levelId)||levelId<1||levelId>100||!['won','lost'].includes(raw.status)||!Number.isFinite(capturedAt)||points.length<2)return null;
  const events=list(raw.events||(raw.telemetry&&raw.telemetry.events)).map(normaliseEvent).filter(Boolean).slice(-MAX_EVENTS);
  const telemetry=raw.telemetry&&typeof raw.telemetry==='object'?raw.telemetry:{};
  return {schema:SCHEMA,id:boundedText(raw.id||('trace-'+capturedAt.toString(36)),90),capturedAt:new Date(capturedAt).toISOString(),
    levelId,levelTitle:boundedText(raw.levelTitle||('Протокол '+levelId),140),status:raw.status,reason:boundedText(raw.reason,240),
    timeSeconds:clamp(finite(raw.timeSeconds)?raw.timeSeconds:points[points.length-1].t,0,60),
    deviceCount:clamp(Number.isInteger(raw.deviceCount)?raw.deviceCount:0,0,12),
    telemetry:{peakSpeed:finite(telemetry.peakSpeed)?clamp(telemetry.peakSpeed,0,4000):null,
      lastImpactSpeed:finite(telemetry.lastImpactSpeed)?clamp(telemetry.lastImpactSpeed,0,4000):null,
      contacts:Number.isInteger(telemetry.contacts)?clamp(telemetry.contacts,0,10000):null,
      activations:Number.isInteger(telemetry.activations)?clamp(telemetry.activations,0,10000):null},
    events,points};
}
function validateArchive(raw) {
  if(!raw||typeof raw!=='object'||raw.schema!==SCHEMA||raw.schemaVersion!==1||!Array.isArray(raw.runs))return {ok:false,reason:'Неизвестная схема записи.'};
  if(raw.runs.length>MAX_RUNS)return {ok:false,reason:'Архив превышает лимит в '+MAX_RUNS+' запусков.'};
  let sourceSize=0;try{sourceSize=JSON.stringify(raw).length;}catch{return {ok:false,reason:'Архив не удалось прочитать.'};}
  if(sourceSize>MAX_ARCHIVE_BYTES)return {ok:false,reason:'Архив превышает 120 KiB.'};
  const runs=raw.runs.map(normaliseRun);
  if(runs.some(run=>!run))return {ok:false,reason:'Запись не прошла проверку структуры или траектории.'};
  const seen=new Set();for(const run of runs){if(seen.has(run.id))return {ok:false,reason:'В архиве есть повторяющийся ID.'};seen.add(run.id);}
  return {ok:true,archive:{schema:SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs}};
}
function compareRuns(current,previous) {
  if(!current||!previous||current.id===previous.id||current.levelId!==previous.levelId)return null;
  const delta=(a,b)=>finite(a)&&finite(b)?round(a-b):null;
  return {levelId:current.levelId,outcome:current.status===previous.status?'unchanged':current.status==='won'?'recovered':'regressed',
    secondsDelta:delta(current.timeSeconds,previous.timeSeconds),deviceDelta:delta(current.deviceCount,previous.deviceCount),
    peakSpeedDelta:delta(current.telemetry.peakSpeed,previous.telemetry.peakSpeed),sampleCountDelta:current.points.length-previous.points.length};
}
const pureApi=Object.freeze({version:VERSION,schema:SCHEMA,maxRuns:MAX_RUNS,maxSamples:MAX_SAMPLES,maxArchiveBytes:MAX_ARCHIVE_BYTES,world:WORLD,samplePoints,normaliseRun,validateArchive,compareRuns});
if(typeof window==='undefined'||!window.document){globalThis.__CASCADELAB020_TEST__=pureApi;return;}
if(window.CASCADELAB020)return;
const css=[
  '.cl-flight{margin:18px 0 28px;padding:clamp(15px,2vw,24px);border:1px solid #8edfff35;border-radius:18px;background:radial-gradient(ellipse at 80% 0%,#216e9725,transparent 45%),linear-gradient(145deg,#091724,#040a12);color:#eaf5fa;box-shadow:0 18px 48px #0003,inset 0 1px #ffffff09}',
  '.cl-flight-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cl-flight-kicker{margin:0;color:#6edbff;font:8px ui-monospace,monospace;letter-spacing:.18em}.cl-flight-badge{padding:5px 8px;border:1px solid #e9ba6a42;border-radius:5px;color:#e9ba6a;font:8px ui-monospace,monospace}',
  '.cl-flight h3{margin:9px 0 0;color:#f3f8fb;font:400 clamp(25px,3.6vw,40px)/1.05 Georgia,serif;letter-spacing:-.03em}.cl-flight-lead{max-width:800px;margin:9px 0 17px;color:#91acbc;font-size:10px;line-height:1.8}',
  '.cl-flight-plot-frame{position:relative;overflow:hidden;border:1px solid #78c4e32b;border-radius:13px;background:linear-gradient(180deg,#06121d,#030a11)}.cl-flight-svg{display:block;width:100%;height:auto;min-height:180px;touch-action:pan-y}.cl-flight-svg text{font-family:ui-monospace,monospace;fill:#668ca0;font-size:12px}.cl-flight-svg .plot-grid{stroke:#6593a71d;stroke-width:1}.cl-flight-svg .plot-border{fill:none;stroke:#73b6d633;stroke-width:1}.cl-flight-svg .trace-line{fill:none;stroke:url(#clFlightGradient);stroke-width:4;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 5px #46d5f766)}.cl-flight-svg .trace-compare{fill:none;stroke:#e9ba6a;stroke-opacity:.65;stroke-width:2;stroke-dasharray:6 6;stroke-linecap:round}.cl-flight-svg .flight-start{fill:#70efbd;stroke:#08141b;stroke-width:3}.cl-flight-svg .flight-end{fill:#ff8ca8;stroke:#08141b;stroke-width:3}.cl-flight-svg .flight-sample{fill:#f6e6b6;stroke:#06121b;stroke-width:4;filter:drop-shadow(0 0 10px #e9ba6a)}.cl-flight-svg .flight-event{fill:#e9ba6a;stroke:#07121a;stroke-width:2;cursor:pointer}.cl-flight-svg .flight-event:focus{outline:none;stroke:#eafcff;stroke-width:4}.cl-flight-svg .velocity-vector{stroke:#f4cf84;stroke-width:3;stroke-linecap:round;filter:drop-shadow(0 0 4px #e9ba6a88)}',
  '.cl-flight-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 13px;border:1px solid #80bdd028;border-top:0;border-radius:0 0 12px 12px;background:#07131d}.cl-flight-range-wrap{min-width:0}.cl-flight-range-head{display:flex;justify-content:space-between;gap:8px;color:#7e9daf;font:8px ui-monospace,monospace}.cl-flight-range{width:100%;margin:12px 0 3px;accent-color:#70dcff;cursor:ew-resize}.cl-flight-buttons{display:flex;gap:6px;flex-wrap:wrap}.cl-flight-button{min-height:38px;padding:8px 10px;border:1px solid #7bc8e63d;border-radius:8px;background:#0b2230;color:#bfeaff;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-flight-button.primary{border-color:#e9ba6a;background:linear-gradient(120deg,#f4d28f,#d99e49);color:#261b0a}.cl-flight-button:hover{filter:brightness(1.12)}.cl-flight-button:focus-visible,.cl-flight-range:focus-visible,.cl-flight-check input:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}',
  '.cl-flight-readout{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:10px}.cl-flight-metric{min-width:0;padding:10px;border:1px solid #8bb9cd24;border-radius:9px;background:#06111b}.cl-flight-metric span{display:block;color:#6c92a5;font:7px ui-monospace,monospace;letter-spacing:.08em}.cl-flight-metric strong{display:block;margin-top:7px;color:#eef7fb;font:600 clamp(13px,1.6vw,19px) Georgia,serif;overflow-wrap:anywhere}',
  '.cl-flight-lower{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:9px;margin-top:11px}.cl-flight-card{min-width:0;padding:13px;border:1px solid #8bb9cd22;border-radius:11px;background:#06111b}.cl-flight-card-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0;color:#c7dbe5;font:8px ui-monospace,monospace;letter-spacing:.11em}.cl-flight-toggle{display:flex;align-items:center;gap:7px;margin-top:9px;color:#95b2c1;font-size:9px}.cl-flight-toggle input{accent-color:#e9ba6a}.cl-flight-event-list,.cl-flight-archive{display:grid;gap:6px;margin-top:9px;max-height:270px;overflow:auto}.cl-flight-event-button,.cl-flight-run-button{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:9px;width:100%;padding:8px;border:1px solid #83b4c622;border-radius:8px;background:#07151f;color:#9cb6c4;text-align:left;cursor:pointer}.cl-flight-event-button time{color:#dfbb79;font:8px ui-monospace,monospace;white-space:nowrap}.cl-flight-event-button strong,.cl-flight-run-button strong{display:block;color:#d9e8ef;font-size:9px;font-weight:650}.cl-flight-event-button small,.cl-flight-run-button small{display:block;margin-top:4px;color:#658799;font:7px/1.5 ui-monospace,monospace}.cl-flight-event-button:hover,.cl-flight-run-button:hover,.cl-flight-event-button[data-active=true]{border-color:#82d8f8}.cl-flight-empty{padding:12px;border:1px dashed #78b9cf2d;border-radius:8px;color:#7f9baa;font-size:9px;line-height:1.7}.cl-flight-status{min-height:20px;margin:10px 0 0;color:#83dafa;font-size:9px;line-height:1.5}.cl-flight-privacy{margin:8px 0 0;padding-top:9px;border-top:1px solid #80b5c519;color:#607f90;font:7px/1.65 ui-monospace,monospace}',
  '@media(max-width:720px){.cl-flight{padding:13px;border-radius:13px}.cl-flight-controls{grid-template-columns:1fr}.cl-flight-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cl-flight-button{min-height:43px}.cl-flight-readout{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-flight-lower{grid-template-columns:1fr}.cl-flight-svg{min-height:160px}.cl-flight-plot-frame{border-radius:10px}}',
  '@media(prefers-reduced-motion:reduce){.cl-flight *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}'
].join('');
const style=document.createElement('style');style.dataset.cascadeLabFlightRecorder=VERSION;style.textContent=css;document.head.append(style);
const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;};
const svgNode=(tag,attrs={})=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
const host=make('section','cl-flight');host.setAttribute('aria-labelledby','cl-flight-title');host.setAttribute('aria-describedby','cl-flight-lead');
const heading=make('h3','','Смотри, что реально произошло.');heading.id='cl-flight-title';
const lead=make('p','cl-flight-lead','Flight Recorder сохраняет траекторию законченного запуска: прокручивай время, смотри координаты и вектор скорости, прыгай к отметкам событий и сравнивай предыдущую попытку этого же протокола.');lead.id='cl-flight-lead';
const top=make('div','cl-flight-head');top.append(make('p','cl-flight-kicker','CASCADE LAB / FLIGHT RECORDER'),make('span','cl-flight-badge','BUILD '+VERSION));host.append(top,heading,lead);
const plotFrame=make('div','cl-flight-plot-frame');
const svg=svgNode('svg',{class:'cl-flight-svg',viewBox:'0 0 1000 560',role:'img','aria-label':'Карта траектории груза с событиями и вектором скорости'});plotFrame.append(svg);
const controls=make('div','cl-flight-controls'),rangeWrap=make('div','cl-flight-range-wrap'),rangeHead=make('div','cl-flight-range-head');
const rangeLabel=make('span','','ВРЕМЯ ЗАПИСИ'),rangeValue=make('strong','','—');rangeHead.append(rangeLabel,rangeValue);
const range=document.createElement('input');range.className='cl-flight-range';range.type='range';range.min='0';range.max='1';range.step='1';range.value='0';range.setAttribute('aria-label','Прокрутить траекторию по времени');
rangeWrap.append(rangeHead,range);
const buttons=make('div','cl-flight-buttons');
const playButton=make('button','cl-flight-button primary','▶ Прокрутить'),backButton=make('button','cl-flight-button','← Шаг назад'),forwardButton=make('button','cl-flight-button','Шаг вперёд →'),exportButton=make('button','cl-flight-button','Экспорт записи JSON');
[playButton,backButton,forwardButton,exportButton].forEach(button=>button.type='button');buttons.append(playButton,backButton,forwardButton,exportButton);controls.append(rangeWrap,buttons);host.append(plotFrame,controls);
const readout=make('div','cl-flight-readout'),metrics={};
for(const [key,label,valueText] of [['time','ВРЕМЯ','—'],['position','ПОЗИЦИЯ X / Y','—'],['speed','СКОРОСТЬ','—'],['velocity','ВЕКТОР VX / VY','—'],['state','СОСТОЯНИЕ','—']]){
 const card=make('div','cl-flight-metric');card.append(make('span','',label));const value=make('strong','',valueText);card.append(value);metrics[key]=value;readout.append(card);
}
host.append(readout);
const lower=make('div','cl-flight-lower'),eventCard=make('section','cl-flight-card'),eventHead=make('div','cl-flight-card-title');
eventHead.append(make('span','','МЕТКИ И СОБЫТИЯ'));const eventCount=make('span','cl-flight-badge','0');eventHead.append(eventCount);const eventList=make('div','cl-flight-event-list');eventCard.append(eventHead,eventList);
const archiveCard=make('section','cl-flight-card'),archiveHead=make('div','cl-flight-card-title');archiveHead.append(make('span','','ЛОКАЛЬНЫЕ ЗАПИСИ'));
const archiveCount=make('span','cl-flight-badge','0 / '+MAX_RUNS);archiveHead.append(archiveCount);
const compareLabel=make('label','cl-flight-toggle'),compareToggle=document.createElement('input');compareToggle.type='checkbox';compareToggle.checked=true;compareLabel.append(compareToggle,make('span','','Наложить прошлый запуск этого уровня'));
const archiveList=make('div','cl-flight-archive');archiveCard.append(archiveHead,compareLabel,archiveList);lower.append(eventCard,archiveCard);host.append(lower);
const status=make('p','cl-flight-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.append(status,make('p','cl-flight-privacy','ЛОКАЛЬНО В ЭТОМ БРАУЗЕРЕ · МАКС. 12 ТРАЕКТОРИЙ · МАКС. 180 ТОЧЕК НА ЗАПИСЬ · БЕЗ СЕТЕВОЙ ОТПРАВКИ'));
const anchor=document.querySelector('.cl-engineering'),hypothesis=document.querySelector('.cl-hypothesis'),bottomGrid=document.querySelector('.bottom-grid'),footer=document.querySelector('.app-footer')||document.querySelector('footer');
if(anchor&&typeof anchor.after==='function')anchor.after(host);else if(hypothesis&&typeof hypothesis.after==='function')hypothesis.after(host);else if(bottomGrid&&typeof bottomGrid.after==='function')bottomGrid.after(host);else if(footer&&typeof footer.before==='function')footer.before(host);else return;
let runs=loadRuns(),currentId=runs.length?runs[0].id:null,currentIndex=0,compareEnabled=true,playback=null,currentRun=runs.find(run=>run.id===currentId)||null;
function loadRuns(){try{const raw=window.localStorage.getItem(STORAGE_KEY);if(!raw)return[];const checked=validateArchive(JSON.parse(raw));return checked.ok?checked.archive.runs.sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt)).slice(0,MAX_RUNS):[];}catch{return[];}}
function persistRuns(){runs=runs.slice().sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt)).slice(0,MAX_RUNS);try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify({schema:SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs}));status.dataset.kind='success';status.textContent='Траектория сохранена в этом браузере. Серверу она не отправлялась.';}catch{status.dataset.kind='warning';status.textContent='Хранилище браузера недоступно: запись останется только в этой вкладке.';}}
function stopPlayback(){if(playback!==null)window.clearInterval(playback);playback=null;playButton.textContent='▶ Прокрутить';}
function selectedPoint(){return currentRun&&currentRun.points.length?currentRun.points[clamp(currentIndex,0,currentRun.points.length-1)]:null;}
function nearestIndex(run,seconds){if(!run||!run.points.length)return 0;let bestIndex=0,bestDistance=Infinity;run.points.forEach((point,index)=>{const distance=Math.abs(point.t-seconds);if(distance<bestDistance){bestDistance=distance;bestIndex=index;}});return bestIndex;}
function mapPoint(point){return{x:46+clamp(point.x/WORLD.width,0,1)*914,y:38+clamp(point.y/WORLD.height,0,1)*470};}
function plotLine(points,cls){if(points.length<2)return null;const coords=points.map(mapPoint);return svgNode('polyline',{class:cls,points:coords.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')});}
function addGrid(){
 for(let x=0;x<=WORLD.width;x+=120){const px=46+x/WORLD.width*914;svg.append(svgNode('line',{class:'plot-grid',x1:px,y1:38,x2:px,y2:508}));const label=svgNode('text',{x:px+3,y:526});label.textContent=String(x);svg.append(label);}
 for(let y=0;y<=WORLD.height;y+=90){const py=38+y/WORLD.height*470;svg.append(svgNode('line',{class:'plot-grid',x1:46,y1:py,x2:960,y2:py}));const label=svgNode('text',{x:7,y:py+4});label.textContent=String(y);svg.append(label);}
 svg.append(svgNode('rect',{class:'plot-border',x:46,y:38,width:914,height:470,rx:4}));
}
function renderPlot(){
 svg.replaceChildren();
 const defs=svgNode('defs'),grad=svgNode('linearGradient',{id:'clFlightGradient',x1:'0%',y1:'0%',x2:'100%',y2:'0%'});
 grad.append(svgNode('stop',{offset:'0%','stop-color':'#68d7ff'}),svgNode('stop',{offset:'58%','stop-color':'#8bafff'}),svgNode('stop',{offset:'100%','stop-color':'#e9ba6a'}));defs.append(grad);svg.append(defs);addGrid();
 if(!currentRun||currentRun.points.length<2){const empty=svgNode('text',{x:500,y:270,'text-anchor':'middle'});empty.textContent='Заверши запуск — и траектория появится здесь';svg.append(empty);return;}
 const previous=runs.find(run=>run.id!==currentRun.id&&run.levelId===currentRun.levelId);
 if(compareEnabled&&previous){const baseline=plotLine(previous.points,'trace-compare');if(baseline)svg.append(baseline);}
 const trace=plotLine(currentRun.points,'trace-line');if(trace)svg.append(trace);
 const first=mapPoint(currentRun.points[0]),last=mapPoint(currentRun.points[currentRun.points.length-1]);
 svg.append(svgNode('circle',{class:'flight-start',cx:first.x,cy:first.y,r:7}),svgNode('circle',{class:'flight-end',cx:last.x,cy:last.y,r:7}));
 for(const event of currentRun.events){
  if(!finite(event.x)||!finite(event.y))continue;
  const pos=mapPoint({x:event.x,y:event.y}),mark=svgNode('circle',{class:'flight-event',cx:pos.x,cy:pos.y,r:5,tabindex:0,role:'button','aria-label':event.label+', '+event.t.toFixed(2)+' seconds'});
  const title=svgNode('title');title.textContent=event.label+' · '+event.t.toFixed(2)+' с';mark.append(title);
  const jump=()=>{currentIndex=nearestIndex(currentRun,event.t);renderFrame();};mark.addEventListener('click',jump);
  mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();jump();}});svg.append(mark);
 }
 const point=selectedPoint();
 if(point){const pos=mapPoint(point);
  if(finite(point.vx)&&finite(point.vy)){const speed=Math.hypot(point.vx,point.vy),scale=Math.min(.12,55/Math.max(100,speed)),vx=point.vx*scale,vy=point.vy*scale;
   if(Math.hypot(vx,vy)>1){svg.append(svgNode('line',{class:'velocity-vector',x1:pos.x,y1:pos.y,x2:pos.x+vx,y2:pos.y+vy}));const angle=Math.atan2(vy,vx),size=8;
    const headPoints=(pos.x+vx)+','+(pos.y+vy)+' '+(pos.x+vx-size*Math.cos(angle-.5))+','+(pos.y+vy-size*Math.sin(angle-.5))+' '+(pos.x+vx-size*Math.cos(angle+.5))+','+(pos.y+vy-size*Math.sin(angle+.5));
    svg.append(svgNode('polygon',{fill:'#f4cf84',points:headPoints}));
   }
  }
  svg.append(svgNode('circle',{class:'flight-sample',cx:pos.x,cy:pos.y,r:8}));
 }
}
function deltaText(value,unit){return value===null?'—':(value>0?'+':'')+String(value).replace('.',',')+(unit||'');}
function renderComparisonText(){
 if(!currentRun)return;const previous=runs.find(run=>run.id!==currentRun.id&&run.levelId===currentRun.levelId);if(!previous)return;
 const d=compareRuns(currentRun,previous),outcome=d.outcome==='recovered'?'неудача → успех':d.outcome==='regressed'?'успех → неудача':'исход без изменений';
 status.textContent='Сравнение того же уровня: '+outcome+'; время '+deltaText(d.secondsDelta,' с')+'; детали '+deltaText(d.deviceDelta,'')+'. Золотая линия — предыдущая запись. Это визуальное сравнение, а не доказательство причинности.';
}
function renderFrame(){
 if(!currentRun||!currentRun.points.length){range.max='1';range.value='0';range.disabled=true;rangeValue.textContent='Нет записи';rangeLabel.textContent='ВРЕМЯ ЗАПИСИ';Object.values(metrics).forEach(el=>el.textContent='—');renderPlot();return;}
 range.disabled=false;range.max=String(currentRun.points.length-1);currentIndex=clamp(currentIndex,0,currentRun.points.length-1);range.value=String(currentIndex);
 const point=selectedPoint(),speed=finite(point.vx)&&finite(point.vy)?Math.hypot(point.vx,point.vy):null;
 rangeValue.textContent=point.t.toFixed(2).replace('.',',')+' с / '+currentRun.timeSeconds.toFixed(2).replace('.',',')+' с';rangeLabel.textContent=currentRun.levelTitle.toLocaleUpperCase('ru');
 metrics.time.textContent=point.t.toFixed(2).replace('.',',')+' с';metrics.position.textContent=Math.round(point.x)+' / '+Math.round(point.y);
 metrics.speed.textContent=speed===null?'—':Math.round(speed)+' px/s';metrics.velocity.textContent=finite(point.vx)&&finite(point.vy)?Math.round(point.vx)+' / '+Math.round(point.vy):'—';
 metrics.state.textContent=point.gateOpen?'ШЛЮЗ ОТКРЫТ':'ШЛЮЗ ЗАКРЫТ';renderPlot();
 eventList.querySelectorAll('[data-event-index]').forEach(el=>el.dataset.active='false');
 currentRun.events.forEach((event,index)=>{const button=eventList.querySelector('[data-event-index="'+index+'"]');if(button)button.dataset.active=String(Math.abs(event.t-point.t)<Math.max(.12,currentRun.timeSeconds/currentRun.points.length/2));});
 if(compareEnabled)renderComparisonText();
}
function renderEvents(){
 eventList.replaceChildren();if(!currentRun||!currentRun.events.length){eventList.append(make('p','cl-flight-empty','Этот запуск не содержит дополнительных событий движка.'));eventCount.textContent='0';return;}
 eventCount.textContent=String(currentRun.events.length);
 currentRun.events.forEach((event,index)=>{const button=make('button','cl-flight-event-button');button.type='button';button.dataset.eventIndex=String(index);
  const time=make('time','',event.t.toFixed(2).replace('.',',')+' с'),desc=make('span');desc.append(make('strong','',event.label),make('small','',event.type+(finite(event.speed)?' · '+Math.round(event.speed)+' px/s':'')));
  button.append(time,desc);button.addEventListener('click',()=>{stopPlayback();currentIndex=nearestIndex(currentRun,event.t);renderFrame();});eventList.append(button);
 });
}
function renderArchive(){
 archiveList.replaceChildren();archiveCount.textContent=runs.length+' / '+MAX_RUNS;
 if(!runs.length){archiveList.append(make('p','cl-flight-empty','После первого законченного запуска здесь появится запись траектории. Сохраняются только выборочные точки и события.'));return;}
 runs.forEach(run=>{const button=make('button','cl-flight-run-button');button.type='button';const icon=make('span','',run.status==='won'?'✓':'×'),label=make('span');
  label.append(make('strong','',run.levelTitle),make('small','',new Date(run.capturedAt).toLocaleString()+' · '+run.timeSeconds.toFixed(2)+' с · '+run.points.length+' точек · '+run.deviceCount+' деталей'));
  button.append(icon,label);button.addEventListener('click',()=>selectRun(run.id));archiveList.append(button);
 });
}
function selectRun(id){
 stopPlayback();currentRun=runs.find(run=>run.id===id)||null;currentId=currentRun?currentRun.id:null;currentIndex=0;
 heading.textContent=currentRun?currentRun.levelTitle+' — запись полёта':'Смотри, что реально произошло.';
 status.textContent=currentRun?'Выбрана локальная запись. Крути шкалу времени или нажми на событие.':'Нет выбранной записи.';
 renderEvents();renderFrame();renderArchive();
}
function captureRun(raw){
 if(!raw||!Array.isArray(raw.trace)||raw.trace.length<2){status.dataset.kind='error';status.textContent='Для записи недостаточно точек траектории. Повтори запуск после обновления страницы.';return;}
 const cleaned=normaliseRun({...raw,id:'trace-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),capturedAt:new Date().toISOString()});
 if(!cleaned){status.dataset.kind='error';status.textContent='Траектория не прошла проверку. Запись не сохранена.';return;}
 runs=[cleaned,...runs.filter(run=>run.id!==cleaned.id)].slice(0,MAX_RUNS);persistRuns();selectRun(cleaned.id);
}
function exportCurrent(){
 if(!currentRun){status.textContent='Сначала заверши запуск.';return;}
 const payload={schema:SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs:[currentRun]};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'})),link=document.createElement('a');
 link.href=url;link.download='cascade-flight-recorder-'+currentRun.levelId+'-'+currentRun.status+'.json';link.hidden=true;host.append(link);link.click();link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1500);status.textContent='Запись траектории экспортирована вручную в JSON. Автоматической отправки нет.';
}
range.addEventListener('input',()=>{stopPlayback();currentIndex=Number(range.value);renderFrame();});
backButton.addEventListener('click',()=>{stopPlayback();currentIndex=Math.max(0,currentIndex-1);renderFrame();});
forwardButton.addEventListener('click',()=>{stopPlayback();currentIndex=Math.min((currentRun?currentRun.points.length:1)-1,currentIndex+1);renderFrame();});
playButton.addEventListener('click',()=>{if(playback!==null){stopPlayback();return;}if(!currentRun||currentRun.points.length<2){status.textContent='Сначала заверши запуск.';return;}
 if(currentIndex>=currentRun.points.length-1)currentIndex=0;playButton.textContent='Ⅱ Пауза';
 playback=window.setInterval(()=>{if(!currentRun||currentIndex>=currentRun.points.length-1){stopPlayback();return;}currentIndex++;renderFrame();},90);
});
exportButton.addEventListener('click',exportCurrent);
compareToggle.addEventListener('change',()=>{compareEnabled=compareToggle.checked;renderFrame();});
window.addEventListener('cascade-lab:run-finished',event=>captureRun(event.detail||{}));
window.addEventListener('pagehide',stopPlayback);
renderArchive();renderEvents();renderFrame();
Object.defineProperty(window,'CASCADELAB020',{value:Object.freeze({version:VERSION,schema:SCHEMA,getRuns:()=>runs.map(run=>({...run,points:run.points.map(point=>({...point}))})),selectRun,samplePoints,validateArchive,compareRuns}),configurable:false,enumerable:false,writable:false});
})();
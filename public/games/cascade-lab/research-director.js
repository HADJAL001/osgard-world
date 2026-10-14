(() => {
'use strict';

const VERSION = '0.26.0';
const REQUEST_SCHEMA = 'osgard.cascade-lab.research-director.request.v1';
const RESPONSE_SCHEMA = 'osgard.cascade-lab.research-director.response.v1';
const STORE_KEY = 'osgard.cascade-lab.research-director.last-report.v1';
const DEVICE_TYPES = new Set(['spring','fan','belt','magnet','switch','bumper']);
const EVENT_TYPES = new Set([
  'start','spring','fan','belt','magnet','switch','bumper','landing','damage',
  'checkpoint','checkpoint-missed','goal','goal-missed','fall','timeout',
  'gate-open','contact','impact','delivery','unknown'
]);
const EVIDENCE_LABELS = Object.freeze({
  current_status: 'Исход запуска',
  current_time: 'Время запуска',
  device_count: 'Количество деталей',
  peak_speed: 'Пиковая скорость',
  impact_speed: 'Последний удар',
  gate_state: 'Состояние шлюза',
  checkpoint_coverage: 'Контрольные точки',
  recent_history: 'Сравнение с предыдущими попытками',
  repeatability: 'Повторяемость',
  trajectory: 'Траектория'
});
const clean = (value, max = 180) => String(value == null ? '' : value).replace(/\s+/g,' ').trim().slice(0,max);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const bounded = (value, low, high, digits = 2) => finite(value) ? Number(Math.max(low,Math.min(high,value)).toFixed(digits)) : null;
const safeArray = value => Array.isArray(value) ? value : [];
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function reasonCodeFromRun(run = {}) {
  if (run.status === 'won') return 'success';
  const reason = clean(run.reason, 240).toLocaleLowerCase('ru');
  const eventTypes = safeArray(run.telemetry?.events).map(event => clean(event?.type,36));
  if (run.fragile && (reason.includes('хруп') || reason.includes('жёстк') || eventTypes.includes('damage'))) return 'fragile-impact';
  if (reason.includes('контрольн') || reason.includes('сканер') || eventTypes.includes('goal-missed') || (safeArray(run.checkpoints).length > safeArray(run.checkpointsReached).length)) return 'checkpoint-missing';
  if (Number(run.gateCount) > 0 && run.gateOpen !== true && run.devices?.some(device => device.type === 'switch')) return 'gate-closed';
  if (reason.includes('время') || eventTypes.includes('timeout') || Number(run.timeSeconds) >= 28) return 'timeout';
  if (reason.includes('покинул трассу') || eventTypes.includes('fall') || (finite(run.position?.x) && (run.position.x < -70 || run.position.x > 1070)) || (finite(run.position?.y) && run.position.y > 630)) return 'off-track';
  return 'unknown';
}

function normalizeRunForResearch(run) {
  if (!run || typeof run !== 'object' || Array.isArray(run)) return null;
  const status = ['won','lost'].includes(run.status) ? run.status : null;
  const levelId = Number(run.levelId);
  const mode = run.mode === 'daily' ? 'daily' : run.mode === 'campaign' ? 'campaign' : null;
  if (!status || !Number.isInteger(levelId) || levelId < 1 || levelId > 5 || !mode) return null;
  const dailyDate = mode === 'daily' && validDate(run.dailyDate) ? run.dailyDate : null;
  if (mode === 'daily' && !dailyDate) return null;
  const timeSeconds = bounded(run.timeSeconds,0,120,3);
  const deviceCount = Number.isInteger(run.deviceCount) ? Math.max(0,Math.min(12,run.deviceCount)) : safeArray(run.devices).length;
  if (timeSeconds === null || deviceCount < 0 || deviceCount > 12) return null;
  const grade = ['A+','A','B','C','D','—'].includes(clean(run.grade,5)) ? clean(run.grade,5) : '—';
  const devices = safeArray(run.devices).slice(0,12).map(device => {
    if (!device || !DEVICE_TYPES.has(device.type)) return null;
    const x = bounded(device.x,-100,1200), y = bounded(device.y,-100,700), angle = bounded(device.angle,-400,400,4);
    return x === null || y === null || angle === null ? null : { type: device.type, x, y, angle };
  });
  if (devices.some(device => device === null)) return null;
  const checkpoints = safeArray(run.checkpoints);
  const checkpointsReached = safeArray(run.checkpointsReached);
  const telemetry = run.telemetry && typeof run.telemetry === 'object' ? run.telemetry : {};
  const frames = safeArray(run.trajectory);
  const count = Math.min(24,frames.length);
  const trajectory = count < 2 ? [] : Array.from({length:count},(_,index) => {
    const frame = frames[count === frames.length ? index : Math.round(index*(frames.length-1)/(count-1))];
    if (!frame) return null;
    const t = bounded(frame.t,0,120,3), x = bounded(frame.x,-200,1400), y = bounded(frame.y,-200,850);
    if (t === null || x === null || y === null) return null;
    return {
      t, x, y, vx: bounded(frame.vx,-10000,10000), vy: bounded(frame.vy,-10000,10000),
      gateOpen: frame.gateOpen === true
    };
  });
  if (trajectory.some(frame => frame === null)) return null;
  const events = safeArray(telemetry.events).slice(-12).map(event => {
    const type = clean(event?.type,36);
    if (!EVENT_TYPES.has(type)) return null;
    return { type, t: bounded(event.t,0,120,3), speed: bounded(event.speed,0,10000) };
  }).filter(Boolean);
  return {
    levelId, mode, dailyDate, status,
    reasonCode: ['success','fragile-impact','checkpoint-missing','gate-closed','off-track','timeout','unknown'].includes(run.reasonCode) ? run.reasonCode : reasonCodeFromRun(run),
    timeSeconds, deviceCount, grade,
    parDevices: Number.isInteger(run.par) ? Math.max(0,Math.min(12,run.par)) : Number.isInteger(run.parDevices) ? Math.max(0,Math.min(12,run.parDevices)) : null,
    parTime: bounded(run.parTime,0,120,3),
    gateCount: Number.isInteger(run.gateCount) ? Math.max(0,Math.min(20,run.gateCount)) : 0,
    gateOpen: run.gateOpen === true,
    expectedCheckpoints: Math.max(0,Math.min(20,checkpoints.length || Number(run.expectedCheckpoints) || 0)),
    reachedCheckpoints: Math.max(0,Math.min(20,checkpointsReached.length || Number(run.reachedCheckpoints) || 0)),
    position: { x: bounded(run.position?.x,-200,1400), y: bounded(run.position?.y,-200,850) },
    velocity: { x: bounded(run.velocity?.x,-10000,10000), y: bounded(run.velocity?.y,-10000,10000) },
    telemetry: {
      distance: bounded(telemetry.distance,0,1000000),
      peakSpeed: bounded(telemetry.peakSpeed,0,100000),
      lastImpactSpeed: bounded(telemetry.lastImpactSpeed,0,100000),
      impacts: Number.isInteger(telemetry.impacts) ? Math.max(0,Math.min(10000,telemetry.impacts)) : null,
      contacts: Number.isInteger(telemetry.contacts) ? Math.max(0,Math.min(10000,telemetry.contacts)) : null,
      activations: Number.isInteger(telemetry.activations) ? Math.max(0,Math.min(10000,telemetry.activations)) : null
    },
    devices, trajectory, events
  };
}

function researchPayload(currentRun, priorRuns = [], goal = 'reliability', locale = 'ru') {
  const current = normalizeRunForResearch(currentRun);
  if (!current) return { ok:false, reason:'Запусти или выбери обычный протокол кампании/дня, чтобы получить корректную сводку.' };
  const history = [];
  const currentAt = typeof currentRun?.at === 'string' ? currentRun.at : '';
  const currentId = typeof currentRun?.id === 'string' ? currentRun.id : '';
  for (const raw of safeArray(priorRuns).slice(0,18)) {
    if ((currentId && raw?.id === currentId) || (currentAt && raw?.at === currentAt)) continue;
    const item = normalizeRunForResearch(raw);
    if (!item || item.levelId !== current.levelId || item.mode !== current.mode || (current.mode === 'daily' && item.dailyDate !== current.dailyDate)) continue;
    history.push(item);
    if (history.length >= 4) break;
  }
  return {
    ok:true,
    payload:{
      schema:REQUEST_SCHEMA,
      consentToOpenAI:true,
      locale:locale === 'en' ? 'en' : 'ru',
      goal:['reliability','time','devices','grade'].includes(goal) ? goal : 'reliability',
      currentRun:current,
      priorRuns:history
    },
    historyCount:history.length
  };
}

function buildChatGPTBrief(payload) {
  const context = {
    goal: payload?.goal || 'reliability',
    currentRun: payload?.currentRun || null,
    priorRuns: safeArray(payload?.priorRuns).slice(0,4)
  };
  return [
    'Ты — CASCADE LAB Research Director. Проведи осторожный анализ данных физической головоломки.',
    'Отделяй наблюдения от гипотез. Ни один отдельный запуск, событие или корреляция не доказывает причинность.',
    'Предложи ровно один следующий контролируемый эксперимент, укажи переменную, что удерживать неизменным, измеримый сигнал успеха и условие остановки.',
    'Используй только указанные данные. Не выдумывай измерения. Это игровая модель, не валидированный инженерный симулятор.',
    'Ответь по-русски структурированно.',
    'КОНТЕКСТ ИССЛЕДОВАНИЯ:',
    JSON.stringify(context,null,2)
  ].join('\n');
}
if (typeof window === 'undefined' || !window.document) {
  globalThis.__CASCADELAB026_TEST__ = Object.freeze({ version:VERSION, requestSchema:REQUEST_SCHEMA, responseSchema:RESPONSE_SCHEMA, reasonCodeFromRun, normalizeRunForResearch, researchPayload, buildChatGPTBrief });
  return;
}
if (window.CASCADELAB026) return;

const STYLE = [
  '.cl-research-director{margin:18px 0 26px;padding:clamp(15px,2.3vw,26px);border:1px solid #8d9eff4d;border-radius:17px;background:radial-gradient(ellipse at 8% 0%,#5f6cff22,transparent 40%),radial-gradient(ellipse at 95% 0%,#65d8ff12,transparent 40%),linear-gradient(145deg,#0d1425,#060b13);color:#eaf2ff;box-shadow:0 18px 55px #0003}',
  '.cl-rd-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center}.cl-rd-kicker{margin:0;color:#9faeff;font:8px ui-monospace,monospace;letter-spacing:.17em}.cl-rd-pill{padding:5px 8px;border:1px solid #9baaff45;border-radius:5px;color:#c2ccff;font:8px ui-monospace,monospace}',
  '.cl-rd-title{margin:9px 0 0;color:#f1f4ff;font:400 clamp(25px,3.2vw,36px)/1.1 Georgia,serif;letter-spacing:-.025em}.cl-rd-lead{max-width:820px;margin:10px 0 15px;color:#a6b4cc;font-size:11px;line-height:1.7}',
  '.cl-rd-context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0}.cl-rd-kpi{min-width:0;padding:9px 10px;border:1px solid #91a9ff20;border-radius:9px;background:#070f1b}.cl-rd-kpi small{display:block;color:#7e91b4;font:7px ui-monospace,monospace;letter-spacing:.08em}.cl-rd-kpi strong{display:block;margin-top:5px;color:#edf2ff;font:600 16px Georgia,serif;overflow-wrap:anywhere}',
  '.cl-rd-form{display:grid;grid-template-columns:minmax(0,1fr);gap:9px;margin-top:12px}.cl-rd-field{display:grid;gap:5px}.cl-rd-field label{color:#9baed0;font:8px ui-monospace,monospace;letter-spacing:.07em}.cl-rd-select{width:100%;min-height:40px;padding:9px 10px;border:1px solid #98acdc38;border-radius:8px;background:#050d18;color:#edf2ff;font:11px system-ui,sans-serif}.cl-rd-consent{display:flex;align-items:flex-start;gap:9px;padding:11px;border:1px solid #a2b3e330;border-radius:9px;background:#070f1b;color:#a9b8d3;font-size:10px;line-height:1.6}.cl-rd-consent input{margin-top:3px;accent-color:#9eacff}.cl-rd-consent strong{color:#e2e9ff;font-weight:650}',
  '.cl-rd-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.cl-rd-button{min-height:40px;padding:9px 12px;border:1px solid #8a9eff40;border-radius:8px;background:#0b1625;color:#dce4ff;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-rd-button.primary{border-color:#a9b4ff;background:linear-gradient(125deg,#dbe1ff,#8fa0ff);color:#0c1430}.cl-rd-button:disabled{opacity:.48;cursor:not-allowed}.cl-rd-button:focus-visible,.cl-rd-select:focus-visible,.cl-rd-consent input:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}',
  '.cl-rd-status{min-height:20px;margin:10px 0 0;color:#aebfff;font-size:10px;line-height:1.6}.cl-rd-status[data-kind=error]{color:#ffb5aa}.cl-rd-report{display:grid;gap:8px;margin-top:12px}.cl-rd-card{padding:11px 12px;border:1px solid #8fa5df25;border-radius:9px;background:#070e18}.cl-rd-card small{display:block;color:#8c9ec3;font:7px ui-monospace,monospace;letter-spacing:.09em}.cl-rd-card p{margin:6px 0 0;color:#dce6ff;font-size:10px;line-height:1.65;overflow-wrap:anywhere}.cl-rd-next{border-left:2px solid #b7c0ff;background:#aeb9ff0c}.cl-rd-steps{margin:7px 0 0;padding-left:18px;color:#dce6ff;font-size:10px;line-height:1.7}.cl-rd-observation{display:grid;grid-template-columns:minmax(105px,.35fr) minmax(0,1fr);gap:8px;padding:7px 0;border-bottom:1px solid #8fa5df18}.cl-rd-observation:last-child{border-bottom:0}.cl-rd-observation b{color:#aab8dc;font-size:9px;font-weight:600}.cl-rd-observation span{color:#dce6ff;font-size:10px;line-height:1.6}',
  '.cl-rd-foot{margin:12px 0 0;padding-top:9px;border-top:1px solid #8fa5df20;color:#7186ac;font:7px/1.7 ui-monospace,monospace}',
  '@media(max-width:600px){.cl-research-director{padding:13px;border-radius:12px}.cl-rd-context{grid-template-columns:1fr}.cl-rd-actions{display:grid;grid-template-columns:1fr}.cl-rd-button{width:100%;min-height:44px}.cl-rd-observation{grid-template-columns:1fr;gap:3px}}',
  '@media(prefers-reduced-motion:reduce){.cl-rd-button{scroll-behavior:auto;transition:none!important;animation:none!important}}'
].join('');
const style=document.createElement('style');style.dataset.cascadeLabResearchDirector=VERSION;style.textContent=STYLE;document.head.append(style);
const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;};
const panel=make('section','cl-research-director');panel.id='cascade-lab-research-director';panel.setAttribute('aria-labelledby','cl-rd-title');panel.setAttribute('aria-live','polite');
const header=make('div','cl-rd-head');header.append(make('p','cl-rd-kicker','CASCADE LAB / OPENAI RESEARCH DIRECTOR'),make('span','cl-rd-pill','0.26 · OPTIONAL AI'));
const title=make('h3','cl-rd-title','От результата — к следующему эксперименту');title.id='cl-rd-title';
const lead=make('p','cl-rd-lead','AI анализирует компактные метрики и до четырёх сопоставимых попыток. Он предлагает проверяемую гипотезу и ровно один следующий тест; физику не меняет и не называет корреляцию доказанной причиной.');
const context=make('div','cl-rd-context');
const currentKpi=make('div','cl-rd-kpi');currentKpi.append(make('small','','ПОСЛЕДНИЙ ЗАПУСК'));const currentValue=make('strong','','Пока нет');currentKpi.append(currentValue);
const historyKpi=make('div','cl-rd-kpi');historyKpi.append(make('small','','СОПОСТАВИМЫЕ ПОПЫТКИ'));const historyValue=make('strong','','0');historyKpi.append(historyValue);
const localKpi=make('div','cl-rd-kpi');localKpi.append(make('small','','ЛОКАЛЬНЫЙ ПЛАН'));const localValue=make('strong','','Всегда доступен');localKpi.append(localValue);
context.append(currentKpi,historyKpi,localKpi);
const form=make('div','cl-rd-form');
const goalField=make('div','cl-rd-field');goalField.append(make('label','','ЦЕЛЬ ЭКСПЕРИМЕНТА'));
const goalSelect=document.createElement('select');goalSelect.className='cl-rd-select';goalSelect.setAttribute('aria-label','Цель эксперимента');
for(const [value,label] of [['reliability','Надёжность доставки'],['time','Сократить время'],['devices','Уменьшить число деталей'],['grade','Улучшить оценку']]){const option=make('option','',label);option.value=value;goalSelect.append(option);}goalField.append(goalSelect);
const consentLabel=make('label','cl-rd-consent');const consentBox=document.createElement('input');consentBox.type='checkbox';consentBox.id='cl-rd-consent-openai';
const consentCopy=make('span');consentCopy.append(make('strong','','Я разрешаю один AI-запрос. '),document.createTextNode('Анонимизированная сводка запуска и ограниченная история уйдут на сервер OSGARD и в OpenAI. Имена, аккаунты, заметки и полный архив не отправляются.'));
consentLabel.append(consentBox,consentCopy);
form.append(goalField,consentLabel);
const actions=make('div','cl-rd-actions');
const analyze=make('button','cl-rd-button primary','Сформировать AI-план');analyze.type='button';analyze.disabled=true;
const copyBrief=make('button','cl-rd-button','Скопировать бриф для ChatGPT');copyBrief.type='button';
const exportButton=make('button','cl-rd-button','Экспорт отчёта JSON');exportButton.type='button';exportButton.disabled=true;
actions.append(analyze,copyBrief,exportButton);
const status=make('p','cl-rd-status','AI не запускается автоматически. Локальный анализ и экспорт уже сохранённых измерений работают без OpenAI.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const report=make('div','cl-rd-report');
const foot=make('p','cl-rd-foot','PRIVACY: запрос отправляется только после нажатия и согласия · OPENAI RESPONSES store=false · применяются настройки хранения и abuse-monitoring провайдера · результат — гипотеза, не доказательство');
panel.append(header,title,lead,context,form,actions,status,report,foot);
const mount=document.querySelector('#cascade-evidence-integrity')||document.querySelector('.cl-evidence')||document.querySelector('#cascade-adaptive-mission-director')||document.querySelector('.cl-engineering')||document.querySelector('.cl-xray');
if(mount)mount.after(panel);else{const resultOverlay=document.querySelector('#resultOverlay');if(resultOverlay)resultOverlay.before(panel);else return;}

const xray=window.CASCADELAB022;
let latestRun=(xray&&typeof xray.getRuns==='function'?xray.getRuns()[0]:null)||null;
let latestReport=null;
function setStatus(message,kind='info'){status.textContent=message;status.dataset.kind=kind;}
function comparableRuns(current,allRuns){
 if(!current)return[];
 const same=safeArray(allRuns).filter(run=>run&&run.levelId===current.levelId&&run.mode===current.mode&&(current.mode!=='daily'||run.dailyDate===current.dailyDate));
 let currentIndex=-1;
 if(current.at)currentIndex=same.findIndex(run=>run.at===current.at);
 if(currentIndex<0)currentIndex=same.findIndex(run=>run.status===current.status&&Math.abs(Number(run.timeSeconds)-Number(current.timeSeconds))<0.005&&run.deviceCount===current.deviceCount&&JSON.stringify(run.devices)===JSON.stringify(current.devices));
 const older=currentIndex>=0?same.slice(currentIndex+1):same.filter(run=>run!==current&&!(run.status===current.status&&run.timeSeconds===current.timeSeconds&&run.deviceCount===current.deviceCount&&JSON.stringify(run.devices)===JSON.stringify(current.devices)));
 return older.slice(0,4);
}
function safeArray(value){return Array.isArray(value)?value:[];}
function refreshContext(){
 const normalized=normalizeRunForResearch(latestRun);
 if(!normalized){currentValue.textContent='Нет данных';historyValue.textContent='0';analyze.disabled=true;return null;}
 currentValue.textContent=(normalized.status==='won'?'Успех':'Неудача')+' · '+normalized.timeSeconds.toFixed(2)+' с';
 const allRuns=xray&&typeof xray.getRuns==='function'?xray.getRuns():[];
 const prior=comparableRuns(latestRun,allRuns);
 const sameModeRuns=prior.filter(run=>run.levelId===latestRun.levelId&&run.mode===latestRun.mode&&(latestRun.mode!=='daily'||run.dailyDate===latestRun.dailyDate));
 historyValue.textContent=String(sameModeRuns.length);
 localValue.textContent=normalized.status==='won'?'Оптимизируй базу':'Проверь гипотезу';
 analyze.disabled=!consentBox.checked;
 return {current:latestRun,prior:sameModeRuns};
}
function appendCard(kicker,bodyText,kind=''){
 const card=make('article','cl-rd-card'+(kind?' '+kind:''));
 card.append(make('small','',kicker),make('p','',bodyText));report.append(card);return card;
}
function renderResult(result,model,provider){
 latestReport={schema:RESPONSE_SCHEMA,createdAt:new Date().toISOString(),model,result,provider};
 report.replaceChildren();
 appendCard('OPENAI / RESEARCH PLAN',result.headline);
 const observations=make('article','cl-rd-card');observations.append(make('small','','ИЗМЕРЕНИЯ И НАБЛЮДЕНИЯ'));
 for(const item of result.observations||[]){const row=make('div','cl-rd-observation');row.append(make('b','',EVIDENCE_LABELS[item.evidenceId]||item.evidenceId),make('span','',item.interpretation));observations.append(row);}
 if(!(result.observations||[]).length)observations.append(make('p','','Модель не указала дополнительные наблюдения.'));
 report.append(observations);
 appendCard('ГИПОТЕЗА · НЕ ФАКТ',result.hypothesis+' Доверие: '+(result.confidence==='medium'?'среднее':'низкое')+'.');
 appendCard('АЛЬТЕРНАТИВНОЕ ОБЪЯСНЕНИЕ',result.alternativeExplanation);
 const next=make('article','cl-rd-card cl-rd-next');next.append(make('small','','СЛЕДУЮЩИЙ КОНТРОЛИРУЕМЫЙ ТЕСТ'),make('p','',result.nextExperiment.title));
 const steps=document.createElement('ol');steps.className='cl-rd-steps';for(const step of result.nextExperiment.steps||[])steps.append(make('li','',step));next.append(steps);
 next.append(make('p','','Удерживать неизменным: '+result.nextExperiment.keepConstant));
 next.append(make('p','','Сигнал успеха: '+result.nextExperiment.successSignal));
 next.append(make('p','','Условие остановки: '+result.nextExperiment.stopCondition));
 report.append(next);
 appendCard('ОГРАНИЧЕНИЯ',result.limitations+' Доказательства описывают данные игры, не реальную физическую систему.');
 exportButton.disabled=false;
 setStatus('AI-план получен. Он не применён автоматически; сохрани контроль и оцени следующий запуск. Модель: '+model+'.');
}
function buildCurrentPayload(){
 const selection=refreshContext();
 if(!selection)return{ok:false,reason:'Сначала запусти обычный протокол кампании или ежедневный протокол.'};
 const result=researchPayload(selection.current,selection.prior,goalSelect.value,'ru');
 if(!result.ok)return result;
 result.payload.consentToOpenAI=true;
 return result;
}
analyze.addEventListener('click',async()=>{
 if(!consentBox.checked){setStatus('Поставь галочку согласия перед отправкой данных.','error');return;}
 const built=buildCurrentPayload();
 if(!built.ok){setStatus(built.reason,'error');return;}
 analyze.disabled=true;copyBrief.disabled=true;setStatus('Подготавливаю проверяемый контекст и запрашиваю один структурированный анализ…');
 try{
   const response=await fetch('/commerce-api/v1/lab/research-director',{
     method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',
     body:JSON.stringify(built.payload),signal:AbortSignal.timeout(22000)
   });
   let body=null;try{body=await response.json()}catch{}
   if(!response.ok){
     const message=clean(body?.message||body?.error||'AI-сервис временно недоступен.',240);
     setStatus(message+' Ничего не отправляй повторно автоматически; можно скопировать бриф и использовать ChatGPT вручную.','error');
     return;
   }
   if(body?.schema!==RESPONSE_SCHEMA||!body.result||typeof body.result!=='object')throw new Error('AI_REPORT_INVALID');
   renderResult(body.result,clean(body.model||'OpenAI',80),body.provider||{store:false});
 }catch(error){
   setStatus(error?.name==='TimeoutError'?'AI-разбор превысил лимит времени.':'Не удалось получить проверенный AI-отчёт. Попробуй позже или скопируй бриф.', 'error');
 }finally{
   copyBrief.disabled=false;refreshContext();
 }
});
consentBox.addEventListener('change',()=>{analyze.disabled=!consentBox.checked||!normalizeRunForResearch(latestRun);if(!consentBox.checked)setStatus('AI-запрос выключен. Никакие данные не отправлены.');});
window.addEventListener('cascade-lab:run-finished',event=>{
 latestRun=event.detail||null;latestReport=null;report.replaceChildren();exportButton.disabled=true;
 setStatus('Новый результат выбран. Сначала изучи локальные измерения; AI включается только отдельно и по согласию.');
 refreshContext();
});
copyBrief.addEventListener('click',async()=>{
 const built=buildCurrentPayload();if(!built.ok){setStatus(built.reason,'error');return;}
 const text=buildChatGPTBrief(built.payload);
 try{await navigator.clipboard.writeText(text);setStatus('Бриф скопирован в буфер обмена. Ничего не отправлялось; вставляй его в ChatGPT только по своему решению.');}
 catch{try{const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=make('a');link.href=url;link.download='cascade-lab-research-brief.txt';link.hidden=true;panel.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);setStatus('Бриф сохранён в TXT. Ничего не отправлялось.');}catch{setStatus('Не удалось скопировать бриф; локальные данные не отправлялись.','error');}}
});
exportButton.addEventListener('click',()=>{
 if(!latestReport)return;
 const blob=new Blob([JSON.stringify(latestReport,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);const link=make('a');link.href=url;link.download='cascade-lab-research-report-'+new Date().toISOString().slice(0,10)+'.json';link.hidden=true;panel.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
});
refreshContext();
Object.defineProperty(window,'CASCADELAB026',{value:Object.freeze({version:VERSION,schema:REQUEST_SCHEMA,refreshContext,getReport:()=>latestReport}),configurable:false,enumerable:false,writable:false});
})();
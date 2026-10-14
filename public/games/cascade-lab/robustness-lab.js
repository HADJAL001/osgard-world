(() => {
'use strict';

const VERSION = '0.26.0';
const SCHEMA = 'osgard.cascade-lab.robustness-suite.v1';
const ARCHIVE_SCHEMA = 'osgard.cascade-lab.robustness-archive.v1';
const REPORT_SCHEMA = 'osgard.cascade-lab.robustness-report.v1';
const STORAGE_KEY = ARCHIVE_SCHEMA;
const MAX_TRIALS = 48;
const MAX_REPORTS = 12;
const MAX_ARCHIVE_BYTES = 500 * 1024;
const AXES = Object.freeze([
  { id: 'angle', title: 'Угол механизмов', short: 'УГОЛ', description: 'Небольшое отклонение направленных деталей' },
  { id: 'layout', title: 'Точность установки', short: 'УСТАНОВКА', description: 'Микросмещение деталей по X/Y' },
  { id: 'launch', title: 'Начальный импульс', short: 'ИМПУЛЬС', description: 'Небольшое изменение стартовой скорости' }
]);
const clean = (value, max = 180) => String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const bounded = (value, low, high) => Math.max(low, Math.min(high, value));
const round = (value, places = 2) => finite(value) ? Number(value.toFixed(places)) : null;
const number = value => finite(value) ? value : null;

function normalizeTrial(raw, index) {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.index) || raw.index < 1 || raw.index > MAX_TRIALS) return null;
  if (!AXES.some(axis => axis.id === raw.axis) || !['won', 'lost'].includes(raw.status)) return null;
  return {
    index: raw.index,
    axis: raw.axis,
    status: raw.status,
    timeSeconds: finite(raw.timeSeconds) ? bounded(raw.timeSeconds, 0, 30) : null,
    reason: clean(raw.reason, 200),
    x: finite(raw.x) ? bounded(raw.x, -100, 1100) : null,
    y: finite(raw.y) ? bounded(raw.y, -100, 660) : null,
    peakSpeed: finite(raw.peakSpeed) ? bounded(raw.peakSpeed, 0, 2000) : null,
    lastImpactSpeed: finite(raw.lastImpactSpeed) ? bounded(raw.lastImpactSpeed, 0, 2000) : null,
    gateOpen: raw.gateOpen === true,
    checkpointsReached: Array.isArray(raw.checkpointsReached) ? raw.checkpointsReached.slice(0, 20).map(v => clean(v, 80)) : [],
    variation: {
      angleMaxDeg: finite(raw.variation?.angleMaxDeg) ? bounded(raw.variation.angleMaxDeg, 0, 20) : 0,
      positionMaxPx: finite(raw.variation?.positionMaxPx) ? bounded(raw.variation.positionMaxPx, 0, 12) : 0,
      launchPercent: finite(raw.variation?.launchPercent) ? bounded(raw.variation.launchPercent, -15, 15) : 0
    }
  };
}
function normalizeSweep(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schema !== SCHEMA || raw.version !== VERSION) return null;
  const stamp = Date.parse(raw.at);
  if (!Number.isFinite(stamp) || !Number.isInteger(raw.seed) || raw.seed < 1 || raw.seed > 2147483646) return null;
  const levelId = Number(raw.level?.id);
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 5 || !Array.isArray(raw.trials) || raw.trials.length < 1 || raw.trials.length > MAX_TRIALS) return null;
  if (!raw.baseline || !['won','lost'].includes(raw.baseline.status)) return null;
  const baseline = {
    status: raw.baseline.status,
    timeSeconds: finite(raw.baseline.timeSeconds) ? bounded(raw.baseline.timeSeconds, 0, 30) : null,
    reason: clean(raw.baseline.reason, 200),
    x: finite(raw.baseline.x) ? bounded(raw.baseline.x, -100, 1100) : null,
    y: finite(raw.baseline.y) ? bounded(raw.baseline.y, -100, 660) : null,
    peakSpeed: finite(raw.baseline.peakSpeed) ? bounded(raw.baseline.peakSpeed, 0, 2000) : null
  };
  const trials = raw.trials.map(normalizeTrial);
  if (trials.some(trial => !trial) || new Set(trials.map(trial => trial.index)).size !== trials.length) return null;
  return {
    schema: SCHEMA,
    version: VERSION,
    id: clean(raw.id, 100),
    at: new Date(stamp).toISOString(),
    seed: raw.seed,
    severity: ['light','standard','stress'].includes(raw.severity) ? raw.severity : 'standard',
    level: { id: levelId, title: clean(raw.level?.title || 'Протокол #' + levelId, 140) },
    deviceCount: Number.isInteger(raw.deviceCount) ? bounded(raw.deviceCount, 0, 12) : 0,
    fixedStepHz: 120,
    baseline,
    trials
  };
}
function percentile(values, p) {
  const cleanValues = values.filter(finite).slice().sort((a,b) => a-b);
  if (!cleanValues.length) return null;
  const index = (cleanValues.length - 1) * bounded(p, 0, 1);
  const lower = Math.floor(index), upper = Math.ceil(index);
  return round(cleanValues[lower] + (cleanValues[upper] - cleanValues[lower]) * (index - lower), 3);
}
function classifyFailure(reason) {
  const value = String(reason || '').toLocaleLowerCase('ru');
  if (value.includes('хрупк') || value.includes('жёсткое приземление')) return 'Удар / повреждение';
  if (value.includes('шлюз') || value.includes('ворот') || value.includes('контакт')) return 'Шлюз / контакт';
  if (value.includes('контрольную точку') || value.includes('сканер') || value.includes('маршрут')) return 'Пропущена точка';
  if (value.includes('время') || value.includes('лимит')) return 'Лимит времени';
  if (value.includes('покинул трассу') || value.includes('сош')) return 'Сход с трассы';
  return 'Другой отказ';
}
function summarizeSweep(raw) {
  const sweep = normalizeSweep(raw);
  if (!sweep) return { ok: false, error: 'Серия испытаний повреждена или имеет неизвестную схему.' };
  const total = sweep.trials.length;
  const wins = sweep.trials.filter(trial => trial.status === 'won').length;
  const successRate = round(wins / total * 100, 1);
  const successfulTimes = sweep.trials.filter(trial => trial.status === 'won' && finite(trial.timeSeconds)).map(trial => trial.timeSeconds);
  const baselineWon = sweep.baseline.status === 'won';
  let tier, title, guidance;
  if (baselineWon && successRate >= 95) {
    tier = 'robust'; title = 'УСТОЙЧИВАЯ КОНСТРУКЦИЯ В ЭТОЙ СЕРИИ';
    guidance = 'В заданных пределах большинство проверенных возмущений не сорвало доставку. Увеличь строгость теста или проверь другой сценарий; это не гарантия реального мира.';
  } else if (baselineWon && successRate >= 75) {
    tier = 'sensitive'; title = 'КОНСТРУКЦИЯ ЧУВСТВИТЕЛЬНА К ОТКЛОНЕНИЯМ';
    guidance = 'Базовый запуск успешен, но часть небольших возмущений его нарушила. Сначала изучи группы с наибольшим числом отказов.';
  } else if (baselineWon) {
    tier = 'fragile'; title = 'ХРУПКАЯ КОНСТРУКЦИЯ';
    guidance = 'Базовый запуск успешен, но устойчивость низкая в проверенных условиях. Ищи запас по траектории, контакту и импульсу, меняя одну настройку за опыт.';
  } else if (wins > 0) {
    tier = 'boundary'; title = 'РЕЗУЛЬТАТ НА ГРАНИЦЕ УСТОЙЧИВОСТИ';
    guidance = 'Базовая схема не доставила груз, но некоторые возмущённые варианты дошли до цели. Это знак чувствительности модели, а не рекомендация случайно отклонять конструкцию.';
  } else {
    tier = 'failed'; title = 'БАЗОВЫЙ МЕХАНИЗМ НУЖДАЕТСЯ В ПЕРЕСТРОЙКЕ';
    guidance = 'Все испытания завершились отказом. Используй журнал событий и план одного контролируемого изменения до следующей серии.';
  }
  const groups = AXES.map(axis => {
    const rows = sweep.trials.filter(trial => trial.axis === axis.id);
    const successes = rows.filter(trial => trial.status === 'won');
    const failures = rows.filter(trial => trial.status === 'lost');
    const times = successes.map(trial => trial.timeSeconds).filter(finite);
    const failureModes = {};
    for (const trial of failures) {
      const kind = classifyFailure(trial.reason);
      failureModes[kind] = (failureModes[kind] || 0) + 1;
    }
    const shifts = rows.map(trial => finite(trial.x) && finite(trial.y) && finite(sweep.baseline.x) && finite(sweep.baseline.y)
      ? Math.hypot(trial.x - sweep.baseline.x, trial.y - sweep.baseline.y) : null).filter(finite);
    return {
      id: axis.id, title: axis.title, short: axis.short, description: axis.description,
      count: rows.length, wins: successes.length, failures: failures.length,
      successRate: rows.length ? round(successes.length / rows.length * 100, 1) : null,
      medianSuccessTime: percentile(times, .5), p90SuccessTime: percentile(times, .9),
      meanEndpointShift: shifts.length ? round(shifts.reduce((sum, value) => sum + value, 0) / shifts.length, 2) : null,
      maxEndpointShift: shifts.length ? round(Math.max(...shifts), 2) : null,
      failureModes
    };
  });
  const modes = {};
  for (const trial of sweep.trials.filter(trial => trial.status === 'lost')) {
    const kind = classifyFailure(trial.reason);
    modes[kind] = (modes[kind] || 0) + 1;
  }
  const mostSensitive = groups.filter(group => group.count).sort((a,b) => (a.successRate ?? 0) - (b.successRate ?? 0))[0] || null;
  return {
    ok: true,
    sweep,
    summary: {
      tier, title, guidance, total, wins, failures: total - wins, successRate,
      baselineWon, baselineStatus: sweep.baseline.status,
      medianSuccessTime: percentile(successfulTimes, .5),
      p90SuccessTime: percentile(successfulTimes, .9),
      mostSensitiveAxis: mostSensitive?.title || 'Недостаточно данных',
      failureModes: modes, groups
    }
  };
}
function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
const pureApi = Object.freeze({
  version: VERSION, schema: SCHEMA, archiveSchema: ARCHIVE_SCHEMA, reportSchema: REPORT_SCHEMA,
  maxTrials: MAX_TRIALS, maxReports: MAX_REPORTS, maxArchiveBytes: MAX_ARCHIVE_BYTES,
  axes: AXES, normalizeSweep, summarizeSweep, classifyFailure, percentile, csvCell
});
if (typeof window === 'undefined' || !window.document) {
  globalThis.__CASCADELAB026_TEST__ = pureApi;
  return;
}
if (window.CASCADELAB026) return;

const css = [
  '.cl-robustness{margin:18px 0 22px;padding:clamp(14px,2vw,22px);border:1px solid #88aaff36;border-radius:16px;background:radial-gradient(ellipse at 90% 0%,#775eff1b,transparent 45%),linear-gradient(145deg,#0b1725,#050b13);color:#e6f1f7;box-shadow:0 18px 48px #0003,inset 0 1px #ffffff08}',
  '.cl-robust-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.cl-robust-kicker{margin:0;color:#b9a8ff;font:8px ui-monospace,monospace;letter-spacing:.17em}.cl-robust-pill{padding:5px 8px;border:1px solid #b6a0ff45;border-radius:5px;color:#c7bbff;font:8px ui-monospace,monospace}',
  '.cl-robustness h3{margin:0;color:#f5f8fc;font:400 clamp(23px,3.1vw,36px)/1.08 Georgia,serif;letter-spacing:-.03em}.cl-robust-sub{margin:8px 0 14px;color:#a0b5c4;font-size:10px;line-height:1.7;max-width:900px}',
  '.cl-robust-toolbar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:11px;border:1px solid #89b8d01c;border-radius:10px;background:#06111b}.cl-robust-field{display:grid;gap:5px;min-width:0}.cl-robust-field label{color:#7595a8;font:7px ui-monospace,monospace;letter-spacing:.11em}.cl-robust-input{width:100%;min-width:0;height:36px;padding:0 8px;border:1px solid #85bad02d;border-radius:7px;background:#07131e;color:#dbeaf2;font:10px system-ui,sans-serif}.cl-robust-input:focus-visible,.cl-robust-button:focus-visible{outline:2px solid #9b8aff;outline-offset:3px}',
  '.cl-robust-button{min-height:36px;padding:8px 10px;border:1px solid #8d7cff45;border-radius:8px;background:#211e3e;color:#d4ceff;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-robust-button.primary{border-color:#c9bbff;background:linear-gradient(110deg,#d6ceff,#9e8cff);color:#18152e}.cl-robust-button:disabled{opacity:.42;cursor:not-allowed}',
  '.cl-robust-progress{width:100%;height:4px;margin-top:9px;overflow:hidden;border:0;border-radius:3px;background:#152534;accent-color:#b6a0ff}.cl-robust-status{min-height:20px;margin:8px 0 0;color:#98dff9;font-size:9px;line-height:1.5}.cl-robust-status[data-kind=error]{color:#ffaaa5}',
  '.cl-robust-results{margin-top:14px}.cl-robust-hero{display:grid;grid-template-columns:minmax(0,1.15fr) repeat(3,minmax(0,.7fr));gap:8px}.cl-robust-card{min-width:0;padding:12px;border:1px solid #84b7cf25;border-radius:10px;background:#07131d}.cl-robust-card small{display:block;color:#718fa1;font:7px ui-monospace,monospace;letter-spacing:.1em}.cl-robust-card strong{display:block;margin-top:7px;color:#eff7fb;font:600 clamp(16px,1.8vw,24px) Georgia,serif;overflow-wrap:anywhere}.cl-robust-card p{margin:6px 0 0;color:#95adbb;font-size:9px;line-height:1.55}.cl-robust-card.hero{background:linear-gradient(145deg,#201c40,#0b1521);border-color:#b6a0ff45}.cl-robust-card.hero strong{font:750 13px/1.4 system-ui,sans-serif;color:#d2caff}.cl-robust-axis-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px}.cl-robust-axis{padding:11px;border:1px solid #85b4ca20;border-radius:9px;background:#07111a}.cl-robust-axis small{display:block;color:#7898a8;font:7px ui-monospace,monospace;letter-spacing:.1em}.cl-robust-axis strong{display:block;margin-top:5px;font:600 19px Georgia,serif;color:#eaf5fa}.cl-robust-axis p{margin:5px 0 8px;color:#91a8b8;font-size:9px;line-height:1.5}.cl-robust-bar{height:6px;overflow:hidden;border-radius:4px;background:#1b2935}.cl-robust-bar span{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#9c8bff,#77dcf7)}',
  '.cl-robust-chart-box{margin-top:9px;padding:11px;border:1px solid #85b4ca20;border-radius:9px;background:#06111a}.cl-robust-chart-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;color:#9bb4c3;font:8px ui-monospace,monospace;letter-spacing:.08em}.cl-robust-legend{display:flex;gap:10px;color:#8098a8;font-size:8px;letter-spacing:0}.cl-robust-legend i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#69e0b7;margin-right:4px}.cl-robust-legend i.fail{background:#ff869a}.cl-robust-canvas{display:block;width:100%;height:210px;margin-top:7px}.cl-robust-failures{display:grid;gap:6px;margin-top:9px}.cl-robust-failure{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px;border:1px solid #8ab4c41b;border-radius:7px;background:#07131c}.cl-robust-failure .number{color:#ff9caa;font:8px ui-monospace,monospace}.cl-robust-failure strong{display:block;color:#d4e3eb;font-size:9px}.cl-robust-failure p{margin:3px 0 0;color:#7892a2;font-size:8px;line-height:1.45}.cl-robust-failure time{color:#7e9cad;font:8px ui-monospace,monospace;white-space:nowrap}.cl-robust-empty{padding:15px;border:1px dashed #91b5c42b;border-radius:8px;color:#7695a6;font-size:9px;line-height:1.6}.cl-robust-foot{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:11px;padding-top:10px;border-top:1px solid #86b8ce1f;color:#688697;font:7px/1.6 ui-monospace,monospace}.cl-robust-history{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;margin-top:12px}.cl-robust-note{margin:9px 0 0;color:#668292;font:7px/1.6 ui-monospace,monospace}',
  '@media(max-width:720px){.cl-robust-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-robust-hero{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-robust-axis-grid{grid-template-columns:1fr}.cl-robust-failure{grid-template-columns:auto minmax(0,1fr)}.cl-robust-failure time{grid-column:2}.cl-robust-button{min-height:42px}.cl-robust-canvas{height:170px}}',
  '@media(prefers-reduced-motion:reduce){.cl-robust-button{scroll-behavior:auto;transition:none!important;animation:none!important}}'
].join('');
const style = document.createElement('style');
style.dataset.cascadeLabRobustness = VERSION;
style.textContent = css;
document.head.append(style);
const make = (tag, cls, value) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (value !== undefined) node.textContent = String(value);
  return node;
};
const panel = make('section', 'cl-robustness');
panel.setAttribute('aria-labelledby', 'cl-robust-title');
const header = make('div', 'cl-robust-head');
header.append(make('p', 'cl-robust-kicker', 'CASCADE LAB / ROBUSTNESS LAB'));
header.append(make('span', 'cl-robust-pill', 'BUILD 0.26.0'));
panel.append(header);
const title = make('h3', '', 'Проверь не один запуск — проверь запас прочности.');
title.id = 'cl-robust-title'; panel.append(title);
panel.append(make('p', 'cl-robust-sub', 'Стенд повторно запускает текущий чертёж на том же физическом движке, не трогая игровую конструкцию. Меняется ровно один класс условий за опыт: углы механизмов, микросмещение установки или стартовый импульс. Результат показывает устойчивость только в проверенных пределах — не гарантирует поведение реального мира.'));
const toolbar = make('div', 'cl-robust-toolbar');
function field(label, node) {
  const wrap = make('div', 'cl-robust-field'); wrap.append(make('label', '', label), node); return wrap;
}
const countSelect = document.createElement('select'); countSelect.className = 'cl-robust-input';
for (const [value,label] of [['12','12 испытаний'],['24','24 испытания'],['36','36 испытаний'],['48','48 испытаний']]) {
  const option=document.createElement('option'); option.value=value; option.textContent=label; if(value==='24')option.selected=true; countSelect.append(option);
}
const severitySelect = document.createElement('select'); severitySelect.className='cl-robust-input';
for (const [value,label] of [['light','Лёгкий ±'],['standard','Стандартный ±'],['stress','Стресс ±']]) {
  const option=document.createElement('option'); option.value=value; option.textContent=label; if(value==='standard')option.selected=true; severitySelect.append(option);
}
const seedInput=document.createElement('input');seedInput.className='cl-robust-input';seedInput.type='number';seedInput.min='1';seedInput.max='2147483646';seedInput.step='1';seedInput.value='260125';seedInput.inputMode='numeric';
const runButton=make('button','cl-robust-button primary','Запустить серию');
runButton.type='button';
toolbar.append(field('ЧИСЛО ПРОГОНОВ',countSelect),field('ДОПУСКИ',severitySelect),field('ЗЕРНО ДЛЯ ПОВТОРА',seedInput),field('СТЕНД / CORE 120 HZ',runButton));
panel.append(toolbar);
const progress=document.createElement('progress');progress.className='cl-robust-progress';progress.max=1;progress.value=0;progress.hidden=true;panel.append(progress);
const status=make('p','cl-robust-status','Стенд ждёт запуска. Текущая конструкция останется без изменений.');
status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
const results=make('div','cl-robust-results');
const empty=make('div','cl-robust-empty','После серии здесь появятся процент доставок, сравнение трёх групп чувствительности и самые нестабильные результаты.');
results.append(empty);panel.append(results);
const footer=make('div','cl-robust-foot');
footer.append(make('span','','LOCAL / Только локальный физический движок. Никаких сетевых запросов. До 48 испытаний на серию.'));
const exportJson=make('button','cl-robust-button','Экспорт JSON');exportJson.type='button';exportJson.disabled=true;
const exportCsv=make('button','cl-robust-button','Экспорт CSV');exportCsv.type='button';exportCsv.disabled=true;
const clearButton=make('button','cl-robust-button','Очистить локальную историю');clearButton.type='button';
const footActions=make('div','');footActions.style.display='flex';footActions.style.gap='6px';footActions.style.flexWrap='wrap';footActions.append(exportJson,exportCsv,clearButton);footer.append(footActions);panel.append(footer);
panel.append(make('p','cl-robust-note','Предел метода: это стресс-тест игровой модели с управляемыми возмущениями, а не лабораторная аттестация устройства. Результаты следует трактовать как инженерную диагностику игрового чертежа, а не доказательство причинности.'));
const anchor=document.querySelector('.cl-evidence')||document.querySelector('.cl-xray')||document.querySelector('.cl-engineering');
if(anchor&&anchor.parentNode)anchor.after(panel);else return;

let latest=null;
let archive=readArchive();
function readArchive(){
  try{
    const raw=JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'null');
    if(!raw||raw.schema!==ARCHIVE_SCHEMA||raw.schemaVersion!==1||!Array.isArray(raw.reports))return[];
    return raw.reports.slice(0,MAX_REPORTS).map(normalizeSweep).filter(Boolean);
  }catch{return[];}
}
function persist(){
  const payload={schema:ARCHIVE_SCHEMA,schemaVersion:1,savedAt:new Date().toISOString(),reports:archive.slice(0,MAX_REPORTS)};
  try{
    const encoded=JSON.stringify(payload);
    if(encoded.length>MAX_ARCHIVE_BYTES){archive=archive.slice(0,4);}
    window.localStorage.setItem(STORAGE_KEY,JSON.stringify({...payload,reports:archive}));
  }catch{
    status.dataset.kind='error';status.textContent='Браузер не дал сохранить локальную историю. Текущая серия доступна для экспорта.';
  }
}
function download(filename, text, type){
  const url=URL.createObjectURL(new Blob([text],{type}));
  const link=make('a');link.href=url;link.download=filename;link.hidden=true;
  panel.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function pct(value){return value===null||value===undefined?'—':String(value).replace('.',',')+'%';}
function seconds(value){return finite(value)?value.toFixed(2).replace('.',',')+' с':'—';}
function renderCanvas(canvas,sweep){
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const c=canvas.getContext('2d');if(!c)return;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,rect.width,rect.height);
  const L=36,R=12,T=12,B=26,plotW=Math.max(1,rect.width-L-R),plotH=Math.max(1,rect.height-T-B);
  c.strokeStyle='#87b5ca20';c.lineWidth=1;
  for(let i=0;i<=4;i++){const y=T+plotH*i/4;c.beginPath();c.moveTo(L,y);c.lineTo(L+plotW,y);c.stroke();}
  c.font='8px ui-monospace,monospace';c.fillStyle='#728e9f';c.textAlign='right';
  for(let i=0;i<=4;i++)c.fillText(String(Math.round(i*140)),L-6,T+plotH*i/4+3);
  const names=['УГОЛ','УСТ.','ИМП.'],groupW=plotW/3;
  for(let i=0;i<3;i++){
    c.textAlign='center';c.fillStyle='#809aaa';c.fillText(names[i],L+groupW*(i+.5),rect.height-7);
    c.strokeStyle='#8bb7cb18';c.beginPath();c.moveTo(L+groupW*i,T);c.lineTo(L+groupW*i,T+plotH);c.stroke();
  }
  const base=sweep.baseline;
  if(finite(base.y)){
    const y=T+bounded(base.y,0,560)/560*plotH;
    c.strokeStyle='#e9ba6a9b';c.setLineDash([4,3]);c.beginPath();c.moveTo(L,y);c.lineTo(L+plotW,y);c.stroke();c.setLineDash([]);
  }
  for(const trial of sweep.trials){
    const gi=names.indexOf(AXES.find(a=>a.id===trial.axis)?.short||'');
    const index=AXES.findIndex(a=>a.id===trial.axis),gx=L+groupW*(index+.5);
    const nx=finite(trial.x)?bounded(trial.x,0,1000)/1000*.62:0;
    const x=gx+(nx-.31)*groupW+(trial.index%5-2)*1.6;
    const y=T+(finite(trial.y)?bounded(trial.y,0,560)/560*plotH:plotH*.5);
    c.fillStyle=trial.status==='won'?'#69e0b7':'#ff869a';c.globalAlpha=.88;c.beginPath();c.arc(x,y,3.1,0,Math.PI*2);c.fill();c.globalAlpha=1;
  }
  c.fillStyle='#e9ba6a';c.beginPath();c.arc(L+plotW-5,T+5,3.2,0,Math.PI*2);c.fill();
}
function renderResult(raw){
  const checked=summarizeSweep(raw);if(!checked.ok){status.dataset.kind='error';status.textContent=checked.error;return;}
  latest=checked.sweep;const sum=checked.summary;
  results.replaceChildren();
  const hero=make('div','cl-robust-hero');
  const titleCard=make('article','cl-robust-card hero');titleCard.append(make('small','','ВЫВОД СЕРИИ'),make('strong','',sum.title),make('p','',sum.guidance));hero.append(titleCard);
  const baseline=make('article','cl-robust-card');baseline.append(make('small','','БАЗОВЫЙ ЗАПУСК'),make('strong','',sum.baselineWon?'УСПЕХ':'ОТКАЗ'),make('p','',latest.baseline.reason||'Без сообщения об отказе'));hero.append(baseline);
  const rate=make('article','cl-robust-card');rate.append(make('small','','ДОСТАВКИ В СЕРИИ'),make('strong','',pct(sum.successRate)),make('p','',sum.wins+' из '+sum.total+' испытаний'));hero.append(rate);
  const median=make('article','cl-robust-card');median.append(make('small','','МЕДИАНА УСПЕШНОГО ВРЕМЕНИ'),make('strong','',seconds(sum.medianSuccessTime)),make('p','',sum.mostSensitiveAxis+' — группа с меньшей долей успеха'));hero.append(median);
  results.append(hero);
  const axes=make('div','cl-robust-axis-grid');
  for(const group of sum.groups){
    const card=make('article','cl-robust-axis');
    card.append(make('small','',group.title.toUpperCase()),make('strong','',pct(group.successRate)));
    card.append(make('p','',group.wins+'/'+group.count+' успешных · отказов '+group.failures+' · медиана '+seconds(group.medianSuccessTime)));
    const bar=make('div','cl-robust-bar'),fill=make('span');fill.style.width=(group.successRate||0)+'%';bar.append(fill);card.append(bar);
    if(group.maxEndpointShift!==null)card.append(make('p','', 'Макс. сдвиг конечной точки: '+group.maxEndpointShift+' px'));
    axes.append(card);
  }
  results.append(axes);
  const box=make('section','cl-robust-chart-box');
  const chartHead=make('div','cl-robust-chart-head');chartHead.append(make('span','','КАРТА КОНЕЧНЫХ ПОЗИЦИЙ'),make('span','cl-robust-legend'));
  const legend=chartHead.lastChild;legend.append(make('i'),document.createTextNode(' доставлено '),make('i','fail'),document.createTextNode(' отказ'));
  const canvas=document.createElement('canvas');canvas.className='cl-robust-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Карта конечного положения грузов по трём группам возмущений');
  box.append(chartHead,canvas);results.append(box);renderCanvas(canvas,latest);
  const failures=latest.trials.filter(trial=>trial.status==='lost').sort((a,b)=>{
    const dist=t=>finite(t.x)&&finite(t.y)&&finite(latest.baseline.x)&&finite(latest.baseline.y)?Math.hypot(t.x-latest.baseline.x,t.y-latest.baseline.y):0;
    return dist(b)-dist(a);
  }).slice(0,5);
  const failureList=make('section','cl-robust-failures');
  if(!failures.length)failureList.append(make('div','cl-robust-empty','Отказов в выбранной серии не было. Проверь более строгие допуски для оценки запаса.'));
  else for(const trial of failures){
    const row=make('article','cl-robust-failure');row.append(make('span','number','#'+String(trial.index).padStart(2,'0')));
    const body=make('div');body.append(make('strong','',(AXES.find(a=>a.id===trial.axis)?.title||trial.axis)+' · '+classifyFailure(trial.reason)));
    body.append(make('p','',trial.reason||'Доставка не завершилась.'));row.append(body);
    row.append(make('time','',finite(trial.x)&&finite(trial.y)?Math.round(trial.x)+' / '+Math.round(trial.y)+' px · '+seconds(trial.timeSeconds):seconds(trial.timeSeconds)));
    failureList.append(row);
  }
  results.append(failureList);
  exportJson.disabled=false;exportCsv.disabled=false;
  status.dataset.kind='success';
  status.textContent='Серия завершена: '+sum.total+' прогонов; сид '+latest.seed+'. Конструкция в игре не изменена.';
}
function exportLatestJson(){
  if(!latest)return;
  const checked=summarizeSweep(latest);if(!checked.ok)return;
  download('cascade-lab-robustness-'+latest.level.id+'-'+latest.seed+'.json',JSON.stringify({schema:REPORT_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),application:{name:'CASCADE LAB',version:VERSION},privacy:{delivery:'local-download-only',uploaded:false,accountIdentifierIncluded:false},run:latest,summary:checked.summary},null,2),'application/json;charset=utf-8');
}
function exportLatestCsv(){
  if(!latest)return;
  const header=['trial','axis','status','time_s','reason','x_px','y_px','peak_speed_px_s','impact_speed_px_s','gate_open','checkpoints_reached'];
  const lines=[header.map(csvCell).join(',')];
  for(const trial of latest.trials)lines.push([
    trial.index,trial.axis,trial.status,trial.timeSeconds,trial.reason,trial.x,trial.y,trial.peakSpeed,trial.lastImpactSpeed,trial.gateOpen,trial.checkpointsReached.join('|')
  ].map(csvCell).join(','));
  download('cascade-lab-robustness-'+latest.level.id+'-'+latest.seed+'.csv',lines.join('\r\n'),'text/csv;charset=utf-8');
}
async function runSweep(){
  const core=window.CASCADELAB026_CORE;
  if(!core||typeof core.runSweep!=='function'){status.dataset.kind='error';status.textContent='Ядро стенда не найдено. Обнови игру или открой её напрямую на Osgard World.';return;}
  const setup=core.getCurrentSetup();
  if(!setup||!Number.isInteger(setup.levelId)){status.dataset.kind='error';status.textContent='Не удалось получить текущую конструкцию.';return;}
  if(['running','paused','replay'].includes(setup.mode)){status.dataset.kind='error';status.textContent='Сначала заверши или сбрось обычную симуляцию.';return;}
  const trialCount=Number(countSelect.value);
  const seed=Number(seedInput.value);
  if(!Number.isInteger(seed)||seed<1||seed>2147483646){status.dataset.kind='error';status.textContent='Зерно должно быть целым числом от 1 до 2147483646.';return;}
  runButton.disabled=true;countSelect.disabled=true;severitySelect.disabled=true;seedInput.disabled=true;
  exportJson.disabled=true;exportCsv.disabled=true;progress.hidden=false;progress.value=0;
  status.dataset.kind='info';status.textContent='Базовый запуск и контролируемые возмущения запускаются…';
  try{
    const raw=await core.runSweep({trialCount,seed,severity:severitySelect.value},(done,total,label)=>{progress.value=done/Math.max(1,total);status.textContent='Стресс-тест: '+done+'/'+total+' · '+label;});
    const checked=normalizeSweep(raw);
    if(!checked)throw new Error('Отчёт физического стенда не прошёл проверку структуры.');
    latest=checked;
    archive=[checked,...archive.filter(item=>item.id!==checked.id)].slice(0,MAX_REPORTS);
    persist();renderResult(checked);
  }catch(error){status.dataset.kind='error';status.textContent=clean(error&&error.message||'Стресс-тест не завершился.',220);}
  finally{runButton.disabled=false;countSelect.disabled=false;severitySelect.disabled=false;seedInput.disabled=false;progress.hidden=true;progress.value=0;}
}
runButton.addEventListener('click',()=>void runSweep());
exportJson.addEventListener('click',exportLatestJson);
exportCsv.addEventListener('click',exportLatestCsv);
clearButton.addEventListener('click',()=>{
  if(!window.confirm('Удалить локальную историю стресс-тестов в этом браузере?'))return;
  archive=[];latest=null;
  try{window.localStorage.removeItem(STORAGE_KEY);}catch{}
  exportJson.disabled=true;exportCsv.disabled=true;
  results.replaceChildren(make('div','cl-robust-empty','История удалена. Следующий запуск начнёт новую серию.'));
  status.textContent='Локальная история очищена.';
});
function restoreLatest(){
  latest=archive[0]||null;
  if(latest){renderResult(latest);status.textContent='Восстановлена последняя серия из локальной истории. Ничего не отправлялось.';}
}
if(typeof ResizeObserver==='function')new ResizeObserver(()=>{if(latest){const canvas=panel.querySelector('canvas.cl-robust-canvas');if(canvas)renderCanvas(canvas,latest);}}).observe(panel);
restoreLatest();
Object.defineProperty(window,'CASCADELAB026',{
  value:Object.freeze({version:VERSION,schema:SCHEMA,archiveSchema:ARCHIVE_SCHEMA,summarizeSweep,getLatest:()=>latest,clear(){archive=[];latest=null;try{localStorage.removeItem(STORAGE_KEY)}catch{}}}),
  configurable:false,enumerable:false,writable:false
});
})();
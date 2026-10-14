(() => {
'use strict';

const VERSION = '0.27.0';
const SCHEMA = 'osgard.cascade-lab.reliability-atlas.v1';
const ARCHIVE_SCHEMA = 'osgard.cascade-lab.reliability-atlas-archive.v1';
const STORAGE_KEY = ARCHIVE_SCHEMA;
const MAX_RUNS = 50;
const MAX_FRAMES = 41;
const MAX_IMPORT_BYTES = 400 * 1024;
const DEVICE_TYPES = new Set(['spring','fan','belt','magnet','switch','bumper']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const round = (value, digits = 2) => finite(value) ? Number(value.toFixed(digits)) : null;
const clean = (value, limit = 180) => String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
const list = value => Array.isArray(value) ? value : [];

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
}
function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function normalizeTrajectory(raw) {
  if (!Array.isArray(raw) || raw.length < 2) return [];
  const valid = raw.slice(0, 420).map(point => {
    if (!point || typeof point !== 'object' || !finite(point.x) || !finite(point.y) || !finite(point.t)) return null;
    return { t: round(clamp(point.t, 0, 120), 3), x: round(clamp(point.x, -200, 1400), 2), y: round(clamp(point.y, -200, 850), 2),
      vx: finite(point.vx) ? round(clamp(point.vx, -10000, 10000), 2) : null,
      vy: finite(point.vy) ? round(clamp(point.vy, -10000, 10000), 2) : null };
  }).filter(Boolean);
  if (valid.length < 2) return [];
  const output = [];
  for (let i = 0; i < MAX_FRAMES; i++) {
    const index = Math.round(i * (valid.length - 1) / (MAX_FRAMES - 1));
    const frame = valid[index];
    if (!output.length || output[output.length - 1].t !== frame.t || i === MAX_FRAMES - 1) output.push({ ...frame });
  }
  return output.length >= 2 ? output.slice(0, MAX_FRAMES) : [];
}
function normalizeDevices(raw) {
  return list(raw).slice(0, 12).filter(device => device && DEVICE_TYPES.has(device.type) &&
    finite(device.x) && finite(device.y) && finite(device.angle)).map(device => ({
      type: device.type, x: round(clamp(device.x, -100, 1200), 1),
      y: round(clamp(device.y, -100, 700), 1), angle: round(clamp(device.angle, -400, 400), 3)
    })).sort((a, b) => a.type.localeCompare(b.type) || a.x - b.x || a.y - b.y || a.angle - b.angle);
}
function blueprintPayload(run) {
  return {
    levelId: run.levelId, mode: run.mode, dailyDate: run.dailyDate,
    devices: normalizeDevices(run.devices)
  };
}
function blueprintSignature(run) {
  return run ? 'RA27-' + fnv1a(canonicalize(blueprintPayload(run))).toUpperCase() : null;
}
function normalizeRun(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = clean(raw.id, 100), stamp = Date.parse(raw.at);
  if (!id || !Number.isFinite(stamp) || !Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5 ||
      !['won','lost'].includes(raw.status)) return null;
  const trajectory = normalizeTrajectory(raw.trajectory);
  if (trajectory.length < 2) return null;
  const devices = normalizeDevices(raw.devices);
  if (!devices.length && Number(raw.deviceCount) > 0) return null;
  const mode = ['campaign','daily','duel'].includes(raw.mode) ? raw.mode : 'campaign';
  const dailyDate = typeof raw.dailyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyDate) ? raw.dailyDate : null;
  const timeSeconds = finite(raw.timeSeconds) ? clamp(raw.timeSeconds, 0, 120) : trajectory[trajectory.length - 1].t;
  const events = list(raw.telemetry && raw.telemetry.events).slice(-12).map(event => ({
    type: clean(event && event.type, 32), label: clean(event && (event.label || event.type), 100),
    t: finite(event && event.t) ? clamp(event.t, 0, 120) : null
  }));
  const run = {
    schema: SCHEMA, id, at: new Date(stamp).toISOString(), levelId: raw.levelId,
    levelTitle: clean(raw.levelTitle || ('Протокол #' + raw.levelId), 120),
    mode, dailyDate, status: raw.status, timeSeconds: round(timeSeconds, 3),
    deviceCount: Number.isInteger(raw.deviceCount) ? clamp(raw.deviceCount, 0, 12) : devices.length,
    devices, par: Number.isInteger(raw.par) ? clamp(raw.par, 0, 12) : null,
    grade: clean(raw.grade || '—', 8), reason: clean(raw.reason, 220),
    trajectory, events
  };
  run.blueprintSignature = blueprintSignature(run);
  return run;
}
function wilsonInterval(successes, count, z = 1.959963984540054) {
  if (!Number.isInteger(count) || count <= 0 || !Number.isInteger(successes) || successes < 0 || successes > count) return null;
  const p = successes / count, z2 = z * z, denominator = 1 + z2 / count;
  const center = (p + z2 / (2 * count)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) / count) + (z2 / (4 * count * count))) / denominator;
  return { low: round(clamp(center - margin, 0, 1), 4), high: round(clamp(center + margin, 0, 1), 4), method: 'Wilson 95%' };
}
function quantile(sortedValues, q) {
  if (!sortedValues.length) return null;
  const index = (sortedValues.length - 1) * clamp(q, 0, 1), lo = Math.floor(index), hi = Math.ceil(index);
  return round(sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * (index - lo), 2);
}
function trajectorySpread(runs) {
  const traces = runs.map(run => run.trajectory).filter(trace => trace.length >= 2);
  if (traces.length < 2) return { meanPx: null, p95Px: null, maxPx: null, sampleCount: traces.length, pointsPerRun: MAX_FRAMES };
  const deviations = [];
  for (let i = 0; i < MAX_FRAMES; i++) {
    const points = traces.map(trace => trace[Math.min(trace.length - 1, Math.round(i * (trace.length - 1) / (MAX_FRAMES - 1)))]);
    const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    for (const point of points) deviations.push(Math.hypot(point.x - centerX, point.y - centerY));
  }
  deviations.sort((a, b) => a - b);
  return {
    meanPx: round(deviations.reduce((sum, value) => sum + value, 0) / deviations.length, 3),
    p95Px: quantile(deviations, .95), maxPx: round(deviations[deviations.length - 1], 2),
    sampleCount: traces.length, pointsPerRun: MAX_FRAMES
  };
}
function summarizeGroup(rawRuns) {
  const runs = list(rawRuns).map(normalizeRun).filter(Boolean);
  if (!runs.length) return null;
  const signature = runs[0].blueprintSignature;
  const same = runs.filter(run => run.blueprintSignature === signature).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  if (!same.length) return null;
  const successes = same.filter(run => run.status === 'won').length;
  const times = same.map(run => run.timeSeconds).sort((a, b) => a - b);
  const mean = times.reduce((sum, value) => sum + value, 0) / times.length;
  const variance = times.reduce((sum, value) => sum + (value - mean) ** 2, 0) / times.length;
  const spread = trajectorySpread(same);
  const ci = wilsonInterval(successes, same.length);
  let recommendation;
  if (same.length < 3) {
    recommendation = 'Собери минимум 3 повторных запуска этой же конструкции, ничего не меняя. Пока это разведочные данные.';
  } else if (successes > 0 && successes < same.length) {
    recommendation = 'Одна и та же конструкция дала разные исходы. Не меняй детали: сначала проверь режим испытания, порядок событий и воспроизводимость.';
  } else if (successes === 0) {
    recommendation = 'Не было успешной доставки в этой группе. Сохрани её как базу и создай отдельную группу, изменив только одну переменную.';
  } else if ((spread.p95Px ?? 0) > 5 || Math.sqrt(variance) > .25) {
    recommendation = 'Все попытки успешны, но траектория или время заметно колеблются. Повтори контроль без изменений, прежде чем оптимизировать конструкцию.';
  } else {
    recommendation = 'Результат этой конструкции выглядит повторяемым в собранной выборке. Теперь можно изменить одну переменную и сравнить новую группу с этой базой.';
  }
  return {
    blueprintSignature: signature, levelId: same[0].levelId, levelTitle: same[0].levelTitle,
    mode: same[0].mode, dailyDate: same[0].dailyDate, deviceCount: same[0].deviceCount,
    n: same.length, successes, failures: same.length - successes,
    rate: round(successes / same.length, 4), ci, meanTime: round(mean, 3),
    medianTime: quantile(times, .5), minTime: round(times[0], 3), maxTime: round(times[times.length - 1], 3),
    timeStdDev: round(Math.sqrt(variance), 3), trajectory: spread,
    firstAt: same[0].at, lastAt: same[same.length - 1].at,
    runs: same.map(run => ({ id: run.id, at: run.at, status: run.status, timeSeconds: run.timeSeconds, grade: run.grade, reason: run.reason })),
    recommendation, sampleStrength: same.length < 3 ? 'exploratory' : same.length < 8 ? 'early' : 'larger-sample'
  };
}
function groupRuns(rawRuns) {
  const groups = new Map();
  for (const raw of list(rawRuns)) {
    const run = normalizeRun(raw);
    if (!run) continue;
    if (!groups.has(run.blueprintSignature)) groups.set(run.blueprintSignature, []);
    groups.get(run.blueprintSignature).push(run);
  }
  return Array.from(groups.values()).map(summarizeGroup).filter(Boolean)
    .sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt));
}
function validateArchive(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== ARCHIVE_SCHEMA || raw.schemaVersion !== 1 || !Array.isArray(raw.runs)) {
    return { ok: false, reason: 'Неизвестная схема архива Reliability Atlas.' };
  }
  let encoded;
  try { encoded = JSON.stringify(raw); } catch { return { ok: false, reason: 'Архив нельзя прочитать как JSON.' }; }
  if (encoded.length > MAX_IMPORT_BYTES) return { ok: false, reason: 'Размер архива превышает лимит 400 KiB.' };
  if (raw.runs.length > MAX_RUNS) return { ok: false, reason: 'В архиве больше ' + MAX_RUNS + ' запусков.' };
  const runs = raw.runs.map(normalizeRun);
  if (runs.some(run => !run)) return { ok: false, reason: 'Одна или несколько попыток не прошли проверку.' };
  const ids = new Set();
  for (const run of runs) {
    if (ids.has(run.id)) return { ok: false, reason: 'Архив содержит повторяющиеся ID попыток.' };
    ids.add(run.id);
  }
  return { ok: true, archive: { schema: ARCHIVE_SCHEMA, schemaVersion: 1, exportedAt: new Date().toISOString(), runs } };
}
function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
const pureApi = Object.freeze({
  version: VERSION, schema: SCHEMA, archiveSchema: ARCHIVE_SCHEMA,
  maxRuns: MAX_RUNS, maxFrames: MAX_FRAMES, maxImportBytes: MAX_IMPORT_BYTES,
  normalizeRun, blueprintSignature, wilsonInterval, trajectorySpread, summarizeGroup, groupRuns, validateArchive, csvCell
});
if (typeof window === 'undefined' || !window.document) {
  globalThis.__CASCADELAB027_TEST__ = pureApi;
  return;
}
if (window.CASCADELAB027) return;

const css = [
  '.cl-reliability{margin:18px 0 24px;padding:clamp(14px,2.4vw,24px);border:1px solid #76d9fb3c;border-radius:16px;background:radial-gradient(ellipse at 90% 0%,#16789a22,transparent 43%),linear-gradient(145deg,#0b1a27,#050b13);color:#e7f2f8;box-shadow:0 18px 46px #0002,inset 0 1px #ffffff0a}',
  '.cl-rel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:11px}.cl-rel-kicker{margin:0;color:#72dfff;font:8px ui-monospace,monospace;letter-spacing:.17em}.cl-rel-version{padding:5px 8px;border:1px solid #e9ba6a54;border-radius:5px;color:#e9ba6a;font:8px ui-monospace,monospace}',
  '.cl-reliability h3{margin:0;color:#f4f8fb;font:400 clamp(24px,3.2vw,38px)/1.08 Georgia,serif;letter-spacing:-.025em}.cl-rel-intro{max-width:850px;margin:9px 0 15px;color:#a4bac6;font:11px/1.7 system-ui,sans-serif}',
  '.cl-rel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.cl-rel-metric{min-width:0;padding:10px 11px;border:1px solid #81bdd024;border-radius:9px;background:#06131d}.cl-rel-metric span{display:block;color:#6f91a2;font:7px ui-monospace,monospace;letter-spacing:.08em}.cl-rel-metric b{display:block;margin-top:7px;color:#f0f7fa;font:600 clamp(17px,2vw,24px)/1.05 Georgia,serif;overflow-wrap:anywhere}.cl-rel-metric small{display:block;margin-top:6px;color:#7e9aaa;font:8px/1.4 system-ui,sans-serif}',
  '.cl-rel-method{display:flex;align-items:start;gap:9px;margin-top:10px;padding:10px 12px;border:1px solid #82bfce20;border-radius:9px;background:#07141d}.cl-rel-dot{flex:none;width:8px;height:8px;margin-top:4px;border-radius:50%;background:#e9ba6a;box-shadow:0 0 12px #e9ba6a55}.cl-rel-method strong{display:block;color:#d9eaf1;font-size:10px}.cl-rel-method p{margin:4px 0 0;color:#9ab3c2;font-size:10px;line-height:1.6}',
  '.cl-rel-chart-wrap{margin-top:12px;padding:10px;border:1px solid #82bfce20;border-radius:10px;background:#06121b}.cl-rel-chart-title{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;color:#9cb9c8;font:8px ui-monospace,monospace;letter-spacing:.09em}.cl-rel-chart{display:block;width:100%;height:164px;margin-top:6px}.cl-rel-legend{display:flex;gap:12px;flex-wrap:wrap;color:#7395a6;font:8px ui-monospace,monospace}.cl-rel-legend i{display:inline-block;width:8px;height:8px;margin-right:4px;border-radius:2px;background:#70dbff}.cl-rel-legend i.baseline{background:#e9ba6a}',
  '.cl-rel-next{margin-top:10px;padding:11px 13px;border-left:2px solid #e9ba6a;border-radius:0 8px 8px 0;background:#e9ba6a0b}.cl-rel-next small{color:#bca16d;font:7px ui-monospace,monospace;letter-spacing:.13em}.cl-rel-next p{margin:5px 0 0;color:#edf5f8;font:11px/1.65 system-ui,sans-serif}',
  '.cl-rel-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.cl-rel-button{min-height:37px;padding:8px 11px;border:1px solid #7cc9e63a;border-radius:8px;background:#0b2635;color:#b9eaff;font:700 9px system-ui,sans-serif;cursor:pointer}.cl-rel-button.primary{border-color:#e9ba6a;background:linear-gradient(120deg,#f4d28f,#d59b44);color:#211808}.cl-rel-button.danger{border-color:#ff9b8b52;color:#ffb8ad;background:#28181b}.cl-rel-button:focus-visible,.cl-rel-select:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}.cl-rel-button:hover{filter:brightness(1.12)}',
  '.cl-rel-select{min-width:0;max-width:100%;padding:9px 10px;border:1px solid #84bfd22c;border-radius:8px;background:#04111a;color:#dcecf4;font:10px system-ui,sans-serif}.cl-rel-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:12px}.cl-rel-controls label{color:#83a4b4;font:8px ui-monospace,monospace;letter-spacing:.08em}.cl-rel-records{display:grid;gap:6px;margin-top:9px}.cl-rel-record{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 10px;border:1px solid #81bdd021;border-radius:8px;background:#06121b}.cl-rel-record strong{display:block;color:#d9eaf1;font-size:10px}.cl-rel-record small{display:block;margin-top:4px;color:#7394a3;font:8px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.cl-rel-outcome{padding:4px 6px;border:1px solid #82d9a936;border-radius:4px;color:#9deac0;font:8px ui-monospace,monospace;white-space:nowrap}.cl-rel-outcome.fail{border-color:#ff9b8b50;color:#ffb8ad}.cl-rel-empty{padding:16px;border:1px dashed #82bfce2e;border-radius:9px;color:#8ba6b5;font:10px/1.6 system-ui,sans-serif}.cl-rel-status{min-height:20px;margin:9px 0 0;color:#83dff7;font:9px/1.5 system-ui,sans-serif}.cl-rel-status[data-kind=error]{color:#ffb1a6}.cl-rel-foot{margin:8px 0 0;padding-top:9px;border-top:1px solid #83bfd01c;color:#668492;font:7px/1.65 ui-monospace,monospace}',
  '@media(max-width:700px){.cl-rel-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-rel-record{grid-template-columns:1fr}.cl-rel-toolbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cl-rel-button{min-height:42px;width:100%}.cl-rel-chart{height:145px}}',
  '@media(prefers-reduced-motion:reduce){.cl-rel-button{scroll-behavior:auto;transition:none!important;animation:none!important}}'
].join('');
const style = document.createElement('style');
style.dataset.cascadeLabReliability = VERSION;
style.textContent = css;
document.head.append(style);
const make = (tag, cls, value) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (value !== undefined) node.textContent = String(value);
  return node;
};
const panel = make('section', 'cl-reliability');
panel.setAttribute('aria-labelledby', 'cl-rel-title');
panel.setAttribute('aria-live', 'polite');
const head = make('div', 'cl-rel-head');
head.append(make('p', 'cl-rel-kicker', 'CASCADE LAB / RELIABILITY ATLAS'));
head.append(make('span', 'cl-rel-version', 'VERSION ' + VERSION));
const title = make('h3', '', 'Одна конструкция. Много попыток. Честный результат.');
title.id = 'cl-rel-title';
const intro = make('p', 'cl-rel-intro', 'Атлас объединяет только повторения одного протокола с тем же набором и положением устройств. Он показывает долю доставок, статистический интервал, разброс времени и траекторий — без вывода о причинности и без отправки истории на сервер.');
panel.append(head, title, intro);
const metrics = make('div', 'cl-rel-grid');
const metricValues = {};
for (const item of [['ПОВТОРЫ','—'],['ДОСТАВКИ','—'],['ВРЕМЯ · МЕДИАНА','—'],['РАЗБРОС ТРАЕКТОРИИ','—']]) {
  const card = make('div','cl-rel-metric');
  card.append(make('span','',item[0]));
  const value = make('b','',item[1]); card.append(value);
  const note = make('small','', 'Нет данных'); card.append(note);
  metrics.append(card); metricValues[item[0]] = { value, note };
}
panel.append(metrics);
const method = make('div','cl-rel-method');
method.append(make('span','cl-rel-dot'));
const methodText = make('div');
const methodTitle = make('strong','','Оценка пока не рассчитана');
const methodBody = make('p','','Заверши несколько запусков одной и той же конструкции.');
methodText.append(methodTitle,methodBody); method.append(methodText); panel.append(method);
const chartWrap = make('div','cl-rel-chart-wrap');
const chartTitle = make('div','cl-rel-chart-title');
chartTitle.append(make('span','','ТРАЕКТОРНЫЙ КОРИДОР'));
const chartHint = make('span','','41 нормализованная точка');
chartTitle.append(chartHint);
const chart = document.createElement('canvas'); chart.className='cl-rel-chart'; chart.setAttribute('role','img'); chart.setAttribute('aria-label','График разброса повторных траекторий');
const legend = make('div','cl-rel-legend');
const legendA=make('span');legendA.append(make('i'));legendA.append(document.createTextNode('Средняя траектория'));
const legendB=make('span');legendB.append(make('i','baseline'));legendB.append(document.createTextNode('Выбранный повтор'));
legend.append(legendA,legendB);chartWrap.append(chartTitle,chart,legend);panel.append(chartWrap);
const next = make('div','cl-rel-next');
next.append(make('small','','СЛЕДУЮЩИЙ КОНТРОЛИРУЕМЫЙ ШАГ'));
const nextText=make('p','','Сначала собери минимум три повтора без изменений.');
next.append(nextText);panel.append(next);
const controls=make('div','cl-rel-controls');
controls.append(make('label','','ГРУППА КОНСТРУКЦИИ'));
const selector=document.createElement('select');selector.className='cl-rel-select';selector.setAttribute('aria-label','Группа повторяемости');controls.append(selector);
panel.append(controls);
const toolbar=make('div','cl-rel-toolbar');
const exportJson=make('button','cl-rel-button primary','Экспорт атласа JSON');exportJson.type='button';
const exportCsv=make('button','cl-rel-button','Экспорт измерений CSV');exportCsv.type='button';
const importButton=make('button','cl-rel-button','Импорт архива');importButton.type='button';
const clearButton=make('button','cl-rel-button danger','Очистить атлас');clearButton.type='button';
const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.hidden=true;
toolbar.append(exportJson,exportCsv,importButton,clearButton);panel.append(toolbar,fileInput);
const recordList=make('div','cl-rel-records');panel.append(recordList);
const status=make('p','cl-rel-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
panel.append(make('p','cl-rel-foot','ЛОКАЛЬНЫЕ ДАННЫЕ · JSON ДО 400 KiB · МАКС. 50 ПОПЫТОК · ИНТЕРВАЛ УИЛСОНА 95% · ПОВТОРЫ НЕ ДОКАЗЫВАЮТ ПРИЧИННОСТЬ'));
const anchor=document.querySelector('.cl-evidence') || document.querySelector('.cl-engineering') || document.querySelector('.bottom-grid');
const footer=document.querySelector('.app-footer') || document.querySelector('footer');
if(anchor && typeof anchor.after==='function') anchor.after(panel);
else if(footer && typeof footer.before==='function') footer.before(panel);
else document.body.append(panel);

let runs=readArchive();
let selectedSignature=runs[0] ? runs[0].blueprintSignature : null;
function archivePayload() { return {schema:ARCHIVE_SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs}; }
function readArchive() {
  try {
    const raw=window.localStorage.getItem(STORAGE_KEY);
    if(!raw)return [];
    const checked=validateArchive(JSON.parse(raw));
    return checked.ok ? checked.archive.runs.slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS) : [];
  } catch { return []; }
}
function persist() {
  runs=runs.slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS);
  try { window.localStorage.setItem(STORAGE_KEY,JSON.stringify(archivePayload()));status.dataset.kind='success';status.textContent='Сохранено в этом браузере. Сетевой передачи нет.';return true; }
  catch { status.dataset.kind='error';status.textContent='Браузер отказал в локальном сохранении. Экспортируй резервный JSON.';return false; }
}
function download(name,body,type) {
  const url=URL.createObjectURL(new Blob([body],{type}));
  const link=document.createElement('a');link.href=url;link.download=name;link.hidden=true;panel.append(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function formatPercent(value) { return value==null?'—':(value*100).toFixed(1).replace('.',',')+'%'; }
function formatNum(value,digits=2,suffix='') { return finite(value)?Number(value).toFixed(digits).replace('.',',')+suffix:'—'; }
function groupLabel(group) {
  return group.levelTitle+' · '+group.n+' повт. · '+Math.round(group.rate*100)+'% · '+group.blueprintSignature.slice(-6);
}
function currentGroup() { return groupRuns(runs).find(group=>group.blueprintSignature===selectedSignature)||null; }
function drawGroup(group) {
  const ctx=chart.getContext && chart.getContext('2d');
  if(!ctx)return;
  const rect=chart.getBoundingClientRect(),width=Math.max(320,Math.floor(rect.width||640)),height=Math.max(125,Math.floor(rect.height||164));
  const dpr=Math.min(2,window.devicePixelRatio||1);
  chart.width=Math.round(width*dpr);chart.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  const pad={l:12,r:12,t:12,b:12},w=width-pad.l-pad.r,h=height-pad.t-pad.b;
  ctx.strokeStyle='#82bfce22';ctx.lineWidth=1;
  for(let i=0;i<4;i++){const y=pad.t+h*i/3;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(width-pad.r,y);ctx.stroke();}
  if(!group||group.n<2){ctx.fillStyle='#7b9aaa';ctx.font='10px system-ui';ctx.fillText('Нужны минимум два повтора одной конструкции',pad.l,pad.t+h/2);return;}
  const members=runs.filter(run=>run.blueprintSignature===group.blueprintSignature).slice().sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const traces=members.map(run=>run.trajectory);
  const base=traces[traces.length-1];const points=[];
  for(let i=0;i<MAX_FRAMES;i++){
    const frames=traces.map(trace=>trace[Math.min(trace.length-1,Math.round(i*(trace.length-1)/(MAX_FRAMES-1)))]);
    points.push({x:frames.reduce((s,p)=>s+p.x,0)/frames.length,y:frames.reduce((s,p)=>s+p.y,0)/frames.length});
  }
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const trace of traces)for(const p of trace){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
  if(!Number.isFinite(minX)||maxX-minX<1){minX-=1;maxX+=1;}if(maxY-minY<1){minY-=1;maxY+=1;}
  const scale=Math.min(w/(maxX-minX),h/(maxY-minY));const ox=pad.l+(w-(maxX-minX)*scale)/2,oy=pad.t+(h-(maxY-minY)*scale)/2;
  const toX=x=>ox+(x-minX)*scale,toY=y=>height-oy-(y-minY)*scale;
  function path(trace,color,dashed,alpha) {
    ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=dashed?1.4:2;ctx.setLineDash(dashed?[4,4]:[]);ctx.beginPath();
    trace.forEach((p,i)=>{const x=toX(p.x),y=toY(p.y);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();ctx.restore();
  }
  for(const trace of traces.slice(0,-1))path(trace,'#70dbff',false,.24);
  path(points,'#70dbff',false,.95);path(base,'#e9ba6a',true,.95);
}
function render() {
  const groups=groupRuns(runs);
  if(!groups.some(group=>group.blueprintSignature===selectedSignature))selectedSignature=groups[0]?.blueprintSignature||null;
  const previous=selector.value;
  selector.replaceChildren();
  if(!groups.length){const option=document.createElement('option');option.value='';option.textContent='Пока нет завершённых запусков';selector.append(option);}
  for(const group of groups){const option=document.createElement('option');option.value=group.blueprintSignature;option.textContent=groupLabel(group);selector.append(option);}
  if(selectedSignature)selector.value=selectedSignature;
  const group=currentGroup();
  const all=groups.length;
  metricValues['ПОВТОРЫ'].value.textContent=group?String(group.n):'0';
  metricValues['ПОВТОРЫ'].note.textContent=group?('Группа '+group.blueprintSignature):'Нет повторов';
  metricValues['ДОСТАВКИ'].value.textContent=group?formatPercent(group.rate):'—';
  metricValues['ДОСТАВКИ'].note.textContent=group?'95% Wilson: '+formatPercent(group.ci.low)+'–'+formatPercent(group.ci.high):'Ожидаются данные';
  metricValues['ВРЕМЯ · МЕДИАНА'].value.textContent=group?formatNum(group.medianTime,2,' с'):'—';
  metricValues['ВРЕМЯ · МЕДИАНА'].note.textContent=group?('Диапазон '+formatNum(group.minTime,2)+'–'+formatNum(group.maxTime,2)+' с · σ '+formatNum(group.timeStdDev,3)+' с'):'Нет данных';
  metricValues['РАЗБРОС ТРАЕКТОРИИ'].value.textContent=group&&group.trajectory.meanPx!=null?formatNum(group.trajectory.meanPx,2,' px'):'—';
  metricValues['РАЗБРОС ТРАЕКТОРИИ'].note.textContent=group&&group.trajectory.p95Px!=null?('P95 '+formatNum(group.trajectory.p95Px,2)+' px · max '+formatNum(group.trajectory.maxPx,2)+' px'):'Нужны минимум два повтора';
  title.textContent=group?group.levelTitle+' · Reliability Atlas':'Reliability Atlas — жду первый запуск';
  methodTitle.textContent=!group?'Нет выбранной группы':group.sampleStrength==='exploratory'?'Разведочная выборка':group.sampleStrength==='early'?'Предварительная оценка':'Более крупная выборка';
  methodBody.textContent=group?'Доля доставок '+group.successes+'/'+group.n+'. Интервал Уилсона 95%: '+formatPercent(group.ci.low)+'–'+formatPercent(group.ci.high)+'. Интервал отражает неопределённость малой выборки, а не гарантию будущего результата.':'Заверши хотя бы один запуск. Для оценки повторяемости нужны несколько запусков без изменения конструкции.';
  nextText.textContent=group?group.recommendation:'Сначала собери минимум три повторных запуска без изменений. Затем сравни другой вариант отдельно.';
  recordList.replaceChildren();
  if(!runs.length){recordList.append(make('div','cl-rel-empty','Архив пока пуст. После завершения испытания запись добавится автоматически; прошлые X-Ray-запуски импортируются локально при первом открытии.'));}
  else {
    const visible=(group?runs.filter(run=>run.blueprintSignature===group.blueprintSignature):runs).slice(0,8);
    for(const run of visible){
      const row=make('article','cl-rel-record'),details=make('div');
      details.append(make('strong','',(run.status==='won'?'✓ ДОСТАВЛЕНО · ':'× НЕ ДОСТАВЛЕНО · ')+run.levelTitle));
      details.append(make('small','',new Date(run.at).toLocaleString()+' · '+run.timeSeconds.toFixed(2)+' с · '+run.deviceCount+' деталей · '+run.blueprintSignature));
      const badge=make('span','cl-rel-outcome'+(run.status==='won'?'':' fail'),run.grade||run.status);
      row.append(details,badge);recordList.append(row);
    }
  }
  drawGroup(group);
  status.textContent='Архив: '+runs.length+'/'+MAX_RUNS+' запусков · группы '+all+' · только локально.';
}
function matchXray(raw) {
  const api=window.CASCADELAB022;
  if(!api||typeof api.getRuns!=='function')return null;
  try {
    const at=Date.parse(raw.at),candidate=normalizeRun({ ...raw, id:'candidate-'+String(at),at:raw.at||new Date().toISOString() });
    if(!candidate)return null;
    return api.getRuns().map(normalizeRun).filter(Boolean).find(run=>
      run.levelId===candidate.levelId&&run.status===candidate.status&&run.blueprintSignature===candidate.blueprintSignature&&Math.abs(Date.parse(run.at)-at)<=1500
    )||null;
  }catch{return null;}
}
function onRunFinished(raw) {
  const stamp=raw.at||new Date().toISOString();
  const xray=matchXray({...raw,at:stamp});
  const run=normalizeRun({ ...raw, id:xray?xray.id:'atlas-'+Date.parse(stamp).toString(36)+'-'+Math.random().toString(36).slice(2,8), at:stamp });
  if(!run){status.dataset.kind='error';status.textContent='Не удалось записать попытку: нет корректной траектории или конструкции.';return;}
  if(runs.some(item=>item.id===run.id))return;
  runs.unshift(run);runs=runs.slice(0,MAX_RUNS);selectedSignature=run.blueprintSignature;
  persist();render();
}
function exportArchive() {
  const raw=archivePayload();
  download('cascade-lab-reliability-atlas-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(raw,null,2),'application/json;charset=utf-8');
}
function exportCsv() {
  const columns=['id','at','levelId','levelTitle','mode','dailyDate','status','timeSeconds','deviceCount','grade','blueprintSignature','reason'];
  const rows=runs.map(run=>[run.id,run.at,run.levelId,run.levelTitle,run.mode,run.dailyDate,run.status,run.timeSeconds,run.deviceCount,run.grade,run.blueprintSignature,run.reason]);
  download('cascade-lab-reliability-atlas-'+new Date().toISOString().slice(0,10)+'.csv',[columns,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
function importArchive(file) {
  if(!file)return;
  if(file.size>MAX_IMPORT_BYTES){status.dataset.kind='error';status.textContent='Файл больше 400 KiB; импорт отменён.';fileInput.value='';return;}
  const reader=new FileReader();
  reader.onerror=()=>{status.dataset.kind='error';status.textContent='Не удалось прочитать архив.';};
  reader.onload=()=>{
    try{
      const checked=validateArchive(JSON.parse(String(reader.result||'')));
      if(!checked.ok)throw new Error(checked.reason);
      const byId=new Map(runs.map(run=>[run.id,run]));
      for(const run of checked.archive.runs)if(!byId.has(run.id))byId.set(run.id,run);
      runs=Array.from(byId.values()).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS);
      selectedSignature=runs[0]?.blueprintSignature||null;
      persist();render();status.dataset.kind='success';status.textContent='Архив проверен и объединён. История осталась на этом устройстве.';
    }catch(error){status.dataset.kind='error';status.textContent=clean(error&&error.message||'Архив отклонён.',220);}
    finally{fileInput.value='';}
  };
  reader.readAsText(file);
}
function seedFromXray() {
  const api=window.CASCADELAB022;
  if(!api||typeof api.getRuns!=='function')return;
  try{
    const existing=new Set(runs.map(run=>run.id));
    for(const raw of api.getRuns()){
      const run=normalizeRun(raw);
      if(run&&!existing.has(run.id)){runs.push(run);existing.add(run.id);}
    }
    runs=runs.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS);
    if(!selectedSignature&&runs[0])selectedSignature=runs[0].blueprintSignature;
    if(runs.length)persist();
  }catch{/* X-Ray migration is optional; atlas can start empty. */}
}
selector.addEventListener('change',()=>{selectedSignature=selector.value||null;render();});
exportJson.addEventListener('click',exportArchive);
exportCsv.addEventListener('click',exportCsv);
importButton.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',()=>importArchive(fileInput.files&&fileInput.files[0]));
clearButton.addEventListener('click',()=>{
  if(!window.confirm('Удалить локальный Atlas из этого браузера? Это не удалит историю X-Ray.'))return;
  runs=[];selectedSignature=null;
  try{window.localStorage.removeItem(STORAGE_KEY);}catch{}
  render();status.dataset.kind='success';status.textContent='Архив Reliability Atlas очищен. История X-Ray не изменена.';
});
window.addEventListener('cascade-lab:run-finished',event=>onRunFinished(event.detail||{}));
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){runs=readArchive();render();}});
if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(()=>drawGroup(currentGroup()));observer.observe(panel);}
seedFromXray();render();
Object.defineProperty(window,'CASCADELAB027',{
  value:Object.freeze({version:VERSION,schema:SCHEMA,archiveSchema:ARCHIVE_SCHEMA,getRuns:()=>runs.map(run=>({...run,devices:run.devices.map(d=>({...d})),trajectory:run.trajectory.map(p=>({...p})),events:run.events.map(e=>({...e}))})),groupRuns,getGroup:signature=>groupRuns(runs).find(g=>g.blueprintSignature===signature)||null,validateArchive,exportArchive}),
  configurable:false,enumerable:false,writable:false
});
})();
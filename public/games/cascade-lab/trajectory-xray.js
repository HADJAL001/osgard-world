(() => {
'use strict';

const VERSION = '0.22.0';
const SCHEMA = 'osgard.cascade-lab.trajectory-xray.v1';
const STORAGE_KEY = SCHEMA;
const MAX_RUNS = 18;
const MAX_FRAMES = 420;
const MAX_IMPORT_BYTES = 600 * 1024;
const clean = (value, max = 200) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const rounded = (value, digits = 1) => finite(value) ? Number(value.toFixed(digits)) : null;
const bounded = (value, low, high) => Math.max(low, Math.min(high, value));
const asNumber = (value, low = -100000, high = 100000) => finite(value) ? bounded(value, low, high) : null;
const list = value => Array.isArray(value) ? value : [];

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
}
function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash.toString(16).padStart(8, '0');
}
function normalizeFrames(source) {
  if (!Array.isArray(source) || source.length < 2) return [];
  const count = Math.min(source.length, MAX_FRAMES);
  const picked = count === source.length ? source : Array.from({ length: count }, (_, index) => source[Math.round(index * (source.length - 1) / (count - 1))]);
  const frames = [];
  let priorTime = -1;
  for (const frame of picked) {
    if (!frame || typeof frame !== 'object' || !finite(frame.t) || !finite(frame.x) || !finite(frame.y)) continue;
    const time = rounded(bounded(frame.t, 0, 120), 3);
    if (time < priorTime) continue;
    priorTime = time;
    frames.push({
      t: time, x: rounded(bounded(frame.x, -200, 1400)), y: rounded(bounded(frame.y, -200, 850)),
      vx: rounded(asNumber(frame.vx, -10000, 10000)), vy: rounded(asNumber(frame.vy, -10000, 10000)),
      gateOpen: frame.gateOpen === true,
      checkpoints: list(frame.checkpoints).slice(0, 20).map(id => clean(id, 80))
    });
  }
  return frames.length >= 2 ? frames : [];
}
function normalizeEvent(event) {
  if (!event || typeof event !== 'object') return null;
  return {
    type: clean(event.type || 'event', 36),
    label: clean(event.label || event.type || 'Событие', 140),
    t: finite(event.t) ? rounded(bounded(event.t, 0, 120), 3) : null,
    x: asNumber(event.x, -200, 1400), y: asNumber(event.y, -200, 850),
    speed: asNumber(event.speed, 0, 10000)
  };
}
function normalizeRun(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 90) return null;
  if (!['won', 'lost'].includes(raw.status) || !Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5) return null;
  const stamp = Date.parse(raw.at);
  if (!Number.isFinite(stamp)) return null;
  const trajectory = normalizeFrames(raw.trajectory);
  if (trajectory.length < 2) return null;
  const devices = list(raw.devices).slice(0, 12).filter(d => d && ['spring','fan','belt','magnet','switch','bumper'].includes(d.type)).map(d => ({
    type: d.type, x: rounded(asNumber(d.x, -100, 1200)), y: rounded(asNumber(d.y, -100, 700)), angle: rounded(asNumber(d.angle, -400, 400), 4)
  }));
  const telemetry = raw.telemetry && typeof raw.telemetry === 'object' ? raw.telemetry : {};
  const events = list(telemetry.events).slice(-32).map(normalizeEvent).filter(Boolean).sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  const checkpoints = list(raw.checkpoints).slice(0, 20).filter(c => c && typeof c === 'object').map(c => ({
    id: clean(c.id, 80), label: clean(c.label, 100), x: asNumber(c.x, -200, 1400), y: asNumber(c.y, -200, 850)
  }));
  const mode = clean(raw.mode || 'campaign', 24);
  const dailyDate = typeof raw.dailyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyDate) ? raw.dailyDate : null;
  return {
    schema: SCHEMA, id: raw.id.trim(), at: new Date(stamp).toISOString(),
    status: raw.status, levelId: raw.levelId, levelTitle: clean(raw.levelTitle || ('Протокол #' + raw.levelId), 140),
    mode, dailyDate, reason: clean(raw.reason, 240), grade: clean(raw.grade || '—', 5),
    timeSeconds: rounded(bounded(finite(raw.timeSeconds) ? raw.timeSeconds : trajectory[trajectory.length - 1].t, 0, 120), 3),
    par: Number.isInteger(raw.par) ? bounded(raw.par, 0, 12) : null,
    parTime: finite(raw.parTime) ? bounded(raw.parTime, 0, 120) : null,
    deviceCount: Number.isInteger(raw.deviceCount) ? bounded(raw.deviceCount, 0, 12) : devices.length,
    gateCount: Number.isInteger(raw.gateCount) ? bounded(raw.gateCount, 0, 20) : 0,
    gateOpen: raw.gateOpen === true,
    position: { x: asNumber(raw.position?.x, -200, 1400), y: asNumber(raw.position?.y, -200, 850) },
    velocity: { x: asNumber(raw.velocity?.x, -10000, 10000), y: asNumber(raw.velocity?.y, -10000, 10000) },
    devices, checkpoints,
    checkpointsReached: list(raw.checkpointsReached).slice(0, 20).map(id => clean(id, 80)),
    telemetry: {
      distance: asNumber(telemetry.distance, 0, 1000000),
      peakSpeed: asNumber(telemetry.peakSpeed, 0, 100000),
      lastImpactSpeed: asNumber(telemetry.lastImpactSpeed, 0, 100000),
      impacts: Number.isInteger(telemetry.impacts) ? bounded(telemetry.impacts, 0, 10000) : 0,
      contacts: Number.isInteger(telemetry.contacts) ? bounded(telemetry.contacts, 0, 10000) : 0,
      activations: Number.isInteger(telemetry.activations) ? bounded(telemetry.activations, 0, 10000) : 0,
      events
    },
    trajectory
  };
}
function computeMetrics(run) {
  const trace = run && Array.isArray(run.trajectory) ? run.trajectory : [];
  if (trace.length < 2) return { distance: null, peakSpeed: null, averageSpeed: null, duration: null, frameCount: 0, signature: null };
  let distance = 0, peakSpeed = 0, speedTotal = 0, speedSamples = 0;
  for (let i = 0; i < trace.length; i++) {
    const point = trace[i];
    if (finite(point.vx) && finite(point.vy)) {
      const speed = Math.hypot(point.vx, point.vy);
      peakSpeed = Math.max(peakSpeed, speed); speedTotal += speed; speedSamples++;
    }
    if (i > 0) distance += Math.hypot(point.x - trace[i-1].x, point.y - trace[i-1].y);
  }
  const signature = 'TX22-' + fnv1a(canonicalize(trace)).toUpperCase();
  return {
    distance: rounded(distance, 1),
    peakSpeed: finite(run.telemetry?.peakSpeed) ? rounded(run.telemetry.peakSpeed, 1) : rounded(peakSpeed, 1),
    averageSpeed: speedSamples ? rounded(speedTotal / speedSamples, 1) : null,
    duration: rounded(run.timeSeconds, 3),
    frameCount: trace.length,
    signature
  };
}
function interpolateFrame(trace, time) {
  if (!Array.isArray(trace) || !trace.length) return null;
  if (time <= trace[0].t) return { ...trace[0] };
  for (let i = 1; i < trace.length; i++) {
    if (trace[i].t >= time) {
      const a = trace[i-1], b = trace[i], blend = bounded((time-a.t)/Math.max(.0001,b.t-a.t),0,1);
      const lerp = key => finite(a[key]) && finite(b[key]) ? rounded(a[key] + (b[key]-a[key])*blend, 2) : (b[key] ?? a[key] ?? null);
      return { t: rounded(time,3), x:lerp('x'), y:lerp('y'), vx:lerp('vx'), vy:lerp('vy'), gateOpen:blend<1?a.gateOpen:b.gateOpen, checkpoints:blend<1?(a.checkpoints||[]):(b.checkpoints||[]) };
    }
  }
  return { ...trace[trace.length-1] };
}
function trajectoryDeviation(a, b, samples = 41) {
  if (!a || !b || !Array.isArray(a.trajectory) || !Array.isArray(b.trajectory) || a.trajectory.length < 2 || b.trajectory.length < 2) return null;
  let squared = 0;
  for (let i = 0; i < samples; i++) {
    const ratio = i / Math.max(1, samples - 1);
    const pointA = interpolateFrame(a.trajectory, a.trajectory[0].t + (a.trajectory.at(-1).t - a.trajectory[0].t) * ratio);
    const pointB = interpolateFrame(b.trajectory, b.trajectory[0].t + (b.trajectory.at(-1).t - b.trajectory[0].t) * ratio);
    if (!pointA || !pointB) return null;
    squared += Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2);
  }
  return rounded(Math.sqrt(squared / samples), 2);
}
function compareRuns(current, baseline) {
  if (!current || !baseline || current.id === baseline.id || current.levelId !== baseline.levelId || current.mode !== baseline.mode || current.dailyDate !== baseline.dailyDate) return null;
  const a = computeMetrics(current), b = computeMetrics(baseline);
  const delta = (left, right) => finite(left) && finite(right) ? rounded(left - right, 2) : null;
  return {
    sameScenario: true,
    outcome: current.status === baseline.status ? 'unchanged' : current.status === 'won' ? 'recovered' : 'regressed',
    timeDelta: delta(a.duration, b.duration),
    distanceDelta: delta(a.distance, b.distance),
    peakSpeedDelta: delta(a.peakSpeed, b.peakSpeed),
    averageSpeedDelta: delta(a.averageSpeed, b.averageSpeed),
    devicesDelta: delta(current.deviceCount, baseline.deviceCount),
    checkpointsDelta: current.checkpointsReached.length - baseline.checkpointsReached.length,
    meanTrajectoryDeviation: trajectoryDeviation(current, baseline),
    currentSignature: a.signature, baselineSignature: b.signature
  };
}
function validateArchive(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== SCHEMA || raw.schemaVersion !== 1 || !Array.isArray(raw.runs)) return { ok: false, reason: 'Неизвестная схема архива.' };
  if (raw.runs.length > MAX_RUNS) return { ok: false, reason: 'В архиве больше ' + MAX_RUNS + ' запусков.' };
  let bytes;
  try { const serialized = JSON.stringify(raw); bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(serialized).byteLength : serialized.length; } catch { return { ok:false, reason:'Архив не сериализуется.' }; }
  if (bytes > MAX_IMPORT_BYTES) return { ok: false, reason: 'Архив больше 600 KiB.' };
  const runs = raw.runs.map(normalizeRun);
  if (runs.some(run => !run)) return { ok: false, reason: 'Одна или несколько траекторий не прошли проверку.' };
  const ids = new Set();
  for (const run of runs) { if (ids.has(run.id)) return { ok:false, reason:'Повторяющийся ID запуска.' }; ids.add(run.id); }
  return { ok:true, archive:{ schema:SCHEMA, schemaVersion:1, exportedAt:new Date().toISOString(), runs } };
}
function csvCell(value) {
  let cell = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(cell)) cell = "'" + cell;
  return '"' + cell.replace(/"/g,'""') + '"';
}
const api = Object.freeze({
  version:VERSION, schema:SCHEMA, maxRuns:MAX_RUNS, maxFrames:MAX_FRAMES, maxImportBytes:MAX_IMPORT_BYTES,
  canonicalize, fnv1a, normalizeFrames, normalizeRun, computeMetrics, interpolateFrame, trajectoryDeviation, compareRuns, validateArchive, csvCell
});
if (typeof window === 'undefined' || !window.document) { globalThis.__CASCADELAB022_TEST__ = api; return; }
if (window.CASCADELAB022) return;

const panel = document.createElement('section');
panel.className = 'cl-xray';
panel.setAttribute('aria-labelledby','cl-xray-title');
const css = [
'.cl-xray{margin:18px 0 28px;padding:clamp(14px,2.2vw,24px);border:1px solid #61d9f344;border-radius:18px;background:radial-gradient(ellipse at 5% 0%,#1b9db51a,transparent 40%),radial-gradient(ellipse at 95% 0%,#8b73fc16,transparent 42%),linear-gradient(145deg,#091821,#050b12);color:#eaf4f8;box-shadow:0 20px 65px #0003}.cl-xray *{box-sizing:border-box}.cl-xray-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.cl-xray-kicker{margin:0;color:#75e7ff;font:8px ui-monospace,monospace;letter-spacing:.18em}.cl-xray-pill{padding:5px 8px;border:1px solid #6ce6ff46;border-radius:5px;color:#84eaff;font:8px ui-monospace,monospace}.cl-xray h3{margin:9px 0 0;color:#f4fbff;font:400 clamp(25px,3vw,38px)/1.08 Georgia,serif;letter-spacing:-.035em}.cl-xray-copy{max-width:820px;margin:8px 0 16px;color:#95b3c2;font-size:10px;line-height:1.7}.cl-xray-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:8px;align-items:end}.cl-xray-field{display:grid;gap:5px;min-width:0}.cl-xray-field label{color:#7396a7;font:8px ui-monospace,monospace;letter-spacing:.06em}.cl-xray-select{width:100%;min-height:38px;padding:8px 10px;border:1px solid #72bfd52e;border-radius:8px;background:#06131c;color:#e7f5fa;font:10px system-ui,sans-serif}.cl-xray-button{min-height:38px;padding:8px 11px;border:1px solid #61d9f344;border-radius:8px;background:#0a2430;color:#bdeeff;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-xray-button.primary{border-color:#83eaff70;background:linear-gradient(130deg,#b8f4ff,#59c9e8);color:#07151d}.cl-xray-button.danger{border-color:#ff978944;color:#ffb3a6;background:#281418}.cl-xray-button:focus-visible,.cl-xray-select:focus-visible,.cl-xray-range:focus-visible{outline:2px solid #a9efff;outline-offset:3px}.cl-xray-button:disabled{opacity:.4;cursor:not-allowed}.cl-xray-statgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:10px}.cl-xray-stat{min-width:0;padding:9px;border:1px solid #7dc8d51f;border-radius:9px;background:#06131c}.cl-xray-stat span{display:block;color:#67899a;font:7px ui-monospace,monospace;letter-spacing:.08em}.cl-xray-stat b{display:block;margin-top:6px;color:#eaf8fc;font:600 clamp(15px,2vw,21px) Georgia,serif;overflow-wrap:anywhere}.cl-xray-stat small{display:block;margin-top:4px;color:#6f98aa;font-size:8px;line-height:1.4}.cl-xray-charts{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:9px;margin-top:10px}.cl-xray-chartbox{min-width:0;padding:10px;border:1px solid #7dc8d523;border-radius:11px;background:#050f17}.cl-xray-charthead{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px}.cl-xray-charthead strong{color:#c9e7f0;font:8px ui-monospace,monospace;letter-spacing:.08em}.cl-xray-legend{display:flex;gap:9px;flex-wrap:wrap;color:#7799aa;font:7px ui-monospace,monospace}.cl-xray-dot{display:inline-block;width:7px;height:7px;margin-right:4px;border-radius:50%;background:#5cdef5}.cl-xray-dot.base{background:#ae9aff}.cl-xray-canvas{display:block;width:100%;height:235px;border-radius:7px;background:#061019}.cl-xray-canvas.speed{height:160px}.cl-xray-scrubber{margin-top:11px;padding:11px;border:1px solid #7dc8d523;border-radius:10px;background:#06131c}.cl-xray-scrubtop{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.cl-xray-time{color:#edfcff;font:13px ui-monospace,monospace}.cl-xray-frame{color:#7494a3;font:8px ui-monospace,monospace}.cl-xray-range{display:block;width:100%;margin:12px 0 5px;accent-color:#75e7ff;cursor:pointer}.cl-xray-controls{display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}.cl-xray-observation{margin-top:9px;padding:10px 12px;border-left:2px solid #6ce6ff;border-radius:0 8px 8px 0;background:#65def00c;color:#b9dbe6;font:10px/1.6 system-ui,sans-serif;overflow-wrap:anywhere}.cl-xray-events{display:grid;gap:5px;margin-top:10px}.cl-xray-event{display:grid;grid-template-columns:68px minmax(0,1fr) auto;align-items:center;gap:8px;padding:7px 9px;border:1px solid #7db9cb20;border-radius:7px;background:#06121a}.cl-xray-event-time{color:#6de3fb;font:8px ui-monospace,monospace}.cl-xray-event button{border:1px solid #65d7ee2d;border-radius:5px;background:#08232d;color:#b9e9f4;padding:5px 7px;font-size:8px;cursor:pointer}.cl-xray-event-name{color:#bdd0d9;font-size:9px;line-height:1.45;overflow-wrap:anywhere}.cl-xray-empty{padding:24px 12px;border:1px dashed #67bed229;border-radius:10px;color:#7597a7;font-size:10px;line-height:1.7;text-align:center}.cl-xray-comparison{margin-top:10px;padding:12px;border:1px solid #a58bfa36;border-radius:10px;background:#a58bfa0a}.cl-xray-comparison h4{margin:0 0 8px;color:#d9d0ff;font:9px ui-monospace,monospace;letter-spacing:.1em}.cl-xray-comparison p{margin:5px 0;color:#9bb4c2;font-size:10px;line-height:1.6}.cl-xray-footer{display:flex;justify-content:space-between;gap:9px;align-items:start;flex-wrap:wrap;margin-top:11px;padding-top:10px;border-top:1px solid #6ebaca1c}.cl-xray-status{min-height:1.5em;color:#7c9cab;font-size:9px;line-height:1.6}.cl-xray-status[data-kind=error]{color:#ffaaa2}.cl-xray-status[data-kind=success]{color:#9becc7}.cl-xray-privacy{color:#527786;font:7px/1.6 ui-monospace,monospace}.cl-xray[hidden],.cl-xray [hidden]{display:none!important}@media(max-width:760px){.cl-xray-toolbar{grid-template-columns:1fr 1fr}.cl-xray-toolbar .cl-xray-button{grid-column:1/-1}.cl-xray-statgrid{grid-template-columns:repeat(3,minmax(0,1fr))}.cl-xray-charts{grid-template-columns:1fr}.cl-xray-canvas{height:210px}.cl-xray-canvas.speed{height:145px}}@media(max-width:420px){.cl-xray-statgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-xray-event{grid-template-columns:58px minmax(0,1fr)}.cl-xray-event button{grid-column:2;justify-self:start}.cl-xray-toolbar{grid-template-columns:1fr}.cl-xray-toolbar .cl-xray-button{grid-column:auto}}@media(prefers-reduced-motion:reduce){.cl-xray *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}'
].join('');
const style = document.createElement('style');
style.dataset.cascadeLabTrajectoryXray = VERSION;
style.textContent = css;
document.head.append(style);

const make = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = String(text);
  return node;
};
const button = (label, cls, handler) => {
  const node = make('button', 'cl-xray-button' + (cls ? ' ' + cls : ''), label);
  node.type = 'button'; node.addEventListener('click', handler); return node;
};
const field = (label, id) => {
  const wrap = make('div', 'cl-xray-field');
  const lab = make('label', '', label); lab.htmlFor = id;
  const select = document.createElement('select'); select.id = id; select.className = 'cl-xray-select';
  wrap.append(lab, select); return { wrap, select };
};
const titlebar = make('div', 'cl-xray-head');
titlebar.append(make('p', 'cl-xray-kicker', 'CASCADE LAB / TRAJECTORY X-RAY'));
titlebar.append(make('span', 'cl-xray-pill', 'VERSION ' + VERSION));
const heading = make('h3', '', 'Увидь момент, когда траектория ломается.');
heading.id = 'cl-xray-title';
const description = make('p', 'cl-xray-copy', 'Покадровая запись физического запуска, график скорости, метки событий и наложение двух попыток одного сценария. Это анализ записанной игровой симуляции, а не повторный расчёт физики.');
const runField = field('ЗАПУСК ДЛЯ АНАЛИЗА', 'cl-xray-run');
const baseField = field('БАЗА ДЛЯ СРАВНЕНИЯ', 'cl-xray-base');
const toolbar = make('div', 'cl-xray-toolbar');
toolbar.append(runField.wrap, baseField.wrap);
toolbar.append(button('Сравнить траектории', 'primary', () => render()));
panel.append(titlebar, heading, description, toolbar);
const stats = make('div', 'cl-xray-statgrid');
const statDefs = [
  ['ВРЕМЯ','duration'], ['ПИК СКОРОСТИ','peak'], ['ПУТЬ ПО ТОЧКАМ','distance'], ['СРЕДНЯЯ СКОРОСТЬ','average'], ['ЗАПИСЬ','frames']
];
const statValues = {};
for (const [label,key] of statDefs) {
  const card = make('div','cl-xray-stat');
  card.append(make('span','',label));
  const value = make('b','','—'); statValues[key] = value;
  card.append(value); stats.append(card);
}
panel.append(stats);
const charts = make('div','cl-xray-charts');
const pathBox = make('section','cl-xray-chartbox');
const pathHead = make('div','cl-xray-charthead');
pathHead.append(make('strong','','X / Y · ПРОСТРАНСТВЕННЫЙ СЛЕД'));
const legend = make('div','cl-xray-legend');
const currentLegend = make('span'); currentLegend.append(make('i','cl-xray-dot'),document.createTextNode(' запуск'));
const baseLegend = make('span'); baseLegend.append(make('i','cl-xray-dot base'),document.createTextNode(' база'));
legend.append(currentLegend,baseLegend); pathHead.append(legend);
const pathCanvas = document.createElement('canvas'); pathCanvas.className='cl-xray-canvas'; pathCanvas.setAttribute('role','img'); pathCanvas.setAttribute('aria-label','График пространственной траектории груза');
pathBox.append(pathHead,pathCanvas);
const speedBox = make('section','cl-xray-chartbox');
const speedHead = make('div','cl-xray-charthead');
speedHead.append(make('strong','','СКОРОСТЬ / ВРЕМЯ'));
const speedNote = make('span','cl-xray-legend','— px/s');
speedHead.append(speedNote);
const speedCanvas = document.createElement('canvas'); speedCanvas.className='cl-xray-canvas speed'; speedCanvas.setAttribute('role','img'); speedCanvas.setAttribute('aria-label','График скорости груза во времени');
speedBox.append(speedHead,speedCanvas);
charts.append(pathBox,speedBox); panel.append(charts);

const scrubber = make('section','cl-xray-scrubber');
const scrubTop = make('div','cl-xray-scrubtop');
const timeLabel = make('span','cl-xray-time','00.00 s');
const frameLabel = make('span','cl-xray-frame','FRAME —');
scrubTop.append(timeLabel,frameLabel);
const slider = document.createElement('input'); slider.type='range'; slider.className='cl-xray-range'; slider.min='0'; slider.max='0'; slider.step='1'; slider.value='0';
slider.setAttribute('aria-label','Перемещение по времени записи');
const controlRow = make('div','cl-xray-controls');
const previousButton = button('← Предыдущее событие','',()=>jumpEvent(-1));
const nextButton = button('Следующее событие →','',()=>jumpEvent(1));
const exportButton = button('Экспорт X-Ray JSON','',()=>exportRun());
const csvButton = button('Экспорт метрик CSV','',()=>exportCsv());
controlRow.append(previousButton,nextButton,exportButton,csvButton);
scrubber.append(scrubTop,slider,controlRow);
panel.append(scrubber);
const observation = make('p','cl-xray-observation','Выбери сохранённый запуск или заверши новое испытание — запись появится здесь.');
panel.append(observation);
const comparison = make('section','cl-xray-comparison'); comparison.hidden=true;
comparison.append(make('h4','','СРАВНЕНИЕ ДВУХ ЗАПИСЕЙ'));
const comparisonBody = make('div','');
comparison.append(comparisonBody); panel.append(comparison);
const eventPanel = make('section','');
eventPanel.append(make('div','cl-xray-charthead', 'СОБЫТИЯ НА ВРЕМЕННОЙ ШКАЛЕ'));
const eventList = make('div','cl-xray-events');
eventPanel.append(eventList); panel.append(eventPanel);
const footer = make('footer','cl-xray-footer');
const status = make('p','cl-xray-status','Записи хранятся только в этом браузере.');
status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
const privacy = make('span','cl-xray-privacy','LOCAL ONLY · MAX 18 RUNS · MAX 420 FRAMES / RUN · NO NETWORK UPLOAD');
footer.append(status,privacy);
panel.append(footer);
const importButton = button('Импорт X-Ray JSON','',()=>fileInput.click());
const fileInput = document.createElement('input'); fileInput.type='file'; fileInput.accept='application/json,.json'; fileInput.hidden=true;
footer.append(importButton,fileInput);

const passportPanel = document.querySelector('.cl-passport');
const engineeringPanel = document.querySelector('.cl-engineering');
if (passportPanel && passportPanel.parentNode) passportPanel.after(panel);
else if (engineeringPanel && engineeringPanel.parentNode) engineeringPanel.after(panel);
else return;

let runs = loadArchive();
let selectedId = runs[0]?.id || null;
let baseId = null;
let currentFrameIndex = 0;
let activeRun = null;
let activeBase = null;
let resizedObserver = null;

function setStatus(message, kind='info') { status.textContent=message; status.dataset.kind=kind; }
function storagePayload() { return {schema:SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),runs}; }
function loadArchive() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw) return [];
    const checked = validateArchive(raw);
    return checked.ok ? checked.archive.runs.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS) : [];
  } catch { return []; }
}
function persist() {
  try {
    runs = runs.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS);
    window.localStorage.setItem(STORAGE_KEY,JSON.stringify(storagePayload()));
    setStatus('Архив записан локально. Сетевая отправка отключена.','success'); return true;
  } catch {
    setStatus('Браузер не разрешил локальное сохранение. Экспортируй JSON как резервную копию.','error'); return false;
  }
}
function addOption(select,value,label) {
  const option=document.createElement('option'); option.value=value; option.textContent=label; select.append(option);
}
function runLabel(run) {
  return (run.status==='won'?'✓ ':'× ')+run.levelTitle+' · '+run.timeSeconds.toFixed(2)+' с · '+new Date(run.at).toLocaleString();
}
function rebuildSelectors() {
  runField.select.replaceChildren(); baseField.select.replaceChildren();
  addOption(runField.select,'','Выбери запуск…');
  addOption(baseField.select,'','Без сравнения');
  for(const run of runs) addOption(runField.select,run.id,runLabel(run));
  const chosen=runs.find(r=>r.id===selectedId)||runs[0]||null;
  if(chosen){
    const eligible=runs.filter(r=>r.id!==chosen.id&&r.levelId===chosen.levelId&&r.mode===chosen.mode&&r.dailyDate===chosen.dailyDate);
    if(baseId&&!eligible.some(r=>r.id===baseId))baseId=null;
    for(const run of eligible)addOption(baseField.select,run.id,'База · '+runLabel(run));
  } else baseId=null;
  runField.select.value=chosen?.id||'';
  baseField.select.value=baseId||'';
}
function sampleAtSlider(run) {
  if(!run||!run.trajectory.length)return null;
  currentFrameIndex=bounded(Number(slider.value)||0,0,run.trajectory.length-1);
  return run.trajectory[currentFrameIndex];
}
function fmtDelta(value,suffix='') {
  if(!finite(value))return '—';
  return (value>0?'+':'')+String(rounded(value,2)).replace('.',',')+suffix;
}
function metricsText(run) {
  const m=computeMetrics(run);
  return [
    'Результат: '+(run.status==='won'?'доставка подтверждена':'доставка не завершена')+' ('+run.grade+').',
    'Время симуляции: '+run.timeSeconds.toFixed(2)+' с; записей траектории: '+m.frameCount+'.',
    'Измеренная телеметрия: пиковая скорость '+(finite(run.telemetry.peakSpeed)?Math.round(run.telemetry.peakSpeed):'—')+' px/s; последний удар '+(finite(run.telemetry.lastImpactSpeed)?Math.round(run.telemetry.lastImpactSpeed):'—')+' px/s.',
    'Длина линии между записанными точками: '+(finite(m.distance)?m.distance.toFixed(1):'—')+' px. Это оценка по дискретным точкам, не точная физическая длина пути.',
    'Отпечаток записи TX22: '+m.signature+'. FNV-1a — короткая контрольная метка, не криптографическая подпись.'
  ].join(' ');
}
function fitCanvas(canvas) {
  const rect=canvas.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,2,4096/Math.max(1,rect.width),4096/Math.max(1,rect.height));
  const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx,width:rect.width,height:rect.height};
}
function drawPathChart(run,baseline) {
  const {ctx,wid,width,height}=(()=>{const data=fitCanvas(pathCanvas);return{ctx:data.ctx,wid:data.width,width:data.width,height:data.height};})();
  ctx.clearRect(0,0,width,height);
  const margin={l:28,r:16,t:15,b:24},plotW=Math.max(1,width-margin.l-margin.r),plotH=Math.max(1,height-margin.t-margin.b);
  const points=[...(run?.trajectory||[]),...(baseline?.trajectory||[])];
  if(!points.length){ctx.fillStyle='#658797';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('Нет траектории для отображения',width/2,height/2);return;}
  const minX=Math.min(0,...points.map(p=>p.x))-20,maxX=Math.max(1000,...points.map(p=>p.x))+20;
  const minY=Math.min(0,...points.map(p=>p.y))-20,maxY=Math.max(560,...points.map(p=>p.y))+20;
  const px=x=>margin.l+(x-minX)/(maxX-minX)*plotW;
  const py=y=>margin.t+(y-minY)/(maxY-minY)*plotH;
  ctx.strokeStyle='#87b7c31a';ctx.lineWidth=1;
  for(let i=0;i<=5;i++){const x=margin.l+plotW*i/5,y=margin.t+plotH*i/5;ctx.beginPath();ctx.moveTo(x,margin.t);ctx.lineTo(x,margin.t+plotH);ctx.stroke();ctx.beginPath();ctx.moveTo(margin.l,y);ctx.lineTo(margin.l+plotW,y);ctx.stroke();}
  ctx.fillStyle='#628493';ctx.font='8px ui-monospace,monospace';ctx.textAlign='center';
  for(let i=0;i<=5;i++)ctx.fillText(String(Math.round(minX+(maxX-minX)*i/5)),margin.l+plotW*i/5,height-7);
  function trace(line,color,dashed) {
    if(!line||line.trajectory.length<2)return;
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=dashed?1.6:2.2;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash(dashed?[5,4]:[]);ctx.beginPath();
    line.trajectory.forEach((point,index)=>{if(index===0)ctx.moveTo(px(point.x),py(point.y));else ctx.lineTo(px(point.x),py(point.y));});ctx.stroke();ctx.restore();
    const first=line.trajectory[0],last=line.trajectory.at(-1);
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(px(first.x),py(first.y),3.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(px(last.x),py(last.y),4.2,0,Math.PI*2);ctx.fill();
    for(const event of line.telemetry.events){if(finite(event.x)&&finite(event.y)){ctx.fillStyle='#efb85e';ctx.beginPath();ctx.arc(px(event.x),py(event.y),3,0,Math.PI*2);ctx.fill();}}
    for(const checkpoint of line.checkpoints){if(finite(checkpoint.x)&&finite(checkpoint.y)){ctx.strokeStyle='#b39cff';ctx.lineWidth=1;ctx.strokeRect(px(checkpoint.x)-3,py(checkpoint.y)-3,6,6);}}
  }
  trace(baseline,'#ae9aff',true);trace(run,'#61e5f7',false);
  const point=sampleAtSlider(run);
  if(point){ctx.strokeStyle='#efffff8c';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(px(point.x),margin.t);ctx.lineTo(px(point.x),margin.t+plotH);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(px(point.x),py(point.y),4,0,Math.PI*2);ctx.fill();}
}
function drawSpeedChart(run,baseline) {
  const {ctx,width,height}=fitCanvas(speedCanvas);ctx.clearRect(0,0,width,height);
  const margin={l:28,r:12,t:12,b:23},pw=Math.max(1,width-margin.l-margin.r),ph=Math.max(1,height-margin.t-margin.b);
  const traces=[baseline,run].filter(Boolean);
  if(!traces.length){ctx.fillStyle='#658797';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('График появится после запуска',width/2,height/2);return;}
  const duration=Math.max(.1,...traces.map(t=>t.trajectory.at(-1).t));
  const speeds=traces.flatMap(t=>t.trajectory.map(p=>Math.hypot(p.vx||0,p.vy||0)));
  const maxSpeed=Math.max(100,...speeds)*1.12;
  const x=t=>margin.l+bounded(t/duration,0,1)*pw;
  const y=s=>margin.t+(1-bounded(s/maxSpeed,0,1))*ph;
  ctx.strokeStyle='#86b7c31b';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const yy=margin.t+ph*i/4;ctx.beginPath();ctx.moveTo(margin.l,yy);ctx.lineTo(margin.l+pw,yy);ctx.stroke();}
  ctx.fillStyle='#668895';ctx.font='8px ui-monospace,monospace';ctx.textAlign='right';
  for(let i=0;i<=4;i++)ctx.fillText(String(Math.round(maxSpeed*(1-i/4))),margin.l-4,margin.t+ph*i/4+3);
  function trace(item,color,dashed){if(!item)return;ctx.save();ctx.strokeStyle=color;ctx.lineWidth=dashed?1.5:2;ctx.setLineDash(dashed?[4,4]:[]);ctx.beginPath();item.trajectory.forEach((p,i)=>{const speed=finite(p.vx)&&finite(p.vy)?Math.hypot(p.vx,p.vy):0;if(i===0)ctx.moveTo(x(p.t),y(speed));else ctx.lineTo(x(p.t),y(speed));});ctx.stroke();ctx.restore();}
  trace(baseline,'#ae9aff',true);trace(run,'#61e5f7',false);
  const selected=sampleAtSlider(run);
  if(selected){ctx.strokeStyle='#efffff8c';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x(selected.t),margin.t);ctx.lineTo(x(selected.t),margin.t+ph);ctx.stroke();ctx.setLineDash([]);}
  ctx.fillStyle='#668895';ctx.textAlign='center';ctx.fillText('0 s',margin.l,height-6);ctx.fillText(duration.toFixed(1)+' s',margin.l+pw,height-6);
}
function updateEvents(run) {
  eventList.replaceChildren();
  if(!run.telemetry.events.length){eventList.append(make('div','cl-xray-empty','Запись событий пуста. Положение и скорость всё равно можно изучать по временной шкале.'));return;}
  const lastEvents=run.telemetry.events.slice(-16);
  for(const event of lastEvents){
    const row=make('div','cl-xray-event');
    row.append(make('span','cl-xray-event-time',finite(event.t)?event.t.toFixed(2)+' s':'—'));
    row.append(make('span','cl-xray-event-name',event.label));
    const jump=button('Перейти ↗','',()=>{const idx=run.trajectory.reduce((best,frame,index)=>Math.abs(frame.t-(event.t||0))<Math.abs(run.trajectory[best].t-(event.t||0))?index:best,0);slider.value=String(idx);renderFrame();});
    row.append(jump);eventList.append(row);
  }
}
function updateComparison(run,baseline) {
  comparison.hidden=!run||!baseline;
  comparisonBody.replaceChildren();
  if(!run||!baseline)return;
  const diff=compareRuns(run,baseline);
  if(!diff){comparison.hidden=true;return;}
  const rows=[
    ['Исход',diff.outcome==='recovered'?'неудача → успех':diff.outcome==='regressed'?'успех → неудача':'не изменился'],
    ['Время',fmtDelta(diff.timeDelta,' с')],
    ['Длина линии по точкам',fmtDelta(diff.distanceDelta,' px')],
    ['Пиковая скорость',fmtDelta(diff.peakSpeedDelta,' px/s')],
    ['Средняя скорость',fmtDelta(diff.averageSpeedDelta,' px/s')],
    ['Устройства',fmtDelta(diff.devicesDelta,'')],
    ['Контрольные точки',fmtDelta(diff.checkpointsDelta,'')],
    ['Среднее расхождение траекторий',fmtDelta(diff.meanTrajectoryDeviation,' px')]
  ];
  for(const [label,value] of rows)comparisonBody.append(make('p','',label+': '+value));
  comparisonBody.append(make('p','','Отклонение рассчитывается по 41 равномерно выбранной доле времени каждой записи. Оно описывает различие, но не объясняет его причину.'));
}
function updateStats(run) {
  const metrics=computeMetrics(run);
  statValues.duration.textContent=run.timeSeconds.toFixed(2).replace('.',',')+' s';
  statValues.peak.textContent=(finite(metrics.peakSpeed)?Math.round(metrics.peakSpeed):'—')+' px/s';
  statValues.distance.textContent=(finite(metrics.distance)?Math.round(metrics.distance):'—')+' px';
  statValues.average.textContent=(finite(metrics.averageSpeed)?Math.round(metrics.averageSpeed):'—')+' px/s';
  statValues.frames.textContent=metrics.frameCount+' / '+MAX_FRAMES;
  speedNote.textContent='max '+Math.round(metrics.peakSpeed||0)+' px/s';
}
function renderFrame() {
  if(!activeRun)return;
  const frame=sampleAtSlider(activeRun);
  if(!frame)return;
  timeLabel.textContent=frame.t.toFixed(2)+' s';
  frameLabel.textContent='FRAME '+String(currentFrameIndex+1).padStart(3,'0')+' / '+String(activeRun.trajectory.length);
  const speed=finite(frame.vx)&&finite(frame.vy)?Math.hypot(frame.vx,frame.vy):null;
  const nearest=[...activeRun.telemetry.events].filter(e=>finite(e.t)).sort((a,b)=>Math.abs(a.t-frame.t)-Math.abs(b.t-frame.t))[0];
  const nearText=nearest&&Math.abs(nearest.t-frame.t)<=.5?' Ближайшее событие: '+nearest.label+' ('+nearest.t.toFixed(2)+' с).':'';
  observation.textContent='t = '+frame.t.toFixed(3)+' с · x = '+frame.x.toFixed(1)+' px · y = '+frame.y.toFixed(1)+' px · скорость '+(speed===null?'—':Math.round(speed)+' px/s')+' · шлюз '+(frame.gateOpen?'открыт':'закрыт')+' · пройдено контрольных точек: '+(frame.checkpoints||[]).length+'.'+nearText;
  drawPathChart(activeRun,activeBase);drawSpeedChart(activeRun,activeBase);
}
function render() {
  rebuildSelectors();
  activeRun=runs.find(r=>r.id===runField.select.value)||null;
  activeBase=runs.find(r=>r.id===baseField.select.value)||null;
  if(!activeRun){
    for(const val of Object.values(statValues))val.textContent='—';
    slider.min='0';slider.max='0';slider.value='0';timeLabel.textContent='00.00 s';frameLabel.textContent='FRAME —';
    observation.textContent='Заверши новый запуск в CASCADE LAB. Интерактивная карта траектории и график скорости появятся автоматически.';
    eventList.replaceChildren(make('div','cl-xray-empty','Пока нет записанных траекторий. Первый завершённый запуск создаст локальную запись.'));
    comparison.hidden=true;drawPathChart(null,null);drawSpeedChart(null,null);return;
  }
  if(!activeRun.trajectory.length){activeRun=null;return;}
  slider.min='0';slider.max=String(activeRun.trajectory.length-1);slider.value=String(bounded(currentFrameIndex,0,activeRun.trajectory.length-1));
  updateStats(activeRun);updateEvents(activeRun);updateComparison(activeRun,activeBase);renderFrame();
}
function jumpEvent(direction) {
  if(!activeRun||!activeRun.telemetry.events.length)return;
  const current=sampleAtSlider(activeRun).t;
  const events=activeRun.telemetry.events.filter(e=>finite(e.t));
  const next=direction<0?[...events].reverse().find(e=>e.t<current-.001):events.find(e=>e.t>current+.001);
  const target=next|| (direction<0?events[0]:events.at(-1));
  if(!target)return;
  const idx=activeRun.trajectory.reduce((best,frame,index)=>Math.abs(frame.t-target.t)<Math.abs(activeRun.trajectory[best].t-target.t)?index:best,0);
  slider.value=String(idx);renderFrame();
}
function download(filename,content,mime) {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.hidden=true;panel.append(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function exportRun() {
  if(!activeRun){setStatus('Сначала выбери запись для экспорта.','error');return;}
  const payload={schema:SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),run:activeRun,metrics:computeMetrics(activeRun),baseline:activeBase?{id:activeBase.id,metrics:computeMetrics(activeBase),comparison:compareRuns(activeRun,activeBase)}:null};
  download('cascade-lab-trajectory-xray-L'+activeRun.levelId+'-'+activeRun.id+'.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8');
  setStatus('X-Ray JSON готов. В файл вошла записанная траектория и её наблюдаемые метрики.','success');
}
function exportCsv() {
  if(!activeRun){setStatus('Сначала выбери запись для экспорта.','error');return;}
  const rows=[['time_s','x_px','y_px','vx_px_s','vy_px_s','speed_px_s','gate_open','checkpoints']];
  for(const p of activeRun.trajectory)rows.push([p.t,p.x,p.y,p.vx,p.vy,finite(p.vx)&&finite(p.vy)?Math.hypot(p.vx,p.vy):'',p.gateOpen,(p.checkpoints||[]).join('|')]);
  download('cascade-lab-trajectory-L'+activeRun.levelId+'.csv','\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  setStatus('CSV временных точек готов. Текстовые поля экранированы от формул таблиц.','success');
}
async function importFile(file) {
  if(!file)return;
  if(file.size>MAX_IMPORT_BYTES){setStatus('Файл больше 600 KiB; импорт отменён.','error');fileInput.value='';return;}
  try{
    const raw=JSON.parse(await file.text());
    let incoming=[];
    if(raw&&raw.schema===SCHEMA&&raw.schemaVersion===1&&Array.isArray(raw.runs)) {
      const checked=validateArchive(raw);if(!checked.ok)throw new Error(checked.reason);incoming=checked.archive.runs;
    } else if(raw&&raw.schema===SCHEMA&&raw.schemaVersion===1&&raw.run) {
      const one=normalizeRun(raw.run);if(!one)throw new Error('Запись запуска не прошла проверку структуры.');incoming=[one];
    }
    else throw new Error('Неизвестный формат. Ожидается X-Ray archive JSON.');
    const merged=new Map(runs.map(run=>[run.id,run]));
    let added=0;
    for(const item of incoming){if(!item)continue;if(merged.has(item.id))continue;merged.set(item.id,item);added++;}
    runs=Array.from(merged.values()).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,MAX_RUNS);
    if(!persist())throw new Error('Не удалось сохранить импортированный архив.');
    selectedId=runs[0]?.id||null;baseId=null;render();setStatus('Импорт завершён: добавлено '+added+' новых записей.','success');
  } catch(error){setStatus(clean(error&&error.message||'Не удалось проверить JSON.','240'),'error');}
  finally{fileInput.value='';}
}
function onRunFinished(detail) {
  const raw={...detail,id:'xray-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),at:detail.at||new Date().toISOString()};
  const run=normalizeRun(raw);
  if(!run){setStatus('Для X-Ray нужен завершённый запуск с корректной траекторией и минимум двумя кадрами.','error');return;}
  runs=runs.filter(item=>item.id!==run.id);runs.unshift(run);runs=runs.slice(0,MAX_RUNS);
  selectedId=run.id;baseId=null;currentFrameIndex=0;
  if(persist()){render();setStatus('Записано '+run.trajectory.length+' точек траектории. Данные остались в этом браузере.','success');}
}
runField.select.addEventListener('change',()=>{selectedId=runField.select.value;baseId=null;currentFrameIndex=0;render();});
baseField.select.addEventListener('change',()=>{baseId=baseField.select.value||null;render();});
slider.addEventListener('input',()=>{currentFrameIndex=Number(slider.value)||0;renderFrame();});
fileInput.addEventListener('change',()=>void importFile(fileInput.files&&fileInput.files[0]));
window.addEventListener('cascade-lab:run-finished',event=>onRunFinished(event.detail||{}));
if(typeof ResizeObserver==='function'){
  resizedObserver=new ResizeObserver(()=>{if(activeRun){drawPathChart(activeRun,activeBase);drawSpeedChart(activeRun,activeBase);}});
  resizedObserver.observe(panel);
}
render();
Object.defineProperty(window,'CASCADELAB022',{
  value:Object.freeze({version:VERSION,schema:SCHEMA,getRuns:()=>runs.map(run=>({...run,trajectory:run.trajectory.map(p=>({...p}))})),computeMetrics,compareRuns}),
  configurable:false,enumerable:false,writable:false
});
})();
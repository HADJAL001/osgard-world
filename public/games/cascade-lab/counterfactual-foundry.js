(() => {
'use strict';

const VERSION = '0.26.0';
const SCHEMA = 'osgard.cascade-lab.counterfactual-foundry.v1';
const STORAGE_KEY = SCHEMA + '.latest';
const HISTORY_KEY = SCHEMA + '.history';
const MAX_HISTORY = 12;
const MAX_EXPORT_BYTES = 900 * 1024;
const PARAMETERS = Object.freeze({
  angle: { label: 'Угол устройства', unit: '°', steps: [5, 10, 15, 30], step: 15 },
  x: { label: 'Положение по X', unit: ' px', steps: [4, 8, 12, 20], step: 12 },
  y: { label: 'Положение по Y', unit: ' px', steps: [4, 8, 12, 20], step: 12 }
});
const DEVICE_NAMES = Object.freeze({
  spring: 'Пружина', fan: 'Вентилятор', belt: 'Конвейер',
  magnet: 'Магнит', switch: 'Контакт', bumper: 'Отбойник'
});
const clean = (value, limit = 180) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const rounded = (value, places = 2) => finite(value) ? Number(value.toFixed(places)) : null;
const wrapAngle = angle => {
  const tau = Math.PI * 2;
  let value = angle % tau;
  if (value < 0) value += tau;
  return Number(value.toFixed(6));
};
const canonicalize = value => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
};
function fingerprint(value) {
  let hash = 0x811c9dc5;
  for (const character of canonicalize(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
function normalizeSource(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5) return null;
  if (!Array.isArray(raw.devices) || raw.devices.length > 12) return null;
  const devices = [];
  for (const device of raw.devices) {
    if (!device || !Object.hasOwn(DEVICE_NAMES, device.type) ||
        !finite(device.x) || device.x < -100 || device.x > 1200 ||
        !finite(device.y) || device.y < -100 || device.y > 700 ||
        !finite(device.angle) || Math.abs(device.angle) > Math.PI * 64) return null;
    devices.push({
      type: device.type,
      x: rounded(device.x, 2),
      y: rounded(device.y, 2),
      angle: wrapAngle(device.angle)
    });
  }
  return {
    id: clean(raw.id || 'local-source', 90),
    at: Number.isFinite(Date.parse(raw.at)) ? new Date(raw.at).toISOString() : null,
    levelId: raw.levelId,
    levelTitle: clean(raw.levelTitle || 'Протокол #' + raw.levelId, 120),
    status: ['won', 'lost'].includes(raw.status) ? raw.status : 'unknown',
    timeSeconds: finite(raw.timeSeconds) ? Math.max(0, Math.min(120, raw.timeSeconds)) : null,
    deviceCount: Number.isInteger(raw.deviceCount) ? Math.max(0, Math.min(12, raw.deviceCount)) : devices.length,
    devices,
    telemetry: raw.telemetry && typeof raw.telemetry === 'object' ? raw.telemetry : {},
    trajectory: Array.isArray(raw.trajectory) ? raw.trajectory.filter(point =>
      point && finite(point.t) && finite(point.x) && finite(point.y)
    ).slice(0, 420).map(point => ({
      t: rounded(point.t, 4), x: rounded(point.x, 3), y: rounded(point.y, 3),
      vx: finite(point.vx) ? rounded(point.vx, 3) : null,
      vy: finite(point.vy) ? rounded(point.vy, 3) : null,
      gateOpen: point.gateOpen === true,
      checkpoints: Array.isArray(point.checkpoints) ? point.checkpoints.slice(0, 20).map(v => clean(v, 80)) : []
    })) : []
  };
}
function mutateBlueprint(source, deviceIndex, parameter, offset, step) {
  const normalized = normalizeSource(source);
  if (!normalized) return { ok: false, error: 'Сохранённая попытка не содержит корректного чертежа.' };
  if (!Object.hasOwn(PARAMETERS, parameter)) return { ok: false, error: 'Неизвестный параметр эксперимента.' };
  if (!Number.isInteger(deviceIndex) || deviceIndex < 0 || deviceIndex >= normalized.devices.length) {
    return { ok: false, error: 'Выбери существующее устройство в чертеже.' };
  }
  if (![-2, -1, 0, 1, 2].includes(offset)) return { ok: false, error: 'Допустимы только пять значений вокруг базы.' };
  const spec = PARAMETERS[parameter];
  if (!spec.steps.includes(step)) return { ok: false, error: 'Шаг изменения вне разрешённого набора.' };
  const blueprint = { levelId: normalized.levelId, devices: normalized.devices.map(device => ({ ...device })) };
  const target = blueprint.devices[deviceIndex];
  if (parameter === 'angle') target.angle = wrapAngle(target.angle + offset * step * Math.PI / 180);
  else target[parameter] = rounded(Math.max(parameter === 'x' ? -100 : -100, Math.min(parameter === 'x' ? 1200 : 700, target[parameter] + offset * step)), 2);
  const changed = blueprint.devices.filter((device, index) => {
    const before = normalized.devices[index];
    return device.x !== before.x || device.y !== before.y || device.angle !== before.angle || device.type !== before.type;
  });
  if (offset !== 0 && (changed.length !== 1 || blueprint.devices.some((device, index) =>
    index !== deviceIndex && (device.x !== normalized.devices[index].x ||
      device.y !== normalized.devices[index].y || device.angle !== normalized.devices[index].angle ||
      device.type !== normalized.devices[index].type)))) {
    return { ok: false, error: 'Проверка мутации выявила изменение за пределами выбранной переменной.' };
  }
  return {
    ok: true,
    offset, parameter, step,
    value: parameter === 'angle' ? rounded(target.angle * 180 / Math.PI, 2) : target[parameter],
    blueprint,
    changedDeviceIndex: offset === 0 ? null : deviceIndex
  };
}
function interpolate(trace, time) {
  if (!trace.length) return null;
  if (time <= trace[0].t) return trace[0];
  if (time >= trace[trace.length - 1].t) return trace[trace.length - 1];
  let low = 0, high = trace.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (trace[middle].t <= time) low = middle; else high = middle;
  }
  const a = trace[low], b = trace[high];
  const ratio = (time - a.t) / Math.max(0.0001, b.t - a.t);
  return { t: time, x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}
function trajectoryDeviation(a, b, sampleCount = 41) {
  const left = Array.isArray(a) ? a : a && a.trajectory;
  const right = Array.isArray(b) ? b : b && b.trajectory;
  if (!left || !right || left.length < 2 || right.length < 2) return null;
  const durationA = left[left.length - 1].t - left[0].t;
  const durationB = right[right.length - 1].t - right[0].t;
  if (!(durationA > 0) || !(durationB > 0)) return null;
  let total = 0;
  for (let i = 0; i < sampleCount; i++) {
    const ratio = i / (sampleCount - 1);
    const pa = interpolate(left, left[0].t + durationA * ratio);
    const pb = interpolate(right, right[0].t + durationB * ratio);
    total += Math.hypot(pa.x - pb.x, pa.y - pb.y);
  }
  return rounded(total / sampleCount, 3);
}
function distanceToGoal(result) {
  if (!result || !result.goal || !result.position) return Infinity;
  const goalX = result.goal.x + result.goal.w / 2;
  const goalY = result.goal.y + 1;
  return Math.hypot(result.position.x - goalX, result.position.y - goalY);
}
function rankVariants(variants) {
  return variants.slice().sort((a, b) => {
    const winA = a.result.status === 'won' ? 1 : 0;
    const winB = b.result.status === 'won' ? 1 : 0;
    if (winA !== winB) return winB - winA;
    if (winA && a.result.timeSeconds !== b.result.timeSeconds) return a.result.timeSeconds - b.result.timeSeconds;
    const distanceA = distanceToGoal(a.result);
    const distanceB = distanceToGoal(b.result);
    if (!winA && Math.abs(distanceA - distanceB) > 0.001) return distanceA - distanceB;
    return (a.result.telemetry.lastImpactSpeed || 0) - (b.result.telemetry.lastImpactSpeed || 0);
  });
}
function buildStudy(engine, rawSource, options = {}) {
  if (!engine || typeof engine.simulate !== 'function' || typeof engine.repeatability !== 'function') {
    return { ok: false, error: 'Сначала загрузи движок Counterfactual Foundry 0.26.' };
  }
  const source = normalizeSource(rawSource);
  if (!source) return { ok: false, error: 'Не удалось разобрать сохранённую попытку X-Ray.' };
  if (!source.devices.length) return { ok: false, error: 'В сохранённой попытке нет устройств для изменения. Собери чертёж и запусти игру.' };
  const deviceIndex = Number(options.deviceIndex);
  const parameter = String(options.parameter || 'angle');
  const step = Number(options.step);
  if (!Object.hasOwn(PARAMETERS, parameter)) return { ok: false, error: 'Выбранный параметр не поддерживается.' };
  if (!Number.isInteger(deviceIndex) || deviceIndex < 0 || deviceIndex >= source.devices.length) return { ok: false, error: 'Выбери устройство.' };
  if (!PARAMETERS[parameter].steps.includes(step)) return { ok: false, error: 'Выбери один из безопасных шагов изменения.' };

  const blueprint = { levelId: source.levelId, devices: source.devices.map(device => ({ ...device })) };
  const control = engine.repeatability(blueprint);
  if (!control.ok) return { ok: false, error: control.error || 'Не удалось выполнить контрольную пару.' };
  const baselineSimulation = control.first;
  const variants = [];
  for (const offset of [-2, -1, 0, 1, 2]) {
    const mutation = mutateBlueprint(source, deviceIndex, parameter, offset, step);
    if (!mutation.ok) return mutation;
    let simulation;
    if (offset === 0) simulation = { ok: true, result: baselineSimulation };
    else simulation = engine.simulate(mutation.blueprint);
    if (!simulation.ok) return { ok: false, error: simulation.error || 'Один из виртуальных запусков не завершился.' };
    variants.push({
      offset, value: mutation.value, parameter, step,
      label: offset === 0 ? 'БАЗА' : (offset > 0 ? '+' : '') + String(offset * step) + (parameter === 'angle' ? '°' : ' px'),
      result: simulation.result,
      trajectoryDeviationFromBase: offset === 0 ? 0 : trajectoryDeviation(baselineSimulation.trajectory, simulation.result.trajectory)
    });
  }
  const best = rankVariants(variants)[0] || null;
  const observedStatusMatch = source.status === 'unknown' ? null : source.status === baselineSimulation.status;
  const observedTimeDelta = finite(source.timeSeconds) ? rounded(baselineSimulation.timeSeconds - source.timeSeconds, 4) : null;
  const observedTrajectoryDeviation = trajectoryDeviation(source.trajectory, baselineSimulation.trajectory);
  const stamp = new Date().toISOString();
  const reportCore = {
    schema: SCHEMA,
    version: VERSION,
    createdAt: stamp,
    source: { id: source.id, at: source.at, levelId: source.levelId, levelTitle: source.levelTitle, status: source.status, timeSeconds: source.timeSeconds },
    model: { version: baselineSimulation.modelVersion, deterministic: control.sameFingerprint, fingerprint: control.fingerprint },
    experiment: { deviceIndex, deviceType: source.devices[deviceIndex].type, parameter, step, levels: [-2,-1,0,1,2], changedVariableCount: 1 },
    observedVersusVirtual: {
      statusMatch: observedStatusMatch,
      observedTimeDeltaSeconds: observedTimeDelta,
      meanTrajectoryDeviationPx: observedTrajectoryDeviation
    },
    baseline: baselineSimulation,
    control: control.second,
    variants,
    bestOffset: best ? best.offset : null,
    bestFingerprint: best ? best.result.fingerprint : null,
    interpretation: 'Это виртуальный расчёт внутри игровой модели. Он не является новым игровым прохождением и не доказывает физику реального мира.'
  };
  reportCore.reportFingerprint = fingerprint({
    sourceId: reportCore.source.id, levelId: reportCore.source.levelId,
    model: reportCore.model, experiment: reportCore.experiment,
    variants: reportCore.variants.map(v => ({ offset: v.offset, fingerprint: v.result.fingerprint }))
  });
  return { ok: true, study: reportCore };
}
function archiveSummary(study) {
  return {
    id: study.reportFingerprint,
    createdAt: study.createdAt,
    levelId: study.source.levelId,
    levelTitle: study.source.levelTitle,
    sourceId: study.source.id,
    parameter: study.experiment.parameter,
    deviceIndex: study.experiment.deviceIndex,
    step: study.experiment.step,
    deterministic: study.model.deterministic,
    statusMatch: study.observedVersusVirtual.statusMatch,
    observedDeviation: study.observedVersusVirtual.meanTrajectoryDeviationPx,
    bestOffset: study.bestOffset,
    bestStatus: study.variants.find(v => v.offset === study.bestOffset)?.result.status || 'unknown'
  };
}
const pureApi = Object.freeze({
  version: VERSION, schema: SCHEMA, parameters: PARAMETERS,
  normalizeSource, mutateBlueprint, trajectoryDeviation, rankVariants, buildStudy, archiveSummary, fingerprint
});
if (typeof window === 'undefined' || !window.document) {
  globalThis.__CASCADELAB026_TEST__ = pureApi;
  return;
}
if (window.CASCADELAB026 || !window.CASCADELAB026_ENGINE || !window.CASCADELAB022) return;

const css = [
  '.cl-counterfactual{margin:18px 0 22px;padding:clamp(14px,2vw,22px);border:1px solid #78d7ff3b;border-radius:16px;background:radial-gradient(ellipse at 91% 0%,#17618224,transparent 43%),linear-gradient(145deg,#0a1724,#050c14);color:#eaf3f8;box-shadow:0 18px 45px #0003,inset 0 1px #ffffff09}',
  '.cl-cf-head{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;margin-bottom:10px}.cl-cf-kicker{margin:0;color:#73dcff;font:8px ui-monospace,monospace;letter-spacing:.17em}.cl-cf-pill{padding:5px 8px;border:1px solid #e9ba6a42;border-radius:5px;color:#e9ba6a;font:8px ui-monospace,monospace}',
  '.cl-counterfactual h3{margin:0;color:#f4f8fb;font:400 clamp(24px,3vw,37px)/1.06 Georgia,serif;letter-spacing:-.03em}.cl-cf-sub{margin:9px 0 14px;color:#a0b6c3;font-size:10px;line-height:1.65;max-width:850px}',
  '.cl-cf-warning{margin:10px 0 13px;padding:9px 11px;border-left:2px solid #e9ba6a;border-radius:0 7px 7px 0;background:#e9ba6a0c;color:#d8e4ea;font-size:9px;line-height:1.6}',
  '.cl-cf-controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.cl-cf-field{display:grid;align-content:start;gap:5px;min-width:0}.cl-cf-field label{color:#7798aa;font:8px ui-monospace,monospace;letter-spacing:.06em}.cl-cf-select{width:100%;min-height:38px;padding:8px;border:1px solid #8ab9ca2b;border-radius:8px;background:#06111b;color:#e6f1f7;font:10px system-ui,sans-serif}.cl-cf-select:focus-visible,.cl-cf-button:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}',
  '.cl-cf-actions{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.cl-cf-button{min-height:38px;padding:9px 12px;border:1px solid #80c8e63a;border-radius:8px;background:#0a2230;color:#bceaff;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-cf-button.primary{border-color:#e9ba6a;background:linear-gradient(120deg,#f4d38f,#d69c43);color:#20180a}.cl-cf-button:disabled{opacity:.45;cursor:not-allowed}.cl-cf-button:hover:not(:disabled){filter:brightness(1.12)}',
  '.cl-cf-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:12px 0}.cl-cf-kpi{padding:9px;border:1px solid #8bb6c421;border-radius:8px;background:#06111b;min-width:0}.cl-cf-kpi span{display:block;color:#6e92a4;font:7px ui-monospace,monospace}.cl-cf-kpi b{display:block;margin-top:5px;color:#eef7fb;font:600 16px Georgia,serif;overflow-wrap:anywhere}.cl-cf-kpi small{display:block;margin-top:4px;color:#7693a2;font-size:8px;line-height:1.45}',
  '.cl-cf-chart-shell{margin-top:12px;padding:10px;border:1px solid #86b6ca1e;border-radius:10px;background:#040d15}.cl-cf-chart-title{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;color:#7ca6ba;font:8px ui-monospace,monospace;letter-spacing:.08em}.cl-cf-chart{display:block;width:100%;height:auto;aspect-ratio:1000/560;touch-action:pan-y}.cl-cf-legend{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.cl-cf-legend span{display:inline-flex;align-items:center;gap:5px;color:#91a9b5;font:8px ui-monospace,monospace}.cl-cf-dot{width:8px;height:8px;display:inline-block;border-radius:50%}',
  '.cl-cf-results{display:grid;gap:6px;margin-top:10px}.cl-cf-result{display:grid;grid-template-columns:88px minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px 10px;border:1px solid #83b8cc22;border-radius:8px;background:#06111b}.cl-cf-result.best{border-color:#e9ba6a88;background:#e9ba6a09}.cl-cf-result-label{color:#7da1b2;font:8px ui-monospace,monospace}.cl-cf-result strong{display:block;color:#e6f0f5;font-size:10px}.cl-cf-result small{display:block;margin-top:4px;color:#819eac;font:8px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.cl-cf-result-metric{text-align:right;color:#c9e9f5;font:10px ui-monospace,monospace;white-space:nowrap}',
  '.cl-cf-archive{margin-top:14px;padding-top:12px;border-top:1px solid #8db7cb20}.cl-cf-archive-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;color:#94b3c2;font:8px ui-monospace,monospace;letter-spacing:.08em}.cl-cf-history{display:grid;gap:5px;margin-top:7px}.cl-cf-history-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 9px;border:1px solid #83b8cc1b;border-radius:7px;background:#06111b}.cl-cf-history-row strong{display:block;color:#bdcfda;font-size:9px}.cl-cf-history-row small{display:block;margin-top:3px;color:#718d9b;font:7px/1.45 ui-monospace,monospace}.cl-cf-history-row button{min-height:29px;padding:5px 8px;border:1px solid #7cc9e62b;border-radius:6px;background:#0a202c;color:#a7dff4;font-size:8px}',
  '.cl-cf-status{min-height:20px;margin:8px 0 0;color:#7fdaf5;font-size:9px;line-height:1.5}.cl-cf-status[data-kind=error]{color:#ffb09f}.cl-cf-foot{margin:8px 0 0;padding-top:8px;border-top:1px solid #8db7cb18;color:#5f7d8d;font:7px/1.6 ui-monospace,monospace}',
  '@media(max-width:760px){.cl-counterfactual{padding:13px;border-radius:12px}.cl-cf-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-cf-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-cf-result{grid-template-columns:62px minmax(0,1fr)}.cl-cf-result-metric{grid-column:2;text-align:left}.cl-cf-button{min-height:42px}.cl-cf-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cl-cf-button{width:100%}}',
  '@media(max-width:390px){.cl-cf-controls{grid-template-columns:1fr}.cl-cf-result{grid-template-columns:1fr}.cl-cf-result-metric{grid-column:1}}',
  '@media(prefers-reduced-motion:reduce){.cl-cf-button{transition:none!important;animation:none!important}}'
].join('');
const style = document.createElement('style');
style.dataset.cascadeLabCounterfactual = VERSION;
style.textContent = css;
document.head.append(style);
const el = (tag, cls, value) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (value !== undefined) node.textContent = String(value);
  return node;
};
const panel = el('section', 'cl-counterfactual');
panel.id = 'cascade-counterfactual-foundry';
panel.setAttribute('aria-labelledby', 'cl-cf-title');
panel.setAttribute('aria-live', 'polite');
const header = el('div', 'cl-cf-head');
header.append(el('p', 'cl-cf-kicker', 'CASCADE LAB / COUNTERFACTUAL FOUNDRY'));
header.append(el('span', 'cl-cf-pill', 'VIRTUAL ENGINE · 0.26.0'));
const heading = el('h3', '', 'Запусти мир заново. Измени только одно.');
heading.id = 'cl-cf-title';
panel.append(header, heading);
panel.append(el('p', 'cl-cf-sub', 'Foundry берёт чертёж из сохранённого X-Ray, дважды запускает точную копию через настоящий PhysicsWorld, затем проверяет пять значений одного параметра. Сравнение траекторий и результатов вычисляется локально.'));
panel.append(el('p', 'cl-cf-warning', 'ВАЖНО: это контрфактические прогоны внутри игровой модели, а не игровые прохождения и не доказательство реальной физики. Они не попадают в рекорды, X-Ray или Mission Director.'));
const controls = el('div', 'cl-cf-controls');
const fields = {};
function addSelect(id, label, options) {
  const field = el('div', 'cl-cf-field');
  const title = el('label', '', label);
  const select = el('select', 'cl-cf-select');
  select.id = id;
  for (const option of options) {
    const opt = document.createElement('option');
    opt.value = String(option.value);
    opt.textContent = option.label;
    select.append(opt);
  }
  title.htmlFor = id;
  field.append(title, select);
  controls.append(field);
  fields[id] = select;
  return select;
}
addSelect('cl-cf-source', 'СОХРАНЁННАЯ ПОПЫТКА X-RAY', []);
addSelect('cl-cf-device', 'УСТРОЙСТВО', []);
addSelect('cl-cf-parameter', 'ОДИН ПАРАМЕТР', Object.keys(PARAMETERS).map(key => ({ value: key, label: PARAMETERS[key].label })));
addSelect('cl-cf-step', 'ШАГ ИЗМЕНЕНИЯ', PARAMETERS.angle.steps.map(value => ({ value, label: value + '°' })));
panel.append(controls);
const actions = el('div', 'cl-cf-actions');
const runButton = el('button', 'cl-cf-button primary', 'Запустить twin + sweep');
runButton.type = 'button';
const exportJsonButton = el('button', 'cl-cf-button', 'Экспорт JSON');
exportJsonButton.type = 'button'; exportJsonButton.disabled = true;
const exportCsvButton = el('button', 'cl-cf-button', 'Экспорт CSV');
exportCsvButton.type = 'button'; exportCsvButton.disabled = true;
const clearButton = el('button', 'cl-cf-button', 'Очистить локальную историю');
clearButton.type = 'button';
actions.append(runButton, exportJsonButton, exportCsvButton, clearButton);
panel.append(actions);
const kpis = el('div', 'cl-cf-kpis');
const kpiValues = {};
for (const [key, label] of [['determinism','ПОВТОРЯЕМОСТЬ'],['fit','СОВПАДЕНИЕ С ИГРОЙ'],['best','ЛУЧШИЙ ВАРИАНТ'],['runs','ВИРТУАЛЬНЫЕ ЗАПУСКИ']]) {
  const card = el('div', 'cl-cf-kpi');
  card.append(el('span', '', label));
  const value = el('b', '', '—');
  const small = el('small', '', 'Ожидание выбранной попытки');
  card.append(value, small);
  kpis.append(card);
  kpiValues[key] = { value, small };
}
panel.append(kpis);
const chartShell = el('div', 'cl-cf-chart-shell');
const chartTitle = el('div', 'cl-cf-chart-title');
chartTitle.append(el('span', '', 'X/Y TRACE OVERLAY'));
chartTitle.append(el('span', '', 'WORLD 1000 × 560'));
chartShell.append(chartTitle);
const canvas = document.createElement('canvas');
canvas.className = 'cl-cf-chart';
canvas.width = 1000; canvas.height = 560;
canvas.setAttribute('role', 'img');
canvas.setAttribute('aria-label', 'Наложение фактической и пяти виртуальных траекторий');
chartShell.append(canvas);
const legend = el('div', 'cl-cf-legend');
const legendItems = [
  ['#dce8ef','ФАКТИЧЕСКИЙ X-RAY'],
  ['#e9ba6a','ВИРТУАЛЬНАЯ БАЗА'],
  ['#b49bff','−2 ШАГА'],['#7bbdff','−1 ШАГ'],['#7ce0c1','+1 ШАГ'],['#ff8d8d','+2 ШАГА']
];
for (const [color, label] of legendItems) {
  const item = el('span');
  const dot = el('i','cl-cf-dot');
  dot.style.background = color;
  item.append(dot, document.createTextNode(label));
  legend.append(item);
}
chartShell.append(legend);
panel.append(chartShell);
const resultList = el('div','cl-cf-results');
panel.append(resultList);
const archive = el('section','cl-cf-archive');
const archiveHead = el('div','cl-cf-archive-head');
archiveHead.append(el('span','','ПОСЛЕДНИЕ ЛОКАЛЬНЫЕ ПРОГОНЫ'));
const archiveCount = el('span','cl-cf-pill','0 / '+MAX_HISTORY);
archiveHead.append(archiveCount);
const historyList = el('div','cl-cf-history');
archive.append(archiveHead,historyList);
panel.append(archive);
const status = el('p','cl-cf-status');
status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
panel.append(status,el('p','cl-cf-foot','ТОЛЬКО В ЭТОМ БРАУЗЕРЕ · БЕЗ СЕТЕВОЙ ОТПРАВКИ · ДВЕ КОНТРОЛЬНЫЕ СИМУЛЯЦИИ + ПЯТИТОЧЕЧНЫЙ SWEEP'));
const mount = document.querySelector('#cascade-evidence-integrity') || document.querySelector('#cascade-adaptive-mission-director') || document.querySelector('.cl-xray');
if (mount && typeof mount.after === 'function') mount.after(panel);
else if (document.querySelector('main')) document.querySelector('main').append(panel);
else return;

let sourceRuns = [];
let currentStudy = null;
let history = [];
const plotColors = { '-2':'#b49bff', '-1':'#7bbdff', '0':'#e9ba6a', '1':'#7ce0c1', '2':'#ff8d8d' };
function setStatus(message, kind='info') {
  status.textContent = message;
  status.dataset.kind = kind;
}
function setKpi(key, value, hint) {
  kpiValues[key].value.textContent = value;
  kpiValues[key].small.textContent = hint;
}
function setOptions(select, options, placeholder) {
  const previous = select.value;
  select.replaceChildren();
  if (placeholder) {
    const option = document.createElement('option');
    option.value = ''; option.textContent = placeholder; select.append(option);
  }
  for (const data of options) {
    const option = document.createElement('option');
    option.value = String(data.value); option.textContent = data.label; select.append(option);
  }
  if (options.some(option => String(option.value) === previous)) select.value = previous;
}
function refreshSources(preferredId) {
  try { sourceRuns = window.CASCADELAB022.getRuns().map(normalizeSource).filter(Boolean); }
  catch { sourceRuns = []; }
  const options = sourceRuns.map(run => ({
    value: run.id,
    label: 'L' + run.levelId + ' · ' + run.levelTitle + ' · ' + (run.status === 'won' ? '✓' : '×') + ' · ' + run.timeSeconds.toFixed(2) + ' s · ' + run.devices.length + ' деталей'
  }));
  setOptions(fields['cl-cf-source'], options, options.length ? 'Выбери сохранённую попытку' : 'Нет сохранённых запусков X-Ray');
  if (preferredId && options.some(item => item.value === preferredId)) fields['cl-cf-source'].value = preferredId;
  else if (options.length && !fields['cl-cf-source'].value) fields['cl-cf-source'].value = options[0].value;
  refreshDevices();
  runButton.disabled = !fields['cl-cf-source'].value || !window.CASCADELAB026_ENGINE;
}
function selectedSource() {
  return sourceRuns.find(run => run.id === fields['cl-cf-source'].value) || null;
}
function refreshDevices() {
  const source = selectedSource();
  const options = source ? source.devices.map((device,index)=>({
    value:index,
    label:(index+1)+'. '+(DEVICE_NAMES[device.type]||device.type)+' · x '+device.x.toFixed(1)+' · y '+device.y.toFixed(1)+' · '+(device.angle*180/Math.PI).toFixed(1)+'°'
  })) : [];
  setOptions(fields['cl-cf-device'],options,options.length?'Выбери устройство':'Нет устройств');
  runButton.disabled = !source || !options.length;
}
function refreshStepOptions() {
  const parameter = fields['cl-cf-parameter'].value || 'angle';
  const spec = PARAMETERS[parameter];
  setOptions(fields['cl-cf-step'],spec.steps.map(value=>({
    value,
    label:value+(parameter==='angle'?'°':' px')
  })),null);
}
function summaryStatus(result) {
  return result.status === 'won' ? 'ДОСТАВКА УСПЕШНА' : 'ДОСТАВКА НЕ УДАЛАСЬ';
}
function distanceText(value) {
  return Number.isFinite(value) ? Math.round(value)+' px до центра цели' : '—';
}
function outcomeMetric(result) {
  const impact = Number.isFinite(result.telemetry.lastImpactSpeed) ? Math.round(result.telemetry.lastImpactSpeed)+' px/s' : '—';
  const peak = Number.isFinite(result.telemetry.peakSpeed) ? Math.round(result.telemetry.peakSpeed)+' px/s пик' : '';
  return result.status==='won' ? result.timeSeconds.toFixed(2)+' с · '+impact+' · '+peak : distanceText(distanceToGoal(result))+' · '+impact;
}
function drawChart(study) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#050c13'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#8bb9ca18'; ctx.lineWidth=1;
  for(let x=0;x<=1000;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,560);ctx.stroke();}
  for(let y=0;y<=560;y+=56){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke();}
  const runs = [];
  if (study && study.source.trajectory.length > 1) runs.push({label:'ФАКТ',trace:study.source.trajectory,color:'#dce8ef',width:3});
  if (study) {
    for (const variant of study.variants) runs.push({
      label:variant.label,trace:variant.result.trajectory,
      color:plotColors[String(variant.offset)]||'#7bbdff',
      width:variant.offset===study.bestOffset?3.3:1.7
    });
  }
  for (const item of runs) {
    if (!item.trace || item.trace.length < 2) continue;
    ctx.beginPath(); ctx.strokeStyle=item.color; ctx.lineWidth=item.width; ctx.lineJoin='round';ctx.lineCap='round';
    ctx.globalAlpha=item.label==='ФАКТ'?0.88:0.76;
    for(let i=0;i<item.trace.length;i++){
      const point=item.trace[i];
      const x=Math.max(0,Math.min(1000,point.x));
      const y=Math.max(0,Math.min(560,point.y));
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();ctx.globalAlpha=1;
  }
  if (study && study.baseline.goal) {
    const goal=study.baseline.goal;
    ctx.strokeStyle='#e9ba6a';ctx.lineWidth=2;ctx.setLineDash([5,5]);
    ctx.strokeRect(goal.x,goal.y,goal.w,22);ctx.setLineDash([]);
  }
}
function renderStudy(study) {
  currentStudy = study;
  if (!study) {
    setKpi('determinism','—','Запусти два одинаковых virtual twin');
    setKpi('fit','—','Сравнение появится после прогона');
    setKpi('best','—','Пока нет вариантов');
    setKpi('runs','0','Ожидание исследования');
    resultList.replaceChildren(el('p','cl-cf-status','Выбери сохранённый запуск, устройство и параметр, затем запусти Foundry.'));
    drawChart(null);
    exportJsonButton.disabled=true;exportCsvButton.disabled=true;
    return;
  }
  const obs=study.observedVersusVirtual;
  setKpi('determinism',study.model.deterministic?'100%':'РАСХОЖДЕНИЕ',study.model.deterministic?'Twin A и Twin B имеют одинаковый fingerprint':'Одинаковая конфигурация дала разный fingerprint');
  setKpi('fit',obs.statusMatch===null?'НЕТ ДАННЫХ':obs.statusMatch?'ИСХОД СОВПАЛ':'ИСХОД РАЗЛИЧАЕТСЯ',
    obs.meanTrajectoryDeviationPx===null?'Для сравнения нужна записанная траектория':('Среднее расхождение траекторий: '+obs.meanTrajectoryDeviationPx.toFixed(1)+' px'));
  setKpi('best',study.bestOffset===0?'БАЗА':(study.bestOffset>0?'+':'')+study.bestOffset+' шага',
    'По правилу: доставка → время → близость к цели → удар');
  setKpi('runs','6','Две контрольные + четыре отличающиеся конфигурации');
  resultList.replaceChildren();
  for (const variant of study.variants) {
    const row=el('article','cl-cf-result'+(variant.offset===study.bestOffset?' best':''));
    const metric=el('div','cl-cf-result-label',variant.label);
    const info=el('div');
    info.append(el('strong','',summaryStatus(variant.result)));
    info.append(el('small','',variant.result.reason+' · '+variant.result.trajectory.length+' кадров · fingerprint '+variant.result.fingerprint));
    const stat=el('div','cl-cf-result-metric',outcomeMetric(variant.result));
    row.append(metric,info,stat);resultList.append(row);
  }
  drawChart(study);
  exportJsonButton.disabled=false;exportCsvButton.disabled=false;
}
function loadHistory() {
  try {
    const raw=JSON.parse(window.localStorage.getItem(HISTORY_KEY)||'[]');
    if(!Array.isArray(raw))return [];
    return raw.filter(item=>item&&typeof item.id==='string'&&Number.isFinite(Date.parse(item.createdAt))).slice(0,MAX_HISTORY);
  } catch {return [];}
}
function persistHistory() {
  try {window.localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,MAX_HISTORY)));return true;}
  catch {return false;}
}
function renderHistory() {
  historyList.replaceChildren();
  archiveCount.textContent=history.length+' / '+MAX_HISTORY;
  if(!history.length){historyList.append(el('p','cl-cf-status','Локальных историй пока нет.'));return;}
  for (const item of history) {
    const row=el('article','cl-cf-history-row');
    const details=el('div');
    details.append(el('strong','',item.levelTitle+' · '+PARAMETERS[item.parameter]?.label+' · '+(item.deterministic?'детерминизм подтверждён':'расхождение контроля')));
    details.append(el('small','',new Date(item.createdAt).toLocaleString()+' · '+item.bestStatus+' · fingerprint '+item.id));
    const load=el('button','','Выбрать источник');
    load.type='button';load.addEventListener('click',()=>{fields['cl-cf-source'].value=item.sourceId;refreshDevices();setStatus('Источник исследования выбран заново. Для нового virtual sweep запусти расчёт ещё раз.');});
    row.append(details,load);historyList.append(row);
  }
}
function exportJson() {
  if(!currentStudy)return;
  const output={schema:SCHEMA,schemaVersion:1,exportedAt:new Date().toISOString(),localOnly:true,uploaded:false,study:currentStudy};
  const value=JSON.stringify(output,null,2);
  if(value.length>MAX_EXPORT_BYTES*8){setStatus('Отчёт слишком велик для одного экспорта.','error');return;}
  download('cascade-lab-counterfactual-'+currentStudy.source.levelId+'-'+currentStudy.reportFingerprint+'.json',value,'application/json;charset=utf-8');
  setStatus('JSON-отчёт сохранён на твоё устройство. Виртуальные запуски не добавлены в историю игры.');
}
function csvCell(value) {
  const text=String(value==null?'':value);
  if(/^[\s]*[=+\-@]/.test(text))return "'" + text.replace(/'/g,"''");
  return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
}
function exportCsv() {
  if(!currentStudy)return;
  const rows=[['kind','offset','parameter','step','parameter_value','status','time_s','x_px','y_px','distance_to_goal_px','peak_speed_px_s','last_impact_speed_px_s','activations','trajectory_deviation_px','fingerprint']];
  rows.push(['observed', '', '', '', '',currentStudy.source.status,currentStudy.source.timeSeconds,'','','','','','','',currentStudy.source.id]);
  rows.push(['control-a','','','','',currentStudy.baseline.status,currentStudy.baseline.timeSeconds,currentStudy.baseline.position.x,currentStudy.baseline.position.y,distanceToGoal(currentStudy.baseline),currentStudy.baseline.telemetry.peakSpeed,currentStudy.baseline.telemetry.lastImpactSpeed,currentStudy.baseline.telemetry.activations,currentStudy.observedVersusVirtual.meanTrajectoryDeviationPx,currentStudy.baseline.fingerprint]);
  rows.push(['control-b','','','','',currentStudy.control.status,currentStudy.control.timeSeconds,currentStudy.control.position.x,currentStudy.control.position.y,distanceToGoal(currentStudy.control),currentStudy.control.telemetry.peakSpeed,currentStudy.control.telemetry.lastImpactSpeed,currentStudy.control.telemetry.activations,0,currentStudy.control.fingerprint]);
  for(const variant of currentStudy.variants)rows.push(['variant',variant.offset,variant.parameter,variant.step,variant.value,variant.result.status,variant.result.timeSeconds,variant.result.position.x,variant.result.position.y,distanceToGoal(variant.result),variant.result.telemetry.peakSpeed,variant.result.telemetry.lastImpactSpeed,variant.result.telemetry.activations,variant.trajectoryDeviationFromBase,variant.result.fingerprint]);
  download('cascade-lab-counterfactual-'+currentStudy.source.levelId+'.csv','\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  setStatus('CSV-отчёт построен. Контрольные и виртуальные варианты подписаны отдельно от фактической попытки.');
}
function download(filename,content,mime){
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.hidden=true;
  panel.append(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
runButton.addEventListener('click',()=>{
  const source=selectedSource();
  const deviceIndex=Number(fields['cl-cf-device'].value);
  if(!source){setStatus('Сначала выбери сохранённую попытку X-Ray.','error');return;}
  runButton.disabled=true;setStatus('Запускаю две контрольные симуляции и пять значений параметра…');
  try{
    const outcome=buildStudy(window.CASCADELAB026_ENGINE,source,{
      deviceIndex,parameter:fields['cl-cf-parameter'].value,step:Number(fields['cl-cf-step'].value)
    });
    if(!outcome.ok){setStatus(outcome.error,'error');return;}
    const study=outcome.study;
    history=[archiveSummary(study),...history.filter(item=>item.id!==study.reportFingerprint)].slice(0,MAX_HISTORY);
    persistHistory();renderHistory();renderStudy(study);
    const fit=study.observedVersusVirtual;
    setStatus('Готово: 6 виртуальных прогонов. Детерминизм '+(study.model.deterministic?'подтверждён':'не подтверждён')+
      '; среднее расхождение с фактической траекторией '+(fit.meanTrajectoryDeviationPx===null?'не вычислено':fit.meanTrajectoryDeviationPx.toFixed(2)+' px')+'. Данные локальные.');
  }catch(error){setStatus(clean(error&&error.message||'Не удалось выполнить виртуальный эксперимент.',220),'error');}
  finally{runButton.disabled=false;}
});
exportJsonButton.addEventListener('click',exportJson);
exportCsvButton.addEventListener('click',exportCsv);
clearButton.addEventListener('click',()=>{
  if(!window.confirm('Удалить локальную историю Counterfactual Foundry?'))return;
  history=[];persistHistory();renderHistory();setStatus('Локальная история Foundry очищена.');
});
fields['cl-cf-source'].addEventListener('change',()=>{refreshDevices();});
fields['cl-cf-parameter'].addEventListener('change',refreshStepOptions);
window.addEventListener('cascade-lab:run-finished',event=>{
  refreshSources(event.detail&&event.detail.levelId?undefined:undefined);
  setStatus('Новый игровой запуск доступен в X-Ray. Нажми Foundry, чтобы проверить его чертёж.');
});
const publicApi = Object.freeze({
  version:VERSION, schema:SCHEMA, parameters:PARAMETERS,
  normalizeSource, mutateBlueprint, trajectoryDeviation, rankVariants, buildStudy,
  getHistory:()=>history.slice(), exportJson
});
Object.defineProperty(window,'CASCADELAB026',{
  value:publicApi,configurable:false,enumerable:false,writable:false
});
history=loadHistory();
refreshStepOptions();
refreshSources();
renderHistory();
renderStudy(null);
})();
(() => {
'use strict';

const VERSION = '0.27.0';
const SCHEMA = 'osgard.cascade-lab.counterfactual-lab.v1';
const ARCHIVE_SCHEMA = 'osgard.cascade-lab.counterfactual-archive.v1';
const STORAGE_KEY = ARCHIVE_SCHEMA;
const MAX_STUDIES = 30;
const MAX_VARIANTS = 7;
const MAX_EXPORT_BYTES = 800 * 1024;
const TOOL_NAMES = Object.freeze({
  spring: 'Пружина', fan: 'Вентилятор', belt: 'Конвейер',
  magnet: 'Магнит', switch: 'Контакт', bumper: 'Отбойник'
});
const clean = (value, limit = 180) => String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const round = (value, digits = 3) => finite(value) ? Number(value.toFixed(digits)) : null;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const list = value => Array.isArray(value) ? value : [];

function angleOffsets(stepDegrees = 5) {
  const step = Number(stepDegrees);
  if (!Number.isFinite(step) || step < 1 || step > 10) throw new RangeError('Шаг угла должен быть от 1° до 10°.');
  const delta = round(step, 2);
  return [-3, -2, -1, 0, 1, 2, 3].map(multiplier => round(multiplier * delta, 2));
}

function safeScenarioSummary(raw, offsetDegrees) {
  if (!raw || typeof raw !== 'object' || !['won', 'lost'].includes(raw.status) ||
      !Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5 ||
      typeof raw.fingerprint !== 'string' || !Array.isArray(raw.trajectory) || raw.trajectory.length < 2) return null;
  return {
    schema: SCHEMA, engineVersion: clean(raw.engineVersion, 24),
    offsetDegrees: round(Number(offsetDegrees), 2),
    status: raw.status, reason: clean(raw.reason, 240),
    timeSeconds: round(raw.timeSeconds),
    deviceCount: Number.isInteger(raw.deviceCount) ? clamp(raw.deviceCount, 0, 12) : 0,
    gateOpen: raw.gateOpen === true,
    checkpointsReached: list(raw.checkpointsReached).slice(0, 20).map(value => clean(value, 80)),
    telemetry: {
      distance: round(raw.telemetry?.distance),
      peakSpeed: round(raw.telemetry?.peakSpeed),
      maxHeight: round(raw.telemetry?.maxHeight),
      impacts: Number.isInteger(raw.telemetry?.impacts) ? clamp(raw.telemetry.impacts, 0, 10000) : 0,
      contacts: Number.isInteger(raw.telemetry?.contacts) ? clamp(raw.telemetry.contacts, 0, 10000) : 0,
      activations: Number.isInteger(raw.telemetry?.activations) ? clamp(raw.telemetry.activations, 0, 10000) : 0,
      lastImpactSpeed: round(raw.telemetry?.lastImpactSpeed)
    },
    fingerprint: clean(raw.fingerprint, 48),
    trajectoryFrames: clamp(raw.trajectory.length, 0, 420),
    eventCount: clamp(list(raw.events).length, 0, 32)
  };
}

function analyzeSweep(rawVariants, controlReplay = null) {
  if (!Array.isArray(rawVariants) || rawVariants.length !== MAX_VARIANTS) {
    return { ok: false, error: 'Для анализа требуются ровно семь сценариев.' };
  }
  const variants = rawVariants.map(item => safeScenarioSummary(item && item.result || item, item && item.offsetDegrees));
  if (variants.some(item => !item)) return { ok: false, error: 'Один или несколько сценариев не прошли проверку структуры.' };
  variants.sort((a, b) => a.offsetDegrees - b.offsetDegrees);
  if (new Set(variants.map(item => item.offsetDegrees)).size !== MAX_VARIANTS || !variants.some(item => item.offsetDegrees === 0)) {
    return { ok: false, error: 'В наборе должны быть семь различных углов и базовый сценарий 0°.' };
  }
  const baseline = variants.find(item => item.offsetDegrees === 0);
  const baselineRepeatable = Boolean(controlReplay && typeof controlReplay.fingerprint === 'string' && controlReplay.fingerprint === baseline.fingerprint);
  for (let index = 0; index < variants.length; index++) {
    const neighbours = variants.slice(Math.max(0, index - 1), Math.min(variants.length, index + 2));
    variants[index].neighbourhood = {
      successes: neighbours.filter(item => item.status === 'won').length,
      tested: neighbours.length,
      ratePercent: Math.round(100 * neighbours.filter(item => item.status === 'won').length / neighbours.length)
    };
  }
  const alternate = variants.filter(item => item.offsetDegrees !== 0);
  const alternateSuccesses = alternate.filter(item => item.status === 'won').length;
  const robustRate = Math.round(100 * alternateSuccesses / Math.max(1, alternate.length));
  const candidates = variants.filter(item => item.status === 'won').slice().sort((a, b) =>
    b.neighbourhood.ratePercent - a.neighbourhood.ratePercent ||
    (a.telemetry.lastImpactSpeed ?? Infinity) - (b.telemetry.lastImpactSpeed ?? Infinity) ||
    (a.timeSeconds ?? Infinity) - (b.timeSeconds ?? Infinity) ||
    Math.abs(a.offsetDegrees) - Math.abs(b.offsetDegrees)
  );
  const recommended = candidates[0] || null;
  const fingerprints = new Set(variants.map(item => item.fingerprint));
  return {
    ok: true, schema: SCHEMA, variantCount: variants.length,
    baselineFingerprint: baseline.fingerprint,
    baselineRepeatable,
    uniqueFingerprints: fingerprints.size,
    robustness: {
      successes: alternateSuccesses, tested: alternate.length, ratePercent: robustRate,
      label: robustRate === 100 ? 'УСТОЙЧИВАЯ В ЭТОМ ДИАПАЗОНЕ' : robustRate >= 67 ? 'ЧАСТИЧНО УСТОЙЧИВАЯ' : robustRate >= 34 ? 'ЧУВСТВИТЕЛЬНАЯ' : 'ХРУПКАЯ В ЭТОМ ДИАПАЗОНЕ'
    },
    baseline: { status: baseline.status, timeSeconds: baseline.timeSeconds, fingerprint: baseline.fingerprint },
    recommendation: recommended ? {
      offsetDegrees: recommended.offsetDegrees, status: recommended.status,
      timeSeconds: recommended.timeSeconds, lastImpactSpeed: recommended.telemetry.lastImpactSpeed,
      localSuccessRatePercent: recommended.neighbourhood.ratePercent
    } : null,
    variants
  };
}

function cleanStoredStudy(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schema !== SCHEMA ||
      typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 100 ||
      !Number.isFinite(Date.parse(raw.createdAt)) || !Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5 ||
      !Array.isArray(raw.summary?.variants) || raw.summary.variants.length !== MAX_VARIANTS) return null;
  const summary = raw.summary;
  const sanitizedVariants = summary.variants.map(item => safeScenarioSummary(item, item?.offsetDegrees));
  if (sanitizedVariants.some(item => !item)) return null;
  const sanitizedAnalysis = analyzeSweep(summary.variants.map(item => ({ offsetDegrees: item.offsetDegrees, result: item })), { fingerprint: summary.baselineFingerprint });
  if (!sanitizedAnalysis.ok) return null;
  return {
    schema: SCHEMA, id: raw.id.trim(), createdAt: new Date(Date.parse(raw.createdAt)).toISOString(),
    levelId: raw.levelId, levelTitle: clean(raw.levelTitle || ('Протокол #' + raw.levelId), 120),
    toolIndex: Number.isInteger(raw.toolIndex) ? clamp(raw.toolIndex, 0, 11) : 0,
    toolType: TOOL_NAMES[raw.toolType] ? raw.toolType : 'spring',
    stepDegrees: Number.isFinite(raw.stepDegrees) ? clamp(raw.stepDegrees, 1, 10) : 5,
    originalStatus: raw.originalStatus === 'won' ? 'won' : 'lost',
    originalTimeSeconds: round(raw.originalTimeSeconds),
    summary: sanitizedAnalysis
  };
}

function validateArchive(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      raw.schema !== ARCHIVE_SCHEMA || raw.schemaVersion !== 1 || !Array.isArray(raw.studies)) {
    return { ok: false, error: 'Неизвестная схема Counterfactual Lab.' };
  }
  if (raw.studies.length > MAX_STUDIES) return { ok: false, error: 'Архив превышает лимит ' + MAX_STUDIES + ' исследований.' };
  if (JSON.stringify(raw).length > MAX_EXPORT_BYTES) return { ok: false, error: 'Архив превышает лимит 800 KiB.' };
  const studies = raw.studies.map(cleanStoredStudy);
  if (studies.some(study => !study)) return { ok: false, error: 'Запись архива повреждена или имеет неподдерживаемую структуру.' };
  const ids = new Set();
  for (const study of studies) {
    if (ids.has(study.id)) return { ok: false, error: 'Архив содержит повторяющиеся ID исследований.' };
    ids.add(study.id);
  }
  return { ok: true, archive: { schema: ARCHIVE_SCHEMA, schemaVersion: 1, studies } };
}

const pureApi = Object.freeze({
  version: VERSION, schema: SCHEMA, archiveSchema: ARCHIVE_SCHEMA,
  maxStudies: MAX_STUDIES, maxVariants: MAX_VARIANTS, maxExportBytes: MAX_EXPORT_BYTES,
  angleOffsets, analyzeSweep, cleanStoredStudy, validateArchive
});
if (typeof window === 'undefined' || !window.document) {
  globalThis.__CASCADELAB027_TEST__ = pureApi;
  return;
}
if (window.CASCADELAB027) return;
const engine = window.CASCADELAB027_SIMULATOR;
if (!engine || engine.version !== VERSION || typeof engine.simulate !== 'function') {
  return;
}

const css = [
  '.cl-counterfactual{margin:18px 0 22px;padding:clamp(14px,2vw,22px);border:1px solid #e9ba6a42;border-radius:16px;background:radial-gradient(ellipse at 88% 0%,#b080261c,transparent 44%),linear-gradient(145deg,#0d1823,#050c13);color:#e8f1f6;box-shadow:0 16px 45px #0002,inset 0 1px #ffffff08}',
  '.cl-cf-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:11px}.cl-cf-kicker{margin:0;color:#e9c278;font:8px ui-monospace,monospace;letter-spacing:.16em}.cl-cf-badge{padding:5px 8px;border:1px solid #e9ba6a46;border-radius:5px;color:#e9ca8a;font:8px ui-monospace,monospace}',
  '.cl-counterfactual h3{margin:0;color:#f8fafb;font:400 clamp(23px,3vw,34px)/1.1 Georgia,serif;letter-spacing:-.025em}.cl-cf-sub{margin:8px 0 13px;color:#9bb0bf;font-size:10px;line-height:1.7}.cl-cf-controls{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(120px,.7fr) auto;gap:8px;align-items:end}',
  '.cl-cf-field{display:grid;gap:5px;min-width:0}.cl-cf-field label{color:#81a0b1;font:8px ui-monospace,monospace;letter-spacing:.05em}.cl-cf-input{width:100%;min-width:0;min-height:38px;padding:8px 10px;border:1px solid #84bfd22e;border-radius:8px;background:#040e17;color:#e6f1f7;font:10px system-ui,sans-serif}.cl-cf-input:focus-visible,.cl-cf-button:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}',
  '.cl-cf-button{min-height:38px;padding:8px 11px;border:1px solid #e9ba6a55;border-radius:8px;background:linear-gradient(120deg,#f5d28d,#d89b42);color:#211808;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-cf-button.secondary{border-color:#7cc9e638;background:#0b2432;color:#b9eaff}.cl-cf-button.danger{border-color:#ff9b8b4a;background:#25151a;color:#ffb6a5}.cl-cf-button:disabled{opacity:.45;cursor:not-allowed}',
  '.cl-cf-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:11px}.cl-cf-metric{padding:9px;border:1px solid #87b9cc24;border-radius:9px;background:#07131d}.cl-cf-metric small{display:block;color:#6e91a2;font:7px ui-monospace,monospace;letter-spacing:.08em}.cl-cf-metric b{display:block;margin-top:5px;color:#f3f7f9;font:600 17px Georgia,serif}.cl-cf-metric span{display:block;margin-top:3px;color:#809bab;font-size:8px;line-height:1.5}',
  '.cl-cf-table-wrap{margin-top:10px;overflow-x:auto;border:1px solid #84b6c51f;border-radius:9px}.cl-cf-table{width:100%;border-collapse:collapse;min-width:590px;font:9px/1.45 ui-monospace,monospace}.cl-cf-table th{padding:8px;text-align:left;color:#86a9bb;background:#081722;border-bottom:1px solid #83b8cc25;font-weight:500}.cl-cf-table td{padding:8px;border-bottom:1px solid #83b8cc15;color:#c1d3dc}.cl-cf-table tr:last-child td{border-bottom:0}.cl-cf-table tr.is-winner td{background:#2d2514;color:#ffe1a3}.cl-cf-table tr.is-base td{box-shadow:inset 0 1px #68d7ff35,inset 0 -1px #68d7ff35}.cl-cf-outcome{display:inline-block;padding:3px 5px;border:1px solid #7fc7ad35;border-radius:4px;color:#91e3c5}.cl-cf-outcome.is-fail{border-color:#ff9b8b45;color:#ffb1a4}.cl-cf-detail{display:block;margin-top:4px;color:#7894a3;font-size:8px;max-width:300px;white-space:normal;overflow-wrap:anywhere}',
  '.cl-cf-recommendation{margin-top:9px;padding:11px 12px;border-left:2px solid #e9ba6a;border-radius:0 8px 8px 0;background:#e9ba6a0b}.cl-cf-recommendation small{display:block;color:#c6a568;font:7px ui-monospace,monospace;letter-spacing:.1em}.cl-cf-recommendation p{margin:5px 0 0;color:#e7f0f4;font-size:10px;line-height:1.6}.cl-cf-status{min-height:22px;margin:9px 0 0;color:#8bd7ef;font-size:9px;line-height:1.6}.cl-cf-status[data-kind=error]{color:#ffaca2}.cl-cf-history{display:grid;gap:6px;margin-top:10px}.cl-cf-history-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px;border:1px solid #83b8cc1c;border-radius:8px;background:#07131c}.cl-cf-history-row strong{display:block;color:#d4e4ec;font-size:9px}.cl-cf-history-row small{display:block;margin-top:4px;color:#7393a4;font:7px/1.5 ui-monospace,monospace}.cl-cf-history-empty{padding:12px;border:1px dashed #83b8cc2b;border-radius:8px;color:#7896a4;font-size:9px;line-height:1.6}.cl-cf-foot{margin:9px 0 0;padding-top:9px;border-top:1px solid #83b8cc1c;color:#637f8e;font:7px/1.6 ui-monospace,monospace}',
  '@media(max-width:650px){.cl-counterfactual{padding:13px;border-radius:12px}.cl-cf-controls{grid-template-columns:1fr 1fr}.cl-cf-controls .cl-cf-field:first-child{grid-column:1/-1}.cl-cf-controls .cl-cf-button{grid-column:1/-1;min-height:43px}.cl-cf-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-cf-history-row{grid-template-columns:1fr}.cl-cf-history-row .cl-cf-actions{justify-content:flex-start}}',
  '@media(prefers-reduced-motion:reduce){.cl-cf-button{animation:none!important;transition:none!important}}'
].join('');
const style = document.createElement('style');
style.dataset.cascadeLabCounterfactual = VERSION;
style.textContent = css;
document.head.append(style);

const make = (tag, cls, value) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (value !== undefined) node.textContent = String(value);
  return node;
};
const panel = make('section', 'cl-counterfactual');
panel.setAttribute('aria-labelledby', 'cl-cf-title');
const header = make('div', 'cl-cf-head');
header.append(make('p', 'cl-cf-kicker', 'CASCADE LAB / COUNTERFACTUAL TWIN'));
header.append(make('span', 'cl-cf-badge', 'ENGINE ' + VERSION));
const heading = make('h3', '', 'Проверь конструкцию до следующего запуска');
heading.id = 'cl-cf-title';
const intro = make('p', 'cl-cf-sub', 'Семь виртуальных сценариев повторно проходят через текущий физический движок с фиксированным шагом 1/120 с. Меняется только угол одного устройства. Проверка остаётся в браузере и не меняет твою сохранённую схему.');
panel.append(header, heading, intro);

const controls = make('div', 'cl-cf-controls');
const deviceField = make('div', 'cl-cf-field');
deviceField.append(make('label', '', 'УСТРОЙСТВО ДЛЯ ПРОВЕРКИ'));
const deviceSelect = document.createElement('select');
deviceSelect.className = 'cl-cf-input';
deviceSelect.setAttribute('aria-label', 'Выбрать устройство для анализа');
deviceField.append(deviceSelect);
const spreadField = make('div', 'cl-cf-field');
spreadField.append(make('label', '', 'ШАГ УГЛА'));
const spreadSelect = document.createElement('select');
spreadSelect.className = 'cl-cf-input';
spreadSelect.setAttribute('aria-label', 'Шаг изменения угла');
for (const [value, label] of [['2','±2°'],['5','±5°'],['10','±10°']) {
  const option = document.createElement('option'); option.value = value; option.textContent = label; spreadSelect.append(option);
}
spreadSelect.value = '5';
spreadField.append(spreadSelect);
const runButton = make('button', 'cl-cf-button', 'Запустить 7 сценариев');
runButton.type = 'button'; runButton.disabled = true;
controls.append(deviceField, spreadField, runButton);
panel.append(controls);

const metrics = make('div', 'cl-cf-metrics');
const metricNodes = {};
for (const key of ['УСТОЙЧИВОСТЬ','УСПЕХИ УГЛОВ','ПОВТОР БАЗЫ','ЛУЧШИЙ УГОЛ']) {
  const card = make('div', 'cl-cf-metric');
  card.append(make('small', '', key));
  const value = make('b', '', '—'); card.append(value);
  const hint = make('span', '', 'Ожидание анализа'); card.append(hint);
  metrics.append(card); metricNodes[key] = { value, hint };
}
panel.append(metrics);
const tableWrap = make('div', 'cl-cf-table-wrap');
const table = document.createElement('table');
table.className = 'cl-cf-table';
const thead = document.createElement('thead');
const headRow = document.createElement('tr');
for (const label of ['СМЕЩЕНИЕ','ИСХОД','ВРЕМЯ','ПИК СКОРОСТИ','УДАР / ОГОВОРКА']) headRow.append(make('th', '', label));
thead.append(headRow);
const tbody = document.createElement('tbody');
table.append(thead, tbody); tableWrap.append(table); panel.append(tableWrap);

const rec = make('div', 'cl-cf-recommendation');
rec.append(make('small', '', 'ВЫВОД ПО РЕЗУЛЬТАТАМ МОДЕЛИ'));
const recommendation = make('p', '', 'Заверши обычный запуск с установленными устройствами. Схема появится здесь автоматически.');
rec.append(recommendation); panel.append(rec);

const toolbar = make('div', 'cl-cf-controls');
const exportJson = make('button', 'cl-cf-button secondary', 'Экспорт отчёта JSON');
exportJson.type = 'button'; exportJson.disabled = true;
const exportCsv = make('button', 'cl-cf-button secondary', 'Экспорт таблицы CSV');
exportCsv.type = 'button'; exportCsv.disabled = true;
toolbar.append(exportJson, exportCsv); panel.append(toolbar);

const historyHeading = make('p', 'cl-cf-kicker', 'ЛОКАЛЬНАЯ ИСТОРИЯ · ПОСЛЕДНИЕ ИССЛЕДОВАНИЯ');
const historyList = make('div', 'cl-cf-history');
panel.append(historyHeading, historyList);
const status = make('p', 'cl-cf-status');
status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); panel.append(status);
panel.append(make('p', 'cl-cf-foot', 'Модель основана на текущих правилах CASCADE LAB, а не на реальных инженерных измерениях. Фиксированный шаг делает повтор внутри этого билда проверяемым; fingerprint — контроль воспроизводимости, не цифровая подпись. Данные не передаются в сеть.'));

const insertionPoint = document.querySelector('.cl-engineering') || document.querySelector('.cl-xray') || document.querySelector('.cl-hypothesis');
const footer = document.querySelector('.app-footer') || document.querySelector('footer');
if (insertionPoint && typeof insertionPoint.after === 'function') insertionPoint.after(panel);
else if (footer && typeof footer.before === 'function') footer.before(panel);
else return;

let currentRun = null;
let latestReport = null;
let studies = loadStudies();
function loadStudies() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw) return [];
    const checked = validateArchive(raw);
    return checked.ok ? checked.archive.studies.slice().sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, MAX_STUDIES) : [];
  } catch { return []; }
}
function persistStudies() {
  studies = studies.slice().sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, MAX_STUDIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: ARCHIVE_SCHEMA, schemaVersion: 1, exportedAt: new Date().toISOString(), studies }));
    return true;
  } catch { return false; }
}
function normalizeContext(raw) {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(Number(raw.levelId)) || Number(raw.levelId) < 1 || Number(raw.levelId) > 5) return null;
  const devices = list(raw.devices).filter(d => d && TOOL_NAMES[d.type] && finite(d.x) && finite(d.y) && finite(d.angle))
    .slice(0, 12).map(d => ({ type: d.type, x: d.x, y: d.y, angle: d.angle }));
  return {
    id: clean(raw.id || 'latest-run', 90), levelId: Number(raw.levelId),
    levelTitle: clean(raw.levelTitle || ('Протокол #' + raw.levelId), 120),
    status: raw.status === 'won' ? 'won' : 'lost', timeSeconds: round(raw.timeSeconds),
    deviceCount: devices.length, devices, trajectory: list(raw.trajectory).slice(0, 420)
  };
}
function updateDeviceOptions() {
  const prior = deviceSelect.value;
  deviceSelect.replaceChildren();
  for (let index = 0; index < (currentRun?.devices.length || 0); index++) {
    const device = currentRun.devices[index];
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = (index + 1) + '. ' + TOOL_NAMES[device.type] + ' · x ' + Math.round(device.x) + ' · y ' + Math.round(device.y);
    deviceSelect.append(option);
  }
  if ([...deviceSelect.options].some(option => option.value === prior)) deviceSelect.value = prior;
  runButton.disabled = !currentRun || !currentRun.devices.length || !engine || !deviceSelect.value && deviceSelect.options.length === 0;
}
function showEmptyRows(message) {
  tbody.replaceChildren();
  const row = document.createElement('tr'), cell = make('td', '', message);
  cell.colSpan = 5; row.append(cell); tbody.append(row);
}
function renderHistory() {
  historyList.replaceChildren();
  if (!studies.length) {
    historyList.append(make('div', 'cl-cf-history-empty', 'История появится после первого анализа. Записи хранятся только на этом устройстве.'));
    return;
  }
  for (const study of studies.slice(0, 8)) {
    const row = make('article', 'cl-cf-history-row');
    const info = make('div');
    info.append(make('strong', '', study.levelTitle + ' · ' + (study.summary.robustness?.ratePercent ?? 0) + '% устойчивости'));
    info.append(make('small', '', new Date(study.createdAt).toLocaleString() + ' · ' + study.toolType + ' · ' + study.stepDegrees + '° · ' + (study.summary.baselineRepeatable ? 'repeat PASS' : 'repeat CHECK')));
    const actions = make('div', 'cl-cf-actions');
    const view = make('button', 'cl-cf-button secondary', 'Показать');
    view.type = 'button'; view.addEventListener('click', () => { latestReport = study; renderReport(study.summary); status.textContent = 'Открыта сохранённая сводка. Полные кадры доступны только в JSON-экспорте текущего анализа.'; });
    actions.append(view); row.append(info, actions); historyList.append(row);
  }
}
function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.hidden = true;
  panel.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function renderReport(report) {
  if (!report || !Array.isArray(report.variants)) return;
  latestReport = report;
  const successCount = report.variants.filter(item => item.status === 'won').length;
  metricNodes['УСТОЙЧИВОСТЬ'].value.textContent = (report.robustness?.ratePercent ?? 0) + '%';
  metricNodes['УСТОЙЧИВОСТЬ'].hint.textContent = report.robustness?.label || 'По шести угловым отклонениям';
  metricNodes['УСПЕХИ УГЛОВ'].value.textContent = successCount + ' / ' + report.variants.length;
  metricNodes['УСПЕХИ УГЛОВ'].hint.textContent = 'Все сценарии, включая 0°';
  metricNodes['ПОВТОР БАЗЫ'].value.textContent = report.baselineRepeatable ? 'PASS' : 'CHECK';
  metricNodes['ПОВТОР БАЗЫ'].hint.textContent = report.baselineRepeatable ? 'Идентичный fingerprint' : 'Результат отличается';
  metricNodes['ЛУЧШИЙ УГОЛ'].value.textContent = report.recommendation ? ((report.recommendation.offsetDegrees > 0 ? '+' : '') + report.recommendation.offsetDegrees + '°') : '—';
  metricNodes['ЛУЧШИЙ УГОЛ'].hint.textContent = report.recommendation ? 'Успех с локальной устойчивостью ' + report.recommendation.localSuccessRatePercent + '%' : 'Нет успешной конфигурации';
  tbody.replaceChildren();
  for (const item of report.variants) {
    const row = document.createElement('tr');
    if (report.recommendation && item.offsetDegrees === report.recommendation.offsetDegrees) row.classList.add('is-winner');
    if (item.offsetDegrees === 0) row.classList.add('is-base');
    const values = [
      (item.offsetDegrees > 0 ? '+' : '') + item.offsetDegrees + '°',
      item.status === 'won' ? 'ДОСТАВКА' : 'ОТКАЗ',
      finite(item.timeSeconds) ? item.timeSeconds.toFixed(3) + ' с' : '—',
      finite(item.telemetry?.peakSpeed) ? Math.round(item.telemetry.peakSpeed) + ' px/s' : '—',
      (finite(item.telemetry?.lastImpactSpeed) ? Math.round(item.telemetry.lastImpactSpeed) + ' px/s' : '—') + (item.reason ? ' · ' + item.reason : '')
    ];
    values.forEach((value,index) => row.append(make('td', '', value)));
    const stateCell = row.children[1]; stateCell.textContent = '';
    stateCell.append(make('span', 'cl-cf-outcome' + (item.status === 'lost' ? ' is-fail' : ''), item.status === 'won' ? 'ДОСТАВКА' : 'ОТКАЗ'));
    stateCell.append(make('small', 'cl-cf-detail', item.fingerprint));
    tbody.append(row);
  }
  const base = report.variants.find(item => item.offsetDegrees === 0);
  if (!report.recommendation) {
    recommendation.textContent = 'Ни один из семи углов не обеспечил доставку. Не делай случайную перестройку: просмотри журнал событий, затем измени только один параметр в следующем эксперименте.';
  } else {
    const best = report.recommendation;
    const delta = best.offsetDegrees === 0 ? 'Текущий угол' : 'Поворот на ' + (best.offsetDegrees > 0 ? '+' : '') + best.offsetDegrees + '°';
    recommendation.textContent = delta + ' — лучший проверенный кандидат в этом диапазоне: доставка за ' + best.timeSeconds.toFixed(3) + ' с; локальный успех соседних углов ' + best.localSuccessRatePercent + '%. ' +
      (report.baselineRepeatable ? 'Два одинаковых виртуальных контрольных запуска дали совпадающий fingerprint.' : 'Повтор базы отличается: сначала исследуй воспроизводимость. ') +
      'Это результат модели текущей версии игры, не доказательство поведения реального устройства.';
  }
  exportJson.disabled = false; exportCsv.disabled = false;
}
function runSweep() {
  if (!currentRun || !currentRun.devices.length) { status.dataset.kind = 'error'; status.textContent = 'Сначала заверши игровой запуск, где установлено хотя бы одно устройство.'; return; }
  const deviceIndex = Number(deviceSelect.value);
  if (!Number.isInteger(deviceIndex) || !currentRun.devices[deviceIndex]) { status.dataset.kind = 'error'; status.textContent = 'Выбери действующее устройство из схемы.'; return; }
  runButton.disabled = true; exportJson.disabled = true; exportCsv.disabled = true;
  runButton.textContent = 'Вычисляю 7 сценариев…';
  const stepDegrees = Number(spreadSelect.value);
  const offsets = angleOffsets(stepDegrees);
  const sourceDevices = currentRun.devices.map(device => ({ ...device }));
  const variants = [];
  let controlReplay = null;
  try {
    for (const offsetDegrees of offsets) {
      const testDevices = sourceDevices.map((device,index) => index === deviceIndex
        ? { ...device, angle: device.angle + offsetDegrees * Math.PI / 180 }
        : { ...device });
      const result = engine.simulate({ levelId: currentRun.levelId, devices: testDevices });
      variants.push({ offsetDegrees, result });
    }
    controlReplay = engine.simulate({ levelId: currentRun.levelId, devices: sourceDevices });
    const summary = analyzeSweep(variants, controlReplay);
    if (!summary.ok) throw new Error(summary.error);
    const chosen = sourceDevices[deviceIndex];
    const report = {
      schema: SCHEMA, id: 'cfl-' + Date.now().toString(36) + '-' + summary.baselineFingerprint.toLowerCase(),
      createdAt: new Date().toISOString(), levelId: currentRun.levelId, levelTitle: currentRun.levelTitle,
      toolIndex: deviceIndex, toolType: chosen.type, stepDegrees,
      originalStatus: currentRun.status, originalTimeSeconds: currentRun.timeSeconds,
      originalRunId: currentRun.id,
      model: { name: 'CASCADE LAB PhysicsWorld', version: engine.version, fixedStepSeconds: engine.fixedStep, controlRepeatFingerprint: controlReplay.fingerprint },
      summary, variants: variants.map((item,index) => ({ offsetDegrees: item.offsetDegrees, result: item.result }))
    };
    latestReport = report;
    const study = cleanStoredStudy({
      schema: SCHEMA, id: report.id, createdAt: report.createdAt,
      levelId: report.levelId, levelTitle: report.levelTitle,
      toolIndex: deviceIndex, toolType: chosen.type, stepDegrees,
      originalStatus: currentRun.status, originalTimeSeconds: currentRun.timeSeconds,
      summary
    });
    if (study) {
      studies = [study, ...studies.filter(item => item.id !== study.id)].slice(0, MAX_STUDIES);
      if (!persistStudies()) { status.dataset.kind = 'error'; status.textContent = 'Анализ завершён, но браузер запретил локальное сохранение истории.'; }
      renderHistory();
    }
    renderReport(report.summary);
    status.dataset.kind = 'success';
    status.textContent = 'PASS: 7 угловых сценариев и повтор базы рассчитаны тем же фиксированным физическим движком. Запись осталась в этом браузере.';
  } catch (error) {
    status.dataset.kind = 'error';
    status.textContent = 'Анализ остановлен: ' + clean(error && error.message || 'ошибка симулятора', 220);
  } finally {
    runButton.disabled = !currentRun || !currentRun.devices.length;
    runButton.textContent = 'Запустить 7 сценариев';
    if (latestReport && latestReport.summary) { exportJson.disabled = false; exportCsv.disabled = false; }
  }
}
function exportCurrentJson() {
  if (!latestReport || !Array.isArray(latestReport.variants)) return;
  const out = { ...latestReport, exportedAt: new Date().toISOString(), privacy: { localDownloadOnly: true, uploaded: false, personalDataIncluded: false }, limitations: 'Counterfactual runs use the current in-game PhysicsWorld implementation at fixed 1/120 s steps; they are not real-world engineering predictions or cryptographic attestations.' };
  const payload = JSON.stringify(out, null, 2);
  if (payload.length > MAX_EXPORT_BYTES) { status.dataset.kind = 'error'; status.textContent = 'Отчёт больше 800 KiB и не был экспортирован.'; return; }
  download('cascade-lab-counterfactual-level-' + currentRun?.levelId + '.json', payload, 'application/json;charset=utf-8');
  status.textContent = 'JSON-отчёт сохранён. Данные не отправлялись в сеть.';
}
function exportCurrentCsv() {
  if (!latestReport || !Array.isArray(latestReport.variants)) return;
  const rows = [['offset_degrees','outcome','time_seconds','device_count','gate_open','peak_speed_px_s','last_impact_speed_px_s','contacts','impacts','activations','distance_px','fingerprint','reason']];
  for (const item of latestReport.variants) {
    const r = item.result;
    rows.push([item.offsetDegrees,r.status,r.timeSeconds,r.deviceCount,r.gateOpen,r.telemetry.peakSpeed,r.telemetry.lastImpactSpeed,r.telemetry.contacts,r.telemetry.impacts,r.telemetry.activations,r.telemetry.distance,r.fingerprint,r.reason]);
  }
  download('cascade-lab-counterfactual-level-' + currentRun?.levelId + '.csv', '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n', 'text/csv;charset=utf-8');
  status.textContent = 'CSV-таблица сохранена. Данные не отправлялись в сеть.';
}
function acceptRun(raw) {
  const ctx = normalizeContext(raw);
  if (!ctx) return;
  currentRun = ctx;
  updateDeviceOptions();
  status.dataset.kind = 'info';
  status.textContent = ctx.devices.length
    ? 'Загружен запуск «' + ctx.levelTitle + '». Выбери устройство и исследуй семь соседних углов.'
    : 'В этой схеме нет устройств для углового анализа. Установи устройство и пройди уровень.';
}
deviceSelect.addEventListener('change', () => { runButton.disabled = !currentRun || !currentRun.devices.length || !deviceSelect.value && deviceSelect.options.length === 0; });
runButton.addEventListener('click', runSweep);
exportJson.addEventListener('click', exportCurrentJson);
exportCsv.addEventListener('click', exportCurrentCsv);
window.addEventListener('cascade-lab:run-finished', event => acceptRun(event.detail || {}));
if (window.CASCADELAB022 && typeof window.CASCADELAB022.getRuns === 'function') {
  const previousRuns = window.CASCADELAB022.getRuns();
  if (previousRuns.length) acceptRun(previousRuns[0]);
}
renderHistory();
showEmptyRows('Заверши обычный запуск, чтобы запустить контрфактическую лабораторию.');
Object.defineProperty(window, 'CASCADELAB027', {
  value: Object.freeze({ version: VERSION, schema: SCHEMA, angleOffsets, analyzeSweep, getStudies: () => studies.map(study => ({ ...study })), getLatestReport: () => latestReport }),
  configurable: false, enumerable: false, writable: false
});
})();
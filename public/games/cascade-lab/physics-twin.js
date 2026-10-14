(() => {
'use strict';

const VERSION = '0.26.0';
const SCHEMA = 'osgard.cascade-lab.simulation-twin-workbench.v1';
const MAX_EXPORT_BYTES = 1024 * 1024;
const runtime = typeof window !== 'undefined' ? window.CASCADELAB026_RUNTIME : null;
if (!runtime || runtime.version !== VERSION || typeof runtime.angleSweep !== 'function' || typeof runtime.runControl !== 'function') return;
if (window.CASCADELAB026_WORKBENCH) return;

const clean = (value, max = 240) => String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = String(text);
  return node;
};
const format = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits).replace('.', ',') : '—';
const timeNow = () => new Date().toISOString();
const css = [
  '#cascade-simulation-twin{margin:18px 0 26px;padding:clamp(14px,2.2vw,26px);border:1px solid #78cfff48;border-radius:18px;background:radial-gradient(ellipse at 6% 0%,#2fabea13,transparent 40%),radial-gradient(ellipse at 95% 0%,#ab89ff16,transparent 40%),linear-gradient(145deg,#091724,#050d15);color:#e9f4fb;box-shadow:0 18px 46px #0004}#cascade-simulation-twin *{box-sizing:border-box}',
  '.cst-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.cst-kicker{margin:0;color:#8bdfff;font:8px ui-monospace,monospace;letter-spacing:.18em}.cst-badge{padding:5px 8px;border:1px solid #78cfff4d;border-radius:5px;color:#b7e9ff;font:8px ui-monospace,monospace}.cst-title{margin:10px 0 8px;color:#f4f9fd;font:400 clamp(25px,3vw,38px)/1.08 Georgia,serif;letter-spacing:-.025em}.cst-lead{max-width:900px;margin:0 0 14px;color:#a6bdcb;font-size:10px;line-height:1.75}.cst-rule{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border-left:2px solid #e9ba6a;border-radius:0 8px 8px 0;background:#e9ba6a0b;color:#dbe7ed;font-size:9px;line-height:1.65}.cst-rule strong{color:#f4d79e}',
  '.cst-toolbar{display:flex;align-items:end;gap:8px;flex-wrap:wrap;margin-top:12px}.cst-field{display:grid;gap:6px;min-width:130px;flex:1}.cst-field label{color:#7f9baa;font:8px ui-monospace,monospace;letter-spacing:.08em}.cst-select{width:100%;min-height:39px;padding:8px 10px;border:1px solid #8cc9e134;border-radius:8px;background:#06131e;color:#e4f2f9;font:10px system-ui,sans-serif}.cst-button{min-height:39px;padding:9px 12px;border:1px solid #81cde648;border-radius:8px;background:#0a2534;color:#c8edff;font:750 9px ui-monospace,monospace;cursor:pointer}.cst-button.primary{border-color:#9be3ff;background:linear-gradient(125deg,#a6e7ff,#65bde7);color:#06202d}.cst-button:disabled{opacity:.4;cursor:not-allowed}.cst-button:focus-visible,.cst-select:focus-visible{outline:2px solid #b2eeff;outline-offset:3px}',
  '.cst-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:12px}.cst-metric{min-width:0;padding:10px;border:1px solid #87bdd126;border-radius:9px;background:#06121c}.cst-metric span{display:block;color:#7194a7;font:7px ui-monospace,monospace;letter-spacing:.05em}.cst-metric b{display:block;margin-top:6px;color:#eff8fc;font:500 17px Georgia,serif;overflow-wrap:anywhere}.cst-canvas-shell{margin-top:12px;padding:9px;border:1px solid #81bdd22b;border-radius:11px;background:#030b12}.cst-canvas-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 8px;color:#88afc1;font:8px ui-monospace,monospace;letter-spacing:.08em}.cst-canvas{display:block;width:100%;height:auto;aspect-ratio:25/14;border:1px solid #7cbbd51c;border-radius:6px;background:#06101a}.cst-legend{display:flex;gap:7px 12px;flex-wrap:wrap;margin-top:8px}.cst-legend span{display:inline-flex;gap:5px;align-items:center;color:#8ea9b8;font:8px ui-monospace,monospace}.cst-swatch{display:inline-block;width:14px;height:3px;border-radius:2px}.cst-table-wrap{overflow-x:auto;margin-top:11px;border:1px solid #87bdd128;border-radius:9px}.cst-table{width:100%;border-collapse:collapse;font:9px/1.5 ui-monospace,monospace}.cst-table th,.cst-table td{padding:8px 9px;border-bottom:1px solid #82afc41c;text-align:left;white-space:nowrap}.cst-table th{color:#80a4b7;background:#091923;font-size:7px;letter-spacing:.08em}.cst-table td{color:#c0d5e1}.cst-table tr:last-child td{border-bottom:0}.cst-state-won{color:#85e6c1!important}.cst-state-lost{color:#ffb4a7!important}.cst-status{min-height:22px;margin:11px 0 0;color:#8cdfff;font-size:9px;line-height:1.6;overflow-wrap:anywhere}.cst-status[data-kind=error]{color:#ffb0a7}.cst-foot{margin:8px 0 0;padding-top:9px;border-top:1px solid #8ab9ca1d;color:#607e90;font:7px/1.7 ui-monospace,monospace}.cst-hidden{display:none!important}',
  '@media(max-width:760px){.cst-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.cst-toolbar{display:grid;grid-template-columns:1fr 1fr;align-items:stretch}.cst-field{min-width:0}.cst-field:first-child{grid-column:1/-1}.cst-button{width:100%;min-height:43px}.cst-table th,.cst-table td{padding:7px 8px}}@media(prefers-reduced-motion:reduce){#cascade-simulation-twin *{animation:none!important;transition:none!important}}'
].join('');
const style = document.createElement('style');
style.dataset.cascadeLabSimulationTwin = VERSION;
style.textContent = css;
document.head.append(style);

const panel = el('section', '');
panel.id = 'cascade-simulation-twin';
panel.setAttribute('aria-labelledby', 'cst-title');
const head = el('div', 'cst-head');
head.append(el('p', 'cst-kicker', 'CASCADE LAB / SIMULATION TWIN'));
head.append(el('span', 'cst-badge', 'ENGINE ' + VERSION));
const title = el('h3', 'cst-title', 'Проверь физику до следующей перестройки.');
title.id = 'cst-title';
const lead = el('p', 'cst-lead', 'Simulation Twin запускает копию текущего уровня через тот же PhysicsWorld и фиксированный шаг 1/120 секунды. Он может подтвердить повторяемость вычисления и измерить чувствительность к одному параметру; это не доказывает, что игровая физика полностью соответствует реальному миру.');
const rule = el('div', 'cst-rule');
rule.append(el('strong', '', 'КОНТРОЛИРУЕМЫЙ ТЕСТ'), el('span', '', 'Сначала два идентичных контрольных запуска. Затем — 5 изолированных вариантов угла выбранного устройства: −2Δ, −Δ, база, +Δ, +2Δ. Живая конструкция, прохождение, награды и аналитика не меняются.'));
panel.append(head, title, lead, rule);

const toolbar = el('div', 'cst-toolbar');
const deviceField = el('div', 'cst-field');
deviceField.append(el('label', '', 'УСТРОЙСТВО ДЛЯ ТЕСТА'));
const deviceSelect = el('select', 'cst-select');
deviceSelect.id = 'cst-device-select';
deviceSelect.setAttribute('aria-label', 'Выберите устройство, угол которого будет меняться');
deviceField.append(deviceSelect);
const stepField = el('div', 'cst-field');
stepField.append(el('label', '', 'ШАГ ИЗМЕНЕНИЯ УГЛА'));
const stepSelect = el('select', 'cst-select');
stepSelect.id = 'cst-step-select';
stepSelect.setAttribute('aria-label', 'Шаг изменения угла в градусах');
for (const [value, label] of [['3','±3° / ±6°'],['6','±6° / ±12°'],['9','±9° / ±18°']]) {
  const option = el('option', '', label); option.value = value; stepSelect.append(option);
}
stepSelect.value = '6';
stepField.append(stepSelect);
const controlButton = el('button', 'cst-button', 'Проверить повторяемость');
controlButton.type = 'button';
const sweepButton = el('button', 'cst-button primary', 'Запустить серию из 5 тестов ↗');
sweepButton.type = 'button';
const exportButton = el('button', 'cst-button', 'Экспорт серии JSON');
exportButton.type = 'button'; exportButton.disabled = true;
toolbar.append(deviceField, stepField, controlButton, sweepButton, exportButton);
panel.append(toolbar);

const metricGrid = el('div', 'cst-metrics');
const metricValues = {};
for (const label of ['КОНТРОЛЬНЫЕ ЗАПУСКИ','СОВПАЛО ПОВТОРОВ','УСПЕХИ В СЕРИИ','МЕДИАНА ВРЕМЕНИ','РАЗБРОС ВРЕМЕНИ']) {
  const card = el('div', 'cst-metric');
  card.append(el('span', '', label));
  const value = el('b', '', '—');
  card.append(value); metricGrid.append(card); metricValues[label] = value;
}
panel.append(metricGrid);

const plotShell = el('section', 'cst-canvas-shell');
const plotHead = el('div', 'cst-canvas-head');
plotHead.append(el('span', '', 'OVERLAY / РЕАЛЬНЫЕ СИМУЛЯЦИОННЫЕ ТРАЕКТОРИИ'));
const plotNote = el('span', '', 'ОБЩИЕ КООРДИНАТЫ · 1000 × 560');
plotHead.append(plotNote);
const canvas = document.createElement('canvas');
canvas.className = 'cst-canvas'; canvas.width = 1000; canvas.height = 560;
canvas.setAttribute('role', 'img');
canvas.setAttribute('aria-label', 'Наложение траекторий симуляционного теста');
const legend = el('div', 'cst-legend');
plotShell.append(plotHead, canvas, legend);
panel.append(plotShell);

const tableWrap = el('div', 'cst-table-wrap');
const table = el('table', 'cst-table');
const caption = document.createElement('caption'); caption.className = 'cst-hidden'; caption.textContent = 'Результаты изолированных запусков Simulation Twin';
const thead = document.createElement('thead'), headerRow = document.createElement('tr');
for (const value of ['ВАРИАНТ','ИСХОД','ВРЕМЯ, С','ДЕТАЛИ','ПИК, PX/S','ПУТЬ, PX','FINGERPRINT']) headerRow.append(el('th', '', value));
thead.append(headerRow);
const tbody = document.createElement('tbody');
table.append(caption, thead, tbody);
tableWrap.append(table);
panel.append(tableWrap);
const status = el('p', 'cst-status', 'Жду выбора действия. Собери конструкцию в обычном поле, затем запусти контроль или угловую серию.');
status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
const foot = el('p', 'cst-foot', 'LOCAL-ONLY · 1/120 s fixed-step · максимум 5 угловых вариантов + 2 контрольных повтора · fingerprint FNV-1a не является криптографической подписью · игровой мир не изменяется');
panel.append(status, foot);

const mount = document.querySelector('#cascade-evidence-integrity') ||
  document.querySelector('#cascade-adaptive-mission-director') ||
  document.querySelector('.cl-engineering') ||
  document.querySelector('.cl-xray');
if (!mount) return;
mount.after(panel);

let currentSeries = null;
let currentControl = null;
const colors = ['#e9ba6a','#6bd6ff','#c1a0ff','#7ce5c1','#ff8eaa'];
const setStatus = (message, kind = 'info') => { status.textContent = message; status.dataset.kind = kind; };

function readCurrentScenario() {
  const result = runtime.getCurrentScenario();
  if (!result || result.ok !== true) throw new Error(clean(result && result.error || 'Не удалось прочитать текущую сцену.'));
  return result;
}
function refreshDeviceOptions() {
  try {
    const scene = readCurrentScenario();
    deviceSelect.replaceChildren();
    scene.devices.forEach((device, index) => {
      const option = el('option', '', '#' + (index + 1) + ' · ' + (device.type || 'device') + ' · ' + Math.round(device.x) + ',' + Math.round(device.y));
      option.value = String(index); deviceSelect.append(option);
    });
    const hasDevices = scene.devices.length > 0;
    sweepButton.disabled = !hasDevices;
    if (!hasDevices) setStatus('На текущей сцене нет устройств. Размести хотя бы одно устройство; физика будет анализироваться только для копии.', 'info');
    else setStatus('Текущий протокол: ' + scene.levelTitle + ' · ' + scene.devices.length + ' устройств. Можно проверить повторяемость или угол одного устройства.', 'info');
    return scene;
  } catch (error) {
    deviceSelect.replaceChildren();
    sweepButton.disabled = true;
    setStatus(clean(error && error.message || 'Текущая сцена недоступна.'), 'error');
    return null;
  }
}
function addMetricNote(message) {
  plotNote.textContent = clean(message, 160);
}
function clearPlot() {
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#06101a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#8bc5dd18'; ctx.lineWidth = 1;
  for (let x = 0; x <= 1000; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 560); ctx.stroke(); }
  for (let y = 0; y <= 560; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke(); }
  ctx.fillStyle = '#6e94a9'; ctx.font = '12px ui-monospace,monospace'; ctx.fillText('SIMULATION TWIN / AWAITING TRACE', 18, 28);
}
function drawVariants(variants) {
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) { addMetricNote('Этот браузер не предоставил canvas; таблица измерений доступна ниже.'); return; }
  ctx.clearRect(0, 0, 1000, 560); ctx.fillStyle = '#06101a'; ctx.fillRect(0, 0, 1000, 560);
  ctx.strokeStyle = '#8bc5dd1d'; ctx.lineWidth = 1;
  for (let x = 0; x <= 1000; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 560); ctx.stroke(); }
  for (let y = 0; y <= 560; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke(); }
  variants.forEach((variant, index) => {
    const trace = variant.run.trajectory || [];
    if (trace.length < 2) return;
    ctx.beginPath(); ctx.strokeStyle = colors[index % colors.length];
    ctx.globalAlpha = variant.offsetDegrees === 0 ? 1 : .72;
    ctx.lineWidth = variant.offsetDegrees === 0 ? 3.4 : 2;
    trace.forEach((point, i) => {
      const x = Math.max(0, Math.min(1000, point.x));
      const y = Math.max(0, Math.min(560, point.y));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const last = trace[trace.length - 1];
    ctx.fillStyle = colors[index % colors.length]; ctx.beginPath(); ctx.arc(last.x, last.y, variant.offsetDegrees === 0 ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e0f0f8'; ctx.font = '12px ui-monospace,monospace';
  ctx.fillText(variants.length + ' ISOLATED RUNS · FIXED 1/120 S', 18, 25);
}
function renderLegend(variants) {
  legend.replaceChildren();
  for (let index = 0; index < variants.length; index++) {
    const v = variants[index];
    const item = el('span');
    const swatch = el('i', 'cst-swatch');
    swatch.style.background = colors[index % colors.length];
    const label = v.offsetDegrees === 0 ? 'БАЗОВЫЙ УГОЛ' : (v.offsetDegrees > 0 ? '+' : '') + v.offsetDegrees + '°';
    item.append(swatch, el('span', '', label)); legend.append(item);
  }
}
function renderTable(variants) {
  tbody.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const variant of variants) {
    const row = document.createElement('tr');
    const label = variant.offsetDegrees === 0 ? 'База' : (variant.offsetDegrees > 0 ? '+' : '') + variant.offsetDegrees + '°';
    const state = el('td', variant.run.status === 'won' ? 'cst-state-won' : 'cst-state-lost', variant.run.status === 'won' ? 'ДОСТАВЛЕНО' : 'НЕ ДОСТАВЛЕНО');
    const values = [
      label, null, format(variant.run.timeSeconds), String(variant.run.deviceCount),
      format(variant.run.telemetry.peakSpeed, 1), format(variant.run.telemetry.distance, 1), variant.run.fingerprint
    ];
    values.forEach((value, index) => row.append(index === 1 ? state : el('td', '', value)));
    fragment.append(row);
  }
  tbody.append(fragment);
}
function renderReport(summary) {
  const vals = {
    'КОНТРОЛЬНЫЕ ЗАПУСКИ': currentControl ? '2 / 2' : '—',
    'СОВПАЛО ПОВТОРОВ': currentControl ? (currentControl.identical ? '100%' : '0%') : '—',
    'УСПЕХИ В СЕРИИ': summary ? summary.successfulCases + ' / ' + summary.caseCount : '—',
    'МЕДИАНА ВРЕМЕНИ': summary ? format(summary.medianDurationSeconds) + ' с' : '—',
    'РАЗБРОС ВРЕМЕНИ': summary ? format(summary.durationSpreadSeconds, 3) + ' с' : '—'
  };
  for (const [key, value] of Object.entries(vals)) metricValues[key].textContent = value;
}
function downloadJson(payload) {
  const text = JSON.stringify(payload, null, 2);
  const bytes = new Blob([text], { type: 'application/json;charset=utf-8' }).size;
  if (bytes > MAX_EXPORT_BYTES) throw new Error('Архив превысил 1 MiB; экспорт остановлен.');
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const link = el('a'); link.href = url; link.download = 'cascade-lab-simulation-twin-' + new Date().toISOString().slice(0,10) + '.json'; link.hidden = true;
  panel.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
function runRepeatability() {
  try {
    const scene = readCurrentScenario();
    setStatus('Выполняю два идентичных изолированных прогона. Живая сцена не меняется…');
    const control = runtime.runControl(scene.levelId, scene.devices);
    if (!control || control.ok !== true) throw new Error(clean(control && control.error || 'Контрольные прогоны не удались.'));
    currentControl = control; currentSeries = null;
    exportButton.disabled = false;
    renderReport(null);
    const dummy = [{ offsetDegrees: 0, run: control.baseline }, { offsetDegrees: 0, run: control.repeat }];
    drawVariants(dummy); renderLegend(dummy);
    renderTable(dummy); addMetricNote(control.identical ? 'DETERMINISM MATCH · ' + control.signatureA : 'MISMATCH · ' + control.signatureA + ' / ' + control.signatureB);
    exportButton.disabled = false;
    setStatus(control.identical
      ? 'ПОВТОРЯЕМОСТЬ ПОДТВЕРЖДЕНА: две копии одного сценария дали одинаковый fingerprint ' + control.signatureA + '. Это подтверждает повторяемость данной реализации в текущем окружении.'
      : 'ОБНАРУЖЕНО РАСХОЖДЕНИЕ: идентичная конфигурация дала разные fingerprint. Не делай выводов из угловой серии, пока причина не выяснена.', control.identical ? 'success' : 'error');
    return control;
  } catch (error) {
    setStatus(clean(error && error.message || 'Не удалось завершить контроль.'), 'error');
    return null;
  }
}
function runAngleSweep() {
  try {
    const scene = readCurrentScenario();
    if (!scene.devices.length) throw new Error('Для серии нужно минимум одно установленное устройство.');
    const deviceIndex = Number(deviceSelect.value);
    if (!Number.isInteger(deviceIndex) || deviceIndex < 0 || deviceIndex >= scene.devices.length) throw new Error('Выбери устройство для измерения чувствительности.');
    setStatus('Выполняю пять изолированных прогонов; изменяется только угол одного устройства…');
    const result = runtime.angleSweep(scene.levelId, scene.devices, deviceIndex, Number(stepSelect.value));
    if (!result || result.ok !== true) throw new Error(clean(result && result.error || 'Угловая серия не завершена.'));
    currentSeries = result.suite;
    currentControl = result.suite.deterministicControl;
    exportButton.disabled = false;
    drawVariants(currentSeries.variants);
    renderLegend(currentSeries.variants);
    renderTable(currentSeries.variants);
    renderReport(currentSeries.summary);
    addMetricNote('SERIES FINGERPRINT · ' + currentSeries.suiteFingerprint);
    const deviceLabel = scene.devices[deviceIndex].type + ' #' + (deviceIndex + 1);
    setStatus('Серия готова: ' + deviceLabel + ', offsets ' + currentSeries.offsetsDegrees.map(v => (v > 0 ? '+' : '') + v + '°').join(', ') +
      '. Идентичный контроль: ' + (currentSeries.deterministicControl.identical ? 'PASS' : 'MISMATCH') +
      '. Зафиксировано ' + currentSeries.summary.successfulCases + '/' + currentSeries.summary.caseCount + ' успешных вариантов. Разброс — наблюдение, а не оценка реальной надёжности.',
      currentSeries.deterministicControl.identical ? 'success' : 'error');
    return currentSeries;
  } catch (error) {
    setStatus(clean(error && error.message || 'Серия не удалась.'), 'error');
    return null;
  }
}
controlButton.addEventListener('click', runRepeatability);
sweepButton.addEventListener('click', runAngleSweep);
exportButton.addEventListener('click', () => {
  try {
    const payload = currentSeries ? {
      schema: SCHEMA, schemaVersion: 1, exportedAt: timeNow(), uploaded: false, localOnly: true,
      suite: currentSeries
    } : currentControl ? {
      schema: SCHEMA, schemaVersion: 1, exportedAt: timeNow(), uploaded: false, localOnly: true,
      control: currentControl
    } : null;
    if (!payload) throw new Error('Сначала выполни контроль или угловую серию.');
    downloadJson(payload);
    setStatus('JSON создан только по твоему запросу. Никакие траектории не отправлялись.');
  } catch (error) {
    setStatus(clean(error && error.message || 'Экспорт не выполнен.'), 'error');
  }
});
document.addEventListener('cascade-lab:run-finished', refreshDeviceOptions);
document.addEventListener('pointerup', event => { if (!panel.contains(event.target)) refreshDeviceOptions(); });
document.addEventListener('click', event => { if (!panel.contains(event.target)) refreshDeviceOptions(); });
window.addEventListener('focus', refreshDeviceOptions);
refreshDeviceOptions();
clearPlot();

Object.defineProperty(window, 'CASCADELAB026_WORKBENCH', {
  value: Object.freeze({ version: VERSION, schema: SCHEMA, refreshDeviceOptions, runRepeatability, runAngleSweep }),
  configurable: false, enumerable: false, writable: false
});
})();
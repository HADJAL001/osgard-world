(() => {
'use strict';

const VERSION = '0.19.0';
const SCHEMA = 'osgard.cascade-lab.engineering-suite.v1';
const STORAGE_KEY = SCHEMA;
const MAX_RUNS = 50;
const MAX_IMPORT_BYTES = 200 * 1024;
const TOOLS = Object.freeze({
  spring: 'Пружина', fan: 'Вентилятор', belt: 'Конвейер',
  magnet: 'Магнит', switch: 'Контакт', bumper: 'Отбойник'
});
const text = (value, limit = 180) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
const n = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const round = (value, places = 2) => Number.isFinite(value) ? Number(value.toFixed(places)) : null;
const list = value => Array.isArray(value) ? value : [];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function cleanEvent(event) {
  return {
    type: text(event && event.type || 'event', 32),
    label: text(event && (event.label || event.type) || 'Событие', 120),
    t: Math.max(0, n(event && event.t) || 0),
    x: n(event && event.x), y: n(event && event.y), speed: n(event && event.speed)
  };
}
function cleanRun(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!['won', 'lost'].includes(raw.status)) return null;
  const id = text(raw.id, 80);
  const levelId = n(raw.levelId);
  const at = Date.parse(raw.at);
  if (!id || !Number.isInteger(levelId) || levelId < 1 || levelId > 100 || !Number.isFinite(at)) return null;
  const devices = list(raw.devices).slice(0, 12).filter(d => d && Object.prototype.hasOwnProperty.call(TOOLS, d.type)).map(d => ({
    type: d.type, x: clamp(n(d.x) || 0, -100, 1100), y: clamp(n(d.y) || 0, -100, 660), angle: clamp(n(d.angle) || 0, -Math.PI * 64, Math.PI * 64)
  }));
  const t = raw.telemetry && typeof raw.telemetry === 'object' ? raw.telemetry : {};
  const checkpoints = list(raw.checkpoints).slice(0, 20).filter(c => c && typeof c.id === 'string').map(c => ({
    id: text(c.id, 80), label: text(c.label, 140), x: n(c.x), y: n(c.y)
  }));
  return {
    schema: SCHEMA, id, at: new Date(at).toISOString(), status: raw.status,
    levelId, levelTitle: text(raw.levelTitle, 140), par: Number.isInteger(raw.par) ? clamp(raw.par, 0, 12) : null,
    parTime: n(raw.parTime), fragile: raw.fragile === true, gateCount: clamp(Math.round(n(raw.gateCount) || 0), 0, 20),
    gateOpen: raw.gateOpen === true,
    switchZone: raw.switchZone && typeof raw.switchZone === 'object' ? { x: n(raw.switchZone.x), y: n(raw.switchZone.y) } : null,
    reason: text(raw.reason, 240), timeSeconds: clamp(n(raw.timeSeconds) || 0, 0, 120),
    position: { x: n(raw.position && raw.position.x), y: n(raw.position && raw.position.y) },
    velocity: { x: n(raw.velocity && raw.velocity.x), y: n(raw.velocity && raw.velocity.y) },
    grade: text(raw.grade || '—', 4), deviceCount: clamp(Math.round(n(raw.deviceCount) || devices.length), 0, 12),
    devices, checkpoints,
    checkpointsReached: list(raw.checkpointsReached).slice(0, 20).map(v => text(v, 80)),
    telemetry: {
      distance: n(t.distance), peakSpeed: n(t.peakSpeed), impacts: clamp(Math.round(n(t.impacts) || 0), 0, 10000),
      contacts: clamp(Math.round(n(t.contacts) || 0), 0, 10000), activations: clamp(Math.round(n(t.activations) || 0), 0, 10000),
      lastImpactSpeed: n(t.lastImpactSpeed), events: list(t.events).slice(-16).map(cleanEvent)
    },
    note: text(raw.note || '', 1000),
    hypothesis: text(raw.hypothesis || '', 500),
    nextTest: text(raw.nextTest || '', 700),
    checklist: {
      controlRun: !!(raw.checklist && raw.checklist.controlRun),
      oneVariable: !!(raw.checklist && raw.checklist.oneVariable),
      outcomeRecorded: !!(raw.checklist && raw.checklist.outcomeRecorded)
    }
  };
}
function validateArchive(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== SCHEMA || raw.schemaVersion !== 1 || !Array.isArray(raw.runs)) {
    return { ok: false, reason: 'Архив имеет неизвестную схему или повреждён.' };
  }
  if (raw.runs.length > MAX_RUNS) return { ok: false, reason: 'Архив содержит больше ' + MAX_RUNS + ' попыток.' };
  const encodedSize = JSON.stringify(raw).length;
  if (encodedSize > MAX_IMPORT_BYTES) return { ok: false, reason: 'Размер архива превышает 200 KiB.' };
  const runs = raw.runs.map(cleanRun);
  if (runs.some(run => !run)) return { ok: false, reason: 'Одна или несколько записей не прошли проверку структуры.' };
  const ids = new Set();
  for (const run of runs) {
    if (ids.has(run.id)) return { ok: false, reason: 'Архив содержит повторяющиеся ID попыток.' };
    ids.add(run.id);
  }
  return { ok: true, archive: { schema: SCHEMA, schemaVersion: 1, exportedAt: new Date().toISOString(), runs } };
}
function compareRuns(current, previous) {
  if (!current || !previous || current.levelId !== previous.levelId || current.id === previous.id) return null;
  const delta = (now, before, factor = 1) => Number.isFinite(now) && Number.isFinite(before) ? round((now - before) * factor) : null;
  return {
    sameLevel: true,
    outcome: previous.status === current.status ? 'unchanged' : current.status === 'won' ? 'recovered' : 'regressed',
    secondsDelta: delta(current.timeSeconds, previous.timeSeconds),
    devicesDelta: delta(current.deviceCount, previous.deviceCount),
    peakSpeedDelta: delta(current.telemetry.peakSpeed, previous.telemetry.peakSpeed),
    impactSpeedDelta: delta(current.telemetry.lastImpactSpeed, previous.telemetry.lastImpactSpeed),
    activationsDelta: delta(current.telemetry.activations, previous.telemetry.activations),
    distanceDelta: delta(current.telemetry.distance, previous.telemetry.distance)
  };
}
function diagnoseRun(raw) {
  const run = cleanRun(raw);
  if (!run) return { kind: 'unknown', title: 'Недостаточно данных', evidence: ['Результат не содержит корректного ID, протокола или исхода.'], hypothesis: 'Нельзя выводить причину без достоверной записи.', nextTest: 'Запусти протокол заново и сохрани результат.', confidence: 'LOW' };
  const events = run.telemetry.events;
  const types = events.map(e => e.type);
  const reason = run.reason.toLocaleLowerCase('ru');
  const lastActuatorEvent = [...events].reverse().find(e => Object.prototype.hasOwnProperty.call(TOOLS, e.type));
  const lastActuator = lastActuatorEvent ? TOOLS[lastActuatorEvent.type] : null;
  const missing = run.checkpoints.find(c => !run.checkpointsReached.includes(c.id));
  const evidence = [];
  let kind = 'review', title, hypothesis, nextTest, confidence = 'MEDIUM';

  if (run.status === 'won') {
    kind = 'success';
    if (run.par !== null && run.deviceCount > run.par) {
      title = 'Доставка успешна — проверь минимальную конструкцию';
      evidence.push('Доставка подтверждена: ' + run.deviceCount + ' деталей при ориентире ' + run.par + '.');
      hypothesis = 'Возможно, часть конструкции избыточна; метрики не доказывают, какая деталь лишняя.';
      nextTest = 'Сохрани текущую схему как базу. Убери ровно одну деталь, повтори запуск и сравни исход, время и события.';
    } else if (Number.isFinite(run.parTime) && run.timeSeconds > run.parTime) {
      title = 'Успех — ищи более точную траекторию';
      evidence.push('Время доставки ' + run.timeSeconds.toFixed(2) + ' с при ориентире ' + run.parTime.toFixed(2) + ' с.');
      hypothesis = 'Один угол или контакт может повлиять на время, но направление изменения заранее неизвестно.';
      nextTest = 'Повтори базовый запуск, затем поверни только одно устройство на один шаг (45°).';
    } else {
      title = 'Успех зафиксирован — проверь воспроизводимость';
      evidence.push('Доставка подтверждена за ' + run.timeSeconds.toFixed(2) + ' с с ' + run.deviceCount + ' деталями.');
      hypothesis = 'Повтор без изменений покажет, насколько результат устойчив к повторному запуску.';
      nextTest = 'Не меняй конструкцию. Запусти тот же протокол ещё раз и сравни время и исход.';
    }
  } else if (run.fragile && (types.includes('damage') || reason.includes('хрупкий') || reason.includes('жёсткое приземление'))) {
    kind = 'impact'; confidence = Number.isFinite(run.telemetry.lastImpactSpeed) ? 'HIGH' : 'MEDIUM';
    title = 'Повреждение из-за жёсткого удара';
    evidence.push('Внутренний движок отметил повреждение хрупкого груза.');
    if (Number.isFinite(run.telemetry.lastImpactSpeed)) evidence.push('Последний удар: ' + Math.round(run.telemetry.lastImpactSpeed) + ' px/s; порог протокола — выше 560 px/s.');
    hypothesis = 'Избыточный импульс перед приземлением — кандидат на проверку; одна запись не доказывает причинность.';
    nextTest = 'Сохрани схему. Измени только угол одного устройства, влияющего на последнюю траекторию; сравни скорость удара.';
  } else if ((reason.includes('маршрут не завершён') || types.includes('goal-missed')) && missing) {
    kind = 'checkpoint'; confidence = 'HIGH';
    title = 'Груз пропустил обязательный сканер';
    evidence.push('Движок не отметил контрольную точку: «' + missing.label + '».');
    evidence.push('Финальное положение: x=' + (run.position.x ?? '—') + ', y=' + (run.position.y ?? '—') + ' px.');
    hypothesis = 'Траектория могла пройти вне контрольной зоны; ошибка конкретной детали пока не доказана.';
    nextTest = 'Повтори запуск и наблюдай проход через сканер. Затем поверни только одно устройство на один шаг.';
  } else if (run.gateCount > 0 && !run.gateOpen && run.devices.some(d => d.type === 'switch')) {
    kind = 'gate'; confidence = 'HIGH';
    title = 'Шлюз остался закрытым';
    evidence.push('Шлюз закрыт в конце запуска, а в схеме есть контактный переключатель.');
    if (run.switchZone) evidence.push('Зона контакта: около x=' + run.switchZone.x + ', y=' + run.switchZone.y + ' px.');
    hypothesis = 'Груз мог не попасть в зону переключателя вовремя. Проверь это наблюдением, не считай причиной автоматически.';
    nextTest = 'Сдвинь только «Контакт» на 12 px ближе к наблюдаемой траектории перед шлюзом и повтори.';
  } else if (types.includes('fall') || reason.includes('покинул трассу') ||
      (Number.isFinite(run.position.x) && (run.position.x < -70 || run.position.x > 1070)) ||
      (Number.isFinite(run.position.y) && run.position.y > 630)) {
    kind = 'fall';
    title = 'Груз сошёл с трассы';
    evidence.push('Последнее положение: x=' + (run.position.x ?? '—') + ', y=' + (run.position.y ?? '—') + ' px.');
    if (Number.isFinite(run.velocity.x) && Number.isFinite(run.velocity.y)) evidence.push('Скорость: Vx ' + Math.round(run.velocity.x) + ', Vy ' + Math.round(run.velocity.y) + ' px/s.');
    hypothesis = lastActuator ? 'Последним активировалось устройство «' + lastActuator + '». Его вклад стоит проверить, но порядок событий не доказывает причину.' : 'По доступному журналу причина схода не установлена.';
    nextTest = 'Просмотри повтор и найди последний контакт до схода. После этого измени только один угол на один шаг.';
  } else if (types.includes('timeout') || reason.includes('время симуляции истекло') || run.timeSeconds >= 28) {
    kind = 'timeout';
    title = 'Симуляция исчерпала лимит времени';
    evidence.push('Время запуска: ' + run.timeSeconds.toFixed(2) + ' с; лимит — 28 с.');
    if (Number.isFinite(run.position.x) && Number.isFinite(run.position.y)) evidence.push('Последнее положение: x=' + run.position.x + ', y=' + run.position.y + ' px.');
    hypothesis = 'Груз мог застрять или не получить импульс для следующего участка; нужна проверка повтора.';
    nextTest = 'Измени только положение одного передающего устройства на 12 px вдоль ожидаемого движения.';
  } else {
    title = 'Найди последний подтверждённый контакт';
    evidence.push(run.reason || 'Журнал не содержит специфического сигнала отказа.');
    if (events.length) evidence.push('Последнее событие: ' + events[events.length - 1].label + '.');
    hypothesis = 'Недостаточно данных для точного диагноза; автоматическая система не должна угадывать причину.';
    nextTest = 'Открой повтор, найди последний контакт груза и измени одну переменную в следующем тесте.';
    confidence = 'LOW';
  }
  if (Number.isFinite(run.telemetry.peakSpeed)) evidence.push('Пиковая скорость: ' + Math.round(run.telemetry.peakSpeed) + ' px/s.');
  if (Number.isFinite(run.telemetry.activations)) evidence.push('Активаций устройств: ' + run.telemetry.activations + '; контактов: ' + run.telemetry.contacts + '.');
  return { kind, title, evidence: evidence.slice(0, 4), hypothesis, nextTest, confidence, run };
}
function csvEscape(value) {
  const s = value == null ? '' : String(value);
  return '"' + s.replace(/"/g, '""') + '"';
}
const pureApi = Object.freeze({ version: VERSION, schema: SCHEMA, cleanRun, validateArchive, compareRuns, diagnoseRun, csvEscape, maxRuns: MAX_RUNS, maxImportBytes: MAX_IMPORT_BYTES });
if (typeof window === 'undefined' || !window.document) {
  globalThis.__CASCADELAB019_TEST__ = pureApi;
  return;
}
if (window.CASCADELAB019) return;

const css = [
  '.cl-engineering{margin:18px 0 22px;padding:clamp(14px,2vw,22px);border:1px solid #7ad8ff32;border-radius:16px;background:radial-gradient(ellipse at 90% 0%,#1761821d,transparent 44%),linear-gradient(145deg,#0b1824,#050d15);color:#e6f1f7;box-shadow:0 16px 45px #0002,inset 0 1px #ffffff08}',
  '.cl-eng-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}.cl-eng-kicker{margin:0;color:#70dbff;font:8px ui-monospace,monospace;letter-spacing:.17em}.cl-eng-pill{padding:5px 8px;border:1px solid #e9ba6a40;border-radius:5px;color:#e9ba6a;font:8px ui-monospace,monospace}',
  '.cl-engineering h3{margin:0;color:#f3f8fb;font:400 clamp(23px,3vw,34px)/1.1 Georgia,serif;letter-spacing:-.025em}.cl-eng-sub{margin:8px 0 13px;color:#9ab1bf;font-size:10px;line-height:1.65}',
  '.cl-eng-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.cl-eng-card{min-width:0;padding:11px;border:1px solid #8db7cb23;border-radius:10px;background:#06111b}.cl-eng-card small{display:block;color:#6e9aad;font:7px ui-monospace,monospace;letter-spacing:.1em}.cl-eng-card p{margin:6px 0 0;color:#bed0da;font-size:10px;line-height:1.6;overflow-wrap:anywhere}',
  '.cl-eng-next{margin-top:9px;padding:11px 12px;border-left:2px solid #e9ba6a;border-radius:0 8px 8px 0;background:#e9ba6a0b}.cl-eng-next small{color:#b99c68;font:7px ui-monospace,monospace;letter-spacing:.1em}.cl-eng-next p{margin:5px 0 0;color:#edf4f8;font-size:11px;line-height:1.6}',
  '.cl-eng-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px}.cl-eng-metric{padding:8px 9px;border:1px solid #81bdd01e;border-radius:8px;background:#07131d}.cl-eng-metric span{display:block;color:#68899a;font:7px ui-monospace,monospace}.cl-eng-metric b{display:block;margin-top:5px;color:#eaf5fa;font:600 16px Georgia,serif;overflow-wrap:anywhere}',
  '.cl-eng-toolbar{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.cl-eng-button{min-height:36px;padding:8px 10px;border:1px solid #7cc9e638;border-radius:8px;background:#0b2432;color:#b9eaff;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-eng-button.primary{border-color:#e9ba6a;background:linear-gradient(120deg,#f5d28d,#d89b42);color:#211808}.cl-eng-button.danger{border-color:#ff9b8b4a;color:#ffb6a5;background:#2b1619}.cl-eng-button:hover{filter:brightness(1.13)}.cl-eng-button:focus-visible,.cl-eng-input:focus-visible,.cl-eng-check input:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}',
  '.cl-eng-field{display:grid;gap:5px;margin-top:10px}.cl-eng-field label,.cl-eng-field>small{color:#7b9aab;font:8px ui-monospace,monospace;letter-spacing:.045em}.cl-eng-input{width:100%;min-width:0;padding:9px 10px;border:1px solid #84bfd22e;border-radius:8px;background:#040e17;color:#e6f1f7;font:10px/1.5 system-ui,sans-serif}.cl-eng-input::placeholder{color:#536d7b}.cl-eng-notes{min-height:66px;resize:vertical}',
  '.cl-eng-checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:9px}.cl-eng-check{display:flex;align-items:start;gap:7px;padding:8px;border:1px solid #86b5c21f;border-radius:8px;background:#07131c;color:#95aebc;font-size:9px;line-height:1.45}.cl-eng-check input{margin-top:2px;accent-color:#68d7ff}',
  '.cl-eng-archive{margin-top:14px;border-top:1px solid #8bb7cb20;padding-top:12px}.cl-eng-archive-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.cl-eng-archive-top strong{color:#c6dbe5;font:8px ui-monospace,monospace;letter-spacing:.1em}.cl-eng-filter{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.cl-eng-filter .cl-eng-input{flex:1;min-width:135px}.cl-eng-records{display:grid;gap:6px;margin-top:8px}.cl-eng-record{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;padding:9px;border:1px solid #8bb7cb20;border-radius:8px;background:#06111b}.cl-eng-record strong{display:block;color:#d6e6ee;font-size:10px}.cl-eng-record small{display:block;margin-top:4px;color:#718e9e;font:7px/1.55 ui-monospace,monospace;overflow-wrap:anywhere}.cl-eng-record-actions{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.cl-eng-record-actions button{min-height:29px;padding:5px 7px;border:1px solid #7cc9e62b;border-radius:6px;background:#0a202c;color:#a7dff4;font-size:8px}.cl-eng-empty{padding:15px;border:1px dashed #7fb8cf29;border-radius:8px;color:#7694a4;font-size:9px;line-height:1.6}.cl-eng-status{min-height:19px;margin:9px 0 0;color:#85dff8;font-size:9px;line-height:1.5}.cl-eng-status[data-kind=error]{color:#ffada3}.cl-eng-privacy{margin:9px 0 0;padding-top:9px;border-top:1px solid #8bb7cb19;color:#5f7c8c;font:7px/1.6 ui-monospace,monospace}',
  '@media(max-width:650px){.cl-engineering{padding:13px;border-radius:12px}.cl-eng-grid{grid-template-columns:1fr}.cl-eng-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-eng-checks{grid-template-columns:1fr}.cl-eng-record{grid-template-columns:1fr}.cl-eng-record-actions{justify-content:flex-start}.cl-eng-button{min-height:42px}.cl-eng-toolbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cl-eng-button{width:100%}}',
  '@media(prefers-reduced-motion:reduce){.cl-eng-button{transition:none!important;animation:none!important}}'
].join('');
const style = document.createElement('style');
style.dataset.cascadeLabEngineering = VERSION;
style.textContent = css;
document.head.append(style);
const make = (tag, cls, value) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (value !== undefined) el.textContent = String(value);
  return el;
};
const $ = selector => document.querySelector(selector);
const host = make('section', 'cl-engineering');
host.setAttribute('aria-labelledby', 'cl-eng-title');
host.setAttribute('aria-live', 'polite');
const header = make('div', 'cl-eng-head');
header.append(make('p', 'cl-eng-kicker', 'CASCADE LAB / ENGINEERING OS'));
header.append(make('span', 'cl-eng-pill', 'VERSION ' + VERSION));
const mainHeading = make('h3', '', 'Понимай запуск. Планируй следующий тест.');
mainHeading.id = 'cl-eng-title';
host.append(header, mainHeading);
const sub = make('p', 'cl-eng-sub', 'Локальная рабочая станция: диагноз по событиям движка, сравнение запусков, контрольный эксперимент и архив заметок. Гипотезы не выдаются за доказанные причины.');
host.append(sub);

const diagnosisGrid = make('div', 'cl-eng-grid');
const evidenceCard = make('article', 'cl-eng-card');
evidenceCard.append(make('small', '', 'НАБЛЮДЕНИЯ ДВИЖКА'));
const evidenceBody = make('p', '', 'Заверши запуск, чтобы получить сводку событий и измерений.');
evidenceCard.append(evidenceBody);
const hypothesisCard = make('article', 'cl-eng-card');
hypothesisCard.append(make('small', '', 'ГИПОТЕЗА · НЕ ФАКТ'));
const hypothesisBody = make('p', '', 'Сначала наблюдение, затем контролируемая проверка.');
hypothesisCard.append(hypothesisBody);
diagnosisGrid.append(evidenceCard, hypothesisCard);
host.append(diagnosisGrid);
const nextBlock = make('div', 'cl-eng-next');
nextBlock.append(make('small', '', 'СЛЕДУЮЩИЙ КОНТРОЛИРУЕМЫЙ ТЕСТ'));
const nextBody = make('p', '', 'Повтори тот же протокол без изменений как контроль.');
nextBlock.append(nextBody);
host.append(nextBlock);

const metrics = make('div', 'cl-eng-metrics');
const metricEls = {};
for (const key of ['ВРЕМЯ', 'ДЕТАЛИ', 'ПИК СКОРОСТИ', 'ПОСЛЕДНИЙ УДАР']) {
  const card = make('div', 'cl-eng-metric');
  card.append(make('span', '', key));
  const value = make('b', '', '—');
  card.append(value); metrics.append(card); metricEls[key] = value;
}
host.append(metrics);

const fields = make('div', 'cl-eng-fields');
const hypothesisField = make('div', 'cl-eng-field');
hypothesisField.append(make('label', '', 'МОЯ ГИПОТЕЗА'));
const hypothesisInput = make('textarea', 'cl-eng-input cl-eng-notes');
hypothesisInput.rows = 2; hypothesisInput.maxLength = 500;
hypothesisInput.placeholder = 'Что, по твоему мнению, вызвало результат?';
hypothesisField.append(hypothesisInput);
const nextField = make('div', 'cl-eng-field');
nextField.append(make('label', '', 'МОЙ СЛЕДУЮЩИЙ ТЕСТ'));
const nextInput = make('textarea', 'cl-eng-input cl-eng-notes');
nextInput.rows = 2; nextInput.maxLength = 700;
nextInput.placeholder = 'Измени одну переменную, остальные оставь прежними…';
nextField.append(nextInput);
const noteField = make('div', 'cl-eng-field');
noteField.append(make('label', '', 'ЗАМЕТКИ ПО ПОПЫТКЕ'));
const noteInput = make('textarea', 'cl-eng-input cl-eng-notes');
noteInput.rows = 2; noteInput.maxLength = 1000;
noteInput.placeholder = 'Что изменил, что увидел, что осталось неизвестным?';
noteField.append(noteInput);
fields.append(hypothesisField, nextField, noteField);
host.append(fields);

const checks = make('div', 'cl-eng-checks');
const checkItems = [
  ['controlRun', 'Сделан контрольный запуск без изменений'],
  ['oneVariable', 'Изменена только одна переменная'],
  ['outcomeRecorded', 'Исход и измерения записаны']
];
const checkInputs = {};
for (const [key, label] of checkItems) {
  const line = make('label', 'cl-eng-check');
  const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
  checkInputs[key] = checkbox;
  line.append(checkbox, make('span', '', label));
  checks.append(line);
}
host.append(checks);

const toolbar = make('div', 'cl-eng-toolbar');
const saveNoteButton = make('button', 'cl-eng-button primary', 'Сохранить заметку');
saveNoteButton.type = 'button';
const copyButton = make('button', 'cl-eng-button', 'Скопировать план');
copyButton.type = 'button';
const exportButton = make('button', 'cl-eng-button', 'Экспорт JSON');
exportButton.type = 'button';
const csvButton = make('button', 'cl-eng-button', 'Экспорт CSV');
csvButton.type = 'button';
const importButton = make('button', 'cl-eng-button', 'Импорт архива');
importButton.type = 'button';
const clearButton = make('button', 'cl-eng-button danger', 'Очистить архив');
clearButton.type = 'button';
const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'application/json,.json'; fileInput.hidden = true;
toolbar.append(saveNoteButton, copyButton, exportButton, csvButton, importButton, clearButton);
host.append(toolbar, fileInput);

const archive = make('section', 'cl-eng-archive');
const archiveTop = make('div', 'cl-eng-archive-top');
archiveTop.append(make('strong', '', 'ЛОКАЛЬНЫЙ АРХИВ ПОПЫТОК'));
const archiveCount = make('span', 'cl-eng-pill', '0 / ' + MAX_RUNS);
archiveTop.append(archiveCount);
archive.append(archiveTop);
const filters = make('div', 'cl-eng-filter');
const searchInput = document.createElement('input');
searchInput.type = 'search'; searchInput.className = 'cl-eng-input'; searchInput.placeholder = 'Поиск по протоколу или заметке'; searchInput.maxLength = 100;
const outcomeSelect = document.createElement('select');
outcomeSelect.className = 'cl-eng-input';
for (const [value, label] of [['all', 'Все исходы'], ['won', 'Успешные'], ['lost', 'Неудачные']]) {
  const option = document.createElement('option'); option.value = value; option.textContent = label; outcomeSelect.append(option);
}
filters.append(searchInput, outcomeSelect);
archive.append(filters);
const recordList = make('div', 'cl-eng-records');
archive.append(recordList);
host.append(archive);
const status = make('p', 'cl-eng-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
host.append(status, make('p', 'cl-eng-privacy', 'ЛОКАЛЬНО В ЭТОМ БРАУЗЕРЕ · БЕЗ УЧЁТНОЙ ЗАПИСИ · БЕЗ СЕТЕВОЙ ОТПРАВКИ · МАКС. 50 ЗАПИСЕЙ'));

const anchor = $('.cl-hypothesis');
const bottomGrid = $('.bottom-grid');
const footer = $('.app-footer') || $('footer');
if (anchor && typeof anchor.after === 'function') anchor.after(host);
else if (bottomGrid && typeof bottomGrid.after === 'function') bottomGrid.after(host);
else if (footer && typeof footer.before === 'function') footer.before(host);
else return;

let runs = readRuns();
let latestRunId = runs[0] ? runs[0].id : null;
let latestDiagnosis = runs[0] ? diagnoseRun(runs[0]) : null;

function readRuns() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const checked = validateArchive(parsed);
    return checked.ok ? checked.archive.runs.slice().sort((a,b) => Date.parse(b.at)-Date.parse(a.at)).slice(0, MAX_RUNS) : [];
  } catch { return []; }
}
function persist() {
  runs = runs.slice().sort((a,b) => Date.parse(b.at)-Date.parse(a.at)).slice(0, MAX_RUNS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: SCHEMA, schemaVersion: 1, exportedAt: new Date().toISOString(), runs }));
    status.dataset.kind = 'success';
    status.textContent = 'Сохранено локально. Архив не отправлялся.';
  } catch {
    status.dataset.kind = 'error';
    status.textContent = 'Браузер не разрешил сохранение. Запись доступна только до закрытия этой вкладки.';
  }
}
function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.hidden = true;
  host.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function showDelta(value, suffix) {
  return value === null ? '—' : (value > 0 ? '+' : '') + String(value).replace('.', ',') + (suffix || '');
}
function sameLevelPrevious(run) {
  return runs.find(other => other.id !== run.id && other.levelId === run.levelId && Date.parse(other.at) < Date.parse(run.at)) || null;
}
function renderRecords() {
  const query = text(searchInput.value, 100).toLocaleLowerCase('ru');
  const outcome = outcomeSelect.value;
  const filtered = runs.filter(run => (outcome === 'all' || run.status === outcome) &&
    (!query || (run.levelTitle + ' ' + run.reason + ' ' + run.note + ' ' + run.hypothesis).toLocaleLowerCase('ru').includes(query)));
  archiveCount.textContent = filtered.length + ' / ' + runs.length + ' · MAX ' + MAX_RUNS;
  recordList.replaceChildren();
  if (!filtered.length) {
    recordList.append(make('div', 'cl-eng-empty', runs.length ? 'По этим фильтрам ничего не найдено.' : 'После первого завершённого запуска здесь появится локальная запись.'));
    return;
  }
  for (const run of filtered.slice(0, MAX_RUNS)) {
    const row = make('article', 'cl-eng-record');
    const copy = make('div');
    copy.append(make('strong', '', (run.status === 'won' ? '✓ ' : '× ') + run.levelTitle));
    copy.append(make('small', '', new Date(run.at).toLocaleString() + ' · ' + run.timeSeconds.toFixed(2) + ' с · ' + run.deviceCount + ' деталей' + (run.note ? ' · ' + run.note.slice(0, 100) : '')));
    const actions = make('div', 'cl-eng-record-actions');
    const view = make('button', '', 'Открыть');
    view.type = 'button'; view.addEventListener('click', () => showRun(run.id));
    const remove = make('button', '', 'Удалить');
    remove.type = 'button'; remove.addEventListener('click', () => {
      runs = runs.filter(item => item.id !== run.id);
      if (latestRunId === run.id) latestRunId = runs[0] ? runs[0].id : null;
      persist(); renderRecords(); const current = runs.find(item => item.id === latestRunId); if (current) showRun(current.id); else resetReport();
    });
    actions.append(view, remove); row.append(copy, actions); recordList.append(row);
  }
}
function renderComparison(run) {
  const previous = sameLevelPrevious(run);
  if (!previous) return;
  const comparison = compareRuns(run, previous);
  evidenceBody.textContent += ' Предыдущая попытка этого протокола: ' + previous.status + ', ' + previous.timeSeconds.toFixed(2) + ' с, ' + previous.deviceCount + ' деталей.';
  const impact = showDelta(comparison.impactSpeedDelta, ' px/s');
  nextBody.textContent += ' Дельта к базе: время ' + showDelta(comparison.secondsDelta, ' с') +
    '; детали ' + showDelta(comparison.devicesDelta, '') + '; пик ' + showDelta(comparison.peakSpeedDelta, ' px/s') +
    '; удар ' + impact + '. Разница наблюдаемая, не причинная.';
  status.textContent = 'Сравнение двух записей одного протокола. Повтори контроль перед причинными выводами.';
}
function fillFields(run, diagnosis) {
  hypothesisInput.value = run.hypothesis || diagnosis.hypothesis;
  nextInput.value = run.nextTest || diagnosis.nextTest;
  noteInput.value = run.note || '';
  for (const key of Object.keys(checkInputs)) checkInputs[key].checked = !!run.checklist[key];
}
function renderReport(run) {
  if (!run) return resetReport();
  latestRunId = run.id;
  latestDiagnosis = diagnoseRun(run);
  const d = latestDiagnosis;
  evidenceBody.textContent = d.evidence.join(' ');
  hypothesisBody.textContent = d.hypothesis;
  nextBody.textContent = d.nextTest;
  metricEls['ВРЕМЯ'].textContent = run.timeSeconds.toFixed(2).replace('.', ',') + ' с';
  metricEls['ДЕТАЛИ'].textContent = String(run.deviceCount) + (run.par === null ? '' : ' / ' + run.par);
  metricEls['ПИК СКОРОСТИ'].textContent = Number.isFinite(run.telemetry.peakSpeed) ? Math.round(run.telemetry.peakSpeed) + ' px/s' : '—';
  metricEls['ПОСЛЕДНИЙ УДАР'].textContent = Number.isFinite(run.telemetry.lastImpactSpeed) ? Math.round(run.telemetry.lastImpactSpeed) + ' px/s' : '—';
  const result = host.querySelector ? host.querySelector('h3') : null;
  if (result) result.textContent = d.title;
  fillFields(run, d);
  renderComparison(run);
}
function resetReport() {
  latestRunId = null; latestDiagnosis = null;
  evidenceBody.textContent = 'Заверши запуск, чтобы получить сводку событий и измерений.';
  hypothesisBody.textContent = 'Сначала наблюдение, затем контролируемая проверка.';
  nextBody.textContent = 'Повтори тот же протокол без изменений как контроль.';
  for (const value of Object.values(metricEls)) value.textContent = '—';
  hypothesisInput.value = ''; nextInput.value = ''; noteInput.value = '';
  for (const checkbox of Object.values(checkInputs)) checkbox.checked = false;
}
function showRun(id) {
  const run = runs.find(item => item.id === id);
  if (run) renderReport(run);
}
function onRunFinished(raw) {
  const candidate = cleanRun({ ...raw, id: text(raw.id || 'run-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8), 80), at: raw.at || new Date().toISOString() });
  if (!candidate) {
    status.dataset.kind = 'error'; status.textContent = 'Получен неполный отчёт запуска; запись не добавлена.';
    return;
  }
  runs = runs.filter(run => run.id !== candidate.id);
  runs.unshift(candidate); runs = runs.slice(0, MAX_RUNS);
  persist(); renderReport(candidate); renderRecords();
}
function currentRun() { return runs.find(run => run.id === latestRunId) || null; }
function saveEdits() {
  const run = currentRun();
  if (!run) {
    status.dataset.kind = 'error'; status.textContent = 'Сначала заверши хотя бы один запуск.';
    return;
  }
  run.hypothesis = text(hypothesisInput.value, 500);
  run.nextTest = text(nextInput.value, 700);
  run.note = text(noteInput.value, 1000);
  run.checklist = Object.fromEntries(Object.entries(checkInputs).map(([key, input]) => [key, input.checked]));
  persist(); renderRecords(); renderReport(run);
}
function exportArchive() {
  const raw = { schema: SCHEMA, schemaVersion: 1, exportedAt: new Date().toISOString(), runs };
  download('cascade-lab-engineering-' + new Date().toISOString().slice(0,10) + '.json', JSON.stringify(raw, null, 2), 'application/json;charset=utf-8');
}
function exportCsv() {
  const columns = ['id','at','levelId','levelTitle','status','reason','timeSeconds','par','deviceCount','grade','peakSpeed','lastImpactSpeed','impacts','contacts','activations','hypothesis','nextTest','note'];
  const rows = runs.map(run => [
    run.id,run.at,run.levelId,run.levelTitle,run.status,run.reason,run.timeSeconds,run.par,run.deviceCount,run.grade,
    run.telemetry.peakSpeed,run.telemetry.lastImpactSpeed,run.telemetry.impacts,run.telemetry.contacts,run.telemetry.activations,
    run.hypothesis,run.nextTest,run.note
  ]);
  download('cascade-lab-engineering-' + new Date().toISOString().slice(0,10) + '.csv',
    [columns, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}
async function copyPlan() {
  const run = currentRun();
  if (!run) { status.textContent = 'Сначала заверши запуск.'; return; }
  const d = diagnoseRun(run);
  const out = ['CASCADE LAB ENGINEERING SUITE ' + VERSION, 'Протокол: ' + run.levelTitle + ' (#' + run.levelId + ')',
    'Исход: ' + (run.status === 'won' ? 'успех' : 'неудача'), 'Наблюдения: ' + d.evidence.join(' '),
    'Гипотеза: ' + text(hypothesisInput.value, 500), 'Следующий тест: ' + text(nextInput.value, 700),
    'Оговорка: Наблюдаемая последовательность событий не доказывает причинность.',
    'Заметки: ' + text(noteInput.value, 1000)].join('\n');
  try {
    await navigator.clipboard.writeText(out); status.textContent = 'План скопирован. Данные не отправлялись.';
  } catch {
    download('cascade-lab-next-test.txt', out, 'text/plain;charset=utf-8');
    status.textContent = 'Сохранён текстовый план. Данные не отправлялись.';
  }
}
function importArchive(file) {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) { status.dataset.kind='error'; status.textContent='Файл превышает лимит 200 KiB.'; return; }
  const reader = new FileReader();
  reader.onerror = () => { status.dataset.kind='error'; status.textContent='Не удалось прочитать файл.'; };
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ''));
      const checked = validateArchive(parsed);
      if (!checked.ok) throw new Error(checked.reason);
      const merged = [...checked.archive.runs, ...runs];
      const seen = new Set(); runs = merged.filter(run => !seen.has(run.id) && seen.add(run.id))
        .sort((a,b) => Date.parse(b.at)-Date.parse(a.at)).slice(0, MAX_RUNS);
      persist(); renderRecords();
      if (runs[0]) renderReport(runs[0]);
      status.dataset.kind='success'; status.textContent='Архив проверен и объединён. Импортировано записей в пределах лимита.';
    } catch (error) { status.dataset.kind='error'; status.textContent=String(error && error.message || 'Архив отклонён.').slice(0, 240); }
  };
  reader.readAsText(file);
}
saveNoteButton.addEventListener('click', saveEdits);
copyButton.addEventListener('click', copyPlan);
exportButton.addEventListener('click', exportArchive);
csvButton.addEventListener('click', exportCsv);
importButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { const file=fileInput.files && fileInput.files[0]; importArchive(file); fileInput.value=''; });
clearButton.addEventListener('click', () => {
  if (!window.confirm('Удалить локальный архив из этого браузера? Это действие нельзя отменить.')) return;
  runs=[]; latestRunId=null; persist(); renderRecords(); resetReport();
});
searchInput.addEventListener('input', renderRecords);
outcomeSelect.addEventListener('change', renderRecords);
window.addEventListener('cascade-lab:run-finished', event => onRunFinished(event.detail || {}));
const lastSaved = runs[0];
if (lastSaved) renderReport(lastSaved); else resetReport();
renderRecords();
Object.defineProperty(window, 'CASCADELAB019', {
  value: Object.freeze({ version: VERSION, schema: SCHEMA, diagnoseRun, compareRuns,
    getRuns: () => runs.map(cleanRun), exportArchive, renderRecords }),
  configurable: false, enumerable: false, writable: false
});
})();
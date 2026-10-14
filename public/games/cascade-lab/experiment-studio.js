(() => {
'use strict';
if (typeof window === 'undefined' || typeof document === 'undefined' || !window.CASCADELAB015 || document.querySelector('#cascade-experiment-studio')) return;

const VERSION = '0.19.0';
const STORE_KEY = 'osgard.cascade-lab.experiment-studio.v1';
const STUDY_SCHEMA = 'osgard.cascade-lab.experiment-study.v1';
const ARCHIVE_SCHEMA = 'osgard.cascade-lab.experiment-studio-archive.v1';
const MAX_STUDIES = 40;
const MAX_OBSERVATIONS = 5;
const MAX_IMPORT_BYTES = 512 * 1024;
const GAME_URL = 'https://osgard.world/games/cascade-lab/';
const VARIABLES = [
  ['layout', 'Положение механизма'],
  ['gravity', 'Гравитация'],
  ['mass', 'Масса ядра'],
  ['angle', 'Угол детали'],
  ['count', 'Количество устройств'],
  ['timing', 'Момент срабатывания'],
  ['other', 'Другая одна переменная']
];
const GOALS = [
  ['reliability', 'Надёжность доставки'],
  ['time', 'Время прохождения'],
  ['devices', 'Меньше устройств'],
  ['grade', 'Оценка результата']
];
const DIRECTIONS = [
  ['improve', 'Улучшить выбранный показатель'],
  ['reproduce', 'Повторить исходный результат'],
  ['recover', 'Восстановить успешную доставку']
];
let memoryArchive = [];
let statusNode = null;
let renderQueued = false;

const style = document.createElement('style');
style.dataset.cascadeLabExperimentStudio = VERSION;
style.textContent = [
  '#cascade-experiment-studio{margin:18px 0 26px;padding:clamp(16px,2.4vw,28px);border:1px solid #e9ba6a3d;border-radius:18px;background:radial-gradient(ellipse at 100% 0%,#bf8d3520,transparent 42%),linear-gradient(145deg,#111921,#070c12);color:#edf4f7;box-shadow:0 20px 65px #0003}',
  '#cascade-experiment-studio *{box-sizing:border-box}',
  '.ces-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px}',
  '.ces-eyebrow{margin:0 0 8px;color:#e9ba6a;font:9px ui-monospace,monospace;letter-spacing:.18em}',
  '.ces-title{margin:0;color:#f7f3e8;font:400 clamp(25px,3.5vw,38px)/1.08 Georgia,serif;letter-spacing:-.025em}',
  '.ces-lead{max-width:740px;margin:9px 0 0;color:#a2b2be;font-size:12px;line-height:1.7}',
  '.ces-local-badge{display:inline-flex;align-items:center;gap:7px;min-height:28px;padding:5px 9px;border:1px solid #72efc14a;border-radius:99px;color:#a6f1cf;font:9px ui-monospace,monospace;white-space:nowrap}',
  '.ces-local-badge:before{width:6px;height:6px;border-radius:50%;background:#72efc1;content:""}',
  '.ces-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:13px 0 18px}',
  '.ces-button{min-height:40px;padding:9px 12px;border:1px solid #8ba8b933;border-radius:9px;background:#0a121b;color:#d9e8ef;font:700 10px ui-monospace,monospace;cursor:pointer}',
  '.ces-button:hover{border-color:#e9ba6a;color:#ffe0a0}',
  '.ces-button:focus-visible,.ces-field input:focus-visible,.ces-field select:focus-visible,.ces-field textarea:focus-visible,.ces-social a:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}',
  '.ces-button.primary{border-color:#e9ba6a;background:linear-gradient(130deg,#f1d69a,#d39a43);color:#201709}',
  '.ces-button.quiet{background:transparent;color:#8ea3b0}',
  '.ces-button.danger{border-color:#ff8b8b54;color:#ffb2b2}',
  '.ces-button:disabled{opacity:.44;cursor:not-allowed}',
  '.ces-form{display:grid;gap:13px;padding:16px;border:1px solid #8ba8b92a;border-radius:14px;background:#07111ac7}',
  '.ces-form-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}',
  '.ces-form-heading h4,.ces-history-heading h4{margin:0;color:#f2f6f7;font-size:12px;letter-spacing:.07em}',
  '.ces-form-heading span{color:#8da7b4;font:9px ui-monospace,monospace}',
  '.ces-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}',
  '.ces-field{display:grid;gap:6px;min-width:0}',
  '.ces-field.full{grid-column:1/-1}',
  '.ces-field label{color:#b1c4ce;font-size:10px;font-weight:700}',
  '.ces-field small{color:#718b9a;font-size:9px;line-height:1.5}',
  '.ces-field input,.ces-field select,.ces-field textarea{width:100%;min-width:0;border:1px solid #8ba8b933;border-radius:8px;background:#050c12;color:#edf4f7;padding:10px 11px;font:11px/1.55 system-ui,sans-serif}',
  '.ces-field textarea{min-height:74px;resize:vertical}',
  '.ces-field input:focus,.ces-field select:focus,.ces-field textarea:focus{border-color:#68d7ff}',
  '.ces-baseline{margin:0;padding:10px 12px;border-left:2px solid #68d7ff;background:#68d7ff0d;color:#a9c3d0;font-size:10px;line-height:1.7;overflow-wrap:anywhere}',
  '.ces-form-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}',
  '.ces-status{min-height:18px;margin:0;color:#a5dfc5;font-size:10px;line-height:1.6}',
  '.ces-status[data-state="error"]{color:#ffaaaa}',
  '.ces-privacy{margin:0;color:#6f8795;font-size:9px;line-height:1.65}',
  '.ces-history{display:grid;gap:12px;margin-top:22px}',
  '.ces-history-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
  '.ces-count{color:#91a6b0;font:9px ui-monospace,monospace}',
  '.ces-empty{margin:0;padding:16px;border:1px dashed #8ba8b933;border-radius:11px;color:#8ea5b3;font-size:11px;line-height:1.7}',
  '.ces-study{min-width:0;padding:16px;border:1px solid #8ba8b92b;border-radius:13px;background:linear-gradient(145deg,#0c1721,#080e15)}',
  '.ces-study-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}',
  '.ces-study h5{margin:0;color:#f4f0e5;font:400 20px/1.2 Georgia,serif}',
  '.ces-study-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
  '.ces-chip{display:inline-flex;align-items:center;min-height:23px;padding:4px 7px;border:1px solid #8ba8b92b;border-radius:6px;color:#a1b6c0;font:8px ui-monospace,monospace}',
  '.ces-chip[data-state="observed"]{border-color:#72efc147;color:#a6f1cf}',
  '.ces-chip[data-state="cancelled"]{border-color:#ffaaaa40;color:#ffaaaa}',
  '.ces-study-copy{margin:12px 0 0;color:#a5b7c0;font-size:11px;line-height:1.7;overflow-wrap:anywhere}',
  '.ces-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:12px}',
  '.ces-metric{min-width:0;padding:9px;border:1px solid #8ba8b91f;border-radius:8px;background:#050c12}',
  '.ces-metric span{display:block;color:#738f9e;font:8px ui-monospace,monospace;letter-spacing:.05em}',
  '.ces-metric strong{display:block;margin-top:6px;color:#f1f5f4;font-size:13px;font-weight:700;overflow-wrap:anywhere}',
  '.ces-observation{margin-top:11px;padding:10px 11px;border:1px solid #8ba8b925;border-radius:8px;background:#050c12}',
  '.ces-observation h6{margin:0 0 5px;color:#e9ba6a;font:9px ui-monospace,monospace;letter-spacing:.1em}',
  '.ces-observation p{margin:0;color:#9eb1bb;font-size:10px;line-height:1.65}',
  '.ces-note{display:grid;gap:6px;margin-top:12px}',
  '.ces-note label{color:#8ea4af;font-size:9px}',
  '.ces-note textarea{width:100%;min-height:56px;padding:9px;border:1px solid #8ba8b926;border-radius:8px;background:#050c12;color:#dde8ec;font:10px/1.6 system-ui,sans-serif;resize:vertical}',
  '.ces-study-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}',
  '.ces-study-actions .ces-button{min-height:35px;padding:7px 9px;font-size:9px}',
  '.ces-social{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #8ba8b91a}',
  '.ces-social a{display:inline-flex;align-items:center;min-height:32px;padding:6px 8px;border:1px solid #8ba8b92c;border-radius:7px;color:#9fb6c1;font-size:9px;text-decoration:none}',
  '.ces-social a:hover{border-color:#e9ba6a;color:#ffe0a0}',
  '@media(max-width:680px){#cascade-experiment-studio{padding:14px}.ces-fields{grid-template-columns:1fr}.ces-field.full{grid-column:auto}.ces-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.ces-study{padding:12px}.ces-form-actions .ces-button,.ces-toolbar .ces-button{flex:1 1 calc(50% - 8px)}}',
  '@media(max-width:360px){.ces-metrics{grid-template-columns:1fr 1fr}.ces-toolbar .ces-button{flex-basis:100%}}',
  '@media(prefers-reduced-motion:reduce){#cascade-experiment-studio *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}'
].join('');
document.head.append(style);

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};
const token = () => {
  try {
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
};
const clone = value => {
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
};
const boundedText = (value, max) => String(value == null ? '' : value).replace(/\u0000/g, '').slice(0, max);
const modeOf = run => {
  const raw = boundedText(run && run.mode || 'unknown', 48).trim();
  return raw || 'unknown';
};
const validRun = run => !!run && typeof run.id === 'string' && run.id.length > 0 &&
  typeof run.level === 'string' && run.level.trim().length > 0 &&
  typeof run.won === 'boolean' && Number.isFinite(Date.parse(run.at));
function runSnapshot(run) {
  if (!validRun(run)) return null;
  const seconds = run.seconds !== null && run.seconds !== '' && Number.isFinite(Number(run.seconds)) && Number(run.seconds) >= 0 ? Number(run.seconds) : null;
  const devices = run.devices !== null && run.devices !== '' && Number.isInteger(Number(run.devices)) && Number(run.devices) >= 0 ? Number(run.devices) : null;
  return {
    id: boundedText(run.id, 100),
    at: new Date(Date.parse(run.at)).toISOString(),
    level: boundedText(run.level, 100),
    mode: modeOf(run),
    won: run.won === true,
    grade: boundedText(run.grade || '—', 8),
    seconds,
    devices
  };
}
function getRuns() {
  try {
    const rows = window.CASCADELAB015.getSnapshot();
    return Array.isArray(rows) ? rows.map(runSnapshot).filter(Boolean).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : [];
  } catch { return []; }
}
const variableNames = Object.fromEntries(VARIABLES);
const goalNames = Object.fromEntries(GOALS);
const directionNames = Object.fromEntries(DIRECTIONS);
function cleanStudy(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== STUDY_SCHEMA || raw.schemaVersion !== 1) return null;
  if (typeof raw.id !== 'string' || !/^study_[a-f0-9]{24}$/.test(raw.id) ||
      !['planned', 'observing', 'observed', 'cancelled'].includes(raw.status) ||
      !Number.isFinite(Date.parse(raw.createdAt)) ||
      !VARIABLES.some(item => item[0] === raw.variable) ||
      !GOALS.some(item => item[0] === raw.goal) ||
      !DIRECTIONS.some(item => item[0] === raw.expected) ||
      typeof raw.hypothesis !== 'string' || raw.hypothesis.length < 12 ||
      typeof raw.change !== 'string' || raw.change.length < 10 ||
      !raw.baseline || !validRun(raw.baseline)) return null;
  const baseline = runSnapshot(raw.baseline);
  const observations = Array.isArray(raw.observations) ? raw.observations.slice(0, MAX_OBSERVATIONS).map(runSnapshot).filter(Boolean) : [];
  if (observations.some(obs => obs.level !== baseline.level || obs.mode !== baseline.mode || obs.id === baseline.id)) return null;
  const target = Number.isInteger(raw.targetObservations) ? Math.max(1, Math.min(MAX_OBSERVATIONS, raw.targetObservations)) : 1;
  let status = raw.status;
  if (status !== 'cancelled' && observations.length >= target) status = 'observed';
  else if (status !== 'cancelled' && observations.length > 0) status = 'observing';
  else if (status !== 'cancelled') status = 'planned';
  return {
    schema: STUDY_SCHEMA,
    schemaVersion: 1,
    id: raw.id,
    status,
    createdAt: new Date(Date.parse(raw.createdAt)).toISOString(),
    updatedAt: Number.isFinite(Date.parse(raw.updatedAt)) ? new Date(Date.parse(raw.updatedAt)).toISOString() : new Date(Date.parse(raw.createdAt)).toISOString(),
    finishedAt: Number.isFinite(Date.parse(raw.finishedAt)) ? new Date(Date.parse(raw.finishedAt)).toISOString() : null,
    level: boundedText(baseline.level, 100),
    mode: modeOf(baseline),
    baselineId: baseline.id,
    baseline,
    variable: raw.variable,
    goal: raw.goal,
    expected: raw.expected,
    targetObservations: target,
    hypothesis: boundedText(raw.hypothesis, 500),
    change: boundedText(raw.change, 400),
    notes: boundedText(raw.notes, 600),
    observations,
    limitation: 'Регистрируются результаты подходящих попыток после плана. Игра не проверяет фактическое изменение только одной переменной и не доказывает причинность.'
  };
}
function readArchive() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schema === ARCHIVE_SCHEMA && parsed.schemaVersion === 1 && Array.isArray(parsed.studies)) {
        return parsed.studies.slice(0, MAX_STUDIES).map(cleanStudy).filter(Boolean);
      }
    }
  } catch { /* Use this-tab memory if storage is unavailable or blocked. */ }
  return memoryArchive.map(clone).filter(Boolean);
}
function writeArchive(studies) {
  memoryArchive = studies.slice(-MAX_STUDIES).map(cleanStudy).filter(Boolean);
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({
      schema: ARCHIVE_SCHEMA,
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      studies: memoryArchive
    }));
    return true;
  } catch {
    return false;
  }
}
function calculateDelta(baseline, result) {
  const a = runSnapshot(baseline), b = runSnapshot(result);
  if (!a || !b || a.level !== b.level || a.mode !== b.mode) return null;
  const secondsDelta = a.seconds !== null && b.seconds !== null ? Math.round((b.seconds - a.seconds) * 100) / 100 : null;
  const secondsPercent = a.seconds !== null && a.seconds > 0 && secondsDelta !== null ? Math.round(secondsDelta / a.seconds * 1000) / 10 : null;
  const devicesDelta = a.devices !== null && b.devices !== null ? b.devices - a.devices : null;
  const ranks = { 'F': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'A+': 5 };
  const ar = Object.prototype.hasOwnProperty.call(ranks, a.grade) ? ranks[a.grade] : null;
  const br = Object.prototype.hasOwnProperty.call(ranks, b.grade) ? ranks[b.grade] : null;
  return {
    outcome: a.won === b.won ? 'unchanged' : b.won ? 'recovered' : 'regressed',
    baselineWon: a.won,
    resultWon: b.won,
    secondsDelta,
    secondsPercent,
    devicesDelta,
    gradeSteps: ar !== null && br !== null ? br - ar : null
  };
}
function startStudy(input) {
  const runs = getRuns();
  const baselineRaw = runs.find(run => run.id === String(input && input.baselineId || ''));
  if (baselineRaw && ((input.level && input.level !== baselineRaw.level) || (input.mode && input.mode !== baselineRaw.mode))) return null;
  const hypothesis = boundedText(input && input.hypothesis, 500).trim();
  const change = boundedText(input && input.change, 400).trim();
  if (!baselineRaw || hypothesis.length < 12 || change.length < 10 ||
      !VARIABLES.some(item => item[0] === input.variable) ||
      !GOALS.some(item => item[0] === input.goal) ||
      !DIRECTIONS.some(item => item[0] === input.expected)) return null;
  const target = Number.isInteger(Number(input.targetObservations)) ? Math.max(1, Math.min(MAX_OBSERVATIONS, Number(input.targetObservations))) : 1;
  const now = new Date().toISOString();
  const study = cleanStudy({
    schema: STUDY_SCHEMA,
    schemaVersion: 1,
    id: 'study_' + token(),
    status: 'planned',
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    level: baselineRaw.level,
    mode: baselineRaw.mode,
    baselineId: baselineRaw.id,
    baseline: baselineRaw,
    variable: input.variable,
    goal: input.goal,
    expected: input.expected,
    targetObservations: target,
    hypothesis,
    change,
    notes: boundedText(input.notes, 600),
    observations: []
  });
  if (!study) return null;
  const archive = readArchive().filter(item => item.id !== study.id);
  archive.push(study);
  writeArchive(archive);
  render();
  return clone(study);
}
function reconcile() {
  const studies = readArchive();
  const runs = getRuns();
  let archiveChanged = false;
  for (const study of studies) {
    if (!['planned', 'observing'].includes(study.status)) continue;
    const known = new Set([study.baselineId, ...study.observations.map(item => item.id)]);
    const candidates = runs.filter(run =>
      run.id && !known.has(run.id) &&
      run.level === study.level &&
      run.mode === study.mode &&
      Date.parse(run.at) >= Date.parse(study.createdAt)
    ).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    let studyChanged = false;
    for (const candidate of candidates) {
      if (study.observations.length >= study.targetObservations) break;
      study.observations.push(runSnapshot(candidate));
      known.add(candidate.id);
      studyChanged = true;
    }
    if (study.observations.length > 0 && study.observations.length < study.targetObservations) study.status = 'observing';
    if (study.observations.length >= study.targetObservations) {
      study.status = 'observed';
      study.finishedAt = study.observations[study.observations.length - 1].at;
    }
    if (studyChanged) {
      study.updatedAt = new Date().toISOString();
      archiveChanged = true;
    }
  }
  if (archiveChanged) writeArchive(studies);
  return readArchive();
}
function addOption(select, value, label) {
  const option = make('option', '', label);
  option.value = value;
  select.append(option);
}
function createField(labelText, id, control, helper, full) {
  const box = make('div', 'ces-field' + (full ? ' full' : ''));
  const label = make('label', '', labelText);
  label.htmlFor = id;
  control.id = id;
  box.append(label, control);
  if (helper) box.append(make('small', '', helper));
  return box;
}
function makeSelect(id, values) {
  const select = make('select');
  select.id = id;
  values.forEach(item => addOption(select, item[0], item[1]));
  return select;
}
function makeText(id, value, placeholder, max, multiline) {
  const control = make(multiline ? 'textarea' : 'input');
  control.id = id;
  control.maxLength = max;
  control.value = value || '';
  control.placeholder = placeholder;
  return control;
}
function formatTime(value) {
  return Number.isFinite(value) && value >= 0 ? value.toFixed(2).replace('.', ',') + ' с' : 'нет замера';
}
function outcomeText(run) {
  return run.won ? 'ДОСТАВКА УСПЕШНА' : 'ДОСТАВКА НЕ УДАЛАСЬ';
}
function dateText(value) {
  try { return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  catch { return String(value || ''); }
}
function deltaMetric(label, value, good) {
  const item = make('div', 'ces-metric');
  item.append(make('span', '', label), make('strong', '', value));
  if (good === true) item.dataset.trend = 'good';
  if (good === false) item.dataset.trend = 'bad';
  return item;
}
function studyDeltaText(study, observation) {
  const delta = calculateDelta(study.baseline, observation);
  if (!delta) return 'Недостаточно данных для сравнения этого результата с базой.';
  const seconds = delta.secondsDelta === null ? 'время: нет замера' : 'время ' + (delta.secondsDelta > 0 ? '+' : '') + delta.secondsDelta.toFixed(2).replace('.', ',') + ' с';
  const devices = delta.devicesDelta === null ? 'устройства: нет данных' : 'устройства ' + (delta.devicesDelta > 0 ? '+' : '') + delta.devicesDelta;
  return outcomeText(observation) + ' · ' + seconds + ' · ' + devices + '. Разница — наблюдение, не доказательство причины.';
}
function exportBlob(filename, type, text) {
  try {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = make('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    host.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    return true;
  } catch { return false; }
}
function archivePayload(studies = readArchive()) {
  return {
    schema: ARCHIVE_SCHEMA,
    schemaVersion: 1,
    application: { name: 'CASCADE LAB', version: VERSION },
    exportedAt: new Date().toISOString(),
    localOnly: true,
    uploaded: false,
    studies: studies.map(cleanStudy).filter(Boolean)
  };
}
function exportAllJson() {
  return exportBlob('cascade-lab-experiment-studio.json', 'application/json;charset=utf-8', JSON.stringify(archivePayload(), null, 2));
}
function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}
function exportAllCsv() {
  const rows = [[
    'study_id','status','level','mode','variable','goal','expected','created_at','hypothesis','change','baseline_won','baseline_seconds','baseline_devices','observation_count','observed_outcomes','notes'
  ]];
  for (const study of readArchive()) {
    rows.push([
      study.id, study.status, study.level, study.mode, study.variable, study.goal, study.expected,
      study.createdAt, study.hypothesis, study.change, study.baseline.won,
      study.baseline.seconds, study.baseline.devices, study.observations.length,
      study.observations.map(item => outcomeText(item) + '; ' + studyDeltaText(study, item)).join(' | '), study.notes
    ]);
  }
  return exportBlob('cascade-lab-experiment-studio.csv', 'text/csv;charset=utf-8', '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'));
}
function importArchive(payload) {
  if (!payload || typeof payload !== 'object' || payload.schema !== ARCHIVE_SCHEMA || payload.schemaVersion !== 1 || !Array.isArray(payload.studies) || payload.studies.length > MAX_STUDIES) {
    return { ok: false, imported: 0, error: 'Файл не соответствует схеме Experiment Studio v1.' };
  }
  const clean = [];
  for (const raw of payload.studies) {
    const study = cleanStudy(raw);
    if (!study) return { ok: false, imported: 0, error: 'В файле есть некорректный эксперимент. Импорт не выполнен.' };
    clean.push(study);
  }
  const existing = readArchive();
  const ids = new Set(existing.map(item => item.id));
  const additions = [];
  for (const item of clean) {
    if (ids.has(item.id)) continue;
    ids.add(item.id);
    additions.push(item);
  }
  const merged = existing.concat(additions).slice(-MAX_STUDIES);
  writeArchive(merged);
  render();
  return { ok: true, imported: merged.length - existing.length, error: '' };
}
function startRepeat(studyId) {
  const archive = readArchive();
  const previous = archive.find(item => item.id === studyId);
  if (!previous) return null;
  const latest = getRuns().filter(run => run.level === previous.level && run.mode === previous.mode).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  if (!latest) return null;
  const copyStudy = {
    schema: STUDY_SCHEMA,
    schemaVersion: 1,
    id: 'study_' + token(),
    status: 'planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finishedAt: null,
    level: latest.level,
    mode: latest.mode,
    baselineId: latest.id,
    baseline: latest,
    variable: previous.variable,
    goal: previous.goal,
    expected: previous.expected,
    targetObservations: previous.targetObservations,
    hypothesis: previous.hypothesis,
    change: previous.change,
    notes: previous.notes,
    observations: [],
    limitation: previous.limitation
  };
  const clean = cleanStudy(copyStudy);
  if (!clean) return null;
  archive.push(clean);
  writeArchive(archive);
  render();
  return clone(clean);
}
function removeStudy(studyId) {
  const archive = readArchive();
  const next = archive.filter(item => item.id !== studyId);
  if (next.length === archive.length) return false;
  writeArchive(next);
  render();
  return true;
}
function clearArchive() {
  writeArchive([]);
  render();
}
function makeSocialUrl(platform, study) {
  const observed = study.observations.length ? study.observations[study.observations.length - 1] : null;
  const message = [
    'CASCADE LAB · ЭКСПЕРИМЕНТ',
    'Протокол: ' + study.level,
    'Переменная: ' + (variableNames[study.variable] || study.variable),
    'Гипотеза: ' + study.hypothesis,
    'План изменения: ' + study.change,
    'База: ' + outcomeText(study.baseline) + ', время ' + formatTime(study.baseline.seconds) + ', устройств ' + (study.baseline.devices === null ? 'нет данных' : study.baseline.devices) + '.',
    observed ? 'Последнее наблюдение: ' + studyDeltaText(study, observed) : 'Наблюдение ещё не записано.',
    'Это пользовательский эксперимент, не доказательство причинности.',
    GAME_URL
  ].join('\n');
  const url = encodeURIComponent(GAME_URL);
  if (platform === 'telegram') return 'https://t.me/share/url?url=' + url + '&text=' + encodeURIComponent(message);
  if (platform === 'whatsapp') return 'https://wa.me/?text=' + encodeURIComponent(message);
  if (platform === 'x') return 'https://x.com/intent/post?text=' + encodeURIComponent(message);
  if (platform === 'vk') return 'https://vk.com/share.php?url=' + url + '&title=' + encodeURIComponent('CASCADE LAB · эксперимент');
  if (platform === 'linkedin') return 'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
  return '';
}
const host = make('section', '');
host.id = 'cascade-experiment-studio';
host.dataset.studioVersion = VERSION;
host.setAttribute('aria-labelledby', 'ces-title');
host.setAttribute('aria-describedby', 'ces-privacy-copy');
host.setAttribute('aria-live', 'polite');
const insertAfter = document.querySelector('.cl-hypothesis');
if (!insertAfter || typeof insertAfter.after !== 'function') return;
insertAfter.after(host);

function setStatus(message, state) {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.state = state || 'ok';
}
function button(label, className, handler) {
  const control = make('button', 'ces-button' + (className ? ' ' + className : ''), label);
  control.type = 'button';
  control.addEventListener('click', handler);
  return control;
}
function getFieldValue(id) {
  const control = host.querySelector('#' + id);
  return control ? control.value : '';
}
function renderForm(runs) {
  const form = make('form', 'ces-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = {
      level: getFieldValue('ces-level'),
      mode: getFieldValue('ces-mode'),
      baselineId: getFieldValue('ces-baseline'),
      variable: getFieldValue('ces-variable'),
      goal: getFieldValue('ces-goal'),
      expected: getFieldValue('ces-expected'),
      targetObservations: Number(getFieldValue('ces-repeats')),
      hypothesis: getFieldValue('ces-hypothesis'),
      change: getFieldValue('ces-change'),
      notes: getFieldValue('ces-new-notes')
    };
    if (values.hypothesis.trim().length < 12) { setStatus('Сформулируй гипотезу минимум в 12 символов.', 'error'); return; }
    if (values.change.trim().length < 10) { setStatus('Опиши одно изменение минимум в 10 символов.', 'error'); return; }
    const study = startStudy(values);
    if (!study) { setStatus('Не удалось зафиксировать план. Выбери сохранённую базовую попытку того же протокола и режима.', 'error'); return; }
    setStatus('План сохранён локально. Следующие подходящие попытки будут добавлены автоматически.', 'ok');
  });
  const head = make('div', 'ces-form-heading');
  head.append(make('h4', '', 'СОЗДАТЬ КОНТРОЛИРУЕМЫЙ ЭКСПЕРИМЕНТ'), make('span', '', '01 / PLAN'));
  const fields = make('div', 'ces-fields');
  const levelSelect = makeSelect('ces-level', []);
  const modeSelect = makeSelect('ces-mode', []);
  const baselineSelect = makeSelect('ces-baseline', []);
  const variableSelect = makeSelect('ces-variable', VARIABLES);
  const goalSelect = makeSelect('ces-goal', GOALS);
  const expectedSelect = makeSelect('ces-expected', DIRECTIONS);
  const repeats = makeSelect('ces-repeats', [['1','1 попытка'],['2','2 попытки'],['3','3 попытки'],['4','4 попытки'],['5','5 попыток']]);
  const hypothesis = makeText('ces-hypothesis', '', 'Например: повтор той же сборки должен снова привести ядро к порталу.', 500, true);
  const change = makeText('ces-change', '', 'Например: изменить только угол пружины на одно деление.', 400, true);
  const notes = makeText('ces-new-notes', '', 'Дополнительный контекст (необязательно).', 600, true);
  const baselinePreview = make('p', 'ces-baseline');
  baselinePreview.id = 'ces-baseline-preview';
  fields.append(
    createField('Протокол', 'ces-level', levelSelect, 'Выбери уровень, который будешь проверять.'),
    createField('Режим попытки', 'ces-mode', modeSelect, 'Обычные, ежедневные и дуэльные попытки не смешиваются.'),
    createField('Базовая попытка', 'ces-baseline', baselineSelect, 'Все последующие сравнения привязаны к этой записи.', true),
    createField('Что меняешь', 'ces-variable', variableSelect, 'Выбери одну переменную, не несколько одновременно.'),
    createField('Цель', 'ces-goal', goalSelect, 'Метрика для наблюдения, не гарантия улучшения.'),
    createField('Ожидание', 'ces-expected', expectedSelect, ''),
    createField('Сколько будущих попыток собрать', 'ces-repeats', repeats, 'От 1 до 5 подходящих записей.'),
    createField('Гипотеза', 'ces-hypothesis', hypothesis, 'Минимум 12 символов · максимум 500.', true),
    createField('Одна планируемая перемена', 'ces-change', change, 'Минимум 10 символов · максимум 400.', true),
    createField('Заметки исследователя', 'ces-new-notes', notes, 'Останутся локально и не будут включены в публичный текст репоста.', true)
  );
  form.append(head, fields, baselinePreview);
  const actions = make('div', 'ces-form-actions');
  const submit = make('button', 'ces-button primary', 'Зафиксировать план ↗');
  submit.type = 'submit';
  actions.append(submit, make('span', 'ces-privacy', 'База не меняется после старта плана.'));
  form.append(actions);
  const refresh = (preferredLevel, preferredMode, preferredBaseline) => {
    const freshRuns = getRuns();
    const levels = [];
    freshRuns.forEach(run => { if (!levels.includes(run.level)) levels.push(run.level); });
    const level = levels.includes(preferredLevel) ? preferredLevel : (levelSelect.value && levels.includes(levelSelect.value) ? levelSelect.value : levels[0] || '');
    levelSelect.replaceChildren();
    levels.forEach(item => addOption(levelSelect, item, item));
    levelSelect.value = level;
    const levelRuns = freshRuns.filter(run => run.level === level);
    const modes = [];
    levelRuns.forEach(run => { if (!modes.includes(run.mode)) modes.push(run.mode); });
    const mode = modes.includes(preferredMode) ? preferredMode : (modeSelect.value && modes.includes(modeSelect.value) ? modeSelect.value : modes[0] || '');
    modeSelect.replaceChildren();
    modes.forEach(item => addOption(modeSelect, item, item === 'unknown' ? 'Режим не указан' : item));
    modeSelect.value = mode;
    const baselines = levelRuns.filter(run => run.mode === mode).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    baselineSelect.replaceChildren();
    baselines.forEach(run => addOption(baselineSelect, run.id, dateText(run.at) + ' · ' + outcomeText(run) + ' · ' + formatTime(run.seconds)));
    const baseline = baselines.find(run => run.id === preferredBaseline) || baselines[0] || null;
    baselineSelect.value = baseline ? baseline.id : '';
    baselinePreview.textContent = baseline
      ? 'База: ' + outcomeText(baseline) + ' · ' + dateText(baseline.at) + ' · время ' + formatTime(baseline.seconds) + ' · устройств ' + (baseline.devices === null ? 'нет данных' : baseline.devices) + '.'
      : 'Для старта нужны хотя бы одна сохранённая попытка выбранного протокола и совпадающий режим.';
    submit.disabled = !baseline;
  };
  levelSelect.addEventListener('change', () => refresh(levelSelect.value, '', ''));
  modeSelect.addEventListener('change', () => refresh(levelSelect.value, modeSelect.value, ''));
  baselineSelect.addEventListener('change', () => refresh(levelSelect.value, modeSelect.value, baselineSelect.value));
  refresh(runs[0] && runs[0].level, runs[0] && runs[0].mode, runs[0] && runs[0].id);
  return form;
}
function renderStudy(study) {
  const card = make('article', 'ces-study');
  card.dataset.studyId = study.id;
  const top = make('div', 'ces-study-top');
  const title = make('h5', '', study.level);
  const meta = make('div', 'ces-study-meta');
  meta.append(
    make('span', 'ces-chip', variableNames[study.variable] || study.variable),
    make('span', 'ces-chip', goalNames[study.goal] || study.goal),
    make('span', 'ces-chip', study.mode),
    make('span', 'ces-chip', (study.status === 'planned' ? 'ПЛАН' : study.status === 'observing' ? 'СБОР НАБЛЮДЕНИЙ' : study.status === 'observed' ? 'НАБЛЮДЕНО' : 'ОТМЕНЁН') + ' · ' + study.observations.length + '/' + study.targetObservations)
  );
  meta.lastChild.dataset.state = study.status;
  top.append(title, meta);
  card.append(top);
  card.append(make('p', 'ces-study-copy', 'Гипотеза: ' + study.hypothesis));
  card.append(make('p', 'ces-study-copy', 'Перемена: ' + study.change));
  const metrics = make('div', 'ces-metrics');
  metrics.append(
    deltaMetric('БАЗА', outcomeText(study.baseline).replace('ДОСТАВКА ', ''), study.baseline.won),
    deltaMetric('ВРЕМЯ БАЗЫ', formatTime(study.baseline.seconds)),
    deltaMetric('УСТРОЙСТВА БАЗЫ', study.baseline.devices === null ? '—' : study.baseline.devices),
    deltaMetric('НАБЛЮДЕНИЙ', study.observations.length + ' / ' + study.targetObservations)
  );
  card.append(metrics);
  if (!study.observations.length) {
    card.append(make('p', 'ces-study-copy', 'После фиксации плана запусти этот же протокол в том же режиме. Следующая подходящая запись появится здесь автоматически.'));
  }
  study.observations.forEach((observation, index) => {
    const section = make('section', 'ces-observation');
    section.append(make('h6', '', 'НАБЛЮДЕНИЕ ' + (index + 1) + ' · ' + dateText(observation.at)));
    section.append(make('p', '', studyDeltaText(study, observation)));
    const delta = calculateDelta(study.baseline, observation);
    if (delta) {
      const out = make('div', 'ces-metrics');
      const time = delta.secondsDelta === null ? 'нет замера' : (delta.secondsDelta > 0 ? '+' : '') + delta.secondsDelta.toFixed(2).replace('.', ',') + ' с';
      const devices = delta.devicesDelta === null ? 'нет данных' : (delta.devicesDelta > 0 ? '+' : '') + delta.devicesDelta;
      const grade = delta.gradeSteps === null ? 'нет данных' : (delta.gradeSteps > 0 ? '+' : '') + delta.gradeSteps + ' ступ.';
      out.append(
        deltaMetric('ИСХОД', delta.outcome === 'unchanged' ? 'без изменения' : delta.outcome === 'recovered' ? 'успех' : 'неудача'),
        deltaMetric('Δ ВРЕМЯ', time, delta.secondsDelta !== null ? delta.secondsDelta < 0 : null),
        deltaMetric('Δ УСТРОЙСТВА', devices, delta.devicesDelta !== null ? delta.devicesDelta < 0 : null),
        deltaMetric('Δ ОЦЕНКА', grade, delta.gradeSteps !== null ? delta.gradeSteps > 0 : null)
      );
      section.append(out);
    }
    card.append(section);
  });
  const noteWrap = make('div', 'ces-note');
  const noteLabel = make('label', '', 'ЗАМЕТКА К ЭТОМУ ИССЛЕДОВАНИЮ');
  const noteInput = make('textarea');
  noteInput.value = study.notes;
  noteInput.maxLength = 600;
  noteInput.setAttribute('aria-label', 'Заметка к исследованию ' + study.level);
  noteLabel.htmlFor = 'ces-note-' + study.id;
  noteInput.id = noteLabel.htmlFor;
  noteInput.addEventListener('change', () => {
    const archive = readArchive();
    const index = archive.findIndex(item => item.id === study.id);
    if (index < 0) return;
    archive[index].notes = boundedText(noteInput.value, 600);
    archive[index].updatedAt = new Date().toISOString();
    writeArchive(archive);
    setStatus('Заметка сохранена на этом устройстве.', 'ok');
  });
  noteWrap.append(noteLabel, noteInput);
  card.append(noteWrap);
  const actions = make('div', 'ces-study-actions');
  actions.append(button('JSON этого плана ↓', '', () => exportBlob('cascade-lab-study-' + study.id + '.json', 'application/json;charset=utf-8', JSON.stringify({ schema: ARCHIVE_SCHEMA, schemaVersion: 1, application: { name: 'CASCADE LAB', version: VERSION }, exportedAt: new Date().toISOString(), localOnly: true, uploaded: false, studies: [study] }, null, 2))));
  actions.append(button('Продолжить серию ↻', 'quiet', () => {
    if (typeof window.confirm === 'function' && !window.confirm('Создать новый эксперимент с тем же планом и последней попыткой как новой базой?')) return;
    const repeated = startRepeat(study.id);
    setStatus(repeated ? 'Новый повторный план создан с отдельной базой.' : 'Не удалось создать повтор: нет подходящей базовой попытки.', repeated ? 'ok' : 'error');
  }));
  if (study.status === 'planned' || study.status === 'observing') actions.append(button('Отменить сбор', 'quiet', () => {
    if (typeof window.confirm === 'function' && !window.confirm('Отменить сбор новых наблюдений для этого плана?')) return;
    const archive = readArchive();
    const index = archive.findIndex(item => item.id === study.id);
    if (index >= 0) { archive[index].status = 'cancelled'; archive[index].updatedAt = new Date().toISOString(); writeArchive(archive); render(); setStatus('План отменён; сохранённая история не удалена.', 'ok'); }
  }));
  actions.append(button('Удалить', 'danger', () => {
    if (typeof window.confirm === 'function' && !window.confirm('Удалить этот эксперимент из локального архива? Экспортированный файл не затрагивается.')) return;
    removeStudy(study.id);
    setStatus('Эксперимент удалён из локального архива.', 'ok');
  }));
  card.append(actions);
  const share = make('div', 'ces-social');
  share.setAttribute('aria-label', 'Поделиться кратким итогом эксперимента');
  share.append(make('span', 'ces-chip', 'ПУБЛИЧНЫЙ ТЕКСТ · БЕЗ ЛИЧНЫХ ЗАМЕТОК'));
  for (const [platform, label] of [['telegram','Telegram'],['whatsapp','WhatsApp'],['vk','VK'],['x','X'],['linkedin','LinkedIn']]) {
    const link = make('a', '', label + ' ↗');
    link.href = makeSocialUrl(platform, study);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.addEventListener('click', () => setStatus('Открыта форма публикации. Пост не подтверждается автоматически.', 'ok'));
    share.append(link);
  }
  card.append(share);
  return card;
}
function render() {
  if (!host.isConnected) return;
  reconcile();
  const runs = getRuns();
  const archive = readArchive();
  host.replaceChildren();
  const top = make('div', 'ces-top');
  const intro = make('div');
  intro.append(make('p', 'ces-eyebrow', 'OSGARD PLAY / CASCADE LAB / 0.19.0'));
  const title = make('h3', 'ces-title', 'EXPERIMENT STUDIO');
  title.id = 'ces-title';
  intro.append(title);
  intro.append(make('p', 'ces-lead', 'Фиксируй исходную попытку, заранее формулируй одну перемену и собирай следующие результаты того же протокола. Делись только кратким итогом — личные заметки и полная история не отправляются автоматически.'));
  top.append(intro, make('span', 'ces-local-badge', 'ЛОКАЛЬНЫЙ АРХИВ · БЕЗ АККАУНТА'));
  host.append(top);
  const toolbar = make('div', 'ces-toolbar');
  const jsonButton = button('Экспортировать архив JSON ↓', '', () => exportAllJson());
  const csvButton = button('Экспортировать CSV ↓', '', () => exportAllCsv());
  const importButton = button('Импорт JSON ↑', '', () => fileInput.click());
  const clearButton = button('Очистить архив', 'danger', () => {
    if (typeof window.confirm === 'function' && !window.confirm('Полностью очистить локальный архив экспериментов? Сначала экспортируй его, если он нужен.')) return;
    clearArchive();
    setStatus('Локальный архив очищен.', 'ok');
  });
  toolbar.append(jsonButton, csvButton, importButton, clearButton);
  host.append(toolbar);
  const form = renderForm(runs);
  host.append(form);
  statusNode = make('p', 'ces-status', 'Следи за подходящими попытками в том же игровом режиме. Никакие записи не отправляются с этой панели.');
  statusNode.setAttribute('role', 'status');
  statusNode.setAttribute('aria-live', 'polite');
  host.append(statusNode);
  const privacy = make('p', 'ces-privacy', 'Приватность: история хранится в localStorage этого браузера. Экспорт создаётся по нажатию. Кнопки соцсетей передают только текст сводки и публичный адрес игры; они не публикуют автоматически и не подтверждают репост.');
  privacy.id = 'ces-privacy-copy';
  host.append(privacy);
  const history = make('div', 'ces-history');
  const historyHead = make('div', 'ces-history-heading');
  historyHead.append(make('h4', '', 'ЖУРНАЛ ЭКСПЕРИМЕНТОВ'), make('span', 'ces-count', archive.length + ' / ' + MAX_STUDIES + ' · ' + runs.length + ' записей игровых попыток'));
  history.append(historyHead);
  if (!archive.length) {
    history.append(make('p', 'ces-empty', runs.length < 1 ? 'Сначала пройди один протокол, чтобы записать базовую попытку. Затем сформулируй гипотезу и собери одно или несколько наблюдений.' : 'Архив пока пуст. Выбери уровень и базовую попытку выше, чтобы создать первый контролируемый план.'));
  } else {
    archive.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).forEach(study => history.append(renderStudy(study)));
  }
  host.append(history);
  const fileInput = make('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;
  fileInput.setAttribute('aria-label', 'Выбрать архив Experiment Studio JSON');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { setStatus('Файл больше 512 КБ; импорт отклонён.', 'error'); return; }
    try {
      const payload = JSON.parse(await file.text());
      const result = importArchive(payload);
      setStatus(result.ok ? 'Импортировано новых исследований: ' + result.imported + '. Повторные ID пропущены.' : result.error, result.ok ? 'ok' : 'error');
    } catch {
      setStatus('Не удалось прочитать JSON. Исходный архив не изменён.', 'error');
    }
  });
  host.append(fileInput);
}
const publicApi = Object.freeze({
  version: VERSION,
  schema: STUDY_SCHEMA,
  archiveSchema: ARCHIVE_SCHEMA,
  getStudies: () => clone(readArchive()),
  getRuns: () => clone(getRuns()),
  startStudy,
  reconcile,
  calculateDelta,
  exportPayload: () => clone(archivePayload()),
  importArchive,
  clearArchive
});
try {
  Object.defineProperty(window, 'CASCADELAB019', { value: publicApi, configurable: false, enumerable: false, writable: false });
} catch { window.CASCADELAB019 = publicApi; }
const rows = document.querySelector('.cl-ledger-records');
if (rows && typeof MutationObserver === 'function') {
  new MutationObserver(() => {
    if (renderQueued) return;
    renderQueued = true;
    window.setTimeout(() => { renderQueued = false; render(); }, 0);
  }).observe(rows, { childList: true, subtree: true });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });
window.addEventListener('storage', event => { if (event.key === STORE_KEY) render(); });
render();
})();
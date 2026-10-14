(() => {
'use strict';

const VERSION = '0.26.0';
const SCHEMA = 'osgard.cascade-lab.counterfactual-lab.v1';
const ARCHIVE_SCHEMA = 'osgard.cascade-lab.counterfactual-archive.v1';
const ENGINE_SCHEMA = 'osgard.cascade-lab.counterfactual-engine.v1';
const STORAGE_KEY = ARCHIVE_SCHEMA;
const MAX_BATCHES = 6;
const MAX_TRIALS_PER_BATCH = 8;
const MAX_TOTAL_TRIALS = 48;
const MAX_FRAMES = 142;
const MAX_IMPORT_BYTES = 1024 * 1024;
const MAX_EXPORT_BATCHES = 6;
const TOOLS = Object.freeze({
  spring: 'Пружина', fan: 'Вентилятор', belt: 'Конвейер',
  magnet: 'Магнит', switch: 'Контакт', bumper: 'Отбойник'
});
const IMPROVEMENTS = Object.freeze([
  'fixed-step-engine-adapter', 'triple-run-determinism-check', 'six-point-angle-sensitivity-sweep',
  'leave-one-device-out-ablation', 'observed-scenario-success-share', 'counterfactual-trajectory-delta',
  'validated-local-reproducibility-pack'
]);
const text = (value, limit = 180) => String(value == null ? '' : value).replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const num = (value, fallback = null) => finite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 3) => finite(value) ? Number(value.toFixed(digits)) : null;
const tools = new Set(Object.keys(TOOLS));
const allowedKinds = new Set(['repeatability', 'angle-sweep', 'ablation']);

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
}
function checksum(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').toUpperCase();
}
function normalizeDevice(raw) {
  if (!raw || typeof raw !== 'object' || !tools.has(raw.type)) return null;
  if (!finite(raw.x) || !finite(raw.y) || !finite(raw.angle) || Math.abs(raw.angle) > Math.PI * 64) return null;
  return { type: raw.type, x: round(raw.x, 3), y: round(raw.y, 3), angle: round(raw.angle, 5) };
}
function normalizeFrame(raw) {
  if (!raw || typeof raw !== 'object' || !finite(raw.t) || raw.t < 0 || raw.t > 31 || !finite(raw.x) || !finite(raw.y)) return null;
  if (!finite(raw.vx) || !finite(raw.vy)) return null;
  return {
    t: round(raw.t, 5), x: round(raw.x, 4), y: round(raw.y, 4),
    vx: round(raw.vx, 4), vy: round(raw.vy, 4), gateOpen: raw.gateOpen === true,
    checkpoints: Array.isArray(raw.checkpoints) ? raw.checkpoints.slice(0, 20).map(v => text(v, 80)) : []
  };
}
function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: Number.isInteger(raw.id) ? clamp(raw.id, 0, 100000) : 0,
    t: clamp(num(raw.t, 0), 0, 31),
    type: text(raw.type || 'event', 40),
    label: text(raw.label || raw.type || 'Событие', 140),
    x: round(num(raw.x, 0), 3), y: round(num(raw.y, 0), 3),
    speed: round(num(raw.speed, 0), 3)
  };
}
function normalizeTrial(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.engineSchema !== ENGINE_SCHEMA || !['won', 'lost'].includes(raw.status)) return null;
  if (!Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5) return null;
  const id = text(raw.id, 120), scenarioId = text(raw.scenarioId, 60), label = text(raw.label, 140);
  if (!id || !scenarioId || !label) return null;
  const createdAt = Date.parse(raw.createdAt);
  if (!Number.isFinite(createdAt)) return null;
  const configurationFingerprint = String(raw.configurationFingerprint || '').toUpperCase();
  const resultFingerprint = String(raw.resultFingerprint || '').toUpperCase();
  if (!/^[0-9A-F]{8}$/.test(configurationFingerprint) || !/^[0-9A-F]{8}$/.test(resultFingerprint)) return null;
  const devices = Array.isArray(raw.devices) ? raw.devices.slice(0, 5).map(normalizeDevice) : null;
  const trajectory = Array.isArray(raw.trajectory) ? raw.trajectory.slice(0, MAX_FRAMES).map(normalizeFrame) : null;
  if (!devices || devices.some(d => !d) || !trajectory || trajectory.length < 2 || trajectory.some(p => !p)) return null;
  const t = raw.telemetry && typeof raw.telemetry === 'object' ? raw.telemetry : {};
  const events = Array.isArray(t.events) ? t.events.slice(-64).map(normalizeEvent) : [];
  if (events.some(e => !e)) return null;
  const timeSeconds = num(raw.timeSeconds);
  if (!finite(timeSeconds) || timeSeconds < 0 || timeSeconds > 31) return null;
  const engineVersion = text(raw.engineVersion, 60);
  if (engineVersion !== '0.26.0-fixed-120hz') return null;
  const normalizedTelemetry = {
    distance: clamp(num(t.distance, 0), 0, 1000000),
    peakSpeed: clamp(num(t.peakSpeed, 0), 0, 100000),
    maxHeight: clamp(num(t.maxHeight, 0), 0, 10000),
    contacts: clamp(Number.isInteger(t.contacts) ? t.contacts : 0, 0, 10000),
    impacts: clamp(Number.isInteger(t.impacts) ? t.impacts : 0, 0, 10000),
    activations: clamp(Number.isInteger(t.activations) ? t.activations : 0, 0, 10000),
    lastImpactSpeed: clamp(num(t.lastImpactSpeed, 0), 0, 100000),
    events
  };
  const reason = text(raw.reason || '', 240);
  const gateOpen = raw.gateOpen === true;
  const checkpointsReached = Array.isArray(raw.checkpointsReached) ? raw.checkpointsReached.slice(0, 20).map(v => text(v, 80)).sort() : [];
  const stableDevices = devices.map(d => ({ type: d.type, x: d.x, y: d.y, angle: d.angle }));
  const expectedConfiguration = checksum(canonicalize({ levelId: raw.levelId, devices: stableDevices }));
  if (expectedConfiguration !== configurationFingerprint) return null;
  const stableResult = {
    schema: ENGINE_SCHEMA, engineVersion, levelId: raw.levelId, status: raw.status, reason,
    timeSeconds: round(timeSeconds, 5), gateOpen, checkpointsReached, telemetry: normalizedTelemetry, trajectory
  };
  const expectedResult = checksum(canonicalize({ configurationFingerprint, ...stableResult }));
  if (expectedResult !== resultFingerprint) return null;
  return {
    schema: SCHEMA, engineSchema: ENGINE_SCHEMA, id, scenarioId, label,
    kind: allowedKinds.has(raw.kind) ? raw.kind : 'repeatability',
    createdAt: new Date(createdAt).toISOString(),
    levelId: raw.levelId, levelTitle: text(raw.levelTitle || ('Протокол #' + raw.levelId), 120),
    engineVersion, status: raw.status, reason, timeSeconds: round(timeSeconds, 5),
    par: Number.isInteger(raw.par) ? clamp(raw.par, 0, 12) : null,
    parTime: finite(raw.parTime) ? clamp(raw.parTime, 0, 120) : null,
    deviceCount: Number.isInteger(raw.deviceCount) ? clamp(raw.deviceCount, 0, 5) : devices.length,
    gateOpen, checkpointsReached, telemetry: normalizedTelemetry, devices, trajectory,
    stepCount: clamp(Number.isInteger(raw.stepCount) ? raw.stepCount : 0, 0, 3600),
    frameCount: trajectory.length, configurationFingerprint, resultFingerprint,
    fingerprintAlgorithm: 'FNV-1a-32 (reproducibility checksum, not a cryptographic signature)'
  };
}
function pathPointAt(path, fraction) {
  if (!Array.isArray(path) || path.length < 2) return null;
  const target = clamp(fraction, 0, 1) * (path.length - 1);
  const left = Math.floor(target), right = Math.min(path.length - 1, left + 1), alpha = target - left;
  const a = path[left], b = path[right];
  return { x: a.x + (b.x - a.x) * alpha, y: a.y + (b.y - a.y) * alpha };
}
function compareTrials(baseline, candidate) {
  if (!baseline || !candidate || baseline.levelId !== candidate.levelId) return null;
  const deviations = [];
  for (let i = 0; i <= 30; i++) {
    const a = pathPointAt(baseline.trajectory, i / 30);
    const b = pathPointAt(candidate.trajectory, i / 30);
    if (a && b) deviations.push(Math.hypot(a.x - b.x, a.y - b.y));
  }
  const statusTransition = baseline.status === candidate.status ? 'unchanged' : candidate.status === 'won' ? 'recovered' : 'regressed';
  const difference = (a, b) => finite(a) && finite(b) ? round(a - b, 3) : null;
  return {
    statusTransition,
    timeDeltaSeconds: difference(candidate.timeSeconds, baseline.timeSeconds),
    peakSpeedDelta: difference(candidate.telemetry.peakSpeed, baseline.telemetry.peakSpeed),
    impactSpeedDelta: difference(candidate.telemetry.lastImpactSpeed, baseline.telemetry.lastImpactSpeed),
    travelledDistanceDelta: difference(candidate.telemetry.distance, baseline.telemetry.distance),
    activationsDelta: difference(candidate.telemetry.activations, baseline.telemetry.activations),
    gateTransition: baseline.gateOpen === candidate.gateOpen ? 'unchanged' : candidate.gateOpen ? 'opened' : 'closed',
    meanPathDeviationPx: deviations.length ? round(deviations.reduce((sum, value) => sum + value, 0) / deviations.length, 2) : null,
    maxPathDeviationPx: deviations.length ? round(Math.max(...deviations), 2) : null,
    resultFingerprintEqual: baseline.resultFingerprint === candidate.resultFingerprint
  };
}
function summarizeBatch(rawTrials, kind, planned = rawTrials.length) {
  const trials = rawTrials.map(normalizeTrial).filter(Boolean);
  const total = trials.length, wins = trials.filter(t => t.status === 'won').length, losses = total - wins;
  const baseline = trials[0] || null;
  const comparisons = baseline ? trials.slice(1).map(t => ({ id: t.id, label: t.label, ...compareTrials(baseline, t) })) : [];
  const times = trials.map(t => t.timeSeconds).sort((a, b) => a - b);
  const medianTimeSeconds = !times.length ? null : round(times.length % 2 ? times[(times.length - 1) / 2] : (times[times.length / 2 - 1] + times[times.length / 2]) / 2, 3);
  const failureModes = Object.create(null);
  for (const trial of trials) if (trial.status !== 'won') {
    const reason = trial.reason || 'Неуточнённая причина';
    failureModes[reason] = (failureModes[reason] || 0) + 1;
  }
  const fingerprints = trials.map(t => t.resultFingerprint);
  return {
    kind, completedTrials: total, plannedTrials: clamp(planned, total, MAX_TRIALS_PER_BATCH),
    successCount: wins, failureCount: losses,
    observedSuccessSharePct: total ? round(wins / total * 100, 1) : null,
    medianTimeSeconds, baselineStatus: baseline ? baseline.status : null,
    statusTransitions: comparisons.filter(c => c.statusTransition !== 'unchanged').length,
    largestMeanPathDeviationPx: comparisons.reduce((m, c) => finite(c.meanPathDeviationPx) ? Math.max(m, c.meanPathDeviationPx) : m, 0),
    failureModes,
    deterministicIdentical: kind === 'repeatability' && total >= 2 && fingerprints.every(hash => hash === fingerprints[0]),
    comparisons
  };
}
function buildAngleSweep(blueprint, selectedUid) {
  if (!blueprint || !Array.isArray(blueprint.devices)) return { ok: false, error: 'Сначала обнови схему.' };
  const index = blueprint.devices.findIndex(d => d.uid === selectedUid);
  if (index < 0) return { ok: false, error: 'Выбери устройство из текущей схемы.' };
  const baseline = blueprint.devices.map(d => ({ type: d.type, x: d.x, y: d.y, angle: d.angle }));
  const scenarios = [{ id: 'baseline', label: 'Базовая схема', devices: baseline }];
  for (const degrees of [-45, -30, -15, 15, 30, 45]) {
    const devices = baseline.map(d => ({ ...d }));
    devices[index].angle = ((devices[index].angle + degrees * Math.PI / 180) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    scenarios.push({ id: 'angle-' + (degrees > 0 ? '+' : '') + degrees, label: 'Угол ' + (degrees > 0 ? '+' : '') + degrees + '° · ' + TOOLS[devices[index].type], devices });
  }
  return { ok: true, kind: 'angle-sweep', scenarios, selectedIndex: index, selectedDevice: TOOLS[blueprint.devices[index].type] };
}
function buildAblationSweep(blueprint) {
  if (!blueprint || !Array.isArray(blueprint.devices)) return { ok: false, error: 'Сначала обнови схему.' };
  const base = blueprint.devices.map(d => ({ type: d.type, x: d.x, y: d.y, angle: d.angle }));
  const scenarios = [{ id: 'baseline', label: 'Базовая схема', devices: base }];
  for (let i = 0; i < base.length; i++) {
    const devices = base.filter((_, index) => index !== i).map(d => ({ ...d }));
    scenarios.push({ id: 'without-' + i, label: 'Без детали ' + (i + 1) + ' · ' + TOOLS[base[i].type], devices, removedIndex: i });
  }
  return { ok: true, kind: 'ablation', scenarios };
}
function buildRepeatability(blueprint) {
  const devices = (blueprint.devices || []).map(d => ({ type: d.type, x: d.x, y: d.y, angle: d.angle }));
  return { ok: true, kind: 'repeatability', scenarios: [1, 2, 3].map(i => ({ id: 'repeat-' + i, label: 'Точный повтор ' + i + ' / 3', devices: devices.map(d => ({ ...d })) })) };
}
function normalizeBatch(raw) {
  if (!raw || typeof raw !== 'object' || !text(raw.id, 120) || !allowedKinds.has(raw.kind)) return null;
  const createdAt = Date.parse(raw.createdAt);
  if (!Number.isFinite(createdAt) || !Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5) return null;
  if (!Array.isArray(raw.trials) || raw.trials.length < 1 || raw.trials.length > MAX_TRIALS_PER_BATCH) return null;
  const trials = raw.trials.map(normalizeTrial);
  if (trials.some(trial => !trial || trial.levelId !== raw.levelId || trial.kind !== raw.kind)) return null;
  if (new Set(trials.map(t => t.id)).size !== trials.length || new Set(trials.map(t => t.scenarioId)).size !== trials.length) return null;
  const planned = Number.isInteger(raw.plannedTrials) ? clamp(raw.plannedTrials, trials.length, MAX_TRIALS_PER_BATCH) : trials.length;
  return {
    id: text(raw.id, 120), kind: raw.kind, createdAt: new Date(createdAt).toISOString(),
    levelId: raw.levelId, levelTitle: text(raw.levelTitle || trials[0].levelTitle, 120),
    selectedDevice: text(raw.selectedDevice || '', 60), partial: raw.partial === true,
    plannedTrials: planned, trials,
    summary: summarizeBatch(trials, raw.kind, planned)
  };
}
function validateArchive(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== ARCHIVE_SCHEMA || raw.schemaVersion !== 1 || !Array.isArray(raw.batches)) {
    return { ok: false, reason: 'Неизвестная схема архива.' };
  }
  if (raw.batches.length > MAX_BATCHES) return { ok: false, reason: 'Архив превышает лимит ' + MAX_BATCHES + ' серий.' };
  if (JSON.stringify(raw).length > MAX_IMPORT_BYTES) return { ok: false, reason: 'Размер архива превышает 1 MiB.' };
  const batches = raw.batches.map(normalizeBatch);
  if (batches.some(batch => !batch)) return { ok: false, reason: 'Одна или несколько серий не прошли проверку.' };
  if (new Set(batches.map(b => b.id)).size !== batches.length) return { ok: false, reason: 'Повторяется ID серии.' };
  const allTrials = batches.flatMap(b => b.trials);
  if (allTrials.length > MAX_TOTAL_TRIALS) return { ok: false, reason: 'Архив превышает лимит ' + MAX_TOTAL_TRIALS + ' сценариев.' };
  if (new Set(allTrials.map(t => t.id)).size !== allTrials.length) return { ok: false, reason: 'Повторяется ID сценария.' };
  return {
    ok: true,
    archive: {
      schema: ARCHIVE_SCHEMA, schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      batches: batches.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    }
  };
}
const pureApi = Object.freeze({
  version: VERSION, schema: SCHEMA, archiveSchema: ARCHIVE_SCHEMA, engineSchema: ENGINE_SCHEMA,
  improvements: IMPROVEMENTS, compareTrials, summarizeBatch, buildAngleSweep, buildAblationSweep, buildRepeatability,
  normalizeTrial, normalizeBatch, validateArchive, checksum, canonicalize,
  maxBatches: MAX_BATCHES, maxTrialsPerBatch: MAX_TRIALS_PER_BATCH, maxTotalTrials: MAX_TOTAL_TRIALS,
  maxFrames: MAX_FRAMES, maxImportBytes: MAX_IMPORT_BYTES
});
if (typeof window === 'undefined' || !window.document) {
  globalThis.__CASCADELAB026_TEST__ = pureApi;
  return;
}
if (window.CASCADELAB026) return;

const engine = window.CASCADELAB026_ENGINE;
const make = (tag, className, value) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = String(value);
  return element;
};
const $ = selector => document.querySelector(selector);
const deviceName = type => TOOLS[type] || text(type, 40);
const signed = value => value == null ? '—' : (value > 0 ? '+' : '') + String(round(value, 2)).replace('.', ',');
const style = document.createElement('style');
style.dataset.cascadeLabCounterfactual = VERSION;
style.textContent = [
  '.cl-cf{margin:20px 0 24px;padding:clamp(14px,2vw,22px);border:1px solid #8bd7f238;border-radius:16px;background:radial-gradient(ellipse at 92% 0%,#167ca01f,transparent 46%),linear-gradient(145deg,#091924,#050d15);color:#e8f3f8;box-shadow:0 18px 42px #0003,inset 0 1px #ffffff0a}',
  '.cl-cf-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.cl-cf-kicker{margin:0;color:#68d7ff;font:8px ui-monospace,monospace;letter-spacing:.16em}.cl-cf-version{padding:4px 7px;border:1px solid #e9ba6a4c;border-radius:4px;color:#e9ba6a;font:8px ui-monospace,monospace}',
  '.cl-cf h2{margin:10px 0 5px;font:500 clamp(25px,3vw,37px)/1.07 system-ui,sans-serif;letter-spacing:-.045em;color:#f4f8fb}.cl-cf-lead{max-width:1000px;margin:8px 0 14px;color:#a5bbc8;font-size:10px;line-height:1.7}.cl-cf-caution{padding:9px 11px;border-left:2px solid #e9ba6a;border-radius:0 7px 7px 0;background:#e9ba6a0a;color:#b9c9d2;font-size:9px;line-height:1.65}',
  '.cl-cf-toolbar{display:flex;align-items:end;gap:8px;flex-wrap:wrap;margin-top:14px}.cl-cf-field{display:grid;gap:5px;min-width:190px;flex:1}.cl-cf-field label{color:#7897a8;font:8px ui-monospace,monospace;letter-spacing:.07em}.cl-cf-select{width:100%;min-height:37px;padding:8px 10px;border:1px solid #7cbcd333;border-radius:8px;background:#06121c;color:#e8f3f8;font:10px system-ui,sans-serif}.cl-cf-select:focus-visible,.cl-cf-btn:focus-visible{outline:2px solid #8de4ff;outline-offset:3px}',
  '.cl-cf-btn{min-height:37px;padding:8px 11px;border:1px solid #7cc9e640;border-radius:8px;background:#0b2432;color:#b8eaff;font:750 9px system-ui,sans-serif;cursor:pointer}.cl-cf-btn.primary{border-color:#e9ba6a;background:linear-gradient(120deg,#f5d28d,#d89b42);color:#211808}.cl-cf-btn.danger{border-color:#ff9b8b55;background:#2a1519;color:#ffb6a5}.cl-cf-btn:disabled{opacity:.45;cursor:not-allowed}',
  '.cl-cf-progress{display:none;margin-top:12px}.cl-cf-progress[aria-hidden=false]{display:block}.cl-cf-progress progress{display:block;width:100%;height:5px;accent-color:#68d7ff}.cl-cf-status{min-height:20px;margin:8px 0 0;color:#89e2ff;font-size:9px;line-height:1.5}.cl-cf-status[data-kind=error]{color:#ffafa2}',
  '.cl-cf-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:14px}.cl-cf-metric{min-width:0;padding:10px;border:1px solid #82bdcf27;border-radius:9px;background:#06121b}.cl-cf-metric span{display:block;color:#7193a5;font:7px ui-monospace,monospace;letter-spacing:.08em}.cl-cf-metric b{display:block;margin-top:6px;color:#edf8ff;font:600 clamp(16px,2vw,23px)/1.15 system-ui,sans-serif;overflow-wrap:anywhere}.cl-cf-metric small{display:block;margin-top:5px;color:#688293;font-size:8px;line-height:1.45}',
  '.cl-cf-results{margin-top:12px;border:1px solid #84bbcf25;border-radius:10px;overflow:hidden}.cl-cf-results-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 11px;background:#0b1d29;color:#95b7c8;font:8px ui-monospace,monospace;letter-spacing:.09em}.cl-cf-row{display:grid;grid-template-columns:minmax(100px,1.4fr) repeat(4,minmax(50px,.7fr));gap:8px;align-items:center;padding:9px 11px;border-top:1px solid #8bb7cb16;background:#06111a;font-size:9px}.cl-cf-row:nth-child(odd){background:#081722}.cl-cf-row span{min-width:0;overflow-wrap:anywhere}.cl-cf-row .cf-main{color:#dcebf2}.cl-cf-row .cf-muted{color:#7e9baa;font:8px ui-monospace,monospace}.cl-cf-row .cf-won{color:#79e5bd}.cl-cf-row .cf-lost{color:#ffb09d}',
  '.cl-cf-archive{display:grid;gap:6px;margin-top:10px}.cl-cf-archive-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px;border:1px solid #86b7ca21;border-radius:8px;background:#06111a}.cl-cf-archive-item strong{display:block;color:#dbeaf1;font-size:9px}.cl-cf-archive-item small{display:block;margin-top:4px;color:#6e8d9c;font:7px/1.5 ui-monospace,monospace}.cl-cf-archive-actions{display:flex;gap:5px;flex-wrap:wrap}.cl-cf-archive-actions button{min-height:30px;padding:5px 8px;border:1px solid #7cc9e633;border-radius:6px;background:#0a202c;color:#b5e7f8;font-size:8px}',
  '.cl-cf-empty{padding:14px;color:#6f8d9c;font-size:9px;line-height:1.6}.cl-cf-foot{margin:11px 0 0;color:#5f7f90;font:7px/1.65 ui-monospace,monospace}.cl-cf-privacy{color:#74c5d8}',
  '@media(max-width:700px){.cl-cf{padding:13px;border-radius:12px}.cl-cf-toolbar{display:grid;grid-template-columns:1fr 1fr}.cl-cf-field{grid-column:1/-1;min-width:0}.cl-cf-btn{min-height:42px;width:100%}.cl-cf-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-cf-row{grid-template-columns:minmax(0,1fr) minmax(65px,.7fr) minmax(65px,.7fr);gap:6px;padding:8px}.cl-cf-row .cf-hide-mobile{display:none}.cl-cf-archive-item{grid-template-columns:1fr}.cl-cf-archive-actions{justify-content:flex-start}}',
  '@media(prefers-reduced-motion:reduce){.cl-cf *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}'
].join('');
document.head.append(style);

const host = make('section', 'cl-cf');
host.setAttribute('aria-labelledby', 'cl-cf-title');
const header = make('div', 'cl-cf-head');
header.append(make('p', 'cl-cf-kicker', 'CASCADE LAB / COUNTERFACTUAL ROBUSTNESS'));
header.append(make('span', 'cl-cf-version', 'MODEL ENGINE ' + VERSION));
host.append(header, make('h2', '', 'Проверь схему до следующего запуска.'));
host.querySelector('h2').id = 'cl-cf-title';
host.append(make('p', 'cl-cf-lead', 'Локальная лаборатория контрфактических испытаний. Она повторно запускает тот же фиксированный физический движок на копиях схемы — не меняя текущую сборку, прогресс или физику игры.'));

const caveat = make('p', 'cl-cf-caution', 'Границы вывода: проценты ниже — доля успешных сценариев в выбранной тестовой сетке, а не вероятность успеха в реальном мире. Чек-сумма предназначена для проверки повторяемости, не является криптографической подписью. Анализ не отправляет данные на сервер.');
host.append(caveat);

const toolbar = make('div', 'cl-cf-toolbar');
const deviceField = make('div', 'cl-cf-field');
deviceField.append(make('label', '', 'УСТРОЙСТВО ДЛЯ ПРОВЕРКИ УГЛА'));
const deviceSelect = make('select', 'cl-cf-select');
deviceSelect.setAttribute('aria-label', 'Устройство для анализа чувствительности');
deviceField.append(deviceSelect);
toolbar.append(deviceField);
const refreshButton = make('button', 'cl-cf-btn', 'Обновить схему');
refreshButton.type = 'button';
const repeatButton = make('button', 'cl-cf-btn', 'Проверить повторяемость ×3');
repeatButton.type = 'button';
const angleButton = make('button', 'cl-cf-btn primary', 'Проверить углы ±15/30/45°');
angleButton.type = 'button';
const ablationButton = make('button', 'cl-cf-btn', 'Проверить без одной детали');
ablationButton.type = 'button';
const cancelButton = make('button', 'cl-cf-btn danger', 'Отменить серию');
cancelButton.type = 'button'; cancelButton.disabled = true;
const exportButton = make('button', 'cl-cf-btn', 'Экспорт JSON');
exportButton.type = 'button';
const importButton = make('button', 'cl-cf-btn', 'Импорт архива');
importButton.type = 'button';
const clearButton = make('button', 'cl-cf-btn danger', 'Очистить архив');
clearButton.type = 'button';
const fileInput = document.createElement('input');
fileInput.type = 'file'; fileInput.accept = 'application/json,.json'; fileInput.hidden = true;
toolbar.append(refreshButton, repeatButton, angleButton, ablationButton, cancelButton, exportButton, importButton, clearButton);
host.append(toolbar, fileInput);

const progress = make('div', 'cl-cf-progress');
progress.setAttribute('aria-hidden', 'true');
const progressBar = document.createElement('progress');
progressBar.max = 1; progressBar.value = 0;
progress.append(progressBar);
host.append(progress);
const status = make('p', 'cl-cf-status');
status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
host.append(status);

const metrics = make('div', 'cl-cf-metrics');
const metricNodes = [];
for (const [label, hint] of [
  ['СЦЕНАРИЕВ', 'Завершено / запланировано'],
  ['ДОЛЯ УСПЕХА', 'Только для этой тестовой сетки'],
  ['ПЕРЕХОДЫ ИСХОДА', 'Успех ↔ неудача относительно базы'],
  ['ОТКЛОНЕНИЕ ТРАЕКТОРИИ', 'Максимальное среднее, px']
]) {
  const card = make('div', 'cl-cf-metric');
  card.append(make('span', '', label));
  const value = make('b', '', '—');
  const note = make('small', '', hint);
  card.append(value, note); metrics.append(card);
  metricNodes.push({ value, note });
}
host.append(metrics);
const resultsPanel = make('section', 'cl-cf-results');
const resultsHead = make('header', 'cl-cf-results-head');
resultsHead.append(make('span', '', 'СРАВНЕНИЕ С БАЗОВОЙ СХЕМОЙ'));
resultsHead.append(make('span', '', 'ЛОКАЛЬНО · 120 HZ'));
resultsPanel.append(resultsHead);
const trialRows = make('div', 'cl-cf-trial-rows');
resultsPanel.append(trialRows);
host.append(resultsPanel);
const archiveHeading = make('div', 'cl-cf-results-head');
archiveHeading.style.marginTop = '14px';
archiveHeading.append(make('span', '', 'ЛОКАЛЬНЫЙ АРХИВ ИСПЫТАНИЙ'));
archiveHeading.append(make('span', '', 'MAX ' + MAX_BATCHES + ' СЕРИЙ'));
host.append(archiveHeading);
const archiveList = make('div', 'cl-cf-archive');
host.append(archiveList);
host.append(make('p', 'cl-cf-foot', 'ТЕХНИЧЕСКИЙ КОНТРАКТ · ФИКСИРОВАННЫЙ ШАГ 1/120 С · ДО 142 КАДРОВ НА СЦЕНАРИЙ · ДО 8 СЦЕНАРИЕВ НА СЕРИЮ'));
host.append(make('p', 'cl-cf-foot cl-cf-privacy', 'Память браузера может быть очищена настройками устройства. Экспортируй архив для резервной копии.'));

const insertion = document.querySelector('.bottom-grid') || document.querySelector('.app-footer') || document.querySelector('footer');
if (insertion && typeof insertion.after === 'function') insertion.after(host);
else if (insertion && typeof insertion.before === 'function') insertion.before(host);
else return;

let batches = loadStoredBatches();
let selectedBatchId = batches[0] ? batches[0].id : null;
let running = false;
let runToken = 0;
let lastBlueprint = null;

function archiveDocument(source = batches) {
  return { schema: ARCHIVE_SCHEMA, schemaVersion: 1, exportedAt: new Date().toISOString(), batches: source };
}
function loadStoredBatches() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const checked = validateArchive(parsed);
    return checked.ok ? checked.archive.batches : [];
  } catch { return []; }
}
function persist() {
  batches = batches.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, MAX_BATCHES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(archiveDocument()));
    status.dataset.kind = 'success'; status.textContent = 'Архив сохранён локально. Сетевой передачи нет.';
  } catch {
    status.dataset.kind = 'error'; status.textContent = 'Браузер не разрешил хранение. Экспортируй серию JSON перед закрытием страницы.';
  }
}
function download(filename, type, data) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.hidden = true;
  host.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
function refreshBlueprint() {
  if (!engine || typeof engine.currentBlueprint !== 'function') {
    status.dataset.kind = 'error'; status.textContent = 'Физический движок не выставил API v0.26. Проверь загрузку игровой страницы.'; return null;
  }
  const setup = engine.currentBlueprint();
  if (!setup || !Number.isInteger(setup.levelId) || !Array.isArray(setup.devices)) {
    status.dataset.kind = 'error'; status.textContent = 'Текущая схема недоступна.'; return null;
  }
  lastBlueprint = setup;
  const previous = deviceSelect.value;
  deviceSelect.replaceChildren();
  setup.devices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.uid;
    option.textContent = (index + 1) + '. ' + deviceName(device.type) + ' · ' + Math.round(device.angle * 180 / Math.PI) + '°';
    deviceSelect.append(option);
  });
  if ([...deviceSelect.options].some(option => option.value === previous)) deviceSelect.value = previous;
  const levelName = setup.levelTitle || ('Протокол #' + setup.levelId);
  status.dataset.kind = 'success';
  status.textContent = levelName + ' · ' + setup.devices.length + '/' + setup.capacity + ' устройств. Контрфактические прогоны не меняют исходную сборку.';
  repeatButton.disabled = running;
  angleButton.disabled = running || setup.devices.length === 0;
  ablationButton.disabled = running || setup.devices.length === 0;
  return setup;
}
function setBusy(value, max = 1) {
  running = value;
  progress.setAttribute('aria-hidden', value ? 'false' : 'true');
  progressBar.max = Math.max(1, max);
  if (!value) progressBar.value = 0;
  cancelButton.disabled = !value;
  repeatButton.disabled = value;
  refreshButton.disabled = value;
  angleButton.disabled = value || !lastBlueprint || lastBlueprint.devices.length === 0;
  ablationButton.disabled = value || !lastBlueprint || lastBlueprint.devices.length === 0;
  exportButton.disabled = value || batches.length === 0;
  importButton.disabled = value;
  clearButton.disabled = value || batches.length === 0;
}
function makeBatchId() {
  return 'cf-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}
function buildScenarioBatch(kind, setup) {
  if (kind === 'repeatability') return buildRepeatability(setup);
  if (kind === 'angle-sweep') return buildAngleSweep(setup, deviceSelect.value);
  if (kind === 'ablation') return buildAblationSweep(setup);
  return { ok: false, error: 'Неизвестный тип серии.' };
}
function scenarioToTrial(raw, batchId, scenario, kind, createdAt) {
  return normalizeTrial({
    ...raw, engineSchema: raw.schema, id: batchId + '-t' + (scenario.index + 1),
    scenarioId: scenario.id, label: scenario.label, kind, createdAt
  });
}
async function runBatch(kind) {
  if (running) return;
  const setup = refreshBlueprint();
  if (!setup) return;
  if (!engine || typeof engine.runTrial !== 'function' || engine.schema !== ENGINE_SCHEMA) {
    status.dataset.kind = 'error'; status.textContent = 'Совместимость ядра не подтверждена: нужен Counterfactual Engine v0.26.'; return;
  }
  const plan = buildScenarioBatch(kind, setup);
  if (!plan.ok) { status.dataset.kind = 'error'; status.textContent = plan.error; return; }
  if (!plan.scenarios.length || plan.scenarios.length > MAX_TRIALS_PER_BATCH) {
    status.dataset.kind = 'error'; status.textContent = 'Серия выходит за установленный лимит сценариев.'; return;
  }
  const token = ++runToken, batchId = makeBatchId(), createdAt = new Date().toISOString();
  const trials = [];
  let cancelled = false;
  setBusy(true, plan.scenarios.length);
  status.dataset.kind = 'success';
  for (let i = 0; i < plan.scenarios.length; i++) {
    if (token !== runToken) { cancelled = true; break; }
    const scenario = plan.scenarios[i];
    status.textContent = 'Сценарий ' + (i + 1) + '/' + plan.scenarios.length + ': ' + scenario.label + '…';
    progressBar.value = i;
    await new Promise(resolve => window.setTimeout(resolve, 0));
    if (token !== runToken) { cancelled = true; break; }
    const result = engine.runTrial({ levelId: setup.levelId, devices: scenario.devices });
    if (!result || result.ok !== true) {
      status.dataset.kind = 'error';
      status.textContent = 'Сценарий остановлен: ' + text(result && result.error || 'физический движок вернул некорректный ответ', 220);
      cancelled = true; break;
    }
    scenario.index = i;
    const trial = scenarioToTrial(result, batchId, scenario, kind, new Date().toISOString());
    if (!trial) {
      status.dataset.kind = 'error'; status.textContent = 'Сценарий не прошёл проверку схемы результата.'; cancelled = true; break;
    }
    trials.push(trial);
    const partialSummary = summarizeBatch(trials, kind, plan.scenarios.length);
    metricNodes[0].value.textContent = trials.length + ' / ' + plan.scenarios.length;
    metricNodes[1].value.textContent = partialSummary.observedSuccessSharePct + '%';
    metricNodes[2].value.textContent = String(partialSummary.statusTransitions);
    metricNodes[3].value.textContent = partialSummary.largestMeanPathDeviationPx.toFixed(1) + ' px';
    progressBar.value = i + 1;
  }
  if (trials.length) {
    const batch = normalizeBatch({
      id: batchId, kind, createdAt, levelId: setup.levelId, levelTitle: setup.levelTitle,
      selectedDevice: plan.selectedDevice || '',
      partial: cancelled || trials.length !== plan.scenarios.length,
      plannedTrials: plan.scenarios.length, trials
    });
    if (batch) {
      batches.unshift(batch); batches = batches.slice(0, MAX_BATCHES);
      selectedBatchId = batch.id;
      persist(); renderBatch(batch); renderArchive();
    }
  }
  setBusy(false);
  if (cancelled && trials.length) {
    status.dataset.kind = 'error'; status.textContent = 'Серия остановлена после ' + trials.length + ' сценариев. Частичный результат сохранён с явной отметкой.';
  } else if (cancelled) {
    status.dataset.kind = 'error'; status.textContent = status.textContent || 'Серия отменена до первого сценария.';
  } else {
    const summary = summarizeBatch(trials, kind, plan.scenarios.length);
    if (kind === 'repeatability') {
      status.textContent = summary.deterministicIdentical
        ? 'Проверка повторяемости пройдена: все три запуска совпали по результатному отпечатку.'
        : 'Три запуска завершены, но отпечатки отличаются. Проверь входную схему и изменения модели.';
      status.dataset.kind = summary.deterministicIdentical ? 'success' : 'error';
    } else {
      status.dataset.kind = 'success';
      status.textContent = 'Серия завершена. Доля успеха относится только к проверенным игровым сценариям; это не вероятность реального результата.';
    }
  }
}
function renderMetrics(batch) {
  const s = batch.summary;
  metricNodes[0].value.textContent = s.completedTrials + ' / ' + s.plannedTrials;
  metricNodes[0].note.textContent = batch.partial ? 'Частичная серия' : 'Завершено / запланировано';
  metricNodes[1].value.textContent = s.observedSuccessSharePct == null ? '—' : s.observedSuccessSharePct + '%';
  metricNodes[2].value.textContent = String(s.statusTransitions);
  metricNodes[3].value.textContent = s.largestMeanPathDeviationPx.toFixed(1) + ' px';
}
function renderBatch(batch) {
  if (!batch) {
    trialRows.replaceChildren(make('p', 'cl-cf-empty', 'Пока нет локальных результатов. Обнови схему и запусти одну из проверок.'));
    metricNodes.forEach(node => { node.value.textContent = '—'; });
    return;
  }
  selectedBatchId = batch.id;
  renderMetrics(batch);
  resultsHead.firstChild.textContent = 'СЕРИЯ: ' + batch.kind.toUpperCase() + ' · ' + batch.levelTitle;
  resultsHead.lastChild.textContent = batch.partial ? 'ЧАСТИЧНЫЙ РЕЗУЛЬТАТ' : 'FNV-1A / LOCAL';
  trialRows.replaceChildren();
  const headers = make('div', 'cl-cf-row');
  headers.append(make('span', 'cf-main', 'СЦЕНАРИЙ'), make('span', 'cf-muted', 'ИСХОД'), make('span', 'cf-muted cf-hide-mobile', 'ВРЕМЯ'), make('span', 'cf-muted', 'Δ ПУТЬ'), make('span', 'cf-muted cf-hide-mobile', 'Δ ВРЕМЯ'));
  trialRows.append(headers);
  const base = batch.trials[0];
  for (let index = 0; index < batch.trials.length; index++) {
    const trial = batch.trials[index];
    const comparison = index === 0 ? null : compareTrials(base, trial);
    const row = make('div', 'cl-cf-row');
    row.append(make('span', 'cf-main', trial.label));
    const outcome = make('span', trial.status === 'won' ? 'cf-won' : 'cf-lost', trial.status === 'won' ? '✓ Доставлено' : '× Отказ');
    row.append(outcome);
    row.append(make('span', 'cf-muted cf-hide-mobile', trial.timeSeconds.toFixed(2) + ' с'));
    row.append(make('span', 'cf-muted', comparison && finite(comparison.meanPathDeviationPx) ? comparison.meanPathDeviationPx.toFixed(1) + ' px' : 'BASE'));
    row.append(make('span', 'cf-muted cf-hide-mobile', comparison ? signed(comparison.timeDeltaSeconds) + ' с' : '—'));
    trialRows.append(row);
    const detail = make('div', 'cl-cf-row');
    detail.style.gridTemplateColumns = 'minmax(0,1fr)';
    detail.append(make('span', 'cf-muted', 'Конфигурация ' + trial.configurationFingerprint + ' · Результат ' + trial.resultFingerprint +
      ' · скорость ' + Math.round(trial.telemetry.peakSpeed) + ' px/s · удар ' + Math.round(trial.telemetry.lastImpactSpeed) +
      ' px/s · ' + trial.frameCount + ' точек · ' + trial.stepCount + ' шагов'));
    trialRows.append(detail);
  }
}
function renderArchive() {
  archiveList.replaceChildren();
  if (!batches.length) {
    archiveList.append(make('p', 'cl-cf-empty', 'Архив пуст. Результаты сохраняются только в этом браузере.'));
    exportButton.disabled = true; clearButton.disabled = true; return;
  }
  for (const batch of batches) {
    const row = make('article', 'cl-cf-archive-item');
    const copy = make('div');
    copy.append(make('strong', '', batch.levelTitle + ' · ' + batch.kind));
    copy.append(make('small', '', new Date(batch.createdAt).toLocaleString() + ' · ' + batch.summary.completedTrials + '/' + batch.summary.plannedTrials +
      ' сценариев · успехи ' + batch.summary.successCount + ' · ' + (batch.partial ? 'ЧАСТИЧНО' : 'ПОЛНАЯ СЕРИЯ')));
    const actions = make('div', 'cl-cf-archive-actions');
    const open = make('button', '', 'Показать');
    open.type = 'button'; open.addEventListener('click', () => renderBatch(batch));
    const remove = make('button', '', 'Удалить');
    remove.type = 'button'; remove.addEventListener('click', () => {
      batches = batches.filter(item => item.id !== batch.id);
      if (selectedBatchId === batch.id) selectedBatchId = batches[0] ? batches[0].id : null;
      persist(); renderArchive(); renderBatch(batches.find(item => item.id === selectedBatchId) || null);
    });
    actions.append(open, remove); row.append(copy, actions); archiveList.append(row);
  }
  exportButton.disabled = running;
  clearButton.disabled = running || !batches.length;
}
function exportArchive() {
  if (!batches.length) return;
  const payload = archiveDocument();
  const checked = validateArchive(payload);
  if (!checked.ok) { status.dataset.kind = 'error'; status.textContent = 'Архив не прошёл самопроверку; экспорт остановлен.'; return; }
  download('cascade-lab-counterfactual-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json;charset=utf-8', JSON.stringify(payload, null, 2));
  status.dataset.kind = 'success'; status.textContent = 'JSON-архив экспортирован по явному нажатию. Передачи на сервер нет.';
}
function importArchive(file) {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) { status.dataset.kind = 'error'; status.textContent = 'Файл больше 1 MiB.'; return; }
  const reader = new FileReader();
  reader.onerror = () => { status.dataset.kind = 'error'; status.textContent = 'Не удалось прочитать файл.'; };
  reader.onload = () => {
    try {
      const checked = validateArchive(JSON.parse(String(reader.result || '')));
      if (!checked.ok) throw new Error(checked.reason);
      const merged = [...checked.archive.batches, ...batches];
      const seen = new Set();
      batches = merged.filter(batch => !seen.has(batch.id) && seen.add(batch.id))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, MAX_BATCHES);
      const allTrials = batches.flatMap(batch => batch.trials);
      if (allTrials.length > MAX_TOTAL_TRIALS) {
        let count = 0;
        batches = batches.map(batch => {
          const room = Math.max(0, MAX_TOTAL_TRIALS - count);
          const clipped = batch.trials.slice(0, room);
          count += clipped.length;
          return clipped.length ? normalizeBatch({ ...batch, trials: clipped, plannedTrials: Math.max(clipped.length, batch.plannedTrials), partial: batch.partial || clipped.length < batch.trials.length }) : null;
        }).filter(Boolean);
      }
      selectedBatchId = batches[0] ? batches[0].id : null;
      persist(); renderArchive(); renderBatch(batches[0] || null);
      status.dataset.kind = 'success'; status.textContent = 'Архив проверен, объединён и сохранён локально.';
    } catch (error) { status.dataset.kind = 'error'; status.textContent = text(error && error.message || 'Импорт отклонён.', 220); }
  };
  reader.readAsText(file);
}
refreshButton.addEventListener('click', refreshBlueprint);
repeatButton.addEventListener('click', () => runBatch('repeatability'));
angleButton.addEventListener('click', () => runBatch('angle-sweep'));
ablationButton.addEventListener('click', () => runBatch('ablation'));
cancelButton.addEventListener('click', () => {
  if (!running) return;
  runToken++;
  status.dataset.kind = 'error';
  status.textContent = 'Запрошена отмена. Текущий отдельный расчёт завершится, после чего новые сценарии не запустятся.';
});
exportButton.addEventListener('click', exportArchive);
importButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { const file = fileInput.files && fileInput.files[0]; importArchive(file); fileInput.value = ''; });
clearButton.addEventListener('click', () => {
  if (!window.confirm('Очистить архив контрфактических испытаний на этом устройстве?')) return;
  batches = []; selectedBatchId = null;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
  renderArchive(); renderBatch(null);
  status.dataset.kind = 'success'; status.textContent = 'Локальный архив очищен.';
});
Object.defineProperty(window, 'CASCADELAB026', {
  value: Object.freeze({
    version: VERSION, schema: SCHEMA, archiveSchema: ARCHIVE_SCHEMA,
    getBatches: () => batches.map(batch => normalizeBatch(batch)),
    exportArchive, validateArchive, compareTrials, summarizeBatch,
    refreshBlueprint
  }), configurable: false, enumerable: false, writable: false
});
refreshBlueprint();
renderArchive();
renderBatch(batches.find(batch => batch.id === selectedBatchId) || null);
})();
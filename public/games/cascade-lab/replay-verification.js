(() => {
'use strict';

const VERSION = '0.26.0';
const SCHEMA = 'osgard.cascade-lab.replay-verification.v1';
const CERTIFICATE_SCHEMA = 'osgard.cascade-lab.replay-certificate.v1';
const STORAGE_KEY = 'osgard.cascade-lab.replay-verification.v1';
const ENGINE_MODEL = 'cascade-lab-fixed-step-v1';
const MAX_PASSES = 5;
const DEFAULT_PASSES = 3;
const MAX_FRAMES = 420;
const MAX_CERTIFICATE_BYTES = 450 * 1024;
const MAX_IMPORT_BYTES = 600 * 1024;
const MAX_HISTORY = 5;
const TOOLS = new Set(['spring','fan','belt','magnet','switch','bumper']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const round = (value, digits = 3) => finite(value) ? Number(value.toFixed(digits)) : null;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clean = (value, limit = 180) => String(value == null ? '' : value).replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
const list = value => Array.isArray(value) ? value : [];

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
}
function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').toUpperCase();
}
function normalizeSetup(levelId, source) {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 5 || !Array.isArray(source) || source.length > 12) return null;
  const devices = [];
  for (const device of source) {
    if (!device || typeof device !== 'object' || Array.isArray(device) || !TOOLS.has(device.type) ||
        !finite(device.x) || device.x < -100 || device.x > 1100 ||
        !finite(device.y) || device.y < -100 || device.y > 700 ||
        !finite(device.angle) || Math.abs(device.angle) > Math.PI * 64) return null;
    devices.push({ type: device.type, x: round(device.x, 4), y: round(device.y, 4), angle: round(device.angle, 6) });
  }
  return devices;
}
function scenarioFingerprint(levelId, devices) {
  const setup = normalizeSetup(levelId, devices);
  if (!setup) return null;
  return 'CL26-' + fnv1a(canonicalize({ model: ENGINE_MODEL, levelId, setup }));
}
function normalizeFrames(source, timeSeconds, endpoint = null) {
  if (!Array.isArray(source) || source.length < 2) return [];
  const frames = source.slice(0, MAX_FRAMES).filter(frame =>
    frame && typeof frame === 'object' && finite(frame.t) && frame.t >= 0 && frame.t <= 120 &&
    finite(frame.x) && finite(frame.y)
  ).map(frame => ({
    t: round(clamp(frame.t, 0, 120), 3), x: round(clamp(frame.x, -200, 1400), 2),
    y: round(clamp(frame.y, -200, 850), 2),
    vx: finite(frame.vx) ? round(clamp(frame.vx, -10000, 10000), 2) : null,
    vy: finite(frame.vy) ? round(clamp(frame.vy, -10000, 10000), 2) : null,
    gateOpen: frame.gateOpen === true,
    checkpoints: list(frame.checkpoints).slice(0, 20).map(value => clean(value, 80)).sort()
  })).sort((a, b) => a.t - b.t);
  if (Number.isFinite(timeSeconds) && endpoint && finite(endpoint.x) && finite(endpoint.y)) {
    const endTime = round(clamp(timeSeconds, 0, 120), 3);
    const last = frames[frames.length - 1];
    if (!last || Math.abs(last.t - endTime) > 0.001) {
      frames.push({
        t: endTime, x: round(endpoint.x, 2), y: round(endpoint.y, 2),
        vx: finite(endpoint.vx) ? round(endpoint.vx, 2) : null,
        vy: finite(endpoint.vy) ? round(endpoint.vy, 2) : null,
        gateOpen: endpoint.gateOpen === true,
        checkpoints: list(endpoint.checkpoints).slice(0, 20).map(value => clean(value, 80)).sort()
      });
    }
  }
  const deduplicated = [];
  for (const frame of frames) {
    if (deduplicated.length && frame.t < deduplicated[deduplicated.length - 1].t) continue;
    const previous = deduplicated[deduplicated.length - 1];
    if (previous && Math.abs(previous.t - frame.t) < 0.0005) deduplicated[deduplicated.length - 1] = frame;
    else deduplicated.push(frame);
  }
  return deduplicated.length >= 2 ? deduplicated.slice(-MAX_FRAMES) : [];
}
function normalizeReplay(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!['won','lost'].includes(raw.status) || !Number.isInteger(raw.levelId) || raw.levelId < 1 || raw.levelId > 5) return null;
  if (!finite(raw.timeSeconds) || raw.timeSeconds < 0 || raw.timeSeconds > 120) return null;
  const devices = normalizeSetup(raw.levelId, raw.devices || raw.setup);
  if (!devices) return null;
  const position = raw.position && typeof raw.position === 'object' ? raw.position : {};
  const velocity = raw.velocity && typeof raw.velocity === 'object' ? raw.velocity : {};
  const trajectory = normalizeFrames(raw.trajectory, raw.timeSeconds, {
    x: position.x, y: position.y, vx: velocity.x, vy: velocity.y,
    gateOpen: raw.gateOpen, checkpoints: raw.checkpointsReached
  });
  if (trajectory.length < 2) return null;
  const telemetry = raw.telemetry && typeof raw.telemetry === 'object' ? raw.telemetry : {};
  const checkpointsReached = list(raw.checkpointsReached).slice(0, 20).map(value => clean(value, 80)).sort();
  const events = list(telemetry.events).slice(-16).map(event => ({
    type: clean(event && event.type || 'event', 36),
    label: clean(event && (event.label || event.type) || 'Событие', 140),
    t: finite(event && event.t) ? round(clamp(event.t, 0, 120), 3) : null,
    x: finite(event && event.x) ? round(clamp(event.x, -200, 1400), 2) : null,
    y: finite(event && event.y) ? round(clamp(event.y, -200, 850), 2) : null,
    speed: finite(event && event.speed) ? round(clamp(event.speed, 0, 10000), 2) : null
  }));
  const scenario = scenarioFingerprint(raw.levelId, devices);
  if (!scenario) return null;
  if (raw.scenarioFingerprint && raw.scenarioFingerprint !== scenario) return null;
  return {
    schema: 'osgard.cascade-lab.replay-pass.v1',
    engineContract: clean(raw.engineContract || ENGINE_MODEL, 80),
    appVersion: clean(raw.appVersion || VERSION, 24),
    levelId: raw.levelId, levelTitle: clean(raw.levelTitle || ('Протокол #' + raw.levelId), 140),
    scenarioFingerprint: scenario, setup: devices,
    status: raw.status, reason: clean(raw.reason, 240),
    timeSeconds: round(raw.timeSeconds, 6),
    position: { x: round(position.x, 4), y: round(position.y, 4) },
    velocity: { x: round(velocity.x, 4), y: round(velocity.y, 4) },
    gateOpen: raw.gateOpen === true, checkpointsReached,
    deviceCount: devices.length,
    telemetry: {
      distance: finite(telemetry.distance) ? round(telemetry.distance, 4) : null,
      peakSpeed: finite(telemetry.peakSpeed) ? round(telemetry.peakSpeed, 4) : null,
      maxHeight: finite(telemetry.maxHeight) ? round(telemetry.maxHeight, 4) : null,
      impacts: Number.isInteger(telemetry.impacts) ? clamp(telemetry.impacts, 0, 100000) : 0,
      contacts: Number.isInteger(telemetry.contacts) ? clamp(telemetry.contacts, 0, 100000) : 0,
      activations: Number.isInteger(telemetry.activations) ? clamp(telemetry.activations, 0, 100000) : 0,
      lastImpactSpeed: finite(telemetry.lastImpactSpeed) ? round(telemetry.lastImpactSpeed, 4) : null,
      events
    },
    trajectory
  };
}
function frameAt(frames, time) {
  if (!frames.length) return null;
  if (time <= frames[0].t) return frames[0];
  const last = frames[frames.length - 1];
  if (time >= last.t) return last;
  let lo = 0, hi = frames.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= time) lo = mid;
    else hi = mid;
  }
  const a = frames[lo], b = frames[hi];
  const span = b.t - a.t, blend = span > 0 ? (time - a.t) / span : 0;
  const mix = key => finite(a[key]) && finite(b[key]) ? a[key] + (b[key] - a[key]) * blend : null;
  return { t: time, x: mix('x'), y: mix('y'), vx: mix('vx'), vy: mix('vy') };
}
function trajectoryDeviation(a, b, samples = 72) {
  const first = normalizeReplay(a), second = normalizeReplay(b);
  if (!first || !second || first.levelId !== second.levelId || first.scenarioFingerprint !== second.scenarioFingerprint) return null;
  const duration = Math.min(first.timeSeconds, second.timeSeconds);
  let sum = 0, max = 0, velocityMax = 0, count = 0;
  for (let i = 0; i < Math.max(2, Math.min(240, samples)); i++) {
    const t = duration * i / (Math.max(2, Math.min(240, samples)) - 1);
    const x = frameAt(first.trajectory, t), y = frameAt(second.trajectory, t);
    if (!x || !y) continue;
    const delta = Math.hypot(x.x - y.x, x.y - y.y);
    sum += delta; max = Math.max(max, delta); count++;
    if (finite(x.vx) && finite(x.vy) && finite(y.vx) && finite(y.vy)) velocityMax = Math.max(velocityMax, Math.hypot(x.vx - y.vx, x.vy - y.vy));
  }
  return count ? { samples: count, meanPx: round(sum / count, 4), maxPx: round(max, 4), maxVelocityDelta: round(velocityMax, 4) } : null;
}
function eventTimeline(raw) {
  const r = normalizeReplay(raw);
  return r ? r.telemetry.events.map(e => ({ type: e.type, t: e.t, label: e.label })) : [];
}
function replaySignature(raw) {
  const r = normalizeReplay(raw);
  if (!r) return null;
  const essential = {
    engineContract: r.engineContract, levelId: r.levelId, scenarioFingerprint: r.scenarioFingerprint,
    status: r.status, reason: r.reason, timeSeconds: r.timeSeconds,
    position: r.position, velocity: r.velocity, gateOpen: r.gateOpen,
    checkpointsReached: r.checkpointsReached, telemetry: r.telemetry,
    trajectory: r.trajectory
  };
  return 'RVP26-' + fnv1a(canonicalize(essential));
}
function compareReplays(left, right) {
  const a = normalizeReplay(left), b = normalizeReplay(right);
  if (!a || !b) return { ok: false, reason: 'Один из результатов не прошёл проверку структуры.' };
  if (a.levelId !== b.levelId || a.scenarioFingerprint !== b.scenarioFingerprint) return { ok: false, reason: 'Результаты относятся к разным протоколам или чертежам.' };
  if (a.engineContract !== b.engineContract) return { ok: false, reason: 'Разные контракты физического движка; сравнение не считается повтором одного теста.' };
  const spatial = trajectoryDeviation(a, b);
  if (!spatial) return { ok: false, reason: 'Недостаточно кадров для пространственного сравнения.' };
  const timeDelta = round(b.timeSeconds - a.timeSeconds, 6);
  const telemetryDeltas = {};
  for (const key of ['distance','peakSpeed','maxHeight','lastImpactSpeed']) {
    const x = a.telemetry[key], y = b.telemetry[key];
    telemetryDeltas[key] = finite(x) && finite(y) ? round(y - x, 4) : null;
  }
  for (const key of ['impacts','contacts','activations']) telemetryDeltas[key] = b.telemetry[key] - a.telemetry[key];
  const eventA = a.telemetry.events.map(e => e.type + '@' + String(e.t));
  const eventB = b.telemetry.events.map(e => e.type + '@' + String(e.t));
  const sameEvents = canonicalize(eventA) === canonicalize(eventB);
  const terminalDistance = round(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y), 4);
  const terminalVelocity = round(Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y), 4);
  const sameTerminal = a.status === b.status && a.reason === b.reason &&
    a.gateOpen === b.gateOpen && canonicalize(a.checkpointsReached) === canonicalize(b.checkpointsReached);
  const equivalent = sameTerminal && sameEvents && Math.abs(timeDelta) <= (1 / 120) + 0.00001 &&
    terminalDistance <= 0.5 && spatial.maxPx <= 0.5 && Math.abs(telemetryDeltas.distance || 0) <= 1;
  return {
    ok: true, equivalent, sameTerminal, sameEvents,
    signatureA: replaySignature(a), signatureB: replaySignature(b),
    timeDelta, terminalDistancePx: terminalDistance, terminalVelocityDelta: terminalVelocity,
    trajectory: spatial, telemetryDeltas,
    eventCountA: a.telemetry.events.length, eventCountB: b.telemetry.events.length
  };
}
function makeCertificate(observed, passes, comparisons, observedComparison) {
  const actual = normalizeReplay(observed);
  const normalizedPasses = list(passes).map(normalizeReplay);
  if (!actual || normalizedPasses.length < 2 || normalizedPasses.length > MAX_PASSES || normalizedPasses.some(p => !p)) {
    return { ok: false, reason: 'Недостаточно валидных результатов для паспорта воспроизводимости.' };
  }
  if (normalizedPasses.some(p => p.scenarioFingerprint !== actual.scenarioFingerprint || p.engineContract !== ENGINE_MODEL)) {
    return { ok: false, reason: 'Результаты не относятся к одному чертежу и контракту движка.' };
  }
  const internalStable = list(comparisons).length === normalizedPasses.length - 1 && list(comparisons).every(result => result && result.ok && result.equivalent);
  const observedMatch = Boolean(observedComparison && observedComparison.ok && observedComparison.equivalent);
  const verdict = internalStable && observedMatch ? 'reproducible' : internalStable ? 'baseline-drift' : 'unstable';
  const payload = {
    schema: CERTIFICATE_SCHEMA, schemaVersion: 1, application: 'CASCADE LAB', release: VERSION,
    engineContract: ENGINE_MODEL, createdAt: new Date().toISOString(),
    scenario: {
      levelId: actual.levelId, levelTitle: actual.levelTitle, scenarioFingerprint: actual.scenarioFingerprint,
      setup: actual.setup, deviceCount: actual.deviceCount
    },
    observed: actual,
    passes: normalizedPasses,
    comparison: {
      internal: list(comparisons).slice(0, MAX_PASSES - 1),
      observedVsReplay: observedComparison || null,
      repeatableWithinRuntime: internalStable,
      originalMatchesCurrentReplay: observedMatch,
      verdict
    },
    limitations: {
      networkSent: false, cryptographicSignature: false,
      scope: 'Same fixed-step physics contract; this certificate records local measurements and is not a digital signature or proof of cross-browser equivalence.',
      checksumNote: 'FNV-1a detects accidental changes but can be recomputed; it does not authenticate the author.'
    }
  };
  const certificate = { payload, integrity: { algorithm: 'FNV-1A-32', digest: fnv1a(canonicalize(payload)) } };
  const size = JSON.stringify(certificate).length;
  if (size > MAX_CERTIFICATE_BYTES) return { ok: false, reason: 'Паспорт превысил допустимый размер 450 KiB.' };
  return { ok: true, certificate, sizeBytes: size, verdict };
}
function validateCertificate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.payload || typeof raw.payload !== 'object') return { ok: false, reason: 'Файл не является паспортом воспроизводимости.' };
  if (JSON.stringify(raw).length > MAX_IMPORT_BYTES) return { ok: false, reason: 'Файл превышает лимит импорта 600 KiB.' };
  const p = raw.payload;
  if (p.schema !== CERTIFICATE_SCHEMA || p.schemaVersion !== 1 || p.application !== 'CASCADE LAB' || p.release !== VERSION ||
      p.engineContract !== ENGINE_MODEL || !p.scenario || !Array.isArray(p.passes) || p.passes.length < 2 || p.passes.length > MAX_PASSES ||
      !p.comparison || !['reproducible','baseline-drift','unstable'].includes(p.comparison.verdict)) {
    return { ok: false, reason: 'Версия паспорта, контракт или количество повторов не поддерживаются.' };
  }
  const setup = normalizeSetup(p.scenario.levelId, p.scenario.setup);
  if (!setup || p.scenario.scenarioFingerprint !== scenarioFingerprint(p.scenario.levelId, setup)) return { ok: false, reason: 'Отпечаток чертежа не совпадает.' };
  if (!normalizeReplay(p.observed) || !p.passes.every(normalizeReplay) ||
      p.passes.some(pass => pass.scenarioFingerprint !== p.scenario.scenarioFingerprint || pass.engineContract !== ENGINE_MODEL)) {
    return { ok: false, reason: 'Один или несколько измеренных прогонов не прошли проверку.' };
  }
  if (!raw.integrity || raw.integrity.algorithm !== 'FNV-1A-32' ||
      raw.integrity.digest !== fnv1a(canonicalize(p))) return { ok: false, reason: 'Контрольная сумма паспорта не совпала.' };
  return { ok: true, certificate: raw, verdict: p.comparison.verdict };
}
const pureApi = Object.freeze({
  version: VERSION, schema: SCHEMA, certificateSchema: CERTIFICATE_SCHEMA, engineContract: ENGINE_MODEL,
  maxPasses: MAX_PASSES, maxFrames: MAX_FRAMES, maxImportBytes: MAX_IMPORT_BYTES,
  canonicalize, fnv1a, normalizeSetup, scenarioFingerprint, normalizeReplay, trajectoryDeviation,
  replaySignature, compareReplays, makeCertificate, validateCertificate, frameAt
});
if (typeof window === 'undefined' || !window.document) {
  globalThis.__CASCADELAB026_TEST__ = pureApi;
  return;
}
if (window.CASCADELAB026) return;

const style = document.createElement('style');
style.dataset.cascadeLabReplayVerification = VERSION;
style.textContent = [
  '.cl-replay-lab{margin:20px 0 26px;padding:clamp(15px,2.2vw,26px);border:1px solid #73d9ff3a;border-radius:16px;background:radial-gradient(ellipse at 100% 0%,#1b789a1b,transparent 42%),linear-gradient(145deg,#0b1721,#060c13);color:#e8f3f8;box-shadow:0 18px 56px #0003,inset 0 1px #ffffff09}',
  '.cl-replay-lab *{box-sizing:border-box}.crv-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.crv-kicker{margin:0 0 8px;color:#7de0ff;font:8px ui-monospace,monospace;letter-spacing:.17em}.crv-title{margin:0;color:#f2f8fb;font:400 clamp(23px,3.1vw,34px)/1.1 Georgia,serif;letter-spacing:-.025em}.crv-lead{max-width:760px;margin:9px 0 0;color:#9cb4c2;font-size:10px;line-height:1.7}.crv-badge{display:inline-flex;align-items:center;gap:6px;min-height:27px;padding:5px 9px;border:1px solid #75dfff3b;border-radius:6px;color:#8fe4ff;font:8px ui-monospace,monospace;letter-spacing:.04em;white-space:nowrap}.crv-badge[data-state=pass]{border-color:#7fe2b34a;color:#99f0c6}.crv-badge[data-state=warn]{border-color:#e9ba6a55;color:#f5d89a}.crv-badge[data-state=fail]{border-color:#ff9f9f55;color:#ffb8b8}',
  '.crv-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:15px}.crv-kpi{padding:10px;border:1px solid #87bbcf22;border-radius:9px;background:#06111a}.crv-kpi small{display:block;color:#688c9f;font:7px ui-monospace,monospace;letter-spacing:.1em}.crv-kpi strong{display:block;margin-top:6px;color:#edf7fa;font:600 17px Georgia,serif;overflow-wrap:anywhere}.crv-kpi p{margin:4px 0 0;color:#728e9e;font-size:8px;line-height:1.4}',
  '.crv-meter{height:4px;margin-top:12px;overflow:hidden;border-radius:99px;background:#86b7c71c}.crv-meter span{display:block;width:0;height:100%;background:linear-gradient(90deg,#68d7ff,#e9ba6a);transition:width .16s ease}.crv-controls{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.crv-button{min-height:38px;padding:8px 11px;border:1px solid #7dcde83b;border-radius:8px;background:#0a202c;color:#beeaff;font:750 9px system-ui,sans-serif;cursor:pointer}.crv-button.primary{border-color:#e9ba6a;background:linear-gradient(125deg,#f4d59a,#d8a14c);color:#211708}.crv-button.quiet{background:transparent;color:#87a4b4}.crv-button.danger{border-color:#ff98984c;color:#ffb0b0}.crv-button:disabled{opacity:.42;cursor:not-allowed}.crv-button:focus-visible,.crv-record button:focus-visible{outline:2px solid #8be7ff;outline-offset:3px}',
  '.crv-status{min-height:20px;margin:10px 0 0;color:#94dff7;font-size:9px;line-height:1.5}.crv-status[data-kind=error]{color:#ffaaa7}.crv-status[data-kind=pass]{color:#9bf0c7}.crv-status[data-kind=warn]{color:#f3d391}',
  '.crv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.crv-card{min-width:0;padding:10px;border:1px solid #88b8cd20;border-radius:9px;background:#06111a}.crv-card h4{margin:0;color:#8caebe;font:8px ui-monospace,monospace;letter-spacing:.1em}.crv-card p{margin:7px 0 0;color:#c0d2dc;font-size:10px;line-height:1.6;overflow-wrap:anywhere}.crv-records{display:grid;gap:7px;margin-top:10px}.crv-record{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px;border:1px solid #83b6c91e;border-radius:8px;background:#061019}.crv-record strong{display:block;color:#d6e7ef;font-size:10px}.crv-record small{display:block;margin-top:4px;color:#708b9c;font:8px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.crv-record button{min-height:30px;padding:6px 8px;border:1px solid #7ccde833;border-radius:6px;background:#0a202c;color:#a9e3f8;font-size:8px}.crv-empty{padding:13px;border:1px dashed #83bacd2d;border-radius:8px;color:#718f9e;font-size:9px;line-height:1.6}.crv-privacy{margin:12px 0 0;padding-top:10px;border-top:1px solid #88b6c21a;color:#5d7c8d;font:7px/1.65 ui-monospace,monospace}',
  '@media(max-width:650px){.cl-replay-lab{padding:13px;border-radius:12px}.crv-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.crv-grid{grid-template-columns:1fr}.crv-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.crv-button{width:100%;min-height:42px}.crv-record{grid-template-columns:1fr}.crv-record button{min-height:38px}}@media(prefers-reduced-motion:reduce){.crv-meter span{transition:none}}'
].join('');
document.head.append(style);
const make = (tag, className, value) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== undefined) el.textContent = String(value);
  return el;
};
const panel = make('section', 'cl-replay-lab');
panel.setAttribute('aria-labelledby', 'crv-title');
panel.setAttribute('aria-live', 'polite');
const head = make('div', 'crv-head');
const headingGroup = make('div');
headingGroup.append(make('p', 'crv-kicker', 'CASCADE LAB / REPLAY VERIFICATION'));
const title = make('h3', 'crv-title', 'Докажи повторяемость. Измерь расхождение.');
title.id = 'crv-title';
headingGroup.append(title);
headingGroup.append(make('p', 'crv-lead', 'Один и тот же чертёж запускается в изолированном движке с фиксированным шагом 1/120 с. Три повтора сравниваются по итогам, событиям, измерениям и траектории. Всё остаётся в этом браузере.'));
head.append(headingGroup);
const badge = make('span', 'crv-badge', 'ОЖИДАНИЕ ЗАВЕРШЁННОГО ЗАПУСКА');
badge.dataset.state = 'idle';
head.append(badge);
panel.append(head);
const kpis = make('div', 'crv-kpis');
const kpiValues = {};
for (const [id,label,help] of [
  ['verdict','ВЕРДИКТ','Повторы и исходный запуск'],
  ['repeats','ПОВТОРЫ','Изолированные прогоны'],
  ['drift','МАКС. СДВИГ','Отклонение пути, px'],
  ['timeDelta','Δ ВРЕМЕНИ','Повтор − исходный запуск']
]) {
  const card=make('article','crv-kpi'); card.append(make('small','',label));
  const value=make('strong','', '—'); card.append(value); card.append(make('p','',help));
  kpis.append(card); kpiValues[id]=value;
}
panel.append(kpis);
const meter=make('div','crv-meter');const meterFill=make('span');meter.append(meterFill);panel.append(meter);
const controls=make('div','crv-controls');
function button(label,cls,handler){const b=make('button','crv-button'+(cls?' '+cls:''),label);b.type='button';b.addEventListener('click',handler);controls.append(b);return b;}
let observed=null, latestCertificate=null, isRunning=false, cancelRequested=false, history=[];
const runButton=button('Проверить 3 повтора','primary',runVerification);
const cancelButton=button('Отменить','danger',()=>{cancelRequested=true;status.textContent='Отмена будет выполнена после завершения текущего фиксированного прогона.';});
cancelButton.disabled=true;
const exportButton=button('Экспорт паспорта','',exportCurrent);
exportButton.disabled=true;
const importButton=button('Импорт паспорта','',()=>fileInput.click());
const clearButton=button('Очистить историю','quiet',clearHistory);
const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.hidden=true;
const status=make('p','crv-status','Заверши любую симуляцию — появится возможность точно повторить её чертёж.');
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
panel.append(controls,fileInput,status);
const compareGrid=make('div','crv-grid');
const outcomeCard=make('article','crv-card');outcomeCard.append(make('h4','','СРАВНЕНИЕ С ИСХОДНЫМ ЗАПУСКОМ'));
const outcomeText=make('p','','Нет измерений.');
outcomeCard.append(outcomeText);
const methodCard=make('article','crv-card');methodCard.append(make('h4','','МЕТОД И ОГРАНИЧЕНИЯ'));
methodCard.append(make('p','','Проверяется воспроизводимость в текущем браузере и текущем контракте физики. Паспорт не является цифровой подписью и не гарантирует совпадение разных браузеров.'));
compareGrid.append(outcomeCard,methodCard);panel.append(compareGrid);
const historyHeading=make('p','crv-kicker','ЛОКАЛЬНАЯ ИСТОРИЯ ПРОВЕРОК');
const records=make('div','crv-records');panel.append(historyHeading,records);
panel.append(make('p','crv-privacy','LOCAL-FIRST · NO NETWORK REQUESTS · FNV-1A CHECKSUM IS NOT A DIGITAL SIGNATURE · MAX 5 CERTIFICATES'));

const footer=document.querySelector('.app-footer')||document.querySelector('footer');
if(footer&&footer.parentNode)footer.parentNode.insertBefore(panel,footer);
else return;

function setStatus(message,kind='info'){status.textContent=message;status.dataset.kind=kind;}
function setBadge(message,state){badge.textContent=message;badge.dataset.state=state;}
function setButtonState(){runButton.disabled=isRunning||!observed;cancelButton.disabled=!isRunning;exportButton.disabled=!latestCertificate;}
function safelyRead(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return [];
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed)||parsed.length>MAX_HISTORY)return [];
    return parsed.map(item=>{const v=validateCertificate(item);return v.ok?v.certificate:null;}).filter(Boolean).slice(0,MAX_HISTORY);
  }catch{return [];}
}
function persistHistory(){
  history=history.slice(0,MAX_HISTORY);
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(history));}
  catch{setStatus('Паспорт сформирован, но браузер не разрешил сохранить историю. Экспорт всё ещё доступен.','warn');}
}
function compactOutcome(a){
  const r=normalizeReplay(a);if(!r)return null;
  return {levelId:r.levelId,levelTitle:r.levelTitle,scenarioFingerprint:r.scenarioFingerprint,status:r.status,reason:r.reason,timeSeconds:r.timeSeconds,position:r.position,velocity:r.velocity,gateOpen:r.gateOpen,checkpointsReached:r.checkpointsReached,devices:r.setup,telemetry:r.telemetry,trajectory:r.trajectory,engineContract:r.engineContract,appVersion:r.appVersion};
}
function normalizeObserved(raw){
  if(!raw||!['won','lost'].includes(raw.status)||!Number.isInteger(raw.levelId)||!Array.isArray(raw.devices))return null;
  const setup=normalizeSetup(raw.levelId,raw.devices);if(!setup)return null;
  const time=finite(raw.timeSeconds)?raw.timeSeconds:null;if(time===null)return null;
  const frames=list(raw.trajectory).filter(p=>p&&finite(p.t)&&p.t>=0&&p.t<=time+0.25);
  const trimmed=frames.filter(p=>p.t<=time+0.001);
  const endpoint=raw.position||{};
  const endFrame={t:time,x:endpoint.x,y:endpoint.y,vx:raw.velocity&&raw.velocity.x,vy:raw.velocity&&raw.velocity.y,gateOpen:raw.gateOpen===true,checkpoints:raw.checkpointsReached||[]};
  if(!trimmed.length)trimmed.push(frames[0]);
  trimmed.push(endFrame);
  return normalizeReplay({
    ...raw, devices:setup, scenarioFingerprint:scenarioFingerprint(raw.levelId,setup),
    trajectory:trimmed
  });
}
function renderHistory(){
  records.replaceChildren();
  if(!history.length){records.append(make('div','crv-empty','Здесь появятся локальные паспорта воспроизводимости. Ничего не отправляется на сервер.'));return;}
  for(const certificate of history.slice(0,MAX_HISTORY)){
    const p=certificate.payload,row=make('article','crv-record'),body=make('div');
    const label=p.comparison.verdict==='reproducible'?'✓ ПОВТОРЯЕМО':p.comparison.verdict==='baseline-drift'?'△ ДРЕЙФ БАЗЫ':'× НЕСТАБИЛЬНО';
    body.append(make('strong','',label+' · '+p.scenario.levelTitle));
    body.append(make('small','',new Date(p.createdAt).toLocaleString()+' · '+p.scenario.scenarioFingerprint+' · '+p.passes.length+' прогона'));
    const select=make('button','','Открыть');select.type='button';select.addEventListener('click',()=>loadCertificate(certificate));
    row.append(body,select);records.append(row);
  }
}
function showComparison(a,b,heading){
  const result=compareReplays(a,b);
  if(!result.ok){outcomeText.textContent=result.reason;return result;}
  outcomeText.textContent=heading+': '+(result.equivalent?'эквивалентны в допуске':'есть расхождение')+
    '. Время '+(result.timeDelta>0?'+':'')+result.timeDelta.toFixed(4)+' с; максимум по пути '+result.trajectory.maxPx.toFixed(3)+' px; среднее '+result.trajectory.meanPx.toFixed(3)+' px; конечная позиция '+result.terminalDistancePx.toFixed(3)+' px; события '+result.eventCountA+'/'+result.eventCountB+'.';
  return result;
}
function loadCertificate(certificate){
  const validation=validateCertificate(certificate);
  if(!validation.ok){setStatus(validation.reason,'error');return;}
  latestCertificate=certificate;
  kpiValues.verdict.textContent=certificate.payload.comparison.verdict==='reproducible'?'ПОДТВЕРЖДЕНО':certificate.payload.comparison.verdict==='baseline-drift'?'ДРЕЙФ':'НЕСТАБИЛЬНО';
  kpiValues.repeats.textContent=String(certificate.payload.passes.length);
  const comps=certificate.payload.comparison.internal;
  kpiValues.drift.textContent=(comps.length?Math.max(...comps.map(c=>c.trajectory.maxPx)).toFixed(3):'—')+' px';
  kpiValues.timeDelta.textContent=certificate.payload.comparison.observedVsReplay&&certificate.payload.comparison.observedVsReplay.ok?
    (certificate.payload.comparison.observedVsReplay.timeDelta>0?'+':'')+certificate.payload.comparison.observedVsReplay.timeDelta.toFixed(4)+' s':'—';
  outcomeText.textContent='Паспорт '+certificate.payload.comparison.verdict+'. Чертёж '+certificate.payload.scenario.scenarioFingerprint+'. Самоповторы '+(certificate.payload.comparison.repeatableWithinRuntime?'совпали':'не совпали')+'; исходный запуск '+(certificate.payload.comparison.originalMatchesCurrentReplay?'совпал':'отличается')+'.';
  const result=certificate.payload.comparison;
  setBadge(result.verdict==='reproducible'?'ПОВТОРЯЕМОСТЬ ПОДТВЕРЖДЕНА':result.verdict==='baseline-drift'?'ДРЕЙФ ИСХОДНОГО ЗАПУСКА':'РАСХОЖДЕНИЕ МЕЖДУ ПОВТОРАМИ',
    result.verdict==='reproducible'?'pass':result.verdict==='baseline-drift'?'warn':'fail');
  meterFill.style.width=result.verdict==='reproducible'?'100%':result.repeatableWithinRuntime?'65%':'25%';
  setStatus('Загружен локальный паспорт. Контрольная сумма проверена; это не цифровая подпись.','pass');
  exportButton.disabled=false;
  setButtonState();
}
async function runVerification(){
  if(isRunning||!observed)return;
  const engine=window.CASCADELAB026_ENGINE;
  if(!engine||engine.version!==VERSION||engine.model!==ENGINE_MODEL){
    setStatus('Изолированный движок не загружен или не совпадает по версии. Обнови страницу и повтори.','error');return;
  }
  isRunning=true;cancelRequested=false;setButtonState();
  runButton.textContent='Проверка…';
  setBadge('ИДЁТ ИЗОЛИРОВАННЫЙ ПРОГОН','idle');meterFill.style.width='0%';
  kpiValues.verdict.textContent='…';kpiValues.repeats.textContent='0 / '+DEFAULT_PASSES;
  kpiValues.drift.textContent='—';kpiValues.timeDelta.textContent='—';
  setStatus('Запускаю фиксированный движок, не меняя игровую сцену, очки, сохранения или аналитику.');
  const passes=[];
  try{
    for(let i=0;i<DEFAULT_PASSES;i++){
      if(cancelRequested)break;
      const replay=engine.run({levelId:observed.levelId,devices:observed.setup});
      if(!replay||!replay.ok)throw new Error(replay&&replay.reason||'Движок не вернул валидный результат.');
      passes.push(compactOutcome(replay));
      const pct=Math.round((passes.length/DEFAULT_PASSES)*100);
      meterFill.style.width=pct+'%';
      kpiValues.repeats.textContent=passes.length+' / '+DEFAULT_PASSES;
      setStatus('Изолированный прогон '+passes.length+' из '+DEFAULT_PASSES+' завершён: '+replay.status+', '+replay.timeSeconds.toFixed(3)+' с.');
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    if(cancelRequested){setStatus('Проверка отменена между прогонами. Сертификат не создан.','warn');setBadge('ОТМЕНЕНО','warn');return;}
    if(passes.length!==DEFAULT_PASSES)throw new Error('Не набрано необходимое число контрольных прогонов.');
    const baseline=compactOutcome(observed),internal=[];
    for(let i=1;i<passes.length;i++)internal.push(compareReplays(passes[0],passes[i]));
    const observedComparison=compareReplays(baseline,passes[0]);
    const made=makeCertificate(baseline,passes,internal,observedComparison);
    if(!made.ok)throw new Error(made.reason);
    latestCertificate=made.certificate;
    history=[latestCertificate,...history.filter(item=>item.payload.scenario.scenarioFingerprint!==latestCertificate.payload.scenario.scenarioFingerprint||item.payload.createdAt!==latestCertificate.payload.createdAt)].slice(0,MAX_HISTORY);
    persistHistory();renderHistory();loadCertificate(latestCertificate);
    if(made.verdict==='reproducible')setStatus('Все три контрольных прогона и исходный запуск совпали в пределах допуска. Подтверждена только воспроизводимость в текущем контракте движка.','pass');
    else if(made.verdict==='baseline-drift')setStatus('Повторы между собой стабильны, но исходный запуск отличается. Проверь версию, данные запуска или изменение правил физики.','warn');
    else setStatus('Повторные прогоны расходятся. Не используй этот сценарий как устойчивую базовую точку до выяснения причины.','error');
  }catch(error){
    setStatus(clean(error&&error.message||'Ошибка проверки',300),'error');
    setBadge('ПРОВЕРКА НЕ ЗАВЕРШЕНА','fail');
  }finally{
    isRunning=false;runButton.textContent='Проверить 3 повтора';setButtonState();
  }
}
function download(filename,textValue,type){
  const url=URL.createObjectURL(new Blob([textValue],{type}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.hidden=true;
  panel.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function exportCurrent(){
  if(!latestCertificate)return;
  download('cascade-lab-replay-certificate-'+latestCertificate.payload.scenario.scenarioFingerprint.toLowerCase()+'.json',JSON.stringify(latestCertificate,null,2),'application/json;charset=utf-8');
  setStatus('Паспорт экспортирован локально. Контрольная сумма не является криптографической подписью.','pass');
}
function importCertificate(file){
  if(!file)return;
  if(file.size>MAX_IMPORT_BYTES){setStatus('Файл больше лимита 600 KiB.','error');return;}
  const reader=new FileReader();
  reader.onerror=()=>setStatus('Не удалось прочитать JSON-файл.','error');
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(String(reader.result||'')),checked=validateCertificate(parsed);
      if(!checked.ok)throw new Error(checked.reason);
      history=[parsed,...history.filter(item=>item.payload.scenario.scenarioFingerprint!==parsed.payload.scenario.scenarioFingerprint)].slice(0,MAX_HISTORY);
      persistHistory();renderHistory();loadCertificate(parsed);
      if(observed&&scenarioFingerprint(observed.levelId,observed.setup)===parsed.payload.scenario.scenarioFingerprint){
        const match=compareReplays(compactOutcome(observed),parsed.payload.passes[0]);
        if(match.ok)setStatus('Импортированный паспорт относится к тому же чертежу. Текущий запуск '+(match.equivalent?'совпадает':'отличается')+' от его первого прогона.','pass');
      }else setStatus('Паспорт проверен и сохранён. Наблюдаемый запуск отсутствует или относится к другому чертежу.','warn');
    }catch(error){setStatus(clean(error&&error.message||'Паспорт отклонён.',300),'error');}
  };
  reader.readAsText(file);
}
function clearHistory(){
  if(!window.confirm('Удалить только локальную историю паспортов воспроизводимости?'))return;
  history=[];try{localStorage.removeItem(STORAGE_KEY);}catch{}
  latestCertificate=null;renderHistory();setBadge('ОЖИДАНИЕ ЗАПУСКА','idle');
  kpiValues.verdict.textContent='—';kpiValues.repeats.textContent='—';kpiValues.drift.textContent='—';kpiValues.timeDelta.textContent='—';
  outcomeText.textContent='История очищена.';meterFill.style.width='0%';exportButton.disabled=true;
  setStatus('Локальная история очищена.','pass');
}
fileInput.addEventListener('change',()=>{const file=fileInput.files&&fileInput.files[0];importCertificate(file);fileInput.value='';});
window.addEventListener('cascade-lab:run-finished',event=>{
  observed=normalizeObserved(event.detail||{});
  if(!observed){runButton.disabled=true;setStatus('Последний запуск не содержит корректной траектории для повторной проверки.','warn');return;}
  runButton.disabled=false;latestCertificate=null;exportButton.disabled=true;
  setBadge('ЧЕРТЁЖ ГОТОВ К ПОВТОРУ','idle');
  outcomeText.textContent='Исходный запуск '+observed.status+' за '+observed.timeSeconds.toFixed(3)+' с. Чертёж '+observed.scenarioFingerprint+'.';
  setStatus('Найден завершённый запуск. Нажми «Проверить 3 повтора», чтобы воспроизвести его в изолированном фиксированном движке.');
  setButtonState();
});
history=safelyRead();renderHistory();setButtonState();
Object.defineProperty(window,'CASCADELAB026',{
  value:Object.freeze({version:VERSION,schema:SCHEMA,validateCertificate,compareReplays,trajectoryDeviation,
    getHistory:()=>history.slice(),runVerification:()=>runVerification(),getLatest:()=>latestCertificate}),
  configurable:false,enumerable:false,writable:false
});
})();
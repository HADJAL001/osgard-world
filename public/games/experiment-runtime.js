(() => {
'use strict';
const core = window.OSGARDExperimentCore;
const id = 'catalog-hero-cta-v1';
const experiment = core?.EXPERIMENTS?.[id];
const button = document.querySelector(experiment?.selector || '#catalog-hero-cta');
if (!core || !experiment || !button) return;

const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
const ASSIGNMENT_KEY = 'osgard.experiment.assignment.v1:' + id;
const SESSION_KEY = 'osgard.experiment.session.v1';
const exposureKey = 'osgard.experiment.exposed.v1:' + id;
const conversionKey = 'osgard.experiment.converted.v1:' + id;
let variant = 'a', exposureTimer = 0, sessionId = '', exposureRecorded = false, conversionRecorded = false, counter = 0;

const consent = () => {
  try { return localStorage.getItem(CONSENT_KEY) === 'yes'; } catch { return false; }
};
function randomHex(bytes = 12) {
  const data = new Uint8Array(bytes);
  try {
    window.crypto.getRandomValues(data);
    return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
  } catch {
    counter += 1;
    return (Date.now().toString(16) + counter.toString(16)).slice(-bytes * 2).padStart(bytes * 2, '0');
  }
}
function getSessionId() {
  if (!consent()) return '';
  if (sessionId) return sessionId;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY) || '';
    if (/^session_[a-f0-9]{24}$/.test(stored)) return sessionId = stored;
    sessionId = 'session_' + randomHex();
    sessionStorage.setItem(SESSION_KEY, sessionId);
    return sessionId;
  } catch { return sessionId = 'session_' + randomHex(); }
}
function hasFlag(key) {
  try { return sessionStorage.getItem(key) === '1'; }
  catch { return key === exposureKey ? exposureRecorded : conversionRecorded; }
}
function setFlag(key) {
  if (key === exposureKey) exposureRecorded = true;
  if (key === conversionKey) conversionRecorded = true;
  try { sessionStorage.setItem(key, '1'); } catch {}
}
function track(phase) {
  if (!consent()) return false;
  const name = phase === 'exposed' ? 'product_experiment_exposed' : 'product_experiment_converted';
  const key = phase === 'exposed' ? exposureKey : conversionKey;
  if (hasFlag(key)) return false;
  const queue = window.OSGARD_CONSENTED_ANALYTICS;
  const source = core.eventSource(id, variant, phase);
  const sid = getSessionId();
  if (!queue || typeof queue.enqueue !== 'function' || !source || !sid) return false;
  setFlag(key);
  void queue.enqueue({
    eventId: 'evt_' + randomHex(),
    name,
    sessionId: sid,
    gameId: 'unknown',
    source,
    path: location.pathname,
    durationSeconds: 0
  });
  return true;
}
function assignVariant() {
  if (!consent()) {
    variant = 'a';
    button.textContent = experiment.variants.a;
    return;
  }
  let assignment = null;
  try {
    assignment = core.normalizeAssignment(JSON.parse(sessionStorage.getItem(ASSIGNMENT_KEY) || 'null'), id);
  } catch {}
  if (!assignment) {
    const roll = window.crypto?.getRandomValues
      ? window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
      : Math.random();
    assignment = { schemaVersion: 1, experimentId: id, version: experiment.version, variant: core.pickVariant(roll, experiment.weightB) };
    try { sessionStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(assignment)); }
    catch {
      variant = 'a';
      button.textContent = experiment.variants.a;
      return;
    }
  }
  variant = assignment.variant;
  button.textContent = experiment.variants[variant];
}
function maybeRecordExposure() {
  if (!consent() || !button.isConnected || document.visibilityState !== 'visible' ||
      hasFlag(exposureKey) || exposureTimer) return;
  const rect = button.getBoundingClientRect();
  const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
    rect.top < window.innerHeight && rect.left < window.innerWidth;
  if (!visible) return;
  exposureTimer = window.setTimeout(() => {
    exposureTimer = 0;
    if (!consent() || document.visibilityState !== 'visible') return;
    const current = button.getBoundingClientRect();
    if (current.width > 0 && current.height > 0 && current.bottom > 0 && current.right > 0 &&
        current.top < window.innerHeight && current.left < window.innerWidth) track('exposed');
  }, 900);
}
function clearExperimentState() {
  if (exposureTimer) window.clearTimeout(exposureTimer);
  exposureTimer = 0;
  for (const key of [ASSIGNMENT_KEY, exposureKey, conversionKey, SESSION_KEY]) {
    try { sessionStorage.removeItem(key); } catch {}
  }
  variant = 'a'; sessionId = ''; exposureRecorded = false; conversionRecorded = false;
  button.textContent = experiment.variants.a;
}
function consentChanged() {
  if (!consent()) { clearExperimentState(); return; }
  assignVariant();
  maybeRecordExposure();
}
assignVariant();
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)) maybeRecordExposure();
    else if (exposureTimer) { window.clearTimeout(exposureTimer); exposureTimer = 0; }
  }, { threshold: [0, 0.5, 1] }).observe(button);
} else {
  window.addEventListener('load', () => window.setTimeout(maybeRecordExposure, 350), { once: true });
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') maybeRecordExposure();
  else if (exposureTimer) { window.clearTimeout(exposureTimer); exposureTimer = 0; }
});
button.addEventListener('click', () => {
  if (!consent()) return;
  track('exposed');
  track('converted');
});
document.querySelector('#analytics-toggle')?.addEventListener('click', () => queueMicrotask(consentChanged));
window.addEventListener('storage', event => { if (event.key === CONSENT_KEY) consentChanged(); });
window.OSGARDProductExperiment = Object.freeze({
  id, getVariant: () => variant, refreshConsent: consentChanged, track
});
})();
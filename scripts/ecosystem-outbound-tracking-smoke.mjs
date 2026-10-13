import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('public/games/ecosystem/directory.js', 'utf8');

function makeHarness({ consent = 'yes', project = 'marcosa', analytics = true, apiBaseUrl = '' } = {}) {
  const localValues = new Map([['osgard.games.analytics-consent.v1', consent]]);
  const sessionValues = new Map();
  const storage = (values) => ({
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  });
  const link = {};
  const card = {
    dataset: { project, category: 'social', search: 'marcosa social network' },
    textContent: 'MARCOSA social network',
    hidden: false,
  };
  link.closest = (selector) => selector === '[data-project]' ? card : null;
  const target = { closest: (selector) => selector === 'a.project-link' ? link : null };
  const documentListeners = new Map();
  const windowListeners = new Map();
  const buttonListeners = new Map();
  const searchListeners = new Map();
  const chipListeners = new Map();
  const consentLabel = { textContent: '' };
  const elements = {
    'project-search': { value: '', addEventListener: (name, fn) => searchListeners.set(name, fn), focus() {} },
    'project-count': { textContent: '' },
    'empty-state': { hidden: true },
    'analytics-toggle': {
      setAttribute(name, value) { this[name] = value; },
      querySelector: () => consentLabel,
      addEventListener: (name, fn) => buttonListeners.set(name, fn),
    },
    'consent-state': { textContent: '' },
    'analytics-delivery-state': { textContent: '' },
  };
  const chip = {
    dataset: { filter: 'all' },
    setAttribute(name, value) { this[name] = value; },
    addEventListener: (name, fn) => chipListeners.set(name, fn),
  };
  const document = {
    querySelectorAll(selector) {
      if (selector === '[data-project]') return [card];
      if (selector === '[data-filter]') return [chip];
      return [];
    },
    getElementById: (id) => elements[id] || null,
    addEventListener: (name, fn) => documentListeners.set(name, fn),
  };
  const emitted = [];
  const randomIds = { value: 0 };
  const webCrypto = { randomUUID: () => 'evt-test-' + String(++randomIds.value).padStart(16, '0') };
  const window = { addEventListener: (name, fn) => windowListeners.set(name, fn) };
  if (analytics) window.OSGARD_CONSENTED_ANALYTICS = {
    enqueue: (event) => { emitted.push(event); return Promise.resolve(true); },
  };
  const fetch = async (url) => {
    assert.equal(String(url), '/games/commerce-config.json');
    return { ok: true, json: async () => ({ apiBaseUrl }) };
  };
  vm.runInNewContext(source, {
    window, document, localStorage: storage(localValues), sessionStorage: storage(sessionValues),
    fetch, crypto: webCrypto, location: { origin: 'https://osgard.world', pathname: '/games/ecosystem/' },
    URL, Date, Math, Promise, Set, Map, String, Number, Array, Object, RegExp,
  });
  return {
    emitted, localValues, sessionValues, elements, documentListeners, target,
    click() { documentListeners.get('click')?.({ target }); },
    toggleConsent() { buttonListeners.get('click')?.(); },
  };
}

const granted = makeHarness();
granted.click();
granted.click();
assert.equal(granted.emitted.length, 2, 'Each approved outbound project click should enqueue one event');
assert.ok(granted.emitted.every((event) => event.name === 'cross_promo_clicked'), 'Outbound events must use the shared allow-listed event name');
assert.ok(granted.emitted.every((event) => event.source === 'ecosystem-marcosa'), 'Attribution must identify the approved project without storing its URL');
assert.ok(granted.emitted.every((event) => event.gameId === 'unknown'), 'A directory click must not be attributed to a game session');
assert.ok(granted.emitted.every((event) => event.path === '/games/ecosystem/' && event.durationSeconds === 0), 'Only the local route and minimal payload should be sent');
assert.ok(granted.emitted.every((event) => /^[a-zA-Z0-9_-]{12,96}$/.test(event.eventId)), 'Event IDs must match the server contract');
assert.ok(granted.emitted.every((event) => /^[a-zA-Z0-9_-]{12,96}$/.test(event.sessionId)), 'Session IDs must match the server contract');
assert.notEqual(granted.emitted[0].eventId, granted.emitted[1].eventId, 'Clicks need distinct idempotency keys');
assert.equal(granted.emitted[0].sessionId, granted.emitted[1].sessionId, 'Clicks in one tab should share a session identifier');
assert.equal(JSON.stringify(granted.emitted).includes('marcosa.club'), false, 'Analytics must not store the external destination URL');
assert.equal(JSON.stringify(granted.emitted).includes('osman.osmanov'), false, 'Analytics must not include contact or personal data');
await new Promise((resolve) => setImmediate(resolve));
assert.match(granted.elements['analytics-delivery-state'].textContent, /Сервер аналитики не подключён/, 'An empty API config must be disclosed as non-delivering');

const denied = makeHarness({ consent: 'no' });
denied.click();
assert.equal(denied.emitted.length, 0, 'No outbound analytics may be enqueued without explicit consent');
assert.equal(denied.sessionValues.size, 0, 'A session identifier should not be created for a denied analytics click');

const unlisted = makeHarness({ project: 'not-a-real-project' });
unlisted.click();
assert.equal(unlisted.emitted.length, 0, 'Unknown project IDs must fail closed');

const missingQueue = makeHarness({ analytics: false });
assert.doesNotThrow(() => missingQueue.click(), 'A missing analytics queue must not block outbound navigation');
assert.equal(missingQueue.emitted.length, 0);

console.log(JSON.stringify({
  status: 'PASS',
  checks: 17,
  consentRequired: true,
  outboundEvents: granted.emitted.length,
  destinationUrlStored: false,
  personalDataStored: false,
  blankApiDisclosed: true,
}, null, 2));

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('public/games/consented-analytics.js', 'utf8');
const commerceCore = readFileSync('services/osgard-commerce-api/src/core.mjs', 'utf8');

function extractGameIds(source, label) {
  const match = source.match(/const GAME_IDS = new Set\\(\\[([\\s\\S]*?)\\]\\)/);
  assert.ok(match, label + ' must declare a game-ID allow-list');
  return [...match[1].matchAll(/['"]([a-z0-9-]+)['"]/g)].map(item => item[1]).sort();
}
function extractEventNames(source, label) {
  const match = source.match(/const ALLOWED_EVENTS = new Set\\(\\[([\\s\\S]*?)\\]\\)/);
  assert.ok(match, label + ' must declare an event-name allow-list');
  return [...match[1].matchAll(/['"]([a-z0-9_-]+)['"]/g)].map(item => item[1]).sort();
}

const actualGameIds = extractGameIds(source, 'Browser analytics queue');
assert.deepEqual(
  actualGameIds,
  extractGameIds(commerceCore, 'Commerce API'),
  'Browser and server analytics must accept the same game IDs; drift can silently discard share/promo events',
);
assert.deepEqual(actualGameIds, [
  'aether-grid', 'afterimage-run', 'cascade-lab', 'civic-cascade', 'inherit',
  'null-shift', 'patina', 'remix', 'signal-run', 'swarm', 'time', 'unknown',
], 'Every released game, including AETHER GRID, must be admitted by both analytics allow-lists');
assert.deepEqual(
  extractEventNames(source, 'Browser analytics queue'),
  extractEventNames(commerceCore, 'Commerce API'),
  'Browser queue and Commerce API event allow-lists must remain identical',
);
assert.ok(extractEventNames(source, 'Browser analytics queue').includes('invite_link_prepared'),
  'Invite-link preparation must not be dropped by the shared consent queue');

function createQueue(apiBaseUrl, origin = 'https://osgard.world') {
  const values = new Map([['osgard.games.analytics-consent.v1', 'yes']]);
  const localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  const listeners = new Map();
  const window = { addEventListener: (name, callback) => listeners.set(name, callback) };
  const documentListeners = new Map();
  const document = {
    visibilityState: 'visible',
    addEventListener: (name, callback) => documentListeners.set(name, callback),
    querySelector: () => null,
  };
  let offline = true;
  let eventPosts = 0;
  const postedEvents = [];
  const requestedUrls = [];
  const fetch = async (url, options = {}) => {
    requestedUrls.push(String(url));
    if (String(url) === '/games/commerce-config.json') {
      return { ok: true, json: async () => ({ apiBaseUrl }) };
    }
    const expected = apiBaseUrl ? apiBaseUrl + '/v1/events' : null;
    if (!expected || String(url) !== expected) throw new Error('Unexpected URL or unconfigured API request: ' + url);
    eventPosts += 1;
    const body = JSON.parse(options.body);
    assert.equal(body.consent, true, 'Queue must explicitly include the consent state');
    assert.ok(Array.isArray(body.events) && body.events.length > 0 && body.events.length <= 20, 'Queue must send bounded batches');
    if (offline) return { ok: false, status: 503, json: async () => ({ accepted: 0 }) };
    postedEvents.push(...body.events);
    return { ok: true, status: 202, json: async () => ({ accepted: body.events.length, inserted: body.events.length }) };
  };
  vm.runInNewContext(source, { window, document, localStorage, fetch, AbortController, URL, location: { origin }, Date, Math, JSON, Set, Map, Number, String, Array, Object });
  return { queue: window.OSGARD_CONSENTED_ANALYTICS, values, listeners, postedEvents, requestedUrls,
    get eventPosts(){ return eventPosts; }, set offline(value){ offline=value; } };
}

const event = {
  eventId: 'evt_123456789012',
  name: 'catalog_viewed',
  sessionId: 'session_123456789012',
  gameId: 'unknown',
  source: 'queue-smoke',
  path: '/games/',
  durationSeconds: 0,
};

// Missing API configuration must fail closed: no request to the frontend SPA proxy.
const unconfigured = createQueue('');
assert.ok(unconfigured.queue && typeof unconfigured.queue.enqueue === 'function' && typeof unconfigured.queue.flush === 'function', 'Global analytics queue must be exposed');
assert.equal(await unconfigured.queue.enqueue(event), true, 'A consented event should be stored in the bounded local retry queue');
assert.equal(await unconfigured.queue.flush(), false, 'Delivery must remain unsuccessful when the API origin is empty');
assert.equal(unconfigured.eventPosts, 0, 'An empty API URL must never be treated as a valid backend');
assert.ok(!unconfigured.requestedUrls.some(url => url.includes('/v1/events')), 'An empty API URL must not fall back to a same-origin SPA route');
assert.equal(JSON.parse(unconfigured.values.get('osgard.games.analytics-pending.v1') || '[]').length, 1, 'The undelivered event should remain locally queued until retry/expiry or consent withdrawal');
unconfigured.values.set('osgard.games.analytics-consent.v1', 'no');
unconfigured.listeners.get('storage')?.({ key: 'osgard.games.analytics-consent.v1' });
assert.equal(unconfigured.values.has('osgard.games.analytics-pending.v1'), false, 'Consent withdrawal must remove the local retry queue');

// Arbitrary third-party URL paths are not accepted as a trusted API base.
const invalidPath = createQueue('https://attacker.example/collect');
assert.equal(await invalidPath.queue.enqueue(event), true, 'Invalid API configuration may retain a consented event locally');
assert.equal(await invalidPath.queue.flush(), false, 'An untrusted API path must not receive analytics');
assert.equal(invalidPath.eventPosts, 0, 'An untrusted URL path must not be called');

// The first-party reverse proxy works only when explicitly selected in public config.
const firstPartyProxy = createQueue('https://osgard.world/commerce-api');
firstPartyProxy.offline = false;
assert.equal(await firstPartyProxy.queue.enqueue(event), true, 'A consented event should queue when the same-origin API prefix is explicitly configured');
assert.equal(await firstPartyProxy.queue.flush(), true, 'An explicit same-origin API proxy should accept the event');
assert.ok(firstPartyProxy.requestedUrls.includes('https://osgard.world/commerce-api/v1/events'), 'Configured same-origin proxy prefix must be preserved');

// With an explicit API origin, retry semantics remain stable and only server acknowledgement drains events.
const configured = createQueue('https://commerce.example.test');
assert.equal(await configured.queue.enqueue(event), true, 'An event should be durably queued even when the configured backend is temporarily offline');
assert.equal(await configured.queue.flush(), false, 'Offline delivery must finish its attempt and keep the event pending');
const pending = JSON.parse(configured.values.get('osgard.games.analytics-pending.v1') || '[]');
assert.equal(pending.length, 1, 'Failed delivery must keep the event in the bounded local queue');
assert.equal(pending[0].eventId, event.eventId, 'Retry must preserve the idempotency key');
assert.equal(configured.eventPosts, 1, 'First configured attempt should be made once');
configured.offline = false;
assert.equal(await configured.queue.flush(), true, 'After connectivity returns, server acknowledgement must drain the queue');
assert.equal(configured.postedEvents.length, 1, 'The server should receive the event once after retry');
assert.equal(configured.postedEvents[0].eventId, event.eventId, 'Retry must not generate a new event ID');
assert.equal(configured.values.has('osgard.games.analytics-pending.v1'), false, 'Acknowledged event should be removed from local queue');

// A consent withdrawal clears pending events and prevents further requests.
configured.offline = true;
const second = { ...event, eventId: 'evt_123456789013', name: 'cross_promo_clicked' };
assert.equal(await configured.queue.enqueue(second), true, 'Second event should be queued before revocation');
assert.equal(await configured.queue.flush(), false, 'Second offline delivery attempt should settle before revocation');
assert.equal(JSON.parse(configured.values.get('osgard.games.analytics-pending.v1') || '[]').length, 1, 'Second event should be pending while offline');
configured.values.set('osgard.games.analytics-consent.v1', 'no');
configured.listeners.get('storage')?.({ key: 'osgard.games.analytics-consent.v1' });
assert.equal(configured.values.has('osgard.games.analytics-pending.v1'), false, 'Consent withdrawal must clear the queue');
const postsBeforeOnline = configured.eventPosts;
configured.listeners.get('online')?.();
await configured.queue.flush();
assert.equal(configured.eventPosts, postsBeforeOnline, 'No additional event request is allowed after consent withdrawal');

// Invalid event payloads never enter the queue.
configured.values.set('osgard.games.analytics-consent.v1', 'yes');
assert.equal(await configured.queue.enqueue({ ...event, eventId: 'bad', name: 'catalog_viewed' }), false, 'Malformed idempotency keys must be rejected');
assert.equal(await configured.queue.enqueue({ ...event, eventId: 'evt_123456789014', name: 'not_allowlisted' }), false, 'Unknown event names must be rejected');
assert.equal(
  await configured.queue.enqueue({ ...event, eventId: 'evt_afterimage_123456', gameId: 'afterimage-run', name: 'social_share_intent', source: 'osgard-select:share:telegram' }),
  true,
  'AFTERIMAGE//RUN social-share events must pass the client game-ID allow-list',
);
assert.equal(
  await configured.queue.enqueue({ ...event, eventId: 'evt_aethergrid_12345', gameId: 'aether-grid', name: 'owned_promo_impression', source: 'osgard-select:spotlight:marcosa:a' }),
  true,
  'AETHER GRID promotion events must pass the client game-ID allow-list',
);
assert.equal(
  await configured.queue.enqueue({ ...event, eventId: 'evt_inviteprepared_123', gameId: 'aether-grid', name: 'invite_link_prepared', source: 'game-invite:aether-grid:og_abcd1234' }),
  true,
  'Invite preparation events must be accepted by the shared retry queue',
);
console.log('PASS consented analytics queue: fail-closed API configuration, offline persistence, stable IDs, acknowledged retry, consent withdrawal, and schema allowlist.');

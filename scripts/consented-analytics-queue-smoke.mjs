import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('public/games/consented-analytics.js', 'utf8');
const values = new Map([['osgard.games.analytics-consent.v1', 'yes']]);
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
const listeners = new Map();
const documentListeners = new Map();
const window = {
  addEventListener: (name, callback) => listeners.set(name, callback),
};
const document = {
  visibilityState: 'visible',
  addEventListener: (name, callback) => documentListeners.set(name, callback),
  querySelector: () => null,
};
let offline = true;
let eventPosts = 0;
const postedEvents = [];
const fetch = async (url, options = {}) => {
  if (String(url) === '/games/commerce-config.json') {
    return { ok: true, json: async () => ({ apiBaseUrl: '' }) };
  }
  if (String(url) !== '/commerce-api/v1/events') throw new Error('Unexpected URL: ' + url);
  eventPosts += 1;
  const body = JSON.parse(options.body);
  assert.equal(body.consent, true, 'Queue must explicitly include the consent state');
  assert.ok(Array.isArray(body.events) && body.events.length > 0 && body.events.length <= 20, 'Queue must send bounded batches');
  if (offline) return { ok: false, status: 503, json: async () => ({ accepted: 0 }) };
  postedEvents.push(...body.events);
  return { ok: true, status: 202, json: async () => ({ accepted: body.events.length, inserted: body.events.length }) };
};
vm.runInNewContext(source, { window, document, localStorage, fetch, AbortController, URL, Date, Math, JSON, Set, Map, Number, String, Array, Object });

const queue = window.OSGARD_CONSENTED_ANALYTICS;
assert.ok(queue && typeof queue.enqueue === 'function' && typeof queue.flush === 'function', 'Global analytics queue must be exposed');
const event = {
  eventId: 'evt_123456789012',
  name: 'catalog_viewed',
  sessionId: 'session_123456789012',
  gameId: 'unknown',
  source: 'queue-smoke',
  path: '/games/',
  durationSeconds: 0,
};
assert.equal(await queue.enqueue(event), true, 'An event should be accepted once durably queued even if delivery is temporarily offline');
assert.equal(await queue.flush(), false, 'Offline delivery must finish its attempt and keep the event pending');
const pending = JSON.parse(values.get('osgard.games.analytics-pending.v1') || '[]');
assert.equal(pending.length, 1, 'Failed delivery must keep the event in the bounded local queue');
assert.equal(pending[0].eventId, event.eventId, 'Retry must preserve the idempotency key');
assert.equal(eventPosts, 1, 'First attempt should be made once');

offline = false;
assert.equal(await queue.flush(), true, 'After connectivity returns, server acknowledgement must drain the queue');
assert.equal(postedEvents.length, 1, 'The server should receive the event once after retry');
assert.equal(postedEvents[0].eventId, event.eventId, 'Retry must not generate a new event ID');
assert.equal(values.has('osgard.games.analytics-pending.v1'), false, 'Acknowledged event should be removed from local queue');

// AFTERIMAGE//RUN is the tenth catalog game. Its real events must pass client
// schema validation and be accepted by the same consented delivery queue.
const afterimage = {
  ...event,
  eventId: 'evt_afterimage_123456',
  name: 'game_session_completed',
  gameId: 'afterimage-run',
  durationSeconds: 42,
};
assert.equal(await queue.enqueue(afterimage), true, 'AFTERIMAGE//RUN completion should enter the consented queue');
assert.equal(await queue.flush(), true, 'AFTERIMAGE//RUN event should be delivered when online');
assert.ok(postedEvents.some(item => item.gameId === 'afterimage-run' && item.eventId === afterimage.eventId),
  'AFTERIMAGE//RUN analytics must not be silently dropped by the client allowlist');
assert.equal(values.has('osgard.games.analytics-pending.v1'), false, 'Acknowledged AFTERIMAGE//RUN event should drain the queue');

// A consent withdrawal clears pending events and aborts any active request.
offline = true;
const second = { ...event, eventId: 'evt_123456789013', name: 'cross_promo_clicked' };
assert.equal(await queue.enqueue(second), true, 'Second event should be queued before revocation');
assert.equal(await queue.flush(), false, 'Second offline delivery attempt should settle before revocation');
assert.equal(JSON.parse(values.get('osgard.games.analytics-pending.v1') || '[]').length, 1, 'Second event should be pending while offline');
values.set('osgard.games.analytics-consent.v1', 'no');
listeners.get('storage')?.({ key: 'osgard.games.analytics-consent.v1' });
assert.equal(values.has('osgard.games.analytics-pending.v1'), false, 'Consent withdrawal must clear the queue');
const postsBeforeOnline = eventPosts;
listeners.get('online')?.();
await queue.flush();
assert.equal(eventPosts, postsBeforeOnline, 'No additional event request is allowed after consent withdrawal');

// Invalid event payloads never enter the queue.
values.set('osgard.games.analytics-consent.v1', 'yes');
assert.equal(await queue.enqueue({ ...event, eventId: 'bad', name: 'catalog_viewed' }), false, 'Malformed idempotency keys must be rejected');
assert.equal(await queue.enqueue({ ...event, eventId: 'evt_123456789014', name: 'not_allowlisted' }), false, 'Unknown event names must be rejected');
console.log('PASS consented analytics queue: offline persistence, stable IDs, acknowledged retry, consent withdrawal, and schema allowlist.');

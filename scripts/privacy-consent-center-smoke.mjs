import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/privacy/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/privacy/consent-center.js', import.meta.url), 'utf8');

assert.match(html, /id="analytics-settings"/, 'Privacy page must include the consent settings section');
const gamesPrivacy = readFileSync(new URL('../public/privacy/index.html', import.meta.url), 'utf8');
assert.match(gamesPrivacy, /osgard\.games\.player-passport\.v1/, 'Privacy notice must disclose the local Player Passport key');
assert.match(gamesPrivacy, /500 сессий за 180 дней/, 'Privacy notice must disclose local Passport history limits');
assert.match(gamesPrivacy, /публикации в социальной сети не подтверждается автоматически/, 'Privacy notice must not imply verified public sharing');
assert.match(html, /id="analytics-allow"/, 'Allow action must be present');
assert.match(html, /id="analytics-revoke"/, 'Revoke action must be present');
assert.match(html, /role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/, 'Consent status must be announced accessibly');
assert.match(html, /consent-center\.js/, 'Privacy page must load the consent center');
assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//i, 'Privacy page must not load third-party scripts');
assert.match(source, /osgard\.games\.analytics-consent\.v1/, 'Privacy page must use the shared consent key');
assert.match(source, /osgard\.games\.analytics-pending\.v1/, 'Consent revocation must clear the shared queue');

function makeElement(id) {
  const listeners = new Map();
  return {
    id,
    textContent: '',
    disabled: false,
    dataset: {},
    attributes: {},
    addEventListener: (event, callback) => listeners.set(event, callback),
    click: () => listeners.get('click')?.({ type: 'click', target: { id } }),
    _listeners: listeners,
  };
}
const state = makeElement('consent-state');
const message = makeElement('consent-message');
const allow = makeElement('analytics-allow');
const revoke = makeElement('analytics-revoke');
const elements = new Map([
  [state.id, state], [message.id, message], [allow.id, allow], [revoke.id, revoke],
]);
const values = new Map([
  ['osgard.games.analytics-consent.v1', 'no'],
  ['osgard.games.analytics-pending.v1', JSON.stringify([{ eventId: 'evt_pending_123' }])],
]);
const storageListeners = new Map();
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
const window = {
  addEventListener: (name, callback) => storageListeners.set(name, callback),
};
const document = { getElementById: id => elements.get(id) || null };
vm.runInNewContext(source, { window, document, localStorage, String });

assert.equal(state.textContent, 'Аналитика выключена', 'Consent is off by default');
assert.equal(allow.disabled, false, 'Allow action is available when analytics is off');
assert.equal(revoke.disabled, true, 'Revoke action is disabled when consent is already off');

allow.click();
assert.equal(values.get('osgard.games.analytics-consent.v1'), 'yes', 'Allow action must persist explicit consent');
assert.equal(state.textContent, 'Аналитика разрешена', 'UI must reflect the enabled state');
assert.equal(revoke.disabled, false, 'Revoke action becomes available after consent');

revoke.click();
assert.equal(values.get('osgard.games.analytics-consent.v1'), 'no', 'Revoke action must persist the withdrawal');
assert.equal(values.has('osgard.games.analytics-pending.v1'), false, 'Revocation must remove queued offline events');
assert.equal(state.textContent, 'Аналитика выключена', 'UI must reflect the disabled state');
assert.match(message.textContent, /очередь удалена/i, 'UI must explain the effect of revocation');

values.set('osgard.games.analytics-consent.v1', 'yes');
storageListeners.get('storage')?.({ key: 'osgard.games.analytics-consent.v1' });
assert.equal(state.textContent, 'Аналитика разрешена', 'A choice made in another tab must update the settings state');

// If storage is blocked, the page must remain fail-closed and expose a visible error.
const blockedState = makeElement('consent-state');
const blockedMessage = makeElement('consent-message');
const blockedAllow = makeElement('analytics-allow');
const blockedRevoke = makeElement('analytics-revoke');
const blockedElements = new Map([
  [blockedState.id, blockedState], [blockedMessage.id, blockedMessage],
  [blockedAllow.id, blockedAllow], [blockedRevoke.id, blockedRevoke],
]);
const blockedStorage = {
  getItem: () => { throw new Error('storage blocked'); },
  setItem: () => { throw new Error('storage blocked'); },
  removeItem: () => { throw new Error('storage blocked'); },
};
vm.runInNewContext(source, {
  window: { addEventListener: () => {} },
  document: { getElementById: id => blockedElements.get(id) || null },
  localStorage: blockedStorage, String,
});
blockedAllow.click();
assert.equal(blockedState.dataset.state, 'error', 'A failed storage write must be announced as an error');
assert.equal(blockedState.textContent, 'Не удалось сохранить выбор', 'Storage errors must not be overwritten by the default-off state');
assert.match(blockedMessage.textContent, /Аналитика не включается без сохранённого разрешения/i, 'Storage failure must explain the fail-closed behavior');

console.log('PASS privacy consent center: shared consent key, default-off state, allow/revoke controls, queue clearing, cross-tab sync, and no third-party scripts.');

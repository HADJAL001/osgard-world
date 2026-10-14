import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_STORAGE_KEYS,
  clearAnalyticsRecords,
  hasAnalyticsConsent,
  updateAnalyticsConsent,
} from '../src/core/analyticsConsent.mjs';

function storageFrom(initial = {}, options = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) {
      if (options.failGet) throw new Error('storage read blocked');
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (options.failSet) throw new Error('storage write blocked');
      values.set(String(key), String(value));
    },
    removeItem(key) {
      if (options.failRemove) throw new Error('storage cleanup blocked');
      values.delete(String(key));
    },
  };
}

const coreHistory = ANALYTICS_STORAGE_KEYS[0];
const corePending = ANALYTICS_STORAGE_KEYS[1];
const gamesPending = ANALYTICS_STORAGE_KEYS[2];
const old = JSON.stringify([{ id: 'pre-consent-event' }]);
const storage = storageFrom({
  [ANALYTICS_CONSENT_KEY]: 'no',
  [coreHistory]: old,
  [corePending]: old,
  [gamesPending]: old,
  'osgard.games.favorites.v1': JSON.stringify(['aether-grid']),
  'osgard.games.recent.v1': JSON.stringify(['signal-run']),
  'osgard.player.progress.v1': JSON.stringify({ completed: 4 }),
});

assert.equal(hasAnalyticsConsent(storage), false, 'No stored choice must deny analytics');
assert.equal(updateAnalyticsConsent(true, storage).ok, true, 'Explicit opt-in should persist');
assert.equal(hasAnalyticsConsent(storage), true, 'Only explicit yes enables analytics');
for (const key of ANALYTICS_STORAGE_KEYS) assert.equal(storage.getItem(key), null, 'Opt-in must discard all pre-consent records');
assert.deepEqual(JSON.parse(storage.getItem('osgard.games.favorites.v1')), ['aether-grid'], 'Favorites must survive consent changes');
assert.deepEqual(JSON.parse(storage.getItem('osgard.games.recent.v1')), ['signal-run'], 'Recent games must survive consent changes');
assert.deepEqual(JSON.parse(storage.getItem('osgard.player.progress.v1')), { completed: 4 }, 'Game progress must survive consent changes');

storage.setItem(coreHistory, old);
storage.setItem(corePending, old);
storage.setItem(gamesPending, old);
const revoked = updateAnalyticsConsent(false, storage);
assert.equal(revoked.ok, true, 'Revocation should persist');
assert.equal(hasAnalyticsConsent(storage), false, 'Revocation must immediately deny consent');
assert.equal(revoked.cleared, true, 'Revocation should clear local analytics data');
for (const key of ANALYTICS_STORAGE_KEYS) assert.equal(storage.getItem(key), null, 'Revocation must clear analytics queue/history');
assert.equal(storage.getItem(ANALYTICS_CONSENT_KEY), 'no', 'Revocation state remains explicit');

const readBlocked = storageFrom({ [ANALYTICS_CONSENT_KEY]: 'yes' }, { failGet: true });
assert.equal(hasAnalyticsConsent(readBlocked), false, 'Consent read failures must fail closed');
const storageMissing = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};
assert.equal(hasAnalyticsConsent(storageMissing), false, 'Unavailable storage must not allow analytics');
assert.equal(updateAnalyticsConsent(true, null).ok, false, 'Missing storage must not report a successful opt-in');

const cleanupBlocked = storageFrom({
  [ANALYTICS_CONSENT_KEY]: 'no',
  [coreHistory]: old,
}, { failRemove: true });
const blockedGrant = updateAnalyticsConsent(true, cleanupBlocked);
assert.equal(blockedGrant.ok, false, 'Opt-in cannot succeed if stale queues cannot be cleared');
assert.equal(hasAnalyticsConsent(cleanupBlocked), false, 'Failed opt-in must not enable analytics');
assert.equal(clearAnalyticsRecords(storage), true, 'Valid storage cleanup should report success');

const helper = readFileSync('src/core/analyticsConsent.mjs', 'utf8');
const eventQueue = readFileSync('src/core/eventQueue.ts', 'utf8');
const playerApi = readFileSync('src/core/playerApi.ts', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const control = readFileSync('src/AnalyticsConsentControl.tsx', 'utf8');
const css = readFileSync('src/analytics-consent.css', 'utf8');
const workflow = readFileSync('.github/workflows/frontend-check.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

assert.ok(helper.includes("'osgard.games.analytics-consent.v1'"), 'Use the existing shared consent key');
assert.match(eventQueue, /if \(!hasAnalyticsConsent\(\)\) \{\s*clearAnalyticsRecords\(\)\s*return event\s*\}/, 'New events must never be persisted without consent');
assert.match(eventQueue, /if \(!hasAnalyticsConsent\(\)\) \{\s*clearAnalyticsRecords\(\)\s*return Promise\.resolve\(\)\s*\}/, 'Queue flush must be denied without consent');
assert.match(eventQueue, /if \(!hasAnalyticsConsent\(\)\) \{\s*clearAnalyticsRecords\(\)\s*return\s*\}/, 'Flush must re-check consent between network awaits');
assert.ok(eventQueue.includes("event.newValue !== 'yes'"), 'Cross-tab revocation must clear pending analytics');
assert.match(playerApi, /if \(!hasAnalyticsConsent\(\)\) return false/, 'The API client must have its own consent guard');
const eventPost = playerApi.indexOf("fetch('/api/v1/player/events'");
assert.ok(eventPost > -1 && playerApi.lastIndexOf('if (!hasAnalyticsConsent()) return false', eventPost) > playerApi.indexOf('export async function syncPlayerEvent'), 'Consent must be rechecked immediately before sending an event');
assert.ok(app.includes('<AnalyticsConsentControl locale={locale} />'), 'Root portal must render the consent control');
assert.ok(control.includes('aria-pressed={enabled}') && control.includes('aria-live="polite"'), 'The consent UI must expose accessible state');
assert.ok(control.includes('href="/privacy/"') && css.includes('@media (max-width: 720px)') && css.includes('prefers-reduced-motion'), 'Privacy link, mobile layout and reduced-motion support are required');
assert.ok(packageJson.scripts['qa:core-analytics-consent'], 'Add the consent smoke check to package scripts');
assert.ok(workflow.includes('npm run qa:core-analytics-consent'), 'CI must block regressions in core consent handling');

console.log('PASS OSGARD platform analytics consent: default-deny, opt-in cleanup, revoke cleanup, game-data preservation, storage failure, queue guards, API guard, cross-tab behavior, accessible UI and CI contract.');

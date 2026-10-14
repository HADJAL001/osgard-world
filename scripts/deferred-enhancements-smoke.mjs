import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const loader = readFileSync('public/games/deferred-enhancements.js', 'utf8');
const page = readFileSync('public/games/index.html', 'utf8');
const sw = readFileSync('public/games/osgard-play-sw.js', 'utf8');
const optimizer = readFileSync('scripts/optimize-games-static-assets.mjs', 'utf8');

assert.ok(page.includes('/games/deferred-enhancements.js?v=__OSGARD_BUILD_VERSION__'),
  'The catalog should load only the small scheduler in its initial deferred script batch.');
for (const eagerAsset of ['pwa-install.js', 'experiment-core.js', 'experiment-runtime.js']) {
  assert.ok(!page.includes('<script src="/games/' + eagerAsset + '?v=__OSGARD_BUILD_VERSION__" defer></script>'),
    eagerAsset + ' must not execute in the initial deferred script batch.');
  assert.ok(loader.includes("'" + eagerAsset + "'"), 'The scheduler must retain ' + eagerAsset);
}
assert.ok(loader.includes('4200'), 'Optional work should wait until after the initial interaction window.');
assert.ok(loader.includes('requestIdleCallback'), 'Use idle scheduling when available.');
assert.ok(loader.includes("addEventListener('beforeinstallprompt'") && loader.includes('window.OSGARDInstallPrompt'),
  'Capture beforeinstallprompt before the deferred installer is loaded.');
assert.ok(loader.includes("addEventListener('pointerenter'") && loader.includes('hasAnalyticsConsent()'),
  'Warm the experiment only as relevant and only when analytics consent exists.');
assert.ok(loader.includes('encodeURIComponent(BUILD_VERSION)'), 'Deferred assets must be pinned to the deployed build.');
assert.ok(sw.includes("'/games/deferred-enhancements.js'"),
  'The lightweight loader must remain available from the scoped PWA cache.');
assert.ok(optimizer.includes("'deferred-enhancements.js'"),
  'The scheduler must be minified and integrity-checked with other public game assets.');

function makeHarness(consent = false) {
  const timers = [];
  const idles = [];
  const appended = [];
  const windowHandlers = new Map();
  const makeNode = id => {
    const handlers = new Map();
    return {
      id,
      textContent: '',
      disabled: false,
      handlers,
      addEventListener(type, callback) {
        const current = handlers.get(type) || [];
        current.push(callback);
        handlers.set(type, current);
      },
      fire(type, event = {}) {
        for (const callback of handlers.get(type) || []) callback(event);
      }
    };
  };
  const nodes = {
    'pwa-install-button': makeNode('pwa-install-button'),
    'pwa-install-status': makeNode('pwa-install-status'),
    'catalog-hero-cta': makeNode('catalog-hero-cta'),
    'analytics-toggle': makeNode('analytics-toggle')
  };
  const localStorage = {
    getItem(key) { return key === 'osgard.games.analytics-consent.v1' && consent ? 'yes' : null; }
  };
  const document = {
    head: { appendChild(script) { appended.push(script); } },
    querySelector(selector) {
      if (selector === 'meta[name="osgard-build"]') return { content: 'build-test-20261014' };
      return null;
    },
    getElementById(id) { return nodes[id] || null; },
    createElement(name) { return { tagName: name, async: false, src: '', onload: null, onerror: null }; }
  };
  const window = {
    OSGARDInstallPrompt: null,
    OSGARDPwaInstallReady: false,
    OSGARDProductExperiment: null,
    localStorage,
    addEventListener(type, callback) {
      const current = windowHandlers.get(type) || [];
      current.push(callback);
      windowHandlers.set(type, current);
    },
    setTimeout(callback, ms) {
      const timer = { callback, ms };
      timers.push(timer);
      return timers.length;
    },
    requestIdleCallback(callback, options) {
      idles.push({ callback, options });
      return idles.length;
    }
  };
  runInNewContext(loader, { window, document, localStorage, Promise, Map, encodeURIComponent });
  return { timers, idles, appended, windowHandlers, nodes, window };
}

const idleHarness = makeHarness(false);
assert.equal(idleHarness.appended.length, 0, 'Optional scripts must not load immediately during page parsing.');
idleHarness.windowHandlers.get('load')[0]();
assert.equal(idleHarness.timers[0].ms, 4200);
idleHarness.timers[0].callback();
assert.equal(idleHarness.idles.length, 1, 'The delayed path must hand off to idle scheduling.');
idleHarness.idles[0].callback();
assert.equal(idleHarness.appended.length, 1, 'Without consent, schedule only the PWA installer, not the experiment.');
assert.ok(idleHarness.appended[0].src.includes('/games/pwa-install.js?v=build-test-20261014'));

const clickHarness = makeHarness(false);
clickHarness.nodes['pwa-install-button'].fire('click');
assert.equal(clickHarness.appended.length, 1, 'Explicit install interaction may request the installer immediately.');
assert.match(clickHarness.nodes['pwa-install-status'].textContent, /Подготавливаем функции установки/);
const capturedEvent = { prevented: false, preventDefault() { this.prevented = true; } };
clickHarness.windowHandlers.get('beforeinstallprompt')[0](capturedEvent);
assert.equal(capturedEvent.prevented, true);
assert.equal(clickHarness.window.OSGARDInstallPrompt, capturedEvent);

const consentHarness = makeHarness(true);
consentHarness.windowHandlers.get('load')[0]();
consentHarness.timers[0].callback();
consentHarness.idles[0].callback();
const delayedExperimentTimer = consentHarness.timers.find(timer => timer.ms === 900);
assert.ok(delayedExperimentTimer, 'Experiment startup should be separated from PWA registration.');
delayedExperimentTimer.callback();
const core = consentHarness.appended.find(script => script.src.includes('experiment-core.js'));
assert.ok(core, 'The consented experiment core should load after the delayed handoff.');
core.onload();
await new Promise(resolve => setImmediate(resolve));
assert.ok(consentHarness.appended.some(script => script.src.includes('experiment-runtime.js')),
  'Experiment runtime should load only after its core.');

console.log('PASS deferred enhancements: no eager non-critical downloads, idle scheduling, install-prompt capture, and consent-gated experiment startup.');